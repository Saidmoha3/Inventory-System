import React from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  React.useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {
        // Log errors silently as it scans continuously
      }
    );

    return () => {
      scanner.clear().catch(error => console.error('Failed to clear scanner:', error));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Camera size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">QR Scanner</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <div id="qr-reader" className="overflow-hidden rounded-3xl border-2 border-slate-100 bg-slate-50" />
          
          <div className="mt-8 space-y-4">
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-start space-x-3">
              <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5 animate-pulse" />
              <p className="text-sm font-medium text-indigo-900">
                Point your camera at a product QR code to instantly view stock history and update inventory.
              </p>
            </div>
            
            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Scanning for active SKUs...
            </p>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            Cancel Scanning
          </button>
        </div>
      </motion.div>
    </div>
  );
}
