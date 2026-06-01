/**
 * Biometric Lock Screen
 *
 * Shown every time the app is opened when biometric app-lock is enabled.
 * Auto-prompts for fingerprint / Face ID on mount. On success → setUnlocked(true),
 * and AuthGate re-renders to reveal the app. Offers a manual retry button.
 *
 * Replaces the old PIN-based EnterPinScreen.
 */

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Fingerprint, Lock } from "lucide-react-native";
import { successHaptic, tapHaptic, errorHaptic } from "@/lib/haptics";
import useBiometricStore from "@/lib/state/biometric-store";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import {
  authenticateWithBiometrics,
  checkBiometricCapabilities,
  getBiometricTypeName,
} from "@/lib/auth-service";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";

export function BiometricLockScreen() {
  const setUnlocked = useBiometricStore((s) => s.setUnlocked);
  const disableBiometric = useBiometricStore((s) => s.disableBiometric);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme];

  const [error, setError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricName, setBiometricName] = useState("Biometric");
  const [hardwareMissing, setHardwareMissing] = useState(false);

  // Gentle pulse on the fingerprint badge
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const runAuth = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);
    setError("");
    const ok = await authenticateWithBiometrics("Unlock Vocolens");
    setAuthenticating(false);
    if (ok) {
      successHaptic();
      setUnlocked(true); // AuthGate reveals the app
    } else {
      errorHaptic();
      setError("Authentication failed. Tap to try again.");
    }
  }, [authenticating, setUnlocked]);

  // Auto-prompt on mount; detect missing hardware as a safe fallback
  useEffect(() => {
    (async () => {
      const caps = await checkBiometricCapabilities();
      setBiometricName(getBiometricTypeName(caps.supportedTypes));
      if (!caps.isAvailable) {
        // No hardware / not enrolled anymore — don't trap the user out of the app.
        setHardwareMissing(true);
        return;
      }
      runAuth();
    })();
  }, []);

  const bgColors = themeColors.backgroundGradient;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.content}>
            {/* Top: companion + greeting */}
            <Animated.View
              entering={FadeInDown.duration(500)}
              style={{ alignItems: "center", gap: 16 }}
            >
              <EmotionalCompanion
                state="idle"
                size={90}
                themeColor={
                  selectedTheme === "darkMode" ? "#9370DB" : themeColors.primary
                }
              />
              <View style={{ alignItems: "center", gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Lock size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                  <Text style={styles.title}>Welcome back</Text>
                </View>
                <Text style={styles.subtitle}>
                  {hardwareMissing
                    ? "Tap below to continue"
                    : `Unlock with ${biometricName} to continue`}
                </Text>
              </View>
            </Animated.View>

            {/* Middle: fingerprint button */}
            <Animated.View
              entering={FadeInDown.delay(120).duration(500)}
              style={{ alignItems: "center", gap: 18 }}
            >
              <Pressable
                onPress={hardwareMissing ? () => setUnlocked(true) : runAuth}
                android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
              >
                <Animated.View style={[styles.fingerprintBadge, pulseStyle]}>
                  <Fingerprint size={64} color="#FFFFFF" strokeWidth={1.6} />
                </Animated.View>
              </Pressable>

              {error ? (
                <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                  {error}
                </Animated.Text>
              ) : (
                <Text style={styles.hintText}>
                  {authenticating
                    ? "Waiting for you…"
                    : hardwareMissing
                      ? "Biometrics unavailable on this device"
                      : `Tap the icon to use ${biometricName}`}
                </Text>
              )}
            </Animated.View>

            {/* Bottom: retry / continue CTA */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={{ alignItems: "center", width: "100%" }}
            >
              <Pressable
                onPress={hardwareMissing ? () => setUnlocked(true) : runAuth}
                disabled={authenticating}
                style={({ pressed }) => [
                  styles.cta,
                  { opacity: pressed || authenticating ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.ctaText}>
                  {hardwareMissing ? "Continue" : `Unlock with ${biometricName}`}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  fingerprintBadge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "rgba(255,120,120,1)",
    textAlign: "center",
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  cta: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
