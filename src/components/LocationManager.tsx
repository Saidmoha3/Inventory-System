import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Plus, Warehouse, Navigation, Trash2 } from 'lucide-react';
import { Location, InventoryItem } from '../types';
import { addLocation, deleteLocation } from '../lib/db';

interface LocationProps {
  locations: Location[];
  inventory: InventoryItem[];
}

export default function LocationManager({ locations, inventory }: LocationProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLocation({ name, address });
    setIsAdding(false);
    setName('');
    setAddress('');
  };

  const getStockCount = (locationId: string) => {
    return inventory
      .filter(i => i.locationId === locationId)
      .reduce((acc, curr) => acc + curr.quantity, 0);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Distribution Centers</h2>
          <p className="text-slate-500">Manage your physical storage locations</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus size={20} />
          <span>Add Location</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -mr-16 -mt-16 transition-all group-hover:scale-110" />
            
            <div className="relative">
              <div className="p-4 bg-white shadow-lg rounded-2xl inline-block mb-6">
                <Warehouse className="text-indigo-600 w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{location.name}</h3>
              <div className="flex items-start space-x-2 text-slate-500 mb-8 min-h-[48px]">
                <Navigation size={18} className="mt-1 shrink-0" />
                <p className="text-sm font-medium">{location.address}</p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Assets</p>
                  <p className="text-2xl font-black text-slate-900">{getStockCount(location.id)} <span className="text-sm font-bold text-slate-400">Items</span></p>
                </div>
                {confirmDeleteId === location.id ? (
                  <div className="flex flex-col items-end space-y-1">
                    <button 
                      onClick={() => { deleteLocation(location.id); setConfirmDeleteId(null); }}
                      className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:text-rose-800"
                    >
                      OK
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmDeleteId(location.id)}
                    className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
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
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <MapPin size={28} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Add New Center</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Location Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Warehouse"
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Address</label>
                <textarea
                  required
                  placeholder="123 Logistics Way, Sector 4..."
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium min-h-[100px] resize-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Initialize Location
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
