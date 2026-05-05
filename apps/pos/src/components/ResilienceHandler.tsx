'use client';

import { useEffect } from 'react';
import { usePOSStore } from '../store/usePOSStore';
import { motion, AnimatePresence } from 'framer-motion';

export const ResilienceHandler: React.FC = () => {
  const { isOffline, offlineOrders, setOfflineStatus, processOfflineOrders } = usePOSStore();

  useEffect(() => {
    const handleOnline = () => {
      setOfflineStatus(false);
      processOfflineOrders();
    };
    const handleOffline = () => {
      setOfflineStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) setOfflineStatus(true);

    // Periodic retry if there are offline orders
    const interval = setInterval(() => {
      if (navigator.onLine && offlineOrders.length > 0) {
        processOfflineOrders();
      }
    }, 10000); // Every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [offlineOrders, processOfflineOrders, setOfflineStatus]);

  return (
    <AnimatePresence>
      {(isOffline || offlineOrders.length > 0) && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] flex justify-center p-4 pointer-events-none"
        >
          <div className="bg-amber-500 text-black px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 font-black uppercase tracking-tighter text-sm border-2 border-black/10 backdrop-blur-md pointer-events-auto">
            <span className="animate-pulse">⚠️</span>
            {isOffline ? 'MODO OFFLINE' : 'SINCRONIZANDO PEDIDOS...'}
            {offlineOrders.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="bg-black/20 px-2 py-0.5 rounded-lg ml-2">
                  {offlineOrders.length} PENDIENTES
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('¿Limpiar cola de pedidos? (Se perderán los pedidos no sincronizados)')) {
                      usePOSStore.getState().clearOfflineOrders();
                    }
                  }}
                  className="bg-black/80 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-black transition-colors"
                  title="Limpiar pedidos corruptos"
                >
                  <span className="text-[10px]">✕</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
