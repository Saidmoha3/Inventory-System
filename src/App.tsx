/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  getUserProfile, 
  getUsers,
  addProduct, 
  updateProduct,
  deleteProduct,
  addLocation, 
  updateLocation,
  deleteLocation,
  updateStock, 
  addCategory, 
  updateCategory,
  deleteCategory,
  addSupplier, 
  updateSupplier,
  deleteSupplier,
  recordSale,
  updateSale,
  createUserProfile,
  updateUser,
  deleteUser,
  getOrders,
  addOrder,
  updateOrder,
  deleteOrder
} from './lib/db';
import { 
  UserProfile, 
  Product, 
  Location, 
  InventoryItem, 
  Sale, 
  Purchase,
  Notification,
  Category,
  Supplier,
  Order
} from './types';

import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import SalesManager from './components/SalesManager';
import PurchaseManager from './components/PurchaseManager';
import DataList from './components/DataList';
import ProfileView from './components/ProfileView';
import CategoryManager from './components/CategoryManager';
import OrderManager from './components/OrderManager';
import SupplierManager from './components/SupplierManager';
import UserManager from './components/UserManager';
import Reports from './components/Reports';

export default function App() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Auth Listener
  React.useEffect(() => {
    const isLocalMode = localStorage.getItem('inventory_pro_local_mode') === 'true';
    
    if (isLocalMode) {
      setUser({
        id: 'sample_admin',
        email: 'admin@inventorypro.sample',
        name: 'Sample Admin (Local Mode)',
        role: 'admin',
        locationIds: [],
        createdAt: new Date()
      });
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid);
        if (profile) {
          setUser(profile);
        } else {
          // Fallback if profile doesn't exist yet (should be created in Auth.tsx)
          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'User',
            role: 'staff',
            locationIds: [],
            createdAt: new Date()
          });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Modal State for generic CRUD
  const [isDataModalOpen, setIsDataModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<'category' | 'supplier' | 'user' | null>(null);
  const [editingItem, setEditingItem] = React.useState<any>(null);
  const [dataFormData, setDataFormData] = React.useState<any>({});

  // Data State
  const [products, setProducts] = React.useState<Product[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  // Real-time Data Listeners
  React.useEffect(() => {
    const seedData = async () => {
      // Check if we need to seed
      const productsSnap = await getDocs(collection(db, 'products'));
      if (productsSnap.empty) {
        console.log('App: Seeding comprehensive sample data...');
        
        // 1. Seed Locations
        const loc1 = await addLocation({ name: 'Supermarket Main Branch', address: 'Waddada Makka Al-Mukarrama, Muqdisho' });
        const loc2 = await addLocation({ name: 'Supermarket Warehouse', address: 'Suuqa Bakaaraha, Muqdisho' });
        
        // 2. Seed Categories
        const categories = [
          { name: 'Dairy & Eggs', description: 'Caanaha, Ukunta, iyo Jiiska' },
          { name: 'Beverages', description: 'Casiirrada, Biyaha, iyo Cabitaannada fudud' },
          { name: 'Grocery & Staples', description: 'Bariis, Sonkor, Saliid, iyo Baasto' },
          { name: 'Personal Care', description: 'Saabuun, Shaambo, iyo agabka nadaafadda' },
          { name: 'Electronics', description: 'Agabka korontada' }
        ];
        for (const cat of categories) await addCategory(cat);

        // 3. Seed Suppliers
        const suppliers = [
          { name: 'Somali Dairy Co.', phone: '061555111', email: 'info@somdairy.so', address: 'Muqdisho' },
          { name: 'Global Trading Ltd', phone: '061555222', email: 'sales@global.so', address: 'Muqdisho' }
        ];
        for (const sup of suppliers) await addSupplier(sup);

        // 4. Seed Users
        const sampleUsers = [
          { name: 'Ahmed Ali', email: 'ahmed@inventory.com', role: 'admin' as const, locationIds: [loc1.id] },
          { name: 'Fatuma Osman', email: 'fatuma@inventory.com', role: 'staff' as const, locationIds: [loc2.id] },
          { name: 'Mohamed Bare', email: 'mohamed@inventory.com', role: 'staff' as const, locationIds: [loc1.id, loc2.id] }
        ];
        for (const u of sampleUsers) {
          // We use setDoc for users because we want to simulate profiles
          await createUserProfile(`user_${Math.random().toString(36).substr(2, 9)}`, { ...u });
        }
        
        // 5. Seed Products & Initial Inventory
        const sampleProducts = [
          { name: 'Milk (1L)', sku: 'DAI-MILK-001', category: 'Dairy & Eggs', price: 1.5, minStockLevel: 20, unit: 'bottle' },
          { name: 'Rice (25kg)', sku: 'GRO-RICE-001', category: 'Grocery & Staples', price: 25, minStockLevel: 10, unit: 'bag' },
          { name: 'Sugar (50kg)', sku: 'GRO-SUG-001', category: 'Grocery & Staples', price: 40, minStockLevel: 5, unit: 'bag' },
          { name: 'Cooking Oil (5L)', sku: 'GRO-OIL-001', category: 'Grocery & Staples', price: 12, minStockLevel: 15, unit: 'can' },
          { name: 'Orange Juice', sku: 'BEV-JUI-001', category: 'Beverages', price: 2, minStockLevel: 30, unit: 'bottle' },
          { name: 'Mineral Water (500ml)', sku: 'BEV-WAT-001', category: 'Beverages', price: 0.5, minStockLevel: 50, unit: 'bottle' },
          { name: 'Shampoo (400ml)', sku: 'PER-SHA-001', category: 'Personal Care', price: 4.5, minStockLevel: 10, unit: 'bottle' }
        ];

        for (const p of sampleProducts) {
          const prodRef = await addProduct(p);
          const q1 = Math.floor(Math.random() * 30) + 15;
          const q2 = Math.floor(Math.random() * 20) + 5;
          await updateStock(prodRef.id, loc1.id, q1, 'incoming', 'Initial Seed Stock');
          await updateStock(prodRef.id, loc2.id, q2, 'incoming', 'Initial Seed Stock');

          // 6. Seed some Sales (Orders)
          await recordSale({
            productId: prodRef.id,
            locationId: loc1.id,
            quantity: 2,
            totalPrice: p.price * 2
          });

          // Add a second sale for more data diversity
          await recordSale({
            productId: prodRef.id,
            locationId: loc2.id,
            quantity: 1,
            totalPrice: p.price
          });
        }

        // 7. Seed Specific Order from Screenshot
        await addOrder({
          customerName: 'arif khan',
          address: 'main street',
          productName: 'Monitor',
          category: 'Electronic',
          quantity: 2,
          totalPrice: 1000.00,
          orderDate: new Date('2025-03-18')
        });
      }
    };

    seedData();

    // 8. Ensure requested suppliers exist
    const ensureSuppliers = async () => {
      const requestedSuppliers = [
        'Towfiiq Company',
        'Baba-Mama Company',
        'Golis Telecom',
        'Daauus Company',
        'Caalami Group',
        'Danwadaag'
      ];
      
      try {
        const querySnapshot = await getDocs(collection(db, 'suppliers'));
        const existingNames = querySnapshot.docs.map(doc => (doc.data() as Supplier).name);

        for (const name of requestedSuppliers) {
          if (!existingNames.includes(name)) {
            await addSupplier({
              name,
              email: `info@${name.toLowerCase().replace(/\s+/g, '')}.com`,
              phone: '+252 61XXXXX',
              address: 'Somalia'
            });
          }
        }
      } catch (err) {
        console.error("Error seeding suppliers:", err);
      }
    };

    // 9. Ensure requested categories exist
    const ensureCategories = async () => {
      const requestedCategories = [
        'Food',
        'Condiments',
        'Sweets',
        'Perfumes',
        'Shampoo',
        'Detergent',
        'Electronics'
      ];
      
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const existingNames = querySnapshot.docs.map(doc => (doc.data() as Category).name);

        for (const name of requestedCategories) {
          if (!existingNames.includes(name)) {
            await addCategory({
              name,
              description: `${name} items category`
            });
          }
        }
      } catch (err) {
        console.error("Error seeding categories:", err);
      }
    };

    ensureSuppliers();
    ensureCategories();

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
      setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });

    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('timestamp', 'desc')), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });

    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), orderBy('timestamp', 'desc')), (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('orderDate', 'desc')), (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), orderBy('timestamp', 'desc')), (snap) => {
      setPurchases(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    });

    return () => {
      unsubProducts();
      unsubLocations();
      unsubCategories();
      unsubSuppliers();
      unsubUsers();
      unsubInventory();
      unsubSales();
      unsubNotifs();
      unsubOrders();
      unsubPurchases();
    };
  }, []);

  const handleOpenDataModal = (type: 'category' | 'supplier' | 'user', item?: any) => {
    setModalType(type);
    if (item) {
      setEditingItem(item);
      setDataFormData(item);
    } else {
      setEditingItem(null);
      if (type === 'category') setDataFormData({ name: '', description: '' });
      else if (type === 'supplier') setDataFormData({ name: '', phone: '', email: '', address: '' });
      else setDataFormData({ name: '', email: '', role: 'staff' });
    }
    setIsDataModalOpen(true);
  };

  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'category') {
      if (editingItem) await updateCategory(editingItem.id, dataFormData);
      else await addCategory(dataFormData);
    } else if (modalType === 'supplier') {
      if (editingItem) await updateSupplier(editingItem.id, dataFormData);
      else await addSupplier(dataFormData);
    } else if (modalType === 'user') {
      if (editingItem) await updateUser(editingItem.id, dataFormData);
    }
    setIsDataModalOpen(false);
  };

  const handleDataDelete = async (type: 'category' | 'supplier' | 'user', id: string) => {
    if (type === 'category') await deleteCategory(id);
    else if (type === 'supplier') await deleteSupplier(id);
    else await deleteUser(id);
  };

  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      (p.name?.toLowerCase() || '').includes(query) || 
      (p.sku?.toLowerCase() || '').includes(query) ||
      (p.category?.toLowerCase() || '').includes(query)
    );
  });

  const filteredSales = sales.filter(s => {
    const product = products.find(p => p.id === s.productId);
    const query = searchQuery.toLowerCase();
    return (
      (product?.name?.toLowerCase() || '').includes(query) ||
      (product?.sku?.toLowerCase() || '').includes(query) ||
      (s.id?.toLowerCase() || '').includes(query)
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          products={filteredProducts} 
          locations={locations}
          sales={filteredSales} 
          inventory={inventory} 
          onRecordSale={recordSale}
          onUpdateStock={updateStock}
        />
      )}
      {activeTab === 'products' && (
        <InventoryList 
          products={filteredProducts} 
          locations={locations} 
          categories={categories}
          suppliers={suppliers}
          inventory={inventory} 
          sales={sales}
          userRole={user?.role}
          onAddProduct={addProduct}
          onUpdateProduct={updateProduct}
          onDeleteProduct={deleteProduct}
        />
      )}
      {activeTab === 'categories' && (
        <CategoryManager 
          categories={categories}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
        />
      )}
      {activeTab === 'sales' && (
        <SalesManager 
          products={products}
          locations={locations}
          sales={sales}
          inventory={inventory}
          onAddProduct={addProduct}
        />
      )}
      {activeTab === 'purchases' && (
        <PurchaseManager 
          products={products}
          locations={locations}
          purchases={purchases}
          suppliers={suppliers}
          inventory={inventory}
          onAddProduct={addProduct}
        />
      )}
      {activeTab === 'orders' && (
        <OrderManager 
          orders={orders}
          onAdd={addOrder}
          onUpdate={updateOrder}
          onDelete={deleteOrder}
        />
      )}
      {activeTab === 'suppliers' && (
        <SupplierManager 
          suppliers={suppliers}
          onAdd={addSupplier}
          onUpdate={updateSupplier}
          onDelete={deleteSupplier}
        />
      )}
      {activeTab === 'users' && (
        <UserManager 
          users={users}
          onAdd={createUserProfile}
          onUpdate={updateUser}
          onDelete={(id) => handleDataDelete('user', id)}
        />
      )}
      {activeTab === 'reports' && (
        <Reports 
          products={products}
          sales={sales}
          orders={orders}
          onUpdateSale={updateSale}
          onUpdateOrder={updateOrder}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === 'profile' && user && (
        <ProfileView 
          user={user} 
          onUpdate={(updated) => setUser({ ...user, ...updated })}
        />
      )}

      {/* Generic CRUD Modal */}
      {isDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDataModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">
              {editingItem ? 'Edit' : 'Add'} {modalType === 'category' ? 'Category' : modalType === 'supplier' ? 'Supplier' : 'User'}
            </h3>
            <form onSubmit={handleDataSubmit} className="space-y-4">
              {modalType === 'category' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Category Name</label>
                    <input
                      type="text" required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={dataFormData.name || ''}
                      onChange={(e) => setDataFormData({...dataFormData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none h-32"
                      value={dataFormData.description || ''}
                      onChange={(e) => setDataFormData({...dataFormData, description: e.target.value})}
                    />
                  </div>
                </>
              ) : modalType === 'supplier' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Company Name</label>
                    <input
                      type="text" required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={dataFormData.name || ''}
                      onChange={(e) => setDataFormData({...dataFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={dataFormData.phone || ''}
                        onChange={(e) => setDataFormData({...dataFormData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={dataFormData.email || ''}
                      onChange={(e) => setDataFormData({...dataFormData, email: e.target.value})}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                    <input
                      type="text" required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={dataFormData.name || ''}
                      onChange={(e) => setDataFormData({...dataFormData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                    <input
                      type="email" required disabled={!!editingItem}
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                      value={dataFormData.email || ''}
                      onChange={(e) => setDataFormData({...dataFormData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                    <select
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={dataFormData.role || 'staff'}
                      onChange={(e) => setDataFormData({...dataFormData, role: e.target.value})}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsDataModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
