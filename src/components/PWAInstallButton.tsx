import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
      >
        <Download size={16} />
        <span>Ku shubo Mobile-ka</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
        >
          <Smartphone size={16} />
          <span>Ku shubo iPhone</span>
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIOSGuide(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl"
              >
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Smartphone size={32} className="text-indigo-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Ku shubo iPhone</h3>
                    <p className="text-slate-500 text-sm mt-1">Si aad Manager ahaan ula socoto meel kasta</p>
                  </div>

                  <div className="w-full space-y-4 pt-4">
                    <div className="flex items-start space-x-4 text-left">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-slate-600">1</div>
                      <p className="text-slate-600 text-sm">
                        Taabo badanka <strong>Share</strong> ee hoose (ama kore) ee Safari.
                      </p>
                    </div>
                    <div className="flex items-start space-x-4 text-left">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-slate-600">2</div>
                      <p className="text-slate-600 text-sm">
                        Hoos u deg ka dibna taabo <strong>Add to Home Screen</strong>.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowIOSGuide(false)}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors mt-4"
                  >
                    Waan fahmay
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
