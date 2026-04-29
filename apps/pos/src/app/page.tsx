'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePOSStore } from '@/store/usePOSStore';
import { LoginView } from '@/components/LoginView';
import { TableView } from '@/components/TableView';
import { MenuView } from '@/components/MenuView';
import { CartView } from '@/components/CartView';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

export default function POSPage() {
  const { user, selectedTable, setCatalog } = usePOSStore();

  useEffect(() => {
    if (!user) return; // Only fetch if logged in to save resources and comply with auth if present
    
    const loadCatalog = async () => {
      try {
        const [fetchedCategories, fetchedProducts] = await Promise.all([
           api.get<any[]>('/categories'),
           api.get<any[]>('/products')
        ]);
        
        const activeProducts = fetchedProducts.filter(p => p.isActive);
        setCatalog(fetchedCategories, activeProducts);
        console.log('Menú Cargado:', activeProducts);
      } catch (err) {
        console.error('Error fetching catalog:', err);
      }
    };
    
    loadCatalog();
  }, [user, setCatalog]);

  if (!user) {
    return <LoginView />;
  }

  return (
    <main className="h-[100dvh] flex flex-col overflow-hidden text-white selection:bg-accent selection:text-black relative">
      {/* Top Status Bar (Minimal) */}
      <div className="h-2 bg-gradient-to-r from-accent to-accent-orange flex-none" />
      
      {/* Optional Top Header for Admin Settings */}
      {user.role === 'ADMIN' && (
        <div className="absolute top-6 right-8 z-50">
          <Link 
            href="/admin/products"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 shadow-lg transition-colors text-sm font-bold uppercase tracking-widest text-zinc-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Configuración
          </Link>
        </div>
      )}

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
