'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Plus, Trash2, Table as TableIcon } from 'lucide-react';

interface Table {
  id: string;
  number: number;
  capacity?: number;
  status: string;
  type: 'TABLE' | 'STOOL';
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  OCCUPIED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  RESERVED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  OUT_OF_SERVICE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Libre',
  OCCUPIED: 'Ocupada',
  RESERVED: 'Reservada',
  OUT_OF_SERVICE: 'Fuera de Servicio',
};

export default function TablesAdminPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newType, setNewType] = useState<'TABLE' | 'STOOL'>('TABLE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      const data = await api.get<Table[]>('/tables');
      setTables(data.sort((a, b) => a.number - b.number));
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const handleCreate = async () => {
    if (!newNumber || isNaN(Number(newNumber)) || Number(newNumber) <= 0) {
      alert('Ingresa un número de mesa válido.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/tables', {
        number: Number(newNumber),
        capacity: newCapacity ? Number(newCapacity) : undefined,
        type: newType,
      });
      setShowModal(false);
      setNewNumber('');
      setNewCapacity('');
      setNewType('TABLE');
      fetchTables();
    } catch (err: any) {
      alert(err?.message || 'Error al crear la mesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta mesa? Esta acción no puede deshacerse.')) return;
    try {
      await api.delete(`/tables/${id}`);
      fetchTables();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la mesa. Puede que tenga órdenes activas.');
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Salón / Mesas</h2>
          <p className="text-zinc-400 font-medium">Gestiona las mesas del restaurante.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-black font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-accent-orange transition-colors shadow-lg"
        >
          <Plus size={18} />
          Agregar Mesa
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((table, i) => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-zinc-900/80 border border-white/10 rounded-[2rem] p-6 flex flex-col gap-4 group hover:border-white/20 transition-colors relative"
          >
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                <TableIcon className="w-7 h-7 text-zinc-400" />
              </div>
              <button
                onClick={() => handleDelete(table.id)}
                className="opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 rounded-xl text-red-500 hover:bg-red-500/20 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div>
              <p className="text-4xl font-black italic tracking-tighter text-white">#{table.number}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">
                {table.type === 'STOOL' ? 'Banco de Barra' : 'Mesa de Comedor'}
              </p>
              {table.capacity && (
                <p className="text-[10px] text-zinc-600 font-bold">Capacidad: {table.capacity}</p>
              )}
            </div>

            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full border w-fit ${STATUS_COLORS[table.status] || STATUS_COLORS.AVAILABLE}`}>
              {STATUS_LABELS[table.status] || table.status}
            </span>
          </motion.div>
        ))}

        {tables.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-600 font-bold italic uppercase tracking-widest">
            No hay mesas registradas. Agrega una nueva.
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <header className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Nueva Mesa</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </header>

              <div className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2">Número de Mesa *</label>
                  <input
                    type="number"
                    min="1"
                    autoFocus
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="Ej. 7"
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white text-3xl font-black text-center focus:border-accent outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2">Tipo de Entidad</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewType('TABLE')}
                      className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${newType === 'TABLE' ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 bg-white/5 text-zinc-500'}`}
                    >
                      Mesa
                    </button>
                    <button
                      onClick={() => setNewType('STOOL')}
                      className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${newType === 'STOOL' ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 bg-white/5 text-zinc-500'}`}
                    >
                      Banco
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-2">Capacidad (Opcional)</label>
                  <input
                    type="number"
                    min="1"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    placeholder="Ej. 4"
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white text-lg font-medium focus:border-accent outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <footer className="p-8 border-t border-white/5 flex gap-4">
                <button onClick={() => setShowModal(false)} className="px-6 py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors">
                  Cancelar
                </button>
                <button
                  disabled={!newNumber || isSubmitting}
                  onClick={handleCreate}
                  className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl
                    ${!newNumber || isSubmitting ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-accent text-black hover:bg-accent-orange'}
                  `}
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Mesa'}
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
