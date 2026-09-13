import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Download, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Users,
  DollarSign
} from 'lucide-react';
import { Product, Sale, Order } from '../types';
import { safeDate } from '../lib/utils';

interface ReportsProps {
  products: Product[];
  sales: Sale[];
  orders: Order[];
  onUpdateSale?: (sale: Sale, data: any) => Promise<void>;
  onUpdateOrder?: (id: string, data: any) => Promise<void>;
  setActiveTab?: (tab: string) => void;
}

export default function Reports({ products, sales, orders, onUpdateSale, onUpdateOrder, setActiveTab }: ReportsProps) {
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleSaleStatusChange = async (sale: Sale, newStatus: string) => {
    if (!onUpdateSale) return;
    setUpdatingId(sale.id);
    try {
      const { id, timestamp, ...rest } = sale;
      await onUpdateSale(sale, { ...rest, status: newStatus });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOrderStatusChange = async (order: Order, newStatus: string) => {
    if (!onUpdateOrder) return;
    setUpdatingId(order.id);
    try {
      await onUpdateOrder(order.id, { status: newStatus });
    } finally {
      setUpdatingId(null);
    }
  };

  // 1. Sales by Category
  const categorySales = sales.reduce((acc: Record<string, number>, sale) => {
    const product = products.find(p => p.id === sale.productId);
    const category = product?.category || 'Other';
    acc[category] = (acc[category] || 0) + sale.totalPrice;
    return acc;
  }, {});

  const categoryData = Object.entries(categorySales).map(([name, value]) => ({
    name,
    value
  }));

  // 2. Monthly Revenue
  const monthlyRevenue = sales.reduce((acc: Record<string, number>, sale) => {
    const date = safeDate(sale.timestamp);
    const month = date.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + sale.totalPrice;
    return acc;
  }, {});

  const revenueData = Object.entries(monthlyRevenue).map(([name, total]) => ({
    name,
    total
  }));

  // 3. Top Selling Products
  const productSales = sales.reduce((acc: Record<string, number>, sale) => {
    const product = products.find(p => p.id === sale.productId);
    const name = product?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + sale.quantity;
    return acc;
  }, {});

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, quantity]) => ({ name, quantity }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-sm text-slate-500">Detailed breakdown of your business performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <Filter size={16} />
            <span>Filter</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <span className="text-sm font-bold text-slate-500">Total Sales</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{sales.length}</h3>
          <div className="mt-2 flex items-center text-emerald-500 text-xs font-bold">
            <TrendingUp size={12} className="mr-1" />
            <span>+14% from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-sm font-bold text-slate-500">Estimated Profit</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">
            ${sales.reduce((acc, sale) => {
              const product = products.find(p => p.id === sale.productId);
              const cost = product?.costPrice || (product?.price ? product.price * 0.7 : 0);
              return acc + (sale.totalPrice - (cost * sale.quantity));
            }, 0).toLocaleString()}
          </h3>
          <div className="mt-2 flex items-center text-emerald-500 text-xs font-bold">
            <TrendingUp size={12} className="mr-1" />
            <span>Net margin analytics</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users size={20} />
            </div>
            <span className="text-sm font-bold text-slate-500">Total Orders</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900">{orders.length}</h3>
          <div className="mt-2 flex items-center text-red-500 text-xs font-bold">
            <ArrowDownRight size={12} className="mr-1" />
            <span>-3% from last month</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-8">Monthly Revenue Breakdown</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-8">Top Selling Products</h3>
          <div className="space-y-6">
            {topProducts.map((product, idx) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.quantity} units sold</p>
                  </div>
                </div>
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500" 
                    style={{ width: `${topProducts[0]?.quantity > 0 ? (product.quantity / topProducts[0].quantity) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Recent Transactions Table */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Sales & Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction ID</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.slice(0, 10).map((sale) => {
                  const product = products.find(p => p.id === sale.productId);
                  return (
                    <tr key={sale.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-sm font-bold text-slate-900">#TRN-{sale.id.slice(0, 6).toUpperCase()}</td>
                      <td className="py-4 text-sm text-slate-500">{safeDate(sale.timestamp).toLocaleDateString()}</td>
                      <td className="py-4 text-sm text-slate-600 font-medium">{product?.name || 'Unknown'}</td>
                      <td className="py-4 text-sm font-black text-slate-900">${sale.totalPrice.toLocaleString()}</td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <select 
                              value={sale.status || 'Completed'}
                              disabled={updatingId === sale.id}
                              onChange={(e) => handleSaleStatusChange(sale, e.target.value)}
                              className={`text-[10px] font-bold uppercase rounded-lg pl-2 pr-6 py-1 border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none transition-all ${
                                (sale.status || 'Completed') === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                sale.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                                'bg-rose-50 text-rose-600'
                              }`}
                            >
                              <option value="Completed">Completed</option>
                              <option value="Pending">Pending</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                              <ArrowDownRight size={10} />
                            </div>
                          </div>
                          <button 
                            onClick={() => setActiveTab?.('sales')}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Manage Sales"
                          >
                            <Filter size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Orders & Tracking</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Order ID</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 text-sm font-bold text-slate-900">#ORD-{order.id.slice(0, 6).toUpperCase()}</td>
                    <td className="py-4 text-sm text-slate-600 font-medium">{order.customerName}</td>
                    <td className="py-4 text-sm text-slate-500">{order.productName}</td>
                    <td className="py-4 text-sm font-black text-slate-900">${order.totalPrice.toLocaleString()}</td>
                    <td className="py-4">
                      <div className="flex justify-end items-center space-x-2">
                        <div className="relative">
                          <select 
                            value={order.status || 'Pending'}
                            disabled={updatingId === order.id}
                            onChange={(e) => handleOrderStatusChange(order, e.target.value)}
                            className={`text-[10px] font-bold uppercase rounded-lg pl-2 pr-6 py-1 border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none transition-all ${
                              (order.status || 'Pending') === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                              order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' :
                              order.status === 'Shipped' ? 'bg-blue-50 text-blue-600' :
                              order.status === 'Processing' ? 'bg-purple-50 text-purple-600' :
                              'bg-amber-50 text-amber-600'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                            <ArrowDownRight size={10} />
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveTab?.('orders')}
                          className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Manage Orders"
                        >
                          <Filter size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
