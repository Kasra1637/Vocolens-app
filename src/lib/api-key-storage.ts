/**
 * Secure OpenRouter API Key Storage
 *
 * Stores the user-supplied OpenRouter key in expo-secure-store
 * (iOS Keychain / Android Keystore). On web it falls back to
 * in-memory only (never written to localStorage in plain text).
 *
 * Priority for consumers:
 *   1. Value saved here (user-supplied)
 *   2. EXPO_PUBLIC_OPENROUTER_API_KEY env var (build-time)
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY_NAME = "openrouter_api_key";

// Web: keep in memory only for this session (never persisted to localStorage)
let _webSessionKey: string | null = null;

export async function saveOpenRouterKey(key: string): Promise<void> {
  if (Platform.OS === "web") {
    _webSessionKey = key;
    return;
  }
  await SecureStore.setItemAsync(KEY_NAME, key);
}

export async function getOpenRouterKey(): Promise<string | null> {
  if (Platform.OS === "web") {
    return _webSessionKey;
  }
  try {
    return await SecureStore.getItemAsync(KEY_NAME);
  } catch {
    return null;
  }
}

export async function clearOpenRouterKey(): Promise<void> {
  if (Platform.OS === "web") {
    _webSessionKey = null;
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY_NAME);
  } catch {
    // key may not exist
  }
}

export async function hasOpenRouterKey(): Promise<boolean> {
  const k = await getOpenRouterKey();
  return !!(k && k.startsWith("sk-or-"));
}
