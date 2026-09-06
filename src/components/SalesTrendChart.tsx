import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import { Sale } from '../types';
import { safeDate } from '../lib/utils';
import { motion } from 'motion/react';

interface SalesTrendChartProps {
  sales: Sale[];
}

export default function SalesTrendChart({ sales }: SalesTrendChartProps) {
  const chartData = React.useMemo(() => {
    const data = [];
    const now = startOfDay(new Date());

    for (let i = 29; i >= 0; i--) {
      const day = subDays(now, i);
      const daySales = sales.filter(sale => isSameDay(safeDate(sale.timestamp), day));
      const dailyTotal = daySales.reduce((acc, curr) => acc + curr.totalPrice, 0);

      data.push({
        date: format(day, 'MMM dd'),
        revenue: dailyTotal,
      });
    }
    return data;
  }, [sales]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-10 rounded-[32px] shadow-sm border border-slate-100"
    >
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Sales Trend</h3>
          <p className="text-sm text-slate-500 font-medium">Daily revenue over the last 30 days</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-xl">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Live Tracking</span>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              dy={10}
              interval={4}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px 16px'
              }}
              labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
              itemStyle={{ fontWeight: 700, color: '#10b981' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
