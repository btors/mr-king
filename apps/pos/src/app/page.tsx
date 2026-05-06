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
import { ResilienceHandler } from '@/components/ResilienceHandler';
import { ShiftOpeningView } from '@/components/ShiftOpeningView';
import { ExpenseModal } from '@/components/ExpenseModal';
import { CashClosureModal } from '@/components/CashClosureModal';
import { Settings } from 'lucide-react';

export default function POSPage() {
  const { user, selectedTable, setCatalog, currentShift, isShiftLoading, checkCurrentShift, clientName, orderType } = usePOSStore();
  const [showExpenseModal, setShowExpenseModal] = React.useState(false);
  const [showClosureModal, setShowClosureModal] = React.useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = React.useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('mr-king-force-logout') === 'true') {
      localStorage.removeItem('mr-king-force-logout');
      localStorage.removeItem('mr-king-pos-storage');
      localStorage.removeItem('mr-king-token');
      usePOSStore.setState({ user: null, selectedTable: null, cart: [], currentShift: null });
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!user) return; // Only fetch if logged in to save resources and comply with auth if present
    
    checkCurrentShift(); // Check if shift is open

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

  if (isShiftLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentShift) {
    return <ShiftOpeningView />;
  }

  return (
    <main className="h-[100dvh] flex flex-col overflow-hidden text-white selection:bg-accent selection:text-black relative">
      <ResilienceHandler />
      {/* Top Status Bar (Minimal) */}
      <div className="h-2 bg-gradient-to-r from-accent to-accent-orange flex-none" />

      <div className="absolute top-6 right-8 z-50 flex items-center gap-3">
        {user.role === 'ADMIN' && (
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className="w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-lg text-white transition-all"
            >
              <Settings className={`w-5 h-5 transition-transform duration-300 ${isAdminMenuOpen ? 'rotate-90 text-accent' : 'text-zinc-400'}`} />
            </motion.button>

            <AnimatePresence>
              {isAdminMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute top-full right-0 mt-3 p-3 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[220px]"
                >
                  <button
                    onClick={() => { setShowExpenseModal(true); setIsAdminMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors text-sm font-bold uppercase tracking-widest text-left"
                  >
                    <svg className="w-5 h-5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Gasto
                  </button>
                  
                  <button
                    onClick={() => { setShowClosureModal(true); setIsAdminMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-colors text-sm font-bold uppercase tracking-widest text-left"
                  >
                    <svg className="w-5 h-5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Corte (Z)
                  </button>

                  <div className="w-full h-px bg-white/5 my-1" />

                  <Link 
                    href="/admin/products"
                    className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition-colors text-sm font-bold uppercase tracking-widest"
                  >
                    <svg className="w-5 h-5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Configuración
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Channel orders (TAKE_AWAY / DELIVERY) go directly to MenuView */}
          {(!selectedTable && !clientName) ? (
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
      {/* Modals */}
      <AnimatePresence>
        {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} />}
        {showClosureModal && <CashClosureModal onClose={() => setShowClosureModal(false)} />}
      </AnimatePresence>
    </main>
  );
}
