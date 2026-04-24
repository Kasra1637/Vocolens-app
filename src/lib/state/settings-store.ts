/**
 * Settings Store
 * Manages user preferences for notifications, dark mode, time, etc.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TimeFormat = '12h' | '24h';

interface SettingsState {
  // Notification Settings
  notificationsEnabled: boolean;
  dailyReminderTime: string; // Format: "HH:MM"

  // Display Settings
  isDarkMode: boolean;
  timeFormat: TimeFormat;

  // Actions
  setNotificationsEnabled: (enabled: boolean) => void;
  setDailyReminderTime: (time: string) => void;
  setIsDarkMode: (enabled: boolean) => void;
  setTimeFormat: (format: TimeFormat) => void;

  // Reset all settings
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  dailyReminderTime: '20:00',
  isDarkMode: false,
  timeFormat: '12h' as TimeFormat,
};

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setDailyReminderTime: (time) => set({ dailyReminderTime: time }),
      setIsDarkMode: (enabled) => set({ isDarkMode: enabled }),
      setTimeFormat: (format) => set({ timeFormat: format }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: any) => ({ ...DEFAULT_SETTINGS, ...persisted }),
    }
  )
);

export default useSettingsStore;
