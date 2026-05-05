'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePOSStore } from '../store/usePOSStore';
import { Lock } from 'lucide-react';

export const ShiftOpeningView: React.FC = () => {
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { openShift, logout, user } = usePOSStore();

  const handleOpenShift = async () => {
    if (!openingBalance || isNaN(Number(openingBalance)) || Number(openingBalance) < 0) return;
    
    setIsSubmitting(true);
    const success = await openShift(Number(openingBalance));
    if (!success) {
      alert('Error al abrir el turno. Contacte al administrador.');
      setIsSubmitting(false);
    }
  };

  const isWaiter = user?.role === 'WAITER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0a0a0a] text-white">
      {/* Decorative background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative z-10"
      >
        <header className="p-10 border-b border-white/5 flex flex-col items-center text-center">
          <div className={`w-20 h-20 ${isWaiter ? 'bg-red-500/10' : 'bg-accent/10'} rounded-full flex items-center justify-center mb-6`}>
            {isWaiter ? (
              <Lock className="w-10 h-10 text-red-500" />
            ) : (
              <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            )}
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">Caja Cerrada</h2>
          <p className="text-zinc-400 mt-2 font-medium">
            {isWaiter ? "Pide a un Administrador que inicie el turno." : "Ingresa el fondo de caja inicial para comenzar a operar."}
          </p>
        </header>

        {!isWaiter && (
          <div className="p-10 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2">Fondo Inicial ($)</label>
              <input 
                type="number"
                min="0"
                value={openingBalance}
                onChange={(e) => {
                  const val = e.target.value;
                  if (Number(val) >= 0) setOpeningBalance(val);
                }}
                placeholder="0.00"
                className="w-full bg-black/40 border-2 border-white/5 rounded-3xl p-6 text-white text-3xl font-black tracking-tighter text-center focus:border-accent focus:bg-accent/5 outline-none transition-all placeholder:text-zinc-700"
                autoFocus
              />
            </div>
          </div>
        )}

        <footer className="p-8 border-t border-white/5 flex flex-col gap-4">
          {!isWaiter && (
            <button 
              disabled={!openingBalance || Number(openingBalance) < 0 || isSubmitting}
              onClick={handleOpenShift}
              className={`w-full py-5 rounded-2xl font-black text-2xl tracking-tighter italic uppercase transition-all shadow-xl
                ${!openingBalance || Number(openingBalance) < 0 || isSubmitting ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-accent text-black hover:bg-accent-orange hover:scale-[1.02] active:scale-[0.98]'}
              `}
            >
              {isSubmitting ? 'Abriendo Turno...' : 'Abrir Turno'}
            </button>
          )}
          
          <button 
            onClick={logout}
            className={`w-full py-3 text-sm font-bold text-zinc-500 hover:text-white transition-colors ${isWaiter ? 'py-5 bg-white/5 rounded-2xl hover:bg-white/10' : ''}`}
          >
            ← Volver al Login
          </button>
        </footer>
      </motion.div>
    </div>
  );
};
