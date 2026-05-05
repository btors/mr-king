'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';

export interface Variant {
  name: string;
  price: number;
}

export interface ProductFormData {
  id?: string;
  name: string;
  categoryId: string;
  isActive: boolean;
  variants: Variant[];
  flavors?: string[];
  maxFlavors?: number;
}

interface ProductFormProps {
  initialData?: any | null;
  categories: { id: string; name: string }[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  initialData, 
  categories, 
  onSubmit, 
  onCancel,
  isSubmitting = false
}) => {
  const [flavorInput, setFlavorInput] = useState('');
  
  const { register, control, handleSubmit, watch, setValue, reset } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      categoryId: '',
      isActive: true,
      variants: [{ name: 'Única', price: 0 }],
      flavors: [],
      maxFlavors: 1
    }
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: "variants"
  });

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const categoryName = selectedCategory?.name.toLowerCase() || '';

  const variants = watch('variants');
  const flavors = watch('flavors') || [];

  // Sync initial data
  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id,
        name: initialData.name,
        categoryId: initialData.categoryId,
        isActive: initialData.isActive,
        variants: initialData.variants && initialData.variants.length > 0 
          ? initialData.variants 
          : [{ name: 'Única', price: Number(initialData.price) || 0 }],
        flavors: initialData.flavors || [],
        maxFlavors: initialData.maxFlavors || 1
      });
    } else {
      reset({
        name: '',
        categoryId: categories[0]?.id || '',
        isActive: true,
        variants: [{ name: 'Única', price: 0 }],
        flavors: [],
        maxFlavors: 1
      });
    }
  }, [initialData, categories, reset]);

  // Specialized logic when category changes
  useEffect(() => {
    if (initialData) return; // Don't overwrite if editing

    if (categoryName.includes('pizza')) {
      setValue('variants', [
        { name: 'MD', price: 0 },
        { name: 'GD', price: 0 },
        { name: 'FM', price: 0 }
      ]);
    } else if (categoryName.includes('hamburguesa') || categoryName.includes('hot dog')) {
      setValue('variants', [
        { name: 'Sola', price: 0 },
        { name: 'Con Papas', price: 0 }
      ]);
    } else if (categoryName.includes('alita') || categoryName.includes('boneless')) {
      setValue('variants', [{ name: '6 pz', price: 0 }]);
    } else {
      setValue('variants', [{ name: 'Única', price: 0 }]);
    }
  }, [categoryName, setValue, initialData]);

  const addFlavor = () => {
    if (flavorInput.trim() && !flavors.includes(flavorInput.trim())) {
      setValue('flavors', [...flavors, flavorInput.trim()]);
      setFlavorInput('');
    }
  };

  const removeFlavor = (flavor: string) => {
    setValue('flavors', flavors.filter(f => f !== flavor));
  };

  const onFormSubmit = (data: ProductFormData) => {
    // Ensure numeric types
    const formattedData = {
      ...data,
      variants: data.variants.map(v => ({ ...v, price: Number(v.price) })),
      maxFlavors: Number(data.maxFlavors)
    };
    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col h-full bg-surface-alt border-l border-white/5 shadow-2xl relative z-20 w-full max-w-md">
      <header className="p-8 border-b border-white/5 bg-surface">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
          {initialData ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
        <p className="text-zinc-500 font-medium text-sm mt-1 tracking-wide">
          Configuración avanzada de variantes y sabores.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {/* Core Info */}
        <section className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Nombre del Producto</label>
            <input 
              {...register('name', { required: true })}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent font-bold"
              placeholder="Ej. Pizza Mexicana"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Categoría</label>
            <select 
              {...register('categoryId', { required: true })}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent appearance-none font-bold"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Dynamic Variants Section */}
        <section className="space-y-4 pt-6 border-t border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-accent">Precios y Variantes</h3>
            {(categoryName.includes('alita') || categoryName.includes('boneless') || categoryName === '') && (
              <button 
                type="button"
                onClick={() => appendVariant({ name: '', price: 0 })}
                className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg font-black uppercase tracking-widest transition-colors"
              >
                + Agregar
              </button>
            )}
          </div>

          <div className="space-y-3">
            {variantFields.map((field, index) => {
              const isFixedName = categoryName.includes('pizza') || categoryName.includes('hamburguesa') || categoryName.includes('hot dog');
              
              return (
                <div key={field.id} className="flex gap-3 items-center">
                  <input 
                    {...register(`variants.${index}.name` as const, { required: true })}
                    readOnly={isFixedName}
                    placeholder="Nombre (ej. MD)"
                    className={`flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-bold uppercase tracking-tight ${isFixedName ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <div className="w-32 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 font-bold text-xs">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      {...register(`variants.${index}.price` as const, { required: true, valueAsNumber: true })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-6 pr-4 py-2.5 text-xs text-amber-500 font-black italic"
                    />
                  </div>
                  {variantFields.length > 1 && (categoryName.includes('alita') || categoryName.includes('boneless')) && (
                    <button 
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Flavors Section (Only for Wings/Boneless) */}
        {(categoryName.includes('alita') || categoryName.includes('boneless')) && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pt-6 border-t border-white/5"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black uppercase italic tracking-tighter text-blue-400">Sabores Disponibles</h3>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Máx:</label>
                <input 
                  type="number"
                  {...register('maxFlavors')}
                  className="w-12 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <input 
                value={flavorInput}
                onChange={(e) => setFlavorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFlavor())}
                placeholder="Ej. BBQ, Mango Habanero..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
              />
              <button 
                type="button"
                onClick={addFlavor}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl font-bold text-xs uppercase hover:bg-blue-500/30 transition-all"
              >
                +
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {flavors.map(flavor => (
                <span 
                  key={flavor}
                  className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group"
                >
                  {flavor}
                  <button 
                    type="button"
                    onClick={() => removeFlavor(flavor)}
                    className="hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              {flavors.length === 0 && <p className="text-[10px] text-zinc-600 font-bold italic uppercase tracking-widest">Sin sabores configurados</p>}
            </div>
          </motion.section>
        )}

        {/* Visibility */}
        <section className="space-y-4 pt-6 border-t border-white/5">
          <label className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
            <div>
              <span className="block font-bold text-white">Disponible para Venta</span>
              <span className="text-xs text-zinc-500 font-medium">Desactívalo si no hay inventario</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${watch('isActive') ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
              <motion.div 
                layout
                className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                animate={{ left: watch('isActive') ? '26px' : '2px' }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </div>
            <input type="checkbox" {...register('isActive')} className="hidden" />
          </label>
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
