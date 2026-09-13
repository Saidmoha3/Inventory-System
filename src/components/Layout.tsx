import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

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
  const [isSidebarHovered, setIsSidebarHovered] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Determine effective expanded state for desktop
  const isExpanded = isSidebarOpen || isSidebarHovered;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Staff'] },
    { id: 'products', label: 'Products', icon: Package, roles: ['Admin', 'Manager', 'Staff'] },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, roles: ['Admin', 'Manager'] },
    { id: 'sales', label: 'Sales', icon: ShoppingCart, roles: ['Admin', 'Manager', 'Staff'] },
    { id: 'purchases', label: 'Purchases', icon: Truck, roles: ['Admin', 'Manager'] },
    { id: 'suppliers', label: 'Suppliers', icon: Receipt, roles: ['Admin', 'Manager'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['Admin'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['Admin', 'Manager'] },
    { id: 'profile', label: 'Profile', icon: User, roles: ['Admin', 'Manager', 'Staff'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] },
  ];

  const filteredItems = menuItems.filter(item => user && item.roles.includes(user.role));

  const mobileNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Products' },
    { id: 'sales', icon: ShoppingCart, label: 'Sales' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'profile', icon: User, label: 'Profile' },
  ].filter(item => user && menuItems.find(mi => mi.id === item.id)?.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row w-full overflow-x-hidden font-sans">
      <OfflineIndicator />
      
      {/* Sidebar - Desktop (ChatGPT-style hover & collapse) */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 250 : 72 }}
        onMouseEnter={() => {
          if (!isSidebarOpen) setIsSidebarHovered(true);
        }}
        onMouseLeave={() => {
          setIsSidebarHovered(false);
        }}
        className={`bg-[#0f172a] text-white hidden lg:flex flex-col fixed top-0 bottom-0 left-0 z-40 transition-all duration-300 ease-in-out shadow-xl ${
          !isSidebarOpen && isSidebarHovered ? 'ring-2 ring-indigo-500/30' : ''
        }`}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center ${isExpanded ? 'justify-between px-4' : 'justify-center'} border-b border-slate-800/80 transition-all duration-300`}>
          <div className="flex items-center overflow-hidden">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
              <Package size={20} className="text-white" />
            </div>
            {isExpanded && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-base font-bold tracking-tight text-white ml-3 whitespace-nowrap truncate"
              >
                InventoryPro
              </motion.span>
            )}
          </div>
          
          {isExpanded && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white shrink-0 ml-1"
              title={isSidebarOpen ? "Collapse sidebar" : "Pin sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={!isExpanded ? item.label : undefined}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white font-medium'
              }`}
            >
              <item.icon size={20} className={`shrink-0 ${activeTab === item.id ? 'text-white' : 'group-hover:text-white'}`} />
              
              {isExpanded && (
                <span className="ml-3 text-sm truncate">{item.label}</span>
              )}

              {activeTab === item.id && isExpanded && (
                <div className="ml-auto">
                  <ChevronRight size={14} className="opacity-70" />
                </div>
              )}

              {/* Tooltip on hover when collapsed */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-slate-800/80 space-y-1">
          <button 
            onClick={async () => {
              await auth.signOut();
              localStorage.removeItem('inventory_pro_local_mode');
              window.location.reload();
            }}
            title={!isExpanded ? "Logout" : undefined}
            className="w-full flex items-center px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group relative"
          >
            <LogOut size={20} className="shrink-0 group-hover:text-red-400" />
            {isExpanded && <span className="ml-3 text-sm font-medium">Logout</span>}
            {!isExpanded && (
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-red-400 text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700">
                Logout
              </div>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-[#0f172a] text-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    <Package size={18} className="text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight">InventoryPro</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center p-3.5 rounded-xl transition-all ${
                      activeTab === item.id 
                        ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white font-medium'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="ml-3 text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-800 space-y-3">
                <button 
                  onClick={async () => {
                    await auth.signOut();
                    localStorage.removeItem('inventory_pro_local_mode');
                    window.location.reload();
                  }}
                  className="w-full flex items-center p-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <LogOut size={20} />
                  <span className="ml-3 text-sm font-semibold">Logout</span>
                </button>
                <PWAInstallButton />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isSidebarOpen ? 'lg:ml-[250px]' : 'lg:ml-[72px]'
      }`}>
        {/* Sticky Top Header */}
        <header className="bg-white/90 backdrop-blur-md h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-sm border-b border-slate-200/80">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Mobile Hamburger Menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              aria-label="Open mobile menu"
            >
              <Menu size={22} />
            </button>

            <h1 className="text-lg sm:text-2xl font-black text-slate-800 capitalize tracking-tight truncate lg:ml-2">
              {menuItems.find(m => m.id === activeTab)?.label || activeTab}
            </h1>
          </div>
          
          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative group w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="Search inventory, sales, suppliers..."
                className="w-full bg-slate-100/80 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-400 outline-none font-medium transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">{user?.name || 'User'}</p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{user?.role || 'Staff'}</p>
            </div>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Mobile Search Bar (under header on small screens) */}
        <div className="md:hidden px-4 py-2 bg-white border-b border-slate-200">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search..."
              className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Page Content Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 w-full min-w-0 max-w-[1600px] mx-auto">
          {children}
        </main>

        {/* Bottom Navigation for Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-2 flex justify-around items-center z-30 shadow-lg">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center relative ${
                activeTab === item.id 
                  ? 'text-indigo-600 font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] mt-0.5 font-semibold">{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-mobile-dot"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full"
                />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
