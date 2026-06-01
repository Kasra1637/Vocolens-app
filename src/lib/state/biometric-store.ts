/**
 * Biometric Store
 *
 * Persists whether the user has enabled biometric (fingerprint / Face ID) app lock.
 * `isUnlocked` is ephemeral — it resets to false on every app launch, so the user
 * must authenticate with their biometric each time they reopen the app.
 *
 * `hasSeenFirstUnlockCelebration` is persisted so the joyful first-unlock animation
 * plays exactly once, ever.
 *
 * `needsPinReAuth` is persisted. Set to true when the OS reports that the enrolled
 * biometrics have changed (e.g. the user added/removed a fingerprint).  The app
 * will then require a successful PIN entry before re-registering the new biometric
 * state, keeping the trust chain intact.
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
  /**
   * True when the OS invalidated the previously enrolled biometric token (e.g. a
   * fingerprint was added or removed). The app must authenticate via PIN first,
   * then call clearBiometricInvalidation() to re-register. (persisted)
   */
  needsPinReAuth: boolean;

  enableBiometric: () => void;
  disableBiometric: () => void;
  setUnlocked: (unlocked: boolean) => void;
  markFirstUnlockCelebrationSeen: () => void;
  /** Called when the OS signals that enrolled biometrics have changed. */
  markBiometricInvalidated: () => void;
  /**
   * Called after the user successfully re-authenticates with their PIN following
   * a biometric invalidation. Clears the flag so biometric can be re-enrolled.
   */
  clearBiometricInvalidation: () => void;
}

const useBiometricStore = create<BiometricState>()(
  persist(
    (set) => ({
      isBiometricEnabled: false,
      isUnlocked: false,
      hasSeenFirstUnlockCelebration: false,
      needsPinReAuth: false,

      enableBiometric: () => set({ isBiometricEnabled: true, isUnlocked: true }),
      disableBiometric: () =>
        set({
          isBiometricEnabled: false,
          isUnlocked: false,
          hasSeenFirstUnlockCelebration: false,
          needsPinReAuth: false,
        }),
      setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
      markFirstUnlockCelebrationSeen: () =>
        set({ hasSeenFirstUnlockCelebration: true }),
      markBiometricInvalidated: () =>
        set({ needsPinReAuth: true, isUnlocked: false }),
      clearBiometricInvalidation: () =>
        set({ needsPinReAuth: false }),
    }),
    {
      name: 'biometric-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the enabled flag, first-celebration flag, and invalidation flag.
      // isUnlocked always resets to false on launch.
      partialize: (state) => ({
        isBiometricEnabled: state.isBiometricEnabled,
        hasSeenFirstUnlockCelebration: state.hasSeenFirstUnlockCelebration,
        needsPinReAuth: state.needsPinReAuth,
      }),
    }
  )
);

export default useBiometricStore;
