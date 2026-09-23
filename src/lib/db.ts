import { supabase } from './supabase';
import { Product, Location, InventoryItem, Sale, Purchase, Notification, UserProfile, Category, Supplier, Customer, StockMovement, Order, PurchaseInvoiceInput, PurchaseInvoiceItemInput, Expense } from '../types';

// Helper to handle dates
const safeToMillis = (dateObj: any) => {
  if (!dateObj) return 0;
  if (typeof dateObj === 'string') return new Date(dateObj).getTime();
  if (dateObj instanceof Date) return dateObj.getTime();
  // Handle Supabase timestamp strings
  return new Date(dateObj).getTime();
};

// Users
export const getUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error('Error fetching users:', error);
  return data as UserProfile[] || [];
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();
  if (error) {
    if (error.code !== 'PGRST116') console.error('Error fetching user profile:', error);
    return null;
  }
  return data as UserProfile;
};

export const createUserProfile = async (uid: string, profile: Partial<UserProfile>) => {
  const { error } = await supabase.from('users').upsert({ id: uid, ...profile });
  if (error) console.error('Error creating user profile:', error);
};

export const updateUser = async (id: string, profile: Partial<UserProfile>) => {
  const { error } = await supabase.from('users').update(profile).eq('id', id);
  if (error) console.error('Error updating user:', error);
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) console.error('Error deleting user:', error);
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) console.error('Error fetching categories:', error);
  return data as Category[] || [];
};

export const addCategory = async (category: Omit<Category, 'id'>) => {
  const { data, error } = await supabase.from('categories').insert(category).select().single();
  if (error) console.error('Error adding category:', error);
  return data;
};

export const updateCategory = async (id: string, category: Partial<Category>) => {
  const { error } = await supabase.from('categories').update(category).eq('id', id);
  if (error) console.error('Error updating category:', error);
};

export const deleteCategory = async (id: string) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) console.error('Error deleting category:', error);
};

// Suppliers
export const getSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase.from('suppliers').select('*');
  if (error) console.error('Error fetching suppliers:', error);
  return data as Supplier[] || [];
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
  const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
  if (error) console.error('Error adding supplier:', error);
  return data;
};

export const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
  const { error } = await supabase.from('suppliers').update(supplier).eq('id', id);
  if (error) console.error('Error updating supplier:', error);
};

export const deleteSupplier = async (id: string) => {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) console.error('Error deleting supplier:', error);
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) console.error('Error fetching customers:', error);
  return data as Customer[] || [];
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase.from('customers').insert(customer).select().single();
  if (error) console.error('Error adding customer:', error);
  return data;
};

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
  const { error } = await supabase.from('customers').update(customer).eq('id', id);
  if (error) console.error('Error updating customer:', error);
};

export const deleteCustomer = async (id: string) => {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) console.error('Error deleting customer:', error);
};

export const settleCustomerDebt = async (customerId: string, amount: number) => {
  const { error } = await supabase.rpc('increment_customer_debt', { customer_id: customerId, amount: -amount });
  if (error) {
    console.error('Error updating debt using RPC. Falling back to simple update.', error);
    // Fallback if RPC is not created
    const { data: customer } = await supabase.from('customers').select('debt_balance').eq('id', customerId).single();
    if (customer) {
      const newDebt = (customer.debt_balance || 0) - amount;
      await supabase.from('customers').update({ debt_balance: newDebt }).eq('id', customerId);
    }
  }
};

// Locations
export const getLocations = async (): Promise<Location[]> => {
  const { data, error } = await supabase.from('locations').select('*');
  if (error) console.error('Error fetching locations:', error);
  return data as Location[] || [];
};

export const addLocation = async (location: Omit<Location, 'id'>) => {
  const { data, error } = await supabase.from('locations').insert(location).select().single();
  if (error) console.error('Error adding location:', error);
  return data;
};

export const updateLocation = async (id: string, location: Partial<Location>) => {
  const { error } = await supabase.from('locations').update(location).eq('id', id);
  if (error) console.error('Error updating location:', error);
};

export const deleteLocation = async (id: string) => {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) console.error('Error deleting location:', error);
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) console.error('Error fetching products:', error);
  return data as Product[] || [];
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase.from('products').insert(product).select().single();
  if (error) console.error('Error adding product:', error);
  return data;
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const { error } = await supabase.from('products').update(product).eq('id', id);
  if (error) console.error('Error updating product:', error);
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) console.error('Error deleting product:', error);
};

export const getInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) console.error('Error fetching inventory:', error);
  return (data || []).map(item => ({
    ...item,
    productId: item.product_id,
    locationId: item.location_id,
    lastUpdated: item.last_updated
  })) as InventoryItem[];
};

export const updateStock = async (productId: string, locationId: string, quantityDelta: number, type: StockMovement['type'] = 'adjustment', note?: string) => {
  const inventoryId = `${productId}_${locationId}`;
  
  // Try RPC first for atomic increment
  const { error: rpcError } = await supabase.rpc('increment_inventory', { row_id: inventoryId, amount: quantityDelta });
  
  if (rpcError) {
    // If RPC fails (e.g. not implemented), fallback to upsert
    const { data: docSnap } = await supabase.from('inventory').select('*').eq('id', inventoryId).single();

    if (docSnap) {
      await supabase.from('inventory').update({
        quantity: (docSnap.quantity || 0) + quantityDelta,
        last_updated: new Date().toISOString()
      }).eq('id', inventoryId);
    } else {
      await supabase.from('inventory').insert({
        id: inventoryId,
        product_id: productId,
        location_id: locationId,
        quantity: quantityDelta,
      });
    }
  }

  // Record movement
  await recordStockMovement({
    productId,
    locationId,
    type,
    quantity: quantityDelta,
    note: note || (type === 'incoming' ? 'Restock' : type === 'outgoing' ? 'Sale' : 'Manual Adjustment')
  });
};

// Sales
export const recordSale = async (sale: Omit<Sale, 'id' | 'timestamp'>) => {
  // 1. Record sale
  const { data: saleData, error } = await supabase.from('sales').insert({
    product_id: sale.productId,
    location_id: sale.locationId,
    customer_id: sale.customerId,
    customer_name: sale.customerName,
    quantity: sale.quantity,
    total_price: sale.totalPrice,
    payment_method: sale.paymentMethod,
    amount_paid: sale.amountPaid,
    status: sale.status || 'Completed'
  }).select().single();

  if (error) {
    console.error('Error recording sale:', error);
    return null;
  }
  const saleRef = saleData;

  // 2. Update inventory
  await updateStock(sale.productId, sale.locationId, -sale.quantity, 'outgoing', `Sale Order: ${saleRef.id}`);

  // 3. Update Debt if credit sale
  if (sale.paymentMethod === 'Credit' && sale.customerId) {
    const debtAmount = sale.totalPrice - (sale.amountPaid || 0);
    if (debtAmount > 0) {
      await settleCustomerDebt(sale.customerId, -debtAmount); // Negative amount inside negative gives positive increment
    }
  }

  // 4. Check for low stock alerts
  const { data: product } = await supabase.from('products').select('*').eq('id', sale.productId).single();
  const inventoryId = `${sale.productId}_${sale.locationId}`;
  const { data: inventory } = await supabase.from('inventory').select('*').eq('id', inventoryId).single();

  if (product && inventory) {
    if (inventory.quantity <= (product.min_stock_level || 0)) {
      await createNotification({
        userId: 'admin_placeholder', // Should be targeted to relevant users
        message: `Low stock alert: ${product.name} at location ${sale.locationId}`,
        type: 'low_stock',
        read: false,
      });
    }
  }
  return saleRef;
};

export const deleteSale = async (sale: Sale) => {
  // 1. Delete sale record
  await supabase.from('sales').delete().eq('id', sale.id);

  // 2. Reverse inventory (restock)
  await updateStock(sale.productId, sale.locationId, sale.quantity, 'incoming', `Sale Cancelled/Deleted: ${sale.id}`);
};

export const updateSale = async (oldSale: Sale, newData: Omit<Sale, 'id' | 'timestamp'>) => {
  // 1. Reverse old inventory
  await updateStock(oldSale.productId, oldSale.locationId, oldSale.quantity, 'incoming', `Sale Updated (Reversing Old): ${oldSale.id}`);
  
  // 2. Update sale record
  await supabase.from('sales').update({
    product_id: newData.productId,
    location_id: newData.locationId,
    customer_id: newData.customerId,
    customer_name: newData.customerName,
    quantity: newData.quantity,
    total_price: newData.totalPrice,
    payment_method: newData.paymentMethod,
    amount_paid: newData.amountPaid,
    status: newData.status
  }).eq('id', oldSale.id);

  // 3. Apply new inventory
  await updateStock(newData.productId, newData.locationId, -newData.quantity, 'outgoing', `Sale Updated (Applying New): ${oldSale.id}`);
};

export const getSales = async (): Promise<Sale[]> => {
  const { data, error } = await supabase.from('sales').select('*');
  if (error) console.error('Error fetching sales:', error);
  // Map Supabase snake_case back to camelCase
  return (data || []).map(sale => ({
    ...sale,
    productId: sale.product_id,
    locationId: sale.location_id,
    customerId: sale.customer_id,
    customerName: sale.customer_name,
    totalPrice: sale.total_price,
    paymentMethod: sale.payment_method,
    amountPaid: sale.amount_paid
  })) as Sale[];
};

export const processReturnSale = async (sale: Sale) => {
  // 1. Mark sale as returned
  await supabase.from('sales').update({ status: 'Returned' }).eq('id', sale.id);

  // 2. Return inventory
  await updateStock(sale.productId, sale.locationId, sale.quantity, 'incoming', `Sale Returned: ${sale.id}`);
  
  // 3. Reverse debt if it was a credit sale
  if (sale.paymentMethod === 'Credit' && sale.customerId) {
    const debtAmount = sale.totalPrice - (sale.amountPaid || 0);
    if (debtAmount > 0) {
       await settleCustomerDebt(sale.customerId, debtAmount);
    }
  }
};

// Stock Movements
export const getStockMovements = async (productId: string): Promise<StockMovement[]> => {
  const { data, error } = await supabase.from('stock_movements').select('*').eq('product_id', productId).order('timestamp', { ascending: false });
  if (error) console.error('Error fetching stock movements:', error);
  return (data || []).map(m => ({
    ...m,
    productId: m.product_id,
    locationId: m.location_id
  })) as StockMovement[];
};

export const recordStockMovement = async (movement: Omit<StockMovement, 'id' | 'timestamp'>) => {
  await supabase.from('stock_movements').insert({
    product_id: movement.productId,
    location_id: movement.locationId,
    type: movement.type,
    quantity: movement.quantity,
    note: movement.note
  });
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

// Notifications (Using realtime instead of polling in App, but here is a simple fetch)
export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  // For initial load
  supabase.from('notifications').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).then(({ data }) => {
     if(data) callback(data.map(n => ({...n, userId: n.user_id} as Notification)));
  });

  // Supabase Realtime handles the callback on changes (set up in App.tsx typically)
  return () => {}; // return empty unsubscribe, App.tsx handles channel
};

export const createNotification = async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  await supabase.from('notifications').insert({
    user_id: notification.userId,
    message: notification.message,
    type: notification.type,
    read: notification.read
  });
};

export const markNotificationRead = async (notificationId: string) => {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
};

// Orders
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) console.error('Error fetching orders:', error);
  return (data || []).map(o => ({
    ...o,
    customerName: o.customer_name,
    productName: o.product_name,
    totalPrice: o.total_price,
    orderDate: o.order_date
  })) as Order[];
};

export const addOrder = async (order: Omit<Order, 'id'>) => {
  const { data, error } = await supabase.from('orders').insert({
    customer_name: order.customerName,
    address: order.address,
    product_name: order.productName,
    category: order.category,
    quantity: order.quantity,
    total_price: order.totalPrice,
    status: order.status || 'Pending'
  }).select().single();
  if (error) console.error('Error adding order:', error);
  return data;
};

export const updateOrder = async (id: string, order: Partial<Order>) => {
  const updateData: any = { ...order };
  if (order.customerName) updateData.customer_name = order.customerName;
  if (order.productName) updateData.product_name = order.productName;
  if (order.totalPrice) updateData.total_price = order.totalPrice;
  delete updateData.customerName;
  delete updateData.productName;
  delete updateData.totalPrice;
  await supabase.from('orders').update(updateData).eq('id', id);
};

export const deleteOrder = async (id: string) => {
  await supabase.from('orders').delete().eq('id', id);
};

// Purchases
export const recordPurchase = async (purchase: Omit<Purchase, 'id' | 'timestamp'>) => {
  const { data, error } = await supabase.from('purchases').insert({
    product_id: purchase.productId,
    product_name: purchase.productName,
    location_id: purchase.locationId,
    supplier_id: purchase.supplierId,
    supplier_name: purchase.supplierName,
    quantity: purchase.quantity,
    cost_price: purchase.costPrice,
    total_cost: purchase.totalCost,
    invoice_number: purchase.invoiceNumber,
    payment_status: purchase.paymentStatus,
    notes: purchase.notes
  }).select().single();
  
  if (data) {
    await updateStock(purchase.productId, purchase.locationId, purchase.quantity, 'incoming', `Purchase Order: ${data.id}`);
  }
  return data;
};

// Multi-item Purchase Invoice
export const recordPurchaseInvoice = async (invoice: PurchaseInvoiceInput): Promise<string[]> => {
  const savedIds: string[] = [];
  const invoiceNumber = invoice.invoiceNumber || `INV-${Date.now()}`;

  for (const item of invoice.items) {
    let productId = item.productId;

    if (item.isNewProduct || !productId) {
      const { data: prodRef, error } = await supabase.from('products').insert({
        name: item.productName,
        sku: item.sku || `SKU-${Date.now().toString().slice(-6)}`,
        category: item.category || 'Uncategorized',
        unit: item.unit || 'pcs',
        price: item.sellingPrice || item.costPrice * 1.3,
        cost_price: item.costPrice,
        min_stock_level: 5
      }).select().single();
      
      if(prodRef) productId = prodRef.id;
    }

    const totalCost = (item.costPrice || 0) * (item.quantity || 0);

    const { data: purchaseRef } = await supabase.from('purchases').insert({
      product_id: productId,
      location_id: invoice.locationId,
      supplier_id: invoice.supplierId,
      supplier_name: invoice.supplierName,
      quantity: item.quantity,
      cost_price: item.costPrice,
      total_cost: isNaN(totalCost) ? 0 : totalCost,
      invoice_number: invoiceNumber,
      payment_status: invoice.paymentStatus || 'Paid',
      notes: invoice.notes || ''
    }).select().single();

    if (purchaseRef && productId) {
      await updateStock(productId, invoice.locationId, item.quantity, 'incoming', `Invoice ${invoiceNumber}: ${item.productName}`);
      savedIds.push(purchaseRef.id);
    }
  }

  return savedIds;
};

export const deletePurchase = async (purchase: Purchase) => {
  await supabase.from('purchases').delete().eq('id', purchase.id);
  await updateStock(purchase.productId, purchase.locationId, -purchase.quantity, 'outgoing', `Purchase Cancelled/Deleted: ${purchase.id}`);
};

export const getPurchases = async (): Promise<Purchase[]> => {
  const { data, error } = await supabase.from('purchases').select('*');
  return (data || []).map(p => ({
    ...p,
    productId: p.product_id,
    productName: p.product_name,
    locationId: p.location_id,
    supplierId: p.supplier_id,
    supplierName: p.supplier_name,
    costPrice: p.cost_price,
    totalCost: p.total_cost,
    invoiceNumber: p.invoice_number,
    paymentStatus: p.payment_status
  })) as Purchase[];
};

export const updatePurchase = async (oldPurchase: Purchase, newData: Omit<Purchase, 'id' | 'timestamp'>) => {
  await updateStock(oldPurchase.productId, oldPurchase.locationId, -oldPurchase.quantity, 'outgoing', `Purchase Updated (Reversing Old): ${oldPurchase.id}`);
  
  await supabase.from('purchases').update({
    product_id: newData.productId,
    product_name: newData.productName,
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

  await updateStock(newData.productId, newData.locationId, newData.quantity, 'incoming', `Purchase Updated (Applying New): ${oldPurchase.id}`);
};

// Expenses
export const getExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*');
  return (data || []).map(e => ({
    ...e,
    createdBy: e.created_by
  })) as Expense[];
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'timestamp'>) => {
  await supabase.from('expenses').insert({
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    created_by: expense.createdBy
  });
};

export const deleteExpense = async (id: string) => {
  await supabase.from('expenses').delete().eq('id', id);
};

export const clearAllData = async () => {
  console.warn("clearAllData is currently unsupported for Supabase due to foreign key constraints.");
};

export const seedRealData = async () => {
  console.warn("seedRealData requires running the provided SQL script in the Supabase Dashboard instead.");
};
