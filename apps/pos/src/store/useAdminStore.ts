import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
  isAdminUnlocked: boolean;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      isAdminUnlocked: false,

      unlockAdmin: (pin: string) => {
        if (pin === '9999') {
          set({ isAdminUnlocked: true });
          return true;
        }
        return false;
      },

      lockAdmin: () => set({ isAdminUnlocked: false }),
    }),
    {
      name: 'mr-king-admin-storage',
    }
  )
);
