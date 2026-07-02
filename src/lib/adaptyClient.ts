/**
 * Adapty Client
 *
 * Thin wrapper around `react-native-adapty` v3.x — replaces the old
 * RevenueCat client (`revenueCatClient.ts`, now removed). Same guard
 * pattern (never throws, always returns a typed result) so callers can
 * handle failures uniformly.
 *
 * SDK: react-native-adapty v3.x
 * Access level: "premium"
 * Products (vendor product ids): monthly | three_month | yearly
 *
 * ─── Mock Mode ──────────────────────────────────────────────────────────────
 * `EXPO_PUBLIC_ADAPTY_KEY` is not set yet, so this module activates the SDK
 * with a placeholder key AND explicitly force-enables Adapty's built-in
 * mock mode via `adapty.enableMock()`. This means:
 *   • No Adapty dashboard / App Store Connect / Google Play Console setup
 *     required to exercise the paywall UI end-to-end
 *   • `makePurchase()` simulates a successful purchase and grants the
 *     "premium" access level locally — no real charge, no network call
 *   • `getPaywall()` / `getPaywallProducts()` return mock data unless you
 *     customize `mockConfig`
 *
 * Once you have a real Adapty Public SDK Key, set it as
 * `EXPO_PUBLIC_ADAPTY_KEY` (see eas-hooks/pre-install.sh and app.config.js)
 * and this module will automatically activate in real (non-mock) mode —
 * no code changes needed.
 *
 * To build a dev client: `npx eas build --profile development --platform ios`
 * Then run with: `npx expo start --dev-client`
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { adapty } from "react-native-adapty";
import type {
  AdaptyProfile,
  AdaptyPaywall,
  AdaptyPaywallProduct,
  AdaptyPurchaseResult,
} from "react-native-adapty";

// ── Constants ─────────────────────────────────────────────────────────────────
/** Access level identifier configured in the Adapty Dashboard. */
export const ADAPTY_ACCESS_LEVEL = "premium";

/**
 * Placement IDs — where/when paywalls are requested from the Adapty
 * Dashboard. Create matching placements (and attach a paywall with these
 * products) in the dashboard, or update these constants to match whatever
 * placement IDs you create there.
 */
export const PLACEMENT_MAIN_PAYWALL = "main_paywall";
export const PLACEMENT_ONBOARDING_PAYWALL = "onboarding_paywall";

/** Vendor product ids — must match products created in App Store Connect / Google Play + mapped in Adapty. */
export const PRODUCT_ID_MONTHLY = "monthly";
export const PRODUCT_ID_THREE_MONTH = "three_month";
export const PRODUCT_ID_YEARLY = "yearly";

// Placeholder Public SDK Key — activates Adapty in forced mock mode (see
// header comment). Replace by setting EXPO_PUBLIC_ADAPTY_KEY.
const PLACEHOLDER_ADAPTY_KEY = "PLACEHOLDER_ADAPTY_PUBLIC_KEY";

function getAdaptyKey(): string {
  const key =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_ADAPTY_KEY ||
    process.env.EXPO_PUBLIC_ADAPTY_KEY;
  return key && key !== "null" && key !== "undefined" ? key : PLACEHOLDER_ADAPTY_KEY;
}

/** True until a real EXPO_PUBLIC_ADAPTY_KEY is configured. */
export const isUsingMockMode = (): boolean => getAdaptyKey() === PLACEHOLDER_ADAPTY_KEY;

// ── Result type ────────────────────────────────────────────────────────────────
export type AdaptyGuardReason = "not_configured" | "sdk_error";
export type AdaptyResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AdaptyGuardReason; error?: unknown };

const LOG = "[Adapty]";

// ── Activation ───────────────────────────────────────────────────────────────
let activationPromise: Promise<void> | null = null;

/**
 * Activate the SDK once per app launch. Safe to call multiple times —
 * subsequent calls are no-ops. All other exported functions call this
 * lazily too, so you don't strictly need to call it yourself, but calling
 * it once on app mount (e.g. in AuthGate) starts activation earlier.
 */
export const configureAdapty = (): void => {
  if (activationPromise) return;

  const apiKey = getAdaptyKey();
  const usingMock = apiKey === PLACEHOLDER_ADAPTY_KEY;

  if (usingMock) {
    // Force mock mode explicitly. Adapty auto-enables mock only in Expo Go
    // and Web — this makes behavior consistent in native dev/prod builds
    // too, until a real EXPO_PUBLIC_ADAPTY_KEY is provided.
    try {
      adapty.enableMock();
    } catch (e: any) {
      if (__DEV__) console.log(`${LOG} enableMock failed:`, e?.message ?? e);
    }
  }

  activationPromise = adapty
    .activate(apiKey, {
      logLevel: __DEV__ ? "verbose" : "error",
      // Prevents "Adapty can only be activated once" errors triggered by
      // React Native's Fast Refresh during development.
      __ignoreActivationOnFastRefresh: __DEV__,
    })
    .then(() => {
      console.log(
        `${LOG} SDK activated (${Platform.OS}) | ` +
          `Mock mode: ${usingMock ? "YES — placeholder key, no real purchases" : "NO — production key"}`,
      );
    })
    .catch((e: any) => {
      console.log(`${LOG} activate failed:`, e?.message ?? e);
      throw e;
    });
};

/** Resolves true once activation succeeds, false if it fails. Triggers activation if not already started. */
async function ensureActivated(): Promise<boolean> {
  if (!activationPromise) configureAdapty();
  try {
    await activationPromise;
    return true;
  } catch {
    return false;
  }
}

// ── Guard helper ──────────────────────────────────────────────────────────────
async function guard<T>(action: string, op: () => Promise<T>): Promise<AdaptyResult<T>> {
  const activated = await ensureActivated();
  if (!activated) {
    if (__DEV__) console.log(`${LOG} ${action} skipped — SDK not activated`);
    return { ok: false, reason: "not_configured" };
  }
  try {
    return { ok: true, data: await op() };
  } catch (error: any) {
    console.log(`${LOG} ${action} failed:`, error?.message ?? error);
    return { ok: false, reason: "sdk_error", error };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch the current user profile (access levels, subscriptions). */
export const getProfile = (): Promise<AdaptyResult<AdaptyProfile>> =>
  guard("getProfile", () => adapty.getProfile());

/** Check whether a given access level is currently active on a profile. */
export const hasAccessLevel = (
  profile: AdaptyProfile | null | undefined,
  accessLevelId: string = ADAPTY_ACCESS_LEVEL,
): boolean => profile?.accessLevels?.[accessLevelId]?.isActive === true;

/**
 * Fetch a paywall (by placement id) and its products from Adapty.
 * Paywalls are the only way to retrieve products in Adapty — create a
 * paywall + placement in the Adapty Dashboard first.
 */
export const getPaywallProducts = (
  placementId: string,
): Promise<AdaptyResult<{ paywall: AdaptyPaywall; products: AdaptyPaywallProduct[] }>> =>
  guard("getPaywallProducts", async () => {
    const paywall = await adapty.getPaywall(placementId);
    const products = await adapty.getPaywallProducts(paywall);
    if (__DEV__) {
      console.log(
        `${LOG} Paywall "${placementId}" loaded | Products: ${products.length} ` +
          `[${products.map((p) => p.vendorProductId).join(", ")}]`,
      );
    }
    return { paywall, products };
  });

/** Find a fetched product by its vendor product id (e.g. "yearly"). */
export function findProductById(
  products: AdaptyPaywallProduct[] | null | undefined,
  vendorProductId: string,
): AdaptyPaywallProduct | null {
  return products?.find((p) => p.vendorProductId === vendorProductId) ?? null;
}

/** Discriminated purchase outcome — mirrors AdaptyPurchaseResult but narrowed for callers. */
export type PurchaseOutcome =
  | { type: "success"; profile: AdaptyProfile }
  | { type: "user_cancelled" }
  | { type: "pending" };

/** Purchase a product. Returns the updated profile on success. */
export const makePurchase = (
  product: AdaptyPaywallProduct,
): Promise<AdaptyResult<PurchaseOutcome>> =>
  guard("makePurchase", async () => {
    if (__DEV__) console.log(`${LOG} Initiating purchase: ${product.vendorProductId}`);
    const result: AdaptyPurchaseResult = await adapty.makePurchase(product);
    if (result.type === "success" && result.profile) {
      return { type: "success", profile: result.profile } as PurchaseOutcome;
    }
    if (result.type === "user_cancelled") {
      return { type: "user_cancelled" } as PurchaseOutcome;
    }
    return { type: "pending" } as PurchaseOutcome;
  });

/** Restore previous purchases. Returns the updated profile. */
export const restorePurchases = (): Promise<AdaptyResult<AdaptyProfile>> =>
  guard("restorePurchases", () => adapty.restorePurchases());

/**
 * Identify the user (anonymous by default).
 * Call this after the user signs in / you have a stable user ID.
 */
export const identifyUser = async (userId: string): Promise<void> => {
  const activated = await ensureActivated();
  if (!activated) return;
  try {
    await adapty.identify(userId);
    console.log(`${LOG} User identified: ${userId}`);
  } catch (e: any) {
    console.log(`${LOG} identify failed:`, e?.message ?? e);
  }
};

/** Reset the user to anonymous (call on sign-out). */
export const resetUser = async (): Promise<void> => {
  const activated = await ensureActivated();
  if (!activated) return;
  try {
    await adapty.logout();
    console.log(`${LOG} User reset to anonymous`);
  } catch (e: any) {
    console.log(`${LOG} logout failed:`, e?.message ?? e);
  }
};

/**
 * Listen for profile updates (subscription changes in background, and once
 * automatically right after activation with cached data).
 * Returns a cleanup function — call it in useEffect cleanup.
 */
export const addProfileListener = (
  callback: (profile: AdaptyProfile) => void,
): (() => void) => {
  const subscription = adapty.addEventListener("onLatestProfileLoad", callback);
  return () => {
    try {
      subscription.remove();
    } catch {
      // no-op
    }
  };
};
