/**
 * biometric-store tests
 *
 * Verifies every state transition in the biometric Zustand store including the
 * new needsPinReAuth invalidation flag added for adaptive authentication.
 *
 * AsyncStorage is mocked so the persistence layer is exercised without a device.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:     jest.fn(() => Promise.resolve(null)),
  setItem:     jest.fn(() => Promise.resolve()),
  removeItem:  jest.fn(() => Promise.resolve()),
  mergeItem:   jest.fn(() => Promise.resolve()),
  clear:       jest.fn(() => Promise.resolve()),
  getAllKeys:   jest.fn(() => Promise.resolve([])),
  multiGet:    jest.fn(() => Promise.resolve([])),
  multiSet:    jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

import useBiometricStore from '../lib/state/biometric-store';

// Helper: get a fresh store instance by resetting to initial state
function resetStore() {
  useBiometricStore.setState({
    isBiometricEnabled:            false,
    isUnlocked:                    false,
    hasSeenFirstUnlockCelebration: false,
    needsPinReAuth:                false,
  });
}

describe('biometric-store', () => {
  beforeEach(resetStore);

  // ── Initial state ──────────────────────────────────────────────────────────
  it('starts with everything false', () => {
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled).toBe(false);
    expect(s.isUnlocked).toBe(false);
    expect(s.hasSeenFirstUnlockCelebration).toBe(false);
    expect(s.needsPinReAuth).toBe(false);
  });

  // ── enableBiometric ────────────────────────────────────────────────────────
  it('enableBiometric sets isBiometricEnabled and isUnlocked to true', () => {
    useBiometricStore.getState().enableBiometric();
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled).toBe(true);
    expect(s.isUnlocked).toBe(true);
  });

  // ── disableBiometric ───────────────────────────────────────────────────────
  it('disableBiometric resets all flags including needsPinReAuth', () => {
    // First put store in a "fully enabled + invalidated" state
    useBiometricStore.setState({
      isBiometricEnabled: true,
      isUnlocked: true,
      hasSeenFirstUnlockCelebration: true,
      needsPinReAuth: true,
    });
    useBiometricStore.getState().disableBiometric();
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled).toBe(false);
    expect(s.isUnlocked).toBe(false);
    expect(s.hasSeenFirstUnlockCelebration).toBe(false);
    expect(s.needsPinReAuth).toBe(false);
  });

  // ── setUnlocked ────────────────────────────────────────────────────────────
  it('setUnlocked(true) marks session as unlocked', () => {
    useBiometricStore.getState().setUnlocked(true);
    expect(useBiometricStore.getState().isUnlocked).toBe(true);
  });

  it('setUnlocked(false) locks the session', () => {
    useBiometricStore.setState({ isUnlocked: true });
    useBiometricStore.getState().setUnlocked(false);
    expect(useBiometricStore.getState().isUnlocked).toBe(false);
  });

  // ── markFirstUnlockCelebrationSeen ────────────────────────────────────────
  it('markFirstUnlockCelebrationSeen persists the flag', () => {
    useBiometricStore.getState().markFirstUnlockCelebrationSeen();
    expect(useBiometricStore.getState().hasSeenFirstUnlockCelebration).toBe(true);
  });

  // ── markBiometricInvalidated ──────────────────────────────────────────────
  it('markBiometricInvalidated sets needsPinReAuth=true and locks the session', () => {
    useBiometricStore.setState({ isBiometricEnabled: true, isUnlocked: true });
    useBiometricStore.getState().markBiometricInvalidated();
    const s = useBiometricStore.getState();
    expect(s.needsPinReAuth).toBe(true);
    expect(s.isUnlocked).toBe(false);        // session must be re-authenticated
    expect(s.isBiometricEnabled).toBe(true); // biometric is still "enabled" — just needs re-reg
  });

  // ── clearBiometricInvalidation ─────────────────────────────────────────────
  it('clearBiometricInvalidation resets needsPinReAuth to false', () => {
    useBiometricStore.setState({ needsPinReAuth: true });
    useBiometricStore.getState().clearBiometricInvalidation();
    expect(useBiometricStore.getState().needsPinReAuth).toBe(false);
  });

  // ── Full invalidation cycle ────────────────────────────────────────────────
  it('correctly models the full biometric invalidation → PIN → re-register cycle', () => {
    // 1. User has biometric enabled and is unlocked
    useBiometricStore.getState().enableBiometric();
    expect(useBiometricStore.getState().isUnlocked).toBe(true);

    // 2. OS reports biometric change → mark invalidated
    useBiometricStore.getState().markBiometricInvalidated();
    let s = useBiometricStore.getState();
    expect(s.needsPinReAuth).toBe(true);
    expect(s.isUnlocked).toBe(false);

    // 3. User enters correct PIN → clear invalidation flag
    useBiometricStore.getState().clearBiometricInvalidation();
    s = useBiometricStore.getState();
    expect(s.needsPinReAuth).toBe(false);

    // 4. Re-enrolment biometric prompt succeeds → re-enable biometric
    useBiometricStore.getState().enableBiometric();
    s = useBiometricStore.getState();
    expect(s.isBiometricEnabled).toBe(true);
    expect(s.isUnlocked).toBe(true);
    expect(s.needsPinReAuth).toBe(false);
  });
});
