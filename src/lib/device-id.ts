/**
 * Install identity, used as the subject for server-side usage metering.
 *
 * The 300-minute monthly allowance is keyed on this value, so what this file
 * chooses decides who inherits whose minutes.
 *
 * ── Why this is install-scoped, not device-scoped ────────────────────────────
 *
 * This used to prefer hardware-derived identifiers — Android SSAID
 * (`Application.getAndroidId()`) and iOS IDFV — precisely *because* they survive
 * uninstalling the app, clearing app data, and reinstalling. That made the
 * allowance impossible to reset by reinstalling, but it also meant a genuinely
 * fresh install inherited every minute ever metered against that handset. A
 * phone that had the app installed, used, and removed showed the next install
 * something like 297 of 300 minutes remaining, with no entries and no way for
 * the user to explain or clear it.
 *
 * A random UUID in AsyncStorage is used instead: AsyncStorage lives inside the
 * app's sandbox, so uninstalling the app takes the id with it and the next
 * install starts from a clean 300 minutes. It is still stable for the life of
 * the install, which is what metering actually needs.
 *
 * SecureStore is deliberately NOT used for this. On iOS, Keychain items can
 * outlive the app that wrote them, which would reintroduce exactly the
 * inheritance problem above. The legacy Keychain entry is cleared on first run
 * (see `discardLegacyIdentity`) so no residue is left behind.
 *
 * ── The trade-off, stated plainly ───────────────────────────────────────────
 *
 * Reinstalling now grants a fresh allowance. That is accepted deliberately: the
 * cap is cost control, not DRM, and punishing every honest new owner of a
 * second-hand or hand-me-down phone to inconvenience a determined reinstaller is
 * the wrong trade. Closing that gap properly needs a real server-side account or
 * a verified subscription id to meter against — the Worker stores an opaque
 * subject hash precisely so the subject can become an account id later without a
 * data migration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const INSTALL_ID_KEY = 'vocolens_install_id';

/**
 * Where the pre-install-scoped fallback id was kept. Only read to delete it —
 * see the SecureStore note in the file header.
 */
const LEGACY_SECURE_STORE_KEY = 'vocolens_install_id';

/** Server-side validation requires >= 8 chars from [A-Za-z0-9._:-]. */
const VALID_ID = /^[A-Za-z0-9._:-]{8,200}$/;

let cached: string | null = null;
/**
 * Shared in-flight resolution. `getDeviceId` is called from `apiFetch`, so
 * several requests can race on the very first launch; without this each would
 * generate its own UUID and the last write would win, splitting one install's
 * usage across several subjects.
 */
let inFlight: Promise<string> | null = null;

function isUsable(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    VALID_ID.test(value) &&
    value !== 'unknown-device' &&
    value !== 'anonymous'
  );
}

/**
 * Removes the id the previous implementation kept in SecureStore.
 *
 * On iOS that entry can survive the app being deleted, so leaving it in place
 * would let a future reader resurrect a previous install's metering subject.
 * Best-effort and non-fatal — it is cleanup, not a dependency.
 */
async function discardLegacyIdentity(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LEGACY_SECURE_STORE_KEY);
  } catch {
    // SecureStore unavailable (e.g. web) or nothing stored — nothing to do.
  }
}

function generateId(): string {
  try {
    const uuid = Crypto.randomUUID();
    if (isUsable(uuid)) return uuid;
  } catch {
    // Native crypto unavailable — fall through to the arithmetic path below.
  }
  // Last resort. Only reached if expo-crypto is unavailable; still unique enough
  // to keep this install's usage separate from other installs.
  return (
    'inst-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 12)
  );
}

/** Reads, or lazily creates, the persisted install id. */
async function loadOrCreateInstallId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (isUsable(existing)) return existing;
  } catch {
    // Storage unreadable — fall through and generate a session-only id.
  }

  const generated = generateId();
  try {
    await AsyncStorage.setItem(INSTALL_ID_KEY, generated);
  } catch {
    // Non-fatal: the id still works for this session. It won't survive a
    // restart, which the server tolerates — an unrecognised subject simply
    // starts with a full allowance rather than being denied.
  }

  // A newly minted id means this is a first run (or storage was cleared), which
  // is the right moment to drop the old SecureStore entry.
  discardLegacyIdentity().catch(() => {});

  return generated;
}

/**
 * Resolves the id sent as the `X-Device-Id` header, creating and persisting one
 * on first use. Cached for the lifetime of the process.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = loadOrCreateInstallId()
    .then((id) => {
      cached = id;
      return id;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Test seam / used when the persisted id is intentionally rotated. */
export function resetDeviceIdCache(): void {
  cached = null;
  inFlight = null;
}
