import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/types';
import { setToken } from '@/lib/api';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  _storeHydrated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  _setStoreHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      _storeHydrated: false,
      setAuth: (token, user) => {
        setToken(token);
        set({ token, user });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        setToken(null);
        set({ token: null, user: null });
      },
      _setStoreHydrated: () => set({ _storeHydrated: true }),
    }),
    {
      name: 'ghm.auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setToken(state.token);
        // Mark Zustand rehydration as complete
        state?._setStoreHydrated();
      },
    }
  )
);
