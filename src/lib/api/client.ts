/**
 * API Client — centralised fetch wrapper for all backend calls.
 *
 * Automatically attaches:
 *   - X-Api-Key header (from EXPO_PUBLIC_VOCOLENS_API_KEY env var)
 *   - Content-Type: application/json (for POST requests)
 *
 * All backend service modules should use `apiClient` instead of raw `fetch`.
 */

import Constants from 'expo-constants';

function getBackendUrl(): string {
  const url =
    Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'https://vocolens-api.kasrammarvel.workers.dev';
  return String(url).replace(/\/$/, '');
}

function getApiKey(): string {
  const fromConstants = Constants.expoConfig?.extra?.EXPO_PUBLIC_VOCOLENS_API_KEY;
  const fromEnv = process.env.EXPO_PUBLIC_VOCOLENS_API_KEY;
  const key = fromConstants || fromEnv || '';

  // ── DEBUG: log API key resolution (remove after confirming fix) ────────
  console.log('[API Client] Key resolution:', {
    fromConstants: fromConstants ? `"${String(fromConstants).slice(0, 4)}...${String(fromConstants).slice(-4)}" (len=${String(fromConstants).length})` : 'MISSING',
    fromEnv: fromEnv ? `"${String(fromEnv).slice(0, 4)}...${String(fromEnv).slice(-4)}" (len=${String(fromEnv).length})` : 'MISSING',
    resolved: key ? `"${key.slice(0, 4)}...${key.slice(-4)}" (len=${key.length})` : 'EMPTY — will NOT send X-Api-Key header',
  });

  return key;
}

export const BACKEND_URL = getBackendUrl();

/**
 * Authenticated fetch wrapper.
 * Appends X-Api-Key to every request and defaults Content-Type for POST.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${getBackendUrl()}${path}`;
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Always attach API key
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }

  // Default Content-Type for POST
  if (options.method === 'POST' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // ── DEBUG: log outgoing request details (remove after confirming fix) ──
  console.log('[API Client] Request:', {
    url,
    method: options.method || 'GET',
    hasApiKey: Boolean(apiKey),
    apiKeyPreview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'NONE',
    headers: Object.keys(headers),
  });

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // ── DEBUG: log response status (remove after confirming fix) ───────────
  if (!response.ok) {
    console.error('[API Client] Response FAILED:', {
      url,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return response;
}
