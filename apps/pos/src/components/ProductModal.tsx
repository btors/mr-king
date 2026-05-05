'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, usePOSStore } from '../store/usePOSStore';

// Approved constant lists — DB doesn't store flavor names
const WING_SAUCES = ['Original', 'BBQ', 'Búfalo', 'Mango Habanero', 'Ajo Parmesano', 'Lemon Pepper'];
const MIC_FLAVORS = ['Tradicional', 'Clamato', 'Azulito', 'Tamarindo', 'Mango', 'Fresa', 'Cubana'];

interface ProductModalProps {
  product: Product;
  onConfirm: (data: { unitPrice: number; name: string; metadata?: any }) => void;
  onCancel: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onConfirm, onCancel }) => {
  const { categories } = usePOSStore();
  const catName = categories.find(c => c.id === product.categoryId)?.name || '';

  const isWings = catName.toUpperCase() === 'ALITAS';
  const isMichelada = catName.toUpperCase() === 'BEBIDAS' && product.name.includes('Michelada');

  // Use pre-selected price from MenuView hack if available, else default to first variant
  const basePrice = (product as any).price || product.variants[0]?.price || 0;

  // Wings state
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const wingFlavors = product.flavors && product.flavors.length > 0 ? product.flavors : WING_SAUCES;
  const maxSauces = product.maxFlavors ?? 1;
  const limitReached = selectedSauces.length >= maxSauces;

  // Michelada state
  const [micFlavor, setMicFlavor] = useState(MIC_FLAVORS[0]);

  const toggleSauce = (sauce: string) => {
    if (selectedSauces.includes(sauce)) {
      setSelectedSauces(prev => prev.filter(s => s !== sauce));
    } else if (!limitReached) {
      setSelectedSauces(prev => [...prev, sauce]);
    }
  };

  const isValid = isWings
    ? selectedSauces.length > 0
    : true;

  const handleConfirm = () => {
    let name = product.name;
    let metadata: any = {};

    if (isWings) {
      const sauceLabel = selectedSauces.join(' + ');
      name = `${product.name} (${sauceLabel})`;
      metadata = { ...((product as any).metadata || {}), sauces: selectedSauces };
    } else if (isMichelada) {
      name = `${product.name} ${micFlavor}`;
      metadata = { ...((product as any).metadata || {}), flavor: micFlavor };
    }

    onConfirm({ unitPrice: basePrice, name, metadata });
  };

  return (
    <motion.div
      key="product-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-7 border-b border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-zinc-500 text-sm mt-1">{product.description}</p>
              )}
            </div>
            <span className="text-3xl font-black text-amber-400 italic flex-none">
              ${basePrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-7 space-y-6 max-h-[55vh] overflow-y-auto custom-scrollbar">

          {/* ── WINGS: Sauce Selector ── */}
          {isWings && (
            <div className="space-y-4">
              {/* Sauce limit indicator */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Selecciona tu{maxSauces > 1 ? 's' : ''} salsa{maxSauces > 1 ? 's' : ''}
                </h3>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={selectedSauces.length}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-xs font-black px-3 py-1 rounded-full transition-colors ${
                      limitReached
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/5 text-zinc-400'
                    }`}
                  >
                    {selectedSauces.length} / {maxSauces}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Sauce pills */}
              <div className={`grid grid-cols-2 gap-3 p-2 rounded-2xl transition-all ${isWings && selectedSauces.length === 0 ? 'bg-red-500/5 ring-2 ring-red-500/20 animate-pulse' : ''}`}>
                {wingFlavors.map(sauce => {
                  const isSelected = selectedSauces.includes(sauce);
                  const isDisabled = !isSelected && limitReached;

                  return (
                    <motion.button
                      key={sauce}
                      whileTap={isDisabled ? {} : { scale: 0.95 }}
                      onClick={() => toggleSauce(sauce)}
                      disabled={isDisabled}
                      className={`
                        relative p-4 rounded-2xl border-2 font-bold text-sm text-left transition-all select-none
                        ${isSelected
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                          : isDisabled
                            ? 'border-white/5 bg-white/3 text-zinc-600 opacity-40 cursor-not-allowed grayscale'
                            : 'border-white/8 bg-white/5 text-white hover:border-amber-500/40 hover:bg-amber-500/5'}
                      `}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId={`check-${product.id}`}
                          className="absolute top-3 right-3 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </motion.div>
                      )}
                      {sauce}
                    </motion.button>
                  );
                })}
              </div>

              {/* Hint when limit reached / missing flavor */}
              <AnimatePresence>
                {limitReached && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-amber-500/80 text-xs font-bold text-center"
                  >
                    ✓ Límite de {maxSauces} salsa{maxSauces > 1 ? 's' : ''} alcanzado
                  </motion.p>
                )}
                {isWings && selectedSauces.length === 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-red-500 text-xs font-black text-center uppercase tracking-widest"
                  >
                    ⚠️ Debes elegir al menos una salsa
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── MICHELADAS: Flavor Selector ── */}
          {isMichelada && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                Selecciona el Sabor
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {MIC_FLAVORS.map(flavor => (
                  <button
                    key={flavor}
                    onClick={() => setMicFlavor(flavor)}
                    className={`
                      p-4 rounded-2xl border-2 font-bold text-sm text-left transition-all
                      ${micFlavor === flavor
                        ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                        : 'border-white/8 bg-white/5 text-white hover:border-amber-500/40'}
                    `}
                  >
                    {flavor}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-6 border-t border-white/5 flex gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-zinc-400 transition-colors"
          >
            Cancelar
          </button>
          <motion.button
            whileTap={isValid ? { scale: 0.97 } : {}}
            onClick={handleConfirm}
            disabled={!isValid}
            className={`
              flex-1 py-4 rounded-2xl font-black uppercase tracking-tighter text-lg transition-all
              ${isValid
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25 hover:bg-amber-400'
                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}
            `}
          >
            {isValid ? `Agregar · $${basePrice.toFixed(0)}` : 'Elige una salsa'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
