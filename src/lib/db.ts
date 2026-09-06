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
