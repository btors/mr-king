'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, PizzaConfig, usePOSStore } from '../store/usePOSStore';

interface PizzaBuilderProps {
  size: 'MD' | 'GD' | 'FM';
  onConfirm: (config: PizzaConfig) => void;
  onCancel: () => void;
}

export const PizzaBuilder: React.FC<PizzaBuilderProps> = ({ size, onConfirm, onCancel }) => {
  const { products, categories } = usePOSStore();
  const pizzaCategory = categories.find(c => c.name === 'PIZZAS');
  const pizzas = products.filter(p => p.categoryId === pizzaCategory?.id && p.isActive);
  
  const [halfA, setHalfA] = useState<Product | null>(null);
  const [halfB, setHalfB] = useState<Product | null>(null);
  const [step, setStep] = useState<'A' | 'B'>('A');

  const getPrice = (p: Product | null) => {
    if (!p) return 0;
    const base = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
    if (size === 'FM') return (base as number) + 70;
    if (size === 'GD') return (base as number) + 20;
    return base as number;
  };

  const handleConfirm = () => {
    if (halfA && halfB) {
      onConfirm({
        size,
        isHalfAndHalf: true,
        halfA: { 
          id: halfA.id, 
          name: halfA.name, 
          prices: { MD: getPrice(halfA), GD: getPrice(halfA), FM: getPrice(halfA) } // Handled dynamically outside, but fulfilling legacy interface shape momentarily
        },
        halfB: { 
          id: halfB.id, 
          name: halfB.name, 
          prices: { MD: getPrice(halfB), GD: getPrice(halfB), FM: getPrice(halfB) } 
        },
      });
    }
  };

  const priceA = getPrice(halfA);
  const priceB = getPrice(halfB);
  const calculatedPrice = (halfA && halfB) ? Math.max(priceA, priceB) + 15 : 0;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-surface-alt/50">
          <div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">The Pizza Builder</h2>
            <p className="text-zinc-400 font-medium tracking-wide">Configurando Mitad y Mitad • <span className="text-accent font-bold">Tamaño {size}</span></p>
          </div>
          <button onClick={onCancel} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-1 overflow-hidden flex">
          {/* Left Panel: Selection Progress */}
          <div className="w-80 border-r border-white/5 p-8 flex flex-col gap-6 bg-black/20">
            <div 
              onClick={() => setStep('A')}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${step === 'A' ? 'border-accent bg-accent/10' : 'border-white/5 bg-white/5 opacity-60'}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Paso 1</p>
              <h3 className="text-xl font-bold italic tracking-tight">Mitad A</h3>
              <p className="text-sm font-medium mt-1 truncate tracking-tight">{halfA ? halfA.name : 'Selecciona sabor...'}</p>
            </div>

            <div 
              onClick={() => halfA && setStep('B')}
              className={`p-6 rounded-3xl border-2 transition-all ${step === 'B' ? 'border-accent bg-accent/10' : 'border-white/5 bg-white/5 opacity-60'} ${!halfA && 'cursor-not-allowed'}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Paso 2</p>
              <h3 className="text-xl font-bold italic tracking-tight">Mitad B</h3>
              <p className="text-sm font-medium mt-1 truncate tracking-tight">{halfB ? halfB.name : 'Selecciona sabor...'}</p>
            </div>

            <div className="mt-auto p-6 rounded-3xl bg-accent text-black shadow-lg shadow-accent/10">
              <p className="text-xs font-black uppercase tracking-widest opacity-70">Precio Final</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black">$</span>
                <span className="text-4xl font-black italic">{calculatedPrice.toFixed(0)}</span>
                <span className="text-sm font-black">.00</span>
              </div>
              <p className="text-[10px] font-bold mt-2 opacity-60 leading-tight uppercase tracking-tighter">Regla MR-KING: max(A,B) + $15.00</p>
            </div>
          </div>

          {/* Right Panel: Product Grid */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              Seleccionar sabor para <span className="text-accent underline decoration-2 underline-offset-4">Mitad {step}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {pizzas.map((pizza) => (
                <button
                  key={pizza.id}
                  onClick={() => {
                    if (step === 'A') {
                      setHalfA(pizza);
                      setStep('B');
                    } else {
                      setHalfB(pizza);
                    }
                  }}
                  className={`
                    p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group
                    ${(step === 'A' ? halfA?.id === pizza.id : halfB?.id === pizza.id) ? 'border-accent bg-accent text-black' : 'border-white/5 bg-white/5 text-white hover:border-white/20'}
                  `}
                >
                  <p className="font-bold text-lg leading-tight mb-2 italic">{pizza.name}</p>
                  <p className={`text-sm font-bold ${(step === 'A' ? halfA?.id === pizza.id : halfB?.id === pizza.id) ? 'text-black/70' : 'text-accent'}`}>
                    ${getPrice(pizza)}
                  </p>
                  
                  <div className={`absolute -bottom-2 -right-2 w-12 h-12 rotate-45 transition-transform group-hover:scale-110 ${step === 'A' ? 'opacity-10' : 'opacity-10'}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>

        <footer className="p-8 border-t border-white/5 flex gap-4 bg-surface-alt/50">
          <button 
            onClick={onCancel}
            className="px-8 py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            disabled={!halfA || !halfB}
            onClick={handleConfirm}
            className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl
              ${halfA && halfB ? 'bg-accent text-black hover:bg-accent-orange' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}
            `}
          >
            Cojimar Pizza!
          </button>
        </footer>
      </motion.div>
    </div>
  );
};
