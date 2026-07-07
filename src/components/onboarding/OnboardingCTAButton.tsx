/**
 * OnboardingCTAButton
 *
 * Single source of truth for all primary CTA buttons in the onboarding flow.
 * Matches the ReminderScreen reference design exactly on both iOS and Android:
 *  - LinearGradient translucent white fill (matches ReminderScreen)
 *  - android_ripple for proper Android touch feedback
 *  - borderRadius in style (not className) so Android clips the ripple correctly
 *  - overflow: hidden for Android ripple containment
 *  - iOS shadow via shadowColor/shadowOffset/etc.
 *  - disabled state with reduced opacity + dimmed border
 */

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';

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
  /** Override border color. Defaults to #FFFFFF. */
  borderColor?: string;
}

export function OnboardingCTAButton({
  label,
  onPress,
  disabled = false,
  icon = <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />,
  paddingVertical = 16,
  fontSize = 18,
  borderColor: customBorderColor,
}: OnboardingCTAButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.22)', borderless: false }}
      style={{
        width: '100%',
        borderRadius: 18,
        borderWidth: 2,
        borderColor: disabled ? 'rgba(255,255,255,0.3)' : (customBorderColor || '#FFFFFF'),
        overflow: 'hidden',
        opacity: disabled ? 0.48 : 1,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: disabled ? 0 : 0.25,
        shadowRadius: 16,
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
