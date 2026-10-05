import { supabase } from './supabase';
import { 
  Product, 
  Location, 
  InventoryItem, 
  Sale, 
  Purchase, 
  Notification, 
  UserProfile, 
  Category, 
  Supplier, 
  Customer, 
  StockMovement, 
  Order, 
  PurchaseInvoiceInput, 
  Expense 
} from '../types';

// Helper to notify the app of data changes
export const notifyDbChange = () => {
  window.dispatchEvent(new Event('db-change'));
};

// ─── Helpers: Case converters ───────────────────────────────────────────────
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());

function mapFromDb<T>(row: any): T {
  if (!row) return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    out[toCamel(k)] = v;
  }
  return out as T;
}

function mapToDb(obj: any): any {
  if (!obj) return obj;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}

// ─── USERS ──────────────────────────────────────────────────────────────────
export const getUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching users:', error.message);
    return [];
  }
  return (data || []).map(r => ({
    ...mapFromDb<UserProfile>(r),
    locationIds: r.location_ids || []
  }));
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();
  if (error || !data) return null;
  return {
    ...mapFromDb<UserProfile>(data),
    locationIds: data.location_ids || []
  };
};

export const createUserProfile = async (uid: string, profile: Partial<UserProfile>) => {
  const toInsert: any = {
    username: (profile as any).username || profile.email?.split('@')[0],
    email: profile.email,
    name: profile.name,
    role: profile.role || 'Staff',
    password: profile.password || '123456',
    address: profile.address || '',
    location_ids: profile.locationIds || []
  };
  const { error } = await supabase.from('users').insert(toInsert);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const updateUser = async (id: string, profile: Partial<UserProfile>) => {
  const dbData: any = {};
  if (profile.name !== undefined) dbData.name = profile.name;
  if (profile.email !== undefined) dbData.email = profile.email;
  if (profile.role !== undefined) dbData.role = profile.role;
  if (profile.address !== undefined) dbData.address = profile.address;
  if (profile.password) dbData.password = profile.password;
  if (profile.locationIds) dbData.location_ids = profile.locationIds;

  const { error } = await supabase.from('users').update(dbData).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

// ─── CATEGORIES ─────────────────────────────────────────────────────────────
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
  if (error) return [];
  return (data || []).map(r => mapFromDb<Category>(r));
};

export const addCategory = async (category: Omit<Category, 'id'>) => {
  const { data, error } = await supabase.from('categories').insert(mapToDb(category)).select().single();
  if (error) throw new Error(error.message);
  notifyDbChange();
  return mapFromDb<Category>(data);
};

export const updateCategory = async (id: string, category: Partial<Category>) => {
  const { error } = await supabase.from('categories').update(mapToDb(category)).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteCategory = async (id: string) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

// ─── SUPPLIERS ──────────────────────────────────────────────────────────────
export const getSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
  if (error) return [];
  return (data || []).map(r => mapFromDb<Supplier>(r));
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
  const { data, error } = await supabase.from('suppliers').insert(mapToDb(supplier)).select().single();
  if (error) throw new Error(error.message);
  notifyDbChange();
  return mapFromDb<Supplier>(data);
};

export const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
  const { error } = await supabase.from('suppliers').update(mapToDb(supplier)).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteSupplier = async (id: string) => {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

// ─── CUSTOMERS ──────────────────────────────────────────────────────────────
export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
  if (error) return [];
  return (data || []).map(r => mapFromDb<Customer>(r));
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
  const dbData = mapToDb(customer);
  const { data, error } = await supabase.from('customers').insert(dbData).select().single();
  if (error) throw new Error(error.message);
  notifyDbChange();
  return mapFromDb<Customer>(data);
};

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
  const { error } = await supabase.from('customers').update(mapToDb(customer)).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteCustomer = async (id: string) => {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const settleCustomerDebt = async (customerId: string, amount: number) => {
  const { data: cust } = await supabase.from('customers').select('debt_balance').eq('id', customerId).single();
  if (cust) {
    const current = Number(cust.debt_balance) || 0;
    const updated = Math.max(0, current - amount);
    await supabase.from('customers').update({ debt_balance: updated }).eq('id', customerId);
    notifyDbChange();
  }
};

// ─── LOCATIONS ──────────────────────────────────────────────────────────────
export const getLocations = async (): Promise<Location[]> => {
  const { data, error } = await supabase.from('locations').select('*').order('name', { ascending: true });
  if (error) return [];
  return (data || []).map(r => mapFromDb<Location>(r));
};

export const addLocation = async (location: Omit<Location, 'id'>) => {
  const { data, error } = await supabase.from('locations').insert(mapToDb(location)).select().single();
  if (error) throw new Error(error.message);
  notifyDbChange();
  return mapFromDb<Location>(data);
};

export const updateLocation = async (id: string, location: Partial<Location>) => {
  const { error } = await supabase.from('locations').update(mapToDb(location)).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteLocation = async (id: string) => {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

// ─── PRODUCTS ───────────────────────────────────────────────────────────────
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    category: r.category || 'Uncategorized',
    supplier: r.supplier || '',
    unit: r.unit || 'pcs',
    minStockLevel: Number(r.min_stock_level) || 0,
    price: Number(r.price) || 0,
    costPrice: Number(r.cost_price) || 0,
    imageUrl: r.image_url || '',
    createdAt: r.created_at
  }));
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
  const dbData = {
    name: product.name,
    sku: product.sku || `SKU-${Date.now().toString().slice(-6)}`,
    category: product.category || 'Uncategorized',
    supplier: product.supplier || null,
    unit: product.unit || 'pcs',
    min_stock_level: product.minStockLevel || 0,
    price: product.price || 0,
    cost_price: product.costPrice || 0,
    image_url: product.imageUrl || null
  };

  const { data, error } = await supabase.from('products').insert(dbData).select().single();
  if (error) throw new Error(error.message);
  notifyDbChange();
  return {
    id: data.id,
    name: data.name,
    sku: data.sku,
    category: data.category,
    supplier: data.supplier,
    unit: data.unit,
    minStockLevel: Number(data.min_stock_level),
    price: Number(data.price),
    costPrice: Number(data.cost_price),
    imageUrl: data.image_url,
    createdAt: data.created_at
  };
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const dbData: any = {};
  if (product.name !== undefined) dbData.name = product.name;
  if (product.sku !== undefined) dbData.sku = product.sku;
  if (product.category !== undefined) dbData.category = product.category;
  if (product.supplier !== undefined) dbData.supplier = product.supplier;
  if (product.unit !== undefined) dbData.unit = product.unit;
  if (product.minStockLevel !== undefined) dbData.min_stock_level = product.minStockLevel;
  if (product.price !== undefined) dbData.price = product.price;
  if (product.costPrice !== undefined) dbData.cost_price = product.costPrice;
  if (product.imageUrl !== undefined) dbData.image_url = product.imageUrl;

  const { error } = await supabase.from('products').update(dbData).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

// ─── INVENTORY & STOCK ──────────────────────────────────────────────────────
export const getInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    productId: r.product_id,
    locationId: r.location_id,
    quantity: Number(r.quantity) || 0,
    lastUpdated: r.last_updated
  }));
};

export const updateStock = async (
  productId: string,
  locationId: string,
  quantityDelta: number,
  type: StockMovement['type'] = 'adjustment',
  note?: string
) => {
  const inventoryId = `${productId}_${locationId}`;
  
  // 1. Get current stock
  const { data: current } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('id', inventoryId)
    .single();

  const currentQty = current ? Number(current.quantity) : 0;
  const newQty = currentQty + quantityDelta;

  // 2. Upsert inventory row
  const { error: invErr } = await supabase.from('inventory').upsert({
    id: inventoryId,
    product_id: productId,
    location_id: locationId,
    quantity: newQty,
    last_updated: new Date().toISOString()
  });

  if (invErr) throw new Error(invErr.message);

  // 3. Record stock movement
  await supabase.from('stock_movements').insert({
    product_id: productId,
    location_id: locationId,
    type,
    quantity: quantityDelta,
    note: note || (type === 'incoming' ? 'Restock' : type === 'outgoing' ? 'Sale' : 'Manual Adjustment')
  });

  notifyDbChange();
};

export const transferStock = async (
  productId: string,
  fromLocationId: string,
  toLocationId: string,
  quantity: number,
  fromLocationName: string,
  toLocationName: string
) => {
  await updateStock(productId, fromLocationId, -quantity, 'outgoing', `Transfer to ${toLocationName}`);
  await updateStock(productId, toLocationId, quantity, 'incoming', `Transfer from ${fromLocationName}`);
};

export const getStockMovements = async (productId: string): Promise<StockMovement[]> => {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('timestamp', { ascending: false });
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    productId: r.product_id,
    locationId: r.location_id,
    type: r.type,
    quantity: Number(r.quantity),
    note: r.note,
    timestamp: r.timestamp
  }));
};

// ─── SALES ──────────────────────────────────────────────────────────────────
export const getSales = async (): Promise<Sale[]> => {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    productId: r.product_id,
    locationId: r.location_id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    quantity: Number(r.quantity),
    totalPrice: Number(r.total_price),
    paymentMethod: r.payment_method,
    amountPaid: Number(r.amount_paid),
    status: r.status,
    timestamp: r.timestamp
  }));
};

export const recordSale = async (sale: Omit<Sale, 'id' | 'timestamp'>): Promise<Sale> => {
  const dbData = {
    product_id: sale.productId,
    location_id: sale.locationId,
    customer_id: sale.customerId || null,
    customer_name: sale.customerName || null,
    quantity: sale.quantity,
    total_price: sale.totalPrice,
    payment_method: sale.paymentMethod || 'Cash',
    amount_paid: sale.amountPaid !== undefined ? sale.amountPaid : sale.totalPrice,
    status: sale.status || 'Completed'
  };

  const { data, error } = await supabase.from('sales').insert(dbData).select().single();
  if (error) throw new Error(error.message);

  // Deduct stock
  await updateStock(sale.productId, sale.locationId, -sale.quantity, 'outgoing', `Sale Order: ${data.id}`);

  // If credit, add debt to customer
  if (sale.paymentMethod === 'Credit' && sale.customerId) {
    const debtAmount = sale.totalPrice - (sale.amountPaid || 0);
    if (debtAmount > 0) {
      const { data: cust } = await supabase.from('customers').select('debt_balance').eq('id', sale.customerId).single();
      const currentDebt = cust ? Number(cust.debt_balance) || 0 : 0;
      await supabase.from('customers').update({ debt_balance: currentDebt + debtAmount }).eq('id', sale.customerId);
    }
  }

  notifyDbChange();
  return {
    id: data.id,
    productId: data.product_id,
    locationId: data.location_id,
    customerId: data.customer_id,
    customerName: data.customer_name,
    quantity: Number(data.quantity),
    totalPrice: Number(data.total_price),
    paymentMethod: data.payment_method,
    amountPaid: Number(data.amount_paid),
    status: data.status,
    timestamp: data.timestamp
  };
};

export const updateSale = async (oldSale: Sale, newData: Omit<Sale, 'id' | 'timestamp'>) => {
  // 1. Revert old stock
  await updateStock(oldSale.productId, oldSale.locationId, oldSale.quantity, 'incoming', `Sale Updated (Reversing Old): ${oldSale.id}`);

  // 2. Update sale row
  const { error } = await supabase.from('sales').update({
    product_id: newData.productId,
    location_id: newData.locationId,
    customer_id: newData.customerId || null,
    customer_name: newData.customerName || null,
    quantity: newData.quantity,
    total_price: newData.totalPrice,
    payment_method: newData.paymentMethod,
    amount_paid: newData.amountPaid
  }).eq('id', oldSale.id);

  if (error) throw new Error(error.message);

  // 3. Apply new stock deduction
  await updateStock(newData.productId, newData.locationId, -newData.quantity, 'outgoing', `Sale Updated (Applying New): ${oldSale.id}`);
  notifyDbChange();
};

export const deleteSale = async (sale: Sale) => {
  const { error } = await supabase.from('sales').delete().eq('id', sale.id);
  if (error) throw new Error(error.message);
  await updateStock(sale.productId, sale.locationId, sale.quantity, 'incoming', `Sale Cancelled/Deleted: ${sale.id}`);
  notifyDbChange();
};

export const processReturnSale = async (sale: Sale) => {
  const { error } = await supabase.from('sales').update({ status: 'Returned' }).eq('id', sale.id);
  if (error) throw new Error(error.message);

  await updateStock(sale.productId, sale.locationId, sale.quantity, 'incoming', `Sale Returned: ${sale.id}`);

  if (sale.paymentMethod === 'Credit' && sale.customerId) {
    const debtAmount = sale.totalPrice - (sale.amountPaid || 0);
    if (debtAmount > 0) {
      await settleCustomerDebt(sale.customerId, debtAmount);
    }
  }
  notifyDbChange();
};

// ─── PURCHASES ──────────────────────────────────────────────────────────────
export const getPurchases = async (): Promise<Purchase[]> => {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    locationId: r.location_id,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name,
    quantity: Number(r.quantity),
    costPrice: Number(r.cost_price),
    totalCost: Number(r.total_cost),
    invoiceNumber: r.invoice_number,
    paymentStatus: r.payment_status,
    notes: r.notes,
    timestamp: r.timestamp
  }));
};

export const recordPurchase = async (purchase: Omit<Purchase, 'id' | 'timestamp'>): Promise<Purchase> => {
  const dbData = {
    product_id: purchase.productId,
    product_name: purchase.productName,
    location_id: purchase.locationId,
    supplier_id: purchase.supplierId || null,
    supplier_name: purchase.supplierName || null,
    quantity: purchase.quantity,
    cost_price: purchase.costPrice,
    total_cost: purchase.totalCost,
    invoice_number: purchase.invoiceNumber || null,
    payment_status: purchase.paymentStatus || 'Paid',
    notes: purchase.notes || null
  };

  const { data, error } = await supabase.from('purchases').insert(dbData).select().single();
  if (error) throw new Error(error.message);

  await updateStock(purchase.productId, purchase.locationId, purchase.quantity, 'incoming', `Purchase Order: ${data.id}`);
  notifyDbChange();

  return {
    id: data.id,
    productId: data.product_id,
    productName: data.product_name,
    locationId: data.location_id,
    supplierId: data.supplier_id,
    supplierName: data.supplier_name,
    quantity: Number(data.quantity),
    costPrice: Number(data.cost_price),
    totalCost: Number(data.total_cost),
    invoiceNumber: data.invoice_number,
    paymentStatus: data.payment_status,
    notes: data.notes,
    timestamp: data.timestamp
  };
};

export const recordPurchaseInvoice = async (invoice: PurchaseInvoiceInput): Promise<string[]> => {
  const savedIds: string[] = [];
  const invoiceNumber = invoice.invoiceNumber || `INV-${Date.now()}`;

  for (const item of invoice.items) {
    let productId = item.productId;

    if (item.isNewProduct || !productId) {
      const prod = await addProduct({
        name: item.productName,
        sku: item.sku || `SKU-${Date.now().toString().slice(-6)}`,
        category: item.category || 'Uncategorized',
        unit: item.unit || 'pcs',
        price: item.sellingPrice || item.costPrice * 1.3,
        costPrice: item.costPrice,
        minStockLevel: 5
      });
      productId = prod.id;
    }

    const totalCost = (item.costPrice || 0) * (item.quantity || 0);

    const purchase = await recordPurchase({
      productId: productId as string,
      productName: item.productName,
      locationId: invoice.locationId,
      supplierId: invoice.supplierId,
      supplierName: invoice.supplierName,
      quantity: item.quantity,
      costPrice: item.costPrice,
      totalCost: isNaN(totalCost) ? 0 : totalCost,
      invoiceNumber: invoiceNumber,
      paymentStatus: invoice.paymentStatus || 'Paid',
      notes: invoice.notes || ''
    });

    if (purchase) savedIds.push(purchase.id);
  }

  return savedIds;
};

export const updatePurchase = async (oldPurchase: Purchase, newData: Omit<Purchase, 'id' | 'timestamp'>) => {
  await updateStock(oldPurchase.productId, oldPurchase.locationId, -oldPurchase.quantity, 'outgoing', `Purchase Updated (Reversing Old): ${oldPurchase.id}`);

  const { error } = await supabase.from('purchases').update({
    product_id: newData.productId,
    location_id: newData.locationId,
    supplier_id: newData.supplierId,
    supplier_name: newData.supplierName,
    quantity: newData.quantity,
    cost_price: newData.costPrice,
    total_cost: newData.totalCost,
    invoice_number: newData.invoiceNumber,
    payment_status: newData.paymentStatus,
    notes: newData.notes
  }).eq('id', oldPurchase.id);

  if (error) throw new Error(error.message);

  await updateStock(newData.productId, newData.locationId, newData.quantity, 'incoming', `Purchase Updated (Applying New): ${oldPurchase.id}`);
  notifyDbChange();
};

export const deletePurchase = async (purchase: Purchase) => {
  const { error } = await supabase.from('purchases').delete().eq('id', purchase.id);
  if (error) throw new Error(error.message);
  await updateStock(purchase.productId, purchase.locationId, -purchase.quantity, 'outgoing', `Purchase Cancelled/Deleted: ${purchase.id}`);
  notifyDbChange();
};

// ─── ORDERS ─────────────────────────────────────────────────────────────────
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*').order('order_date', { ascending: false });
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    customerName: r.customer_name,
    address: r.address,
    productName: r.product_name,
    category: r.category,
    quantity: Number(r.quantity),
    totalPrice: Number(r.total_price),
    status: r.status,
    orderDate: r.order_date
  }));
};

export const addOrder = async (order: Omit<Order, 'id'>) => {
  const dbData = {
    customer_name: order.customerName,
    address: order.address,
    product_name: order.productName,
    category: order.category,
    quantity: order.quantity,
    total_price: order.totalPrice,
    status: order.status || 'Pending'
  };
  const { data, error } = await supabase.from('orders').insert(dbData).select().single();
  if (error) throw new Error(error.message);
  notifyDbChange();
  return {
    id: data.id,
    customerName: data.customer_name,
    address: data.address,
    productName: data.product_name,
    category: data.category,
    quantity: Number(data.quantity),
    totalPrice: Number(data.total_price),
    status: data.status,
    orderDate: data.order_date
  };
};

export const updateOrder = async (id: string, order: Partial<Order>) => {
  const dbData: any = {};
  if (order.customerName) dbData.customer_name = order.customerName;
  if (order.address) dbData.address = order.address;
  if (order.productName) dbData.product_name = order.productName;
  if (order.category) dbData.category = order.category;
  if (order.quantity !== undefined) dbData.quantity = order.quantity;
  if (order.totalPrice !== undefined) dbData.total_price = order.totalPrice;
  if (order.status) dbData.status = order.status;

  const { error } = await supabase.from('orders').update(dbData).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteOrder = async (id: string) => {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

// ─── EXPENSES ───────────────────────────────────────────────────────────────
export const getExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    category: r.category,
    date: r.date,
    createdBy: r.created_by,
    timestamp: r.timestamp
  }));
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'timestamp'>) => {
  const dbData = {
    description: expense.description,
    amount: expense.amount,
    category: expense.category || 'General',
    date: expense.date || new Date().toISOString().split('T')[0],
    created_by: expense.createdBy || 'User'
  };
  const { error } = await supabase.from('expenses').insert(dbData);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const updateExpense = async (id: string, expense: Partial<Expense>) => {
  const dbData: any = {};
  if (expense.description) dbData.description = expense.description;
  if (expense.amount !== undefined) dbData.amount = expense.amount;
  if (expense.category) dbData.category = expense.category;
  if (expense.date) dbData.date = expense.date;

  const { error } = await supabase.from('expenses').update(dbData).eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

export const deleteExpense = async (id: string) => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDbChange();
};

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  let isMounted = true;
  supabase
    .from('notifications')
    .select('*')
    .order('timestamp', { ascending: false })
    .then(({ data }) => {
      if (isMounted && data) {
        callback(data.map(r => ({
          id: r.id,
          userId: r.user_id,
          message: r.message,
          type: r.type,
          read: r.read,
          timestamp: r.timestamp
        })));
      }
    });

  // Subscribe to realtime notification changes
  const channel = supabase
    .channel('public:notifications')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
      supabase.from('notifications').select('*').order('timestamp', { ascending: false })
        .then(({ data }) => {
          if (isMounted && data) {
            callback(data.map(r => ({
              id: r.id,
              userId: r.user_id,
              message: r.message,
              type: r.type,
              read: r.read,
              timestamp: r.timestamp
            })));
          }
        });
    })
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
};

export const createNotification = async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  await supabase.from('notifications').insert({
    user_id: notification.userId,
    message: notification.message,
    type: notification.type || 'system',
    read: false
  });
  notifyDbChange();
};

export const markNotificationRead = async (notificationId: string) => {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  notifyDbChange();
};

// ─── ADMIN: RESET & SEED ─────────────────────────────────────────────────────
export const clearAllData = async () => {
  const tables = [
    'notifications',
    'stock_movements',
    'sales',
    'purchases',
    'inventory',
    'orders',
    'expenses',
    'products',
    'customers',
    'suppliers',
    'categories'
  ];
  for (const t of tables) {
    await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  notifyDbChange();
};

export const seedRealData = async () => {
  // Sample seeding
  const { data: prods } = await supabase.from('products').select('id').limit(1);
  if (prods && prods.length > 0) return;

  const cat = await addCategory({ name: 'Food', description: 'Cuntooyinka' });
  const loc = await addLocation({ name: 'Main Store', address: 'Main Market' });
  const sup = await addSupplier({ name: 'Towfiiq Company', phone: '0612345678', email: 'info@towfiiq.com', address: 'Bakaaraha' });
  await addCustomer({ name: 'Cali Nuur', phone: '0615112233', debtBalance: 0 });

  const prod = await addProduct({
    name: 'Bariis Baasto (25kg)',
    sku: 'BAR-01',
    category: cat.name,
    supplier: sup.name,
    unit: 'bag',
    price: 25,
    costPrice: 20,
    minStockLevel: 10
  });

  await updateStock(prod.id, loc.id, 100, 'incoming', 'Initial Stock');
  notifyDbChange();
};
