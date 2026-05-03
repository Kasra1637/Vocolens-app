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

import React, { useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import {
  BUTTON_PRESS_SCALE,
  BUTTON_RELEASE_DURATION,
  PULSE_CONFIG,
} from "@/lib/animations";

interface OnboardingCTAButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Override the right-side icon. Defaults to ChevronRight. Pass null to hide. */
  icon?: React.ReactNode | null;
  /** Vertical padding inside the button. Defaults to 16. */
  paddingVertical?: number;
  /** Font size for the label. Defaults to 17. */
  fontSize?: number;
  /** Enable pulse animation. Defaults to true for onboarding continue buttons. */
  pulse?: boolean;
  /** Primary theme color for the glow effect. */
  primaryColor?: string;
}

export function OnboardingCTAButton({
  label,
  onPress,
  disabled = false,
  icon = <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />,
  paddingVertical = 16,
  fontSize = 17,
  pulse = false,
  primaryColor = "#FFFFFF",
}: OnboardingCTAButtonProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (pulse && !disabled) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, PULSE_CONFIG),
          withTiming(1, PULSE_CONFIG),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [pulse, disabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: withTiming(disabled ? 0 : 0.25 + glow.value * 0.4),
    shadowRadius: withTiming(disabled ? 0 : 16 + glow.value * 8),
  }));

  const handlePressIn = () => {
    if (disabled) return;
    // Scale down instantly
    scale.value = withTiming(BUTTON_PRESS_SCALE, { duration: 0 });
    glow.value = withTiming(1, { duration: 50 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    // Return to 1.0 on release (or pulse if active)
    if (pulse) {
      scale.value = withSequence(
        withTiming(1, { duration: BUTTON_RELEASE_DURATION }),
        withRepeat(
          withSequence(
            withTiming(1.03, PULSE_CONFIG),
            withTiming(1, PULSE_CONFIG),
          ),
          -1,
          true,
        ),
      );
    } else {
      scale.value = withTiming(1, { duration: BUTTON_RELEASE_DURATION });
    }
    glow.value = withTiming(0, { duration: BUTTON_RELEASE_DURATION });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      android_ripple={{ color: "rgba(255,255,255,0.22)", borderless: false }}
      style={{ width: "100%" }}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            borderRadius: 18,
            borderWidth: 2,
            borderColor: disabled ? "rgba(255,255,255,0.3)" : "#FFFFFF",
            overflow: "hidden",
            opacity: disabled ? 0.48 : 1,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: Platform.OS === "android" ? 0 : disabled ? 0 : 8,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical,
            gap: 6,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize,
              fontFamily: "Inter_700Bold",
            }}
          >
            {label}
          </Text>
          {icon !== null && icon}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
