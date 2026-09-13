import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  AlertCircle,
  Warehouse,
  History,
  Tag,
  Edit2,
  Trash2,
  Download,
  Camera
} from 'lucide-react';
import { Product, Location, InventoryItem, StockMovement, Sale, Category, Supplier } from '../types';
import { addProduct, updateProduct, deleteProduct, getStockMovements, transferStock } from '../lib/db';
import QRScanner from './QRScanner';
import { safeDate } from '../lib/utils';

interface InventoryProps {
  products: Product[];
  locations: Location[];
  categories: Category[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  sales: Sale[];
  userRole?: string;
  onAddProduct: (product: any) => Promise<any>;
  onUpdateProduct: (id: string, product: any) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
}

export default function InventoryList({ 
  products, 
  locations, 
  categories,
  suppliers,
  inventory, 
  sales,
  userRole,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}: InventoryProps) {
  const [showLowStockOnly, setShowLowStockOnly] = React.useState(false);
  const [filterCategory, setFilterCategory] = React.useState('');
  const [filterLocation, setFilterLocation] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [formData, setFormData] = React.useState({ name: '', sku: '', category: '', supplier: '', price: 0, costPrice: 0, minStockLevel: 5, unit: 'pcs', imageUrl: '' });

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [historyProduct, setHistoryProduct] = React.useState<Product | null>(null);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  // Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [transferProduct, setTransferProduct] = React.useState<Product | null>(null);
  const [transferData, setTransferData] = React.useState({ fromLocationId: '', toLocationId: '', quantity: 0 });

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const getStockForProduct = (productId: string, locationId?: string) => {
    return inventory
      .filter(i => i.productId === productId && (!locationId || i.locationId === locationId))
      .reduce((acc, curr) => acc + curr.quantity, 0);
  };

  const handleOpenHistory = async (product: Product) => {
    setHistoryProduct(product);
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const data = await getStockMovements(product.id);
      setMovements(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenTransfer = (product: Product) => {
    setTransferProduct(product);
    const initialLoc = inventory.find(i => i.productId === product.id && i.quantity > 0);
    setTransferData({ 
      fromLocationId: initialLoc?.locationId || '', 
      toLocationId: '', 
      quantity: 0 
    });
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct) return;
    
    const fromLoc = locations.find(l => l.id === transferData.fromLocationId);
    const toLoc = locations.find(l => l.id === transferData.toLocationId);
    
    if (fromLoc && toLoc) {
      await transferStock(
        transferProduct.id,
        fromLoc.id,
        toLoc.id,
        transferData.quantity,
        fromLoc.name,
        toLoc.name
      );
      setIsTransferModalOpen(false);
    }
  };

  const handleScan = (sku: string) => {
    const product = products.find(p => p.sku === sku);
    if (product) {
      handleOpenHistory(product);
      setIsScannerOpen(false);
    } else {
      alert(`Product with SKU "${sku}" not found.`);
    }
  };

  const lowStockCount = products.filter(p => {
    const stock = getStockForProduct(p.id, filterLocation);
    return p.minStockLevel > 0 && stock <= p.minStockLevel;
  }).length;

  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isCustomSupplier, setIsCustomSupplier] = React.useState(false);
  const [isCustomCategory, setIsCustomCategory] = React.useState(false);

  const filteredProducts = products.filter(p => {
    const stock = getStockForProduct(p.id, filterLocation);
    const isLowStock = p.minStockLevel > 0 && stock <= p.minStockLevel;
    const matchesCategory = !filterCategory || p.category === filterCategory;
    const matchesLocation = !filterLocation || inventory.some(i => i.productId === p.id && i.locationId === filterLocation);
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showLowStockOnly && !isLowStock) return false;
    if (!matchesCategory || !matchesLocation || !matchesSearch) return false;
    
    return true;
  });

  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).sort();

  const handleOpenModal = (product?: Product) => {
    setError(null);
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        name: product.name, 
        sku: product.sku, 
        category: product.category, 
        supplier: product.supplier || '',
        price: product.price, 
        costPrice: product.costPrice || 0,
        minStockLevel: product.minStockLevel, 
        unit: product.unit,
        imageUrl: product.imageUrl || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', category: '', supplier: '', price: 0, costPrice: 0, minStockLevel: 5, unit: 'pcs', imageUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, formData);
      } else {
        await onAddProduct(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onDeleteProduct(id);
    setConfirmDeleteId(null);
  };

  const handleExportCSV = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Price ($)', 'Unit', 'Min Stock', 'Current Stock', 'Stock Value ($)', 'Status'];
    const rows = filteredProducts.map(p => {
      const stock = getStockForProduct(p.id);
      const stockValue = (stock * p.price).toFixed(2);
      const status = stock <= p.minStockLevel ? 'LOW STOCK' : 'OK';
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku.replace(/"/g, '""')}"`,
        `"${p.category.replace(/"/g, '""')}"`,
        p.price.toFixed(2),
        `"${p.unit.replace(/"/g, '""')}"`,
        p.minStockLevel,
        stock,
        stockValue,
        status
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Search Bar matching screenshot */}
          <div className="relative flex-1 sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products by name..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full xl:w-auto">
          {(userRole === 'Admin' || userRole === 'Manager') && (
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 shadow-md transition-all"
            >
              <Plus size={20} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Layout matching screenshot */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-bold text-slate-700 min-w-[250px]">Alaabta (Product)</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700">Cost ($)</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700">Price ($)</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 text-center">Stock</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 text-center">Iibiyey</th>
                {(userRole === 'Admin' || userRole === 'Manager') && (
                  <th className="px-6 py-4 text-sm font-bold text-slate-700 text-right sticky right-0 bg-slate-50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const stock = inventory
                  .filter(i => i.productId === product.id && (!filterLocation || i.locationId === filterLocation))
                  .reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                
                const totalSold = (sales || [])
                  .filter(s => s.productId === product.id)
                  .reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                
                const isLowStock = product.minStockLevel > 0 && stock <= product.minStockLevel;
                const isOutOfStock = stock === 0;

                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Tag size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 whitespace-nowrap">{product.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">${(product.costPrice || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-bold">${product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-black ${
                        isOutOfStock ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                        isLowStock ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                        'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-black bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {totalSold}
                      </span>
                    </td>
                    {(userRole === 'Admin' || userRole === 'Manager') && (
                      <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] min-w-[280px]">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleOpenHistory(product)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Stock History"
                            >
                              <History size={16} />
                            </button>
                            <button 
                              onClick={() => handleOpenTransfer(product)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Transfer Stock"
                            >
                              <Warehouse size={16} />
                            </button>
                            <div className="w-px h-4 bg-slate-100 mx-1" />
                            <button 
                              onClick={() => handleOpenModal(product)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              Edit
                            </button>
                            {confirmDeleteId === product.id ? (
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => { handleDelete(product.id); setConfirmDeleteId(null); }}
                                  className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded hover:bg-rose-700"
                                >
                                  OK
                                </button>
                                <button 
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded hover:bg-slate-500"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setConfirmDeleteId(product.id)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-[32px] p-20 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
          <p className="text-slate-500 max-w-sm">
            We couldn't find any products matching your current filters or search query. Try clearing your filters or using a different search term.
          </p>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsTransferModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Stock Transfer</h3>
            <p className="text-sm font-bold text-slate-500 mb-6">Moving: {transferProduct?.name}</p>
            
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">From Location (Source)</label>
                <select 
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  value={transferData.fromLocationId}
                  onChange={(e) => setTransferData({...transferData, fromLocationId: e.target.value})}
                >
                  <option value="">Select source...</option>
                  {locations.map(loc => {
                    const locStock = inventory.find(i => i.productId === transferProduct?.id && i.locationId === loc.id)?.quantity || 0;
                    return (
                      <option key={loc.id} value={loc.id} disabled={locStock <= 0}>
                        {loc.name} ({locStock} {transferProduct?.unit} available)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">To Location (Destination)</label>
                <select 
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  value={transferData.toLocationId}
                  onChange={(e) => setTransferData({...transferData, toLocationId: e.target.value})}
                >
                  <option value="">Select destination...</option>
                  {locations
                    .filter(loc => loc.id !== transferData.fromLocationId)
                    .map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Transfer Quantity</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    required
                    min="1"
                    max={inventory.find(i => i.productId === transferProduct?.id && i.locationId === transferData.fromLocationId)?.quantity || 0}
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={transferData.quantity || ''}
                    onChange={(e) => setTransferData({...transferData, quantity: parseInt(e.target.value)})}
                  />
                  <span className="text-sm font-bold text-slate-400">{transferProduct?.unit}</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!transferData.fromLocationId || !transferData.toLocationId || !transferData.quantity}
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                {editingProduct ? 'Update Product' : 'New Product'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <Plus size={24} className="rotate-45 text-slate-400" />
              </button>
            </div>
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600">
                <AlertCircle size={20} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Supplier (Shirkadda)</label>
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
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    />
                  ) : (
                    <select
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    >
                      <option value="">Choose Supplier...</option>
                      {/* Default requested suppliers */}
                      {!suppliers.some(s => s.name === 'Towfiiq Company') && <option value="Towfiiq Company">Towfiiq Company</option>}
                      {!suppliers.some(s => s.name === 'Baba-Mama Company') && <option value="Baba-Mama Company">Baba-Mama Company</option>}
                      {!suppliers.some(s => s.name === 'Golis Telecom') && <option value="Golis Telecom">Golis Telecom</option>}
                      {!suppliers.some(s => s.name === 'Daauus Company') && <option value="Daauus Company">Daauus Company</option>}
                      {!suppliers.some(s => s.name === 'Caalami Group') && <option value="Caalami Group">Caalami Group</option>}
                      {!suppliers.some(s => s.name === 'Danwadaag') && <option value="Danwadaag">Danwadaag</option>}
                      
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.name}>{sup.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">SKU</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Category (Qaybta)</label>
                    <button 
                      type="button"
                      onClick={() => setIsCustomCategory(!isCustomCategory)}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg"
                    >
                      {isCustomCategory ? 'Choose list' : '+ Add New'}
                    </button>
                  </div>
                  {isCustomCategory ? (
                    <input
                      type="text"
                      required
                      placeholder="New category..."
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                  ) : (
                    <select
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Choose Category...</option>
                      {/* Default requested categories */}
                      <option value="Food">Food</option>
                      <option value="Condiments">Condiments</option>
                      <option value="Sweets">Sweets</option>
                      <option value="Perfumes">Perfumes</option>
                      <option value="Shampoo">Shampoo</option>
                      <option value="Detergent">Detergent</option>
                      <option value="Electronics">Electronics</option>

                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Min Stock Level</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({...formData, minStockLevel: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Unit (Choose cabirka)</label>
                  <select
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    <option value="">Choose Unit...</option>
                    <option value="kg">KG (Kiilo)</option>
                    <option value="pcs">PCS (Xabo)</option>
                    <option value="box">BOX (Kartoon)</option>
                    <option value="bag">BAG (Kiish/Bac)</option>
                    <option value="ltr">LTR (Litar)</option>
                    <option value="mtr">MTR (Mitir)</option>
                    <option value="pkt">PKT (Packet)</option>
                    <option value="dz">DZ (Darsin)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Product Image URL</label>
                  <div className="relative">
                    <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : editingProduct ? 'Update Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            onClick={() => setIsHistoryOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none mb-2">Stock History</h3>
                <p className="text-sm font-bold text-slate-500">{historyProduct?.name} • {historyProduct?.sku}</p>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-sm text-slate-400 hover:text-slate-900 transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Audit Trail...</p>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <History size={40} />
                  </div>
                  <p className="text-slate-500 font-bold italic">No stock movements recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {movements.map((m, i) => (
                    <div key={m.id} className="relative flex space-x-6 group">
                      {i !== movements.length - 1 && (
                        <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-slate-100 group-last:hidden" />
                      )}
                      <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-sm relative z-10 ${
                        m.type === 'incoming' ? 'bg-emerald-50 text-emerald-600' : 
                        m.type === 'outgoing' ? 'bg-rose-50 text-rose-600' : 
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {m.type === 'incoming' ? <Plus size={20} /> : 
                         m.type === 'outgoing' ? <Trash2 size={20} /> : 
                         <Edit2 size={20} />}
                      </div>
                      <div className="flex-1 pb-6 border-b border-slate-50 last:border-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                            {m.type === 'incoming' ? 'Restock / Incoming' : 
                             m.type === 'outgoing' ? 'Sale / Outgoing' : 
                             'Manual Adjustment'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {safeDate(m.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`text-xl font-black ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {m.quantity > 0 ? '+' : ''}{m.quantity} {historyProduct?.unit}
                          </span>
                          <span className="text-xs font-bold text-slate-300">•</span>
                          <span className="text-xs font-bold text-slate-600">Location: {locations.find(l => l.id === m.locationId)?.name || 'Unknown'}</span>
                        </div>
                        {m.note && (
                          <p className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 inline-block">
                            {m.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
              >
                Close Audit Trail
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* QR Scanner */}
      {isScannerOpen && (
        <QRScanner 
          onScan={handleScan} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
    </div>
  );
}
