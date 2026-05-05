import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED';

export interface OrderItem {
  id: string;
  quantity: number;
  notes?: string;
  price: number;
  product: {
    name: string;
  };
  pizzaConfig?: any;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  orderType?: 'EAT_IN' | 'TAKE_AWAY' | 'DELIVERY';
  clientName?: string;
  table?: {
    number: number;
    type?: 'TABLE' | 'STOOL';
  };
  items: OrderItem[];
}

interface KdsState {
  orders: Order[];
  socket: Socket | null;
  isLoading: boolean;
  isConnected: boolean;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  isAudioEnabled: boolean;
  toggleAudio: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useKdsStore = create<KdsState>((set, get) => ({
  orders: [],
  socket: null,
  isLoading: false,
  isConnected: false,
  isAudioEnabled: false,
  notificationAudio: typeof Audio !== 'undefined' ? new Audio('/sounds/notification.mp3') : null,

  toggleAudio: () => {
    const { isAudioEnabled, notificationAudio } = get();
    if (!isAudioEnabled && notificationAudio) {
      // Play and pause immediately to "unlock" the audio object on interaction
      notificationAudio.play().then(() => {
        notificationAudio.pause();
        notificationAudio.currentTime = 0;
      }).catch(e => console.log('Audio unlock failed:', e));
    }
    set({ isAudioEnabled: !isAudioEnabled });
  },

  connect: () => {
    if (get().socket) return;

    const socket = io(`${API_BASE_URL}/orders`);

    socket.on('connect', () => {
      console.log('Connected to KDS Gateway');
      set({ isConnected: true });
      get().fetchOrders(); // Re-sync when connection is established
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from KDS Gateway');
      set({ isConnected: false });
    });

    socket.on('connect_error', () => {
      console.log('KDS Connection Error');
      set({ isConnected: false });
    });

    socket.on('orderCreated', (newOrder: Order) => {
      console.log('New order received:', newOrder);
      
      // Play notification sound
      if (get().isAudioEnabled && get().notificationAudio) {
        get().notificationAudio?.play().catch(e => console.log('Audio play blocked:', e));
      }

      set((state) => ({ orders: [newOrder, ...state.orders] }));
    });

    socket.on('orderStatusChanged', ({ orderId, status }: { orderId: string, status: OrderStatus }) => {
      console.log('Order status changed:', orderId, status);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/orders?place=KITCHEN`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      set({ orders: data });
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      // Update local state immediately for snappy UX, 
      // though socket will also confirm it
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      }));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  },
}));
