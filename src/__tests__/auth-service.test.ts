/**
 * auth-service tests
 *
 * Tests the pure logic of:
 *  - isBiometricInvalidationError()  — error code classification
 *  - checkBiometricCapabilities()    — native module absent / present scenarios
 *  - authenticateWithBiometrics()    — success / cancel / invalidation / failure paths
 *  - isPinSet / setPin / verifyPin   — PIN CRUD via mocked secure-storage
 *
 * All native Expo modules (expo-local-authentication, expo-secure-store,
 * expo-crypto, expo-modules-core) are mocked at the module boundary so
 * no native binary is required.
 */

// ─── Mock expo-modules-core BEFORE any import of auth-service ────────────────
jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => ({})),   // truthy → "native available"
  NativeModulesProxy: { ExpoLocalAuthentication: {} },
}));

// ─── Mock expo-local-authentication ──────────────────────────────────────────
const mockLocalAuth = {
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync:                    jest.fn(),
  isEnrolledAsync:                     jest.fn(),
  supportedAuthenticationTypesAsync:   jest.fn(),
  authenticateAsync:                   jest.fn(),
};
jest.mock('expo-local-authentication', () => mockLocalAuth);

// ─── Mock expo-secure-store & expo-crypto (used by secure-storage.ts) ────────
const fakeStore: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn((k: string) => Promise.resolve(fakeStore[k] ?? null)),
  setItemAsync:    jest.fn((k: string, v: string) => { fakeStore[k] = v; return Promise.resolve(); }),
  deleteItemAsync: jest.fn((k: string) => { delete fakeStore[k]; return Promise.resolve(); }),
}));
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(32).fill(1))),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────
import {
  isBiometricInvalidationError,
  checkBiometricCapabilities,
  authenticateWithBiometrics,
  isPinSet,
  setPin,
  verifyPin,
  removePin,
  getBiometricTypeName,
} from '../lib/auth-service';

// ─────────────────────────────────────────────────────────────────────────────
// isBiometricInvalidationError
// ─────────────────────────────────────────────────────────────────────────────
describe('isBiometricInvalidationError', () => {
  it('returns false for null / undefined', () => {
    expect(isBiometricInvalidationError(undefined)).toBe(false);
    expect(isBiometricInvalidationError('')).toBe(false);
  });

  it('returns true for exact invalidation codes', () => {
    const codes = [
      'biometryChanged',
      'biometry_changed',
      'biometric_changed',
      'passcode_changed',
      'invalidated',
      'no_enrollments',
      'not_enrolled',
      'lockout_permanent',
    ];
    codes.forEach((code) => {
      expect(isBiometricInvalidationError(code)).toBe(true);
    });
  });

  it('returns true for codes that contain an invalidation keyword (case-insensitive)', () => {
    expect(isBiometricInvalidationError('ERROR_BIOMETRIC_CHANGED')).toBe(true);
    expect(isBiometricInvalidationError('AUTH_NOT_ENROLLED')).toBe(true);
  });

  it('returns false for benign error codes', () => {
    expect(isBiometricInvalidationError('user_cancel')).toBe(false);
    expect(isBiometricInvalidationError('app_cancel')).toBe(false);
    expect(isBiometricInvalidationError('unknown')).toBe(false);
    expect(isBiometricInvalidationError('authentication_failed')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkBiometricCapabilities
// ─────────────────────────────────────────────────────────────────────────────
describe('checkBiometricCapabilities', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns unavailable when hardware is missing', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);

    const caps = await checkBiometricCapabilities();
    expect(caps.isAvailable).toBe(false);
    expect(caps.hasHardware).toBe(false);
  });

  it('returns unavailable when hardware present but not enrolled', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]);

    const caps = await checkBiometricCapabilities();
    expect(caps.isAvailable).toBe(false);
    expect(caps.hasHardware).toBe(true);
    expect(caps.isEnrolled).toBe(false);
  });

  it('returns available and maps fingerprint type when fully enrolled', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1]); // FINGERPRINT

    const caps = await checkBiometricCapabilities();
    expect(caps.isAvailable).toBe(true);
    expect(caps.supportedTypes).toContain('fingerprint');
  });

  it('returns safe fallback when native module throws', async () => {
    mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('native crash'));

    const caps = await checkBiometricCapabilities();
    expect(caps.isAvailable).toBe(false);
    expect(caps.supportedTypes).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// authenticateWithBiometrics
// ─────────────────────────────────────────────────────────────────────────────
describe('authenticateWithBiometrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: hardware + enrolled
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
  });

  it('returns success=true on successful authentication', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

    const result = await authenticateWithBiometrics();
    expect(result.success).toBe(true);
    expect(result.invalidated).toBe(false);
    expect(result.cancelled).toBe(false);
  });

  it('returns cancelled=true when user dismisses the prompt', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });

    const result = await authenticateWithBiometrics();
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.invalidated).toBe(false);
  });

  it('returns invalidated=true for biometryChanged error', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'biometryChanged' });

    const result = await authenticateWithBiometrics();
    expect(result.success).toBe(false);
    expect(result.invalidated).toBe(true);
    expect(result.cancelled).toBe(false);
  });

  it('returns invalidated=true for not_enrolled error', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'not_enrolled' });

    const result = await authenticateWithBiometrics();
    expect(result.invalidated).toBe(true);
  });

  it('returns invalidated=true when isEnrolledAsync returns false (pre-flight check)', async () => {
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

    const result = await authenticateWithBiometrics();
    expect(result.success).toBe(false);
    expect(result.available).toBe(false);
    expect(result.invalidated).toBe(true);   // hardware present, no enrollments = invalidation
  });

  it('returns available=false but invalidated=false when hardware missing', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

    const result = await authenticateWithBiometrics();
    expect(result.available).toBe(false);
    expect(result.invalidated).toBe(false);
  });

  it('returns generic failure (not cancelled, not invalidated) on auth failed', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'authentication_failed' });

    const result = await authenticateWithBiometrics();
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(false);
    expect(result.invalidated).toBe(false);
    expect(result.available).toBe(true);
  });

  it('handles an unexpected native exception gracefully', async () => {
    mockLocalAuth.authenticateAsync.mockRejectedValue(new Error('native_crash'));

    const result = await authenticateWithBiometrics();
    expect(result.success).toBe(false);
    // A generic native error is not an invalidation event; available stays true
    // because the hardware is presumed still present — the crash might be transient.
    // The caller shows a retry rather than locking the user out.
    expect(result.invalidated).toBe(false);
    expect(result.cancelled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PIN management
// ─────────────────────────────────────────────────────────────────────────────
describe('PIN management', () => {
  beforeEach(async () => {
    // Clear fakeStore between tests
    Object.keys(fakeStore).forEach((k) => delete fakeStore[k]);
  });

  it('isPinSet returns false when no PIN stored', async () => {
    expect(await isPinSet()).toBe(false);
  });

  it('setPin stores a 4-digit PIN and isPinSet returns true', async () => {
    await setPin('1234');
    expect(await isPinSet()).toBe(true);
  });

  it('setPin rejects a PIN that is not exactly 4 digits', async () => {
    await expect(setPin('123')).rejects.toThrow();
    await expect(setPin('12345')).rejects.toThrow();
    await expect(setPin('abcd')).rejects.toThrow();
  });

  it('verifyPin returns true for the correct PIN', async () => {
    await setPin('5678');
    expect(await verifyPin('5678')).toBe(true);
  });

  it('verifyPin returns false for an incorrect PIN', async () => {
    await setPin('5678');
    expect(await verifyPin('0000')).toBe(false);
  });

  it('removePin causes isPinSet to return false', async () => {
    await setPin('9999');
    expect(await isPinSet()).toBe(true);
    await removePin();
    expect(await isPinSet()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBiometricTypeName
// ─────────────────────────────────────────────────────────────────────────────
describe('getBiometricTypeName', () => {
  it('prefers fingerprint when present', () => {
    expect(getBiometricTypeName(['fingerprint', 'face'])).toBe('Fingerprint');
  });
  it('falls back to Face ID', () => {
    expect(getBiometricTypeName(['face'])).toBe('Face ID');
  });
  it('returns Fingerprint as ultimate default', () => {
    expect(getBiometricTypeName([])).toBe('Fingerprint');
  });
});
