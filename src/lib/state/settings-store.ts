/**
 * Settings Store
 * Manages user preferences for notifications, dark mode, time, etc.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TimeFormat = '12h' | '24h';
export type EmotionReflectionMode = 'full' | 'quick' | 'off';

interface SettingsState {
  // Notification Settings
  notificationsEnabled: boolean;
  dailyReminderTime: string; // Format: "HH:MM"

  // Display Settings
  isDarkMode: boolean;
  timeFormat: TimeFormat;

  // Emotion Reflection Settings
  emotionReflectionMode: EmotionReflectionMode;

  // Actions
  setNotificationsEnabled: (enabled: boolean) => void;
  setDailyReminderTime: (time: string) => void;
  setIsDarkMode: (enabled: boolean) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setEmotionReflectionMode: (mode: EmotionReflectionMode) => void;

  // Reset all settings
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  dailyReminderTime: '20:00',
  isDarkMode: false,
  timeFormat: '12h' as TimeFormat,
  emotionReflectionMode: 'quick' as EmotionReflectionMode,
};

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setDailyReminderTime: (time) => set({ dailyReminderTime: time }),
      setIsDarkMode: (enabled) => set({ isDarkMode: enabled }),
      setTimeFormat: (format) => set({ timeFormat: format }),
      setEmotionReflectionMode: (mode) => set({ emotionReflectionMode: mode }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: any, version) => {
        if (version < 2) {
          return { ...DEFAULT_SETTINGS, ...persisted, emotionReflectionMode: 'quick' };
        }
        return { ...DEFAULT_SETTINGS, ...persisted };
      },
    }
  )
);

export default useSettingsStore;
