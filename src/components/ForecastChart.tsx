import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { Product, Sale } from '../types';
import { safeDate } from '../lib/utils';

interface ForecastChartProps {
  products: Product[];
  sales: Sale[];
}

export default function ForecastChart({ products, sales }: ForecastChartProps) {
  const [forecastData, setForecastData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true);
        const response = await fetch('/api/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sales, products })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error || '';
          if (errMsg.includes('API Key')) {
            throw new Error('Fadlan geli GEMINI_API_KEY qaybta Settings > Secrets si aad u bilowdo saadaasha AI.');
          }
          throw new Error(errMsg || 'Ma suuragalin in la soo saaro saadaasha AI-da hadda.');
        }
        
        const data = await response.json();
        
        // Prepare historical data for the chart (last 14 days)
        const last14Days = Array.from({ length: 14 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (13 - i));
          return d.toISOString().split('T')[0];
        });

        const history = last14Days.map(date => {
          const count = sales.filter(s => {
            return safeDate(s.timestamp).toISOString().split('T')[0] === date;
          }).reduce((acc, curr) => acc + curr.quantity, 0);
          return { date, sales: count, type: 'Historical' };
        });

        // Merge with forecast
        const combined = [
          ...history,
          ...(data.forecast || []).map((f: any) => ({
            date: f.date,
            sales: f.predictedSales,
            type: 'Predicted'
          }))
        ];

        setForecastData(combined);
      } catch (err: any) {
        // Only log to console if it's not the missing API key message
        if (!err.message?.includes('GEMINI_API_KEY')) {
          console.error(err);
        }
        setError(err.message || 'AI could not generate forecast at this time.');
      } finally {
        setLoading(false);
      }
    }

    if (sales.length > 0) {
      fetchForecast();
    } else {
      setLoading(false);
    }
  }, [sales, products]);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Consulting Gemini AI</p>
          <p className="text-xs font-bold text-slate-400 mt-1">Analyzing sales patterns & predicting demand...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8">
        <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
          <Sparkles size={14} />
          <span>AI Powered Intelligence</span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
          <Activity className="text-indigo-600" />
          <span>Demand Forecast</span>
        </h3>
        <p className="text-sm font-bold text-slate-500 mt-1 italic">30-Day Predictive Analysis based on Sales History</p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(str) => {
                const date = new Date(str);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              minTickGap={30}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }} />
            <Area 
              type="monotone" 
              dataKey="sales" 
              name="Units Sold"
              stroke="#4F46E5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorHistorical)" 
              dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Data</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-violet-400 opacity-50" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Forecast</span>
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-300 italic">Data updated in real-time via Gemini 3.7 Flash</p>
      </div>
    </div>
  );
}

import { Activity } from 'lucide-react';
