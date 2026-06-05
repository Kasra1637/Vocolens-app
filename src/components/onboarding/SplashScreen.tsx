/**
 * Splash Screen
 *
 * First screen shown on every app launch.
 * - Uses the user's selected theme background gradient and primary color
 * - Two soft radial glow orbs pulsing in background
 * - EmotionalCompanion at 30% of screen height, centered
 * - No text, no buttons, no progress bar
 * - Auto-dismisses after ~2.5s with a fade-out
 */

import React, { useEffect } from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const companionSize = Math.round(screenHeight * 0.30);

  // Read user's chosen theme — falls back to Midnight Glow on first launch
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const theme = THEME_COLORS[selectedTheme];
  const bgGradient = theme.backgroundGradient as unknown as [string, string, string];
  const glowColor = hexToRgba(theme.primary, 0.12);

  // ── Animation values ──────────────────────────────────────────────────────
  const companionOpacity = useSharedValue(0);
  const companionScale   = useSharedValue(0.72);
  const orb1Opacity      = useSharedValue(0.3);
  const orb2Opacity      = useSharedValue(0.15);
  const screenOpacity    = useSharedValue(1);

  // ── Animated styles ───────────────────────────────────────────────────────
  const companionStyle = useAnimatedStyle(() => ({
    opacity: companionOpacity.value,
    transform: [{ scale: companionScale.value }],
  }));
  const orb1Style = useAnimatedStyle(() => ({ opacity: orb1Opacity.value }));
  const orb2Style = useAnimatedStyle(() => ({ opacity: orb2Opacity.value }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Sequence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    orb1Opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
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
    companionOpacity.value = withDelay(300, withTiming(1, { duration: 700, easing: SOFT }));
    companionScale.value   = withDelay(300, withTiming(1, { duration: 700, easing: SOFT }));
    screenOpacity.value    = withDelay(
      2200,
      withTiming(0, { duration: 350, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, screenStyle]}>
      <LinearGradient
        colors={bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Glow orb 1 — upper-left */}
      <Animated.View
        pointerEvents="none"
        style={[orb1Style, {
          position: "absolute",
          top: -screenHeight * 0.12,
          left: -screenWidth * 0.20,
          width: screenWidth * 0.85,
          height: screenWidth * 0.85,
          borderRadius: screenWidth * 0.425,
          backgroundColor: glowColor,
        }]}
      />

      {/* Glow orb 2 — lower-right */}
      <Animated.View
        pointerEvents="none"
        style={[orb2Style, {
          position: "absolute",
          bottom: -screenHeight * 0.10,
          right: -screenWidth * 0.25,
          width: screenWidth * 0.80,
          height: screenWidth * 0.80,
          borderRadius: screenWidth * 0.40,
          backgroundColor: glowColor,
        }]}
      />

      {/* Companion — centered, 30% screen height */}
      <View style={styles.center}>
        <Animated.View style={companionStyle}>
          <EmotionalCompanion
            state="idle"
            size={companionSize}
            themeColor={theme.primary}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
