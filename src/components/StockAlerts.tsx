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

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Stock Alerts</h3>
            <p className="text-sm text-slate-500 font-medium">{alerts.length} items require attention</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map(({ product, currentStock, isOut }) => (
          <div
            key={product.id}
            className={`group p-6 rounded-[24px] border-2 transition-all hover:shadow-md ${
              isOut 
                ? 'bg-rose-50 border-rose-100 hover:border-rose-200' 
                : 'bg-amber-50 border-amber-100 hover:border-amber-200'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${isOut ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                <Package className="w-5 h-5" />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isOut ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {isOut ? 'Out of Stock' : 'Low Stock'}
              </span>
            </div>

            <h4 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
              {product.name}
            </h4>
            <p className="text-xs font-medium text-slate-500 mb-4">{product.sku} • {product.category}</p>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                <p className={`text-2xl font-black ${isOut ? 'text-rose-600' : 'text-amber-600'}`}>
                  {currentStock} <span className="text-sm font-bold opacity-60">{product.unit}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Minimum</p>
                <p className="text-lg font-bold text-slate-700">{product.minStockLevel}</p>
              </div>
            </div>

            {onViewProduct && (
              <button
                onClick={() => onViewProduct(product.id)}
                className="w-full mt-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-bold flex items-center justify-center space-x-2 hover:bg-slate-50 transition-colors"
              >
                <span>Restock Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
