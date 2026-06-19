'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, usePOSStore } from '../store/usePOSStore';

interface PizzaBuilderProps {
  initialProduct?: Product | null;
  initialSize?: 'MD' | 'GD' | 'FM' | null;
  isHalfAndHalfOnly?: boolean;
  onConfirm: (data: { size: string; halfAId: string; halfBId: string; price: number; isHalfAndHalf: boolean; wantsStuffedCrust?: boolean; stuffedCrustProductId?: string }) => void;
  onCancel: () => void;
}

export const PizzaBuilder: React.FC<PizzaBuilderProps> = ({ 
  initialProduct, 
  initialSize,
  isHalfAndHalfOnly, 
  onConfirm, 
  onCancel 
}) => {
  const { products, categories } = usePOSStore();
  const pizzaCategory = categories.find(c => c.name.toUpperCase() === 'PIZZAS');
  const pizzas = products.filter(p => p.categoryId === pizzaCategory?.id && p.isActive);
  
  const [size, setSize] = useState<'MD' | 'GD' | 'FM' | null>(initialSize || null);
  const [halfA, setHalfA] = useState<Product | null>(initialProduct || null);
  const [halfB, setHalfB] = useState<Product | null>(initialProduct || null);
  const [step, setStep] = useState<'SIZE' | 'A' | 'B'>('SIZE');
  const [wantsStuffedCrust, setWantsStuffedCrust] = useState(false);

  const stuffedCrustProduct = size ? (products.find(p => {
    const nameStr = p.name.toUpperCase();
    if (size === 'FM') return nameStr.includes('ORILLA') && (nameStr.includes('FAM') || nameStr.includes('FM'));
    return nameStr.includes('ORILLA') && nameStr.includes(size);
  }) || products.find(p => p.name.toUpperCase().includes('ORILLA'))) : undefined;
  
  const stuffedCrustPrice = stuffedCrustProduct ? (stuffedCrustProduct.variants[0]?.price || 0) : 0;

  const getPrice = (p: Product | null, currentSize: string | null) => {
    if (!p || !currentSize) return 0;
    const variant = p.variants.find(v => v.name === currentSize);
    return variant?.price || 0;
  };

  const handleConfirm = () => {
    if (!size) return;

    if (!isHalfAndHalfOnly && halfA) {
      // Flow A: Single flavor
      onConfirm({
        size,
        halfAId: halfA.id,
        halfBId: halfA.id,
        price: getPrice(halfA, size),
        isHalfAndHalf: false,
        wantsStuffedCrust,
        stuffedCrustProductId: stuffedCrustProduct?.id
      });
      return;
    }

    if (isHalfAndHalfOnly && halfA && halfB) {
      // Flow B: Half and half
      const priceA = getPrice(halfA, size);
      const priceB = getPrice(halfB, size);
      const finalPrice = Math.max(priceA, priceB) + 15;

      onConfirm({
        size,
        halfAId: halfA.id,
        halfBId: halfB.id,
        price: finalPrice,
        isHalfAndHalf: true,
        wantsStuffedCrust,
        stuffedCrustProductId: stuffedCrustProduct?.id
      });
    }
  };

  const calculatedPrice = () => {
    if (!size) return 0;
    if (!isHalfAndHalfOnly && halfA) return getPrice(halfA, size);
    if (isHalfAndHalfOnly && halfA && halfB) {
      const priceA = getPrice(halfA, size);
      const priceB = getPrice(halfB, size);
      return Math.max(priceA, priceB) + 15;
    }
    return 0;
  };

  const finalPrice = calculatedPrice();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-surface-alt/50">
          <div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">The Pizza Builder</h2>
            <p className="text-zinc-400 font-medium tracking-wide">
              {isHalfAndHalfOnly ? 'Personalizando Mitad y Mitad' : `Pizza ${halfA?.name || 'Especialidad'}`} {size && `• Tamaño ${size}`}
            </p>
          </div>
          <button onClick={onCancel} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-1 overflow-hidden flex">
          {/* Left Panel: Selection Progress */}
          <div className="w-80 border-r border-white/5 p-8 flex flex-col gap-4 bg-black/20 overflow-y-auto">
            <div 
              onClick={() => setStep('SIZE')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${step === 'SIZE' ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 bg-white/5 opacity-60'}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Paso 1</p>
              <h3 className="text-lg font-bold italic tracking-tight">Tamaño</h3>
              <p className="text-sm font-medium mt-1 tracking-tight">{size ? (size === 'MD' ? 'Mediana' : size === 'GD' ? 'Grande' : 'Familiar') : 'Elige tamaño...'}</p>
            </div>

            {isHalfAndHalfOnly && (
              <>
                <div 
                  onClick={() => size && setStep('A')}
                  className={`p-5 rounded-3xl border-2 transition-all ${size ? 'cursor-pointer' : 'cursor-not-allowed'} ${step === 'A' ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 bg-white/5 opacity-60'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Paso 2</p>
                  <h3 className="text-lg font-bold italic tracking-tight">Mitad A</h3>
                  <p className="text-sm font-medium mt-1 truncate tracking-tight">{halfA ? halfA.name : 'Selecciona sabor...'}</p>
                </div>

                <div 
                  onClick={() => halfA && setStep('B')}
                  className={`p-5 rounded-3xl border-2 transition-all ${halfA ? 'cursor-pointer' : 'cursor-not-allowed'} ${step === 'B' ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 bg-white/5 opacity-60'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Paso 3</p>
                  <h3 className="text-lg font-bold italic tracking-tight">Mitad B</h3>
                  <p className="text-sm font-medium mt-1 truncate tracking-tight">{halfB ? halfB.name : 'Selecciona sabor...'}</p>
                </div>
              </>
            )}

            {!isHalfAndHalfOnly && halfA && (
              <div 
                className="p-5 rounded-3xl border-2 border-amber-500/20 bg-amber-500/5 opacity-60"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Especialidad</p>
                <h3 className="text-lg font-bold italic tracking-tight">{halfA.name}</h3>
                <p className="text-sm font-medium mt-1 truncate tracking-tight">Sabor único seleccionado</p>
              </div>
            )}

            <div className="mt-auto p-6 rounded-3xl bg-amber-500 text-black shadow-lg shadow-amber-500/10">
              <p className="text-xs font-black uppercase tracking-widest opacity-70">Precio Final</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black">$</span>
                <span className="text-4xl font-black italic">{finalPrice.toFixed(0)}</span>
                <span className="text-sm font-black">.00</span>
              </div>
              {isHalfAndHalfOnly && <p className="text-[10px] font-bold mt-2 opacity-60 leading-tight uppercase tracking-tighter">Incluye cargo Mitad y Mitad (+$15)</p>}
            </div>
          </div>

          {/* Right Panel: Selection Area */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/10">
            {step === 'SIZE' && (
              <div className="h-full flex flex-col justify-center max-w-md mx-auto space-y-4">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-center text-white">Selecciona Tamaño</h3>
                {[
                  { key: 'MD', label: 'Mediana' },
                  { key: 'GD', label: 'Grande' },
                  { key: 'FM', label: 'Familiar' },
                ].map((sz) => (
                  <button
                    key={sz.key}
                    onClick={() => {
                      setSize(sz.key as any);
                      if (isHalfAndHalfOnly) {
                        setStep('A');
                      }
                    }}
                    className={`w-full p-6 text-xl font-bold rounded-3xl border-2 transition-all text-left flex justify-between items-center group
                      ${size === sz.key ? 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-lg shadow-amber-500/10' : 'border-white/5 bg-white/5 text-white hover:border-white/20'}
                    `}
                  >
                    <span>{sz.label}</span>
                    <div className="text-right">
                      <span className="text-amber-500 font-black text-2xl tracking-tighter">{sz.key}</span>
                      {halfA && <p className="text-zinc-500 text-xs font-bold tracking-widest">${getPrice(halfA, sz.key)}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isHalfAndHalfOnly && (step === 'A' || step === 'B') && (
              <>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-4">
                  <span className="bg-amber-500 text-black px-3 py-1 rounded-xl text-lg not-italic">{step}</span>
                  Seleccionar sabor para Mitad {step}
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
                        p-6 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden group
                        ${(step === 'A' ? halfA?.id === pizza.id : halfB?.id === pizza.id) ? 'border-amber-500 bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'border-white/5 bg-white/5 text-white hover:border-white/20'}
                      `}
                    >
                      <p className="font-black text-lg leading-tight mb-2 italic uppercase tracking-tighter">{pizza.name}</p>
                      <p className={`text-sm font-black ${(step === 'A' ? halfA?.id === pizza.id : halfB?.id === pizza.id) ? 'text-black/70' : 'text-amber-500'}`}>
                        ${getPrice(pizza, size)}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {!isHalfAndHalfOnly && size && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center text-6xl">🍕</div>
                <div>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">¡Listo para agregar!</h3>
                  <p className="text-zinc-500 font-medium mt-2">Has seleccionado una pizza {halfA?.name} tamaño {size}.</p>
                </div>
                <button
                  onClick={handleConfirm}
                  className="px-12 py-6 bg-amber-500 text-black font-black text-2xl italic uppercase tracking-tighter rounded-3xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-transform"
                >
                  Agregar al Carrito
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Action Bar */}
        <div className="p-4 border-t border-white/5 bg-black flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            {size && stuffedCrustProduct && (
              <button
                onClick={() => setWantsStuffedCrust(!wantsStuffedCrust)}
                className={`px-6 py-4 text-lg font-bold rounded-2xl border-2 transition-all flex items-center gap-4
                  ${wantsStuffedCrust ? 'border-amber-500 bg-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/20' : 'border-white/5 bg-white/5 text-zinc-400 hover:border-white/20'}
                `}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${wantsStuffedCrust ? 'border-amber-500 bg-amber-500 text-black' : 'border-white/30'}`}>
                  {wantsStuffedCrust && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span>Añadir Orilla Rellena (+${stuffedCrustPrice.toFixed(0)})</span>
              </button>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="px-8 py-4 rounded-2xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isHalfAndHalfOnly ? (!size || !halfA || !halfB) : !size}
              className="px-8 py-4 rounded-2xl font-bold text-black bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
