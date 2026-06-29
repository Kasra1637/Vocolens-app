/**
 * Authentication Service
 *
 * Handles biometric (fingerprint) and PIN authentication for app access.
 * Fingerprint is the primary unlock method, PIN is the mandatory fallback.
 *
 * Biometric invalidation handling
 * --------------------------------
 * When the user adds or removes a fingerprint after enabling biometric lock,
 * the OS invalidates the previously bound authentication token.  The next
 * `authenticateAsync()` call returns one of the error codes listed in
 * BIOMETRIC_INVALIDATION_CODES.  `authenticateWithBiometrics()` surfaces this
 * via `result.invalidated = true` so callers can route to the PIN fallback,
 * re-authenticate, and then re-register the new biometric state.
 */

import { secureGetItem, secureSetItem, secureRemoveItem } from './secure-storage';
import { hashPin, verifyPinHash, clearPinSalt } from './pin-hash';
import { Platform } from 'react-native';

const PIN_KEY = 'user_pin_code';
const AUTH_ENABLED_KEY = 'auth_enabled';

// Tagged logger — easy to grep in device logs while preventing PIN leakage.
const log = {
  info:  (msg: string, meta?: object) => console.log(`[auth] ${msg}`, meta ?? ''),
  warn:  (msg: string, meta?: object) => console.warn(`[auth] ${msg}`, meta ?? ''),
  error: (msg: string, err?: unknown)  => console.error(`[auth] ${msg}`, err ?? ''),
};

/**
 * Lazy mirror to the in-memory zustand `usePinStore`.
 *
 * Required at runtime so any consumer that reads `usePinStore.getState().isPinSet`
 * sees the new value the instant SecureStore is updated — preventing stale
 * references. Lazy `require` keeps tests that mock only SecureStore + Crypto
 * working; pin-store transitively imports AsyncStorage which is not mocked
 * in unit tests. Any failure is swallowed — SecureStore is authoritative.
 */
function mirrorPinStore(op: 'set' | 'clear', pin?: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./state/pin-store');
    const store = (mod?.default ?? mod) as {
      getState: () => { setPin: (p: string) => void; clearPin: () => void };
    };
    if (op === 'set' && pin) {
      store.getState().setPin(pin);
    } else if (op === 'clear') {
      store.getState().clearPin();
    }
  } catch (err) {
    // Non-fatal: SecureStore is the source of truth.
    log.warn(`mirrorPinStore (${op}) skipped`, { err: String(err) });
  }
}

// ─── Biometric invalidation error codes ──────────────────────────────────────
/**
 * Error strings returned by expo-local-authentication / the native OS when
 * the previously enrolled biometric has changed and the system has revoked the
 * credential.  We treat any of these as "biometric invalidated" so the app can
 * prompt for PIN instead of silently failing.
 *
 * iOS:   LAError.biometryChanged  → "biometryChanged" / "passcode_not_set" / "unknown"
 * Android: BIOMETRIC_ERROR_NO_BIOMETRICS after previous enrolment is removed
 *           → "no_enrollments" / "not_enrolled"
 */
const BIOMETRIC_INVALIDATION_CODES = new Set([
  'biometryChanged',
  'biometry_changed',
  'biometric_changed',
  'passcode_changed',
  'invalidated',
  'no_enrollments',
  'not_enrolled',
  'lockout_permanent',
]);

/**
 * Whether an expo-local-authentication error string represents a biometric
 * invalidation event (user enrolled or removed a fingerprint / face).
 */
export function isBiometricInvalidationError(errorCode: string | undefined): boolean {
  if (!errorCode) return false;
  const lower = errorCode.toLowerCase();
  // Direct match
  if (BIOMETRIC_INVALIDATION_CODES.has(errorCode)) return true;
  // Substring match for vendor-specific variants (e.g. "ERROR_BIOMETRIC_CHANGED")
  for (const code of BIOMETRIC_INVALIDATION_CODES) {
    if (lower.includes(code.toLowerCase())) return true;
  }
  return false;
}

// ─── Native module lazy-load ──────────────────────────────────────────────────

let _localAuthModule:
  | typeof import('expo-local-authentication')
  | null
  | undefined;

function isNativeAuthAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core');
    if (typeof core?.requireOptionalNativeModule === 'function') {
      return core.requireOptionalNativeModule('ExpoLocalAuthentication') != null;
    }
    return Boolean(core?.NativeModulesProxy?.ExpoLocalAuthentication);
  } catch {
    return false;
  }
}

function getLocalAuth(): typeof import('expo-local-authentication') | null {
  if (_localAuthModule !== undefined) return _localAuthModule;

  if (!isNativeAuthAvailable()) {
    _localAuthModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _localAuthModule = require('expo-local-authentication');
    return _localAuthModule;
  } catch {
    _localAuthModule = null;
    return null;
  }
}

// ─── Biometric capabilities ───────────────────────────────────────────────────

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: string[];
}

export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  const LocalAuth = getLocalAuth();
  if (!LocalAuth) {
    return { isAvailable: false, hasHardware: false, isEnrolled: false, supportedTypes: [] };
  }

  try {
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    const rawTypes = await LocalAuth.supportedAuthenticationTypesAsync();

    const typeNames = rawTypes.map((t) => {
      switch (t) {
        case LocalAuth.AuthenticationType.FINGERPRINT:         return 'fingerprint';
        case LocalAuth.AuthenticationType.FACIAL_RECOGNITION:  return 'face';
        case LocalAuth.AuthenticationType.IRIS:                return 'iris';
        default:                                               return 'biometric';
      }
    });

    return { isAvailable: hasHardware && isEnrolled, hasHardware, isEnrolled, supportedTypes: typeNames };
  } catch (e) {
    console.warn('[auth-service] checkBiometricCapabilities error:', (e as Error)?.message);
    return { isAvailable: false, hasHardware: false, isEnrolled: false, supportedTypes: [] };
  }
}

export function getBiometricTypeName(types: string[]): string {
  if (types.includes('fingerprint')) return 'Fingerprint';
  if (types.includes('face'))        return 'Face ID';
  if (types.includes('iris'))        return 'Iris';
  return 'Fingerprint';
}

// ─── Biometric authentication ─────────────────────────────────────────────────

export interface BiometricAuthResult {
  success: boolean;
  cancelled: boolean;
  available: boolean;
  /**
   * True when the OS reports that enrolled biometrics have changed and the
   * previously bound credential is no longer valid. The caller should prompt
   * the user for their PIN and then re-register biometrics.
   */
  invalidated: boolean;
  error?: string;
}

export async function authenticateWithBiometrics(
  promptMessage = 'Unlock Vocolens with your fingerprint',
): Promise<BiometricAuthResult> {
  const LocalAuth = getLocalAuth();
  if (!LocalAuth) {
    return { success: false, cancelled: false, available: false, invalidated: false, error: 'module_unavailable' };
  }

  try {
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      // If hardware is present but no longer enrolled, that's an invalidation event.
      const invalidated = hasHardware && !isEnrolled;
      return {
        success: false,
        cancelled: false,
        available: false,
        invalidated,
        error: !hasHardware ? 'no_hardware' : 'not_enrolled',
      };
    }

    const result = await LocalAuth.authenticateAsync({
      promptMessage,
      // No cancelLabel — keeps the OS sheet as minimal as possible.
      // disableDeviceFallback: on Android, passing true triggers Samsung Knox
      // security dialogs ("Secured by Knox") before the fingerprint sheet.
      // We omit it on Android so Knox doesn't intercept, and handle any
      // device-fallback result ourselves by treating it as a cancellation.
      // On iOS, disableDeviceFallback: true is correct (we manage PIN ourselves).
      ...(Platform.OS === 'ios' ? { disableDeviceFallback: true } : {}),
      // Android: confirm immediately on scan — no extra "Confirm" tap needed.
      requireConfirmation: false,
    } as Parameters<typeof LocalAuth.authenticateAsync>[0]);

    if (result.success) {
      return { success: true, cancelled: false, available: true, invalidated: false };
    }

    const errCode = (result as { error?: string }).error ?? 'unknown';
    const cancelled =
      errCode === 'user_cancel' ||
      errCode === 'app_cancel'  ||
      errCode === 'system_cancel';
    const invalidated = isBiometricInvalidationError(errCode);

    return {
      success: false,
      cancelled,
      available: true,
      invalidated,
      error: errCode,
    };
  } catch (e) {
    const msg = (e as Error)?.message ?? 'native_error';
    const invalidated = isBiometricInvalidationError(msg);
    console.warn('[auth-service] authenticateWithBiometrics error:', msg);
    return {
      success: false,
      cancelled: false,
      available: !invalidated,
      invalidated,
      error: msg,
    };
  }
}

// ─── PIN management ────────────────────────────────────────────────────────────

export async function isPinSet(): Promise<boolean> {
  const pin = await secureGetItem(PIN_KEY);
  return pin !== null;
}

/**
 * Persist the PIN.
 *
 * Writes to TWO locations atomically so no caller can ever see a stale value:
 *   1. Encrypted SecureStore  — primary source of truth, survives reinstall
 *      protections (Keychain on iOS / Keystore on Android).
 *   2. Zustand `usePinStore` — in-memory + AsyncStorage mirror used by the
 *      reset-all-data flow and any hot consumer that needs the PIN without
 *      awaiting an async SecureStore read.
 *
 * Throws if the PIN is not exactly 4 digits or if SecureStore write fails.
 * On failure the zustand mirror is NOT updated, so the two stores cannot
 * diverge in the failure case (the encrypted store is authoritative).
 */
export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    log.error('setPin rejected: PIN must be exactly 4 digits');
    throw new Error('PIN must be exactly 4 digits');
  }
  try {
    // Hash the PIN with SHA-256 + device salt before storing
    const pinHash = await hashPin(pin);
    await secureSetItem(PIN_KEY, pinHash);
    await secureSetItem(AUTH_ENABLED_KEY, 'true');
  } catch (err) {
    log.error('setPin: SecureStore write failed', err);
    throw err;
  }

  // Mirror the HASH (not plaintext) to zustand store so any in-app consumer
  // sees the new value immediately, without a re-read.
  mirrorPinStore('set', pin);

  log.info('PIN hash stored successfully');
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    // ALWAYS read from SecureStore — never trust a cached / in-memory copy.
    const storedHash = await secureGetItem(PIN_KEY);
    if (storedHash === null) {
      log.warn('verifyPin: no PIN is set in SecureStore');
      return false;
    }
    // Compare the hash of the entered PIN against the stored hash
    const ok = await verifyPinHash(pin, storedHash);
    log.info(ok ? 'verifyPin: hash match' : 'verifyPin: hash mismatch');
    return ok;
  } catch (error) {
    log.error('verifyPin error', error);
    return false;
  }
}

export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
  const isValid = await verifyPin(oldPin);
  if (!isValid) {
    log.warn('changePin: current PIN incorrect — change aborted');
    return false;
  }
  await setPin(newPin);
  return true;
}

export async function removePin(): Promise<void> {
  await secureRemoveItem(PIN_KEY);
  await secureRemoveItem(AUTH_ENABLED_KEY);
  await clearPinSalt();
  // Keep zustand mirror in sync
  mirrorPinStore('clear');
  log.info('PIN removed');
}

export async function isAuthEnabled(): Promise<boolean> {
  const enabled = await secureGetItem(AUTH_ENABLED_KEY);
  return enabled === 'true';
}

// ─── Composite auth flow ───────────────────────────────────────────────────────

export async function authenticate(): Promise<{
  success: boolean;
  method: 'biometric' | 'pin' | null;
  invalidated?: boolean;
}> {
  try {
    const authEnabled = await isAuthEnabled();
    if (!authEnabled) return { success: true, method: null };

    const capabilities = await checkBiometricCapabilities();
    if (capabilities.isAvailable) {
      const biometricResult = await authenticateWithBiometrics();
      if (biometricResult.success) {
        return { success: true, method: 'biometric' };
      }
      if (biometricResult.invalidated) {
        return { success: false, method: 'pin', invalidated: true };
      }
    }

    return { success: false, method: 'pin', invalidated: false };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, method: 'pin', invalidated: false };
  }
}
