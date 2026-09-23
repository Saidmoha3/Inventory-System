import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Wallet, Trash2, Calendar, DollarSign, FileText } from 'lucide-react';
import { Expense } from '../types';
import { getExpenses, addExpense, deleteExpense } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

export default function ExpenseManager() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categories = ['General', 'Rent', 'Utilities', 'Salary', 'Transport', 'Maintenance'];

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const data = await getExpenses();
    // Sort by date descending
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    await addExpense({
      description,
      amount: parseFloat(amount),
      category,
      date,
      createdBy: user?.name || 'Unknown'
    });

    setIsAdding(false);
    setDescription('');
    setAmount('');
    setCategory('General');
    loadExpenses();
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    setConfirmDeleteId(null);
    loadExpenses();
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kharashaadka (Expenses)</h2>
          <p className="text-slate-500">Maamul kharashaadka maalinlaha ah ee meheradda</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 px-6 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all"
        >
          <Plus size={20} />
          <span>Ku Dar Kharash</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Wadarta Kharashaadka</p>
            <p className="text-3xl font-black text-slate-900">${totalExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {expenses.map((expense) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{expense.description}</h3>
                <div className="flex items-center space-x-3 text-sm text-slate-500 mt-1">
                  <span className="flex items-center"><Calendar size={14} className="mr-1"/> {expense.date}</span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs font-semibold">{expense.category}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-xl font-black text-rose-600">-${expense.amount.toFixed(2)}</p>
                <p className="text-xs font-medium text-slate-400">by {expense.createdBy}</p>
              </div>
              
              {confirmDeleteId === expense.id ? (
                <div className="flex flex-col items-center space-y-2">
                  <button onClick={() => handleDelete(expense.id)} className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1 rounded-lg">Confirm</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(expense.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {expenses.length === 0 && (
          <div className="col-span-1 lg:col-span-2 text-center py-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
            <Wallet size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Wax kharash ah lama diiwaangelin</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsAdding(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Wallet size={28} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Ku Dar Kharash Cusub</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Faahfaahin (Description)</label>
                <input
                  type="text"
                  required
                  placeholder="Tusaale: Kirada bisha"
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Lacagta ($)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-4 py-4 focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nooca (Category)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-rose-500 outline-none font-medium appearance-none"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Taariikhda</label>
                <input
                  type="date"
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Kansal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all"
                >
                  Diiwaangeli
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
