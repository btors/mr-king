import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ADMIN' | 'WAITER' | 'KITCHEN';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Table {
  id: string;
  number: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE';
}

export interface Product {
  id: string;
  name: string;
  price: string | number; // Decimal from API
  categoryId: string;
  description?: string;
  image?: string;
  isActive: boolean;
  requiresSizes: boolean;
  allowMultipleSauces: boolean;
  maxSauces: number;
}

export interface PizzaConfig {
  size: 'MD' | 'GD' | 'FM';
  isHalfAndHalf: boolean;
  halfA?: { id: string; name: string; prices: { MD: number; GD: number; FM: number } };
  halfB?: { id: string; name: string; prices: { MD: number; GD: number; FM: number } };
}

export interface CartItem {
  tempId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // Final calculated unit price
  metadata?: {
    size?: string;
    isCombo?: boolean;
    flavor?: string;
    wingCount?: number;
    pizzaConfig?: PizzaConfig;
  };
  notes?: string;
}

interface POSState {
  user: User | null;
  selectedTable: Table | null;
  cart: CartItem[];
  categories: { id: string; name: string }[];
  products: Product[];
  
  // Actions
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  setCatalog: (categories: any[], products: any[]) => void;
  selectTable: (table: Table | null) => void;
  addToCart: (item: Omit<CartItem, 'tempId'>) => void;
  removeFromCart: (tempId: string) => void;
  updateQuantity: (tempId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Getters
  calculateItemPrice: (item: CartItem) => number;
  calculateTotal: () => number;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      user: null,
      selectedTable: null,
      cart: [],
      categories: [],
      products: [],

      login: async (pin: string) => {
        // Mock PIN logic: 1234 -> Admin, 0000 -> Waiter
        // In reality, this would call the API
        if (pin === '1234') {
          set({ user: { id: 'u1', name: 'Admin King', role: 'ADMIN' } });
          return true;
        }
        if (pin === '0000') {
          set({ user: { id: 'u2', name: 'Mesero Pro', role: 'WAITER' } });
          return true;
        }
        return false;
      },

      logout: () => set({ user: null, selectedTable: null, cart: [] }),

      setCatalog: (categories, products) => set({ categories, products }),

      selectTable: (table) => set({ selectedTable: table }),

      addToCart: (item) => set((state) => ({
        cart: [...state.cart, { ...item, tempId: Math.random().toString(36).substring(7) }]
      })),

      removeFromCart: (tempId) => set((state) => ({
        cart: state.cart.filter((i) => i.tempId !== tempId)
      })),

      updateQuantity: (tempId, quantity) => set((state) => ({
        cart: state.cart.map((i) => 
          i.tempId === tempId ? { ...i, quantity: Math.max(1, quantity) } : i
        )
      })),

      clearCart: () => set({ cart: [] }),

      calculateItemPrice: (item) => {
        return item.unitPrice * item.quantity;
      },

      calculateTotal: () => {
        const { cart, calculateItemPrice } = get();
        return cart.reduce((total, item) => total + calculateItemPrice(item), 0);
      },
    }),
    {
      name: 'mr-king-pos-storage',
      partialize: (state) => ({ 
        user: state.user, 
        selectedTable: state.selectedTable, 
        cart: state.cart 
      }),
    }
  )
);
