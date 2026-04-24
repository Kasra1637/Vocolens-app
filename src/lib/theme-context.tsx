/**
 * Theme Context
 * Provides theme values throughout component trees without prop drilling
 */

import React, { createContext, useContext } from 'react';
import { getThemeColors, getThemeGradients, getThemeShadows } from './theme';

type ThemeContextValue = {
  Colors: ReturnType<typeof getThemeColors>;
  Gradients: ReturnType<typeof getThemeGradients>;
  Shadows: ReturnType<typeof getThemeShadows>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function ThemeProvider({
  children,
  Colors,
  Gradients,
  Shadows,
}: {
  children: React.ReactNode;
  Colors: ReturnType<typeof getThemeColors>;
  Gradients: ReturnType<typeof getThemeGradients>;
  Shadows: ReturnType<typeof getThemeShadows>;
}) {
  return (
    <ThemeContext.Provider value={{ Colors, Gradients, Shadows }}>
      {children}
    </ThemeContext.Provider>
  );
}
