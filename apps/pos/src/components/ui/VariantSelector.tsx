'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface VariantSelectorProps {
  title: string;
  options: { id: string; label: string; price?: number; sublabel?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  columns?: number;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({ title, options, selectedId, onSelect, columns = 3 }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">{title}</h3>
      <div className={`grid grid-cols-${columns} gap-3`}>
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.id)}
            className={`
              p-4 rounded-2xl border-2 text-left transition-all
              ${selectedId === opt.id ? 'border-accent bg-accent text-black' : 'border-white/5 bg-white/5 text-white hover:border-white/10'}
            `}
          >
            <div className="font-bold">{opt.label}</div>
            {opt.price !== undefined && (
              <div className={`text-xs font-bold mt-1 ${selectedId === opt.id ? 'text-black/70' : 'text-accent'}`}>
                ${opt.price}
              </div>
            )}
            {opt.sublabel && (
              <div className="text-[10px] opacity-60 mt-1 uppercase leading-none">{opt.sublabel}</div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
