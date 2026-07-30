/**
 * Stable install identity, used as the subject for server-side usage metering.
 *
 * The 300-minute monthly cap is enforced in the Worker and keyed on this value,
 * so it needs to be as durable as the platform allows:
 *
 *   Android — `Application.getAndroidId()` (SSAID). Scoped to the app signing
 *     key + user, and crucially it lives OUTSIDE app storage, so it survives
 *     both "clear app data" and a reinstall. Only a factory reset changes it.
 *
 *   iOS — `Application.getIosIdForVendorAsync()` (IDFV). Stable for the vendor
 *     and survives a reinstall as long as at least one app from the same vendor
 *     remains installed; otherwise it is regenerated.
 *
 *   Fallback — a random UUID persisted in SecureStore (iOS Keychain / Android
 *     Keystore-backed), which also survives "clear app data" on iOS.
 *
 * Previously this logic lived inline in usage-service.ts as
 * `Application.getAndroidId?.() ?? ... ?? 'unknown-device'`. `getAndroidId` is
 * Android-only, so on iOS every single install resolved to the *same* literal
 * `'unknown-device'` — meaning all iOS users would have shared one usage
 * counter. That is fixed here.
 *
 * NOTE ON SCOPE: this is a per-device identity, not a per-person one. A user who
 * switches to a new phone starts a fresh allowance. Closing that gap requires a
 * real server-side account (or a verified subscription id) to meter against;
 * the Worker's schema stores an opaque subject hash precisely so that the
 * subject can be swapped to an account id later without a migration.
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const FALLBACK_KEY = 'vocolens_install_id';

/** Server-side validation requires >= 8 chars from [A-Za-z0-9._:-]. */
const VALID_ID = /^[A-Za-z0-9._:-]{8,200}$/;

let cached: string | null = null;

function isUsable(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    VALID_ID.test(value) &&
    value !== 'unknown-device' &&
    value !== 'anonymous'
  );
}

/** Reads, or lazily creates, the persisted fallback UUID. */
async function getOrCreateFallbackId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(FALLBACK_KEY);
    if (isUsable(existing)) return existing;
  } catch {
    // SecureStore unavailable (e.g. web) — fall through and generate.
  }

  const generated = Crypto.randomUUID();
  try {
    await SecureStore.setItemAsync(FALLBACK_KEY, generated);
  } catch {
    // Non-fatal: we still return a usable id for this session. It won't be
    // stable across restarts, which the server tolerates (it falls back to
    // metering by IP for ids it can't trust).
  }
  return generated;
}

/**
 * Resolves the device id used as the `X-Device-Id` header.
 * Cached after the first successful resolution.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId?.();
      if (isUsable(androidId)) {
        cached = androidId;
        return cached;
      }
    } else if (Platform.OS === 'ios') {
      const idfv = await Application.getIosIdForVendorAsync?.();
      if (isUsable(idfv)) {
        cached = idfv;
        return cached;
      }
    }
  } catch {
    // Native module threw — use the persisted fallback below.
  }

  cached = await getOrCreateFallbackId();
  return cached;
}

/** Test seam / used when the persisted id is intentionally rotated. */
export function resetDeviceIdCache(): void {
  cached = null;
}
