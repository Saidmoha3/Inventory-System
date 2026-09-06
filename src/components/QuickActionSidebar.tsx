import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { Product, Location, InventoryItem, StockMovement } from '../types';

interface QuickActionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  locations: Location[];
  inventory: InventoryItem[];
  onRecordSale: (sale: any) => Promise<any>;
  onUpdateStock: (productId: string, locationId: string, quantity: number, type: StockMovement['type'], reason?: string) => Promise<void>;
}

export default function QuickActionSidebar({
  isOpen,
  onClose,
  products,
  locations,
  inventory,
  onRecordSale,
  onUpdateStock
}: QuickActionSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<'sale' | 'stock'>('sale');
  const [formData, setFormData] = React.useState({
    productId: '',
    locationId: '',
    quantity: 1,
    reason: 'Quick Adjustment'
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedProduct = products.find(p => p.id === formData.productId);
  const currentStock = inventory.find(
    item => item.productId === formData.productId && item.locationId === formData.locationId
  )?.quantity || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.locationId) {
      setError('Please select a product and location');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'sale') {
        if (!selectedProduct) throw new Error('Product not found');
        await onRecordSale({
          productId: formData.productId,
          locationId: formData.locationId,
          quantity: formData.quantity,
          totalPrice: selectedProduct.price * formData.quantity
        });
      } else {
        await onUpdateStock(
          formData.productId,
          formData.locationId,
          formData.quantity,
          'incoming',
          formData.reason
        );
      }
      onClose();
      setFormData({ productId: '', locationId: '', quantity: 1, reason: 'Quick Adjustment' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Quick Actions</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
                <button
                  onClick={() => setActiveTab('sale')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'sale' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ShoppingCart size={16} />
                  <span>Record Sale</span>
                </button>
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'stock' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Plus size={16} />
                  <span>Add Stock</span>
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600">
                  <AlertCircle size={20} />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Product</label>
                  <select
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  >
                    <option value="">Choose a product...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Location / Store</label>
                  <select
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  >
                    <option value="">Choose a location...</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  {formData.productId && formData.locationId && (
                    <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Current Stock: <span className="text-slate-900">{currentStock} units</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quantity</label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                      className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      <Minus size={20} />
                    </button>
                    <input
                      type="number"
                      required
                      min="1"
                      className="flex-1 text-center bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-black text-xl"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                      className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {activeTab === 'stock' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Update</label>
                    <input
                      type="text"
                      placeholder="e.g. Manual restock, correction"
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    />
                  </div>
                )}

                {activeTab === 'sale' && selectedProduct && (
                  <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-indigo-600">Total Price</span>
                      <span className="text-2xl font-black text-indigo-700">
                        ${(selectedProduct.price * formData.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all ${
                    activeTab === 'sale' 
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Processing...' : activeTab === 'sale' ? 'Complete Sale' : 'Add to Stock'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
