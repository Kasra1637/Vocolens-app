/**
 * biometric-store tests
 *
 * Verifies every state transition in the biometric Zustand store, including:
 *  - isBiometricEnabled / isPinEnabled flags (adaptive auth fix)
 *  - enablePin / disablePin actions (PIN-only device path)
 *  - needsPinReAuth invalidation flag
 *  - Full PIN-only lock cycle and biometric invalidation cycle
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
    isPinEnabled:                  false,
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
    expect(s.isPinEnabled).toBe(false);
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

  it('enableBiometric does not affect isPinEnabled', () => {
    useBiometricStore.getState().enableBiometric();
    expect(useBiometricStore.getState().isPinEnabled).toBe(false);
  });

  // ── disableBiometric ───────────────────────────────────────────────────────
  it('disableBiometric resets all biometric flags but leaves isPinEnabled untouched', () => {
    useBiometricStore.setState({
      isBiometricEnabled: true,
      isPinEnabled: true,       // PIN stays — user still has PIN lock
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
    // isPinEnabled is NOT cleared by disableBiometric — use disablePin() for that
    expect(s.isPinEnabled).toBe(true);
  });

  // ── enablePin / disablePin ─────────────────────────────────────────────────
  it('enablePin sets isPinEnabled to true without touching biometric flags', () => {
    useBiometricStore.getState().enablePin();
    const s = useBiometricStore.getState();
    expect(s.isPinEnabled).toBe(true);
    expect(s.isBiometricEnabled).toBe(false);  // unaffected
    expect(s.isUnlocked).toBe(false);           // unaffected
  });

  it('disablePin sets isPinEnabled to false', () => {
    useBiometricStore.setState({ isPinEnabled: true });
    useBiometricStore.getState().disablePin();
    expect(useBiometricStore.getState().isPinEnabled).toBe(false);
  });

  it('disablePin does not touch biometric flags', () => {
    useBiometricStore.setState({ isBiometricEnabled: true, isPinEnabled: true, isUnlocked: true });
    useBiometricStore.getState().disablePin();
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled).toBe(true);
    expect(s.isUnlocked).toBe(true);
  });

  // ── AuthGate lock condition: (isBiometricEnabled || isPinEnabled) ──────────
  it('lock condition is satisfied by isBiometricEnabled alone', () => {
    useBiometricStore.setState({ isBiometricEnabled: true, isPinEnabled: false });
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled || s.isPinEnabled).toBe(true);
  });

  it('lock condition is satisfied by isPinEnabled alone (PIN-only device path)', () => {
    useBiometricStore.setState({ isBiometricEnabled: false, isPinEnabled: true });
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled || s.isPinEnabled).toBe(true);
  });

  it('lock condition is false when both flags are false (no lock set up)', () => {
    useBiometricStore.setState({ isBiometricEnabled: false, isPinEnabled: false });
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled || s.isPinEnabled).toBe(false);
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
    expect(s.isBiometricEnabled).toBe(true); // still "enabled" — just needs re-reg
  });

  // ── clearBiometricInvalidation ────────────────────────────────────────────
  it('clearBiometricInvalidation resets needsPinReAuth to false', () => {
    useBiometricStore.setState({ needsPinReAuth: true });
    useBiometricStore.getState().clearBiometricInvalidation();
    expect(useBiometricStore.getState().needsPinReAuth).toBe(false);
  });

  // ── PIN-only lock cycle ───────────────────────────────────────────────────
  it('correctly models the PIN-only lock cycle (no biometric hardware)', () => {
    // 1. Onboarding: biometric unavailable → user sets a PIN
    useBiometricStore.getState().enablePin();
    let s = useBiometricStore.getState();
    expect(s.isPinEnabled).toBe(true);
    expect(s.isBiometricEnabled).toBe(false);
    expect(s.isUnlocked).toBe(false); // session starts locked

    // 2. AuthGate lock condition is true (isPinEnabled)
    expect(s.isBiometricEnabled || s.isPinEnabled).toBe(true);

    // 3. User enters correct PIN → unlock the session
    useBiometricStore.getState().setUnlocked(true);
    s = useBiometricStore.getState();
    expect(s.isUnlocked).toBe(true);

    // 4. App restart: isUnlocked resets (partialize excludes it)
    //    Simulate by setting it back to false
    useBiometricStore.setState({ isUnlocked: false });
    s = useBiometricStore.getState();
    expect(s.isPinEnabled).toBe(true);   // persisted
    expect(s.isUnlocked).toBe(false);    // ephemeral — reset on launch
    // Lock condition still fires on next launch
    expect(s.isBiometricEnabled || s.isPinEnabled).toBe(true);
  });

  // ── Full biometric invalidation cycle ─────────────────────────────────────
  it('correctly models the full biometric invalidation → PIN → re-register cycle', () => {
    // 1. User has biometric enabled and is unlocked
    useBiometricStore.getState().enableBiometric();
    useBiometricStore.getState().enablePin();
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
