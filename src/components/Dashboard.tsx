import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Calendar,
  Zap
} from 'lucide-react';
import { Product, Sale, InventoryItem, Location, StockMovement } from '../types';
import ForecastChart from './ForecastChart';
import StockAlerts from './StockAlerts';
import SalesTrendChart from './SalesTrendChart';
import QuickActionSidebar from './QuickActionSidebar';
import { safeDate } from '../lib/utils';

interface DashboardProps {
  products: Product[];
  locations: Location[];
  sales: Sale[];
  inventory: InventoryItem[];
  onRecordSale: (sale: any) => Promise<any>;
  onUpdateStock: (productId: string, locationId: string, quantity: number, type: StockMovement['type'], reason?: string) => Promise<void>;
}

export default function Dashboard({ products, locations, sales, inventory, onRecordSale, onUpdateStock }: DashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  // 1. Calculate Real Metrics
  const totalRevenue = sales.reduce((acc, curr) => acc + curr.totalPrice, 0);
  
  // Calculate Expenses based on actual costPrice of products sold
  const totalExpenses = sales.reduce((acc, sale) => {
    const product = products.find(p => p.id === sale.productId);
    const cost = product?.costPrice || (product?.price ? product.price * 0.7 : 0); // Fallback to 70% if no costPrice
    return acc + (cost * sale.quantity);
  }, 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const stats = [
    { 
      label: 'Total Revenue', 
      value: `$${totalRevenue.toLocaleString()}`, 
      change: sales.length > 0 ? '+100%' : '0%', 
      isPositive: true,
      color: 'text-blue-600'
    },
    { 
      label: 'Total Expenses', 
      value: `$${totalExpenses.toLocaleString()}`, 
      change: '+0%', 
      isPositive: false,
      color: 'text-red-500'
    },
    { 
      label: 'Net Profit', 
      value: `$${netProfit.toLocaleString()}`, 
      change: '+0%', 
      isPositive: true,
      color: 'text-emerald-500'
    },
    { 
      label: 'Profit Margin', 
      value: `${profitMargin.toFixed(1)}%`, 
      change: '+0%', 
      isPositive: true,
      color: 'text-slate-900'
    },
  ];

  // 2. Real Trend Data from Sales
  const last6Months = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (6 - i));
    return d.toLocaleString('default', { month: 'short' });
  });

  const trendData = last6Months.map(month => {
    const monthSales = sales.filter(s => {
      const date = safeDate(s.timestamp);
      return date.toLocaleString('default', { month: 'short' }) === month;
    });
    const revenue = monthSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const expenses = monthSales.reduce((acc, sale) => {
      const product = products.find(p => p.id === sale.productId);
      const cost = product?.costPrice || (product?.price ? product.price * 0.7 : 0);
      return acc + (cost * sale.quantity);
    }, 0);
    return {
      name: month,
      revenue,
      expenses,
      profit: revenue - expenses
    };
  });

  // 3. Real Income Summary (by Category)
  const categoryRevenue: Record<string, number> = {};
  sales.forEach(sale => {
    const product = products.find(p => p.id === sale.productId);
    const category = product?.category || 'Uncategorized';
    categoryRevenue[category] = (categoryRevenue[category] || 0) + sale.totalPrice;
  });

  const incomeData = Object.entries(categoryRevenue).map(([name, value], idx) => ({
    name,
    value,
    color: ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8'][idx % 5]
  })).slice(0, 3);

  // 4. Sales Volume per Product (Last 30 Days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSales = sales.filter(s => safeDate(s.timestamp) >= thirtyDaysAgo);
  const productSalesVolume: Record<string, number> = {};
  recentSales.forEach(sale => {
    productSalesVolume[sale.productId] = (productSalesVolume[sale.productId] || 0) + sale.quantity;
  });

  const volumeData = Object.entries(productSalesVolume)
    .map(([productId, volume]) => {
      const product = products.find(p => p.id === productId);
      return {
        name: product?.name || 'Unknown',
        volume
      };
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8); // Top 8 products for better visual fit

  // If no data, provide a fallback for the UI
  if (incomeData.length === 0) {
    incomeData.push({ name: 'No Sales Yet', value: 1, color: '#f1f5f9' });
  }

  const expenseData = [
    { name: 'Cost of Goods', value: totalExpenses * 0.8, color: '#ef4444' },
    { name: 'Operating Exp', value: totalExpenses * 0.15, color: '#f87171' },
    { name: 'Other', value: totalExpenses * 0.05, color: '#fca5a5' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Overview</h2>
          <p className="text-sm text-slate-500">Real-time financial performance tracking</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Zap size={16} className="fill-current" />
            <span>Quick Action</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            <Calendar size={16} />
            <span>This Month</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className={`text-3xl font-black ${stat.color} mb-2`}>{stat.value}</h3>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold ${stat.isPositive ? 'text-emerald-500' : 'text-red-500'} flex items-center`}>
                {stat.isPositive ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                {stat.change}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Profit Trend Line Chart */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-slate-900">Profit Trend</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-bold text-slate-500">Revenue</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-xs font-bold text-slate-500">Expenses</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold text-slate-500">Net Profit</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Volume Bar Chart */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Top Selling Products</h3>
            <p className="text-xs text-slate-500 font-medium">Sales volume over the last 30 days</p>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 bg-slate-50 rounded-lg">
            <Activity size={14} className="text-indigo-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Market Traction</span>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} layout="vertical" margin={{ left: 40, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#475569', fontSize: 11, fontWeight: 700}}
                width={120}
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
              />
              <Bar 
                dataKey="volume" 
                fill="#6366f1" 
                radius={[0, 8, 8, 0]} 
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Summary Donut */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Income Summary</h3>
          <div className="flex items-center">
            <div className="h-[200px] w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-4">
              {incomeData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expense Summary Donut */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Expense Summary</h3>
          <div className="flex items-center">
            <div className="h-[200px] w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-4">
              {expenseData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keep AI Intelligence & Stock Alerts below */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ForecastChart products={products} sales={sales} />
        </div>
        <StockAlerts products={products} inventory={inventory} />
      </div>

      <QuickActionSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        products={products}
        locations={locations}
        inventory={inventory}
        onRecordSale={onRecordSale}
        onUpdateStock={onUpdateStock}
      />
    </div>
  );
}
