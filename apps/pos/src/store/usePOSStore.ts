import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

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
  tables: Table[];
  
  // Actions
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  setCatalog: (categories: any[], products: any[]) => void;
  selectTable: (table: Table | null) => void;
  addToCart: (item: Omit<CartItem, 'tempId'>) => void;
  removeFromCart: (tempId: string) => void;
  updateQuantity: (tempId: string, quantity: number) => void;
  clearCart: () => void;
  fetchTables: () => Promise<void>;
  
  // Getters
  calculateItemPrice: (item: CartItem) => number;
  calculateTotal: () => number;
  submitOrder: () => Promise<boolean>;
  clearEverything: () => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      user: null,
      selectedTable: null,
      cart: [],
      categories: [],
      products: [],
      tables: [],

      login: async (pin: string) => {
        try {
          // Fetch dynamic PINs and IDs from backend
          const pins = await api.get<{ 
            adminPin: string; 
            waiterPin: string;
            adminId: string;
            waiterId: string;
          }>('/auth/pin');
          
          if (pin === pins.adminPin) {
            set({ user: { id: pins.adminId, name: 'Admin King', role: 'ADMIN' } });
            return true;
          }
          if (pin === pins.waiterPin) {
            set({ user: { id: pins.waiterId, name: 'Mesero Pro', role: 'WAITER' } });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Login failed:', err);
          return false;
        }
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

      fetchTables: async () => {
        try {
          const tables = await api.get<Table[]>('/tables');
          set({ tables });
        } catch (err) {
          console.error('Failed to fetch tables:', err);
        }
      },

      calculateItemPrice: (item) => {
        return item.unitPrice * item.quantity;
      },

      calculateTotal: () => {
        const { cart, calculateItemPrice } = get();
        return cart.reduce((total, item) => total + calculateItemPrice(item), 0);
      },

      submitOrder: async () => {
        const { cart, user, selectedTable } = get();
        if (cart.length === 0 || !user) return false;

        const payload = {
          waiterId: user.id,
          tableId: selectedTable?.id,
          items: cart.map(item => {
            const config: any = {};
            if (item.metadata) {
              config.isHalfAndHalf = !!item.metadata.isHalfAndHalf;
              if (item.metadata.size) config.size = item.metadata.size;
              if (item.metadata.isCombo) config.isCombo = true;
              
              // Pizza halves mapping
              if (item.metadata.halfAId) {
                config.halfA = { productId: item.metadata.halfAId };
              }
              if (item.metadata.halfBId) {
                config.halfB = { productId: item.metadata.halfBId };
              }
            }

            return {
              productId: item.productId,
              quantity: item.quantity,
              price: item.unitPrice,
              notes: item.notes,
              config
            };
          }),
          orderType: 'EAT_IN'
        };

        try {
          await api.post('/orders', payload);
          set({ cart: [] });
          return true;
        } catch (err) {
          console.error('Order submission failed. Payload:', payload);
          console.error('Error details:', err);
          return false;
        }
      },

      clearEverything: () => {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          set({ user: null, selectedTable: null, cart: [] });
          window.location.reload();
        }
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
