import React from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Tag,
  CreditCard,
  Plus,
  Search
} from 'lucide-react';
import { Product, Location, Sale, InventoryItem } from '../types';
import { recordSale, updateSale, deleteSale, addLocation } from '../lib/db';

interface SalesProps {
  products: Product[];
  locations: Location[];
  sales: Sale[];
  inventory: InventoryItem[];
  onAddProduct: (product: Partial<Product>) => Promise<any>;
}

import { safeToMillis } from '../lib/utils';

export default function SalesManager({ products, locations, sales, inventory, onAddProduct }: SalesProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [editingSale, setEditingSale] = React.useState<Sale | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState('');
  const [isCustomProduct, setIsCustomProduct] = React.useState(false);
  const [newProductName, setNewProductName] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState('');
  const [newLocationName, setNewLocationName] = React.useState('');
  const [isAddingNewLocation, setIsAddingNewLocation] = React.useState(false);
  const [quantity, setQuantity] = React.useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [lastSale, setLastSale] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenRecord = (sale?: Sale) => {
    setError(null);
    if (sale) {
      setEditingSale(sale);
      setSelectedProduct(sale.productId);
      setSelectedLocation(sale.locationId);
      setNewLocationName('');
      setIsAddingNewLocation(false);
      setQuantity(sale.quantity);
    } else {
      setEditingSale(null);
      setSelectedProduct('');
      setSelectedLocation('');
      setNewLocationName('');
      setIsAddingNewLocation(false);
      setQuantity(1);
    }
    setIsRecording(true);
  };

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let productId = selectedProduct;
      let locationId = selectedLocation;

      // 1. Handle New Product Creation
      if (isCustomProduct && newProductName) {
        const prodRef = await onAddProduct({ 
          name: newProductName, 
          sku: `SKU-${Date.now().toString().slice(-4)}`,
          price: 0,
          costPrice: 0,
          category: 'Uncategorized',
          unit: 'pcs'
        });
        productId = prodRef.id;
      }

      const product = products.find(p => p.id === productId) || (isCustomProduct ? { id: productId, price: 0 } : null);
      if (!product) throw new Error('Product not found');

      // 2. Handle New Location Creation
      if (isAddingNewLocation && newLocationName) {
        const locRef = await addLocation({ name: newLocationName, address: 'Added during sale' });
        locationId = locRef.id;
      }

      if (!productId) throw new Error('Product is required');
      if (!locationId) throw new Error('Location is required');

      const stock = getProductStockAtLocation(productId, locationId);
      if (quantity > stock && !isCustomProduct) { // Only check stock for existing products
        throw new Error(`Insufficient stock. Only ${stock} units available at this location.`);
      }

      const totalPrice = (product as any).price * quantity;

      if (editingSale) {
        await updateSale(editingSale, {
          productId: productId,
          locationId: locationId,
          quantity,
          totalPrice,
        });
      } else {
        const saleData = {
          productId: productId,
          locationId: locationId,
          quantity,
          totalPrice,
        };
        const saleRef = await recordSale(saleData);
        setLastSale({ ...saleData, id: saleRef.id, timestamp: new Date() });
        setShowReceipt(true);
      }

      setIsRecording(false);
      setEditingSale(null);
      setSelectedProduct('');
      setIsCustomProduct(false);
      setNewProductName('');
      setSelectedLocation('');
      setNewLocationName('');
      setIsAddingNewLocation(false);
      setQuantity(1);
    } catch (err: any) {
      setError(err.message || 'Wuu fashilmay kaydinka iibka (Failed to record sale)');
    } finally {
      setIsLoading(false);
    }
  };

  const getProductStockAtLocation = (productId: string, locationId: string) => {
    return inventory.find(i => i.productId === productId && i.locationId === locationId)?.quantity || 0;
  };

  return (
    <div className="space-y-8">
      {/* Header Action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales & Orders</h2>
          <p className="text-slate-500">Diiwaangeli iibka maalinlaha ah ee supermarket-ka</p>
        </div>
        <button 
          onClick={() => handleOpenRecord()}
          className="flex items-center space-x-2 px-6 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Plus size={20} />
          <span>New Sale (Iib Cusub)</span>
        </button>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction ID</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Product (Alaabta)</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Location (Bakhaarka)</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Quantity</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Total Price</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right sticky right-0 bg-slate-50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sales.length > 0 ? (
                sales.sort((a, b) => safeToMillis(b.timestamp) - safeToMillis(a.timestamp)).map((sale) => {
                  const product = products.find(p => p.id === sale.productId);
                  const location = locations.find(l => l.id === sale.locationId);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <ShoppingCart size={18} />
                          </div>
                          <span className="font-mono text-sm font-bold text-slate-400">{sale.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900">{product?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{product?.sku}</p>
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-600 font-medium">
                        {location?.name || 'Unknown'}
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-900">
                        {sale.quantity}
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-lg font-black text-emerald-600">${sale.totalPrice.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-6 text-right sticky right-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-end space-x-4">
                          <button 
                            onClick={() => handleOpenRecord(sale)}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-wider"
                          >
                            Edit
                          </button>
                          {confirmDeleteId === sale.id ? (
                            <div className="flex items-center space-x-2 bg-emerald-50 px-2 py-1 rounded-lg">
                              <button 
                                onClick={() => {
                                  deleteSale(sale);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-wider"
                              >
                                OK
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setConfirmDeleteId(sale.id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-wider"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold">Ma jirto wax iib ah oo diiwaangashan (No records)</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            onClick={() => setShowReceipt(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Sale Complete!</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction Receipt</p>
            </div>

            <div className="border-t-2 border-dashed border-slate-100 py-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-400">Transaction ID</span>
                <span className="font-mono font-bold text-slate-900 uppercase">#{lastSale.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-400">Date</span>
                <span className="font-bold text-slate-900">{new Date(lastSale.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-400">Location</span>
                <span className="font-bold text-slate-900">
                  {locations.find(l => l.id === lastSale.locationId)?.name}
                </span>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-900">
                    {products.find(p => p.id === lastSale.productId)?.name}
                  </span>
                  <span className="text-sm font-black text-slate-900">${lastSale.totalPrice.toLocaleString()}</span>
                </div>
                <p className="text-xs font-bold text-slate-400">
                  {lastSale.quantity} x ${products.find(p => p.id === lastSale.productId)?.price}
                </p>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-slate-100 pt-6 mt-2">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount Paid</p>
                  <p className="text-3xl font-black text-emerald-600">${lastSale.totalPrice.toLocaleString()}</p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  Paid
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowReceipt(false)}
              className="w-full mt-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              Close & Continue
            </button>
            <button 
              onClick={() => window.print()}
              className="w-full mt-2 py-3 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors"
            >
              Print Receipt
            </button>
          </motion.div>
        </div>
      )}

      {/* Record Sale Modal */}
      {isRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => { setIsRecording(false); setEditingSale(null); }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <ShoppingCart size={28} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{editingSale ? 'Edit Sale' : 'Record Sale'}</h3>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100 flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
                  <span>{error.includes('Insufficient stock') ? 'Bakhaarka maba yaallo haraa kugu filan (Insufficient stock)' : error}</span>
                </div>
                {error.includes('stock') && (
                  <div className="mt-2 p-3 bg-white/50 rounded-xl">
                    <p className="text-[11px] text-rose-700 uppercase tracking-tight">Sida loo xaliyo (How to fix):</p>
                    <p className="text-xs text-slate-600 mt-1">1. Tag qaybta <span className="font-black text-rose-600">"Purchases"</span></p>
                    <p className="text-xs text-slate-600">2. Diiwaangeli iibsi cusub si stock-gu u kordho</p>
                    <p className="text-xs text-slate-600">3. Ka dib ku soo laabo halkan si aad u iibiso</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleRecordSale} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">Select Product (Alaabta)</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCustomProduct(!isCustomProduct);
                      setSelectedProduct('');
                      setNewProductName('');
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
                  >
                    {isCustomProduct ? 'Choose from list' : '+ Add New Product'}
                  </button>
                </div>
                {isCustomProduct ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Enter new product name..."
                      className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none font-medium placeholder:text-emerald-300"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-2 italic">
                      Note: You can update price/category in Products tab later
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium"
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(e.target.value)}
                    >
                      <option value="">Choose a product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    {products.length === 0 && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase italic">Note: No products found. Use "+ Add New Product" button.</p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Location (Meesha laga iibinayo)</label>
                <div className="space-y-3">
                  <select
                    required={!isAddingNewLocation}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium"
                    value={isAddingNewLocation ? 'new' : selectedLocation}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setIsAddingNewLocation(true);
                        setSelectedLocation('');
                      } else {
                        setIsAddingNewLocation(false);
                        setSelectedLocation(e.target.value);
                      }
                    }}
                  >
                    <option value="">Select dispatch location...</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                    <option value="new" className="text-emerald-600 font-bold">+ Add New Location</option>
                  </select>
                  {locations.length === 0 && !isAddingNewLocation && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase italic">Note: No locations found. Create one first.</p>
                  )}

                  {isAddingNewLocation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Enter new location name..."
                        className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none font-medium placeholder:text-emerald-300"
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                      />
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-2">
                        New location will be saved to system
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quantity (Tirada)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                  />
                  {selectedProduct && selectedLocation && (
                    <div className={`mt-2 p-3 rounded-xl border-2 flex items-center justify-between ${getProductStockAtLocation(selectedProduct, selectedLocation) < quantity ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest">Haraaga Bakhaarka:</span>
                      <span className="text-sm font-black">{getProductStockAtLocation(selectedProduct, selectedLocation)} {products.find(p => p.id === selectedProduct)?.unit || 'units'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Total Value (Wadarta)</label>
                  <div className="w-full bg-emerald-50 text-emerald-700 rounded-2xl px-4 py-4 font-black text-xl flex items-center justify-center">
                    ${((products.find(p => p.id === selectedProduct)?.price || 0) * quantity).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button 
                  type="button"
                  onClick={() => { setIsRecording(false); setEditingSale(null); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isLoading || quantity <= 0}
                  className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>Save Sale</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
