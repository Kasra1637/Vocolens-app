/**
 * PIN Store
 *
 * In-memory mirror of PIN state. The ACTUAL PIN hash is stored securely in
 * SecureStore via auth-service.ts — this store only tracks whether a PIN is
 * set (for UI gating) and holds an ephemeral hash for fast in-memory checks.
 *
 * isPinVerified is ephemeral (resets on restart) — ensures re-auth every launch.
 * pinHash is ephemeral — never persisted to AsyncStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PinState {
  /** Hash of the PIN (ephemeral — NOT persisted, used for fast in-memory checks) */
  pinHash: string | null;
  /** Whether a PIN has been set (persisted for UI gating) */
  isPinSet: boolean;
  /** Whether PIN has been verified this session (ephemeral — NOT persisted) */
  isPinVerified: boolean;

  /** Called by auth-service when a PIN is set (receives the raw PIN for backwards compat) */
  setPin: (pin: string) => void;
  /** Synchronous check — only used as fallback, auth-service is authoritative */
  verifyPin: (entered: string) => boolean;
  setPinVerified: (verified: boolean) => void;
  clearPin: () => void;
}

const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      isPinSet: false,
      isPinVerified: false,

      setPin: (pin) => set({ pinHash: pin, isPinSet: true }),

      verifyPin: (entered) => {
        // This synchronous check is a fallback only.
        // The authoritative async verification uses auth-service.ts → SecureStore.
        const correct = get().pinHash === entered;
        if (correct) set({ isPinVerified: true });
        return correct;
      },

      setPinVerified: (verified) => set({ isPinVerified: verified }),

      clearPin: () => set({ pinHash: null, isPinSet: false, isPinVerified: false }),
    }),
    {
      name: 'pin-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: any, version: number) => {
        // v0 → v1: ensure isPinSet flag exists with a safe default.
        if (version < 1) {
          return { isPinSet: persisted?.isPinSet ?? false };
        }
        return persisted;
      },
      // Only persist isPinSet flag. pinHash and isPinVerified are ephemeral.
      partialize: (state) => ({ isPinSet: state.isPinSet }),
    }
  )
);

export default usePinStore;
