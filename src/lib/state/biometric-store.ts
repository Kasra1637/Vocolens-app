/**
 * Biometric Store
 *
 * Persists whether the user has enabled biometric (fingerprint / Face ID) app lock.
 * `isUnlocked` is ephemeral — it resets to false on every app launch, so the user
 * must authenticate with their biometric each time they reopen the app.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricState {
  /** Whether the user has turned on biometric app lock (persisted). */
  isBiometricEnabled: boolean;
  /** Whether the current session has been unlocked (ephemeral — NOT persisted). */
  isUnlocked: boolean;

  enableBiometric: () => void;
  disableBiometric: () => void;
  setUnlocked: (unlocked: boolean) => void;
}

const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      isBiometricEnabled: false,
      isUnlocked: false,

      enableBiometric: () => set({ isBiometricEnabled: true, isUnlocked: true }),
      disableBiometric: () =>
        set({ isBiometricEnabled: false, isUnlocked: false }),
      setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
    }),
    {
      name: 'biometric-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the enabled flag. isUnlocked always resets to false on launch.
      partialize: (state) => ({ isBiometricEnabled: state.isBiometricEnabled }),
    }
  )
);

export default useBiometricStore;
