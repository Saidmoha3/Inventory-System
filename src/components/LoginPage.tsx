import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { LayoutGrid, LogIn, ShieldCheck, Users, Box, ArrowRight, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

export default function LoginPage() {
  const { login, loginWithCredentials } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      loginWithCredentials(username, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-3 shadow-xl shadow-indigo-600/20">
            <LayoutGrid size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Inventory System</h1>
          <p className="text-slate-500 font-medium text-sm">Inventory & Sales Management System</p>
        </div>

        <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-slate-200/60 border border-slate-200/80">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Welcome to the System</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Please enter your credentials to login:
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl mb-4">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
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
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20 text-sm mt-2"
            >
              <span>Login</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or Google Account
            </span>
          </div>

          <button
            onClick={login}
            type="button"
            className="w-full flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 text-sm"
          >
            <LogIn size={18} />
            <span>Sign in with Google</span>
          </button>

          <p className="mt-5 text-center text-xs text-slate-400 font-medium leading-relaxed">
            <Sparkles size={12} className="inline text-amber-500 mr-1" />
            Login with the <span className="font-semibold text-slate-600">Admin</span> account to get full system capabilities.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Inventory Management System • Garowe
          </p>
        </div>
      </motion.div>
    </div>
  );
}
