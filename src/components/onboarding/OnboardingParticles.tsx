/**
 * OnboardingParticles
 *
 * Ambient background animation for the onboarding / welcome flow.
 *
 * Design intent — neurodivergent-friendly calming motion:
 *   • Slow, organic upward drift — no rapid movement or sudden direction changes
 *   • Soft translucent orbs (opacity 0.08–0.13) — never distracting from content
 *   • Each particle has a unique period (22–44 s) so loops never visually align
 *   • Lateral sine-wave wobble gives an organic "breath / thought rising" quality
 *   • Respects useReducedMotion — all motion stops for users who prefer it
 *   • Pure Reanimated worklets — zero JS thread impact during animation
 *   • AbsoluteFill + pointerEvents "none" — never intercepts user touches
 *   • No flashing, no colour changes, no abrupt snaps — predictable and safe
 *
 * Usage: place immediately inside <LinearGradient> before <ProgressBar>
 *
 *   <LinearGradient ...>
 *     <OnboardingParticles primaryColor={themeColors.primary} />
 *     <ProgressBar ... />
 *     ...
 *   </LinearGradient>
 */

import React, { useEffect } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

// ── Deterministic particle config ─────────────────────────────────────────────
// Hard-coded so layout is stable across renders — no Math.random() jitter.
// Tuple: [xFrac, yFrac, sizePx, driftMs, wobbleAmpPx, wobblePeriodMs, maxOpacity]
const PARTICLES: [number, number, number, number, number, number, number][] = [
  [0.12, 0.88, 14, 28000, 18, 7200, 0.13],
  [0.31, 0.74, 10, 36000, 12, 9400, 0.09],
  [0.55, 0.92, 18, 22000, 22, 6100, 0.12],
  [0.72, 0.68,  8, 42000, 10, 11000, 0.08],
  [0.88, 0.82, 12, 31000, 16,  8300, 0.11],
  [0.22, 0.55, 16, 26000, 20,  7700, 0.10],
  [0.66, 0.44, 11, 38000, 14, 10200, 0.09],
  [0.44, 0.77, 20, 24000, 24,  6600, 0.13],
  [0.80, 0.33,  9, 44000, 11, 12000, 0.08],
  [0.08, 0.40, 15, 33000, 19,  8800, 0.10],
];

// ── Single animated orb ───────────────────────────────────────────────────────
interface ParticleProps {
  xFrac: number;
  yFrac: number;
  size: number;
  driftMs: number;
  wobbleAmp: number;
  wobbleMs: number;
  opacity: number;
  primaryColor: string;
  reduced: boolean;
}

function Particle({
  xFrac, yFrac, size, driftMs, wobbleAmp, wobbleMs, opacity,
  primaryColor, reduced,
}: ParticleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const travelDist = H * 0.55;

  useEffect(() => {
    if (reduced) return;

    // Vertical: linear upward drift, loops seamlessly
    translateY.value = withRepeat(
      withTiming(-travelDist, { duration: driftMs, easing: Easing.linear }),
      -1,
      false,
    );

    // Horizontal: slow sine-wave wobble
    translateX.value = withRepeat(
      withSequence(
        withTiming( wobbleAmp, { duration: wobbleMs / 2, easing: Easing.bezier(0.45, 0.05, 0.55, 0.95) }),
        withTiming(-wobbleAmp, { duration: wobbleMs / 2, easing: Easing.bezier(0.45, 0.05, 0.55, 0.95) }),
      ),
      -1,
      false,
    );

    // Organic breathing scale
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: driftMs * 0.4, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, { duration: driftMs * 0.4, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.00, { duration: driftMs * 0.2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [reduced]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: reduced ? 0 : opacity,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: xFrac * W - size / 2,
          top: yFrac * H - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: primaryColor,
        },
        animStyle,
      ]}
    />
  );
}

// ── Public component ──────────────────────────────────────────────────────────
interface OnboardingParticlesProps {
  /** Tints particles with the active theme colour. Defaults to white. */
  primaryColor?: string;
}

export function OnboardingParticles({
  primaryColor = "#FFFFFF",
}: OnboardingParticlesProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {PARTICLES.map(([xFrac, yFrac, size, driftMs, wobbleAmp, wobbleMs, opacity], i) => (
        <Particle
          key={i}
          xFrac={xFrac}
          yFrac={yFrac}
          size={size}
          driftMs={driftMs}
          wobbleAmp={wobbleAmp}
          wobbleMs={wobbleMs}
          opacity={opacity}
          primaryColor={primaryColor}
          reduced={reduced}
        />
      ))}
    </View>
  );
}
