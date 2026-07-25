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
  return (
    Constants.expoConfig?.extra?.EXPO_PUBLIC_VOCOLENS_API_KEY ||
    process.env.EXPO_PUBLIC_VOCOLENS_API_KEY ||
    ''
  );
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

  return fetch(url, {
    ...options,
    headers,
  });
}
