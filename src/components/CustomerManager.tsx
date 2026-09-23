import React from 'react';
import { Customer } from '../types';
import { Search, Plus, X, DollarSign } from 'lucide-react';
import { settleCustomerDebt } from '../lib/db';

interface CustomerManagerProps {
  customers: Customer[];
  onAdd?: (data: any) => Promise<any>;
  onUpdate?: (id: string, data: any) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
}

export default function CustomerManager({ customers, onAdd, onUpdate, onDelete }: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [settleDebtCustomer, setSettleDebtCustomer] = React.useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = React.useState('');
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.phone.includes(searchTerm)
  );

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      onUpdate?.(editingCustomer.id, formData);
    } else {
      onAdd?.(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await onDelete?.(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Macaamiisha (Customers)</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 shadow-md transition-all"
        >
          <Plus size={20} />
          <span>Ku dar Macmiil</span>
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Raadi macmiil (Magac, Telefoon)..."
              className="w-full pl-10 pr-4 py-2 bg-white border-none text-sm focus:ring-0 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-bold text-slate-700">Tix.</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 min-w-[200px]">Magaca</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700">Telefoonka</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700">Deyn (Debt)</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700">Email</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700">Cinwaanka</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 text-right sticky right-0 bg-slate-50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] min-w-[250px]">Ficil (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer, idx) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{customer.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-bold ${customer.debtBalance && customer.debtBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      ${(customer.debtBalance || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="text-sm text-slate-600 whitespace-nowrap">{customer.address || '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] min-w-[250px]">
                    <div className="flex items-center justify-end space-x-2">
                      {customer.debtBalance && customer.debtBalance > 0 ? (
                        <button
                          onClick={() => setSettleDebtCustomer(customer)}
                          className="px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded hover:bg-rose-200 transition-colors shadow-sm uppercase tracking-wider whitespace-nowrap"
                        >
                          Settle Debt
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleOpenModal(customer)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm uppercase tracking-wider"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === customer.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded hover:bg-rose-700 uppercase tracking-wider"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded hover:bg-slate-500 uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(customer.id)}
                          className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded hover:bg-rose-600 transition-colors shadow-sm uppercase tracking-wider"
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
          {filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              Macmiil lama helin.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                {editingCustomer ? 'Beddel Xogta Macmiilka' : 'Diiwaangeli Macmiil Cusub'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Magaca Macmiilka *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Telefoonka *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email (Ikhtiyaari)</label>
                    <input
                      type="email"
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cinwaanka (Ikhtiyaari)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex space-x-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
                >
                  {editingCustomer ? 'Kaydi Isbeddelka' : 'Diiwaangeli'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Debt Modal */}
      {settleDebtCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Deyn Bixin</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">{settleDebtCustomer.name}</p>
              <p className="text-lg font-black text-rose-600 mt-2">Deynta: ${(settleDebtCustomer.debtBalance || 0).toFixed(2)}</p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const amt = parseFloat(settleAmount);
              if (amt > 0 && amt <= (settleDebtCustomer.debtBalance || 0)) {
                await settleCustomerDebt(settleDebtCustomer.id, amt);
                setSettleDebtCustomer(null);
                setSettleAmount('');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Imisa ayuu bixinayaa?</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={settleDebtCustomer.debtBalance || 0}
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-rose-500 outline-none font-black text-lg"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setSettleDebtCustomer(null); setSettleAmount(''); }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Kansal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20"
                >
                  Bixi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
