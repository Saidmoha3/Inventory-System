import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface DataListProps {
  title: string;
  data: any[];
  columns: { key: string; label: string }[];
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
}

export default function DataList({ title, data, columns, onEdit, onDelete, onAdd }: DataListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        {onAdd && (
          <button 
            onClick={onAdd}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={20} />
            <span>Add New</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item, idx) => (
                <motion.tr
                  key={item.id || idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-sm font-medium text-slate-600">
                      {item[col.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4 text-right space-x-4">
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(item)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-wider"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <>
                          {confirmDeleteId === item.id ? (
                            <div className="inline-flex items-center space-x-2 bg-emerald-50 px-2 py-1 rounded-lg">
                              <button 
                                onClick={() => { onDelete(item.id); setConfirmDeleteId(null); }}
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
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-wider"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  )}
                </motion.tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                    No records found in this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
