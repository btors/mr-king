'use client';

import React from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { LoginView } from '@/components/LoginView';
import { TableView } from '@/components/TableView';
import { MenuView } from '@/components/MenuView';
import { CartView } from '@/components/CartView';
import { motion, AnimatePresence } from 'framer-motion';

export default function POSPage() {
  const { user, selectedTable } = usePOSStore();

  if (!user) {
    return <LoginView />;
  }

  return (
    <main className="h-[100dvh] flex flex-col overflow-hidden text-white selection:bg-accent selection:text-black">
      {/* Top Status Bar (Minimal) */}
      <div className="h-2 bg-gradient-to-r from-accent to-accent-orange" />
      
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedTable ? (
            <motion.div 
              key="table-view"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 h-full"
            >
              <TableView />
            </motion.div>
          ) : (
            <motion.div 
              key="pos-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 h-full flex overflow-hidden"
            >
              <MenuView />
              <CartView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Persistent App Navigation Indicator / Help */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/5 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sistema Conectado</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <span className="text-[10px] font-black uppercase tracking-widest text-accent">MR-KING v1.0 Enterprise</span>
      </div>
    </main>
  );
}
