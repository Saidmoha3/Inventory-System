import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { LayoutGrid, LogIn, ShieldCheck, Users, Box, ArrowRight, Sparkles, Database } from 'lucide-react';
import { UserRole } from '../types';

export default function LoginPage() {
  const { loginWithCredentials } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithCredentials(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url("/bg-login.jpg")' }}
    >
      <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-[2px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full relative z-10"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-3 shadow-2xl shadow-black/30 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-md ring-4 ring-white/50">
            <img src="/logo.jpg" alt="System Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1 drop-shadow-md">Inventory System</h1>
          <p className="text-indigo-100 font-medium text-sm drop-shadow">Inventory & Sales Management System</p>
        </div>

        <div className="bg-white/85 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-black/20 border border-white/60">
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Database size={13} className="text-emerald-600" />
              <span>Database: <b>Supabase (PostgreSQL Cloud)</b></span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Welcome to the System</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Please enter your credentials to login:
            </p>
            <div className="mt-3 text-xs bg-indigo-50/50 p-3 rounded-xl text-slate-600 text-left border border-indigo-100/50">
              <strong className="text-indigo-900">Default Accounts (first run):</strong>
              <ul className="mt-1 space-y-1">
                <li>• <b>admin</b> / admin123 (Admin)</li>
                <li>• <b>manager</b> / manager123 (Manager)</li>
                <li>• <b>staff</b> / staff123 (Staff)</li>
              </ul>
              <p className="mt-1 text-[11px] text-amber-700">Fadlan beddel password-yada kadib (Users → Edit).</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl mb-4">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Username / Email</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20 text-sm mt-2 disabled:opacity-60"
            >
              <span>{submitting ? 'Logging in...' : 'Login'}</span>
              <ArrowRight size={18} />
            </button>
          </form>



          <p className="mt-5 text-center text-xs text-slate-400 font-medium leading-relaxed">
            <Sparkles size={12} className="inline text-amber-500 mr-1" />
            Login with the <span className="font-semibold text-slate-600">Admin</span> account to get full system capabilities.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] drop-shadow-sm">
            Inventory Management System • Garowe
          </p>
        </div>
      </motion.div>
    </div>
  );
}
