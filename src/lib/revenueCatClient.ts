/**
 * RevenueCat Client
 *
 * Drop-in replacement for adaptyClient.ts — same guard pattern,
 * same result shape, same public API surface so callers change minimally.
 *
 * SDK: react-native-purchases v10.x
 * Entitlement: "Vocolens Pro"
 * Products:  monthly | three_month | yearly
 */

import { Platform } from "react-native";
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";

// ── Constants ─────────────────────────────────────────────────────────────────
export const RC_ENTITLEMENT = "Vocolens Pro";
const API_KEY_IOS = "test_mVoTgVAijXxZUyvweENUiQCbdeC";
const API_KEY_ANDROID = "test_mVoTgVAijXxZUyvweENUiQCbdeC"; // replace with Android key when available

// ── Result type (mirrors old Adapty shape) ────────────────────────────────────
export type RCGuardReason = "web_not_supported" | "not_configured" | "sdk_error";
export type RCResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: RCGuardReason; error?: unknown };

// ── Lazy-load native module ───────────────────────────────────────────────────
let Purchases: typeof import("react-native-purchases").default | null = null;
let nativeAvailable = false;

try {
  Purchases = require("react-native-purchases").default;
  nativeAvailable = true;
} catch {
  console.log("[RevenueCat] Native module not available (Expo Go / web). Payments disabled.");
}

const isWeb = Platform.OS === "web";
const isEnabled = !isWeb && nativeAvailable;

let configured = false;
const LOG = "[RevenueCat]";

// ── Guard helper ──────────────────────────────────────────────────────────────
async function guard<T>(
  action: string,
  op: () => Promise<T>,
): Promise<RCResult<T>> {
  if (isWeb) return { ok: false, reason: "web_not_supported" };
  if (!isEnabled || !Purchases) {
    console.log(`${LOG} ${action} skipped — not configured`);
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

/** Returns true when the SDK can make real purchases on this platform. */
export const isRevenueCatEnabled = (): boolean => isEnabled;

/**
 * Configure the SDK once per app launch.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export const configureRevenueCat = (): void => {
  if (!isEnabled || !Purchases || configured) return;
  try {
    const apiKey = Platform.OS === "ios" ? API_KEY_IOS : API_KEY_ANDROID;
    Purchases.configure({ apiKey });
    configured = true;
    console.log(`${LOG} SDK configured (${Platform.OS})`);
  } catch (e: any) {
    console.log(`${LOG} configure failed:`, e?.message ?? e);
  }
};

/** Fetch the current customer info (entitlements, active subscriptions). */
export const getCustomerInfo = (): Promise<RCResult<CustomerInfo>> =>
  guard("getCustomerInfo", () => Purchases!.getCustomerInfo());

/** Check whether a given entitlement is currently active. */
export const hasEntitlement = (
  info: CustomerInfo,
  entitlementId: string = RC_ENTITLEMENT,
): boolean => info.entitlements.active[entitlementId]?.isActive === true;

/** Fetch available offerings from RevenueCat dashboard. */
export const getOfferings = (): Promise<RCResult<{ offerings: PurchasesOffering[]; current: PurchasesOffering | null }>> =>
  guard("getOfferings", async () => {
    const result = await Purchases!.getOfferings();
    return {
      offerings: Object.values(result.all),
      current: result.current ?? null,
    };
  });

/** Purchase a package. Returns updated CustomerInfo on success. */
export const purchasePackage = (
  pkg: PurchasesPackage,
): Promise<RCResult<CustomerInfo>> =>
  guard("purchasePackage", async () => {
    const { customerInfo } = await Purchases!.purchasePackage(pkg);
    return customerInfo;
  });

/** Restore previous purchases. Returns updated CustomerInfo. */
export const restorePurchases = (): Promise<RCResult<CustomerInfo>> =>
  guard("restorePurchases", async () => {
    const customerInfo = await Purchases!.restorePurchases();
    return customerInfo;
  });

/**
 * Identify the user (anonymous by default).
 * Call this after the user signs in / you have a stable user ID.
 */
export const identifyUser = async (userId: string): Promise<void> => {
  if (!isEnabled || !Purchases) return;
  try {
    await Purchases!.logIn(userId);
    console.log(`${LOG} User identified: ${userId}`);
  } catch (e: any) {
    console.log(`${LOG} logIn failed:`, e?.message ?? e);
  }
};

/** Reset the user to anonymous (call on sign-out). */
export const resetUser = async (): Promise<void> => {
  if (!isEnabled || !Purchases) return;
  try {
    await Purchases!.logOut();
    console.log(`${LOG} User reset to anonymous`);
  } catch (e: any) {
    console.log(`${LOG} logOut failed:`, e?.message ?? e);
  }
};

/**
 * Listen for CustomerInfo updates (subscription changes in background).
 * Returns a cleanup function — call it in useEffect cleanup.
 */
export const addCustomerInfoListener = (
  callback: (info: CustomerInfo) => void,
): (() => void) => {
  if (!isEnabled || !Purchases) return () => {};
  const customerInfoUpdatedListener = Purchases!.addCustomerInfoUpdateListener(callback);
  return () => {
    try { customerInfoUpdatedListener?.remove?.(); } catch {}
  };
};
