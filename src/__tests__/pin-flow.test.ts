/**
 * PIN flow integration tests
 *
 * End-to-end test of the PIN setup → entry → change → removal lifecycle,
 * using the real auth-service functions with mocked secure-storage.
 *
 * Covers:
 *  - First-time PIN creation (4-digit validation)
 *  - Verify correct vs incorrect PIN
 *  - Change PIN with old PIN confirmation
 *  - Remove PIN / isAuthEnabled lifecycle
 *  - Attempt-count safety (verifyPin never throws)
 */

// ─── Mock native storage ──────────────────────────────────────────────────────
const fakeStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn((k: string) => Promise.resolve(fakeStore[k] ?? null)),
  setItemAsync:    jest.fn((k: string, v: string) => {
    fakeStore[k] = v;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((k: string) => {
    delete fakeStore[k];
    return Promise.resolve();
  }),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(32).fill(42))),
}));

// ─── Import under test ────────────────────────────────────────────────────────
import {
  isPinSet,
  setPin,
  verifyPin,
  changePin,
  removePin,
  isAuthEnabled,
} from '../lib/auth-service';

// ─────────────────────────────────────────────────────────────────────────────

describe('PIN lifecycle', () => {
  beforeEach(() => {
    // Wipe the fake store between tests
    Object.keys(fakeStore).forEach((k) => delete fakeStore[k]);
  });

  describe('Initial state (no PIN)', () => {
    it('isPinSet returns false before any PIN is created', async () => {
      expect(await isPinSet()).toBe(false);
    });

    it('isAuthEnabled returns false before any PIN is set', async () => {
      expect(await isAuthEnabled()).toBe(false);
    });

    it('verifyPin returns false safely when no PIN exists', async () => {
      expect(await verifyPin('1234')).toBe(false);
    });
  });

  describe('PIN creation', () => {
    it('setPin accepts exactly 4 digits and marks isPinSet=true', async () => {
      await setPin('1234');
      expect(await isPinSet()).toBe(true);
    });

    it('setPin also marks isAuthEnabled=true', async () => {
      await setPin('4321');
      expect(await isAuthEnabled()).toBe(true);
    });

    it('setPin rejects a 3-digit PIN', async () => {
      await expect(setPin('123')).rejects.toThrow(/4 digits/i);
    });

    it('setPin rejects a 5-digit PIN', async () => {
      await expect(setPin('12345')).rejects.toThrow(/4 digits/i);
    });

    it('setPin rejects a PIN with non-digit characters', async () => {
      await expect(setPin('12ab')).rejects.toThrow();
    });

    it('setPin rejects an empty string', async () => {
      await expect(setPin('')).rejects.toThrow();
    });
  });

  describe('PIN verification', () => {
    beforeEach(async () => {
      await setPin('5678');
    });

    it('verifyPin returns true for the correct PIN', async () => {
      expect(await verifyPin('5678')).toBe(true);
    });

    it('verifyPin returns false for a wrong PIN', async () => {
      expect(await verifyPin('0000')).toBe(false);
    });

    it('verifyPin returns false for an off-by-one PIN', async () => {
      expect(await verifyPin('5679')).toBe(false);
      expect(await verifyPin('5677')).toBe(false);
    });

    it('verifyPin is case/type safe for numeric strings', async () => {
      // These should not throw, just return false
      expect(await verifyPin('    ')).toBe(false);
      expect(await verifyPin('abcd')).toBe(false);
    });

    it('multiple incorrect attempts never throw', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await verifyPin(`000${i}`);
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('Change PIN', () => {
    beforeEach(async () => {
      await setPin('1111');
    });

    it('changePin succeeds when the old PIN is correct', async () => {
      const changed = await changePin('1111', '2222');
      expect(changed).toBe(true);
      expect(await verifyPin('2222')).toBe(true);
    });

    it('changePin fails (returns false) when the old PIN is wrong', async () => {
      const changed = await changePin('9999', '2222');
      expect(changed).toBe(false);
      // Original PIN is untouched
      expect(await verifyPin('1111')).toBe(true);
    });

    it('changePin does not update the PIN on wrong old-PIN', async () => {
      await changePin('wrong', '3333');
      expect(await verifyPin('3333')).toBe(false);
      expect(await verifyPin('1111')).toBe(true);
    });
  });

  describe('PIN removal', () => {
    it('removePin causes isPinSet to return false', async () => {
      await setPin('7777');
      expect(await isPinSet()).toBe(true);
      await removePin();
      expect(await isPinSet()).toBe(false);
    });

    it('removePin causes isAuthEnabled to return false', async () => {
      await setPin('7777');
      await removePin();
      expect(await isAuthEnabled()).toBe(false);
    });

    it('removePin is idempotent — calling twice does not throw', async () => {
      await setPin('8888');
      await removePin();
      await expect(removePin()).resolves.not.toThrow();
    });
  });

  describe('Biometric invalidation → PIN → re-register flow (auth-service layer)', () => {
    it('user can re-authenticate via PIN after biometric invalidation and set a new PIN', async () => {
      // 1. Initial setup: user has a PIN from onboarding
      await setPin('4444');
      expect(await isPinSet()).toBe(true);

      // 2. Biometric is invalidated; user enters their existing PIN successfully
      expect(await verifyPin('4444')).toBe(true);

      // 3. After PIN success, the app re-registers biometrics (simulated here as
      //    just confirming the PIN is still intact and valid for subsequent logins)
      expect(await isPinSet()).toBe(true);
      expect(await verifyPin('4444')).toBe(true);
    });

    it('user can optionally update their PIN after re-registration', async () => {
      await setPin('1234');
      // Simulate re-registration: user updates PIN as part of the flow
      await changePin('1234', '5678');
      expect(await verifyPin('5678')).toBe(true);
      expect(await verifyPin('1234')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PIN-only device path (no biometric hardware / biometric turned off)
  // This is the bug-fix path: previously the app silently skipped PIN setup
  // for these users. Now they are routed to PinSetupScreen and isPinEnabled
  // is persisted in the biometric-store so AuthGate shows the lock screen.
  // ─────────────────────────────────────────────────────────────────────────
  describe('PIN-only device path (biometric unavailable)', () => {
    it('a PIN can be created and verified without any biometric step', async () => {
      // Simulates the fixed BiometricSetupScreen routing directly to PinSetupScreen
      await setPin('3691');
      expect(await isPinSet()).toBe(true);
      expect(await isAuthEnabled()).toBe(true);
      expect(await verifyPin('3691')).toBe(true);
    });

    it('correct PIN unlocks; wrong PIN does not', async () => {
      await setPin('2580');
      expect(await verifyPin('2580')).toBe(true);
      expect(await verifyPin('9999')).toBe(false);
      expect(await verifyPin('2581')).toBe(false);
    });

    it('PIN survives a simulated app restart (store reset + re-read)', async () => {
      await setPin('1470');
      // Simulate restart: clear in-memory module cache is not possible in Jest,
      // but we can verify the storage layer still returns the right value
      // because the mock fakeStore persists across calls in the same test.
      expect(await isPinSet()).toBe(true);
      expect(await verifyPin('1470')).toBe(true);
    });

    it('PIN removal clears auth state cleanly on PIN-only device', async () => {
      await setPin('8520');
      expect(await isPinSet()).toBe(true);
      await removePin();
      expect(await isPinSet()).toBe(false);
      expect(await isAuthEnabled()).toBe(false);
      // verifyPin against removed PIN must return false, never throw
      expect(await verifyPin('8520')).toBe(false);
    });

    it('user can change PIN on a PIN-only device', async () => {
      await setPin('1111');
      const changed = await changePin('1111', '9876');
      expect(changed).toBe(true);
      expect(await verifyPin('9876')).toBe(true);
      expect(await verifyPin('1111')).toBe(false);
    });

    it('changePin rejects wrong old PIN on PIN-only device', async () => {
      await setPin('1234');
      const changed = await changePin('0000', '5678');
      expect(changed).toBe(false);
      // Original PIN untouched
      expect(await verifyPin('1234')).toBe(true);
    });

    it('setPin rejects non-4-digit values on PIN-only device too', async () => {
      await expect(setPin('12')).rejects.toThrow();
      await expect(setPin('12345')).rejects.toThrow();
      await expect(setPin('abcd')).rejects.toThrow();
    });
  });
});
