/**
 * Set PIN Screen (Onboarding Step 17)
 *
 * Two-phase PIN creation:
 *  Phase 1 — "enter":   user types their new 4-digit PIN via native keyboard
 *  Phase 2 — "confirm": user retyped the same PIN
 *  Phase 3 — "success": animated checkmark, then completes onboarding
 *
 * Validation: no sequential runs (1234 / 4321), no all-same digits (1111).
 * Shake animation on mismatch or invalid PIN.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { ShieldCheck } from "lucide-react-native";
import {
  successHaptic,
  tapHaptic,
  errorHaptic,
  selectHaptic,
} from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import usePinStore from "@/lib/state/pin-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { useClickSound } from "@/lib/hooks/useClickSound";

// ── Validation helpers ──────────────────────────────────────────────────────
function isSequential(pin: string): boolean {
  const d = pin.split("").map(Number);
  const asc = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  const desc = d.every((v, i) => i === 0 || v === d[i - 1] - 1);
  return asc || desc;
}
function isRepeating(pin: string): boolean {
  return pin.split("").every((c) => c === pin[0]);
}

type Phase = "enter" | "confirm" | "success";

// ── Dot row ──────────────────────────────────────────────────────────────────
function PinDots({
  filled,
  shake,
}: {
  filled: number;
  shake: Animated.SharedValue<number>;
}) {
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <Animated.View
      style={[
        { flexDirection: "row", gap: 20, justifyContent: "center" },
        shakeStyle,
      ]}
    >
      {[0, 1, 2, 3].map((i) => {
        const isFilled = i < filled;
        return (
          <Animated.View
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: "#FFFFFF",
              backgroundColor: isFilled ? "#FFFFFF" : "transparent",
              transform: [{ scale: isFilled ? 1 : 0.85 }],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function SetPinScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const setHasCompletedOnboarding = useOnboardingStore(
    (s) => s.setHasCompletedOnboarding,
  );
  const setPin = usePinStore((s) => s.setPin);
  const setPinVerified = usePinStore((s) => s.setPinVerified);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [phase, setPhase] = useState<Phase>("enter");
  const [digits, setDigits] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");

  const shake = useSharedValue(0);
  const successScale = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  // Focus the hidden input whenever the phase changes (or on mount)
  useEffect(() => {
    if (phase === "success") return;
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [phase]);

  const doShake = useCallback((msg: string) => {
    errorHaptic();
    setError(msg);
    shake.value = withSequence(
      withTiming(-14, { duration: 50 }),
      withTiming(14, { duration: 60 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 60 }),
      withTiming(-5, { duration: 45 }),
      withTiming(0, { duration: 40 }),
    );
    setTimeout(() => {
      setDigits("");
      setError("");
    }, 650);
  }, []);

  const handleComplete = useCallback(
    (pin: string) => {
      if (phase === "enter") {
        if (isRepeating(pin)) {
          doShake("PIN cannot be all the same digit");
          return;
        }
        if (isSequential(pin)) {
          doShake("PIN cannot be sequential like 1234");
          return;
        }
        setFirstPin(pin);
        setDigits("");
        setError("");
        setPhase("confirm");
        selectHaptic();
      } else if (phase === "confirm") {
        if (pin !== firstPin) {
          doShake("PINs don't match — try again");
          return;
        }
        setPin(pin);
        setPinVerified(true);
        setPhase("success");
        successHaptic();
        successScale.value = withSpring(1, { damping: 12, stiffness: 200 });
        setTimeout(() => {
          setHasCompletedOnboarding(true);
        }, 1600);
      }
    },
    [
      phase,
      firstPin,
      doShake,
      setPin,
      setPinVerified,
      setHasCompletedOnboarding,
      successScale,
    ],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      if (phase === "success") return;
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
      tapHaptic();
      setDigits(cleaned);
      setError("");
      if (cleaned.length === 4) {
        setTimeout(() => handleComplete(cleaned), 120);
      }
    },
    [phase, handleComplete],
  );

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  const phaseTitle =
    phase === "enter"
      ? "Set Your PIN"
      : phase === "confirm"
        ? "Confirm Your PIN"
        : "You're Locked In!";
  const phaseSubtitle =
    phase === "enter"
      ? "Create a 4-digit PIN to protect your account"
      : phase === "confirm"
        ? "Re-enter your PIN to confirm it"
        : "Your account is now secured with a PIN";

  const bgColors = themeColors.backgroundGradient;

  return (
    <View style={{ flex: 1 }}>
      {/* Hidden native keyboard input */}
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus
        caretHidden
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />

      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView style={{ flex: 1 }}>
          {/* Tapping anywhere re-focuses the keyboard */}
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              if (phase !== "success") inputRef.current?.focus();
            }}
          >
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 24,
                paddingBottom: 48,
                paddingTop: 8,
              }}
              pointerEvents="box-none"
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
                    selectedTheme === "darkMode"
                      ? "#9370DB"
                      : themeColors.primary
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
                    {phaseTitle}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                      color: "rgba(255,255,255,0.80)",
                      textAlign: "center",
                      lineHeight: 22,
                    }}
                  >
                    {phaseSubtitle}
                  </Text>
                </View>
              </Animated.View>

              {/* Middle: dots + error / success icon */}
              <Animated.View
                entering={FadeIn.delay(100).duration(500).easing(SOFT)}
                style={{ alignItems: "center", gap: 20 }}
              >
                {phase === "success" ? (
                  <Animated.View
                    style={[
                      {
                        width: 88,
                        height: 88,
                        borderRadius: 44,
                        backgroundColor: "rgba(255,255,255,0.18)",
                        borderWidth: 2.5,
                        borderColor: "rgba(255,255,255,0.7)",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      successStyle,
                    ]}
                  >
                    <ShieldCheck size={44} color="#FFFFFF" strokeWidth={2} />
                  </Animated.View>
                ) : (
                  <>
                    <PinDots filled={digits.length} shake={shake} />
                    {/* Phase label pills */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["enter", "confirm"] as Phase[]).map((p) => (
                        <View
                          key={p}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 5,
                            borderRadius: 999,
                            backgroundColor:
                              phase === p
                                ? "rgba(255,255,255,0.25)"
                                : "rgba(255,255,255,0.08)",
                            borderWidth: 1,
                            borderColor:
                              phase === p
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(255,255,255,0.15)",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              fontSize: 12,
                              color:
                                phase === p
                                  ? "#FFFFFF"
                                  : "rgba(255,255,255,0.45)",
                            }}
                          >
                            {p === "enter" ? "① Create" : "② Confirm"}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {error ? (
                      <Animated.Text
                        entering={FadeIn.duration(200)}
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 13,
                          color: "rgba(255,120,120,1)",
                          textAlign: "center",
                        }}
                      >
                        {error}
                      </Animated.Text>
                    ) : (
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.45)",
                          textAlign: "center",
                        }}
                      >
                        {phase === "enter"
                          ? "Avoid sequences (1234) or repeated digits (1111)"
                          : "Tap the same digits as before"}
                      </Text>
                    )}
                  </>
                )}
              </Animated.View>

              {/* Bottom: keyboard hint */}
              {phase !== "success" && (
                <Animated.View
                  entering={FadeIn.delay(160).duration(500).easing(SOFT)}
                  style={{ alignItems: "center", gap: 10 }}
                >
                  <View
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.65)",
                        textAlign: "center",
                      }}
                    >
                      Use your keypad to enter 4 digits
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.35)",
                      textAlign: "center",
                    }}
                  >
                    Tap anywhere to bring up the keyboard
                  </Text>
                </Animated.View>
              )}
            </View>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
