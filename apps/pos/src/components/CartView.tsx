'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePOSStore, CartItem } from '../store/usePOSStore';

export const CartView: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, updateNotes, calculateItemPrice, calculateTotal, clearCart, selectedTable, submitOrder, payTable, clearDrafts, isSubmitting, clientName, orderType, payChannelOrder, activeOrders } = usePOSStore();
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [showDraftWarning, setShowDraftWarning] = React.useState(false);
  
  const handlePrint = () => {
    if (isSubmitting) return;
    alert('Imprimiendo pre-cuenta...');
  };

  const handleFinalize = async () => {
    if (cart.length === 0 || isSubmitting) return;
    const success = await submitOrder();
    if (success) {
      // Logic handled by store (offline or sent)
    } else {
      alert('Error al enviar la orden.');
    }
  };

  const handleCerrarCuentaClick = () => {
    if (isSubmitting) return;
    const draftCount = cart.filter(i => i.status === 'DRAFT').length;
    if (draftCount > 0) {
      setShowDraftWarning(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleEnviarYCobrar = async () => {
    if (isSubmitting) return;
    const success = await submitOrder();
    if (success) {
      setShowDraftWarning(false);
      setShowPaymentModal(true);
    }
  };

  const handleDescartarYCobrar = () => {
    if (isSubmitting) return;
    clearDrafts();
    setShowDraftWarning(false);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (isSubmitting) return;
    // Table-based payment
    if (selectedTable) {
      const success = await payTable(selectedTable.id);
      if (success) setShowPaymentModal(false);
      return;
    }
    // Channel order payment – find the matching active order
    const activeOrder = activeOrders.find(o => o.orderType === orderType && o.clientName === clientName);
    if (activeOrder) {
      const success = await payChannelOrder(activeOrder.id);
      if (success) setShowPaymentModal(false);
    } else {
      // No prior order – just clear and return
      clearCart();
      setShowPaymentModal(false);
    }
  };

  const draftItems = cart.filter(i => i.status === 'DRAFT');
  const draftCount = draftItems.length;
  const total = calculateTotal();

  return (
    <div className="w-[450px] bg-zinc-900 border-l border-white/5 flex flex-col h-full shadow-2xl relative z-10">
      <header className="p-8 border-b border-white/5 space-y-4 bg-black/20">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Tu Pedido</h2>
          {selectedTable ? (
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${selectedTable?.status === 'OCCUPIED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
              {selectedTable.type === 'STOOL' ? `Banco #${selectedTable.number}` : `Mesa #${selectedTable.number}`}
            </span>
          ) : clientName ? (
            <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border bg-accent/10 text-accent border-accent/20">
              {orderType === 'DELIVERY' ? '🛵' : '🛍️'} {clientName}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-4">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            <p className="font-bold text-center italic uppercase tracking-widest text-sm leading-relaxed">El carrito está vacío.<br/>Agrega algo delicioso!</p>
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
                className={`p-5 rounded-[1.8rem] border space-y-3 group transition-all ${
                  item.status === 'SENT' 
                    ? 'bg-zinc-900/40 border-white/5 opacity-80 scale-[0.98]' 
                    : 'bg-white/5 border-white/5 hover:border-amber-500/20'
                  }`}
                >
                  {(() => {
                    const product = usePOSStore.getState().products.find(p => p.id === item.productId);
                    const category = usePOSStore.getState().categories.find(c => c.id === product?.categoryId);
                    const isWaiterBar = category?.preparationPlace === 'WAITER_BAR';

                    return isWaiterBar && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">⚡ Despacho Directo</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between items-start">
                  <div className="max-w-[200px]">
                    <h4 className={`font-black leading-tight italic uppercase tracking-tight ${item.status === 'SENT' ? 'text-zinc-500' : 'text-white'}`}>{item.name}</h4>
                    {item.status === 'SENT' && (
                      <p className="text-[9px] text-blue-400 font-black uppercase mt-1 tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                        En Cocina
                      </p>
                    )}
                    {item.metadata?.isHalfAndHalf && (
                      <p className="text-[9px] text-amber-500 font-black uppercase mt-1 tracking-widest">
                        🌓 Mitad y Mitad
                      </p>
                    )}
                    {item.metadata?.isCombo && (
                      <p className="text-[9px] text-emerald-500 font-black uppercase mt-1 tracking-widest">
                        🍟 Con Papas
                      </p>
                    )}
                    {item.metadata?.variantName && !item.metadata?.isHalfAndHalf && (
                      <p className="text-[9px] text-zinc-500 font-black uppercase mt-1 tracking-widest">
                        🔹 {item.metadata.variantName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`font-black text-lg italic ${item.status === 'SENT' ? 'text-zinc-600' : 'text-amber-500'}`}>
                      ${calculateItemPrice(item).toFixed(0)}
                    </span>
                  </div>
                </div>

                {item.status === 'DRAFT' ? (
                  <>
                    <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-3 bg-black/40 rounded-2xl p-1.5 border border-white/5">
                        <button 
                          onClick={() => updateQuantity(item.tempId, item.quantity - 1)}
                          disabled={isSubmitting}
                          className="w-11 h-11 flex items-center justify-center bg-zinc-800 rounded-xl text-white hover:bg-zinc-700 transition active:scale-90 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-white italic">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.tempId, item.quantity + 1)}
                          disabled={isSubmitting}
                          className="w-11 h-11 flex items-center justify-center bg-amber-500 rounded-xl text-black hover:bg-amber-400 transition active:scale-90 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.tempId)}
                        disabled={isSubmitting}
                        className="p-4 text-zinc-600 hover:text-red-500 transition hover:bg-red-500/10 rounded-xl disabled:opacity-50"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Instrucciones especiales..."
                        value={item.notes || ''}
                        disabled={isSubmitting}
                        onChange={(e) => updateNotes(item.tempId, e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/30 transition-all font-bold italic uppercase tracking-tighter"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col mt-2 pt-3 border-t border-white/5 space-y-2">
                    {item.notes && (
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                        <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">Nota: {item.notes}</p>
                      </div>
                    )}
                    <div className="flex justify-end opacity-40">
                      <span className="text-[10px] font-black uppercase italic text-zinc-600 tracking-widest">Pedido Confirmado</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <footer className="p-8 border-t border-white/5 bg-black/40 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
            <span>Subtotal</span>
            <span>${(total / 1.16).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 font-bold uppercase tracking-widest text-[10px] pb-3 border-b border-white/5">
            <span>IVA (16%)</span>
            <span>${(total - (total / 1.16)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end pt-2">
            <span className="text-xl font-black italic uppercase tracking-tighter text-zinc-400">Total</span>
            <div className="text-right">
              <span className="text-sm font-black text-amber-500/50 mr-1">$</span>
              <span className="text-5xl font-black text-amber-500 italic tracking-tighter">{total.toFixed(0)}</span>
              <span className="text-sm font-black text-amber-500/50 ml-1">.00</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-2">
          {(selectedTable?.status === 'OCCUPIED' || (clientName && cart.some(i => i.status === 'SENT'))) && (
            <motion.button 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1.02, opacity: 1 }}
              onClick={handleCerrarCuentaClick}
              disabled={isSubmitting}
              className={`w-full py-7 rounded-[2rem] bg-emerald-600 text-white font-black text-2xl hover:bg-emerald-500 transition-all shadow-xl tracking-tighter uppercase italic flex items-center justify-center gap-3 active:scale-95 border-b-4 border-emerald-800 disabled:opacity-50 disabled:grayscale ${
                draftCount === 0 
                  ? 'ring-4 ring-emerald-500/30 shadow-emerald-500/20' 
                  : 'opacity-90 grayscale-[0.3]'
              }`}
            >
              {isSubmitting ? (
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-3xl">💳</span>
                  Cerrar Cuenta
                </>
              )}
            </motion.button>
          )}
          
          <button 
            onClick={handleFinalize}
            disabled={draftCount === 0 || isSubmitting}
            className="w-full py-7 rounded-[2rem] bg-amber-500 text-black font-black text-2xl hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10 disabled:opacity-20 disabled:grayscale tracking-tighter uppercase italic active:scale-95 border-b-4 border-amber-700 overflow-hidden relative"
          >
            {isSubmitting ? (
              <div className="w-8 h-8 border-4 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
            ) : (
              <AnimatePresence mode="wait">
                <motion.span
                  key={draftCount}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="block"
                >
                  {draftCount > 0 ? `SOLICITAR ${draftCount} PEDIDO${draftCount > 1 ? 'S' : ''}` : 'ENVIAR A COCINA'}
                </motion.span>
              </AnimatePresence>
            )}
          </button>
          
          <button 
            onClick={handlePrint}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full py-5 rounded-2xl bg-zinc-800/50 text-zinc-500 font-bold hover:bg-zinc-800 hover:text-white transition disabled:opacity-30 flex items-center justify-center gap-3 text-xs uppercase tracking-widest border border-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir Ticket
          </button>
        </div>
      </footer>

      {/* ── DRAFT WARNING MODAL ── */}
      <AnimatePresence>
        {showDraftWarning && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-amber-500/30 p-12 rounded-[3.5rem] w-full max-w-xl text-center shadow-3xl shadow-amber-500/5"
            >
              <div className="w-24 h-24 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 animate-pulse">
                ⚠️
              </div>
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Productos Pendientes</h2>
              <p className="text-zinc-400 font-medium mb-10 text-lg leading-relaxed px-6">
                Tienes productos sin enviar a cocina en este pedido.<br/>¿Qué deseas hacer antes de cobrar?
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={handleEnviarYCobrar}
                  className="py-6 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
                >
                  <span>🍳</span> Enviar y Cobrar
                </button>
                <button 
                  onClick={handleDescartarYCobrar}
                  className="py-6 rounded-2xl bg-zinc-800 text-red-500 font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
                >
                  <span>🗑️</span> Descartar y Cobrar
                </button>
                <button 
                  onClick={() => setShowDraftWarning(false)}
                  className="py-4 rounded-2xl bg-transparent text-zinc-500 font-bold uppercase tracking-widest hover:text-white transition-all"
                >
                  Regresar a la Orden
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PAYMENT CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-lg text-center shadow-2xl"
            >
              <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-2xl shadow-emerald-500/10">
                💳
              </div>
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                {selectedTable ? `Cobrar Mesa #${selectedTable.number}` : `Cobrar — ${clientName}`}
              </h2>
              <p className="text-zinc-500 font-medium mb-10 text-lg">¿Confirmas la recepción del pago y el cierre de la cuenta?</p>
              
              <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 mb-10">
                <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Total a Pagar</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl font-black text-emerald-500 italic">$</span>
                  <span className="text-7xl font-black text-emerald-500 italic tracking-tighter">{total.toFixed(0)}</span>
                  <span className="text-2xl font-black text-emerald-500 italic">.00</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="py-5 rounded-2xl bg-zinc-800 text-white font-black uppercase tracking-widest hover:bg-zinc-700 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handlePayment}
                  className="py-5 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                >
                  Confirmar Pago
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
