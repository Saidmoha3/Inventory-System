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
import { Brain, Sparkles, Loader2, Activity } from 'lucide-react';
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
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true);
        const response = await fetch('/api/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sales, products })
        });
        
        const data = await response.json();

        if (!response.ok) {
          const errMsg = data.error || '';
          if (errMsg.includes('API Key')) {
            throw new Error('Fadlan geli GEMINI_API_KEY qaybta Settings > Secrets si aad u bilowdo saadaasha AI.');
          }
          throw new Error(errMsg || 'Nidaamka saadaasha AI hadda lama heli karo.');
        }
        
        if (data.message) {
          setNotice(data.message);
        } else {
          setNotice(null);
        }
        
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
        setError(null);
      } catch (err: any) {
        // Only log to console if it's not the missing API key message
        const isFetchError = err.message?.includes('Failed to fetch');
        if (!err.message?.includes('GEMINI_API_KEY') && !isFetchError) {
          console.error(err);
        }
        setError(isFetchError ? 'Nidaamka saadaasha AI hadda lama heli karo (Server unreachable).' : err.message || 'AI could not generate forecast at this time.');
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
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 h-[450px] flex flex-col items-center justify-center space-y-4">
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
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-10">
        <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest shadow-sm border border-indigo-100">
          <Sparkles size={14} className="fill-current" />
          <span>AI Intelligence</span>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <Activity size={20} />
          </div>
          <span>Demand Forecast</span>
        </h3>
        <p className="text-sm font-bold text-slate-500 mt-2 italic opacity-80">30-Day Predictive Analysis based on Sales History</p>
      </div>

      {error && (
        <div className="mb-8 p-5 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center space-x-4 text-amber-700 shadow-inner">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Activity size={20} className="shrink-0" />
          </div>
          <div className="text-xs font-black uppercase tracking-tight leading-relaxed">
            {error}
          </div>
        </div>
      )}

      {notice && !error && (
        <div className="mb-8 p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex items-center space-x-3 text-indigo-700">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Activity size={14} className="shrink-0" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-tight">
            {notice}
          </div>
        </div>
      )}

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
              tickFormatter={(str) => {
                const date = new Date(str);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              minTickGap={40}
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '24px', 
                border: 'none', 
                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                padding: '20px'
              }}
              labelStyle={{ fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}
              labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em', paddingBottom: '30px' }} />
            <Area 
              type="monotone" 
              dataKey="sales" 
              name="Historical"
              stroke="#6366f1" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorHistorical)" 
              dot={{ r: 5, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 0 }}
              animationDuration={2500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Historical Data</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-violet-400 shadow-lg shadow-violet-200" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">AI Forecast</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 opacity-50">
          <Brain size={14} className="text-slate-400" />
          <p className="text-[11px] font-bold text-slate-400 italic">
            {notice ? 'Statistical Fallback' : 'Gemini 3.8 Flash'} • Updated Real-time
          </p>
        </div>
      </div>
    </div>
  );
}

