import React from 'react';
import { AdminPinGate } from '@/components/admin/AdminPinGate';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPinGate>
      <div className="min-h-[100dvh] flex flex-col bg-background text-white selection:bg-accent selection:text-black">
        {/* Admin Header */}
        <header className="h-20 border-b border-white/5 bg-surface flex items-center justify-between px-8 z-20 relative">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter">Panel Maestro</h1>
              <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase">MR-KING Enterprise</p>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <Link 
              href="/admin/products"
              className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition text-sm font-bold tracking-wide"
            >
              Productos
            </Link>
            <Link 
              href="/"
              className="px-6 py-2.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition text-sm font-bold tracking-wide flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Cerrar Módulo
            </Link>
          </nav>
        </header>

        {/* Admin Content */}
        <main className="flex-1 overflow-auto relative z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </AdminPinGate>
  );
}
