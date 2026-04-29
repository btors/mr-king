'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';

interface CashClosureModalProps {
  onClose: () => void;
}

export const CashClosureModal: React.FC<CashClosureModalProps> = ({ onClose }) => {
  const [totalVentasHoy, setTotalVentasHoy] = useState<number>(0);
  const [montoFinal, setMontoFinal] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTodaySales = async () => {
      try {
        const data = await api.get<{ total: number }>('/cash/today');
        setTotalVentasHoy(data.total);
      } catch (err) {
        console.error('Failed to fetch today sales:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTodaySales();
  }, []);

  const handleCloseCash = async () => {
    if (!montoFinal || isNaN(Number(montoFinal))) return;
    
    setIsSubmitting(true);
    try {
      await api.post('/cash/close', {
        montoFinal: Number(montoFinal),
        totalVentas: totalVentasHoy,
      });
      alert('Corte de caja realizado con éxito');
      onClose();
    } catch (err) {
      console.error('Failed to close cash:', err);
      alert('Error al realizar el corte de caja');
    } finally {
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
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Corte de Caja</h2>
          <p className="text-zinc-400 text-sm mt-1">Resumen de ventas del día</p>
        </header>

        <div className="p-8 space-y-6">
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Total Ventas (Hoy)</p>
            {isLoading ? (
              <div className="h-8 w-24 bg-white/10 animate-pulse rounded" />
            ) : (
              <p className="text-3xl font-black text-accent italic">${totalVentasHoy.toFixed(2)}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-2">Monto Final en Caja</label>
            <input 
              type="number"
              value={montoFinal}
              onChange={(e) => setMontoFinal(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white text-xl font-bold focus:border-accent outline-none transition-all"
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
            disabled={!montoFinal || isSubmitting || isLoading}
            onClick={handleCloseCash}
            className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl
              ${!montoFinal || isSubmitting || isLoading ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-accent text-black hover:bg-accent-orange'}
            `}
          >
            {isSubmitting ? 'Procesando...' : 'Cerrar Caja'}
          </button>
        </footer>
      </motion.div>
    </div>
  );
};
