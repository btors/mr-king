'use client';

import React, { useEffect } from 'react';
import { useKdsStore } from '../store/useKdsStore';
import { OrderCard } from './OrderCard';
import { AnimatePresence, motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

export const KdsBoard: React.FC = () => {
  const { orders, connect, disconnect, fetchOrders, isLoading, isConnected, isAudioEnabled, toggleAudio } = useKdsStore();

  useEffect(() => {
    connect();
    fetchOrders();
    return () => disconnect();
  }, [connect, disconnect, fetchOrders]);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] overflow-hidden p-8 gap-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
            MR-KING <span className="text-blue-500">KITCHEN</span>
          </h1>
          <div className="flex items-center gap-2 mt-3 ml-1">
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              Kitchen Display System • Station 01
            </p>
            <div className="w-px h-2 bg-white/10 mx-1" />
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}>
                {isConnected ? 'Sistema Conectado' : 'Sin Conexión'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={toggleAudio}
            className={`
              flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border transition-all duration-300
              ${isAudioEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}
            `}
          >
            {isAudioEnabled ? (
              <>
                <Volume2 size={24} className="animate-pulse" />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Alertas</p>
                  <p className="text-sm font-black italic uppercase tracking-tighter leading-none">Activas</p>
                </div>
              </>
            ) : (
              <>
                <VolumeX size={24} />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Audio</p>
                  <p className="text-sm font-black italic uppercase tracking-tighter leading-none">Bloqueado</p>
                </div>
              </>
            )}
          </button>

          <div className="bg-zinc-900/50 border border-white/5 rounded-[1.5rem] px-8 py-4 flex flex-col items-center justify-center min-w-[120px]">
            <span className="text-3xl font-black text-white italic">{orders.length}</span>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Órdenes</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem] px-8 py-4 flex flex-col items-center justify-center min-w-[120px]">
            <span className="text-3xl font-black text-blue-500 italic">{preparingOrders.length}</span>
            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">Activas</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-hidden">
        {/* PENDING COLUMN */}
        <section className="flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-4 bg-zinc-800/20 border border-white/10 rounded-[1.5rem]">
            <div className="w-3 h-3 bg-zinc-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(113,113,122,0.5)]" />
            <h2 className="text-2xl font-black text-zinc-300 italic uppercase tracking-tighter">Pendientes</h2>
            <span className="ml-auto bg-zinc-800/50 text-zinc-400 px-3 py-1 rounded-xl text-sm font-black">
              {pendingOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-12 pr-2">
            <AnimatePresence mode="popLayout">
              {pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </AnimatePresence>
            {pendingOrders.length === 0 && (
              <div className="h-40 border-2 border-dashed border-white/5 rounded-[2rem] flex items-center justify-center">
                <p className="text-zinc-700 font-bold uppercase tracking-widest text-xs">Sin pendientes</p>
              </div>
            )}
          </div>
        </section>

        {/* PREPARING COLUMN */}
        <section className="flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-4 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem]">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
            <h2 className="text-2xl font-black text-amber-500 italic uppercase tracking-tighter">Preparando</h2>
            <span className="ml-auto bg-amber-500/20 text-amber-500 px-3 py-1 rounded-xl text-sm font-black">
              {preparingOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-12 pr-2">
            <AnimatePresence mode="popLayout">
              {preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </AnimatePresence>
            {preparingOrders.length === 0 && (
              <div className="h-40 border-2 border-dashed border-white/5 rounded-[2rem] flex items-center justify-center">
                <p className="text-zinc-700 font-bold uppercase tracking-widest text-xs">Sin preparación activa</p>
              </div>
            )}
          </div>
        </section>

        {/* READY COLUMN */}
        <section className="flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem]">
            <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <h2 className="text-2xl font-black text-emerald-500 italic uppercase tracking-tighter">Listos</h2>
            <span className="ml-auto bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-xl text-sm font-black">
              {readyOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-12 pr-2">
            <AnimatePresence mode="popLayout">
              {readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </AnimatePresence>
            {readyOrders.length === 0 && (
              <div className="h-40 border-2 border-dashed border-white/5 rounded-[2rem] flex items-center justify-center">
                <p className="text-zinc-700 font-bold uppercase tracking-widest text-xs">Nada listo aún</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
