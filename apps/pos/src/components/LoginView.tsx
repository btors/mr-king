'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keypad } from './ui/Keypad';
import { usePOSStore } from '../store/usePOSStore';

export const LoginView: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const login = usePOSStore((state) => state.login);

  const handleKeyPress = (key: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + key);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  useEffect(() => {
    if (pin.length === 4) {
      const attemptLogin = async () => {
        const success = await login(pin);
        if (!success) {
          setError(true);
          setTimeout(() => {
            setError(false);
            setPin('');
          }, 1000);
        }
      };
      attemptLogin();
    }
  }, [pin, login]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center space-y-8"
      >
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
            <span className="text-4xl font-black text-black">MK</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">MR-KING POS</h1>
          <p className="text-zinc-500 font-medium">Ingresa tu PIN de acceso</p>
        </div>

        <div className="flex justify-center gap-4 py-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`
                w-4 h-4 rounded-full border-2 transition-all duration-300
                ${error ? 'bg-red-500 border-red-500 scale-110' : 
                  pin.length > i ? 'bg-accent border-accent scale-125' : 'bg-transparent border-zinc-700'}
              `}
            />
          ))}
        </div>

        <Keypad 
          onKeyPress={handleKeyPress} 
          onClear={handleClear} 
          onBackspace={handleBackspace} 
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-500 font-semibold absolute bottom-20 left-0 right-0"
            >
              PIN Incorrecto. Intenta de nuevo.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
