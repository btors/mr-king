'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePOSStore, CartItem } from '../store/usePOSStore';

export const CartView: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, calculateItemPrice, calculateTotal, clearCart, selectedTable, submitOrder } = usePOSStore();
  
  const handlePrint = () => {
    alert('Imprimiendo pre-cuenta...');
  };

  const handleFinalize = async () => {
    if (cart.length === 0) return;
    const success = await submitOrder();
    if (success) {
      alert('Orden enviada a cocina!');
    } else {
      alert('Error al enviar la orden.');
    }
  };

  return (
    <div className="w-[450px] bg-surface-alt border-l flex flex-col h-full shadow-2xl relative z-10">
      <header className="p-8 border-b border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Tu Pedido</h2>
          <span className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-accent/20">
            Mesa #{selectedTable?.number || '--'}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-4">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            <p className="font-bold text-center">El carrito está vacío.<br/>Agrega algo delicioso!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {cart.map((item) => (
              <motion.div
                key={item.tempId}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-surface p-4 rounded-2xl border border-white/5 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="max-w-[200px]">
                    <h4 className="font-bold text-white leading-tight italic">{item.name}</h4>
                    {item.metadata?.pizzaConfig?.isHalfAndHalf && (
                      <p className="text-[10px] text-accent font-bold uppercase mt-1 tracking-tighter">
                        Mitad: {item.metadata.pizzaConfig.halfA?.name} / {item.metadata.pizzaConfig.halfB?.name}
                      </p>
                    )}
                    {item.metadata?.flavor && (
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5 tracking-tighter">
                        Sabor: {item.metadata.flavor}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-accent">${calculateItemPrice(item).toFixed(0)}</span>
                    <p className="text-[10px] text-zinc-500 font-bold">.00</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 bg-black/20 rounded-xl p-1 border border-white/5">
                    <button 
                      onClick={() => updateQuantity(item.tempId, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.tempId, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-accent rounded-lg text-black hover:bg-accent-orange transition"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.tempId)}
                    className="p-2 text-zinc-600 hover:text-red-500 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <footer className="p-8 border-t border-white/5 bg-surface space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-zinc-500 font-medium">
            <span>Subtotal</span>
            <span>${(calculateTotal() / 1.16).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 font-medium border-b border-white/5 pb-2">
            <span>IVA (16%)</span>
            <span>${(calculateTotal() - (calculateTotal() / 1.16)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end pt-2">
            <span className="text-xl font-bold uppercase tracking-tighter">Total</span>
            <span className="text-4xl font-black text-accent">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2">
          <button 
            onClick={handlePrint}
            disabled={cart.length === 0}
            className="w-full py-4 rounded-2xl bg-zinc-800 text-zinc-300 font-bold hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir Pre-cuenta
          </button>
          <button 
            onClick={handleFinalize}
            disabled={cart.length === 0}
            className="w-full py-6 rounded-3xl bg-accent text-black font-black text-2xl hover:bg-accent-orange transition-all shadow-xl shadow-accent/10 disabled:opacity-50 disabled:grayscale tracking-tighter uppercase italic"
          >
            Finalizar Orden
          </button>
        </div>
      </footer>
    </div>
  );
};
