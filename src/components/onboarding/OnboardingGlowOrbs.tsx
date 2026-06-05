/**
 * OnboardingGlowOrbs
 *
 * Persistent pulsing background glow orbs rendered behind all onboarding screens.
 * Mounted once in AuthGate — never remounts on step changes, so no hooks violation.
 * Color adapts to the user's selected theme primary color.
 *
 * Usage: render as the FIRST child inside a `position: "relative"` or `flex: 1` View,
 * followed by the screen content. Orbs are absolutely positioned and non-interactive.
 */

import React, { useEffect } from "react";
import { useWindowDimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function OnboardingGlowOrbs() {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const primary = THEME_COLORS[selectedTheme].primary;
  const glowColor = hexToRgba(primary, 0.14);

  const orb1Opacity = useSharedValue(0.25);
  const orb2Opacity = useSharedValue(0.12);

  const orb1Style = useAnimatedStyle(() => ({ opacity: orb1Opacity.value }));
  const orb2Style = useAnimatedStyle(() => ({ opacity: orb2Opacity.value }));

  useEffect(() => {
    orb1Opacity.value = withRepeat(
      withSequence(
        withTiming(0.60, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.20, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    orb2Opacity.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(0.45, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.10, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  return (
    <>
      {/* Orb 1 — upper-left quadrant */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          orb1Style,
          {
            top: screenHeight * 0.05,
            left: -screenWidth * 0.20,
            width: screenWidth * 0.85,
            height: screenWidth * 0.85,
            borderRadius: screenWidth * 0.425,
            backgroundColor: glowColor,
          },
        ]}
      />
      {/* Orb 2 — lower-right quadrant */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          orb2Style,
          {
            bottom: screenHeight * 0.05,
            right: -screenWidth * 0.25,
            width: screenWidth * 0.80,
            height: screenWidth * 0.80,
            borderRadius: screenWidth * 0.40,
            backgroundColor: glowColor,
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    zIndex: 0,
  },
});
