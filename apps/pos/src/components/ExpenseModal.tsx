'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePOSStore } from '../store/usePOSStore';

interface ExpenseModalProps {
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ onClose }) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addExpense, user } = usePOSStore();

  if (user?.role !== 'ADMIN') return null;

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || !description.trim()) return;
    
    setIsSubmitting(true);
    const success = await addExpense(Number(amount), description);
    if (success) {
      alert('Gasto registrado con éxito.');
      onClose();
    } else {
      alert('Error al registrar el gasto.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <header className="p-8 border-b border-white/5 bg-surface-alt/50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Registrar Gasto</h2>
            <p className="text-zinc-400 text-sm mt-1">Salida de efectivo de la caja</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition text-zinc-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-2">Concepto</label>
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Compra de hielo, Insumos..."
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white text-lg font-medium focus:border-red-500 outline-none transition-all placeholder:text-zinc-600"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-2">Monto Retirado ($)</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 text-red-400 text-3xl font-black tracking-tighter focus:border-red-500 outline-none transition-all placeholder:text-red-900/50"
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
            disabled={!amount || !description.trim() || isSubmitting}
            onClick={handleSave}
            className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl
              ${!amount || !description.trim() || isSubmitting ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}
            `}
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar Gasto'}
          </button>
        </footer>
      </motion.div>
    </div>
  );
};
