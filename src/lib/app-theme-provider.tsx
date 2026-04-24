/**
 * App Theme Provider
 * Automatically provides theme colors based on selected theme and dark mode
 */

import React from 'react';
import { ThemeProvider } from './theme-context';
import { getThemeColors, getThemeGradients, getThemeShadows } from './theme';
import useOnboardingStore from './state/onboarding-store';
import useSettingsStore from './state/settings-store';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkModeSetting = useSettingsStore((s) => s.isDarkMode);

  // Midnight Glow theme always forces dark mode
  const isDarkMode = selectedTheme === 'darkMode' ? true : isDarkModeSetting;

  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  return (
    <ThemeProvider Colors={Colors} Gradients={Gradients} Shadows={Shadows}>
      {children}
    </ThemeProvider>
  );
}
