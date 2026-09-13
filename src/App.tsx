/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, getDocs, where } from 'firebase/firestore';
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
import SettingsManager from './components/SettingsManager';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import { clearAllData, seedRealData } from './lib/db';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

function AppContent() {
  const { user, profile, loading, isAdmin, isManager, isStaff } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Modal State for generic CRUD
  const [isDataModalOpen, setIsDataModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<'category' | 'supplier' | 'user' | null>(null);
  const [editingItem, setEditingItem] = React.useState<any>(null);
  const [dataFormData, setDataFormData] = React.useState<any>({});

  // Real-time Data Listeners
  React.useEffect(() => {
    if (!user) return;

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => console.error('Products listener error:', error));

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
      setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
    }, (error) => console.error('Locations listener error:', error));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => console.error('Categories listener error:', error));

    const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }, (error) => console.error('Suppliers listener error:', error));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => console.error('Users listener error:', error));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => console.error('Inventory listener error:', error));

    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('timestamp', 'desc')), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    }, (error) => console.error('Sales listener error:', error));

    const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('timestamp', 'desc')), (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => console.error('Notifications listener error:', error));

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('orderDate', 'desc')), (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => console.error('Orders listener error:', error));

    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), orderBy('timestamp', 'desc')), (snap) => {
      setPurchases(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
    }, (error) => console.error('Purchases listener error:', error));

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
  }, [user]);

  const handleOpenDataModal = (type: 'category' | 'supplier' | 'user', item?: any) => {
    setModalType(type);
    if (item) {
      setEditingItem(item);
      setDataFormData(item);
    } else {
      setEditingItem(null);
      if (type === 'category') setDataFormData({ name: '', description: '' });
      else if (type === 'supplier') setDataFormData({ name: '', phone: '', email: '', address: '' });
      else setDataFormData({ name: '', email: '', role: 'Staff' });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout 
      user={profile || { id: user.uid, email: user.email || '', name: user.displayName || 'User', role: 'Staff', locationIds: [], createdAt: new Date() }} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
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
              userRole={profile?.role}
              onAddProduct={addProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
            />
          )}
          {activeTab === 'categories' && isManager && (
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
          {activeTab === 'purchases' && isManager && (
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
          {activeTab === 'suppliers' && isManager && (
            <SupplierManager 
              suppliers={suppliers}
              onAdd={addSupplier}
              onUpdate={updateSupplier}
              onDelete={deleteSupplier}
            />
          )}
          {activeTab === 'users' && isAdmin && (
            <UserManager 
              users={users}
              onAdd={createUserProfile}
              onUpdate={updateUser}
              onDelete={(id) => handleDataDelete('user', id)}
            />
          )}
          {activeTab === 'reports' && isManager && (
            <Reports 
              products={products}
              sales={sales}
              orders={orders}
              onUpdateSale={updateSale}
              onUpdateOrder={updateOrder}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'profile' && profile && (
            <ProfileView 
              user={profile} 
              onUpdate={(updated) => console.log('Update profile:', updated)}
            />
          )}
          {activeTab === 'settings' && isAdmin && (
            <SettingsManager />
          )}
        </motion.div>
      </AnimatePresence>

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
                      value={dataFormData.role || 'Staff'}
                      onChange={(e) => setDataFormData({...dataFormData, role: e.target.value})}
                    >
                      <option value="Staff">Staff</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
