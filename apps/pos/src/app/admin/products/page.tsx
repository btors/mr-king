'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProductForm, ProductFormData } from '@/components/admin/ProductForm';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductFromAPI {
  id: string;
  name: string;
  price: string | number; // Decimal string from Prisma usually
  isActive: boolean;
  requiresSizes: boolean;
  allowMultipleSauces: boolean;
  maxSauces: number;
  categoryId: string;
  category?: { id: string; name: string };
  variants: { name: string; price: number }[];
  flavors?: string[];
  maxFlavors?: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductFromAPI[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'ALL'>('ALL');
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedCategories, fetchedProducts] = await Promise.all([
        api.get<any[]>('/categories'),
        api.get<any[]>('/products')
      ]);
      
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
      
      // If we don't have a selection yet, maybe default to ALL or first category
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategoryId === 'ALL' 
    ? products 
    : products.filter(p => p.categoryId === selectedCategoryId);

  const handleEditClick = (p: ProductFromAPI) => {
    setEditingProduct(p);
    setIsFormOpen(true);
  };

  const handleCreateNewClick = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      if (formData.id) {
        await api.patch(`/products/${formData.id}`, formData);
      } else {
        await api.post(`/products`, formData);
      }
      setIsFormOpen(false);
      await fetchData(); // Refresh list
    } catch (e) {
      console.error('Save failed', e);
      alert('Error guardando el producto. Ver consola.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, currentlyActive: boolean) => {
    try {
      await api.patch(`/products/${id}`, { isActive: !currentlyActive });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentlyActive } : p));
    } catch (e) {
      console.error('Toggle failed', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de ELIMINAR este producto de la base de datos?')) {
      try {
        await api.delete(`/products/${id}`);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (e) {
        console.error('Delete failed', e);
      }
    }
  };

  return (
    <div className="h-full flex relative">
      {/* List Section */}
      <div className="flex-1 flex flex-col min-w-0 p-8 space-y-6 overflow-hidden">
        <header className="flex justify-between items-center bg-surface-alt p-6 rounded-3xl border border-white/5">
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Gestión de Productos</h2>
            <p className="text-zinc-500 font-medium">Sincronización directa con el catálogo oficial.</p>
          </div>
          <button 
            onClick={handleCreateNewClick}
            className="bg-accent-orange hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black italic tracking-tighter uppercase transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Nuevo Producto
          </button>
        </header>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all border ${
              selectedCategoryId === 'ALL' 
                ? 'bg-accent text-black border-accent' 
                : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10'
            }`}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all border whitespace-nowrap ${
                selectedCategoryId === cat.id 
                  ? 'bg-accent text-black border-accent' 
                  : 'bg-zinc-900 text-zinc-500 border-white/5 hover:border-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {loading ? (
           <div className="flex-1 flex items-center justify-center font-bold text-zinc-500 animate-pulse">
             Cargando Base de Datos...
           </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-3xl border border-white/5 bg-black/20 relative custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface z-10 shadow-md">
                <tr>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Estatus</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Nombre</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">Variantes / Precios</th>
                  <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-zinc-500 font-bold italic">No hay productos en esta categoría.</td></tr>
                )}
                {filteredProducts.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="p-4 w-24">
                      {p.isActive ? 
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20">ACTIVO</span> : 
                        <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-bold border border-red-500/20">INACTIVO</span>
                      }
                    </td>
                    <td className="p-4 font-bold text-white relative">
                      {p.name}
                      {(p.requiresSizes || p.allowMultipleSauces) && (
                        <div className="flex gap-2 mt-1">
                          {p.requiresSizes && <span className="text-[10px] text-accent uppercase tracking-widest">TAMAÑOS ACTIVOS</span>}
                          {p.allowMultipleSauces && <span className="text-[10px] text-blue-400 uppercase tracking-widest">MULTISALSA (MAX {p.maxSauces})</span>}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {p.variants?.map((v, i) => (
                          <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-zinc-400 font-bold whitespace-nowrap">
                            <span className="text-accent uppercase tracking-tighter mr-1">{v.name}:</span>
                            <span className="text-white font-black italic">${Number(v.price).toFixed(0)}</span>
                          </span>
                        ))}
                        {(!p.variants || p.variants.length === 0) && (
                           <span className="font-black italic text-accent">${Number(p.price).toFixed(0)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(p)}
                          className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                           onClick={() => handleDeactivate(p.id, p.isActive)}
                           className={`p-3 rounded-xl transition-colors ${p.isActive ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                           title={p.isActive ? "Desactivar de Ventas" : "Activar para Ventas"}
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </button>
                        <button 
                           onClick={() => handleDelete(p.id)}
                           className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                           title="Eliminar Permanente"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Drawer Section */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="w-full max-w-md h-full z-20 absolute right-0 top-0"
          >
            <ProductForm
              initialData={editingProduct}
              categories={categories}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        )}
        {/* Backdrop for mobile or drawer feel */}
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFormOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
