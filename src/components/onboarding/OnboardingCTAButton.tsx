/**
 * OnboardingCTAButton
 *
 * Single source of truth for all primary CTA buttons in the onboarding flow.
 * Border color automatically adapts to the active theme's primary color.
 */

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CaretRight } from 'phosphor-react-native';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

interface OnboardingCTAButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Override the right-side icon. Defaults to ChevronRight. Pass null to hide. */
  icon?: React.ReactNode | null;
  /** Vertical padding inside the button. Defaults to 16. */
  paddingVertical?: number;
  /** Font size for the label. Defaults to 18. */
  fontSize?: number;
  /** Override border color. Defaults to the active theme's primary color. */
  borderColor?: string;
  /** Use pill shape (full radius) instead of rounded rectangle. Defaults to true. */
  pill?: boolean;
  /** Add a colored glow/lift shadow beneath the button. Defaults to false. */
  glow?: boolean;
}

export function OnboardingCTAButton({
  label,
  onPress,
  disabled = false,
  icon = <CaretRight size={20} color="#FFFFFF" weight="bold" />,
  paddingVertical = 16,
  fontSize = 18,
  borderColor: customBorderColor,
  pill = true,
  glow = false,
}: OnboardingCTAButtonProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme];
  const themeBorderColor = themeColors.secondary || themeColors.primary;
  const activeBorderColor = disabled ? 'rgba(255,255,255,0.3)' : (customBorderColor || themeBorderColor);
  const borderRadius = pill ? 50 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.22)', borderless: false }}
      style={{
        width: '100%',
        borderRadius,
        borderWidth: 2,
        borderColor: activeBorderColor,
        opacity: disabled ? 0.48 : 1,
        shadowColor: glow ? themeBorderColor : '#000000',
        shadowOffset: { width: 0, height: glow ? 6 : 8 },
        shadowOpacity: disabled ? 0 : (glow ? 0.35 : 0.25),
        shadowRadius: glow ? 14 : 16,
        elevation: Platform.OS === 'android' ? 0 : (disabled ? 0 : 8),
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical,
          gap: 6,
          borderRadius: borderRadius - 2,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize,
            fontFamily: 'Inter_700Bold',
          }}
        >
          {label}
        </Text>
        {icon !== null && icon}
      </LinearGradient>
    </Pressable>
  );
}
