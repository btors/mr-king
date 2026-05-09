'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Order, useKdsStore } from '../store/useKdsStore';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const updateOrderStatus = useKdsStore((state) => state.updateOrderStatus);
  const [isFlashing, setIsFlashing] = React.useState(() => {
    // Flash if order was created less than 10 seconds ago (to account for network latency)
    const diff = Date.now() - new Date(order.createdAt).getTime();
    return diff < 10000; 
  });

  React.useEffect(() => {
    if (isFlashing) {
      const timer = setTimeout(() => setIsFlashing(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isFlashing]);

  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrintKitchen = async () => {
    try {
      setIsPrinting(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      await fetch(`${API_BASE_URL}/orders/${order.id}/print-kitchen`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error sending to printer:', error);
    } finally {
      setTimeout(() => setIsPrinting(false), 2000);
    }
  };

  const renderMetadata = (item: any) => {
    const config = item.pizzaConfig || item.config || {};
    const metadataElements: React.ReactNode[] = [];

    // Soporte para porciones y desgloses de alitas / boneless
    if (config.portionSize) {
      metadataElements.push(
        <span key="portion" className="text-blue-400 font-black mr-2">[{config.portionSize}]</span>
      );
    }
    if (config.flavors && Array.isArray(config.flavors)) {
      config.flavors.forEach((f: any, idx: number) => {
        metadataElements.push(
          <div key={`wing-flavor-${idx}`} className="text-blue-500 font-black italic mt-0.5 uppercase text-xs">
            ↳ {f.pieces} PZ {f.name}
          </div>
        );
      });
    }

    // Size Rendering (Very important for Chef)
    if (config.size) {
      metadataElements.push(
        <span key="size" className="text-blue-400 font-black mr-2">[{config.size}]</span>
      );
    }

    // Half & Half Logic
    if (config.isHalfAndHalf) {
      metadataElements.push(
        <div key="halves" className="text-blue-500 font-black italic mt-1 uppercase text-sm">
          ↳ MITAD A: {config.halfA?.product?.name || config.halfAId || 'Sabor A'} <br/>
          ↳ MITAD B: {config.halfB?.product?.name || config.halfBId || 'Sabor B'}
        </div>
      );
    }

    // Flavors / Variants (Wings/Snacks)
    if (config.variants && Array.isArray(config.variants)) {
      config.variants.forEach((v: any, idx: number) => {
        metadataElements.push(
          <div key={`variant-${idx}`} className="text-blue-500 font-black italic mt-0.5 uppercase text-xs">
            ↳ SABOR: {v.name || v}
          </div>
        );
      });
    }

    // Single Flavor
    if (!config.isHalfAndHalf && config.flavor) {
      metadataElements.push(
        <div key="flavor" className="text-blue-500 font-black italic mt-0.5 uppercase text-xs">
          ↳ SABOR: {config.flavor}
        </div>
      );
    }

    // Sauces
    if (config.sauces && Array.isArray(config.sauces)) {
      metadataElements.push(
        <div key="sauces" className="text-blue-500 font-black italic mt-0.5 uppercase text-xs">
          ↳ SALSAS: {config.sauces.join(', ')}
        </div>
      );
    }

    // Combo
    if (config.isCombo) {
      metadataElements.push(
        <div key="combo" className="text-emerald-500 font-black italic mt-1 uppercase text-xs">
          ↳ 🔥 CON PAPAS
        </div>
      );
    }

    return metadataElements;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        borderColor: isFlashing ? ['#fbbf24', '#78350f', '#fbbf24'] : 'rgba(255, 255, 255, 0.1)',
        borderWidth: isFlashing ? 4 : 1,
        boxShadow: isFlashing ? '0 0 40px rgba(251, 191, 36, 0.3)' : '0 20px 50px rgba(0,0,0,0.5)'
      }}
      transition={{
        borderColor: isFlashing ? { repeat: Infinity, duration: 0.8 } : { duration: 0.3 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 }
      }}
      className="bg-zinc-900 rounded-[2rem] flex flex-col gap-0 min-h-[300px] overflow-hidden transition-colors"
    >
      {/* ── OMNICHANNEL BANNER ── */}
      {order.orderType === 'TAKE_AWAY' && (
        <div className="bg-orange-500 px-6 py-3 flex items-center gap-3">
          <span className="text-3xl">🛍️</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-900">Para Llevar — Empacar en Caja</p>
            <p className="text-xl font-black uppercase tracking-tighter text-white leading-tight">{order.clientName || 'Cliente'}</p>
          </div>
        </div>
      )}
      {order.orderType === 'DELIVERY' && (
        <div className="bg-violet-600 px-6 py-3 flex items-center gap-3">
          <span className="text-3xl">🛵</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-200">Domicilio — Empacar + Cubiertos</p>
            <p className="text-xl font-black uppercase tracking-tighter text-white leading-tight">{order.clientName || 'Cliente'}</p>
          </div>
        </div>
      )}

      <div className="p-6 flex flex-col gap-4 flex-1">
      <div className="flex justify-between items-start border-b border-white/5 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
            {order.orderType === 'TAKE_AWAY' || order.orderType === 'DELIVERY'
              ? order.clientName || 'Sin Nombre'
              : order.table?.type === 'STOOL' 
                ? `Banco ${order.table.number}` 
                : `Mesa ${order.table?.number || '?'}`}
          </h3>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            #{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintKitchen}
            disabled={isPrinting}
            title="Reimprimir en Cocina"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 active:scale-75 shadow-lg ${
              isPrinting 
                ? 'bg-blue-600 text-white rotate-[360deg]' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-blue-600 hover:text-white hover:shadow-blue-500/30'
            }`}
          >
            <span className={`text-xs transition-transform ${isPrinting ? 'animate-pulse' : ''}`}>🖨️</span>
          </button>

          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest 
            ${order.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
              order.status === 'PREPARING' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
              'bg-green-500/10 text-green-500 border border-green-500/20'}`}
          >
            {order.status === 'PENDING' ? 'Pendiente' : 
             order.status === 'PREPARING' ? 'Cocinando' : 'Listo'}
          </div>
        </div>
      </div>

      <div className="space-y-6 flex-1 py-2">
        {order.items.map((item) => {
          const isExtra = new Date((item as any).createdAt).getTime() - new Date(order.createdAt).getTime() > 15000;
          return (
            <div key={item.id} className="relative pl-4 border-l-4 border-amber-500/30">
              <p className="text-2xl font-black text-white leading-none mb-2 uppercase tracking-tighter flex items-center gap-2 flex-wrap">
                <span>{item.quantity}x {item.product.name}</span>
                {isExtra && (
                  <span className="inline-flex items-center px-3 py-1 rounded-xl bg-orange-500 text-black text-[10px] font-black tracking-widest uppercase animate-pulse align-middle">
                    ⚡ EXTRA
                  </span>
                )}
              </p>
            
            {/* Detailed Metadata in Blue */}
            <div className="space-y-0.5">
              {renderMetadata(item)}
            </div>
 
            {/* Special Notes (THE WAITRESS SHOUT) - High Contrast Red Box */}
            {item.notes && (
              <div className="mt-4 bg-red-600 p-4 rounded-2xl border-2 border-white/20 shadow-lg animate-pulse">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Nota Especial:</p>
                <p className="text-xl font-black text-white uppercase tracking-tight leading-tight">
                  {item.notes}
                </p>
              </div>
            )}
          </div>
        );
      })}
      </div>

      <div className="grid grid-cols-1 gap-3 pt-4">
        {order.status === 'PENDING' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
            className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-tighter rounded-2xl transition-all active:scale-95 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 text-lg"
          >
            <span className="text-2xl">🔥</span>
            Comenzar Preparación
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'READY')}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-tighter rounded-2xl transition-all active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 text-lg"
          >
            <span className="text-2xl">✅</span>
            ¡Orden Lista!
          </button>
        )}
        {order.status === 'READY' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'SERVED')}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase tracking-tighter rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Entregado / Archivar
          </button>
        )}
      </div>
      </div>  {/* close inner p-6 div */}
    </motion.div>
  );
};
