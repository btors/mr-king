'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePOSStore } from '../store/usePOSStore';

interface CashClosureModalProps {
  onClose: () => void;
}

export const CashClosureModal: React.FC<CashClosureModalProps> = ({ onClose }) => {
  const [montoFinal, setMontoFinal] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { closeShift, user } = usePOSStore();

  if (user?.role !== 'ADMIN') return null;

  const handleCloseCash = async () => {
    if (!montoFinal || isNaN(Number(montoFinal))) return;
    
    setIsSubmitting(true);
    const success = await closeShift(Number(montoFinal));
    if (success) {
      alert('Turno cerrado exitosamente. Imprimiendo Z-Report...');
      // closeShift will redirect to login '/' automatically
    } else {
      alert('Error al cerrar el turno. Contacte al administrador.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <header className="p-8 border-b border-white/5 bg-surface-alt/50">
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Cerrar Turno (Z)</h2>
          <p className="text-zinc-400 text-sm mt-1">Corte Ciego de Caja</p>
        </header>

        <div className="p-8 space-y-6">
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-500/80 text-sm font-medium text-center">
              Ingresa el dinero físico (billetes y monedas) que hay actualmente en el cajón de dinero.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-2">Monto Físico Contado ($)</label>
            <input 
              type="number"
              value={montoFinal}
              onChange={(e) => setMontoFinal(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-6 text-white text-3xl font-black tracking-tighter text-center focus:border-amber-500 outline-none transition-all"
              autoFocus
            />
          </div>
        </div>

        <footer className="p-8 border-t border-white/5 bg-surface-alt/50 flex gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            disabled={!montoFinal || isSubmitting}
            onClick={handleCloseCash}
            className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl
              ${!montoFinal || isSubmitting ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-amber-500 text-black hover:bg-amber-400'}
            `}
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar Cierre'}
          </button>
        </footer>
      </motion.div>
    </div>
  );
};
