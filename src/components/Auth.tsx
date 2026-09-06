import React from 'react';
import { motion } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile, getProducts, addProduct, addLocation, updateStock, getUserProfile, addSupplier, addCategory } from '../lib/db';
import { Package, Mail, Lock, User, ArrowRight } from 'lucide-react';

const SEED_DATA = {
  locations: [
    { name: 'Main Warehouse', address: '123 Logistics Hub, Dubai, UAE' },
    { name: 'North Distro Center', address: '45 Supply Lane, Nairobi, Kenya' }
  ],
  products: [
    { name: 'Pro Laptop M3', sku: 'LPT-M3-001', category: 'Electronics', price: 1499, minStockLevel: 10, unit: 'units' },
    { name: 'Ultra Smartphone X', sku: 'PHN-UX-005', category: 'Electronics', price: 899, minStockLevel: 15, unit: 'units' },
    { name: 'Wireless Headset v2', sku: 'AUD-W2-09', category: 'Accessories', price: 199, minStockLevel: 20, unit: 'units' },
    { name: 'Office Monitor 27"', sku: 'DSP-27-MN', category: 'Office', price: 299, minStockLevel: 5, unit: 'units' }
  ],
  suppliers: [
    { name: 'Towfiiq Company', email: 'sales@towfiiq.com', phone: '+252 61XXXXX', address: 'Mogadishu, Somalia' },
    { name: 'Baba-Mama Company', email: 'orders@babamama.com', phone: '+252 61XXXXX', address: 'Mogadishu, Somalia' },
    { name: 'Golis Telecom', email: 'biz@golis.so', phone: '+252 90XXXXX', address: 'Garowe, Somalia' },
    { name: 'Daauus Company', email: 'info@daauus.com', phone: '+252 61XXXXX', address: 'Mogadishu, Somalia' },
    { name: 'Caalami Group', email: 'contact@caalami.so', phone: '+252 61XXXXX', address: 'Mogadishu, Somalia' },
    { name: 'Danwadaag', email: 'danwadaag@example.com', phone: '+252 61XXXXX', address: 'Somalia' }
  ],
  categories: [
    { name: 'Food', description: 'Food items' },
    { name: 'Condiments', description: 'Condiments and spices' },
    { name: 'Sweets', description: 'Sweets and snacks' },
    { name: 'Perfumes', description: 'Fragrances and perfumes' },
    { name: 'Shampoo', description: 'Hair care products' },
    { name: 'Detergent', description: 'Cleaning supplies' },
    { name: 'Electronics', description: 'Electronic devices' }
  ]
};

export default function Auth() {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await createUserProfile(userCredential.user.uid, {
          email,
          name,
          role: email === 'saidmohamud45@gmail.com' ? 'admin' : 'staff',
          locationIds: [],
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Nidaamka login-ka email-ka wali lama fasaxin. Fadlan isticmaal "Quick Demo Access" si aad u gasho.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setLoading(true);
    setError('');
    try {
      let userCredential;
      try {
        // 1. Try to sign in first with demo email
        userCredential = await signInWithEmailAndPassword(auth, 'demo@inventorypro.com', 'demo123456');
      } catch (err: any) {
        // 2. If email auth is disabled or user not found, try Anonymous Auth as a strong fallback
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          console.log('Auth: Email auth failed/disabled, trying Anonymous Auth...');
          try {
            userCredential = await signInAnonymously(auth);
          } catch (anonErr: any) {
            throw new Error('Nidaamka login-ka waa xiran yahay. Fadlan hadhow isku day.');
          }
        } else {
          throw err;
        }
      }

      // 4. Force check/create profile for the signed-in user
      const uid = userCredential.user.uid;
      const profile = await getUserProfile(uid);
      if (!profile) {
        await createUserProfile(uid, {
          email: userCredential.user.email || 'guest@inventorypro.com',
          name: userCredential.user.displayName || 'Guest User',
          role: 'admin',
          locationIds: [],
        });
      }

      // 5. Seed initial data if empty
      const products = await getProducts();
      if (products.length === 0) {
        const loc1 = await addLocation(SEED_DATA.locations[0]);
        const loc2 = await addLocation(SEED_DATA.locations[1]);
        
        // Add Suppliers
        for (const s of SEED_DATA.suppliers) {
          await addSupplier(s);
        }

        // Add Categories
        for (const c of SEED_DATA.categories) {
          await addCategory(c);
        }

        for (const p of SEED_DATA.products) {
          const prodRef = await addProduct(p);
          // Add initial stock
          await updateStock(prodRef.id, loc1.id, Math.floor(Math.random() * 50) + 20);
          await updateStock(prodRef.id, loc2.id, Math.floor(Math.random() * 30) + 10);
        }
      }
    } catch (err: any) {
      console.error('Demo Login Error:', err);
      setError('Cilad ayaa dhacday: ' + (err.message || 'Fadlan isku day hadhow.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
            <Package className="text-white w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">InventoryPro</h2>
          <p className="text-slate-400 mt-2 text-center">
            {isLogin ? 'Manage your global inventory in one place' : 'Join the most advanced stock management platform'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Full Name"
                required
                className="w-full bg-slate-800/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full bg-slate-800/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full bg-slate-800/50 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-red-400 text-sm px-2 font-medium"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 group disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            <span>{loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
            {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold py-4 rounded-2xl border border-indigo-500/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Galaayaa...' : 'Quick Demo Access'}</span>
            </button>
          )}
        </form>

        <div className="mt-8 text-center space-y-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors block w-full"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
          
          <button
            onClick={() => auth.signOut().then(() => {
              localStorage.removeItem('inventory_pro_local_mode');
              window.location.reload();
            })}
            className="text-slate-500 hover:text-red-400 text-xs font-medium transition-colors"
          >
            Reset Session (Logout)
          </button>
          
          <button
            onClick={() => {
              localStorage.setItem('inventory_pro_local_mode', 'true');
              window.location.reload();
            }}
            className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold py-3 rounded-xl border border-red-500/20 transition-all"
          >
            Preview without Login (Local Mode)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
