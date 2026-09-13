import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center space-x-3 bg-amber-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-amber-500/20"
        >
          <div className="relative">
            <WifiOff size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
          <div className="text-sm font-bold">
            Internet-ku wuu maqan yahay — Offline baad tahay
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
