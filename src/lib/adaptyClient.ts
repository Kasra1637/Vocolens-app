/**
 * Adapty Client Module
 *
 * This module provides a centralized Adapty SDK wrapper that gracefully handles
 * missing configuration AND missing native modules (e.g. running inside Expo Go
 * without the react-native-adapty native binary).
 *
 * When the native module is unavailable (Expo Go), all functions return
 * { ok: false, reason: "not_configured" } - the app continues without payments.
 *
 * Environment Variables:
 * - EXPO_PUBLIC_ADAPTY_KEY: The public SDK key from Adapty Dashboard
 */

import { Platform } from "react-native";

// ── Types ─────────────────────────────────────────────────────────────────────
import type {
  AdaptyPaywall,
  AdaptyPaywallProduct,
  AdaptyProfile,
} from "react-native-adapty";

export type { AdaptyPaywall, AdaptyPaywallProduct, AdaptyProfile };

export type AdaptyGuardReason =
  | "web_not_supported"
  | "not_configured"
  | "sdk_error";

export type AdaptyResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AdaptyGuardReason; error?: unknown };

// ── Lazy-load the native module ──────────────────────────────────────────────
// This is the critical fix: instead of a top-level `import { adapty } from ...`
// which crashes if the native module isn't linked (Expo Go), we try/catch it.
let adaptyInstance: any = null;
let nativeModuleAvailable = false;

try {
  adaptyInstance = require("react-native-adapty").adapty;
  nativeModuleAvailable = true;
} catch (e) {
  console.log(
    "[Adapty] Native module not available (expected in Expo Go). Payments disabled.",
  );
  nativeModuleAvailable = false;
}

// ── Configuration ────────────────────────────────────────────────────────────
const isWeb = Platform.OS === "web";
const adaptyKey = process.env.EXPO_PUBLIC_ADAPTY_KEY;
const isEnabled = !!adaptyKey && !isWeb && nativeModuleAvailable;

const LOG_PREFIX = "[Adapty]";

let activated = false;

// ── Guard helper ─────────────────────────────────────────────────────────────
const guardAdaptyUsage = async <T>(
  action: string,
  operation: () => Promise<T>,
): Promise<AdaptyResult<T>> => {
  if (isWeb) {
    console.log(
      `${LOG_PREFIX} ${action} skipped: payments are not supported on web.`,
    );
    return { ok: false, reason: "web_not_supported" };
  }

  if (!isEnabled) {
    console.log(`${LOG_PREFIX} ${action} skipped: Adapty not configured`);
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

// ── Public API ───────────────────────────────────────────────────────────────

export const isAdaptyEnabled = (): boolean => {
  return isEnabled;
};

export const activateAdapty = async (): Promise<void> => {
  if (!isEnabled || !adaptyInstance || activated) return;
  try {
    await adaptyInstance.activate(adaptyKey!);
    activated = true;
    console.log(`${LOG_PREFIX} SDK activated successfully`);
  } catch (error) {
    console.log(`${LOG_PREFIX} Activation failed:`, error);
  }
};

export const getPaywall = (
  placementId: string,
): Promise<
  AdaptyResult<{ paywall: AdaptyPaywall; products: AdaptyPaywallProduct[] }>
> => {
  return guardAdaptyUsage("getPaywall", async () => {
    const paywall: AdaptyPaywall = await adaptyInstance.getPaywall(placementId);
    const products: AdaptyPaywallProduct[] =
      await adaptyInstance.getPaywallProducts(paywall);
    // Log paywall impression for A/B testing analytics
    await adaptyInstance.logShowPaywall(paywall);
    return { paywall, products };
  });
};

export const getProfile = (): Promise<AdaptyResult<AdaptyProfile>> => {
  return guardAdaptyUsage("getProfile", () => adaptyInstance.getProfile());
};

export const makePurchase = (
  product: AdaptyPaywallProduct,
): Promise<AdaptyResult<AdaptyProfile>> => {
  return guardAdaptyUsage("makePurchase", async () => {
    const result = await adaptyInstance.makePurchase(product);
    if (result.type === "user_cancelled") {
      throw Object.assign(new Error("User cancelled"), { userCancelled: true });
    }
    if (result.type === "pending") {
      throw Object.assign(new Error("Purchase pending"), { pending: true });
    }
    return result.profile;
  });
};

export const restoreAdaptyPurchases = (): Promise<
  AdaptyResult<AdaptyProfile>
> => {
  return guardAdaptyUsage("restorePurchases", () =>
    adaptyInstance.restorePurchases(),
  );
};

export const hasEntitlement = (
  profile: AdaptyProfile,
  entitlementId: string,
): boolean => {
  return profile.accessLevels?.[entitlementId]?.isActive === true;
};
