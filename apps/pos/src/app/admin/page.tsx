'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, Vault, Armchair, ChefHat } from 'lucide-react';

interface DashboardMetrics {
  ventas: number;
  egresos: number;
  esperado: number;
  mesasOcupadas: number;
  ordenesPendientes: number;
}

const DEFAULT_METRICS: DashboardMetrics = {
  ventas: 0,
  egresos: 0,
  esperado: 0,
  mesasOcupadas: 0,
  ordenesPendientes: 0
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(DEFAULT_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchMetrics = async () => {
    try {
      const data = await api.get<DashboardMetrics>('/dashboard/metrics');
      if (data) {
        setMetrics({
          ventas: Number(data.ventas) || 0,
          egresos: Number(data.egresos) || 0,
          esperado: Number(data.esperado) || 0,
          mesasOcupadas: Number(data.mesasOcupadas) || 0,
          ordenesPendientes: Number(data.ordenesPendientes) || 0
        });
      }
      setError(false);
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // 10s polling
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(val);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8">
      <header className="mb-10">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">Resumen del Turno</h2>
        <p className="text-zinc-400 font-medium flex items-center gap-2 mt-2">
          Métricas en tiempo real 
          {isLoading ? (
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          ) : (
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`} />
          )}
        </p>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Ventas del Turno */}
        <motion.div variants={itemVariants} className="bg-green-500/10 border border-green-500/20 rounded-[2rem] p-8 relative overflow-hidden group hover:border-green-500/40 transition-colors">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-green-500/20 rounded-full blur-3xl group-hover:bg-green-500/30 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/20 rounded-2xl text-green-400">
              <TrendingUp strokeWidth={2.5} size={28} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-green-500/80">Ventas del Turno</h3>
          </div>
          <p className="text-5xl font-black text-green-400 italic tracking-tighter drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
            {formatCurrency(metrics.ventas)}
          </p>
        </motion.div>

        {/* Egresos */}
        <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 relative overflow-hidden group hover:border-red-500/40 transition-colors">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-500/20 rounded-full blur-3xl group-hover:bg-red-500/30 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-500/20 rounded-2xl text-red-400">
              <TrendingDown strokeWidth={2.5} size={28} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-red-500/80">Egresos</h3>
          </div>
          <p className="text-5xl font-black text-red-400 italic tracking-tighter drop-shadow-[0_0_15px_rgba(248,113,113,0.3)]">
            {formatCurrency(metrics.egresos)}
          </p>
        </motion.div>

        {/* Esperado en Caja */}
        <motion.div variants={itemVariants} className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-8 relative overflow-hidden group hover:border-amber-500/40 transition-colors lg:col-span-1 md:col-span-2">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400">
              <Vault strokeWidth={2.5} size={28} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500/80">Efectivo Esperado</h3>
          </div>
          <p className="text-5xl font-black text-amber-400 italic tracking-tighter drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            {formatCurrency(metrics.esperado)}
          </p>
        </motion.div>

        {/* Mesas Ocupadas */}
        <motion.div variants={itemVariants} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/20 transition-colors">
          <AnimatePresence>
            {metrics.mesasOcupadas > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute right-8 top-8 w-8 h-8 bg-amber-500 rounded-full blur-xl"
              />
            )}
          </AnimatePresence>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className={`p-3 rounded-2xl ${metrics.mesasOcupadas > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-zinc-400'}`}>
              <Armchair strokeWidth={2.5} size={28} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Mesas Activas</h3>
          </div>
          <p className={`text-6xl font-black italic tracking-tighter relative z-10 ${metrics.mesasOcupadas > 0 ? 'text-white' : 'text-zinc-600'}`}>
            {metrics.mesasOcupadas}
          </p>
        </motion.div>

        {/* Órdenes Pendientes */}
        <motion.div variants={itemVariants} className={`border rounded-[2rem] p-8 relative overflow-hidden group transition-colors ${metrics.ordenesPendientes > 5 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className={`p-3 rounded-2xl ${metrics.ordenesPendientes > 5 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-zinc-400'}`}>
              <ChefHat strokeWidth={2.5} size={28} />
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-widest ${metrics.ordenesPendientes > 5 ? 'text-red-400' : 'text-zinc-400'}`}>Órdenes Cocina</h3>
          </div>
          <div className="flex items-end gap-3 relative z-10">
            <p className={`text-6xl font-black italic tracking-tighter ${metrics.ordenesPendientes > 5 ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-white'}`}>
              {metrics.ordenesPendientes}
            </p>
            {metrics.ordenesPendientes > 5 && (
              <span className="text-sm font-bold uppercase text-red-500/80 mb-2 animate-pulse tracking-widest">
                Saturación
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
