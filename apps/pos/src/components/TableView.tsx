'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePOSStore } from '../store/usePOSStore';

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

export const TableView: React.FC = () => {
  const { selectTable, selectedTable, user, tables, fetchTables, loadTableBill, logout } = usePOSStore();

  React.useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return (
    <div className="p-8 h-full flex flex-col gap-8 overflow-y-auto bg-black/20">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button
            onClick={logout}
            className="p-4 rounded-2xl bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-all border border-white/5 group"
            title="Cerrar Sesión"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Mapa de Mesas</h2>
            <p className="text-zinc-500 font-medium">Selecciona una mesa para gestionar la orden</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/50 rounded-3xl px-6 py-4 border border-white/5">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Atendiendo</p>
            <p className="text-sm font-black text-white italic uppercase tracking-tight">{user?.name}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-black text-xl italic">
            {user?.name?.[0]}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {tables.length === 0 ? (
          <div className="col-span-full py-20 text-center text-zinc-500 font-bold italic animate-pulse uppercase tracking-[0.3em]">
            Sincronizando Mesas...
          </div>
        ) : (
          tables.map((table) => (
            <motion.button
              key={table.id}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (table.status === 'OUT_OF_SERVICE') return;
                selectTable(table);
              }}
              className={`
                relative h-52 rounded-[2.5rem] border-2 transition-all p-8 flex flex-col justify-between items-start text-left group
                ${selectedTable?.id === table.id ? 'ring-4 ring-amber-500/50 ring-offset-4 ring-offset-black border-amber-500' : statusColors[table.status]}
                ${table.status === 'OUT_OF_SERVICE' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex justify-between w-full items-start">
                <span className="text-5xl font-black italic tracking-tighter">#{table.number}</span>
                <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${table.status === 'AVAILABLE' ? 'bg-emerald-500' : table.status === 'OCCUPIED' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
              </div>
              
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Estatus</p>
                <p className="font-black text-xl italic uppercase tracking-tighter">{statusLabels[table.status]}</p>
              </div>

              {table.status === 'OCCUPIED' && (
                <div className="absolute top-6 right-8 flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black font-mono text-amber-500">CONSUMIENDO</span>
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};
