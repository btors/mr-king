'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Plus, Edit2, Shield, User as UserIcon } from 'lucide-react';

interface User {
  id: string;
  name: string;
  pin: string;
  role: 'ADMIN' | 'WAITER' | 'KITCHEN';
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'WAITER'>('WAITER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setPin('');
    setRole('WAITER');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setPin(user.pin || '');
    setRole(user.role as 'ADMIN' | 'WAITER');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || pin.length !== 4 || isNaN(Number(pin))) {
      alert('El nombre es obligatorio y el PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { name, pin, role, username: pin, password: pin };
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      alert(err.response?.data?.message || 'Error al guardar el usuario.');
    } finally {
      setIsSubmitting(false);
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
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Personal</h2>
          <p className="text-zinc-400 font-medium">Gestiona accesos y roles del sistema.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-black font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-accent-orange transition-colors shadow-lg"
        >
          <Plus size={18} />
          Añadir Usuario
        </button>
      </header>

      <div className="grid gap-4">
        {users.map(user => (
          <div key={user.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${user.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                {user.role === 'ADMIN' ? <Shield size={24} /> : <UserIcon size={24} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{user.name}</h3>
                <p className="text-sm font-bold uppercase tracking-widest mt-1 text-zinc-500">
                  {user.role === 'ADMIN' ? 'Administrador' : 'Mesero'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => openEditModal(user)}
              className="p-3 bg-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Edit2 size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <header className="p-8 border-b border-white/5 bg-surface-alt/50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                    {editingUser ? 'Editar Personal' : 'Nuevo Personal'}
                  </h2>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition text-zinc-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </header>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-2">Nombre Completo</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white text-lg font-medium focus:border-accent outline-none transition-all placeholder:text-zinc-600"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-2">PIN de Acceso (4 Dígitos)</label>
                  <input 
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPin(val);
                    }}
                    placeholder="••••"
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white text-3xl font-black tracking-widest text-center focus:border-accent outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-2">Nivel de Acceso</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setRole('WAITER')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                        role === 'WAITER' ? 'border-accent bg-accent/10 text-accent' : 'border-white/5 bg-white/5 text-zinc-500 hover:border-white/20'
                      }`}
                    >
                      <UserIcon size={24} />
                      <span className="font-bold uppercase text-xs tracking-widest">Mesero</span>
                    </button>
                    <button
                      onClick={() => setRole('ADMIN')}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                        role === 'ADMIN' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-white/5 text-zinc-500 hover:border-white/20'
                      }`}
                    >
                      <Shield size={24} />
                      <span className="font-bold uppercase text-xs tracking-widest">Admin</span>
                    </button>
                  </div>
                </div>
              </div>

              <footer className="p-8 border-t border-white/5 bg-surface-alt/50 flex gap-4">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!name.trim() || pin.length !== 4 || isSubmitting}
                  onClick={handleSave}
                  className={`flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl
                    ${!name.trim() || pin.length !== 4 || isSubmitting ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-accent text-black hover:bg-accent-orange'}
                  `}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
