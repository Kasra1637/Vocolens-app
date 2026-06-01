/**
 * Biometric Store
 *
 * Persists whether the user has enabled biometric (fingerprint / Face ID) app lock.
 * `isUnlocked` is ephemeral — it resets to false on every app launch, so the user
 * must authenticate with their biometric each time they reopen the app.
 *
 * `hasSeenFirstUnlockCelebration` is persisted so the joyful first-unlock animation
 * plays exactly once, ever.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricState {
  /** Whether the user has turned on biometric app lock (persisted). */
  isBiometricEnabled: boolean;
  /** Whether the current session has been unlocked (ephemeral — NOT persisted). */
  isUnlocked: boolean;
  /** Whether the one-time first-unlock celebration has already played (persisted). */
  hasSeenFirstUnlockCelebration: boolean;

  enableBiometric: () => void;
  disableBiometric: () => void;
  setUnlocked: (unlocked: boolean) => void;
  markFirstUnlockCelebrationSeen: () => void;
}

const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      isBiometricEnabled: false,
      isUnlocked: false,
      hasSeenFirstUnlockCelebration: false,

      enableBiometric: () => set({ isBiometricEnabled: true, isUnlocked: true }),
      disableBiometric: () =>
        set({
          isBiometricEnabled: false,
          isUnlocked: false,
          hasSeenFirstUnlockCelebration: false,
        }),
      setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
      markFirstUnlockCelebrationSeen: () =>
        set({ hasSeenFirstUnlockCelebration: true }),
    }),
    {
      name: 'biometric-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the enabled flag + first-celebration flag.
      // isUnlocked always resets to false on launch.
      partialize: (state) => ({
        isBiometricEnabled: state.isBiometricEnabled,
        hasSeenFirstUnlockCelebration: state.hasSeenFirstUnlockCelebration,
      }),
    }
  )
);

export default useBiometricStore;
