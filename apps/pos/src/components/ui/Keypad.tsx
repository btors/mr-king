'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface KeypadProps {
  onKeyPress: (key: string) => void;
  onClear: () => void;
  onBackspace: () => void;
}

export const Keypad: React.FC<KeypadProps> = ({ onKeyPress, onClear, onBackspace }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-xs mx-auto">
      {keys.map((key) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (key === 'C') onClear();
            else if (key === '⌫') onBackspace();
            else onKeyPress(key);
          }}
          className={`
            h-20 w-20 flex items-center justify-center rounded-2xl text-2xl font-semibold transition-colors
            ${key === 'C' ? 'bg-red-500/10 text-red-500' : 
              key === '⌫' ? 'bg-zinc-800 text-zinc-400' : 
              'bg-surface-alt hover:bg-zinc-800 text-white'}
          `}
        >
          {key}
        </motion.button>
      ))}
    </div>
  );
};
