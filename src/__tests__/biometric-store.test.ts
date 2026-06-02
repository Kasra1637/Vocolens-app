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
    isBiometricEnabled: false,
    isPinEnabled:       false,
    isUnlocked:         false,
    needsPinReAuth:     false,
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
    expect(s.needsPinReAuth).toBe(false);
  });

  // ── enableBiometric ────────────────────────────────────────────────────────
  it('enableBiometric sets isBiometricEnabled to true', () => {
    useBiometricStore.getState().enableBiometric();
    expect(useBiometricStore.getState().isBiometricEnabled).toBe(true);
  });

  it('enableBiometric does not affect isPinEnabled', () => {
    useBiometricStore.getState().enableBiometric();
    expect(useBiometricStore.getState().isPinEnabled).toBe(false);
  });

  // ── disableBiometric ───────────────────────────────────────────────────────
  it('disableBiometric resets all biometric flags but leaves isPinEnabled untouched', () => {
    useBiometricStore.setState({
      isBiometricEnabled: true,
      isPinEnabled:       true,
      isUnlocked:         true,
      needsPinReAuth:     true,
    });
    useBiometricStore.getState().disableBiometric();
    const s = useBiometricStore.getState();
    expect(s.isBiometricEnabled).toBe(false);
    expect(s.isUnlocked).toBe(false);
    expect(s.needsPinReAuth).toBe(false);
    // isPinEnabled is NOT cleared by disableBiometric — use disablePin() for that
    expect(s.isPinEnabled).toBe(true);
  });

  // ── enablePin / disablePin ─────────────────────────────────────────────────
  it('enablePin sets isPinEnabled to true without touching biometric flags', () => {
    useBiometricStore.getState().enablePin();
    const s = useBiometricStore.getState();
    expect(s.isPinEnabled).toBe(true);
    expect(s.isBiometricEnabled).toBe(false);
    expect(s.isUnlocked).toBe(false);
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

  // ── markBiometricInvalidated ──────────────────────────────────────────────
  it('markBiometricInvalidated sets needsPinReAuth=true and locks the session', () => {
    useBiometricStore.setState({ isBiometricEnabled: true, isUnlocked: true });
    useBiometricStore.getState().markBiometricInvalidated();
    const s = useBiometricStore.getState();
    expect(s.needsPinReAuth).toBe(true);
    expect(s.isUnlocked).toBe(false);
    expect(s.isBiometricEnabled).toBe(true);
  });

  // ── clearBiometricInvalidation ────────────────────────────────────────────
  it('clearBiometricInvalidation resets needsPinReAuth to false', () => {
    useBiometricStore.setState({ needsPinReAuth: true });
    useBiometricStore.getState().clearBiometricInvalidation();
    expect(useBiometricStore.getState().needsPinReAuth).toBe(false);
  });

  // ── PIN-only lock cycle ───────────────────────────────────────────────────
  it('correctly models the PIN-only lock cycle (no biometric hardware)', () => {
    useBiometricStore.getState().enablePin();
    let s = useBiometricStore.getState();
    expect(s.isPinEnabled).toBe(true);
    expect(s.isBiometricEnabled).toBe(false);
    expect(s.isUnlocked).toBe(false);
    expect(s.isBiometricEnabled || s.isPinEnabled).toBe(true);

    useBiometricStore.getState().setUnlocked(true);
    expect(useBiometricStore.getState().isUnlocked).toBe(true);

    useBiometricStore.setState({ isUnlocked: false });
    s = useBiometricStore.getState();
    expect(s.isPinEnabled).toBe(true);
    expect(s.isUnlocked).toBe(false);
    expect(s.isBiometricEnabled || s.isPinEnabled).toBe(true);
  });

  // ── Full biometric invalidation cycle ─────────────────────────────────────
  it('correctly models the full biometric invalidation → PIN → re-register cycle', () => {
    useBiometricStore.getState().enableBiometric();
    useBiometricStore.getState().enablePin();
    useBiometricStore.getState().setUnlocked(true);
    expect(useBiometricStore.getState().isUnlocked).toBe(true);

    useBiometricStore.getState().markBiometricInvalidated();
    let s = useBiometricStore.getState();
    expect(s.needsPinReAuth).toBe(true);
    expect(s.isUnlocked).toBe(false);

    useBiometricStore.getState().clearBiometricInvalidation();
    expect(useBiometricStore.getState().needsPinReAuth).toBe(false);

    useBiometricStore.getState().enableBiometric();
    useBiometricStore.getState().setUnlocked(true);
    s = useBiometricStore.getState();
    expect(s.isBiometricEnabled).toBe(true);
    expect(s.isUnlocked).toBe(true);
    expect(s.needsPinReAuth).toBe(false);
  });
});
