'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore } from '../../store/useAdminStore';
import { Keypad } from '../ui/Keypad'; // Reuse the existing POS Keypad
import { useRouter } from 'next/navigation';

interface AdminPinGateProps {
  children: React.ReactNode;
}

export const AdminPinGate: React.FC<AdminPinGateProps> = ({ children }) => {
  const { isAdminUnlocked, unlockAdmin } = useAdminStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  if (isAdminUnlocked) {
    return <>{children}</>;
  }

  const handleKeyPress = (key: string) => {
    if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      
      if (newPin.length === 4) {
        const success = unlockAdmin(newPin);
        if (!success) {
          setError(true);
          setTimeout(() => {
            setError(false);
            setPin('');
          }, 1000);
        }
      }
    }
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));
  const handleClear = () => setPin('');

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black p-6 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center space-y-8 bg-surface-alt p-10 rounded-[2rem] border border-red-500/20 shadow-2xl shadow-red-500/10"
      >
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center shadow-lg border border-red-500/30">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">Acceso Restringido</h1>
          <p className="text-zinc-400 font-medium leading-tight">Módulo de Administración. Ingresa el PIN maestro.</p>
        </div>

        <div className="flex justify-center gap-4 py-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`
                w-5 h-5 rounded-full border-2 transition-all duration-300
                ${error ? 'bg-red-500 border-red-500 scale-110' : 
                  pin.length > i ? 'bg-red-500 border-red-500 scale-125' : 'bg-black border-zinc-700'}
              `}
            />
          ))}
        </div>

        <div className="scale-90 origin-top">
          <Keypad 
            onKeyPress={handleKeyPress} 
            onClear={handleClear} 
            onBackspace={handleBackspace} 
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 font-bold uppercase tracking-widest text-sm"
            >
              Acceso Denegado
            </motion.p>
          )}
        </AnimatePresence>

        <div className="pt-4 border-t border-white/10 flex justify-center">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors rounded-2xl text-sm font-bold uppercase tracking-widest"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
