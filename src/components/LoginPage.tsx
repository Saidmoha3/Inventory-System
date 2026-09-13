import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { LayoutGrid, LogIn, ShieldCheck, Users, Box } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-xl shadow-indigo-100">
            <LayoutGrid size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">InventoryPro</h1>
          <p className="text-slate-500 font-medium">Nidaamka Maamulka Bakhaarka & Iibka</p>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Ku soo dhawaaw</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Maamulka (Admin)</p>
                <p className="text-[10px] text-slate-500 font-medium">Access buuxa iyo maamulka userska</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Maareeyaha (Manager)</p>
                <p className="text-[10px] text-slate-500 font-medium">Maamulka alaabta iyo warbixinnada</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Box size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Shaqaalaha (Staff)</p>
                <p className="text-[10px] text-slate-500 font-medium">Diiwaangelinta iibka iyo eegista stock-ga</p>
              </div>
            </div>
          </div>

          <button
            onClick={login}
            className="w-full flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
          >
            <LogIn size={20} />
            <span>Ku gal Google Account</span>
          </button>

          <p className="mt-6 text-center text-xs text-slate-400 font-medium leading-relaxed">
            Markaad gasho, nidaamku wuxuu si toos ah kuu siinayaa doorkaaga (Role) iyadoo loo eegayo email-kaaga.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Inventory Management System v2.0</p>
        </div>
      </motion.div>
    </div>
  );
}
