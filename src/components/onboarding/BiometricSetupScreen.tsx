/**
 * Biometric Setup Screen (Onboarding final step)
 *
 * Offers the user to protect their journal with their Fingerprint.
 *  - "Enable" → prompts the OS fingerprint scanner, on success enables the lock and finishes onboarding.
 *  - "Maybe later" / unsupported hardware → finishes onboarding without a lock.
 *
 * Replaces the old 4-digit SetPinScreen.
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  Easing,
} from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { Fingerprint, ShieldCheck, Lock, Eye } from "lucide-react-native";
import { successHaptic, tapHaptic, errorHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useBiometricStore from "@/lib/state/biometric-store";
import {
  checkBiometricCapabilities,
  authenticateWithBiometrics,
  getBiometricTypeName,
} from "@/lib/auth-service";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

type Phase = "intro" | "success";

const PRIVACY_POINTS = [
  { icon: Lock, text: "Only you can open your journal" },
  { icon: Eye, text: "No passwords to remember or type" },
  { icon: ShieldCheck, text: "Your entries never leave your device" },
];

export function BiometricSetupScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const setHasCompletedOnboarding = useOnboardingStore(
    (s) => s.setHasCompletedOnboarding,
  );
  const enableBiometric = useBiometricStore((s) => s.enableBiometric);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [phase, setPhase] = useState<Phase>("intro");
  const [biometricName, setBiometricName] = useState("Fingerprint");
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const successScale = useSharedValue(0);
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  useEffect(() => {
    (async () => {
      const caps = await checkBiometricCapabilities();
      setBiometricName(getBiometricTypeName(caps.supportedTypes));
      setAvailable(caps.isAvailable);
    })();
  }, []);

  const finishOnboarding = useCallback(() => {
    setTimeout(() => setHasCompletedOnboarding(true), 1300);
  }, [setHasCompletedOnboarding]);

  const handleEnable = useCallback(async () => {
    if (busy) return;
    playClickSound();
    tapHaptic();

    // If hardware/enrollment is unavailable, just complete onboarding gracefully.
    if (!available) {
      successHaptic();
      setHasCompletedOnboarding(true);
      return;
    }

    setBusy(true);
    const result = await authenticateWithBiometrics(
      "Confirm to enable app lock",
    );
    setBusy(false);

    if (result.success) {
      enableBiometric();
      successHaptic();
      setPhase("success");
      successScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      finishOnboarding();
      return;
    }

    // User actively cancelled → let them try again, no error noise.
    if (result.cancelled) {
      tapHaptic();
      return;
    }

    // Biometrics turned out to be unavailable/errored on this device.
    // Don't trap the user — surface a gentle note and let them continue without a lock.
    errorHaptic();
    if (!result.available) {
      setAvailable(false);
      setHasCompletedOnboarding(true);
    } else {
      setAuthError(
        "Couldn't verify your fingerprint. Try again, or tap \"Maybe later\".",
      );
    }
  }, [busy, available, enableBiometric, finishOnboarding, setHasCompletedOnboarding]);

  const handleSkip = useCallback(() => {
    playClickSound();
    tapHaptic();
    setHasCompletedOnboarding(true);
  }, [setHasCompletedOnboarding]);

  const title =
    phase === "success"
      ? "You're all set!"
      : available
        ? `Protect your journal`
        : "You're all set!";
  const subtitle =
    phase === "success"
      ? `${biometricName} lock is on. Only you can get in.`
      : available
        ? `Use ${biometricName} so only you can open Vocolens — no PIN to remember.`
        : "Your private journal is ready to go.";

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 40,
            }}
          >
            {/* Top: character + text */}
            <Animated.View
              entering={FadeIn.duration(500).easing(SOFT)}
              style={{ alignItems: "center", gap: 16 }}
            >
              <EmotionalCompanion
                state={phase === "success" ? "success" : "idle"}
                size={120}
                themeColor={
                  selectedTheme === "darkMode" ? "#9370DB" : themeColors.primary
                }
              />
              <View style={{ alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    fontFamily: "Fraunces_700Bold",
                    fontSize: 30,
                    color: "#FFFFFF",
                    textAlign: "center",
                    opacity: 0.92,
                    letterSpacing: 0.2,
                    lineHeight: 38,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 15,
                    color: "rgba(255,255,255,0.80)",
                    textAlign: "center",
                    lineHeight: 22,
                    maxWidth: "90%",
                  }}
                >
                  {subtitle}
                </Text>
              </View>
            </Animated.View>

            {/* Middle: fingerprint badge or success check */}
            <Animated.View
              entering={FadeIn.delay(100).duration(500).easing(SOFT)}
              style={{ alignItems: "center", gap: 24, width: "100%" }}
            >
              {phase === "success" ? (
                <Animated.View
                  style={[
                    {
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      backgroundColor: "rgba(255,255,255,0.18)",
                      borderWidth: 2.5,
                      borderColor: "rgba(255,255,255,0.7)",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    successStyle,
                  ]}
                >
                  <ShieldCheck size={48} color="#FFFFFF" strokeWidth={2} />
                </Animated.View>
              ) : (
                <>
                  <View
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: 55,
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1.5,
                      borderColor: "rgba(255,255,255,0.25)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Fingerprint size={56} color="#FFFFFF" strokeWidth={1.6} />
                  </View>

                  {/* Privacy reassurance points */}
                  <View style={{ gap: 12, width: "100%", maxWidth: 340 }}>
                    {PRIVACY_POINTS.map((p, i) => {
                      const Icon = p.icon;
                      return (
                        <View
                          key={i}
                          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                        >
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              backgroundColor: "rgba(255,255,255,0.15)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon size={18} color="#FFFFFF" strokeWidth={2} />
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              fontFamily: "Inter_400Regular",
                              fontSize: 14,
                              color: "rgba(255,255,255,0.85)",
                              lineHeight: 19,
                            }}
                          >
                            {p.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </Animated.View>

            {/* Bottom: CTAs */}
            {phase !== "success" && (
              <Animated.View
                entering={FadeIn.delay(160).duration(500).easing(SOFT)}
                style={{ width: "100%", gap: 12 }}
              >
                {authError ? (
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                      color: "rgba(255,180,180,0.95)",
                      textAlign: "center",
                      marginBottom: 4,
                    }}
                  >
                    {authError}
                  </Text>
                ) : null}
                <OnboardingCTAButton
                  label={
                    busy
                      ? "Waiting…"
                      : available
                        ? `Enable ${biometricName}`
                        : "Finish"
                  }
                  onPress={handleEnable}
                  disabled={busy}
                />
                {available && (
                  <Pressable
                    onPress={handleSkip}
                    disabled={busy}
                    style={{ alignItems: "center", paddingVertical: 12 }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      Maybe later
                    </Text>
                  </Pressable>
                )}
              </Animated.View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
