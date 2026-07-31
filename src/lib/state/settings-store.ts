/**
 * Settings Store
 * Manages user preferences for notifications, dark mode, etc.
 * Time format is no longer a user setting — the app always uses the
 * device's local 12-hour format via the JavaScript Intl / toLocaleTimeString APIs.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EmotionReflectionMode = 'full' | 'quick' | 'off';

interface SettingsState {
  // Notification Settings
  notificationsEnabled: boolean;
  dailyReminderTime: string; // Format: "HH:MM"

  // Display Settings
  isDarkMode: boolean;

  // Emotion Reflection Settings
  emotionReflectionMode: EmotionReflectionMode;

  // Actions
  setNotificationsEnabled: (enabled: boolean) => void;
  setDailyReminderTime: (time: string) => void;
  setIsDarkMode: (enabled: boolean) => void;
  setEmotionReflectionMode: (mode: EmotionReflectionMode) => void;

  // Reset all settings
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  dailyReminderTime: '20:00',
  isDarkMode: false,
  emotionReflectionMode: 'full' as EmotionReflectionMode,
};

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setDailyReminderTime: (time) => set({ dailyReminderTime: time }),
      setIsDarkMode: (enabled) => set({ isDarkMode: enabled }),
      setEmotionReflectionMode: (mode) => set({ emotionReflectionMode: mode }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted: any, version: number) => {
        // Guard against null/undefined/malformed persisted state. Object-rest
        // destructuring of null throws, which would break rehydration entirely
        // and leave the app stuck on a blank screen. Every other store in this
        // project guards the same way.
        const source = (persisted ?? {}) as Record<string, unknown>;

        // v0/v1/v2 → v3: drop the removed `timeFormat` field (and its stale
        // setter, if a previous version accidentally persisted it). Unknown
        // fields are dropped by spreading DEFAULT_SETTINGS first.
        if (version < 3) {
          const {
            timeFormat: _droppedTimeFormat,
            setTimeFormat: _droppedSetter,
            ...rest
          } = source;
          return { ...DEFAULT_SETTINGS, ...rest };
        }

        return { ...DEFAULT_SETTINGS, ...source };
      },
    }
  )
);

export default useSettingsStore;
