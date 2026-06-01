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
  emotionReflectionMode: 'quick' as EmotionReflectionMode,
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
      migrate: (persisted: any) => {
        // Strip the old timeFormat field if present from previous versions
        const { timeFormat: _dropped, setTimeFormat: _droppedFn, ...rest } = persisted as any;
        return { ...DEFAULT_SETTINGS, ...rest };
      },
    }
  )
);

export default useSettingsStore;
