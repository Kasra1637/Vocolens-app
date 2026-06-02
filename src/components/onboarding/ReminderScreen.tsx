/**
 * ReminderScreen
 *
 * "We'll send you a reminder before your free trial ends."
 * Step 13 — between FreeTrialPreviewScreen (12) and PaywallScreen (14).
 */

import React, { useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { Bell, ChevronRight } from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";


// ── Animated Bell ─────────────────────────────────────────────────────────────
function AnimatedBell({ primaryColor }: { primaryColor: string }) {
  const rotate = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    // Ring sequence: two bursts then a long rest
    rotate.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(20, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(-16, { duration: 110, easing: Easing.inOut(Easing.quad) }),
        withTiming(16, { duration: 110, easing: Easing.inOut(Easing.quad) }),
        withTiming(-10, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(10, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 80, easing: Easing.out(Easing.quad) }),
        withDelay(700, withTiming(0, { duration: 1 })),
        withTiming(-14, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(14, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(-8, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        withTiming(8, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 70, easing: Easing.out(Easing.quad) }),
        withDelay(1600, withTiming(0, { duration: 1 })),
      ),
      -1,
      false,
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 550, easing: Easing.in(Easing.quad) }),
        withDelay(2000, withTiming(1, { duration: 1 })),
        withTiming(1.3, { duration: 280, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 450, easing: Easing.in(Easing.quad) }),
        withDelay(1700, withTiming(1, { duration: 1 })),
      ),
      -1,
      false,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 350 }),
        withTiming(0.25, { duration: 550 }),
        withDelay(2000, withTiming(0.25, { duration: 1 })),
        withTiming(0.7, { duration: 280 }),
        withTiming(0.25, { duration: 450 }),
        withDelay(1700, withTiming(0.25, { duration: 1 })),
      ),
      -1,
      false,
    );
  }, []);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View
      style={{
        width: 130,
        height: 130,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: "rgba(255,255,255,0.1)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.2)",
          },
        ]}
      />
      {/* Inner circle */}
      <View
        style={{
          position: "absolute",
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: "rgba(255,255,255,0.15)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.25)",
        }}
      />
      {/* Bell */}
      <Animated.View style={bellStyle}>
        <Bell
          size={52}
          color="#FFFFFF"
          strokeWidth={1.8}
          fill="rgba(255,255,255,0.2)"
        />
      </Animated.View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export function ReminderScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const playClickSound = useClickSound();

  const themeColors = THEME_COLORS[selectedTheme];

  const handleContinue = () => {
    playClickSound();
    successHaptic();
    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
            {/* Title */}
            <Animated.View
              entering={FadeIn.delay(50).duration(600).easing(SOFT)}
              style={{ alignItems: "center", marginTop: 4 }}
            >
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  textAlign: "center",
                  lineHeight: 38,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                }}
              >
                {"We'll send you a reminder\nbefore your trial ends."}
              </Text>
            </Animated.View>

            {/* Bell */}
            <Animated.View
              entering={FadeIn.delay(200).duration(700).easing(SOFT)}
              style={{ alignItems: "center", marginTop: 28, marginBottom: 28 }}
            >
              <AnimatedBell primaryColor={themeColors.primary} />
            </Animated.View>

            {/* CTA */}
            <Animated.View
              entering={FadeIn.delay(500).duration(600).easing(SOFT)}
              style={{ alignItems: "center" }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  textAlign: "center",
                  marginBottom: 16,
                  letterSpacing: 0.2,
                }}
              >
                ✔ No Payment Due Now.
              </Text>

              <Pressable
                onPress={handleContinue}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                  elevation: Platform.OS === "android" ? 0 : 8,
                }}
                android_ripple={{ color: "rgba(255,255,255,0.2)" }}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_700Bold",
                      fontSize: 18,
                      marginRight: 6,
                    }}
                  >
                    Continue for Free
                  </Text>
                  <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Remaining space goes to bottom */}
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
