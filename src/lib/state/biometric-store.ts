/**
 * Biometric Store
 *
 * Persists whether the user has enabled biometric (fingerprint / Face ID) app lock
 * AND/OR a PIN-only lock (for devices without biometric hardware).
 *
 * Lock-screen gating logic (used by AuthGate):
 *   • isBiometricEnabled — user enrolled biometrics; show fingerprint prompt on launch.
 *   • isPinEnabled        — user set a PIN (may be the sole method OR the biometric backup).
 *                           AuthGate shows the lock screen whenever EITHER flag is true
 *                           and the session is not yet unlocked.
 *
 * `isUnlocked` is ephemeral — it resets to false on every app launch so the user
 * must authenticate each time they reopen the app.
 *
 * `needsPinReAuth` is persisted. Set to true when the OS reports that the enrolled
 * biometrics have changed (e.g. the user added/removed a fingerprint). The app will
 * require a successful PIN entry before re-registering the new biometric state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BiometricState {
  /** Whether the user has turned on biometric app lock (persisted). */
  isBiometricEnabled: boolean;
  /**
   * Whether the user has set a PIN (persisted).
   * True for both "PIN-only" devices and "biometric + PIN backup" devices.
   * AuthGate uses this to show the lock screen even when isBiometricEnabled is false.
   */
  isPinEnabled: boolean;
  /** Whether the current session has been unlocked (ephemeral — NOT persisted). */
  isUnlocked: boolean;
  /**
   * True when the OS invalidated the previously enrolled biometric token (e.g. a
   * fingerprint was added or removed). The app must authenticate via PIN first,
   * then call clearBiometricInvalidation() to re-register. (persisted)
   */
  needsPinReAuth: boolean;

  enableBiometric: () => void;
  disableBiometric: () => void;
  /** Called when the user successfully sets a PIN (with or without biometric). */
  enablePin: () => void;
  /** Called when the PIN is removed (e.g. account deletion). */
  disablePin: () => void;
  setUnlocked: (unlocked: boolean) => void;
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
      isPinEnabled: false,
      isUnlocked: false,
      needsPinReAuth: false,

      enableBiometric: () => set({ isBiometricEnabled: true }),
      disableBiometric: () =>
        set({
          isBiometricEnabled: false,
          isUnlocked: false,
          needsPinReAuth: false,
        }),
      enablePin: () => set({ isPinEnabled: true }),
      disablePin: () => set({ isPinEnabled: false }),
      setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
      markBiometricInvalidated: () =>
        set({ needsPinReAuth: true, isUnlocked: false }),
      clearBiometricInvalidation: () =>
        set({ needsPinReAuth: false }),
    }),
    {
      name: 'biometric-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // isUnlocked always resets to false on launch — everything else is persisted.
      partialize: (state) => ({
        isBiometricEnabled: state.isBiometricEnabled,
        isPinEnabled: state.isPinEnabled,
        needsPinReAuth: state.needsPinReAuth,
      }),
    }
  )
);

export default useBiometricStore;
