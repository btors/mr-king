'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, usePOSStore } from '../store/usePOSStore';

// Approved constant lists — DB doesn't store flavor names
const WING_SAUCES = ['Original', 'BBQ', 'Búfalo', 'Mango Habanero', 'Ajo Parmesano', 'Lemon Pepper'];

interface ProductModalProps {
  product: Product;
  onConfirm: (data: { unitPrice: number; name: string; metadata?: any }) => void;
  onCancel: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onConfirm, onCancel }) => {
  const { categories } = usePOSStore();
  const catName = categories.find(c => c.id === product.categoryId)?.name || '';

  const isWings = catName.toUpperCase() === 'ALITAS' || catName.toUpperCase() === 'BONELESS';
  const isMichelada = catName.toUpperCase() === 'BEBIDAS' && product.name.includes('Michelada');

  // Use pre-selected price from MenuView hack if available, else default to first variant
  const basePrice = (product as any).price || product.variants[0]?.price || 0;

  // Wings state
  const wingFlavors = product.flavors && product.flavors.length > 0 ? product.flavors : WING_SAUCES;
  const variantName = (product as any).metadata?.variantName || '6pz';
  
  const matchingVariant = product.variants?.find((v: any) => v.name.toLowerCase() === variantName.toLowerCase()) || product.variants?.[0];
  const maxFlavors = (matchingVariant as any)?.maxFlavors || product.maxFlavors || 2;
  const portionSize = parseInt(variantName, 10) || 6;

  const [flavorPieces, setFlavorPieces] = useState<Record<string, number>>({});

  const totalPiecesAssigned = Object.values(flavorPieces).reduce((sum, count) => sum + count, 0);
  const activeFlavorsCount = Object.values(flavorPieces).filter(count => count > 0).length;
  
  const isSumPerfect = totalPiecesAssigned === portionSize;
  const isFlavorsCountValid = activeFlavorsCount > 0 && activeFlavorsCount <= maxFlavors;

  // Michelada state
  const [micFlavor, setMicFlavor] = useState(() => {
    const isMic = catName.toUpperCase() === 'BEBIDAS' && product.name.includes('Michelada');
    return isMic ? (product.variants[0]?.name || '') : '';
  });

  useEffect(() => {
    if (isMichelada && product.variants[0]?.name) {
      setMicFlavor(product.variants[0].name);
    }
  }, [product, isMichelada]);

  const selectedVariant = isMichelada 
    ? product.variants.find(v => v.name === micFlavor) 
    : null;
  const finalPrice = selectedVariant ? selectedVariant.price : basePrice;

  const handleAddPieces = (flavor: string) => {
    const current = flavorPieces[flavor] || 0;
    if (totalPiecesAssigned + 3 > portionSize) return;
    if (current === 0 && activeFlavorsCount >= maxFlavors) return;
    setFlavorPieces(prev => ({
      ...prev,
      [flavor]: current + 3
    }));
  };

  const handleSubPieces = (flavor: string) => {
    const current = flavorPieces[flavor] || 0;
    if (current <= 0) return;
    setFlavorPieces(prev => ({
      ...prev,
      [flavor]: Math.max(0, current - 3)
    }));
  };

  const isValid = isWings
    ? (isSumPerfect && isFlavorsCountValid)
    : (isMichelada ? !!micFlavor : true);

  const handleConfirm = () => {
    let name = product.name;
    let metadata: any = {};

    if (isWings) {
      const activeFlavors = Object.entries(flavorPieces)
        .filter(([_, pieces]) => pieces > 0)
        .map(([name, pieces]) => ({ name, pieces }));
      
      const flavorLabels = activeFlavors.map(f => `${f.pieces} ${f.name}`).join(' + ');
      name = `${product.name} ${variantName} (${flavorLabels})`;
      metadata = { 
        ...((product as any).metadata || {}), 
        config: {
          portionSize: variantName,
          flavors: activeFlavors
        }
      };
    } else if (isMichelada) {
      name = `${product.name} ${micFlavor}`;
      metadata = { 
        ...((product as any).metadata || {}), 
        flavor: micFlavor,
        variantName: micFlavor 
      };
    }

    onConfirm({ unitPrice: finalPrice, name, metadata });
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

          {/* ── WINGS: Interactive counters with 3-pieces increments ── */}
          {isWings && (
            <div className="space-y-4">
              {/* Summary and status of assigned pieces */}
              <div className="bg-zinc-950/60 p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-zinc-400">
                  <span>Porción Elegida</span>
                  <span className="text-amber-400 font-bold">{variantName}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-zinc-300">Piezas Asignadas:</span>
                  <span className={`text-base font-black ${isSumPerfect ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {totalPiecesAssigned} / {portionSize} pz
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-zinc-500">Sabores elegidos:</span>
                  <span className={`text-xs font-black ${isFlavorsCountValid ? 'text-emerald-500' : 'text-red-500'}`}>
                    {activeFlavorsCount} / {maxFlavors} máx
                  </span>
                </div>
              </div>

              {/* Sabor increment/decrement lists */}
              <div className="space-y-2.5">
                {wingFlavors.map(sauce => {
                  const pieces = flavorPieces[sauce] || 0;
                  const canDec = pieces > 0;
                  const canInc = (totalPiecesAssigned + 3 <= portionSize) && (pieces > 0 || activeFlavorsCount < maxFlavors);

                  return (
                    <div
                      key={sauce}
                      className={`
                        p-3.5 rounded-2xl border transition-all flex items-center justify-between
                        ${pieces > 0
                          ? 'border-amber-500/50 bg-amber-500/5'
                          : 'border-white/5 bg-white/2 hover:border-white/10'}
                      `}
                    >
                      <div className="flex flex-col">
                        <span className={`text-sm ${pieces > 0 ? 'font-black text-amber-400' : 'font-medium text-zinc-300'}`}>
                          {sauce}
                        </span>
                        {pieces > 0 && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            {pieces} pz asignadas
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSubPieces(sauce)}
                          disabled={!canDec}
                          className={`
                            w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg transition-all border
                            ${canDec
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-white/10 active:scale-95'
                              : 'bg-zinc-900/40 text-zinc-600 border-zinc-800/40 cursor-not-allowed'}
                          `}
                        >
                          -
                        </button>
                        <span className={`w-8 text-center font-black text-base ${pieces > 0 ? 'text-white' : 'text-zinc-600'}`}>
                          {pieces}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddPieces(sauce)}
                          disabled={!canInc}
                          className={`
                            w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg transition-all border
                            ${canInc
                              ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-600/50 active:scale-95 shadow-lg shadow-amber-500/10'
                              : 'bg-zinc-900/40 text-zinc-600 border-zinc-800/40 cursor-not-allowed'}
                          `}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-time Business validation helper warnings */}
              <AnimatePresence>
                {!isSumPerfect && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-amber-500 text-xs font-black text-center uppercase tracking-widest py-1"
                  >
                    ⚠️ Faltan {portionSize - totalPiecesAssigned} piezas por asignar
                  </motion.p>
                )}
                {isSumPerfect && !isFlavorsCountValid && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-red-500 text-xs font-black text-center uppercase tracking-widest py-1"
                  >
                    ⚠️ Superas el máximo de {maxFlavors} sabores permitidos
                  </motion.p>
                )}
                {isSumPerfect && isFlavorsCountValid && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-emerald-500 text-xs font-black text-center uppercase tracking-widest py-1"
                  >
                    ✓ Distribución de sabores perfecta y lista
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
                {product.variants.map(v => (
                  <button
                    key={v.name}
                    onClick={() => setMicFlavor(v.name)}
                    className={`
                      p-4 rounded-2xl border-2 font-bold text-sm text-left transition-all flex flex-col justify-between gap-1
                      ${micFlavor === v.name
                        ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                        : 'border-white/8 bg-white/5 text-white hover:border-amber-500/40'}
                    `}
                  >
                    <span className="font-black uppercase tracking-tight text-xs">{v.name}</span>
                    <span className="text-amber-500/85 text-[10px] font-black">${v.price.toFixed(0)}</span>
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
            {isValid ? `Agregar · $${(isMichelada ? finalPrice : basePrice).toFixed(0)}` : isWings ? 'Asignar piezas' : 'Elige una opción'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
