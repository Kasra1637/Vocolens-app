/**
 * Authentication Service
 *
 * Handles biometric and PIN authentication for app access.
 * Combines face/fingerprint recognition with a 4-digit PIN code.
 */

import { secureGetItem, secureSetItem, secureRemoveItem } from './secure-storage';

const PIN_KEY = 'user_pin_code';
const AUTH_ENABLED_KEY = 'auth_enabled';

/**
 * Lazy-load expo-local-authentication to avoid a hard crash in environments
 * where the native module isn't present (e.g. Expo Go without a dev build).
 * Mirrors the lazy-require pattern used for expo-av elsewhere in the app.
 */
function getLocalAuth(): typeof import('expo-local-authentication') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-local-authentication');
  } catch (e) {
    console.warn(
      '[auth-service] expo-local-authentication not available:',
      (e as Error)?.message,
    );
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
 * Check device biometric capabilities (fingerprint / Face ID / iris).
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
 */
export function getBiometricTypeName(types: string[]): string {
  if (types.includes('face')) return 'Face ID';
  if (types.includes('fingerprint')) return 'Fingerprint';
  if (types.includes('iris')) return 'Iris';
  return 'Biometric';
}

/**
 * Prompt the user to authenticate with their fingerprint / Face ID.
 * Returns true only on a successful biometric match.
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Unlock Vocolens',
): Promise<boolean> {
  const LocalAuth = getLocalAuth();
  if (!LocalAuth) return false;

  try {
    const result = await LocalAuth.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success === true;
  } catch (e) {
    console.warn(
      '[auth-service] authenticateWithBiometrics error:',
      (e as Error)?.message,
    );
    return false;
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
      const biometricSuccess = await authenticateWithBiometrics();
      if (biometricSuccess) {
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
