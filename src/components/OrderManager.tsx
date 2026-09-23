import React from 'react';
import { Order } from '../types';
import { Search, Plus, X } from 'lucide-react';
import { safeToDateString } from '../lib/utils';

interface OrderManagerProps {
  orders: Order[];
  onAdd?: (data: any) => Promise<any>;
  onUpdate?: (id: string, data: any) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
}

export default function OrderManager({ orders, onAdd, onUpdate, onDelete }: OrderManagerProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    customerName: '',
    address: '',
    productName: '',
    category: '',
    quantity: 1,
    totalPrice: 0
  });

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (order?: Order) => {
    setError(null);
    if (order) {
      setEditingOrder(order);
      setFormData({
        customerName: order.customerName,
        address: order.address,
        productName: order.productName,
        category: order.category,
        quantity: order.quantity,
        totalPrice: order.totalPrice
      });
    } else {
      setEditingOrder(null);
      setFormData({
        customerName: '',
        address: '',
        productName: '',
        category: '',
        quantity: 1,
        totalPrice: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingOrder) {
        await onUpdate?.(editingOrder.id, formData);
      } else {
        await onAdd?.(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving order:', err);
      setError(err.message || 'Failed to save order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onDelete?.(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search orders..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all whitespace-nowrap"
        >
          <Plus size={20} />
          <span>Add New Order</span>
        </button>
      </div>
      
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-5 text-sm font-bold text-slate-700">S NO</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700 min-w-[200px]">Customer Name</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700 min-w-[150px]">Address</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700">Product</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700">Category</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700 text-center">Qty</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700">Total</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700">Date</th>
                <th className="px-6 py-5 text-sm font-bold text-slate-700 text-right sticky right-0 bg-slate-50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order, idx) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{order.customerName}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.address}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{order.productName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{order.category}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">${order.totalPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{safeToDateString(order.orderDate)}</td>
                  <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(order)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === order.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded-lg hover:bg-slate-500"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(order.id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              No orders found.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-xl font-black text-slate-900">
                {editingOrder ? 'Update Order' : 'Add New Order'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600">
                  <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Customer Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Total Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.totalPrice}
                    onChange={(e) => setFormData({...formData, totalPrice: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
