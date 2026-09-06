import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Package, 
  LayoutGrid, 
  ShoppingCart, 
  Truck, 
  Users, 
  User,
  LogOut,
  Search,
  Plus,
  Receipt,
  FileText,
  Settings,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Layout({ 
  children, 
  user, 
  activeTab, 
  setActiveTab,
  searchQuery,
  setSearchQuery
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: LayoutGrid },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'suppliers', label: 'Suppliers', icon: Receipt },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredItems = menuItems;

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-[#0f172a] text-white flex flex-col fixed h-full z-30 transition-all duration-300"
      >
        <div className="h-20 flex items-center px-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-600/30">
            <Package size={18} className="text-white" />
          </div>
          {isSidebarOpen && (
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Supermarket Pro
            </span>
          )}
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-white'} />
              {isSidebarOpen && <span className="ml-4 text-sm font-semibold">{item.label}</span>}
              {activeTab === item.id && isSidebarOpen && (
                <div className="absolute right-3">
                  <ChevronRight size={14} />
                </div>
              )}
            </button>
          ))}

          <button 
            onClick={async () => {
              await auth.signOut();
              localStorage.removeItem('inventory_pro_local_mode');
              window.location.reload();
            }}
            className="w-full flex items-center p-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-4 text-sm font-semibold">Logout</span>}
          </button>
        </nav>


        <div className="p-3">
          {/* Bottom space preserved but items moved up */}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main 
        className={`flex-1 transition-all duration-300 min-h-screen pb-20`}
        style={{ marginLeft: isSidebarOpen ? 260 : 80 }}
      >
        <header className="bg-white h-20 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm shadow-slate-100">
          <h1 className="text-4xl font-extrabold text-slate-800 capitalize tracking-tight">{activeTab}</h1>
          
          <div className="flex-1 max-w-2xl mx-12">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-emerald-600 transition-colors" />
              <input 
                type="text"
                placeholder="Search products, orders, SKUs..."
                className="w-full bg-slate-50 border-none rounded-[20px] pl-14 pr-12 py-4 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none font-medium transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <Plus className="rotate-45 w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
              {user?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
