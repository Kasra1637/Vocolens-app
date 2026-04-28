// Global Design System Configuration
// This file defines the mandatory design system for the entire app

import { THEME_COLORS, type ThemeColorType } from './state/onboarding-store';
import { Platform } from 'react-native';

// Dynamic theme function that returns colors based on selected theme and dark mode
export const getThemeColors = (selectedTheme: ThemeColorType = 'lavenderBliss', isDarkMode: boolean = false) => {
  const theme = THEME_COLORS[selectedTheme] || THEME_COLORS.lavenderBliss;

  if (isDarkMode) {
    return {
      // Base - Dark backgrounds
      background: '#121212',
      backgroundSecondary: '#1E1E1E',

      // Primary System from selected theme (brightened for dark mode)
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,

      // Gradient System from selected theme
      gradientStart: theme.gradientStart,
      gradientEnd: theme.gradientEnd,

      // Purple Spectrum for Charts & Data (neutral dark for dark mode)
      purple50: '#1A1A1A',
      purple100: '#222222',
      purple200: '#2A2A2A',
      purple300: '#333333',
      purple400: '#4A4A4A',
      purple500: '#8B6DA8',
      purple600: '#A687BF',
      purple700: '#C1A0D6',
      purple800: '#D8BFEA',
      purple900: '#EBD9F7',

      // Functional Colors
      success: theme.secondary,
      warning: theme.accent,
      error: '#8B5CF6',

      // Text - White for maximum contrast on dark background
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textTertiary: '#A0A0A0',

      // Surfaces - Neutral dark
      surface: 'rgba(42, 42, 42, 0.85)',
      surfaceHighlight: 'rgba(55, 55, 55, 0.9)',
      surfaceElevated: 'rgba(48, 48, 48, 0.85)',
    };
  }

  // Light mode colors (original)
  return {
    // Base
    background: '#FAFAFA',
    backgroundSecondary: '#FFFFFF',

    // Primary System from selected theme
    primary: theme.primary,
    secondary: theme.secondary,
    accent: theme.accent,

    // Gradient System from selected theme
    gradientStart: theme.gradientStart,
    gradientEnd: theme.gradientEnd,

    // Purple Spectrum for Charts & Data (keeping for backwards compatibility)
    purple50: '#FAF5FF',
    purple100: '#F3E8FF',
    purple200: '#E9D5FF',
    purple300: '#D8B4FE',
    purple400: '#C084FC',
    purple500: '#A855F7',
    purple600: '#9333EA',
    purple700: '#7E22CE',
    purple800: '#6B21A8',
    purple900: '#581C87',

    // Functional Colors (theme-tinted)
    success: theme.secondary,
    warning: theme.accent,
    error: '#C4B5FD',

    // Text (theme-tinted grays)
    textPrimary: '#3B2463',
    textSecondary: '#6B5B95',
    textTertiary: '#9D8EC9',

    // Surfaces (theme-tinted)
    surface: 'rgba(255, 255, 255, 0.7)',
    surfaceHighlight: 'rgba(255, 255, 255, 0.9)',
    surfaceElevated: 'rgba(255, 255, 255, 0.85)',
  };
};

// Default colors (lavenderBliss theme)
export const Colors = getThemeColors('lavenderBliss');

export const getThemeGradients = (selectedTheme: ThemeColorType = 'lavenderBliss', isDarkMode: boolean = false) => {
  const theme = THEME_COLORS[selectedTheme] || THEME_COLORS.lavenderBliss;

  if (isDarkMode) {
    return {
      primary: [theme.gradientEnd, theme.gradientStart] as const,
      background: theme.backgroundGradient,
      button: [theme.gradientEnd, theme.primary, theme.gradientStart] as const,
      chart: [theme.gradientEnd, theme.primary, theme.gradientStart, theme.accent] as const,
    };
  }

  return {
    primary: [theme.gradientEnd, theme.gradientStart] as const,
    background: theme.backgroundGradient,
    button: [theme.gradientEnd, theme.primary, theme.gradientStart] as const,
    chart: [theme.gradientEnd, theme.primary, theme.gradientStart, theme.accent] as const,
  };
};

export const Gradients = getThemeGradients('lavenderBliss');

export const getThemeShadows = (selectedTheme: ThemeColorType = 'lavenderBliss') => {
  const theme = THEME_COLORS[selectedTheme] || THEME_COLORS.lavenderBliss;

  return {
    small: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: Platform.OS === 'android' ? 0 : 3,
    },
    medium: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: Platform.OS === 'android' ? 0 : 6,
    },
    large: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: Platform.OS === 'android' ? 0 : 10,
    },
  };
};

export const Shadows = getThemeShadows('lavenderBliss');

export const BorderRadius = {
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
  round: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
