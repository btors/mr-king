'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface ProductFormData {
  id?: string;
  name: string;
  categoryId: string;
  price: number;
  isActive: boolean;
  requiresSizes: boolean;
  allowMultipleSauces: boolean;
  maxSauces: number;
}

interface ProductFormProps {
  initialData?: ProductFormData | null;
  categories: { id: string; name: string }[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const defaultValues: ProductFormData = {
  name: '',
  categoryId: '',
  price: 0,
  isActive: true,
  requiresSizes: false,
  allowMultipleSauces: false,
  maxSauces: 0,
};

export const ProductForm: React.FC<ProductFormProps> = ({ 
  initialData, 
  categories, 
  onSubmit, 
  onCancel,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<ProductFormData>(defaultValues);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ ...defaultValues, categoryId: categories[0]?.id || '' });
    }
  }, [initialData, categories]);

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-surface-alt border-l border-white/5 shadow-2xl relative z-20 w-full max-w-md">
      <header className="p-8 border-b border-white/5 bg-surface">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
          {initialData ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
        <p className="text-zinc-500 font-medium text-sm mt-1 tracking-wide">
          Define las reglas de negocio para este ítem.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {/* Core Info */}
        <section className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Nombre del Producto</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-bold"
              placeholder="Ej. Pizza Mexicana"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Categoría</label>
              <select 
                required
                value={formData.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent appearance-none font-bold"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Precio Base ($)</label>
              <input 
                required
                type="number" 
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent font-black italic"
              />
            </div>
          </div>
        </section>

        {/* Visibility */}
        <section className="space-y-4 pt-6 border-t border-white/5">
          <label className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
            <div>
              <span className="block font-bold text-white">Disponible para Venta</span>
              <span className="text-xs text-zinc-500 font-medium">Desactívalo si no hay inventario</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
              <motion.div 
                layout
                className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                animate={{ left: formData.isActive ? '26px' : '2px' }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </div>
            {/* hidden input for form value if needed */}
            <input type="checkbox" className="hidden" checked={formData.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} />
          </label>
        </section>

        {/* Business Logic Rules */}
        <section className="space-y-4 pt-6 border-t border-white/5">
          <h3 className="text-sm font-black uppercase italic tracking-tighter text-accent mb-4">Reglas de Negocio (Backend)</h3>
          
          <label className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
            <div>
              <span className="block font-bold text-white">Requiere Tamaños</span>
              <span className="text-xs text-zinc-500 font-medium">Activar para Pizzas (MD, GD, FM)</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.requiresSizes ? 'bg-accent' : 'bg-zinc-700'}`}>
              <motion.div layout className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm" animate={{ left: formData.requiresSizes ? '26px' : '2px' }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </div>
            <input type="checkbox" className="hidden" checked={formData.requiresSizes} onChange={(e) => handleChange('requiresSizes', e.target.checked)} />
          </label>

          <label className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
            <div>
              <span className="block font-bold text-white">Múltiples Salsas</span>
              <span className="text-xs text-zinc-500 font-medium">Activar para Alitas</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.allowMultipleSauces ? 'bg-accent' : 'bg-zinc-700'}`}>
               <motion.div layout className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm" animate={{ left: formData.allowMultipleSauces ? '26px' : '2px' }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </div>
            <input type="checkbox" className="hidden" checked={formData.allowMultipleSauces} onChange={(e) => handleChange('allowMultipleSauces', e.target.checked)} />
          </label>

          {formData.allowMultipleSauces && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2 pl-4 border-l-2 border-accent/30 overflow-hidden">
               <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Límite Mínimo/Máximo de Salsas</label>
               <input 
                  type="number" 
                  min="0"
                  value={formData.maxSauces}
                  onChange={(e) => handleChange('maxSauces', parseInt(e.target.value) || 0)}
                  className="w-full max-w-[120px] bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent font-bold"
                />
            </motion.div>
          )}
        </section>
      </div>

      <footer className="p-8 border-t border-white/5 bg-surface-alt flex gap-4">
        <button 
          type="button"
          onClick={onCancel}
          className="px-6 py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="flex-1 py-4 rounded-2xl font-black text-xl transition-all shadow-xl bg-accent-orange text-white hover:bg-orange-500 disabled:opacity-50 tracking-tighter uppercase italic"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
        </button>
      </footer>
    </form>
  );
};
