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
  Zap,
  LayoutGrid
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
  const totalRevenue = sales.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  
  // Calculate Expenses based on actual costPrice of products sold
  const totalExpenses = sales.reduce((acc, sale) => {
    const product = products.find(p => p.id === sale.productId);
    const cost = product?.costPrice || (product?.price ? (product.price * 0.7) : 0); // Fallback to 70% if no costPrice
    return acc + (cost * (sale.quantity || 0));
  }, 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const safeProfitMargin = isNaN(profitMargin) ? 0 : profitMargin;

  const lowStockCount = products.filter(product => {
    const currentStock = inventory
      .filter(i => i.productId === product.id)
      .reduce((acc, curr) => acc + curr.quantity, 0);
    return product.minStockLevel > 0 && currentStock <= product.minStockLevel;
  }).length;

  const totalItemsSold = sales.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  const stats = [
    { 
      label: 'Total Revenue', 
      value: `$${(totalRevenue || 0).toLocaleString()}`, 
      sublabel: 'Income today',
      color: '#00c0ef',
      icon: DollarSign
    },
    { 
      label: 'Items Sold', 
      value: totalItemsSold.toLocaleString(), 
      sublabel: 'Total volume',
      color: '#00a65a',
      icon: Package
    },
    { 
      label: 'Profit Margin', 
      value: `${(safeProfitMargin || 0).toFixed(1)}%`, 
      sublabel: 'Of traffic is profit',
      color: '#f39c12',
      icon: TrendingUp
    },
    { 
      label: 'Critical Stock', 
      value: lowStockCount.toLocaleString(), 
      sublabel: 'Items need attention',
      color: '#dd4b39',
      icon: AlertTriangle
    },
  ];

  // 2. Real Trend Data from Sales
  const last24Hours = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (23 - i), 0, 0, 0);
    return d;
  });

  const hourlyTrendData = last24Hours.map(date => {
    const hourSales = sales.filter(s => {
      const sDate = safeDate(s.timestamp);
      return sDate.getHours() === date.getHours() && sDate.getDate() === date.getDate();
    });
    const revenue = hourSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
    return {
      time: date.getHours() + ':00',
      revenue: revenue,
      sales: hourSales.length
    };
  });

  // 3. Monthly Trend (Last 6 Months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleString('default', { month: 'short' });
  });

  const monthlyTrendData = last6Months.map(month => {
    const monthSales = sales.filter(s => {
      const date = safeDate(s.timestamp);
      return date.toLocaleString('default', { month: 'short' }) === month;
    });
    const revenue = monthSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const profit = monthSales.reduce((acc, sale) => {
      const product = products.find(p => p.id === sale.productId);
      const cost = product?.costPrice || (product?.price ? product.price * 0.7 : 0);
      return acc + (sale.totalPrice - (cost * sale.quantity));
    }, 0);
    return {
      name: month,
      revenue,
      profit
    };
  });

  // 4. Real Income Summary (by Category)
  const categoryRevenue: Record<string, number> = {};
  sales.forEach(sale => {
    const product = products.find(p => p.id === sale.productId);
    const category = product?.category || 'Uncategorized';
    categoryRevenue[category] = (categoryRevenue[category] || 0) + sale.totalPrice;
  });

  const incomeData = Object.entries(categoryRevenue).map(([name, value], idx) => ({
    name,
    value,
    color: ['#0073b7', '#00c0ef', '#00a65a', '#f39c12', '#dd4b39'][idx % 5]
  })).slice(0, 5);

  if (incomeData.length === 0) {
    incomeData.push({ name: 'No Sales Yet', value: 1, color: '#f1f5f9' });
  }

  // 5. Top Products (Bar Chart)
  const productSales: Record<string, number> = {};
  sales.forEach(sale => {
    const product = products.find(p => p.id === sale.productId);
    const name = product?.name || 'Unknown';
    productSales[name] = (productSales[name] || 0) + sale.quantity;
  });

  const topProductsData = Object.entries(productSales)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-8 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Overview Dashboard</h2>
          <p className="text-xs text-slate-500">Real-time inventory metrics & sales insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
          >
            <Zap size={14} />
            <span>Quick Actions</span>
          </button>
        </div>
      </div>

      {/* Top Stats Cards - Pi-hole Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            style={{ backgroundColor: stat.color }}
            className="relative overflow-hidden p-4 rounded shadow-sm text-white h-24 flex flex-col justify-between"
          >
            <div className="relative z-10">
              <h3 className="text-3xl font-bold leading-tight tracking-tight">{stat.value}</h3>
              <p className="text-xs font-normal opacity-90">{stat.label}</p>
            </div>
            <div className="relative z-10 flex items-center text-[10px] opacity-80 italic">
              {stat.sublabel}
            </div>
            <div className="absolute right-2 top-2 opacity-10">
              <stat.icon size={56} strokeWidth={1.5} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Chart Section - Pi-hole style with Dual Axis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow-sm border-t-2 border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">Daily Sales activity (24h)</h3>
            <div className="flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-[#00a65a]" />
                <span className="text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-[#00c0ef]" />
                <span className="text-slate-500">Qty</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyTrendData}>
                  <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    axisLine={{ stroke: '#ddd' }} 
                    tickLine={false} 
                    tick={{fill: '#999', fontSize: 10}}
                    interval={2}
                  />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#00a65a" strokeWidth={2} fill="#00a65a" fillOpacity={0.05} />
                  <Area yAxisId="right" type="monotone" dataKey="sales" stroke="#00c0ef" strokeWidth={2} fill="#00c0ef" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border-t-2 border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">Monthly Performance Trend</h3>
            <div className="flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-[#00a65a]" />
                <span className="text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-[#f39c12]" />
                <span className="text-slate-500">Profit</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="1 1" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={{ stroke: '#ddd' }} tickLine={false} tick={{fill: '#999', fontSize: 10}} />
                  <YAxis axisLine={{ stroke: '#ddd' }} tickLine={false} tick={{fill: '#999', fontSize: 10}} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#00a65a" strokeWidth={2} fill="#00a65a" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="profit" stroke="#f39c12" strokeWidth={2} fill="#f39c12" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded shadow-sm border-t-2 border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-medium text-slate-700">Revenue by Category</h3>
          </div>
          <div className="p-4">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={incomeData} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="#fff" strokeWidth={2}>
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {incomeData.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] font-medium text-slate-600 truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white rounded shadow-sm border-t-2 border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-medium text-slate-700">Top Selling Products</h3>
          </div>
          <div className="p-4">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="1 1" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 9}} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00c0ef" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stock Availability */}
        <div className="bg-white rounded shadow-sm border-t-2 border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-medium text-slate-700">Stock Availability</h3>
          </div>
          <div className="p-4 overflow-auto max-h-[220px]">
             <StockAlerts products={products} inventory={inventory} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm border-t-2 border-slate-200 p-4">
        <ForecastChart products={products} sales={sales} />
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

