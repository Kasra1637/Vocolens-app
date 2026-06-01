/**
 * Biometric Unlock Celebration
 *
 * A smooth, joyful one-time overlay shown the FIRST time a user successfully
 * unlocks the app with their fingerprint. Plays a gentle confetti burst, a
 * springy success badge, and a warm welcome message, then auto-dismisses to
 * the dashboard. After the first time it never shows again.
 *
 * Design language: mirrors MilestoneCelebration (confetti + spring pop) but
 * lighter and quicker, and uses the app's EmotionalCompanion in its success state.
 */

import React, { useEffect } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { ShieldCheck } from "lucide-react-native";
import { celebrationHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";

const { width: SW, height: SH } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#A78BFA",
  "#FF9FF3",
  "#FFA94D",
  "#63E6BE",
];

// Stable particle layout
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i / 18) * SW + ((i % 3) - 1) * 16,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: i * 45,
  duration: 1700 + (i % 5) * 160,
  driftX: ((i % 4) - 1.5) * 48,
  rot: (i % 2 === 0 ? 1 : -1) * (200 + i * 14),
  size: i % 3 === 0 ? 9 : 6,
  shape: i % 4 === 0 ? "circle" : "rect",
}));

function Particle({ cfg }: { cfg: (typeof PARTICLES)[0] }) {
  const y = useSharedValue(-20);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(cfg.delay, withTiming(1, { duration: 80 }));
    y.value = withDelay(
      cfg.delay,
      withTiming(SH * 0.62, { duration: cfg.duration, easing: Easing.out(Easing.quad) }),
    );
    x.value = withDelay(
      cfg.delay,
      withTiming(cfg.driftX, { duration: cfg.duration }),
    );
    rot.value = withDelay(
      cfg.delay,
      withTiming(cfg.rot, { duration: cfg.duration }),
    );
    opacity.value = withDelay(
      cfg.delay,
      withSequence(
        withTiming(0.95, { duration: 100 }),
        withDelay(cfg.duration - 600, withTiming(0, { duration: 500 })),
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          top: 0,
          left: cfg.x,
          width: cfg.size,
          height: cfg.shape === "circle" ? cfg.size : cfg.size * 1.6,
          borderRadius: cfg.shape === "circle" ? cfg.size / 2 : 2,
          backgroundColor: cfg.color,
        },
      ]}
    />
  );
}

interface Props {
  /** Called when the celebration finishes (auto or otherwise). */
  onDone: () => void;
}

export function BiometricUnlockCelebration({ onDone }: Props) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme];
  const themeColor =
    selectedTheme === "darkMode" ? "#9370DB" : themeColors.primary;

  const badgeScale = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.5);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    celebrationHaptic();

    // Success badge springs in with a gentle overshoot
    badgeScale.value = withDelay(
      150,
      withSequence(
        withSpring(1.18, { damping: 7, stiffness: 220 }),
        withSpring(1, { damping: 11, stiffness: 200 }),
      ),
    );

    // Expanding celebratory ring
    ringScale.value = withDelay(
      150,
      withTiming(1.5, { duration: 900, easing: Easing.out(Easing.ease) }),
    );
    ringOpacity.value = withDelay(
      150,
      withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
    );

    // Auto-dismiss after the moment lands
    const t = setTimeout(() => {
      overlayOpacity.value = withTiming(
        0,
        { duration: 380, easing: Easing.inOut(Easing.ease) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        },
      );
    }, 2400);

    return () => clearTimeout(t);
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,4,18,0.88)" }]} />

      {/* Confetti layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {PARTICLES.map((p) => (
          <Particle key={p.id} cfg={p} />
        ))}
      </View>

      {/* Centered content */}
      <View style={styles.center}>
        {/* Companion in its joyful success state */}
        <EmotionalCompanion state="success" size={120} themeColor={themeColor} />

        {/* Success badge with expanding ring */}
        <View style={{ alignItems: "center", justifyContent: "center", marginTop: 8 }}>
          <Animated.View
            style={[
              ringStyle,
              {
                position: "absolute",
                width: 96,
                height: 96,
                borderRadius: 48,
                borderWidth: 2.5,
                borderColor: themeColor,
              },
            ]}
          />
          <Animated.View
            style={[
              badgeStyle,
              {
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: "rgba(255,255,255,0.16)",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.6)",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <ShieldCheck size={44} color="#FFFFFF" strokeWidth={2} />
          </Animated.View>
        </View>

        {/* Welcome copy */}
        <Animated.View
          entering={FadeIn.delay(450).duration(600)}
          style={{ alignItems: "center", marginTop: 28 }}
        >
          <Text style={styles.title}>You're in!</Text>
          <Text style={styles.subtitle}>
            Your journal is unlocked and protected by your fingerprint.
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 300,
  },
});
