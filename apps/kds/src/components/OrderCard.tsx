'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Order, useKdsStore } from '../store/useKdsStore';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const updateOrderStatus = useKdsStore((state) => state.updateOrderStatus);

  const formatMetadata = (item: any) => {
    const parts: string[] = [];
    const config = item.pizzaConfig || {};
    
    if (config.isHalfAndHalf) {
      parts.push(`Mitad A: ${config.halfAId || 'Sabor A'} | Mitad B: ${config.halfBId || 'Sabor B'}`);
    }
    if (config.size) {
      parts.push(`Tamaño: ${config.size}`);
    }
    if (config.sauces && Array.isArray(config.sauces)) {
      parts.push(`Salsas: ${config.sauces.join(', ')}`);
    }
    if (config.isCombo) {
      parts.push('CON PAPAS');
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-900 border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 min-h-[300px]"
    >
      <div className="flex justify-between items-start border-b border-white/5 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
            Mesa {order.table?.number || 'Llevar'}
          </h3>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            #{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest 
          ${order.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
            order.status === 'PREPARING' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
            'bg-green-500/10 text-green-500 border border-green-500/20'}`}
        >
          {order.status === 'PENDING' ? 'Pendiente' : 
           order.status === 'PREPARING' ? 'Cocinando' : 'Listo'}
        </div>
      </div>

      <div className="space-y-6 flex-1 py-2">
        {order.items.map((item) => (
          <div key={item.id} className="relative pl-4 border-l-4 border-blue-500/30">
            <p className="text-xl font-black text-blue-400 leading-none mb-1">
              {item.quantity}x {item.product.name}
            </p>
            
            {/* Variants/Metadata in Blue */}
            {formatMetadata(item) && (
              <p className="text-sm font-bold text-blue-500/80 italic mt-2 tracking-tight">
                {formatMetadata(item)}
              </p>
            )}

            {/* Special Notes in Red */}
            {item.notes && (
              <p className="text-sm font-black text-red-500 mt-2 uppercase tracking-tighter bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 inline-block">
                ⚠️ {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 pt-4">
        {order.status === 'PENDING' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-tighter rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Comenzar Cocina
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'READY')}
            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-tighter rounded-2xl transition-all active:scale-95 shadow-lg shadow-green-600/25 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            ¡Orden Lista!
          </button>
        )}
        {order.status === 'READY' && (
          <button
            onClick={() => updateOrderStatus(order.id, 'SERVED')}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase tracking-tighter rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Archivar Ticket
          </button>
        )}
      </div>
    </motion.div>
  );
};
