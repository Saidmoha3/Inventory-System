import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  X,
  ChevronDown,
  PackagePlus,
  Calendar,
  User,
  Hash,
  ClipboardList,
} from 'lucide-react';
import { Product, Location, Purchase, Supplier, InventoryItem } from '../types';
import { recordPurchaseInvoice, deletePurchase, updatePurchase } from '../lib/db';
import { safeToMillis } from '../lib/utils';

interface PurchaseLineItem {
  id: string;
  productId: string;
  productName: string;
  isNewProduct: boolean;
  quantity: number;
  uom: string;
  unitPrice: number;
}

interface PurchaseProps {
  products: Product[];
  locations: Location[];
  purchases: Purchase[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onAddProduct: (product: Partial<Product>) => Promise<any>;
}

const generateLineId = () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const emptyLine = (): PurchaseLineItem => ({
  id: generateLineId(),
  productId: '',
  productName: '',
  isNewProduct: false,
  quantity: 1,
  uom: 'pcs',
  unitPrice: 0,
});

export default function PurchaseManager({
  products,
  locations,
  purchases,
  onAddProduct,
}: PurchaseProps) {
  // ── Modal state ──────────────────────────────────────────────
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  // ── Form state ───────────────────────────────────────────────
  const [editingPurchase, setEditingPurchase] = React.useState<Purchase | null>(null);
  const [vendor, setVendor] = React.useState('');
  const [vendorReference, setVendorReference] = React.useState('');
  const [orderDeadline, setOrderDeadline] = React.useState('');
  const [selectedLocation, setSelectedLocation] = React.useState('');
  const [lines, setLines] = React.useState<PurchaseLineItem[]>([emptyLine()]);

  // ── Derived ──────────────────────────────────────────────────
  const grandTotal = lines.reduce(
    (sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0),
    0
  );

  // ── Handlers ─────────────────────────────────────────────────
  const handleOpen = () => {
    setError(null);
    setEditingPurchase(null);
    setVendor('');
    setVendorReference('');
    setOrderDeadline('');
    setSelectedLocation(locations[0]?.id || '');
    setLines([emptyLine()]);
    setIsOpen(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setError(null);
    setEditingPurchase(purchase);
    setVendor(purchase.supplierId || purchase.supplierName || '');
    setVendorReference(purchase.invoiceNumber || '');
    setSelectedLocation(purchase.locationId);
    
    const product = products.find(p => p.id === purchase.productId);
    setLines([{
      id: generateLineId(),
      productId: purchase.productId,
      productName: product?.name || purchase.productName || '',
      isNewProduct: false,
      quantity: purchase.quantity,
      uom: product?.unit || 'pcs',
      unitPrice: purchase.costPrice,
    }]);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingPurchase(null);
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (id: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));

  const updateLine = (id: string, patch: Partial<PurchaseLineItem>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const handleProductSelect = (lineId: string, value: string) => {
    if (value === '__new__') {
      updateLine(lineId, {
        productId: '',
        productName: '',
        isNewProduct: true,
        uom: 'pcs',
        unitPrice: 0,
      });
    } else {
      const product = products.find((p) => p.id === value);
      updateLine(lineId, {
        productId: value,
        productName: product?.name || '',
        isNewProduct: false,
        uom: product?.unit || 'pcs',
        unitPrice: product?.costPrice || 0,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim()) {
      setError('Please enter vendor name');
      return;
    }
    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }
    const validLines = lines.filter(
      (l) => (l.productId || (l.isNewProduct && l.productName.trim())) && l.quantity > 0
    );
    if (validLines.length === 0) {
      setError('Add at least one product');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (editingPurchase) {
        const line = validLines[0];
        let pId = line.productId;
        if (line.isNewProduct) {
           throw new Error("Cannot create new products while editing. Please select an existing product.");
        }
        await updatePurchase(editingPurchase, {
          productId: pId,
          locationId: selectedLocation,
          supplierId: vendor.trim(),
          supplierName: vendor.trim(),
          quantity: line.quantity,
          costPrice: line.unitPrice,
          totalCost: line.quantity * line.unitPrice,
          invoiceNumber: vendorReference.trim() || editingPurchase.invoiceNumber || '',
          paymentStatus: editingPurchase.paymentStatus || 'Paid',
          notes: editingPurchase.notes || '',
        });
        setIsOpen(false);
        setEditingPurchase(null);
      } else {
        await recordPurchaseInvoice({
          invoiceNumber: vendorReference.trim() || `PO-${Date.now().toString().slice(-6)}`,
          supplierId: vendor.trim(),
          supplierName: vendor.trim(),
          locationId: selectedLocation,
          notes: orderDeadline ? `Order Deadline: ${orderDeadline}` : '',
          items: validLines.map((l) => ({
            productId: l.productId || undefined,
            productName: l.isNewProduct
              ? l.productName
              : products.find((p) => p.id === l.productId)?.name || l.productName,
            isNewProduct: l.isNewProduct,
            unit: l.uom,
            quantity: l.quantity,
            costPrice: l.unitPrice,
            sellingPrice: l.unitPrice * 1.3,
            totalCost: l.quantity * l.unitPrice,
          })),
        });
        setIsOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sorted list ───────────────────────────────────────────────
  const sortedPurchases = [...purchases].sort(
    (a, b) => safeToMillis(b.timestamp) - safeToMillis(a.timestamp)
  );

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="text-slate-500 mt-0.5">Manage incoming inventory purchases from vendors</p>
        </div>
        <button
          onClick={handleOpen}
          className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus size={20} />
          <span>New Purchase</span>
        </button>
      </div>

      {/* ── Purchases Table ── */}
      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Ref #</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Vendor</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Qty</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cost</th>
                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedPurchases.length > 0 ? (
                sortedPurchases.map((purchase) => {
                  const product = products.find((p) => p.id === purchase.productId);
                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
                        {purchase.invoiceNumber || purchase.id.slice(0, 8)}
                      </td>
                      <td className="px-8 py-6 font-semibold text-slate-700">
                        {purchase.supplierName || purchase.supplierId || '—'}
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900">{product?.name || purchase.productName || 'Unknown'}</p>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-slate-900">{purchase.quantity}</td>
                      <td className="px-8 py-6">
                        <span className="text-lg font-black text-indigo-600">
                          ${purchase.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {confirmDeleteId === purchase.id ? (
                          <div className="inline-flex items-center space-x-2 bg-rose-50 px-3 py-1.5 rounded-xl">
                            <button
                              onClick={() => { deletePurchase(purchase); setConfirmDeleteId(null); }}
                              className="text-xs font-bold text-rose-600 hover:text-rose-800 uppercase tracking-wider"
                            >Confirm</button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                            >Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-4">
                            <button
                              onClick={() => handleEdit(purchase)}
                              className="text-xs font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
                            >Edit</button>
                            <button
                              onClick={() => setConfirmDeleteId(purchase.id)}
                              className="text-xs font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider"
                            >Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <ShoppingBag size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 font-bold">No purchase records registered</p>
                    <p className="text-slate-300 text-sm mt-1">No purchase records yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════
          NEW PURCHASE MODAL
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              {/* Modal Header */}
              <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <PackagePlus size={26} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{editingPurchase ? 'Edit Purchase' : 'New Purchase'}</h3>
                    <p className="text-sm text-slate-400">{editingPurchase ? 'Edit Purchase Details' : 'New Purchase Order'}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-8 py-6">
                {error && (
                  <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold border border-rose-100">
                    {error}
                  </div>
                )}

                <form id="purchase-form" onSubmit={handleSubmit} className="space-y-6">

                  {/* ── Row 1: Vendor + Vendor Reference ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-1.5 text-sm font-bold text-slate-700 mb-2">
                        <User size={14} className="text-indigo-500" />
                        <span>Vendor <span className="text-rose-400">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Towfiiq Company"
                        className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-800 placeholder:text-slate-300 border border-transparent focus:border-indigo-200 transition"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center space-x-1.5 text-sm font-bold text-slate-700 mb-2">
                        <Hash size={14} className="text-indigo-500" />
                        <span>Vendor Reference</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. PO-2024-001"
                        className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-800 placeholder:text-slate-300 border border-transparent focus:border-indigo-200 transition"
                        value={vendorReference}
                        onChange={(e) => setVendorReference(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* ── Row 2: Order Deadline + Location ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-1.5 text-sm font-bold text-slate-700 mb-2">
                        <Calendar size={14} className="text-indigo-500" />
                        <span>Order Deadline</span>
                      </label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700 border border-transparent focus:border-indigo-200 transition"
                        value={orderDeadline}
                        onChange={(e) => setOrderDeadline(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center space-x-1.5 text-sm font-bold text-slate-700 mb-2">
                        <ClipboardList size={14} className="text-indigo-500" />
                        <span>Delivery Location <span className="text-rose-400">*</span></span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 pr-10 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700 appearance-none border border-transparent focus:border-indigo-200 transition"
                          value={selectedLocation}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                          <option value="">Select location...</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* ── Products Table ── */}
                  <div>
                    {/* Column headers (desktop) */}
                    <div className="hidden sm:grid grid-cols-[2fr_0.6fr_0.7fr_0.8fr_0.6fr_auto] gap-2 px-3 mb-2">
                      {['Product Description', 'Qty', 'UOM', 'Unit Price', 'Total', ''].map((h) => (
                        <span key={h} className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</span>
                      ))}
                    </div>

                    {/* Line items */}
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {lines.map((line) => {
                          const lineTotal = (line.quantity || 0) * (line.unitPrice || 0);
                          return (
                            <motion.div
                              key={line.id}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.18 }}
                              className="grid grid-cols-1 sm:grid-cols-[2fr_0.6fr_0.7fr_0.8fr_0.6fr_auto] gap-2 items-center bg-slate-50 rounded-2xl p-3"
                            >
                              {/* Product Description */}
                              <div>
                                {line.isNewProduct ? (
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      required
                                      placeholder="New product name..."
                                      className="flex-1 min-w-0 bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none font-medium border border-indigo-100 transition"
                                      value={line.productName}
                                      onChange={(e) => updateLine(line.id, { productName: e.target.value })}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateLine(line.id, { isNewProduct: false, productId: '', productName: '' })}
                                      className="shrink-0 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-white rounded-lg px-2 border border-slate-100"
                                    >List</button>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <select
                                      className="w-full bg-white rounded-xl px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-indigo-400 outline-none appearance-none font-medium border border-slate-100 transition text-slate-700"
                                      value={line.productId}
                                      onChange={(e) => handleProductSelect(line.id, e.target.value)}
                                    >
                                      <option value="">Choose product...</option>
                                      <option value="__new__">➕ Add new product</option>
                                      {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  </div>
                                )}
                              </div>

                              {/* Quantity */}
                              <div>
                                <span className="sm:hidden block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Qty</span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  required
                                  className="w-full bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none font-bold border border-slate-100 transition text-center"
                                  value={line.quantity}
                                  onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                                />
                              </div>

                              {/* UOM */}
                              <div>
                                <span className="sm:hidden block text-[10px] text-slate-400 font-bold uppercase mb-0.5">UOM</span>
                                <input
                                  type="text"
                                  placeholder="pcs"
                                  className="w-full bg-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none font-medium border border-slate-100 transition text-center"
                                  value={line.uom}
                                  onChange={(e) => updateLine(line.id, { uom: e.target.value })}
                                />
                              </div>

                              {/* Unit Price */}
                              <div>
                                <span className="sm:hidden block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Unit Price</span>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    className="w-full bg-white rounded-xl pl-6 pr-2 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none font-bold border border-slate-100 transition"
                                    value={line.unitPrice}
                                    onChange={(e) => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  />
                                </div>
                              </div>

                              {/* Total Price (auto-calculated) */}
                              <div className="text-right sm:text-center">
                                <span className="sm:hidden text-[10px] text-slate-400 font-bold uppercase">Total: </span>
                                <span className="text-sm font-black text-indigo-600">
                                  ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              {/* Remove button */}
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeLine(line.id)}
                                  disabled={lines.length === 1}
                                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Add a product */}
                    <button
                      type="button"
                      onClick={addLine}
                      className="mt-3 flex items-center space-x-2 px-4 py-2.5 border-2 border-dashed border-indigo-200 text-indigo-500 font-bold text-sm rounded-2xl hover:border-indigo-400 hover:bg-indigo-50 transition-all w-full justify-center"
                    >
                      <Plus size={16} />
                      <span>Add a product</span>
                    </button>
                  </div>

                  {/* ── Grand Total ── */}
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl px-6 py-4 flex justify-between items-center">
                    <span className="text-white/80 font-bold uppercase tracking-widest text-sm">Total Price</span>
                    <span className="text-3xl font-black text-white">
                      ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                </form>
              </div>

              {/* Modal Footer */}
              <div className="px-8 pb-8 pt-4 flex space-x-3 shrink-0 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  form="purchase-form"
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      {!editingPurchase && <Plus size={18} />}
                      <span>{editingPurchase ? 'Update Purchase' : 'Save Purchase'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
