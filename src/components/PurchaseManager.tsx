import React from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Truck,
  Plus,
  Search,
  Package
} from 'lucide-react';
import { Product, Location, Purchase, Supplier, InventoryItem } from '../types';
import { recordPurchase, deletePurchase, updatePurchase } from '../lib/db';
import { safeToMillis } from '../lib/utils';

interface PurchaseProps {
  products: Product[];
  locations: Location[];
  purchases: Purchase[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onAddProduct: (product: Partial<Product>) => Promise<any>;
}

export default function PurchaseManager({ products, locations, purchases, suppliers, inventory, onAddProduct }: PurchaseProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [editingPurchase, setEditingPurchase] = React.useState<Purchase | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState('');
  const [isCustomProduct, setIsCustomProduct] = React.useState(false);
  const [newProductName, setNewProductName] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState('');
  const [selectedSupplier, setSelectedSupplier] = React.useState('');
  const [isCustomSupplier, setIsCustomSupplier] = React.useState(false);
  const [quantity, setQuantity] = React.useState(1);
  const [costPrice, setCostPrice] = React.useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenRecord = () => {
    setError(null);
    setEditingPurchase(null);
    setSelectedProduct('');
    setIsCustomProduct(false);
    setNewProductName('');
    setSelectedLocation('');
    setSelectedSupplier('');
    setIsCustomSupplier(false);
    setQuantity(1);
    setCostPrice(0);
    setIsRecording(true);
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setError(null);
    setEditingPurchase(purchase);
    setSelectedProduct(purchase.productId);
    setIsCustomProduct(false);
    setNewProductName('');
    setSelectedLocation(purchase.locationId);
    setSelectedSupplier(purchase.supplierId);
    setIsCustomSupplier(false);
    setQuantity(purchase.quantity);
    setCostPrice(purchase.costPrice);
    setIsRecording(true);
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!selectedProduct && !isCustomProduct) || !selectedLocation || (!selectedSupplier && !isCustomSupplier)) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let productId = selectedProduct;
      let supplierId = selectedSupplier;

      // 1. Handle New Product Creation
      if (isCustomProduct && newProductName) {
        const prodRef = await onAddProduct({ 
          name: newProductName, 
          sku: `SKU-${Date.now().toString().slice(-4)}`,
          costPrice: costPrice,
          price: costPrice * 1.3, // Default 30% markup
          category: 'Uncategorized',
          unit: 'pcs'
        });
        productId = prodRef.id;
      }

      const totalCost = (costPrice || 0) * (quantity || 0);
      const safeTotalCost = isNaN(totalCost) ? 0 : totalCost;

      const purchaseData = {
        productId: productId,
        locationId: selectedLocation,
        supplierId: supplierId,
        quantity,
        costPrice,
        totalCost: safeTotalCost,
      };

      if (editingPurchase) {
        await updatePurchase(editingPurchase, purchaseData);
      } else {
        await recordPurchase(purchaseData);
      }

      setIsRecording(false);
      setEditingPurchase(null);
      setSelectedProduct('');
      setIsCustomProduct(false);
      setNewProductName('');
      setSelectedLocation('');
      setSelectedSupplier('');
      setIsCustomSupplier(false);
      setQuantity(1);
      setCostPrice(0);
    } catch (err: any) {
      setError(err.message || 'Wuu fashilmay kaydinta iibsashada (Failed to record purchase)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="text-slate-500">Maaree alaabta cusub ee aad shirkadaha ka soo iibsatid</p>
        </div>
        <button 
          onClick={handleOpenRecord}
          className="flex items-center space-x-2 px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus size={20} />
          <span>New Purchase</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Product (Alaabta)</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Supplier (Shirkadda)</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Location (Bakhaarka)</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Qty</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cost</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchases.length > 0 ? (
                purchases.sort((a, b) => safeToMillis(b.timestamp) - safeToMillis(a.timestamp)).map((purchase) => {
                  const product = products.find(p => p.id === purchase.productId);
                  const location = locations.find(l => l.id === purchase.locationId);
                  const supplier = suppliers.find(s => s.id === purchase.supplierId) || (purchase.supplierId ? { name: purchase.supplierId } : null);
                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6 text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
                        {purchase.id.slice(0, 8)}
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900">{product?.name || 'Unknown'}</p>
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-600 font-medium">
                        {supplier?.name || 'Unknown'}
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-600">
                        {location?.name || 'Unknown'}
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-900">
                        {purchase.quantity}
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-lg font-black text-indigo-600">${purchase.totalCost.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end space-x-4">
                          <button 
                            onClick={() => handleEditPurchase(purchase)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                          >
                            Edit
                          </button>
                          {confirmDeleteId === purchase.id ? (
                            <div className="flex items-center space-x-2 bg-rose-50 px-2 py-1 rounded-lg">
                              <button 
                                onClick={() => {
                                  deletePurchase(purchase);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors uppercase"
                              >
                                OK
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setConfirmDeleteId(purchase.id)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors uppercase tracking-wider"
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
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <p className="text-slate-400 font-bold">Ma jirto wax iibsasho ah oo diiwaangashan (No records)</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsRecording(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Truck size={28} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                {editingPurchase ? 'Edit Purchase (Wax ka beddel Iibsiga)' : 'New Purchase (Iibsasho Cusub)'}
              </h3>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100">
                {error === 'Please fill in all required fields' ? 'Fadlan buuxi meelaha bannaan oo dhan' : error}
              </div>
            )}

            <form onSubmit={handleRecordPurchase} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">Select Supplier (Shirkadda)</label>
                  <button 
                    type="button"
                    onClick={() => setIsCustomSupplier(!isCustomSupplier)}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg"
                  >
                    {isCustomSupplier ? 'Choose from list' : '+ Add New'}
                  </button>
                </div>
                {isCustomSupplier ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter new supplier name..."
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                  />
                ) : (
                  <select
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                  >
                    <option value="">Choose a supplier...</option>
                    {/* Default requested suppliers fallback */}
                    {!suppliers.some(s => s.name === 'Towfiiq Company') && <option value="Towfiiq Company">Towfiiq Company</option>}
                    {!suppliers.some(s => s.name === 'Baba-Mama Company') && <option value="Baba-Mama Company">Baba-Mama Company</option>}
                    {!suppliers.some(s => s.name === 'Golis Telecom') && <option value="Golis Telecom">Golis Telecom</option>}
                    {!suppliers.some(s => s.name === 'Daauus Company') && <option value="Daauus Company">Daauus Company</option>}
                    {!suppliers.some(s => s.name === 'Caalami Group') && <option value="Caalami Group">Caalami Group</option>}
                    {!suppliers.some(s => s.name === 'Danwadaag') && <option value="Danwadaag">Danwadaag</option>}
                    
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
                {suppliers.length === 0 && !isCustomSupplier && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase italic">Note: No suppliers found. Use "+ Add New" or add in Suppliers tab.</p>
                )}
              </div>

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
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg"
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
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2 italic">
                      Note: You can update category/SKU in Products tab later
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                      value={selectedProduct}
                      onChange={(e) => {
                        setSelectedProduct(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p?.costPrice) setCostPrice(p.costPrice);
                      }}
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Location (Bakhaarka Alaabtu Geleyso)</label>
                <select
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="">Select storage location...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quantity (Tirada)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cost Price (Qiimaha Iibsiga)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Wadarta (Total)</span>
                <span className="text-2xl font-black text-indigo-700">${(costPrice * quantity).toLocaleString()}</span>
              </div>

              <div className="flex space-x-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsRecording(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      {editingPurchase ? null : <Plus size={20} />}
                      <span>{editingPurchase ? 'Update Purchase' : 'Save Purchase'}</span>
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
