/**
 * Business logic that touches several tables at once.
 * Every exported mutation runs inside a single SQL transaction so stock,
 * sales, purchases and customer debt can never get out of sync.
 */
import {
  db, entities, HttpError, newId, nowIso, transaction,
  rowToObject, insertRow, updateRow, requireById, createEntity, hashPassword,
} from './database';

type MovementType = 'incoming' | 'outgoing' | 'adjustment';

const PAYMENT_METHODS = ['Cash', 'EVC Plus', 'Zaad', 'eDahab', 'Sahal', 'Credit'];
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Credit'];

const num = (v: any, field: string, { min = 0, allowZero = true } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || (!allowZero && n === 0)) {
    throw new HttpError(400, `Field "${field}" must be a valid number${allowZero ? ` ≥ ${min}` : ' greater than 0'}`);
  }
  return n;
};

// ─── Stock ───────────────────────────────────────────────────────────────────
function getStock(productId: string, locationId: string): number {
  const row: any = db.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND location_id = ?').get(productId, locationId);
  return row ? Number(row.quantity) : 0;
}

/** Low-level stock change + movement log. Call only inside a transaction. */
function applyStock(productId: string, locationId: string, delta: number, type: MovementType, note: string) {
  const ts = nowIso();
  db.prepare(`
    INSERT INTO inventory (id, product_id, location_id, quantity, last_updated)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(product_id, location_id) DO UPDATE SET
      quantity = quantity + excluded.quantity,
      last_updated = excluded.last_updated
  `).run(`${productId}_${locationId}`, productId, locationId, delta, ts);

  insertRow('stock_movements', { id: newId(), productId, locationId, type, quantity: delta, note, timestamp: ts });
}

/** Ensures no touched inventory row ended up negative (checked on the final state). */
function assertNonNegative(pairs: Array<[string, string]>) {
  for (const [productId, locationId] of pairs) {
    const qty = getStock(productId, locationId);
    if (qty < 0) {
      const p: any = db.prepare('SELECT name FROM products WHERE id = ?').get(productId);
      const l: any = db.prepare('SELECT name FROM locations WHERE id = ?').get(locationId);
      throw new HttpError(400, `Insufficient stock for "${p?.name ?? productId}" at "${l?.name ?? locationId}" (would become ${qty}).`);
    }
  }
}

export function adjustStock(input: any) {
  const { productId, locationId } = input || {};
  const quantity = Number(input?.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) throw new HttpError(400, 'Quantity must be a non-zero number');
  const type: MovementType = ['incoming', 'outgoing', 'adjustment'].includes(input?.type) ? input.type : 'adjustment';

  return transaction(() => {
    requireById(entities.products, productId, 'Product');
    requireById(entities.locations, locationId, 'Location');
    const note = input?.note || (type === 'incoming' ? 'Restock' : type === 'outgoing' ? 'Sale' : 'Manual Adjustment');
    applyStock(productId, locationId, quantity, type, note);
    assertNonNegative([[productId, locationId]]);
  });
}

export function transferStock(input: any) {
  const { productId, fromLocationId, toLocationId } = input || {};
  const quantity = num(input?.quantity, 'quantity', { allowZero: false });
  if (fromLocationId === toLocationId) throw new HttpError(400, 'Source and destination must be different');

  return transaction(() => {
    requireById(entities.products, productId, 'Product');
    const from = requireById(entities.locations, fromLocationId, 'Source location');
    const to = requireById(entities.locations, toLocationId, 'Destination location');
    applyStock(productId, fromLocationId, -quantity, 'outgoing', `Transfer to ${to.name}`);
    applyStock(productId, toLocationId, quantity, 'incoming', `Transfer from ${from.name}`);
    assertNonNegative([[productId, fromLocationId]]);
  });
}

export function listStockMovements(productId?: string) {
  const rows = productId
    ? db.prepare('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY timestamp DESC').all(productId)
    : db.prepare('SELECT * FROM stock_movements ORDER BY timestamp DESC LIMIT 500').all();
  return rows.map((r) => rowToObject(r));
}

export function listInventory() {
  return db.prepare('SELECT * FROM inventory').all().map((r) => rowToObject(r));
}

// ─── Customer debt ───────────────────────────────────────────────────────────
function changeDebt(customerId: string | null | undefined, delta: number) {
  if (!customerId || !delta) return;
  db.prepare('UPDATE customers SET debt_balance = debt_balance + ? WHERE id = ?').run(delta, customerId);
}

const saleDebt = (s: any) =>
  s.paymentMethod === 'Credit' && s.customerId ? Math.max(0, (s.totalPrice || 0) - (s.amountPaid || 0)) : 0;

export function settleCustomerDebt(customerId: string, amountRaw: any) {
  const amount = num(amountRaw, 'amount', { allowZero: false });
  return transaction(() => {
    const c = requireById(entities.customers, customerId, 'Customer');
    if (amount > (c.debtBalance || 0) + 1e-9) {
      throw new HttpError(400, `Amount exceeds outstanding debt ($${(c.debtBalance || 0).toFixed(2)})`);
    }
    changeDebt(customerId, -amount);
    return requireById(entities.customers, customerId, 'Customer');
  });
}

// ─── Sales ───────────────────────────────────────────────────────────────────
function normalizeSale(input: any) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Invalid sale');
  const productId = String(input.productId || '');
  const locationId = String(input.locationId || '');
  if (!productId) throw new HttpError(400, 'Product is required');
  if (!locationId) throw new HttpError(400, 'Location is required');
  const quantity = num(input.quantity, 'quantity', { allowZero: false });
  const totalPrice = num(input.totalPrice ?? 0, 'totalPrice');
  const paymentMethod = input.paymentMethod || 'Cash';
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new HttpError(400, `Invalid payment method "${paymentMethod}"`);
  const amountPaid = input.amountPaid === undefined || input.amountPaid === null || input.amountPaid === ''
    ? (paymentMethod === 'Credit' ? 0 : totalPrice)
    : num(input.amountPaid, 'amountPaid');
  const customerId = input.customerId || null;
  if (paymentMethod === 'Credit' && !customerId) throw new HttpError(400, 'A customer is required for credit sales');

  requireById(entities.products, productId, 'Product');
  requireById(entities.locations, locationId, 'Location');
  let customerName = input.customerName || null;
  if (customerId) customerName = requireById(entities.customers, customerId, 'Customer').name;

  return { productId, locationId, customerId, customerName, quantity, totalPrice, paymentMethod, amountPaid };
}

const getSale = (id: string) => {
  const s = rowToObject(db.prepare('SELECT * FROM sales WHERE id = ?').get(id));
  if (!s) throw new HttpError(404, 'Sale not found');
  return s;
};

export function listSales() {
  return db.prepare('SELECT * FROM sales ORDER BY timestamp DESC').all().map((r) => rowToObject(r));
}

export function createSale(input: any) {
  return transaction(() => {
    const data = normalizeSale(input);
    const sale = { id: newId(), ...data, status: 'Completed', timestamp: nowIso() };
    insertRow('sales', sale);
    applyStock(data.productId, data.locationId, -data.quantity, 'outgoing', `Sale Order: ${sale.id}`);
    assertNonNegative([[data.productId, data.locationId]]);
    changeDebt(sale.customerId, saleDebt(sale));
    return getSale(sale.id);
  });
}

export function updateSale(id: string, input: any) {
  return transaction(() => {
    const old = getSale(id);
    if (old.status === 'Returned') throw new HttpError(400, 'Returned sales cannot be edited');
    const data = normalizeSale(input);

    // reverse old effects
    applyStock(old.productId, old.locationId, old.quantity, 'incoming', `Sale Updated (Reversing Old): ${id}`);
    changeDebt(old.customerId, -saleDebt(old));

    // apply new effects
    updateRow('sales', id, data);
    applyStock(data.productId, data.locationId, -data.quantity, 'outgoing', `Sale Updated (Applying New): ${id}`);
    changeDebt(data.customerId, saleDebt(data));

    assertNonNegative([[old.productId, old.locationId], [data.productId, data.locationId]]);
    return getSale(id);
  });
}

export function deleteSale(id: string) {
  return transaction(() => {
    const old = getSale(id);
    if (old.status !== 'Returned') {
      applyStock(old.productId, old.locationId, old.quantity, 'incoming', `Sale Cancelled/Deleted: ${id}`);
      changeDebt(old.customerId, -saleDebt(old));
    }
    db.prepare('DELETE FROM sales WHERE id = ?').run(id);
  });
}

export function returnSale(id: string) {
  return transaction(() => {
    const old = getSale(id);
    if (old.status === 'Returned') throw new HttpError(400, 'This sale has already been returned');
    updateRow('sales', id, { status: 'Returned' });
    applyStock(old.productId, old.locationId, old.quantity, 'incoming', `Sale Returned: ${id}`);
    changeDebt(old.customerId, -saleDebt(old));
    return getSale(id);
  });
}

// ─── Purchases ───────────────────────────────────────────────────────────────
function uniqueSku(base?: string): string {
  let sku = (base || '').trim() || `SKU-${Date.now().toString().slice(-6)}`;
  const exists = (s: string) => !!db.prepare('SELECT 1 FROM products WHERE sku = ?').get(s);
  if (!exists(sku)) return sku;
  let i = 1;
  while (exists(`${sku}-${i}`)) i++;
  return `${sku}-${i}`;
}

/** Creates a product, generating a unique SKU when none is supplied. Call inside a transaction. */
export function createProductRecord(input: any) {
  const autoSku = !input?.sku || !String(input.sku).trim();
  return createEntity(entities.products, {
    category: 'Uncategorized',
    unit: 'pcs',
    minStockLevel: 0,
    price: 0,
    costPrice: 0,
    ...input,
    sku: autoSku ? uniqueSku() : input.sku,
  });
}

function normalizePurchase(input: any) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Invalid purchase');
  const productId = String(input.productId || '');
  const locationId = String(input.locationId || '');
  if (!productId) throw new HttpError(400, 'Product is required');
  if (!locationId) throw new HttpError(400, 'Location is required');
  const quantity = num(input.quantity, 'quantity', { allowZero: false });
  const costPrice = num(input.costPrice ?? 0, 'costPrice');
  const paymentStatus = input.paymentStatus || 'Paid';
  if (!PAYMENT_STATUSES.includes(paymentStatus)) throw new HttpError(400, `Invalid payment status "${paymentStatus}"`);
  const product = requireById(entities.products, productId, 'Product');
  requireById(entities.locations, locationId, 'Location');
  return {
    productId,
    productName: input.productName || product.name,
    locationId,
    supplierId: input.supplierId || null,
    supplierName: input.supplierName || null,
    quantity,
    costPrice,
    totalCost: Math.round(quantity * costPrice * 100) / 100,
    invoiceNumber: input.invoiceNumber || null,
    paymentStatus,
    notes: input.notes || null,
  };
}

const getPurchase = (id: string) => {
  const p = rowToObject(db.prepare('SELECT * FROM purchases WHERE id = ?').get(id));
  if (!p) throw new HttpError(404, 'Purchase not found');
  return p;
};

export function listPurchases() {
  return db.prepare('SELECT * FROM purchases ORDER BY timestamp DESC').all().map((r) => rowToObject(r));
}

function insertPurchase(input: any) {
  const data = normalizePurchase(input);
  const purchase = { id: newId(), ...data, timestamp: nowIso() };
  insertRow('purchases', purchase);
  applyStock(data.productId, data.locationId, data.quantity, 'incoming', `Purchase Order: ${purchase.id}`);
  return purchase.id;
}

export function createPurchase(input: any) {
  return transaction(() => getPurchase(insertPurchase(input)));
}

export function createPurchaseInvoice(invoice: any) {
  if (!invoice || !Array.isArray(invoice.items) || invoice.items.length === 0) {
    throw new HttpError(400, 'Invoice must contain at least one item');
  }
  if (!invoice.locationId) throw new HttpError(400, 'Location is required');

  return transaction(() => {
    const invoiceNumber = invoice.invoiceNumber || `INV-${Date.now()}`;
    const ids: string[] = [];
    for (const item of invoice.items) {
      let productId = item.productId;
      if (item.isNewProduct || !productId) {
        if (!item.productName || !String(item.productName).trim()) throw new HttpError(400, 'New product name is required');
        const costPrice = num(item.costPrice ?? 0, 'costPrice');
        const prod = createProductRecord({
          name: item.productName,
          sku: item.sku,
          category: item.category || 'Uncategorized',
          unit: item.unit || 'pcs',
          price: item.sellingPrice ?? Math.round(costPrice * 1.3 * 100) / 100,
          costPrice,
          minStockLevel: 5,
        });
        productId = prod.id;
      }
      ids.push(insertPurchase({
        productId,
        productName: item.productName,
        locationId: invoice.locationId,
        supplierId: invoice.supplierId,
        supplierName: invoice.supplierName,
        quantity: item.quantity,
        costPrice: item.costPrice,
        invoiceNumber,
        paymentStatus: invoice.paymentStatus || 'Paid',
        notes: invoice.notes || '',
      }));
    }
    return ids;
  });
}

export function updatePurchase(id: string, input: any) {
  return transaction(() => {
    const old = getPurchase(id);
    const data = normalizePurchase(input);
    applyStock(old.productId, old.locationId, -old.quantity, 'outgoing', `Purchase Updated (Reversing Old): ${id}`);
    updateRow('purchases', id, data);
    applyStock(data.productId, data.locationId, data.quantity, 'incoming', `Purchase Updated (Applying New): ${id}`);
    assertNonNegative([[old.productId, old.locationId], [data.productId, data.locationId]]);
    return getPurchase(id);
  });
}

export function deletePurchase(id: string) {
  return transaction(() => {
    const old = getPurchase(id);
    applyStock(old.productId, old.locationId, -old.quantity, 'outgoing', `Purchase Cancelled/Deleted: ${id}`);
    assertNonNegative([[old.productId, old.locationId]]);
    db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
  });
}

// ─── Admin: reset / seed ─────────────────────────────────────────────────────
const BUSINESS_TABLES = [
  'notifications', 'stock_movements', 'sales', 'purchases', 'inventory',
  'orders', 'expenses', 'products', 'customers', 'suppliers', 'categories', 'locations',
];

/** Deletes all business data. User accounts are kept so admins are not locked out. */
export function resetBusinessData() {
  transaction(() => {
    for (const t of BUSINESS_TABLES) db.exec(`DELETE FROM ${t}`);
  });
}

/** Creates default login accounts on a brand-new database. Returns true if created. */
export function seedDefaultUsers(): boolean {
  const count: any = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (Number(count.n) > 0) return false;
  transaction(() => {
    const defaults = [
      { username: 'admin', email: 'admin@garowesupermarket.com', name: 'Maamulaha Guud', role: 'Admin', password: 'admin123' },
      { username: 'manager', email: 'manager@garowesupermarket.com', name: 'Maareeyaha Ganacsiga', role: 'Manager', password: 'manager123' },
      { username: 'staff', email: 'staff@garowesupermarket.com', name: 'Shaqaalaha Iibka', role: 'Staff', password: 'staff123' },
    ];
    for (const u of defaults) {
      insertRow('users', {
        id: newId(), username: u.username, email: u.email, name: u.name, role: u.role,
        passwordHash: hashPassword(u.password), locationIds: '[]', createdAt: nowIso(),
      });
    }
  });
  console.log('[db] Default users created: admin/admin123, manager/manager123, staff/staff123 — change these passwords!');
  return true;
}

/** Inserts sample data if the products table is empty. Returns true if seeded. */
export function seedSampleData(): boolean {
  const count: any = db.prepare('SELECT COUNT(*) AS n FROM products').get();
  if (Number(count.n) > 0) return false;

  transaction(() => {
    const categories = ['Food', 'Drinks', 'Clothes', 'Medicine', 'Electronics'];
    for (const c of categories) {
      if (!db.prepare('SELECT 1 FROM categories WHERE name = ?').get(c)) {
        createEntity(entities.categories, { name: c, description: 'Category ' + c });
      }
    }
    const loc = createEntity(entities.locations, { name: 'Main Store', address: 'Main Market' });
    createEntity(entities.locations, { name: 'Branch 2', address: 'Makka Road' });

    const sup1 = createEntity(entities.suppliers, { name: 'Towfiiq Company', phone: '0612345678', email: 'info@towfiiq.com', address: 'Bakaaraha' });
    const sup2 = createEntity(entities.suppliers, { name: 'Golis Telecom', phone: '0901234567', email: 'sales@golis.so', address: 'Garowe' });

    const cust1 = createEntity(entities.customers, { name: 'Cali Nuur', phone: '0615112233', debtBalance: 0 });
    const cust2 = createEntity(entities.customers, { name: 'Faadumo Jaamac', phone: '0615998877', debtBalance: 50 });

    const sample = [
      { name: 'Bariis Baasto (25kg)', sku: 'BAR-01', cat: 'Food', sup: sup1.name, p: 25, c: 20, u: 'bag', qty: 100 },
      { name: 'Sokor (50kg)', sku: 'SOK-01', cat: 'Food', sup: sup1.name, p: 35, c: 30, u: 'bag', qty: 50 },
      { name: 'Saliid Macsar (5 Ltr)', sku: 'SAL-05', cat: 'Food', sup: sup1.name, p: 15, c: 12, u: 'ltr', qty: 200 },
      { name: 'Caano Boore (Nido)', sku: 'CAA-02', cat: 'Drinks', sup: sup2.name, p: 18, c: 14, u: 'pcs', qty: 120 },
      { name: 'Shaambo (Clear)', sku: 'SHA-01', cat: 'Medicine', sup: sup2.name, p: 5, c: 3.5, u: 'pcs', qty: 60 },
    ];
    const prodIds: string[] = [];
    for (const s of sample) {
      const prod = createProductRecord({
        name: s.name, sku: s.sku, category: s.cat, supplier: s.sup, unit: s.u,
        price: s.p, costPrice: s.c, minStockLevel: 20,
      });
      prodIds.push(prod.id);
      applyStock(prod.id, loc.id, s.qty, 'incoming', 'Initial Stock');
    }

    const addSale = (input: any) => {
      const data = normalizeSale(input);
      const sale = { id: newId(), ...data, status: 'Completed', timestamp: nowIso() };
      insertRow('sales', sale);
      applyStock(data.productId, data.locationId, -data.quantity, 'outgoing', `Sale Order: ${sale.id}`);
      changeDebt(sale.customerId, saleDebt(sale));
    };
    addSale({ productId: prodIds[0], locationId: loc.id, customerId: cust1.id, quantity: 2, totalPrice: 50, paymentMethod: 'Zaad', amountPaid: 50 });
    addSale({ productId: prodIds[2], locationId: loc.id, customerId: cust2.id, quantity: 1, totalPrice: 15, paymentMethod: 'Credit', amountPaid: 0 });
  });
  return true;
}
