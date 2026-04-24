/**
 * PIN Store
 * Persists the user's hashed PIN. isPinVerified is ephemeral (resets on restart).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PinState {
  pin: string | null;
  isPinSet: boolean;
  isPinVerified: boolean; // ephemeral — NOT persisted

  setPin: (pin: string) => void;
  verifyPin: (entered: string) => boolean;
  setPinVerified: (verified: boolean) => void;
  clearPin: () => void;
}

const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pin: null,
      isPinSet: false,
      isPinVerified: false,

      setPin: (pin) => set({ pin, isPinSet: true }),

      verifyPin: (entered) => {
        const correct = get().pin === entered;
        if (correct) set({ isPinVerified: true });
        return correct;
      },

      setPinVerified: (verified) => set({ isPinVerified: verified }),

      clearPin: () => set({ pin: null, isPinSet: false, isPinVerified: false }),
    }),
    {
      name: 'pin-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist pin + isPinSet. isPinVerified resets to false on every launch.
      partialize: (state) => ({ pin: state.pin, isPinSet: state.isPinSet }),
    }
  )
);

export default usePinStore;
