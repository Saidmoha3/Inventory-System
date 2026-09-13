import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Product, Location, InventoryItem, Sale, Purchase, Notification, UserProfile, Category, Supplier, StockMovement, Order } from '../types';
import { safeToMillis } from './utils';

// Users
export const getUsers = async (): Promise<UserProfile[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  }
  return null;
};

export const createUserProfile = async (uid: string, profile: Partial<UserProfile>) => {
  await setDoc(doc(db, 'users', uid), {
    ...profile,
    createdAt: serverTimestamp(),
  });
};

export const updateUser = async (id: string, profile: Partial<UserProfile>) => {
  const docRef = doc(db, 'users', id);
  return await updateDoc(docRef, profile);
};

export const deleteUser = async (id: string) => {
  return await deleteDoc(doc(db, 'users', id));
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const querySnapshot = await getDocs(collection(db, 'categories'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const addCategory = async (category: Omit<Category, 'id'>) => {
  return await addDoc(collection(db, 'categories'), {
    ...category,
    createdAt: serverTimestamp(),
  });
};

export const updateCategory = async (id: string, category: Partial<Category>) => {
  const docRef = doc(db, 'categories', id);
  return await updateDoc(docRef, category);
};

export const deleteCategory = async (id: string) => {
  return await deleteDoc(doc(db, 'categories', id));
};

// Suppliers
export const getSuppliers = async (): Promise<Supplier[]> => {
  const querySnapshot = await getDocs(collection(db, 'suppliers'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
  return await addDoc(collection(db, 'suppliers'), {
    ...supplier,
    createdAt: serverTimestamp(),
  });
};

export const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
  const docRef = doc(db, 'suppliers', id);
  return await updateDoc(docRef, supplier);
};

export const deleteSupplier = async (id: string) => {
  return await deleteDoc(doc(db, 'suppliers', id));
};

// Locations
export const getLocations = async (): Promise<Location[]> => {
  const querySnapshot = await getDocs(collection(db, 'locations'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
};

export const addLocation = async (location: Omit<Location, 'id'>) => {
  return await addDoc(collection(db, 'locations'), {
    ...location,
    createdAt: serverTimestamp(),
  });
};

export const updateLocation = async (id: string, location: Partial<Location>) => {
  const docRef = doc(db, 'locations', id);
  return await updateDoc(docRef, location);
};

export const deleteLocation = async (id: string) => {
  return await deleteDoc(doc(db, 'locations', id));
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const querySnapshot = await getDocs(collection(db, 'products'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
  return await addDoc(collection(db, 'products'), {
    ...product,
    createdAt: serverTimestamp(),
  });
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const docRef = doc(db, 'products', id);
  return await updateDoc(docRef, product);
};

export const deleteProduct = async (id: string) => {
  // Also should consider deleting inventory for this product
  return await deleteDoc(doc(db, 'products', id));
};

export const updateStock = async (productId: string, locationId: string, quantityDelta: number, type: StockMovement['type'] = 'adjustment', note?: string) => {
  const inventoryId = `${productId}_${locationId}`;
  const docRef = doc(db, 'inventory', inventoryId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      quantity: increment(quantityDelta),
      lastUpdated: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      productId,
      locationId,
      quantity: quantityDelta,
      lastUpdated: serverTimestamp(),
    });
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
  const saleRef = await addDoc(collection(db, 'sales'), {
    ...sale,
    status: sale.status || 'Completed',
    timestamp: serverTimestamp(),
  });

  // 2. Update inventory
  await updateStock(sale.productId, sale.locationId, -sale.quantity, 'outgoing', `Sale Order: ${saleRef.id}`);

  // 3. Check for low stock alerts
  const productRef = doc(db, 'products', sale.productId);
  const productSnap = await getDoc(productRef);
  const inventoryRef = doc(db, 'inventory', `${sale.productId}_${sale.locationId}`);
  const inventorySnap = await getDoc(inventoryRef);

  if (productSnap.exists() && inventorySnap.exists()) {
    const product = productSnap.data() as Product;
    const inventory = inventorySnap.data() as InventoryItem;
    if (inventory.quantity <= product.minStockLevel) {
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
  await deleteDoc(doc(db, 'sales', sale.id));

  // 2. Reverse inventory (restock)
  await updateStock(sale.productId, sale.locationId, sale.quantity, 'incoming', `Sale Cancelled/Deleted: ${sale.id}`);
};

export const updateSale = async (oldSale: Sale, newData: Omit<Sale, 'id' | 'timestamp'>) => {
  // 1. Reverse old inventory
  await updateStock(oldSale.productId, oldSale.locationId, oldSale.quantity, 'incoming', `Sale Updated (Reversing Old): ${oldSale.id}`);
  
  // 2. Update sale record
  await updateDoc(doc(db, 'sales', oldSale.id), {
    ...newData,
    lastUpdated: serverTimestamp()
  });

  // 3. Apply new inventory
  await updateStock(newData.productId, newData.locationId, -newData.quantity, 'outgoing', `Sale Updated (Applying New): ${oldSale.id}`);
};

export const getSales = async (): Promise<Sale[]> => {
  const querySnapshot = await getDocs(collection(db, 'sales'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
};

// Stock Movements
export const getStockMovements = async (productId: string): Promise<StockMovement[]> => {
  const q = query(
    collection(db, 'stock_movements'),
    where('productId', '==', productId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as StockMovement))
    .sort((a, b) => safeToMillis(b.timestamp) - safeToMillis(a.timestamp));
};

export const recordStockMovement = async (movement: Omit<StockMovement, 'id' | 'timestamp'>) => {
  await addDoc(collection(db, 'stock_movements'), {
    ...movement,
    timestamp: serverTimestamp(),
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
  // 1. Deduct from source
  await updateStock(productId, fromLocationId, -quantity, 'outgoing', `Transfer to ${toLocationName}`);
  
  // 2. Add to destination
  await updateStock(productId, toLocationId, quantity, 'incoming', `Transfer from ${fromLocationName}`);
};

// Notifications
export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    // orderBy('timestamp', 'desc') // Requires index
  );
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    callback(notifications);
  });
};

export const createNotification = async (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  await addDoc(collection(db, 'notifications'), {
    ...notification,
    timestamp: serverTimestamp(),
  });
};

export const markNotificationRead = async (notificationId: string) => {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

// Orders
export const getOrders = async (): Promise<Order[]> => {
  const querySnapshot = await getDocs(collection(db, 'orders'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const addOrder = async (order: Omit<Order, 'id'>) => {
  return await addDoc(collection(db, 'orders'), {
    ...order,
    status: order.status || 'Pending',
    orderDate: serverTimestamp(),
  });
};

export const updateOrder = async (id: string, order: Partial<Order>) => {
  const docRef = doc(db, 'orders', id);
  return await updateDoc(docRef, order);
};

export const deleteOrder = async (id: string) => {
  return await deleteDoc(doc(db, 'orders', id));
};

// Purchases
export const recordPurchase = async (purchase: Omit<Purchase, 'id' | 'timestamp'>) => {
  const purchaseRef = await addDoc(collection(db, 'purchases'), {
    ...purchase,
    timestamp: serverTimestamp(),
  });
  await updateStock(purchase.productId, purchase.locationId, purchase.quantity, 'incoming', `Purchase Order: ${purchaseRef.id}`);
  return purchaseRef;
};

export const deletePurchase = async (purchase: Purchase) => {
  await deleteDoc(doc(db, 'purchases', purchase.id));
  await updateStock(purchase.productId, purchase.locationId, -purchase.quantity, 'outgoing', `Purchase Cancelled/Deleted: ${purchase.id}`);
};

export const getPurchases = async (): Promise<Purchase[]> => {
  const querySnapshot = await getDocs(collection(db, 'purchases'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
};

export const clearAllData = async () => {
  const collections = ['products', 'locations', 'suppliers', 'sales', 'purchases', 'orders', 'inventory', 'inventory_history', 'categories', 'users'];
  
  for (const colName of collections) {
    const q = query(collection(db, colName));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }
};

export const seedRealData = async () => {
  // 1. Clear existing data first
  await clearAllData();

  // 2. Create Default Location
  const locationRef = await addDoc(collection(db, 'locations'), {
    name: 'Garowe Main Supermarket',
    address: 'Garowe, Puntland',
    createdAt: serverTimestamp()
  });
  const locationId = locationRef.id;

  // 3. Create Categories
  const categoriesData = [
    { name: 'Beverages', description: 'Cabitaanno' },
    { name: 'Dairy Products', description: 'Caano iyo waxyaabaha laga sameeyo' },
    { name: 'Food & Groceries', description: 'Raashin iyo cuntooyin' },
    { name: 'Snacks', description: 'Buskud, chips iyo snacks' },
    { name: 'Personal Care', description: 'Alaabta nadaafadda qofka' },
    { name: 'Household', description: 'Alaabta guriga' },
    { name: 'Fruits & Vegetables', description: 'Khudaar iyo miro' },
    { name: 'Baby Products', description: 'Alaabta carruurta' },
    { name: 'Bakery', description: 'Rooti iyo bakery' },
    { name: 'Cleaning Products', description: 'Alaabta nadiifinta' }
  ];

  const categoryMap: { [key: string]: string } = {};
  for (const cat of categoriesData) {
    const ref = await addDoc(collection(db, 'categories'), { ...cat, createdAt: serverTimestamp() });
    categoryMap[cat.name] = ref.id;
  }

  // 4. Create Suppliers
  const suppliersData = [
    { name: 'Garoowe Wholesale', contact: 'Ahmed Ali', phone: '0907-100001', address: 'Garowe' },
    { name: 'Nugaal Trading Company', contact: 'Mohamed Hassan', phone: '0907-100002', address: 'Garowe' },
    { name: 'Puntland Food Suppliers', contact: 'Abdi Jama', phone: '0907-100003', address: 'Garowe' },
    { name: 'Somali Beverage Distributor', contact: 'Yusuf Omar', phone: '0907-100004', address: 'Garowe' },
    { name: 'Horyaal General Trading', contact: 'Hassan Nur', phone: '0907-100005', address: 'Bosaso' }
  ];

  const supplierMap: { [key: string]: string } = {};
  for (const sup of suppliersData) {
    const ref = await addDoc(collection(db, 'suppliers'), { ...sup, email: `${sup.name.toLowerCase().replace(/ /g, '')}@example.com`, createdAt: serverTimestamp() });
    supplierMap[sup.name] = ref.id;
  }

  // 5. Create Products & Initial Inventory
  const productsData = [
    { name: 'Coca Cola 500ml', sku: 'BEV-001', category: 'Beverages', price: 0.70, unit: 'Bottle', minStockLevel: 20, currentStock: 85, costPrice: 0.45 },
    { name: 'Pepsi 500ml', sku: 'BEV-002', category: 'Beverages', price: 0.70, unit: 'Bottle', minStockLevel: 20, currentStock: 60, costPrice: 0.45 },
    { name: 'Water 1.5L', sku: 'BEV-003', category: 'Beverages', price: 0.50, unit: 'Bottle', minStockLevel: 30, currentStock: 120, costPrice: 0.30 },
    { name: 'Nescafe 100g', sku: 'BEV-004', category: 'Beverages', price: 3.50, unit: 'Jar', minStockLevel: 10, currentStock: 25, costPrice: 2.50 },
    { name: 'Milk 1L', sku: 'DAI-001', category: 'Dairy Products', price: 1.20, unit: 'Carton', minStockLevel: 15, currentStock: 45, costPrice: 0.90 },
    { name: 'Yogurt 500ml', sku: 'DAI-002', category: 'Dairy Products', price: 1.00, unit: 'Cup', minStockLevel: 15, currentStock: 30, costPrice: 0.70 },
    { name: 'Rice 5kg', sku: 'FOD-001', category: 'Food & Groceries', price: 6.50, unit: 'Bag', minStockLevel: 10, currentStock: 35, costPrice: 5.20 },
    { name: 'Sugar 1kg', sku: 'FOD-002', category: 'Food & Groceries', price: 1.20, unit: 'Bag', minStockLevel: 20, currentStock: 75, costPrice: 0.90 },
    { name: 'Flour 1kg', sku: 'FOD-003', category: 'Food & Groceries', price: 1.00, unit: 'Bag', minStockLevel: 15, currentStock: 50, costPrice: 0.75 },
    { name: 'Cooking Oil 1L', sku: 'FOD-004', category: 'Food & Groceries', price: 2.20, unit: 'Bottle', minStockLevel: 10, currentStock: 28, costPrice: 1.70 },
    { name: 'Pasta 500g', sku: 'FOD-005', category: 'Food & Groceries', price: 1.30, unit: 'Pack', minStockLevel: 15, currentStock: 40, costPrice: 0.95 },
    { name: 'Biscuits 100g', sku: 'SNK-001', category: 'Snacks', price: 0.60, unit: 'Pack', minStockLevel: 20, currentStock: 90, costPrice: 0.40 },
    { name: 'Potato Chips', sku: 'SNK-002', category: 'Snacks', price: 0.80, unit: 'Pack', minStockLevel: 15, currentStock: 45, costPrice: 0.55 },
    { name: 'Chocolate Bar', sku: 'SNK-003', category: 'Snacks', price: 0.75, unit: 'Piece', minStockLevel: 20, currentStock: 18, costPrice: 0.50 },
    { name: 'Toothpaste 100ml', sku: 'PER-001', category: 'Personal Care', price: 1.50, unit: 'Tube', minStockLevel: 10, currentStock: 32, costPrice: 1.10 },
    { name: 'Shampoo 400ml', sku: 'PER-002', category: 'Personal Care', price: 3.00, unit: 'Bottle', minStockLevel: 8, currentStock: 20, costPrice: 2.30 },
    { name: 'Bath Soap', sku: 'PER-003', category: 'Personal Care', price: 0.80, unit: 'Piece', minStockLevel: 15, currentStock: 55, costPrice: 0.60 },
    { name: 'Laundry Detergent 1kg', sku: 'CLN-001', category: 'Cleaning Products', price: 2.50, unit: 'Pack', minStockLevel: 10, currentStock: 35, costPrice: 1.90 },
    { name: 'Dishwashing Liquid', sku: 'CLN-002', category: 'Cleaning Products', price: 1.80, unit: 'Bottle', minStockLevel: 10, currentStock: 25, costPrice: 1.30 },
    { name: 'Toilet Cleaner', sku: 'CLN-003', category: 'Cleaning Products', price: 2.00, unit: 'Bottle', minStockLevel: 8, currentStock: 12, costPrice: 1.50 },
    { name: 'Bread', sku: 'BAK-001', category: 'Bakery', price: 0.50, unit: 'Piece', minStockLevel: 20, currentStock: 65, costPrice: 0.35 },
    { name: 'Eggs', sku: 'DAI-003', category: 'Dairy Products', price: 0.15, unit: 'Piece', minStockLevel: 30, currentStock: 180, costPrice: 0.10 },
    { name: 'Bananas', sku: 'FRV-001', category: 'Fruits & Vegetables', price: 1.50, unit: 'Kg', minStockLevel: 10, currentStock: 22, costPrice: 1.10 },
    { name: 'Potatoes', sku: 'FRV-002', category: 'Fruits & Vegetables', price: 1.20, unit: 'Kg', minStockLevel: 10, currentStock: 30, costPrice: 0.90 },
    { name: 'Diapers Medium', sku: 'BAB-001', category: 'Baby Products', price: 8.00, unit: 'Pack', minStockLevel: 5, currentStock: 14, costPrice: 6.00 }
  ];

  const productMap: { [key: string]: string } = {};
  for (const prod of productsData) {
    const productRef = await addDoc(collection(db, 'products'), {
      name: prod.name,
      sku: prod.sku,
      category: categoryMap[prod.category],
      price: prod.price,
      costPrice: prod.costPrice,
      unit: prod.unit,
      minStockLevel: prod.minStockLevel,
      createdAt: serverTimestamp()
    });
    productMap[prod.name] = productRef.id;

    // Set initial inventory
    await setDoc(doc(db, 'inventory', `${productRef.id}_${locationId}`), {
      productId: productRef.id,
      locationId: locationId,
      quantity: prod.currentStock,
      lastUpdated: serverTimestamp()
    });
  }

  // 6. Create Users
  const usersData = [
    { name: 'Admin User', username: 'admin', role: 'Admin' },
    { name: 'Ahmed Mohamed', username: 'ahmed', role: 'Manager' },
    { name: 'Hassan Ali', username: 'hassan', role: 'Staff' },
    { name: 'Mohamed Yusuf', username: 'mohamed', role: 'Staff' },
    { name: 'Abdi Omar', username: 'abdi', role: 'Staff' }
  ];

  for (const u of usersData) {
    await addDoc(collection(db, 'users'), {
      name: u.name,
      email: `${u.username}@supermarketpro.com`,
      role: u.role,
      locationIds: [locationId],
      createdAt: serverTimestamp()
    });
  }

  // 7. Create Purchases
  const purchasesData = [
    { supplier: 'Garoowe Wholesale', product: 'Coca Cola 500ml', quantity: 100, costPrice: 0.45 },
    { supplier: 'Garoowe Wholesale', product: 'Water 1.5L', quantity: 200, costPrice: 0.30 },
    { supplier: 'Nugaal Trading Company', product: 'Rice 5kg', quantity: 50, costPrice: 5.20 },
    { supplier: 'Puntland Food Suppliers', product: 'Sugar 1kg', quantity: 100, costPrice: 0.90 },
    { supplier: 'Puntland Food Suppliers', product: 'Cooking Oil 1L', quantity: 50, costPrice: 1.70 },
    { supplier: 'Somali Beverage Distributor', product: 'Pepsi 500ml', quantity: 100, costPrice: 0.45 },
    { supplier: 'Horyaal General Trading', product: 'Shampoo 400ml', quantity: 30, costPrice: 2.30 }
  ];

  for (const p of purchasesData) {
    await addDoc(collection(db, 'purchases'), {
      productId: productMap[p.product],
      locationId: locationId,
      supplierId: supplierMap[p.supplier],
      quantity: p.quantity,
      costPrice: p.costPrice,
      totalCost: p.quantity * p.costPrice,
      timestamp: serverTimestamp()
    });
  }

  // 8. Create Sales
  const salesData = [
    { invoice: 'INV-1001', items: [
      { product: 'Coca Cola 500ml', quantity: 5, price: 0.70 },
      { product: 'Biscuits 100g', quantity: 3, price: 0.60 },
      { product: 'Bread', quantity: 2, price: 0.50 }
    ]},
    { invoice: 'INV-1002', items: [
      { product: 'Rice 5kg', quantity: 2, price: 6.50 },
      { product: 'Sugar 1kg', quantity: 3, price: 1.20 }
    ]},
    { invoice: 'INV-1003', items: [
      { product: 'Milk 1L', quantity: 4, price: 1.20 },
      { product: 'Eggs', quantity: 20, price: 0.15 }
    ]},
    { invoice: 'INV-1004', items: [
      { product: 'Cooking Oil 1L', quantity: 2, price: 2.20 },
      { product: 'Pasta 500g', quantity: 3, price: 1.30 }
    ]},
    { invoice: 'INV-1005', items: [
      { product: 'Shampoo 400ml', quantity: 1, price: 3.00 }
    ]}
  ];

  for (const s of salesData) {
    for (const item of s.items) {
      await addDoc(collection(db, 'sales'), {
        productId: productMap[item.product],
        locationId: locationId,
        quantity: item.quantity,
        totalPrice: item.quantity * item.price,
        status: 'Completed',
        timestamp: serverTimestamp(),
        invoiceId: s.invoice
      });
    }
  }
};

export const updatePurchase = async (oldPurchase: Purchase, newData: Omit<Purchase, 'id' | 'timestamp'>) => {
  // 1. Reverse old inventory (subtract since it was added)
  await updateStock(oldPurchase.productId, oldPurchase.locationId, -oldPurchase.quantity, 'outgoing', `Purchase Updated (Reversing Old): ${oldPurchase.id}`);
  
  // 2. Update purchase record
  await updateDoc(doc(db, 'purchases', oldPurchase.id), {
    ...newData,
    lastUpdated: serverTimestamp()
  });

  // 3. Apply new inventory (add new quantity)
  await updateStock(newData.productId, newData.locationId, newData.quantity, 'incoming', `Purchase Updated (Applying New): ${oldPurchase.id}`);
};
