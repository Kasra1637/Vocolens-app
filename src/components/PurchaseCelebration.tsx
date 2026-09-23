/**
 * PurchaseCelebration — Option 3: Orbiting Starfield
 *
 * One-time celebration shown on the Secure/Protect journal screen
 * (BiometricSetupScreen, onboarding step 24) right after a REAL purchase
 * succeeds — any plan, real card or test card. Restore, tester-skip, and
 * dev-escape arrivals never trigger it (see `celebratePurchase` in
 * onboarding-store: set only by grantAccess, consumed once here).
 *
 * Choreography (3.0 s total):
 *   0.0–1.3 s  dozens of star dots swing in from wide scattered orbits,
 *              accelerating onto elliptical paths around the central badge.
 *   0.9–1.4 s  badge springs in, headline fades in as the ring settles.
 *   1.3–2.6 s  slow orbital drift (the aligned universe), gentle shimmer.
 *   2.6–3.0 s  full-overlay fade; auto-dismiss at 3.0 s. Tap skips anytime.
 * Fanfare chime + celebration haptic on fire. Overlay is pointer-transparent
 * except the skip press, so the screen underneath stays interactive.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { Star } from "phosphor-react-native";
import { celebrationHaptic } from "@/lib/haptics";
import type { THEME_COLORS } from "@/lib/state/onboarding-store";

const { width: SW, height: SH } = Dimensions.get("window");

// Celebration fanfare — same asset as the milestone celebration.
const CELEBRATION_ASSET = require("../../assets/sound-effect-1767694881912.mp3");

const AUTO_DISMISS_MS = 3000;
const STAR_COUNT = 36;
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
const STARS: StarSpec[] = Array.from({ length: STAR_COUNT }, (_, i) => ({
  rx: 95 + rand(i * 4 + 1) * 85, // 95–180 elliptical x radius
  ry: 62 + rand(i * 4 + 2) * 62, // 62–124 elliptical y radius
  startAngle: rand(i * 4 + 3) * Math.PI * 2,
  sweep: Math.PI * (2.6 + rand(i * 4 + 4) * 1.2), // swing-in sweep
  size: 3 + rand(i * 7 + 5) * 4.5, // 3–7.5 px dots
  colorIndex: Math.floor(rand(i * 3 + 6) * 4),
  delay: Math.floor(rand(i * 5 + 7) * 350), // 0–350 ms stagger
}));

// ─── Orbiting star dot ───────────────────────────────────────────────────────
function OrbitStar({
  spec,
  cx,
  cy,
  palette,
}: {
  spec: StarSpec;
  cx: number;
  cy: number;
  palette: string[];
}) {
  const angle = useSharedValue(spec.startAngle);
  const radK = useSharedValue(1.75); // starts scattered wide, settles to 1
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
        withTiming(spec.startAngle + spec.sweep + 0.9, {
          duration: 1350,
          easing: Easing.linear,
        }),
      ),
    );
    radK.value = withDelay(
      spec.delay,
      withTiming(1, { duration: 1250, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      spec.delay,
      withSequence(
        withTiming(0.95, { duration: 220, easing: Easing.out(Easing.ease) }),
        // Hold, then decay into the overlay fade.
        withDelay(
          2150,
          withTiming(0, { duration: 450, easing: Easing.in(Easing.ease) }),
        ),
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {
        translateX:
          cx + spec.rx * radK.value * Math.cos(angle.value) - spec.size / 2,
      },
      {
        translateY:
          cy + spec.ry * radK.value * Math.sin(angle.value) - spec.size / 2,
      },
    ],
  }));

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
}: {
  visible: boolean;
  onDone: () => void;
  themeColors: (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const badgeScale = useSharedValue(0.4);
  const veilOpacity = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;

    console.warn("[Celebration] overlay mounted: starfield + chime starting");
    celebrationHaptic();
    badgeScale.value = 0.4;
    badgeScale.value = withDelay(
      850,
      withSpring(1, { damping: 10, stiffness: 130 }),
    );
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

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));
  const veilStyle = useAnimatedStyle(() => ({
    opacity: veilOpacity.value,
  }));

  if (!visible) return null;

  const center = { x: SW / 2, y: SH * 0.32 };
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
        {/* Orbiting starfield */}
        {STARS.map((spec, i) => (
          <OrbitStar
            key={i}
            spec={spec}
            cx={center.x}
            cy={center.y}
            palette={palette}
          />
        ))}
      </Animated.View>
      {/* Star badge + headline */}
      <Animated.View
        pointerEvents="none"
        entering={FadeIn.delay(900).duration(500)}
        style={{ alignItems: "center", marginTop: SH * 0.32 - 110 }}
      >
        <Animated.View
          style={[
            badgeStyle,
            {
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: "rgba(255,255,255,0.16)",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.55)",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Star size={38} color="#FFFFFF" weight="fill" />
        </Animated.View>
        <Text
          style={{
            fontFamily: "Fraunces_700Bold",
            fontSize: 26,
            color: "#FFFFFF",
            textAlign: "center",
            marginTop: 14,
            letterSpacing: 0.2,
          }}
        >
          Welcome to Premium
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "rgba(255,255,255,0.75)",
            textAlign: "center",
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          Your journal is now unlocked
        </Text>
      </Animated.View>
    </View>
  );
}
