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
  status: 'DRAFT' | 'SENT';
  metadata?: {
    size?: string;
    isCombo?: boolean;
    flavor?: string;
    wingCount?: number;
    pizzaConfig?: PizzaConfig;
    isHalfAndHalf?: boolean;
    halfAId?: string;
    halfBId?: string;
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
  addToCart: (item: Omit<CartItem, 'tempId' | 'status'>) => void;
  removeFromCart: (tempId: string) => void;
  updateQuantity: (tempId: string, quantity: number) => void;
  clearCart: () => void;
  fetchTables: () => Promise<void>;
  
  // Getters
  calculateItemPrice: (item: CartItem) => number;
  calculateTotal: () => number;
  submitOrder: () => Promise<boolean>;
  clearEverything: () => void;
  loadTableBill: (tableId: string) => Promise<void>;
  payTable: (tableId: string) => Promise<boolean>;
  clearDrafts: () => void;
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

      logout: () => {
        set({ user: null, selectedTable: null, cart: [] });
        if (typeof window !== 'undefined') {
          window.location.href = '/'; // Go to PIN screen
        }
      },

      setCatalog: (categories, products) => set({ categories, products }),

      selectTable: (table) => {
        // ALWAYS clear the cart first to avoid leakage between tables
        set({ cart: [], selectedTable: table });
        
        // If the table is occupied, load its current bill
        if (table?.status === 'OCCUPIED') {
          get().loadTableBill(table.id);
        }
      },

      addToCart: (item) => set((state) => ({
        cart: [...state.cart, { ...item, tempId: Math.random().toString(36).substring(7), status: 'DRAFT' }]
      })),

      removeFromCart: (tempId) => set((state) => ({
        cart: state.cart.filter((i) => i.tempId !== tempId || i.status === 'SENT')
      })),

      updateQuantity: (tempId, quantity) => set((state) => ({
        cart: state.cart.map((i) => 
          (i.tempId === tempId && i.status === 'DRAFT') ? { ...i, quantity: Math.max(1, quantity) } : i
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
        const draftItems = cart.filter(i => i.status === 'DRAFT');
        
        if (draftItems.length === 0 || !user) return false;

        const payload = {
          waiterId: user.id,
          tableId: selectedTable?.id,
          items: draftItems.map(item => {
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
          
          // Move DRAFT to SENT instead of clearing
          set((state) => ({
            cart: state.cart.map(i => i.status === 'DRAFT' ? { ...i, status: 'SENT' as const } : i)
          }));

          // Refresh tables to reflect OCCUPIED status
          const tables = await api.get<Table[]>('/tables');
          const updatedTable = tables.find(t => t.id === selectedTable?.id);
          set({ tables, selectedTable: updatedTable || selectedTable });
          return true;
        } catch (err) {
          console.error('Order submission failed. Payload:', payload);
          console.error('Error details:', err);
          return false;
        }
      },

      loadTableBill: async (tableId: string) => {
        try {
          const bill = await api.get<{ orders: any[] }>(`/tables/${tableId}/bill`);
          const allItems = bill.orders.flatMap(order => order.items);
          
          const cartItems: CartItem[] = allItems.map(item => ({
            tempId: Math.random().toString(36).substring(7),
            productId: item.productId,
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: Number(item.price),
            status: 'SENT',
            metadata: {
              ...item.pizzaConfig,
              isHalfAndHalf: item.pizzaConfig?.isHalfAndHalf,
              size: item.pizzaConfig?.size,
              halfAId: item.pizzaConfig?.halfA?.productId,
              halfBId: item.pizzaConfig?.halfB?.productId,
            }
          }));
          set({ cart: cartItems });
        } catch (err) {
          console.error('Failed to load table bill:', err);
        }
      },

      payTable: async (tableId: string) => {
        try {
          await api.post(`/tables/${tableId}/pay`, {});
          set({ cart: [], selectedTable: null });
          // Refresh tables to see it available
          const tables = await api.get<Table[]>('/tables');
          set({ tables });
          return true;
        } catch (err) {
          console.error('Failed to pay table:', err);
          return false;
        }
      },

      clearDrafts: () => set((state) => ({
        cart: state.cart.filter(i => i.status === 'SENT')
      })),

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
