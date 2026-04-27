'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Product, usePOSStore } from '../store/usePOSStore';

// We hardcode flavors since the DB doesn't store them, as approved in the plan.
const WIN_FLAVORS = ['Original', 'BBQ', 'Búfalo', 'Mango Habanero', 'Ajo Parmesano', 'Lemon Pepper'];
const MIC_FLAVORS = ['Tradicional', 'Clamato', 'Azulito', 'Tamarindo', 'Mango', 'Fresa', 'Cubana'];

interface ProductVariantModalProps {
  product: Product;
  onConfirm: (data: { unitPrice: number; name: string; metadata?: any }) => void;
  onCancel: () => void;
}

export const ProductVariantModal: React.FC<ProductVariantModalProps> = ({ product, onConfirm, onCancel }) => {
  const { categories } = usePOSStore();
  const categoryName = categories.find(c => c.id === product.categoryId)?.name || '';

  const [micSize, setMicSize] = useState<'GD' | 'CH'>('GD');
  const [flavor, setFlavor] = useState('');
  
  // Custom multi-select for wings
  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);
  const isWings = categoryName === 'ALITAS';
  const isDrink = categoryName === 'BEBIDAS';

  // Auto-select first flavor if it's a Drink (Michelada) since we use single selection
  useEffect(() => {
    if (isDrink && product.name.includes('Michelada')) setFlavor(MIC_FLAVORS[0]);
  }, [isDrink, product.name]);

  const toggleSauce = (sauce: string) => {
    if (selectedSauces.includes(sauce)) {
      setSelectedSauces(prev => prev.filter(s => s !== sauce));
    } else {
      if (selectedSauces.length < product.maxSauces) {
        setSelectedSauces(prev => [...prev, sauce]);
      }
    }
  };

  const handleConfirm = () => {
    let price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    let name = product.name;
    let metadata: any = {};

    if (isWings && product.allowMultipleSauces) {
      metadata = { sauces: selectedSauces };
      name = `${product.name} (${selectedSauces.join(', ')})`;
    } else if (isWings) {
      // It's wings but maxSauces=1 (6 pcs)
      metadata = { flavor: selectedSauces[0] || WIN_FLAVORS[0] };
      name = `${product.name} (${metadata.flavor})`;
    } else if (isDrink && product.name.includes('Michelada')) {
      metadata = { flavor };
      name = `${product.name} (${flavor})`;
    }

    onConfirm({ unitPrice: price as number, name, metadata });
  };

  const isFormValid = () => {
    if (isWings) {
      if (product.maxSauces === 1) return selectedSauces.length === 1;
      // Allow confirming if they picked at least one sauce, up to max
      return selectedSauces.length > 0 && selectedSauces.length <= product.maxSauces;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <header className="p-8 border-b border-white/5 bg-surface-alt/50">
          <h2 className="text-2xl font-bold italic uppercase tracking-tighter">{product.name}</h2>
          <p className="text-zinc-500 text-sm mt-1">{product.description || 'Personaliza tu pedido'}</p>
        </header>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* WINGS: Dynamic Sauces Logic */}
          {isWings && (
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Selecciona Salsas</h3>
                 <span className="text-xs font-black text-accent bg-accent/10 px-2 py-1 rounded">
                   {selectedSauces.length} de {product.maxSauces} permitidas
                 </span>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 {WIN_FLAVORS.map(f => {
                   const isSelected = selectedSauces.includes(f);
                   const isMaxedOut = !isSelected && selectedSauces.length >= product.maxSauces;
                   
                   return (
                    <button
                      key={f}
                      onClick={() => toggleSauce(f)}
                      disabled={isMaxedOut}
                      className={`
                        p-4 rounded-xl border-2 transition-all text-left font-bold text-sm
                        ${isSelected ? 'bg-accent/10 border-accent text-accent' : 'border-white/5 bg-white/5 text-white hover:border-white/20'}
                        ${isMaxedOut ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                      `}
                    >
                      {f}
                    </button>
                   );
                 })}
               </div>
            </div>
          )}

          {/* DRINKS: Flavor */}
          {isDrink && product.name.includes('Michelada') && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Selecciona Sabor</h3>
               <div className="grid grid-cols-2 gap-3">
                 {MIC_FLAVORS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFlavor(f)}
                      className={`
                        p-4 rounded-xl border-2 transition-all text-left font-bold text-sm
                        ${flavor === f ? 'bg-accent/10 border-accent text-accent' : 'border-white/5 bg-white/5 text-white hover:border-white/20'}
                      `}
                    >
                      {f}
                    </button>
                 ))}
               </div>
            </div>
          )}

        </div>

        <footer className="p-8 border-t border-white/5 bg-surface-alt/50 flex gap-4">
          <button onClick={onCancel} className="px-6 py-4 rounded-2xl bg-zinc-800 font-bold">Cancelar</button>
          <button 
            onClick={handleConfirm}
            disabled={!isFormValid()}
            className="flex-1 py-4 rounded-2xl bg-accent text-black font-black uppercase tracking-tighter italic text-xl shadow-lg shadow-accent/10 disabled:opacity-50 disabled:grayscale transition-all"
          >
            Agregar al Carrito
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

