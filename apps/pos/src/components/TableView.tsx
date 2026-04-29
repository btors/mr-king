'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePOSStore } from '../store/usePOSStore';

const statusColors = {
  AVAILABLE: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  OCCUPIED: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
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
  const { selectTable, selectedTable, user, tables, fetchTables } = usePOSStore();

  React.useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return (
    <div className="p-8 h-full flex flex-col gap-8 overflow-y-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Mapa de Mesas</h2>
          <p className="text-zinc-400">Selecciona una mesa para comenzar el pedido</p>
        </div>
        <div className="flex items-center gap-4 bg-surface rounded-2xl px-6 py-3 border">
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Mesero</p>
            <p className="text-sm font-semibold">{user?.name}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center font-bold text-black">
            {user?.name?.[0]}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {tables.length === 0 ? (
          <div className="col-span-full py-20 text-center text-zinc-500 font-bold italic animate-pulse">
            Sincronizando Mesas...
          </div>
        ) : (
          tables.map((table) => (
            <motion.button
              key={table.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => table.status !== 'OUT_OF_SERVICE' && selectTable(table)}
              className={`
                relative h-48 rounded-3xl border-2 transition-all p-6 flex flex-col justify-between items-start text-left
                ${selectedTable?.id === table.id ? 'ring-4 ring-accent ring-offset-4 ring-offset-background border-accent' : statusColors[table.status]}
                ${table.status === 'OUT_OF_SERVICE' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex justify-between w-full items-start">
                <span className="text-4xl font-black">#{table.number}</span>
                <div className={`w-3 h-3 rounded-full animate-pulse ${table.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Estatus</p>
                <p className="font-bold text-lg">{statusLabels[table.status]}</p>
              </div>

              {table.status === 'OCCUPIED' && (
                <div className="absolute top-4 right-6 text-xs bg-black/20 px-2 py-1 rounded-md font-mono">
                  45:20 min
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};
