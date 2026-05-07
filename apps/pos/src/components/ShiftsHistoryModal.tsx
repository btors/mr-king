'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

interface Shift {
  id: string;
  openingBalance: number;
  actualBalance: number;
  expectedBalance: number;
  difference: number;
  openedAt: string;
  closedAt: string | null;
  openedBy: { id: string; name: string } | null;
  closedBy: { id: string; name: string } | null;
  transactions?: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    createdAt: string;
  }>;
  audit?: {
    sales: {
      cash: number;
      card: number;
      transfer: number;
      total: number;
    };
    additionalInflows: number;
    expenses: Array<{
      id: string;
      description: string;
      amount: number;
      userName: string;
    }>;
    productsSold: Array<{
      name: string;
      quantity: number;
      total: number;
    }>;
  };
}

interface ShiftsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftsHistoryModal: React.FC<ShiftsHistoryModalProps> = ({ isOpen, onClose }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShiftDetailsLoading, setIsShiftDetailsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShiftsHistory();
    }
  }, [isOpen]);

  const fetchShiftsHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Shift[]>('/shifts/history');
      // Filtrar solo los turnos cerrados (Cortes Definitivos)
      const closedShifts = (data || []).filter(s => s.closedAt !== null);
      setShifts(closedShifts);
      if (closedShifts.length > 0) {
        fetchShiftDetails(closedShifts[0].id);
      }
    } catch (err) {
      console.error('Error fetching shifts history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShiftDetails = async (id: string) => {
    setIsShiftDetailsLoading(true);
    try {
      const details = await api.get<Shift>(`/shifts/${id}`);
      setSelectedShift(details);
    } catch (err) {
      console.error('Error fetching shift details:', err);
    } finally {
      setIsShiftDetailsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!selectedShift) return;

    const diff = Number(selectedShift.actualBalance) - Number(selectedShift.expectedBalance);
    const openedAtStr = selectedShift.openedAt ? new Date(selectedShift.openedAt).toLocaleString('es-MX').replace(/,/g, ' -') : '';
    const closedAtStr = selectedShift.closedAt ? new Date(selectedShift.closedAt).toLocaleString('es-MX').replace(/,/g, ' -') : '';

    const auditSales = selectedShift.audit?.sales || { cash: 0, card: 0, transfer: 0, total: 0 };
    const auditExpenses = selectedShift.audit?.expenses || [];
    const auditProducts = selectedShift.audit?.productsSold || [];

    const lines = [
      ["REPORTE DE CORTE DE CAJA - MR-KING SNACK BAR"],
      ["ID Fiscal del Turno:", selectedShift.id],
      ["Fecha Apertura:", openedAtStr],
      ["Fecha Cierre:", closedAtStr],
      ["Abierto Por:", selectedShift.openedBy?.name || 'Sistema'],
      ["Cerrado Por:", selectedShift.closedBy?.name || 'Sistema'],
      [""],
      ["RESUMEN FINANCIERO"],
      ["Concepto", "Monto"],
      ["Fondo Inicial (Apertura)", Number(selectedShift.openingBalance)],
      ["Saldo Esperado (Sistema)", Number(selectedShift.expectedBalance)],
      ["Saldo Real (Caja)", Number(selectedShift.actualBalance)],
      ["Diferencia (Sobrante/Faltante)", diff],
      [""],
      ["VENTAS POR MÉTODO DE PAGO"],
      ["Método de Pago", "Total"],
      ["Efectivo", auditSales.cash],
      ["Tarjeta", auditSales.card],
      ["Transferencia", auditSales.transfer],
      ["Total Ventas", auditSales.total],
      [""],
      ["BITÁCORA DE GASTOS (EGRESOS)"],
      ["ID Gasto", "Descripción", "Monto", "Usuario"],
      ...auditExpenses.map((exp: any) => [
        exp.id,
        exp.description,
        exp.amount,
        exp.userName
      ]),
      [""],
      ["INVENTARIO DE PRODUCTOS VENDIDOS"],
      ["Producto", "Cantidad Vendida", "Total Recaudado"],
      ...auditProducts.map((prod: any) => [
        prod.name,
        prod.quantity,
        prod.total
      ])
    ];

    const csvContent = lines
      .map(row => row.map((cell: any) => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Corte_Caja_${selectedShift.id.slice(-6).toUpperCase()}_${new Date(selectedShift.closedAt || '').toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!selectedShift) return;
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
          onClick={onClose}
        >
          {/* Glassmorphism main container */}
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={e => e.stopPropagation()}
            className="bg-zinc-950/80 border border-white/10 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                    Historial de Cortes
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[10px] tracking-widest uppercase">
                    Financiero Definitivo
                  </span>
                </div>
                <p className="text-zinc-500 text-xs mt-1">
                  El <strong className="text-amber-400 font-black">Corte Definitivo</strong> representa el cierre de caja final y contable que realiza el arqueo de la jornada.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportToCSV}
                  disabled={!selectedShift}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-black text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  📥 Exportar Excel (CSV)
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Split Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left sidebar: Shifts list */}
              <div className="w-1/3 border-r border-white/5 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-zinc-950/50">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 px-2 mb-2">
                  Selecciona un Turno Cerrado
                </h3>

                {isLoading ? (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Cargando historial contable...
                  </div>
                ) : shifts.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 text-sm italic">
                    No se han registrado cortes cerrados aún.
                  </div>
                ) : (
                  shifts.map(s => {
                    const isSelected = selectedShift?.id === s.id;
                    const isPerfect = s.difference === 0;
                    const isNegative = s.difference < 0;

                    return (
                      <button
                        key={s.id}
                        onClick={() => fetchShiftDetails(s.id)}
                        className={`w-full p-4 rounded-2xl text-left border transition-all flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                            : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/60 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black tracking-widest uppercase text-zinc-500 leading-none">
                            Corte #{s.id.slice(-6).toUpperCase()}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPerfect
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isNegative
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {isPerfect ? 'Perfecto' : isNegative ? 'Faltante' : 'Sobrante'}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-white">
                          {s.closedAt ? new Date(s.closedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin Fecha'}
                        </div>

                        <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2 mt-1">
                          <span className="text-zinc-500">Saldo Real:</span>
                          <span className="font-bold text-white">{formatCurrency(s.actualBalance)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right area: Selected shift detailed audit view */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-zinc-950/20 relative">
                {isShiftDetailsLoading ? (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : null}

                {selectedShift ? (
                  <div className="space-y-6">
                    {/* Shift details headers */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black italic text-white uppercase tracking-tight">
                            Detalles del Turno Cerrado
                          </h3>
                        </div>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          ID Fiscal: <span className="text-zinc-300 font-mono select-all">{selectedShift.id}</span>
                        </p>
                      </div>

                      <button
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-wider transition-colors"
                      >
                        🖨️ Imprimir Resumen / PDF
                      </button>
                    </div>

                    {/* Operational users card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/30 border border-white/5 p-4 rounded-2xl">
                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Responsable de Apertura</span>
                        <p className="text-sm font-bold text-white mt-1">{selectedShift.openedBy?.name || 'Sistema'}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {selectedShift.openedAt ? new Date(selectedShift.openedAt).toLocaleString('es-MX') : ''}
                        </p>
                      </div>
                      <div className="border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Responsable de Cierre (Corte Definitivo)</span>
                        <p className="text-sm font-bold text-white mt-1">{selectedShift.closedBy?.name || 'Sistema'}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {selectedShift.closedAt ? new Date(selectedShift.closedAt).toLocaleString('es-MX') : ''}
                        </p>
                      </div>
                    </div>

                    {/* Audit balances panel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-zinc-900/20 border border-white/5 p-4 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Fondo Inicial</span>
                        <p className="text-xl font-black text-white italic mt-1">{formatCurrency(selectedShift.openingBalance)}</p>
                      </div>
                      <div className="bg-zinc-900/20 border border-white/5 p-4 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Saldo Esperado</span>
                        <p className="text-xl font-black text-white italic mt-1">{formatCurrency(selectedShift.expectedBalance)}</p>
                      </div>
                      <div className="bg-zinc-900/20 border border-white/5 p-4 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Saldo Real</span>
                        <p className="text-xl font-black text-white italic mt-1">{formatCurrency(selectedShift.actualBalance)}</p>
                      </div>
                      <div className={`border p-4 rounded-2xl ${
                        selectedShift.difference === 0
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          : selectedShift.difference < 0
                            ? 'bg-red-500/5 border-red-500/20 text-red-400'
                            : 'bg-blue-500/5 border-blue-500/20 text-blue-400'
                      }`}>
                        <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">Diferencia (Arqueo)</span>
                        <p className="text-xl font-black italic mt-1">
                          {selectedShift.difference > 0 ? '+' : ''}{formatCurrency(selectedShift.difference)}
                        </p>
                      </div>
                    </div>

                    {/* Desglose de Ventas por Método de Pago */}
                    {selectedShift.audit?.sales && (
                      <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                          <span>💰</span> Desglose de Ventas por Método de Pago
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Efectivo */}
                          <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-xs text-zinc-400">
                              <span className="flex items-center gap-1.5 font-bold">💵 Efectivo</span>
                              <span className="font-mono">
                                {selectedShift.audit.sales.total > 0 
                                  ? `${Math.round((selectedShift.audit.sales.cash / selectedShift.audit.sales.total) * 100)}%`
                                  : '0%'}
                              </span>
                            </div>
                            <p className="text-lg font-black text-white">{formatCurrency(selectedShift.audit.sales.cash)}</p>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ 
                                  width: `${selectedShift.audit.sales.total > 0 ? (selectedShift.audit.sales.cash / selectedShift.audit.sales.total) * 100 : 0}%` 
                                }}
                              />
                            </div>
                          </div>

                          {/* Tarjeta */}
                          <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-xs text-zinc-400">
                              <span className="flex items-center gap-1.5 font-bold">💳 Tarjeta</span>
                              <span className="font-mono">
                                {selectedShift.audit.sales.total > 0 
                                  ? `${Math.round((selectedShift.audit.sales.card / selectedShift.audit.sales.total) * 100)}%`
                                  : '0%'}
                              </span>
                            </div>
                            <p className="text-lg font-black text-white">{formatCurrency(selectedShift.audit.sales.card)}</p>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ 
                                  width: `${selectedShift.audit.sales.total > 0 ? (selectedShift.audit.sales.card / selectedShift.audit.sales.total) * 100 : 0}%` 
                                }}
                              />
                            </div>
                          </div>

                          {/* Transferencia */}
                          <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-xs text-zinc-400">
                              <span className="flex items-center gap-1.5 font-bold">🏦 Transferencia</span>
                              <span className="font-mono">
                                {selectedShift.audit.sales.total > 0 
                                  ? `${Math.round((selectedShift.audit.sales.transfer / selectedShift.audit.sales.total) * 100)}%`
                                  : '0%'}
                              </span>
                            </div>
                            <p className="text-lg font-black text-white">{formatCurrency(selectedShift.audit.sales.transfer)}</p>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 rounded-full" 
                                style={{ 
                                  width: `${selectedShift.audit.sales.total > 0 ? (selectedShift.audit.sales.transfer / selectedShift.audit.sales.total) * 100 : 0}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 text-xs border-t border-white/5">
                          <span className="text-zinc-500 font-bold">VENTAS TOTALES DEL TURNO:</span>
                          <span className="text-lg font-black text-amber-400">{formatCurrency(selectedShift.audit.sales.total)}</span>
                        </div>
                      </div>
                    )}

                    {/* Inventario Consumido (Productos Vendidos) */}
                    {selectedShift.audit?.productsSold && selectedShift.audit.productsSold.length > 0 && (
                      <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                          <span>📦</span> Inventario Consumido
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-white/10 text-zinc-500 uppercase font-black tracking-wider pb-2">
                                <th className="pb-3 pl-2">Producto</th>
                                <th className="pb-3 text-center">Cantidad Vendida</th>
                                <th className="pb-3 text-right pr-2">Total Recaudado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {selectedShift.audit.productsSold.map((p, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="py-3 pl-2 text-white font-bold">{p.name}</td>
                                  <td className="py-3 text-center font-black text-amber-400">
                                    <span className="bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                      {p.quantity} pzas
                                    </span>
                                  </td>
                                  <td className="py-3 text-right pr-2 text-zinc-300 font-mono">{formatCurrency(p.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Timeline de Gastos y Egresos */}
                    {selectedShift.audit?.expenses && selectedShift.audit.expenses.length > 0 && (
                      <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                          <span>📋</span> Bitácora de Egresos y Gastos
                        </h4>

                        <div className="relative pl-6 border-l-2 border-red-500/30 space-y-6">
                          {selectedShift.audit.expenses.map((exp, idx) => (
                            <div key={exp.id || idx} className="relative">
                              {/* Red Indicator Dot */}
                              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-zinc-950 border-2 border-red-500 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              </div>

                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                  <h5 className="text-xs font-black text-white uppercase tracking-tight">{exp.description || 'Sin descripción'}</h5>
                                  <p className="text-[10px] text-zinc-500">
                                    Registrado por <span className="text-zinc-400 font-bold">{exp.userName}</span>
                                  </p>
                                </div>
                                <span className="text-sm font-black text-red-400 font-mono">
                                  -{formatCurrency(exp.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                    <svg className="w-12 h-12 text-zinc-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Selecciona un corte contable de la izquierda para desplegar sus auditorías detalladas.
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Hidden Print Receipt Template */}
          {selectedShift && (
            <div className="hidden print:block print-ticket p-6 bg-white text-black font-mono text-sm leading-tight max-w-sm mx-auto">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .print-ticket, .print-ticket * {
                    visibility: visible;
                  }
                  .print-ticket {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white;
                    color: black;
                  }
                }
              `}</style>
              <div className="text-center space-y-1 border-b border-dashed border-black pb-4 mb-4">
                <h1 className="text-lg font-black tracking-tight">MR-KING SNACK BAR</h1>
                <p className="text-[10px] uppercase">TICKET DEFINITIVO DE CORTE DE CAJA</p>
                <p className="text-[10px]">ID: {selectedShift.id}</p>
              </div>

              <div className="space-y-2 text-xs border-b border-dashed border-black pb-4 mb-4">
                <div className="flex justify-between">
                  <span>Apertura:</span>
                  <span className="text-right">{selectedShift.openedAt ? new Date(selectedShift.openedAt).toLocaleString('es-MX') : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cerrado Por:</span>
                  <span className="text-right">{selectedShift.closedBy?.name || 'Sistema'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cierre de Caja:</span>
                  <span className="text-right">{selectedShift.closedAt ? new Date(selectedShift.closedAt).toLocaleString('es-MX') : ''}</span>
                </div>
              </div>

              <div className="space-y-2 border-b border-dashed border-black pb-4 mb-4 text-xs font-bold">
                <div className="flex justify-between">
                  <span>FONDO INICIAL:</span>
                  <span>{formatCurrency(selectedShift.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SALDO ESPERADO:</span>
                  <span>{formatCurrency(selectedShift.expectedBalance)}</span>
                </div>
                <div className="flex justify-between border-t border-black pt-2 text-sm font-black">
                  <span>SALDO REAL:</span>
                  <span>{formatCurrency(selectedShift.actualBalance)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>DIFERENCIA:</span>
                  <span>{selectedShift.difference > 0 ? '+' : ''}{formatCurrency(selectedShift.difference)}</span>
                </div>
              </div>

              {/* Métodos de Pago */}
              {selectedShift.audit?.sales && (
                <div className="space-y-1 text-[11px] border-b border-dashed border-black pb-4 mb-4">
                  <p className="font-bold uppercase text-center border-b border-dashed border-black pb-1 mb-1">MÉTODOS DE PAGO</p>
                  <div className="flex justify-between">
                    <span>Efectivo:</span>
                    <span>{formatCurrency(selectedShift.audit.sales.cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarjeta:</span>
                    <span>{formatCurrency(selectedShift.audit.sales.card)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transferencia:</span>
                    <span>{formatCurrency(selectedShift.audit.sales.transfer)}</span>
                  </div>
                  <div className="flex justify-between border-t border-black pt-1 font-bold">
                    <span>TOTAL VENTAS:</span>
                    <span>{formatCurrency(selectedShift.audit.sales.total)}</span>
                  </div>
                </div>
              )}

              {/* Inventario Consumido */}
              {selectedShift.audit?.productsSold && selectedShift.audit.productsSold.length > 0 && (
                <div className="space-y-1 text-[11px] border-b border-dashed border-black pb-4 mb-4">
                  <p className="font-bold uppercase text-center border-b border-dashed border-black pb-1 mb-1">PRODUCTOS VENDIDOS</p>
                  {selectedShift.audit.productsSold.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{p.quantity}x {p.name}</span>
                      <span>{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bitácora de Gastos */}
              {selectedShift.audit?.expenses && selectedShift.audit.expenses.length > 0 && (
                <div className="space-y-1 text-[11px] border-b border-dashed border-black pb-4 mb-4">
                  <p className="font-bold uppercase text-center border-b border-dashed border-black pb-1 mb-1">REGISTRO DE GASTOS</p>
                  {selectedShift.audit.expenses.map((exp, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{exp.description} ({exp.userName})</span>
                      <span>-{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center mt-8 pt-4 border-t border-dashed border-black text-[10px]">
                <p className="font-bold">FIN DE REPORTE DE CAJA</p>
                <p>Auditoría Financiera Consolidada</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
