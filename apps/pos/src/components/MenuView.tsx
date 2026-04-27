'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePOSStore, Product, PizzaConfig } from '../store/usePOSStore';
import { PizzaBuilder } from './PizzaBuilder';
import { ProductVariantModal } from './ProductVariantModal';
import { api } from '../lib/api';

export const MenuView: React.FC = () => {
  const { products, categories, setCatalog, addToCart, selectedTable, selectTable } = usePOSStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [showPizzaBuilder, setShowPizzaBuilder] = useState(false);
  const [pizzaSizeForBuilder, setPizzaSizeForBuilder] = useState<'MD' | 'GD' | 'FM'>('GD');
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [showSizeSelectorForBuilder, setShowSizeSelectorForBuilder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setIsLoading(true);
        const [fetchedCategories, fetchedProducts] = await Promise.all([
           api.get<any[]>('/categories'),
           api.get<Product[]>('/products')
        ]);
        
        // Filter out inactive products to ensure fidelity to backend schema
        const activeProducts = fetchedProducts.filter(p => p.isActive);
        setCatalog(fetchedCategories, activeProducts);
        
        if (fetchedCategories.length > 0) {
          setActiveCategory(fetchedCategories[0].id);
        }
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCatalog();
  }, [setCatalog]);

  const filteredProducts = products.filter(p => p.categoryId === activeCategory);

  const handleProductClick = (product: Product) => {
    // If it has variants (Size, Wings, Micheladas), open modal
    // Determine category visually by checking name
    const categoryName = categories.find(c => c.id === product.categoryId)?.name || '';

    if (product.requiresSizes && categoryName === 'PIZZAS') {
       setShowSizeSelectorForBuilder(true);
       return;
    }

    if (product.allowMultipleSauces || categoryName === 'BEBIDAS' || categoryName === 'ALITAS') {
      // Small exception: We want a modal for Drinks if it needs flavor size (e.g., Micheladas)
      // but strictly speaking, Prisma doesn't have "flavors".
      // We will open variant modal for anything that requires multiple sauces or is Alitas.
      // Let's refine:
      setSelectedProductForVariant(product);
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: typeof product.price === 'string' ? parseFloat(product.price) : typeof product.price === 'number' ? product.price : 0,
    });
  };

  const handleVariantConfirm = (data: { unitPrice: number; name: string; metadata?: any }) => {
    addToCart({
      productId: selectedProductForVariant!.id,
      name: data.name,
      quantity: 1,
      unitPrice: data.unitPrice,
      metadata: data.metadata,
    });
    setSelectedProductForVariant(null);
  };

  const handleHalfAndHalfConfirm = (config: PizzaConfig) => {
    // Correct momentary preview price calculation: max(A,B) + $15.00
    // Backend will overwrite this.
    const getSizedPrice = (pizzaPrice: string | number, size: 'MD' | 'GD' | 'FM') => {
      const basePrice = typeof pizzaPrice === 'string' ? parseFloat(pizzaPrice) : pizzaPrice;
      if (size === 'FM') return basePrice + 70;
      if (size === 'GD') return basePrice + 20;
      return basePrice;
    };

    // Calculate preview price using the payload structure
    const priceA = config.halfA ? getSizedPrice(config.halfA.prices.MD, config.size) : 0;
    const priceB = config.halfB ? getSizedPrice(config.halfB.prices.MD, config.size) : 0;
    const finalPrice = Math.max(priceA, priceB) + 15;

    addToCart({
      productId: 'p-custom-half', // Backend will intercept this custom ID
      name: `Mitad y Mitad (${config.size})`,
      quantity: 1,
      unitPrice: finalPrice,
      metadata: { pizzaConfig: config }, // We send the full config with IDs
    });
    setShowPizzaBuilder(false);
  };


  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <header className="p-8 pb-4 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => selectTable(null)}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Menú</h2>
            <p className="text-zinc-500 font-medium">Mesa #{selectedTable?.number}</p>
          </div>
        </div>

        {activeCategory === 'cat-pizzas' && (
          <button 
            onClick={() => setShowSizeSelectorForBuilder(true)}
            className="bg-accent-orange px-6 py-4 rounded-2xl text-black font-black uppercase tracking-tighter italic flex items-center gap-3 hover:scale-105 transition shadow-lg shadow-accent-orange/20"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg>
            Nueva Mitad y Mitad
          </button>
        )}
      </header>

      {/* Categories Tabs */}
      <div className="flex p-8 pt-4 gap-3 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`
              px-8 py-5 rounded-3xl font-bold text-lg whitespace-nowrap transition-all border-2
              ${activeCategory === cat.id ? 'bg-accent text-black border-accent' : 'bg-surface-alt border-white/5 text-zinc-400 hover:border-white/10'}
            `}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-8 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24 custom-scrollbar">
        {filteredProducts.map((product) => (
          <motion.button
            key={product.id}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleProductClick(product)}
            className="flex flex-col bg-surface-alt border border-white/5 rounded-[2rem] overflow-hidden group hover:border-accent/40 transition-all text-left h-fit"
          >
            <div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 relative p-8">
              <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2H16V6Z" /></svg>
              </div>
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <span className="font-black text-accent text-xl italic italic leading-none">
                  ${typeof product.price === 'string' ? parseFloat(product.price).toFixed(0) : product.price}
                  {product.requiresSizes && '+'}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white leading-tight italic">{product.name}</h3>
              <p className="text-zinc-500 text-sm mt-2 line-clamp-2 leading-relaxed">{product.description || 'Fiel al menú oficial.'}</p>
            </div>
            {(categories.find(c => c.id === product.categoryId)?.name === 'HAMBURGUESAS' || categories.find(c => c.id === product.categoryId)?.name === 'HOT DOGS') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const comboExtra = categories.find(c => c.id === product.categoryId)?.name === 'HAMBURGUESAS' ? 20 : 15;
                  const base = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
                  addToCart({
                    productId: product.id,
                    name: `${product.name} + Papas`,
                    quantity: 1,
                    unitPrice: (base as number) + comboExtra,
                    metadata: { isCombo: true },
                  });
                }}
                className="mx-6 mb-6 mt-2 bg-white/5 hover:bg-accent hover:text-black border border-white/10 text-white font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-widest"
              >
                + Con Papas
              </button>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedProductForVariant && (
          <ProductVariantModal
            product={selectedProductForVariant}
            onConfirm={handleVariantConfirm}
            onCancel={() => setSelectedProductForVariant(null)}
          />
        )}
        
        {showSizeSelectorForBuilder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-surface p-8 rounded-[2rem] border border-white/10 w-full max-w-sm">
              <h2 className="text-2xl font-black italic uppercase mb-6">Elige el Tamaño</h2>
              <div className="space-y-3">
                {['MD', 'GD', 'FM'].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setPizzaSizeForBuilder(sz as any);
                      setShowSizeSelectorForBuilder(false);
                      setShowPizzaBuilder(true);
                    }}
                    className="w-full p-6 text-xl font-bold rounded-2xl bg-white/5 border-2 border-white/5 hover:border-accent hover:bg-accent/10 transition-all text-left flex justify-between items-center"
                  >
                    {sz === 'MD' ? 'Mediana' : sz === 'GD' ? 'Grande' : 'Familiar'}
                    <span className="text-accent">{sz}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowSizeSelectorForBuilder(false)}
                className="w-full mt-6 py-4 font-bold text-zinc-500 underline"
              >
                Volver
              </button>
            </motion.div>
          </div>
        )}

        {showPizzaBuilder && (
          <PizzaBuilder 
            size={pizzaSizeForBuilder}
            onConfirm={handleHalfAndHalfConfirm} 
            onCancel={() => setShowPizzaBuilder(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
