/**
 * Authentication Service
 *
 * Handles biometric and PIN authentication for app access.
 * Combines face/fingerprint recognition with a 4-digit PIN code.
 */

import { secureGetItem, secureSetItem, secureRemoveItem } from './secure-storage';

const PIN_KEY = 'user_pin_code';
const AUTH_ENABLED_KEY = 'auth_enabled';

// Biometric support will be added when expo-local-authentication is installed
// For now, we'll use PIN-only authentication

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: string[];
}

/**
 * Check device biometric capabilities
 * Note: Requires expo-local-authentication package
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  // Placeholder - biometric support requires expo-local-authentication
  return {
    isAvailable: false,
    hasHardware: false,
    isEnrolled: false,
    supportedTypes: [],
  };
}

/**
 * Get friendly name for biometric type
 */
export function getBiometricTypeName(_types: string[]): string {
  return 'Biometric';
}

/**
 * Authenticate with biometrics
 * Note: Requires expo-local-authentication package
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  // Placeholder - will be implemented when expo-local-authentication is added
  return false;
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
