/**
 * Usage Service — syncs session minutes to backend and local store
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import useUserStatsStore from '../state/user-stats-store';
import { apiFetch } from './client';

export interface UsageStatus {
  monthlyMinutesUsed: number;
  totalMinutesUsed: number;
  limitMinutes: number;
  remainingMinutes: number;
  isAtLimit: boolean;
}

/** Stable device identifier — uses the OS-provided install ID */
function getDeviceId(): string {
  return (
    Application.getAndroidId?.() ??
    Constants.expoConfig?.extra?.deviceId ??
    'unknown-device'
  );
}

/**
 * Record a completed session's duration on the backend AND in the local store.
 * Both are updated together so the UI is always current even when offline.
 */
export async function recordSessionUsage(seconds: number): Promise<UsageStatus | null> {
  if (seconds <= 0) return null;

  // Always update local store immediately for real-time UI
  useUserStatsStore.getState().addUsageSeconds(seconds);

  try {
    const deviceId = getDeviceId();
    const response = await apiFetch('/api/usage/record', {
      method: 'POST',
      headers: { 'X-Device-Id': deviceId },
      body: JSON.stringify({ seconds }),
    });

    if (!response.ok) {
      console.warn('[UsageService] Backend record failed:', response.status);
      return null;
    }

    const data = await response.json() as { success: boolean } & UsageStatus;
    console.log(`[UsageService] Session recorded: ${seconds}s | monthly=${data.monthlyMinutesUsed.toFixed(1)}/${data.limitMinutes}min`);
    return data;
  } catch (err) {
    console.warn('[UsageService] Backend unreachable, local store updated:', err);
    return null;
  }
}

/**
 * Fetch current usage from backend and sync to local store.
 * Call on app startup to reconcile any drift.
 */
export async function syncUsageFromBackend(): Promise<UsageStatus | null> {
  try {
    const deviceId = getDeviceId();
    const response = await apiFetch('/api/usage/status', {
      headers: { 'X-Device-Id': deviceId },
    });

    if (!response.ok) return null;

    const data = await response.json() as UsageStatus;
    // Sync local store with backend (take the higher value to avoid accidental reset)
    const localMinutes = useUserStatsStore.getState().getUsageMinutes();
    if (data.monthlyMinutesUsed > localMinutes) {
      const diff = data.monthlyMinutesUsed - localMinutes;
      useUserStatsStore.getState().addUsageSeconds(diff * 60);
    }
    return data;
  } catch {
    return null;
  }
}
