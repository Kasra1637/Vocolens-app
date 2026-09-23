/**
 * PurchaseCelebration
 *
 * One-time celebration shown on the Secure/Protect journal screen
 * (BiometricSetupScreen, onboarding step 24) right after a REAL purchase
 * succeeds — any plan, real card or test card. Restore, tester-skip, and
 * dev-escape arrivals never trigger it (see `celebratePurchase` in
 * onboarding-store: set only by grantAccess, consumed once here).
 *
 * Design language — brand ripples, not party confetti (per product pick):
 * three expanding ripple rings in theme colours, a springing star badge,
 * a short headline, the fanfare chime + celebration haptic.
 * Auto-dismisses at ~2.8 s with a fade; tap anywhere to skip.
 * Overlay is pointer-transparent except the skip press, so the screen
 * underneath stays interactive.
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

const AUTO_DISMISS_MS = 2800;

// ─── Ripple ring ─────────────────────────────────────────────────────────────
function RippleRing({
  color,
  delay,
  maxSize,
}: {
  color: string;
  delay: number;
  maxSize: number;
}) {
  const scale = useSharedValue(0.15);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.55, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.in(Easing.ease) }),
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: "absolute",
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          borderWidth: 2,
          borderColor: color,
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

  useEffect(() => {
    if (!visible) return;

    celebrationHaptic();
    badgeScale.value = 0.4;
    badgeScale.value = withDelay(150, withSpring(1, { damping: 9, stiffness: 140 }));

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

  if (!visible) return null;

  const center = { x: SW / 2, y: SH * 0.32 };

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
      {/* Ripple burst */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: center.x,
          top: center.y,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RippleRing color="#FFFFFF" delay={0} maxSize={300} />
        <RippleRing color={themeColors.secondary} delay={140} maxSize={360} />
        <RippleRing color={themeColors.primary} delay={280} maxSize={420} />
      </View>
      {/* Star badge + headline */}
      <Animated.View
        pointerEvents="none"
        entering={FadeIn.delay(150).duration(400)}
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
