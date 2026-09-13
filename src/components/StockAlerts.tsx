import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Package, ArrowRight } from 'lucide-react';
import { Product, InventoryItem } from '../types';

interface StockAlertsProps {
  products: Product[];
  inventory: InventoryItem[];
  onViewProduct?: (productId: string) => void;
}

export default function StockAlerts({ products, inventory, onViewProduct }: StockAlertsProps) {
  const alerts = products.map(product => {
    const currentStock = inventory
      .filter(i => i.productId === product.id)
      .reduce((acc, curr) => acc + curr.quantity, 0);
    
    return {
      product,
      currentStock,
      isLow: product.minStockLevel > 0 && currentStock > 0 && currentStock <= product.minStockLevel,
      isOut: product.minStockLevel > 0 && currentStock === 0
    };
  }).filter(item => item.isLow || item.isOut);

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900">Inventory Healthy</h3>
        <p className="text-sm font-medium text-slate-500 mt-2">All items are above minimum stock levels.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Critical Alerts</h3>
            <p className="text-sm text-slate-500 font-bold">{alerts.length} items need attention</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.slice(0, 4).map(({ product, currentStock, isOut }) => (
          <div
            key={product.id}
            className={`group p-5 rounded-3xl border transition-all ${
              isOut 
                ? 'bg-rose-50/50 border-rose-100 hover:border-rose-200' 
                : 'bg-amber-50/50 border-amber-100 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${isOut ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 truncate max-w-[120px]">
                    {product.name}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500">{product.category}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isOut ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-amber-600 text-white shadow-lg shadow-amber-200'
              }`}>
                {isOut ? 'Empty' : 'Low'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">In Stock</p>
                <p className={`text-xl font-black ${isOut ? 'text-rose-600' : 'text-amber-600'}`}>
                  {currentStock} <span className="text-xs opacity-60 font-bold">{product.unit}</span>
                </p>
              </div>
              {onViewProduct && (
                <button
                  onClick={() => onViewProduct(product.id)}
                  className="p-2 bg-white rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {alerts.length > 4 && (
        <button className="w-full mt-6 py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-indigo-600 transition-all">
          View all {alerts.length} alerts
        </button>
      )}
    </motion.div>
  );
}

