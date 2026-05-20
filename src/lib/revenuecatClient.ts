/**
 * RevenueCat Client Module
 *
 * This module provides a centralized RevenueCat SDK wrapper that gracefully handles
 * missing configuration AND missing native modules (e.g. running inside Expo Go
 * without the react-native-purchases native binary).
 *
 * When the native module is unavailable (Expo Go), all functions return
 * { ok: false, reason: "not_configured" } — the app continues without payments.
 *
 * Environment Variables:
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY: Used in development/test builds (both platforms)
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY: Used in production builds (iOS)
 * - EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY: Used in production builds (Android)
 */

import { Platform } from "react-native";

// ── Types (re-exported so consumers don't need to import from react-native-purchases) ──
export type PurchasesOfferings = any;
export type CustomerInfo = any;
export type PurchasesPackage = any;

export type RevenueCatGuardReason =
  | "web_not_supported"
  | "not_configured"
  | "sdk_error";

export type RevenueCatResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: RevenueCatGuardReason; error?: unknown };

// ── Lazy-load the native module ──────────────────────────────────────────────
// This is the critical fix: instead of a top-level `import Purchases from ...`
// which crashes if the native module isn't linked (Expo Go), we try/catch it.
let Purchases: any = null;
let nativeModuleAvailable = false;

try {
  // require() is evaluated at bundle time but wrapped in try/catch so if
  // the native module throws (Expo Go), we catch it gracefully.
  Purchases = require("react-native-purchases").default;
  nativeModuleAvailable = true;
} catch (e) {
  console.log(
    "[RevenueCat] Native module not available (expected in Expo Go). Payments disabled.",
  );
  nativeModuleAvailable = false;
}

// ── Configuration ────────────────────────────────────────────────────────────
const isWeb = Platform.OS === "web";
const testKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY;
const appleKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY;
const googleKey = process.env.EXPO_PUBLIC_VIBECODE_REVENUECAT_GOOGLE_KEY;

const getApiKey = (): string | undefined => {
  if (isWeb) return undefined;
  if (__DEV__) return testKey;
  return Platform.OS === "ios" ? appleKey : googleKey;
};

const apiKey = getApiKey();
const isEnabled = !!apiKey && !isWeb && nativeModuleAvailable;

const LOG_PREFIX = "[RevenueCat]";

// ── Guard helper ─────────────────────────────────────────────────────────────
const guardRevenueCatUsage = async <T>(
  action: string,
  operation: () => Promise<T>,
): Promise<RevenueCatResult<T>> => {
  if (isWeb) {
    console.log(
      `${LOG_PREFIX} ${action} skipped: payments are not supported on web.`,
    );
    return { ok: false, reason: "web_not_supported" };
  }

  if (!isEnabled) {
    console.log(`${LOG_PREFIX} ${action} skipped: RevenueCat not configured`);
    return { ok: false, reason: "not_configured" };
  }

  try {
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    console.log(`${LOG_PREFIX} ${action} failed:`, error);
    return { ok: false, reason: "sdk_error", error };
  }
};

// ── Initialize RevenueCat (only if native module is available + keys set) ────
if (isEnabled && Purchases) {
  try {
    Purchases.setLogHandler((logLevel: any, message: string) => {
      if (logLevel === Purchases.LOG_LEVEL?.ERROR) {
        console.log(LOG_PREFIX, message);
      }
    });
    Purchases.configure({ apiKey: apiKey! });
    console.log(`${LOG_PREFIX} SDK initialized successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to initialize:`, error);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const isRevenueCatEnabled = (): boolean => {
  return isEnabled;
};

export const getOfferings = (): Promise<
  RevenueCatResult<PurchasesOfferings>
> => {
  return guardRevenueCatUsage("getOfferings", () => Purchases.getOfferings());
};

export const purchasePackage = (
  packageToPurchase: PurchasesPackage,
): Promise<RevenueCatResult<CustomerInfo>> => {
  return guardRevenueCatUsage("purchasePackage", async () => {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  });
};

export const getCustomerInfo = (): Promise<RevenueCatResult<CustomerInfo>> => {
  return guardRevenueCatUsage("getCustomerInfo", () =>
    Purchases.getCustomerInfo(),
  );
};

export const restorePurchases = (): Promise<
  RevenueCatResult<CustomerInfo>
> => {
  return guardRevenueCatUsage("restorePurchases", () =>
    Purchases.restorePurchases(),
  );
};

export const setUserId = (userId: string): Promise<RevenueCatResult<void>> => {
  return guardRevenueCatUsage("setUserId", async () => {
    await Purchases.logIn(userId);
  });
};

export const logoutUser = (): Promise<RevenueCatResult<void>> => {
  return guardRevenueCatUsage("logoutUser", async () => {
    await Purchases.logOut();
  });
};

export const hasEntitlement = async (
  entitlementId: string,
): Promise<RevenueCatResult<boolean>> => {
  const customerInfoResult = await getCustomerInfo();

  if (!customerInfoResult.ok) {
    return {
      ok: false,
      reason: customerInfoResult.reason,
      error: customerInfoResult.error,
    };
  }

  const isActive = Boolean(
    customerInfoResult.data.entitlements.active?.[entitlementId],
  );
  return { ok: true, data: isActive };
};

export const hasActiveSubscription = async (): Promise<
  RevenueCatResult<boolean>
> => {
  const customerInfoResult = await getCustomerInfo();

  if (!customerInfoResult.ok) {
    return {
      ok: false,
      reason: customerInfoResult.reason,
      error: customerInfoResult.error,
    };
  }

  const hasSubscription =
    Object.keys(customerInfoResult.data.entitlements.active || {}).length > 0;
  return { ok: true, data: hasSubscription };
};

export const getPackage = async (
  packageIdentifier: string,
): Promise<RevenueCatResult<PurchasesPackage | null>> => {
  const offeringsResult = await getOfferings();

  if (!offeringsResult.ok) {
    return {
      ok: false,
      reason: offeringsResult.reason,
      error: offeringsResult.error,
    };
  }

  const pkg =
    offeringsResult.data.current?.availablePackages.find(
      (availablePackage: any) =>
        availablePackage.identifier === packageIdentifier,
    ) ?? null;

  return { ok: true, data: pkg };
};
