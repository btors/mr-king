'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePOSStore } from '../store/usePOSStore';
import { api } from '../lib/api';

interface CashClosureModalProps {
  onClose: () => void;
}

export const CashClosureModal: React.FC<CashClosureModalProps> = ({ onClose }) => {
  const [montoFinal, setMontoFinal] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shiftData, setShiftData] = useState<any | null>(null);
  
  const { user } = usePOSStore();

  if (user?.role !== 'ADMIN') return null;

  const handleCloseCash = async () => {
    if (!montoFinal || isNaN(Number(montoFinal))) return;
    
    setIsSubmitting(true);
    try {
      const res: any = await api.post('/shifts/close', { actualBalance: Number(montoFinal) });
      const data = res?.data || res;
      setShiftData(data);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error closing shift:', err);
      alert(err?.message || 'Error al cerrar el turno. Asegúrese de que no haya órdenes activas pendientes de cobro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = () => {
    usePOSStore.setState({ currentShift: null, user: null, cart: [], selectedTable: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const exportCurrentToCSV = () => {
    if (!shiftData) return;

    const diff = Number(shiftData.actualBalance) - Number(shiftData.expectedBalance);
    const openedAtStr = shiftData.openedAt ? new Date(shiftData.openedAt).toLocaleString('es-MX').replace(/,/g, ' -') : '';
    const closedAtStr = shiftData.closedAt ? new Date(shiftData.closedAt).toLocaleString('es-MX').replace(/,/g, ' -') : '';

    const auditSales = shiftData.audit?.sales || { cash: 0, card: 0, transfer: 0, total: 0 };
    const auditExpenses = shiftData.audit?.expenses || [];
    const auditProducts = shiftData.audit?.productsSold || [];

    const lines = [
      ["REPORTE DE CORTE DE CAJA - MR-KING SNACK BAR"],
      ["ID Fiscal del Turno:", shiftData.id],
      ["Fecha Apertura:", openedAtStr],
      ["Fecha Cierre:", closedAtStr],
      ["Abierto Por:", user?.name || 'Sistema'],
      ["Cerrado Por:", user?.name || 'Sistema'],
      [""],
      ["RESUMEN FINANCIERO"],
      ["Concepto", "Monto"],
      ["Fondo Inicial (Apertura)", Number(shiftData.openingBalance)],
      ["Saldo Esperado (Sistema)", Number(shiftData.expectedBalance)],
      ["Saldo Real (Caja)", Number(shiftData.actualBalance)],
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
    link.setAttribute('download', `Corte_Caja_${shiftData.id.slice(-6).toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div 
            key="input-form"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="bg-zinc-950/90 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <header className="p-8 border-b border-white/5 bg-zinc-900/40">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Cerrar Turno (Corte del Día)</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[9px] uppercase tracking-wider">
                  Corte Definitivo
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-1">Ingresa el balance físico para auditar el arqueo final</p>
            </header>

            <div className="p-8 space-y-6">
              <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-500/90 text-xs font-bold text-center leading-relaxed">
                  Ingresa el total exacto de efectivo físico (billetes y monedas) disponible en la caja.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Monto Físico Contado ($)</label>
                <input 
                  type="number"
                  value={montoFinal}
                  onChange={(e) => setMontoFinal(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-6 text-white text-3xl font-black tracking-tighter text-center focus:border-amber-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            <footer className="p-8 border-t border-white/5 bg-zinc-900/40 flex gap-4">
              <button 
                onClick={onClose}
                className="px-6 py-4 rounded-2xl bg-white/5 text-zinc-300 font-bold hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={!montoFinal || isSubmitting}
                onClick={handleCloseCash}
                className={`flex-1 py-4 rounded-2xl font-black text-lg uppercase tracking-tight transition-all shadow-xl
                  ${!montoFinal || isSubmitting ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-amber-500 text-black hover:bg-amber-400'}
                `}
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Cierre'}
              </button>
            </footer>
          </motion.div>
        ) : (
          <motion.div 
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            className="bg-zinc-950/90 border border-emerald-500/20 rounded-[2.5rem] w-full max-w-2xl overflow-y-auto max-h-[90vh] custom-scrollbar shadow-2xl p-8 space-y-6 relative"
          >
            {/* Success Icon */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-3xl shadow-lg shadow-emerald-500/10 animate-bounce">
                ✓
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                Corte de Caja Realizado
              </h2>
              <p className="text-zinc-500 text-xs">
                El turno ha sido cerrado con éxito y auditado como definitivo.
              </p>
            </div>

            {/* Quick Balances Summary */}
            {shiftData && (
              <div className="space-y-6">
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-2">
                    Resumen de Arqueo de Caja
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">Fondo Inicial:</span>
                      <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(shiftData.openingBalance)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">Saldo Esperado:</span>
                      <p className="text-sm font-bold text-white mt-0.5">{formatCurrency(shiftData.expectedBalance)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">Saldo Real Contado:</span>
                      <p className="text-sm font-black text-amber-400 mt-0.5">{formatCurrency(shiftData.actualBalance)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase font-bold text-[9px]">Diferencia (Arqueo):</span>
                      <p className={`text-sm font-black mt-0.5 ${
                        Number(shiftData.actualBalance) - Number(shiftData.expectedBalance) >= 0 
                          ? 'text-emerald-400' 
                          : 'text-red-400'
                      }`}>
                        {Number(shiftData.actualBalance) - Number(shiftData.expectedBalance) > 0 ? '+' : ''}
                        {formatCurrency(Number(shiftData.actualBalance) - Number(shiftData.expectedBalance))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métodos de Pago */}
                {shiftData.audit?.sales && (
                  <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-6 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <span>💰</span> Desglose de Ventas por Método de Pago
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Efectivo */}
                      <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs text-zinc-400">
                          <span className="flex items-center gap-1.5 font-bold">💵 Efectivo</span>
                          <span className="font-mono">
                            {shiftData.audit.sales.total > 0 
                              ? `${Math.round((shiftData.audit.sales.cash / shiftData.audit.sales.total) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                        <p className="text-lg font-black text-white">{formatCurrency(shiftData.audit.sales.cash)}</p>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ 
                              width: `${shiftData.audit.sales.total > 0 ? (shiftData.audit.sales.cash / shiftData.audit.sales.total) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>

                      {/* Tarjeta */}
                      <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs text-zinc-400">
                          <span className="flex items-center gap-1.5 font-bold">💳 Tarjeta</span>
                          <span className="font-mono">
                            {shiftData.audit.sales.total > 0 
                              ? `${Math.round((shiftData.audit.sales.card / shiftData.audit.sales.total) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                        <p className="text-lg font-black text-white">{formatCurrency(shiftData.audit.sales.card)}</p>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ 
                              width: `${shiftData.audit.sales.total > 0 ? (shiftData.audit.sales.card / shiftData.audit.sales.total) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>

                      {/* Transferencia */}
                      <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs text-zinc-400">
                          <span className="flex items-center gap-1.5 font-bold">🏦 Transferencia</span>
                          <span className="font-mono">
                            {shiftData.audit.sales.total > 0 
                              ? `${Math.round((shiftData.audit.sales.transfer / shiftData.audit.sales.total) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                        <p className="text-lg font-black text-white">{formatCurrency(shiftData.audit.sales.transfer)}</p>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full" 
                            style={{ 
                              width: `${shiftData.audit.sales.total > 0 ? (shiftData.audit.sales.transfer / shiftData.audit.sales.total) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventario Consumido */}
                {shiftData.audit?.productsSold && shiftData.audit.productsSold.length > 0 && (
                  <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-6 space-y-4">
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
                          {shiftData.audit.productsSold.map((p: any, idx: number) => (
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

                {/* Bitácora de Gastos (Timeline) */}
                {shiftData.audit?.expenses && shiftData.audit.expenses.length > 0 && (
                  <div className="bg-zinc-900/20 border border-white/5 rounded-3xl p-6 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <span>📋</span> Bitácora de Egresos y Gastos
                    </h4>

                    <div className="relative pl-6 border-l-2 border-red-500/30 space-y-6">
                      {shiftData.audit.expenses.map((exp: any, idx: number) => (
                        <div key={exp.id || idx} className="relative">
                          {/* Red Indicator Dot */}
                          <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-zinc-950 border-2 border-red-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          </div>

                          <div className="flex justify-between items-center gap-2">
                            <div>
                              <h5 className="text-xs font-black text-white uppercase tracking-tight">{exp.description || 'Sin descripción'}</h5>
                              <p className="text-[10px] text-zinc-500 font-medium">
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
            )}

            {/* Print and CSV Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-wider transition-all"
              >
                🖨️ Imprimir Ticket
              </button>
              <button
                onClick={exportCurrentToCSV}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-wider transition-all"
              >
                📊 Descargar Excel
              </button>
            </div>

            {/* Lock and Exit */}
            <button
              onClick={handleFinalize}
              className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-400 text-black font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/10 transition-all"
            >
              🚪 Finalizar y Bloquear POS
            </button>

            {/* Hidden Print Receipt Template for Window.print() */}
            {shiftData && (
              <div className="hidden print:block print-ticket p-6 bg-white text-black font-mono text-sm leading-tight max-w-sm mx-auto text-left">
                 <style>{`
                  @media print {
                    /* Forzar a la página a colapsar el lienzo infinito de fondo */
                    html, body, #__next, main {
                      height: auto !important;
                      min-height: auto !important;
                      overflow: visible !important;
                      position: absolute !important;
                      top: 0 !important;
                      left: 0 !important;
                      width: 100% !important;
                      background: white !important;
                    }
                    /* Ocultar el resto del sistema */
                    body * {
                      visibility: hidden !important;
                    }
                    /* Mostrar de forma exclusiva el ticket y sus hijos */
                    .print-ticket, .print-ticket * {
                      visibility: visible !important;
                    }
                    /* Maquetar el ticket como único elemento absoluto que ocupa el Spooler */
                    .print-ticket {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 80mm !important;
                      max-width: 80mm !important;
                      margin: 0 !important;
                      padding: 5mm !important;
                      box-sizing: border-box !important;
                      background: white !important;
                      color: black !important;
                    }
                  }
                `}</style>
                <div className="text-center space-y-1 border-b border-dashed border-black pb-4 mb-4">
                  <h1 className="text-lg font-black tracking-tight">MR-KING SNACK BAR</h1>
                  <p className="text-[10px] uppercase">TICKET DEFINITIVO DE CORTE DE CAJA</p>
                  <p className="text-[10px]">ID: {shiftData.id}</p>
                </div>

                <div className="space-y-2 text-xs border-b border-dashed border-black pb-4 mb-4">
                  <div className="flex justify-between">
                    <span>Apertura:</span>
                    <span className="text-right">{shiftData.openedAt ? new Date(shiftData.openedAt).toLocaleString('es-MX') : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cerrado Por:</span>
                    <span className="text-right">{user?.name || 'Sistema'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cierre de Caja:</span>
                    <span className="text-right">{shiftData.closedAt ? new Date(shiftData.closedAt).toLocaleString('es-MX') : ''}</span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-dashed border-black pb-4 mb-4 text-xs font-bold">
                  <div className="flex justify-between">
                    <span>FONDO INICIAL:</span>
                    <span>{formatCurrency(shiftData.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SALDO ESPERADO:</span>
                    <span>{formatCurrency(shiftData.expectedBalance)}</span>
                  </div>
                  <div className="flex justify-between border-t border-black pt-2 text-sm font-black">
                    <span>SALDO REAL:</span>
                    <span>{formatCurrency(shiftData.actualBalance)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>DIFERENCIA:</span>
                    <span>{Number(shiftData.actualBalance) - Number(shiftData.expectedBalance) > 0 ? '+' : ''}{formatCurrency(Number(shiftData.actualBalance) - Number(shiftData.expectedBalance))}</span>
                  </div>
                </div>

                {/* Métodos de Pago */}
                {shiftData.audit?.sales && (
                  <div className="space-y-1 text-[11px] border-b border-dashed border-black pb-4 mb-4">
                    <p className="font-bold uppercase text-center border-b border-dashed border-black pb-1 mb-1">MÉTODOS DE PAGO</p>
                    <div className="flex justify-between">
                      <span>Efectivo:</span>
                      <span>{formatCurrency(shiftData.audit.sales.cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tarjeta:</span>
                      <span>{formatCurrency(shiftData.audit.sales.card)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transferencia:</span>
                      <span>{formatCurrency(shiftData.audit.sales.transfer)}</span>
                    </div>
                    <div className="flex justify-between border-t border-black pt-1 font-bold">
                      <span>TOTAL VENTAS:</span>
                      <span>{formatCurrency(shiftData.audit.sales.total)}</span>
                    </div>
                  </div>
                )}

                {/* Inventario Consumido */}
                {shiftData.audit?.productsSold && shiftData.audit.productsSold.length > 0 && (
                  <div className="space-y-1 text-[11px] border-b border-dashed border-black pb-4 mb-4">
                    <p className="font-bold uppercase text-center border-b border-dashed border-black pb-1 mb-1">PRODUCTOS VENDIDOS</p>
                    {shiftData.audit.productsSold.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{p.quantity}x {p.name}</span>
                        <span>{formatCurrency(p.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bitácora de Gastos */}
                {shiftData.audit?.expenses && shiftData.audit.expenses.length > 0 && (
                  <div className="space-y-1 text-[11px] border-b border-dashed border-black pb-4 mb-4">
                    <p className="font-bold uppercase text-center border-b border-dashed border-black pb-1 mb-1">REGISTRO DE GASTOS</p>
                    {shiftData.audit.expenses.map((exp: any, idx: number) => (
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
    </div>
  );
};
