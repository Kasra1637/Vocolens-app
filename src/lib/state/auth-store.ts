/**
 * Authentication Store
 *
 * Manages authentication state using Zustand.
 * Tracks whether the user is authenticated and PIN setup status.
 */

import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isPinSetup: boolean;
  isLoading: boolean;

  setAuthenticated: (authenticated: boolean) => void;
  setPinSetup: (setup: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isPinSetup: false,
  isLoading: true,

  setAuthenticated: (authenticated: boolean) => set({ isAuthenticated: authenticated }),
  setPinSetup: (setup: boolean) => set({ isPinSetup: setup }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  logout: () => set({ isAuthenticated: false }),
}));
