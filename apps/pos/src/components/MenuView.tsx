'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePOSStore, Product, PizzaConfig } from '../store/usePOSStore';
import { PizzaBuilder } from './PizzaBuilder';
import { ProductModal } from './ProductModal';
import { CashClosureModal } from './CashClosureModal';

// Category emoji map for visual flair
const CAT_ICONS: Record<string, string> = {
  'PIZZAS': '🍕',
  'HAMBURGUESAS': '🍔',
  'HOT DOGS': '🌭',
  'ALITAS': '🍗',
  'SNACKS': '🍟',
  'BEBIDAS': '🥤',
  'POSTRES': '🍰',
  'EXTRAS': '➕',
};

const CATEGORY_ORDER = ['PIZZAS', 'ALITAS', 'HAMBURGUESAS', 'HOT DOGS', 'SNACKS', 'POSTRES', 'BEBIDAS'];

export const MenuView: React.FC = () => {
  const { products, categories, addToCart, selectedTable, selectTable, user } = usePOSStore();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [initialPizza, setInitialPizza] = useState<Product | null>(null);
  const [showPizzaBuilder, setShowPizzaBuilder] = useState(false);
  const [isHalfAndHalfMode, setIsHalfAndHalfMode] = useState(false);
  const [showCashClosure, setShowCashClosure] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sorted categories
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a.name.toUpperCase().trim());
      const indexB = CATEGORY_ORDER.indexOf(b.name.toUpperCase().trim());
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [categories]);

  // Set the first loaded category as the active one
  useEffect(() => {
    if (sortedCategories.length > 0 && !activeCategory) {
      setActiveCategory(sortedCategories[0].id);
    }
  }, [sortedCategories, activeCategory]);

  const filteredProducts = useMemo(
    () => products.filter(p => p.categoryId === activeCategory),
    [products, activeCategory]
  );

  const activeCategoryName = useMemo(
    () => categories.find(c => c.id === activeCategory)?.name || '',
    [categories, activeCategory]
  );

  const isPizzaCategory = activeCategoryName.toUpperCase().trim() === 'PIZZAS';

  const handleProductClick = (product: Product) => {
    const catName = categories.find(c => c.id === product.categoryId)?.name || '';

    // Pizzas → go to builder (Entry A: Solo)
    if (product.requiresSizes && catName === 'PIZZAS') {
      setInitialPizza(product);
      setIsHalfAndHalfMode(false);
      setShowPizzaBuilder(true);
      return;
    }

    // Wings, Micheladas → open dedicated modal
    if (catName === 'ALITAS' || (catName === 'BEBIDAS' && product.name.includes('Michelada'))) {
      setSelectedProduct(product);
      return;
    }

    // Burgers & Hot Dogs → handled by direct buttons
    if (catName === 'HAMBURGUESAS' || catName === 'HOT DOGS') {
      return;
    }

    // Everything else → direct add
    const basePrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price as number;
    addToCart({ productId: product.id, name: product.name, quantity: 1, unitPrice: basePrice });
  };

  const handleModalConfirm = (data: { unitPrice: number; name: string; metadata?: any }) => {
    addToCart({
      productId: selectedProduct!.id,
      name: data.name,
      quantity: 1,
      unitPrice: data.unitPrice,
      metadata: data.metadata,
    });
    setSelectedProduct(null);
  };

  const handleHalfAndHalfConfirm = (data: { size: string; halfAId: string; halfBId: string; price: number; isHalfAndHalf: boolean }) => {
    const productA = products.find(p => p.id === data.halfAId);
    const productB = products.find(p => p.id === data.halfBId);

    addToCart({
      productId: data.halfAId,
      name: data.isHalfAndHalf 
        ? `Mitad y Mitad (${data.size})` 
        : `${productA?.name || 'Pizza'} (${data.size})`,
      quantity: 1,
      unitPrice: data.price,
      metadata: { 
        isHalfAndHalf: data.isHalfAndHalf, 
        size: data.size, 
        halfAId: data.halfAId, 
        halfBId: data.halfBId,
        halfA: productA,
        halfB: productB
      },
    });
    setShowPizzaBuilder(false);
    setInitialPizza(null);
    setIsHalfAndHalfMode(false);
  };

  const getCatIcon = (name: string) => {
    return CAT_ICONS[name.toUpperCase().trim()] || '📋';
  };

  const getPizzaPrice = (basePrice: number, size: 'MD' | 'GD' | 'FM') => {
    if (size === 'GD') return basePrice + 20;
    if (size === 'FM') return basePrice + 70;
    return basePrice;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0a0a0a] relative">
      
      {/* ── FLOATING TOGGLE ── */}
      {!isSidebarOpen && (
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setIsSidebarOpen(true)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 bg-amber-500 text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
        </motion.button>
      )}

      {/* ── LEFT SIDEBAR: Category Navigation ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 112, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="w-28 flex-none flex flex-col items-center py-6 gap-2 bg-black/40 border-r border-white/5 overflow-y-auto custom-scrollbar z-30"
          >
            {/* Collapse button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="mb-2 w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition text-zinc-500"
              title="Colapsar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7" /></svg>
            </button>

            {/* Back button */}
            <button
              onClick={() => selectTable(null)}
              className="mb-4 w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition text-zinc-400 border border-white/5"
              title="Mesas"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>

            {sortedCategories.map(cat => {
              const isActive = activeCategory === cat.id;
              const icon = getCatIcon(cat.name);
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  whileTap={{ scale: 0.93 }}
                  className={`
                    relative w-20 flex flex-col items-center gap-1 py-3 px-1 rounded-2xl transition-all text-center
                    ${isActive
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <span className="text-2xl leading-none">{icon}</span>
                  <span className={`text-[10px] font-black uppercase leading-tight tracking-tight ${isActive ? 'text-black' : ''}`}>
                    {cat.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="cat-indicator"
                      className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-400 rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="flex-none px-8 py-5 flex items-center justify-between border-b border-white/5 bg-black/20">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              {getCatIcon(activeCategoryName)} {activeCategoryName || 'Menú'}
            </h2>
            <p className="text-zinc-500 text-sm font-medium">Mesa #{selectedTable?.number}</p>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'ADMIN' && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowCashClosure(true)}
                className="flex items-center gap-2 px-5 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 rounded-2xl font-black uppercase tracking-tighter text-xs transition-all shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Corte
              </motion.button>
            )}
          </div>
        </header>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-zinc-600 font-bold text-lg italic uppercase tracking-widest">Sin productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
              
              {/* ── PIZZA MITAD Y MITAD BUTTON ── */}
              {isPizzaCategory && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setInitialPizza(null);
                    setIsHalfAndHalfMode(true);
                    setShowPizzaBuilder(true);
                  }}
                  className="relative group overflow-hidden rounded-[2.5rem] border-4 border-dashed border-amber-500/30 hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 transition-all flex flex-col items-center justify-center p-8 text-center min-h-[260px]"
                >
                  <div className="w-20 h-20 rounded-full bg-amber-500 text-black flex items-center justify-center mb-4 shadow-xl shadow-amber-500/20 group-hover:rotate-12 transition-transform">
                    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a10 10 0 0 1 0 20M12 12l8.5 5M12 12l8.5-5"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-amber-400 transition-colors">
                    MITAD Y MITAD
                  </h3>
                  <p className="text-amber-500/60 font-bold text-[10px] mt-2 uppercase tracking-[0.2em]">
                    Personalizar sabores
                  </p>
                  
                  {/* Decorative glow */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/10 blur-[60px] group-hover:bg-amber-500/20 transition-all" />
                </motion.button>
              )}

              {filteredProducts.map((product, i) => {
                const basePrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price as number;
                const catName = categories.find(c => c.id === product.categoryId)?.name || '';
                const isComboCategory = catName === 'HAMBURGUESAS' || catName === 'HOT DOGS';
                const comboExtra = catName === 'HAMBURGUESAS' ? 20 : 15;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`
                      flex flex-col rounded-[2.2rem] overflow-hidden border border-white/5 bg-zinc-900/80 backdrop-blur-sm hover:border-amber-500/40 transition-all group
                      ${isPizzaCategory ? 'min-h-[260px]' : ''}
                    `}
                  >
                    {/* Main product area (clicking description opens builder for those who want to see it) */}
                    <div className="flex-1 p-6 text-left flex flex-col gap-3">
                      {/* Name & Icon/Badge */}
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-tight group-hover:text-amber-400 transition-colors">
                          {product.name}
                        </h3>
                        {!isPizzaCategory && (
                          <span className="text-2xl font-black text-amber-500 italic leading-none">
                            ${basePrice.toFixed(0)}
                          </span>
                        )}
                      </div>
                      
                      {/* Description */}
                      {product.description && (
                        <p className="text-zinc-500 text-[11px] font-medium leading-relaxed line-clamp-2 italic">
                          {product.description}
                        </p>
                      )}

                      {/* PIZZA PRICE BUTTONS */}
                      {isPizzaCategory && (
                        <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                          {[
                            { label: 'MD', size: 'MD' as const },
                            { label: 'GD', size: 'GD' as const },
                            { label: 'FM', size: 'FM' as const }
                          ].map(sz => (
                            <motion.button
                              key={sz.label}
                              whileHover={{ scale: 1.05, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleHalfAndHalfConfirm({
                                size: sz.size,
                                halfAId: product.id,
                                halfBId: product.id,
                                price: getPizzaPrice(basePrice, sz.size),
                                isHalfAndHalf: false
                              })}
                              className="text-center bg-black/40 py-2.5 rounded-xl border border-white/5 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center"
                            >
                              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1.5">{sz.label}</p>
                              <p className="text-xs font-black text-white italic leading-none">${getPizzaPrice(basePrice, sz.size)}</p>
                            </motion.button>
                          ))}
                        </div>
                      )}

                      {/* Tap hint for special products */}
                      {(catName === 'ALITAS' || (catName === 'BEBIDAS' && product.name.includes('Michelada'))) && (
                        <button
                          onClick={() => handleProductClick(product)}
                          className="mt-auto pt-2 flex items-center gap-2 text-amber-500 hover:text-amber-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                          Toca para elegir sabor
                        </button>
                      )}

                      {/* Normal products (Drinks/Snacks/Desserts) click area */}
                      {!isPizzaCategory && !isComboCategory && catName !== 'ALITAS' && !(catName === 'BEBIDAS' && product.name.includes('Michelada')) && (
                        <button
                          onClick={() => handleProductClick(product)}
                          className="absolute inset-0 z-0"
                        />
                      )}
                    </div>

                    {/* ── CON PAPAS TOGGLE for Burgers/Hot Dogs ── */}
                    {isComboCategory && (
                      <div className="p-4 pt-0 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart({
                              productId: product.id,
                              name: product.name,
                              quantity: 1,
                              unitPrice: basePrice,
                            });
                          }}
                          className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                        >
                          Sencilla
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart({
                              productId: product.id,
                              name: `${product.name} + Papas`,
                              quantity: 1,
                              unitPrice: basePrice + comboExtra,
                              metadata: { isCombo: true },
                            });
                          }}
                          className="flex-1 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500 border-2 border-amber-500/40 hover:border-amber-500 text-amber-400 hover:text-black font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                          + Papas
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {/* Product Modal (Wings, Micheladas) */}
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onConfirm={handleModalConfirm}
            onCancel={() => setSelectedProduct(null)}
          />
        )}

        {/* Cash Closure Modal */}
        {showCashClosure && (
          <CashClosureModal onClose={() => setShowCashClosure(false)} />
        )}

        {/* Pizza Half-And-Half Builder */}
        {showPizzaBuilder && (
          <PizzaBuilder
            initialProduct={initialPizza}
            isHalfAndHalfOnly={isHalfAndHalfMode}
            onConfirm={handleHalfAndHalfConfirm}
            onCancel={() => {
              setShowPizzaBuilder(false);
              setInitialPizza(null);
              setIsHalfAndHalfMode(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
