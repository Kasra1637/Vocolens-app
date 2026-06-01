/**
 * Authentication Service
 *
 * Handles biometric (fingerprint) and PIN authentication for app access.
 * Fingerprint is the primary unlock method.
 */

import { secureGetItem, secureSetItem, secureRemoveItem } from './secure-storage';

const PIN_KEY = 'user_pin_code';
const AUTH_ENABLED_KEY = 'auth_enabled';

/**
 * Whether the ExpoLocalAuthentication NATIVE module is actually present in the
 * running binary. In Expo Go (or a dev build created before the dependency was
 * added) the native side is missing, and simply `require()`-ing
 * `expo-local-authentication` triggers expo-modules-core to throw AND log
 * "Cannot find native module 'ExpoLocalAuthentication'".
 *
 * To avoid that entirely we first probe with `requireOptionalNativeModule`,
 * the non-throwing, non-logging variant. We only `require` the JS package when
 * the native module genuinely exists.
 */
let _localAuthModule:
  | typeof import('expo-local-authentication')
  | null
  | undefined;

function isNativeAuthAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core');
    // requireOptionalNativeModule returns null instead of throwing/logging
    // when the native module is not linked into the binary.
    if (typeof core?.requireOptionalNativeModule === 'function') {
      return core.requireOptionalNativeModule('ExpoLocalAuthentication') != null;
    }
    // Older cores: fall back to the proxy table (also non-throwing).
    return Boolean(core?.NativeModulesProxy?.ExpoLocalAuthentication);
  } catch {
    return false;
  }
}

/**
 * Lazy-load expo-local-authentication ONLY when its native module is present,
 * so environments without it (Expo Go / stale dev build) degrade silently with
 * no error logs. Result is cached after the first probe.
 */
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
    // Defensive: should not happen once the probe passed.
    _localAuthModule = null;
    return null;
  }
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: string[];
}

/**
 * Check device biometric capabilities (fingerprint primary; Face ID / iris fallback).
 * Returns a safe "unavailable" result if the native module or hardware is missing.
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  const LocalAuth = getLocalAuth();
  if (!LocalAuth) {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
    };
  }

  try {
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    const rawTypes = await LocalAuth.supportedAuthenticationTypesAsync();

    const typeNames = rawTypes.map((t) => {
      switch (t) {
        case LocalAuth.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuth.AuthenticationType.FACIAL_RECOGNITION:
          return 'face';
        case LocalAuth.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'biometric';
      }
    });

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes: typeNames,
    };
  } catch (e) {
    console.warn(
      '[auth-service] checkBiometricCapabilities error:',
      (e as Error)?.message,
    );
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
    };
  }
}

/**
 * Get a friendly, platform-appropriate name for the available biometric type.
 * Fingerprint is the app's primary biometric method, so it's preferred in labeling.
 */
export function getBiometricTypeName(types: string[]): string {
  if (types.includes('fingerprint')) return 'Fingerprint';
  if (types.includes('face')) return 'Face ID';
  if (types.includes('iris')) return 'Iris';
  return 'Fingerprint';
}

/**
 * Result of a biometric authentication attempt.
 *  - success: the user authenticated successfully.
 *  - cancelled: the user dismissed the prompt (not an error — let them retry).
 *  - available: false means the device can't do biometrics at all, so the
 *    caller should offer a graceful fallback rather than blocking the user.
 */
export interface BiometricAuthResult {
  success: boolean;
  cancelled: boolean;
  available: boolean;
  error?: string;
}

/**
 * Prompt the user to authenticate with their fingerprint.
 * Always resolves (never throws) with a structured result so callers can
 * react appropriately and never trap the user.
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Unlock Vocolens with your fingerprint',
): Promise<BiometricAuthResult> {
  const LocalAuth = getLocalAuth();
  if (!LocalAuth) {
    return { success: false, cancelled: false, available: false, error: 'module_unavailable' };
  }

  try {
    // Guard against calling authenticateAsync when the device can't satisfy it,
    // which is the most common source of native errors / crashes.
    const hasHardware = await LocalAuth.hasHardwareAsync();
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      return {
        success: false,
        cancelled: false,
        available: false,
        error: !hasHardware ? 'no_hardware' : 'not_enrolled',
      };
    }

    const result = await LocalAuth.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      // Allow the device PIN/passcode as a fallback so users are never locked out.
      disableDeviceFallback: false,
      fallbackLabel: 'Use device passcode',
    });

    if (result.success) {
      return { success: true, cancelled: false, available: true };
    }

    // expo-local-authentication returns an `error` string on failure/cancel.
    const errCode = (result as { error?: string }).error ?? 'unknown';
    const cancelled =
      errCode === 'user_cancel' ||
      errCode === 'app_cancel' ||
      errCode === 'system_cancel' ||
      errCode === 'user_fallback';

    return {
      success: false,
      cancelled,
      available: true,
      error: errCode,
    };
  } catch (e) {
    console.warn(
      '[auth-service] authenticateWithBiometrics error:',
      (e as Error)?.message,
    );
    // Treat an unexpected native error as "unavailable" so callers fall back
    // gracefully instead of trapping the user.
    return {
      success: false,
      cancelled: false,
      available: false,
      error: (e as Error)?.message ?? 'native_error',
    };
  }
}

/**
 * Check if PIN is set
 */
export async function isPinSet(): Promise<boolean> {
  const pin = await secureGetItem(PIN_KEY);
  return pin !== null;
}

/**
 * Set user PIN (4 digits)
 */
export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }

  await secureSetItem(PIN_KEY, pin);
  await secureSetItem(AUTH_ENABLED_KEY, 'true');
}

/**
 * Verify PIN code
 */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const storedPin = await secureGetItem(PIN_KEY);
    return storedPin === pin;
  } catch (error) {
    console.error('PIN verification error:', error);
    return false;
  }
}

/**
 * Change PIN code
 */
export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
  const isValid = await verifyPin(oldPin);
  if (!isValid) {
    return false;
  }

  await setPin(newPin);
  return true;
}

/**
 * Remove PIN (for account deletion)
 */
export async function removePin(): Promise<void> {
  await secureRemoveItem(PIN_KEY);
  await secureRemoveItem(AUTH_ENABLED_KEY);
}

/**
 * Check if authentication is enabled
 */
export async function isAuthEnabled(): Promise<boolean> {
  const enabled = await secureGetItem(AUTH_ENABLED_KEY);
  return enabled === 'true';
}

/**
 * Full authentication flow (biometric fallback to PIN)
 */
export async function authenticate(): Promise<{ success: boolean; method: 'biometric' | 'pin' | null }> {
  try {
    // Check if auth is enabled
    const authEnabled = await isAuthEnabled();
    if (!authEnabled) {
      return { success: true, method: null };
    }

    // Try biometric first
    const capabilities = await checkBiometricCapabilities();
    if (capabilities.isAvailable) {
      const biometricResult = await authenticateWithBiometrics();
      if (biometricResult.success) {
        return { success: true, method: 'biometric' };
      }
    }

    // If biometric fails or not available, PIN will be required
    return { success: false, method: 'pin' };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, method: 'pin' };
  }
}
