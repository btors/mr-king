'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePOSStore, OrderType, ActiveOrder } from '../store/usePOSStore';
import { UtensilsCrossed, ShoppingBag, Bike, Plus, X, Clock, ChefHat } from 'lucide-react';

const statusColors = {
  AVAILABLE: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500',
  OCCUPIED: 'border-amber-500 bg-amber-500/20 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:bg-amber-500/30',
  RESERVED: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  OUT_OF_SERVICE: 'border-red-500/50 bg-red-500/10 text-red-400',
};

const statusLabels = {
  AVAILABLE: 'Libre',
  OCCUPIED: 'Ocupada',
  RESERVED: 'Reservada',
  OUT_OF_SERVICE: 'Fuera de Servicio',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PREPARING: 'Preparando',
  READY: 'Listo',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  PREPARING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  READY: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const TABS: { id: OrderType; label: string; Icon: React.FC<any> }[] = [
  { id: 'EAT_IN',    label: 'Restaurante',     Icon: UtensilsCrossed },
  { id: 'TAKE_AWAY', label: 'Para Llevar',      Icon: ShoppingBag },
  { id: 'DELIVERY',  label: 'Domicilio',        Icon: Bike },
];

// ── New Order Modal ──────────────────────────────────────────────────────────
interface NewOrderModalProps {
  channelLabel: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}
const NewOrderModal: React.FC<NewOrderModalProps> = ({ channelLabel, onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <header className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Nuevo Pedido</h2>
            <p className="text-zinc-400 font-medium text-sm">{channelLabel}</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition text-zinc-400">
            <X size={20} />
          </button>
        </header>
        <div className="p-8 space-y-4">
          <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2">Nombre del Cliente</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}
            placeholder="Ej. Carlos"
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white text-xl font-bold focus:border-accent outline-none transition-all placeholder:text-zinc-600"
          />
        </div>
        <footer className="p-8 border-t border-white/5 flex gap-4">
          <button onClick={onCancel} className="px-6 py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors">
            Cancelar
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => onConfirm(name.trim())}
            className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl
              ${!name.trim() ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-accent text-black hover:bg-accent-orange'}
            `}
          >
            Iniciar Pedido
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

// ── Active Orders list (for TAKE_AWAY / DELIVERY) ────────────────────────────
interface ChannelViewProps {
  orderType: OrderType;
  channelLabel: string;
}
const ChannelView: React.FC<ChannelViewProps> = ({ orderType, channelLabel }) => {
  const { activeOrders, fetchActiveOrders, startChannelOrder, loadOrderForEdit } = usePOSStore();
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => fetchActiveOrders(orderType), [orderType, fetchActiveOrders]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [load]);

  const handleNewOrder = (clientName: string) => {
    setShowModal(false);
    startChannelOrder(orderType, clientName);
    // MenuView will appear because selectedTable = null but orderType != EAT_IN and clientName set
    // We signal this via a synthetic "table" with id = 'channel'
  };

  const ordersForChannel = activeOrders.filter(o => o.orderType === orderType);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{channelLabel}</h2>
          <p className="text-zinc-500 font-medium text-sm">{ordersForChannel.length} orden(es) activas</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-accent-orange transition-colors shadow-lg"
        >
          <Plus size={20} />
          Nuevo Pedido
        </motion.button>
      </div>

      {/* Orders */}
      {ordersForChannel.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-700">
          <ShoppingBag size={64} strokeWidth={1} />
          <p className="font-bold italic uppercase tracking-widest text-lg">Sin órdenes activas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-12 custom-scrollbar">
          {ordersForChannel.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-zinc-900/80 border border-white/10 rounded-[2rem] p-6 flex flex-col gap-4 hover:border-white/20 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Cliente</p>
                  <h3 className="text-xl font-black text-white italic tracking-tighter">{order.clientName || '—'}</h3>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.PENDING}`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Clock size={12} />
                <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                <span className="ml-auto font-black text-white text-sm">${Number(order.total).toFixed(2)}</span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => loadOrderForEdit(order)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                >
                  <ChefHat size={14} />
                  Ver / Agregar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <NewOrderModal
            channelLabel={channelLabel}
            onConfirm={handleNewOrder}
            onCancel={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main TableView ────────────────────────────────────────────────────────────
export const TableView: React.FC = () => {
  const { selectTable, selectedTable, user, tables, fetchTables, logout, orderType, startChannelOrder, readyTables } = usePOSStore();
  const [activeTab, setActiveTab] = useState<OrderType>('EAT_IN');
  const [salonSubTab, setSalonSubTab] = useState<'TABLES' | 'BAR'>('TABLES');

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return (
    <div className="p-6 pt-16 h-full flex flex-col gap-6 overflow-hidden bg-black/20">

      {/* User badge — top right, always visible */}
      <div className="absolute top-4 right-6 z-10 flex items-center gap-3">
        <div className="flex items-center gap-3 bg-zinc-900/60 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/5">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Atiende</p>
            <p className="text-sm font-black text-white italic uppercase tracking-tight">
              {user?.role === 'ADMIN' ? 'ADMINISTRADOR' : user?.name}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-black text-base italic">
            {user?.role === 'ADMIN' ? 'A' : user?.name?.[0]}
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-all border border-white/5"
          title="Cerrar Sesión"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>

      {/* ── Channel Tabs ── */}
      <div className="flex items-center justify-between flex-none">
        <div className="flex items-center gap-2">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all border
                ${activeTab === id
                  ? 'bg-accent text-black border-accent shadow-lg shadow-accent/20'
                  : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'}
              `}
            >
              <Icon size={16} strokeWidth={2.5} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'EAT_IN' && (
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setSalonSubTab('TABLES')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${salonSubTab === 'TABLES' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Mesas
            </button>
            <button
              onClick={() => setSalonSubTab('BAR')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${salonSubTab === 'BAR' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Barra
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'EAT_IN' ? (
            <motion.div key="eat-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar">
              {salonSubTab === 'TABLES' ? (
                <>
                  <p className="text-zinc-500 font-medium mb-4 text-sm">Selecciona una mesa para gestionar la orden</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-12">
                    {tables.length === 0 ? (
                      <div className="col-span-full py-20 text-center text-zinc-600 font-bold italic animate-pulse uppercase tracking-[0.3em]">
                        Sincronizando Mesas...
                      </div>
                    ) : (
                      tables.filter(t => t.type === 'TABLE').map((table) => (
                        <motion.button
                          key={table.id}
                          whileHover={{ scale: 1.03, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (table.status === 'OUT_OF_SERVICE') return;
                            selectTable(table);
                          }}
                          className={`
                            relative h-48 rounded-[2.5rem] border-2 transition-all p-6 flex flex-col justify-between items-start text-left group
                            ${selectedTable?.id === table.id ? 'ring-4 ring-amber-500/50 ring-offset-4 ring-offset-black border-amber-500' : statusColors[table.status]}
                            ${table.status === 'OUT_OF_SERVICE' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <div className="flex justify-between w-full items-start">
                            <span className="text-4xl font-black italic tracking-tighter">Mesa {table.number}</span>
                            <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${table.status === 'AVAILABLE' ? 'bg-emerald-500' : table.status === 'OCCUPIED' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Estatus</p>
                            <p className="font-black text-lg italic uppercase tracking-tighter">{statusLabels[table.status]}</p>
                          </div>
                          {table.status === 'OCCUPIED' && (
                            <div className="absolute top-4 right-5 flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                              <span className="text-[9px] font-black font-mono text-amber-500">ACTIVA</span>
                            </div>
                          )}
                          {readyTables.includes(table.id) && (
                            <div className="absolute top-4 right-24 flex items-center justify-center bg-red-500 text-white rounded-full w-9 h-9 animate-bounce shadow-lg border border-white z-20">
                              <span className="text-sm">🛎️</span>
                            </div>
                          )}
                        </motion.button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-12 pb-20">
                  <div className="text-center">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">Área de Barra</h3>
                    <p className="text-zinc-500 font-medium">Selecciona un banco para abrir una cuenta directa</p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-12 flex-wrap max-w-5xl">
                    {tables.filter(t => t.type === 'STOOL').map((table) => {
                      const isSelected = selectedTable?.id === table.id;
                      
                      return (
                        <motion.button
                          key={table.id}
                          whileHover={{ y: -12, scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => selectTable(table)}
                          className={`
                            relative w-40 h-40 rounded-full border-[6px] flex flex-col items-center justify-center gap-1 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                            ${isSelected 
                              ? 'border-amber-500 bg-amber-500/30 scale-110 ring-[12px] ring-amber-500/20' 
                              : table.status === 'OCCUPIED'
                                ? 'border-amber-400 bg-amber-400 text-black'
                                : 'border-amber-500/30 bg-black/40 text-amber-500/80 hover:border-amber-500/60 hover:bg-amber-500/10'}
                          `}
                        >
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${table.status === 'OCCUPIED' ? 'text-black/60' : 'opacity-60'}`}>Banco</span>
                          <span className={`text-5xl font-black italic tracking-tighter ${table.status === 'OCCUPIED' ? 'text-black' : 'text-white'}`}>{table.number}</span>
                          {table.status === 'OCCUPIED' && (
                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full border-[6px] border-amber-400 flex items-center justify-center shadow-lg">
                              <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                            </div>
                          )}
                          {readyTables.includes(table.id) && (
                            <div className="absolute -top-4 -left-4 w-11 h-11 bg-red-500 rounded-full flex items-center justify-center animate-bounce shadow-lg border-2 border-white z-20">
                              <span className="text-lg">🛎️</span>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  <div className="w-full max-w-3xl h-6 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-full shadow-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
                  </div>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'TAKE_AWAY' ? (
            <motion.div key="take-away" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ChannelView orderType="TAKE_AWAY" channelLabel="Para Llevar" />
            </motion.div>
          ) : (
            <motion.div key="delivery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ChannelView orderType="DELIVERY" channelLabel="Servicio a Domicilio" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
