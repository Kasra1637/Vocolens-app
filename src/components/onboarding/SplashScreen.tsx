/**
 * Splash Screen
 *
 * First screen shown on every app launch.
 * - Uses the user's selected theme background gradient
 * - EmotionalCompanion at 30% of screen height, centered
 * - No text, no buttons, no progress bar, no glow effects
 * - Auto-dismisses after ~2.5s with a fade-out
 */

import React, { useEffect } from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

interface Props {
  onDone: () => void;
}

export function SplashScreen({ onDone }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const companionSize = Math.round(screenHeight * 0.30);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const theme = THEME_COLORS[selectedTheme];
  const bgGradient = theme.backgroundGradient as unknown as [string, string, string];

  const companionOpacity = useSharedValue(0);
  const companionScale   = useSharedValue(0.72);
  const screenOpacity    = useSharedValue(1);

  const companionStyle = useAnimatedStyle(() => ({
    opacity: companionOpacity.value,
    transform: [{ scale: companionScale.value }],
  }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  useEffect(() => {
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
