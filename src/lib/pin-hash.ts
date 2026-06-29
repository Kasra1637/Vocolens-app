/**
 * PIN Hashing Utility
 *
 * Uses SHA-256 with a per-device random salt to hash PINs before storage.
 * The salt is generated once and stored in SecureStore (device keychain).
 * PINs are never stored in plaintext — only the hash is persisted.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const SALT_KEY = 'pin_hash_salt';

/**
 * Get or generate the PIN salt.
 * Stored in the device's secure hardware keystore (iOS Keychain / Android Keystore).
 * Generated once per app installation.
 */
async function getSalt(): Promise<string> {
  let salt = await SecureStore.getItemAsync(SALT_KEY);
  if (!salt) {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    salt = Array.from(new Uint8Array(randomBytes))
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }
  return salt;
}

/**
 * Hash a PIN using SHA-256 with the device-specific salt.
 * Returns a hex-encoded hash string.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await getSalt();
  const salted = `${salt}:${pin}`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salted
  );
  return hash;
}

/**
 * Verify a PIN against a stored hash.
 * Hashes the input PIN with the same salt and compares.
 */
export async function verifyPinHash(enteredPin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(enteredPin);
  return hash === storedHash;
}

/**
 * Remove the salt (used during account deletion).
 */
export async function clearPinSalt(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SALT_KEY);
  } catch {
    // Non-critical — may not exist
  }
}
