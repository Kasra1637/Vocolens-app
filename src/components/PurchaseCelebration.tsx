/**
 * PurchaseCelebration — Option 3 refined: ambient low orbit
 *
 * One-time celebration shown on the Secure/Protect journal screen
 * (BiometricSetupScreen, onboarding step 24) right after a REAL purchase
 * succeeds — any plan, real card or test card. Restore, tester-skip, and
 * dev-escape arrivals never trigger it (see `celebratePurchase` in
 * onboarding-store: set only by grantAccess, consumed once here).
 *
 * Choreography (3.0 s total), deliberately badge- and text-free so the
 * screen's own titles own the foreground:
 *   0.0–1.3 s  star dots swing in from wide scattered orbits onto a low,
 *              wide band behind the CTA zone, accelerating then settling.
 *   1.3–2.2 s  slow orbital drift (aligned shimmer), hollow middle keeps
 *              titles and the points card visually untouched.
 *   2.2–3.0 s  finale: every dot converges into the CTA button while
 *              fading — the ring pours into the button, veil fades out.
 * Fanfare chime + celebration haptic on fire. Tap anywhere skips.
 * Overlay is pointer-transparent except the skip press.
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Dimensions, AccessibilityInfo } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { celebrationHaptic } from "@/lib/haptics";
import type { THEME_COLORS } from "@/lib/state/onboarding-store";

const { width: SW, height: SH } = Dimensions.get("window");

// Celebration fanfare — same asset as the milestone celebration.
const CELEBRATION_ASSET = require("../../assets/sound-effect-1767694881912.mp3");

const AUTO_DISMISS_MS = 3000;
const STAR_COUNT = 28;
const GOLD = "#F5C86B";

// Deterministic pseudo-random in [0, 1) — stable across renders.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface StarSpec {
  rx: number;
  ry: number;
  startAngle: number;
  sweep: number;
  size: number;
  colorIndex: number; // 0 white · 1 gold · 2 secondary · 3 primary
  delay: number;
}

// Built once at module load — layout never reshuffles between renders.
// Wide, flat band: dots live low around the CTA and never cross the
// title/card zone (hollow middle by construction).
const STARS: StarSpec[] = Array.from({ length: STAR_COUNT }, (_, i) => ({
  rx: 120 + rand(i * 4 + 1) * 85, // 120–205 wide x radius
  ry: 36 + rand(i * 4 + 2) * 44, // 36–80 flat y radius
  startAngle: rand(i * 4 + 3) * Math.PI * 2,
  sweep: Math.PI * (2.2 + rand(i * 4 + 4) * 1.0), // swing-in sweep
  size: 2.5 + rand(i * 7 + 5) * 4, // 2.5–6.5 px dots
  colorIndex: Math.floor(rand(i * 3 + 6) * 4),
  delay: Math.floor(rand(i * 5 + 7) * 350), // 0–350 ms stagger
}));

// ─── Orbiting star dot ───────────────────────────────────────────────────────
// Swings onto the low orbit band, drifts, then converges into the CTA point
// while fading (finale: the ring pours into the button).
function OrbitStar({
  spec,
  cx,
  cy,
  tx,
  ty,
  palette,
}: {
  spec: StarSpec;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  palette: string[];
}) {
  const angle = useSharedValue(spec.startAngle);
  const radK = useSharedValue(1.75); // starts scattered wide, settles to 1
  const sink = useSharedValue(0); // 0 orbit → 1 dissolved into CTA
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Phase 1 — swing in, accelerating onto the orbit.
    angle.value = withDelay(
      spec.delay,
      withSequence(
        withTiming(spec.startAngle + spec.sweep, {
          duration: 1250,
          easing: Easing.inOut(Easing.quad),
        }),
        // Phase 2 — slow aligned drift.
        withTiming(spec.startAngle + spec.sweep + 0.7, {
          duration: 950,
          easing: Easing.linear,
        }),
      ),
    );
    radK.value = withDelay(
      spec.delay,
      withTiming(1, { duration: 1250, easing: Easing.out(Easing.cubic) }),
    );
    // Phase 3 — finale: converge into the CTA while fading out.
    sink.value = withDelay(
      2200,
      withTiming(1, { duration: 700, easing: Easing.in(Easing.quad) }),
    );
    opacity.value = withDelay(
      spec.delay,
      withSequence(
        withTiming(0.6, { duration: 220, easing: Easing.out(Easing.ease) }),
        withDelay(
          1980,
          withTiming(0, { duration: 700, easing: Easing.in(Easing.ease) }),
        ),
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const ox = cx + spec.rx * radK.value * Math.cos(angle.value);
    const oy = cy + spec.ry * radK.value * Math.sin(angle.value);
    // Lerp orbit position → CTA point as sink progresses.
    const x = ox + (tx - ox) * sink.value - spec.size / 2;
    const y = oy + (ty - oy) * sink.value - spec.size / 2;
    return {
      opacity: opacity.value,
      transform: [{ translateX: x }, { translateY: y }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: palette[spec.colorIndex],
        },
      ]}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function PurchaseCelebration({
  visible,
  onDone,
  themeColors,
  target,
}: {
  visible: boolean;
  onDone: () => void;
  themeColors: (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
  /** Exact dissolve point in overlay-local coords (measured CTA center).
   *  Falls back to the estimated CTA zone when null. */
  target: { x: number; y: number } | null;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const veilOpacity = useSharedValue(1);

  // Motion-sensitive users get sound + haptic only — no orbit visuals.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return;

    console.warn("[Celebration] overlay mounted: starfield + chime starting");
    celebrationHaptic();
    veilOpacity.value = 1;
    veilOpacity.value = withDelay(
      2600,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }),
    );

    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
        });
        const { sound } = await Audio.Sound.createAsync(CELEBRATION_ASSET, {
          shouldPlay: false,
          volume: 0.85,
        });
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        // Ensure ExoPlayer is accessed on the main/UI thread (Android).
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        // no-op — sound is nice-to-have
      }
    })();

    const timer = setTimeout(() => doneRef.current(), AUTO_DISMISS_MS);
    return () => {
      mounted = false;
      clearTimeout(timer);
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [visible]);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: veilOpacity.value,
  }));

  if (!visible || reduceMotion) return null;

  // Low orbit band behind the CTA zone; the finale dissolves into the
  // measured CTA center (or the estimated zone as fallback).
  const center = { x: SW / 2, y: SH * 0.8 };
  const cta = target ?? { x: SW / 2, y: SH * 0.82 };
  const palette = ["#FFFFFF", GOLD, themeColors.secondary, themeColors.primary];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Tap anywhere to skip */}
      <Pressable
        onPress={onDone}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          veilStyle,
          {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          },
        ]}
      >
        {/* Orbiting starfield (badge- and text-free by design) */}
        {STARS.map((spec, i) => (
          <OrbitStar
            key={i}
            spec={spec}
            cx={center.x}
            cy={center.y}
            tx={cta.x}
            ty={cta.y}
            palette={palette}
          />
        ))}
      </Animated.View>
    </View>
  );
}
