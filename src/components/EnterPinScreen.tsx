/**
 * Enter PIN Screen
 *
 * Shown every time the app is opened after PIN is set.
 * Uses a hidden TextInput to trigger the native number keyboard.
 * Correct PIN → sets isPinVerified → AuthGate lets the user through.
 * Wrong PIN → shake animation, 3 failed attempts shows "Forgot PIN?" option.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Lock } from "lucide-react-native";
import { successHaptic, tapHaptic, errorHaptic } from "@/lib/haptics";
import usePinStore from "@/lib/state/pin-store";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";

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
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            backgroundColor: i < filled ? "#FFFFFF" : "transparent",
          }}
        />
      ))}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function EnterPinScreen() {
  const verifyPin = usePinStore((s) => s.verifyPin);
  const clearPin = usePinStore((s) => s.clearPin);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme];

  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [failCount, setFailCount] = useState(0);

  const shake = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  // Focus the TextInput to bring up the native keyboard
  const openKeyboard = useCallback(() => {
    // Small delay ensures the ref is mounted and the system is ready
    setTimeout(() => {
      inputRef.current?.blur();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }, 10);
  }, []);

  // Auto-open the keyboard when the screen mounts
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 600);
    return () => clearTimeout(t);
  }, []);

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
      // Re-focus so keyboard stays open for retry
      inputRef.current?.focus();
    }, 700);
  }, []);

  const handleComplete = useCallback(
    (pin: string) => {
      const ok = verifyPin(pin);
      if (ok) {
        successHaptic();
      } else {
        const next = failCount + 1;
        setFailCount(next);
        doShake(next >= 3 ? "Incorrect PIN" : "Incorrect PIN, try again");
      }
    },
    [verifyPin, failCount, doShake],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
      tapHaptic();
      setDigits(cleaned);
      setError("");
      if (cleaned.length === 4) {
        setTimeout(() => handleComplete(cleaned), 120);
      }
    },
    [handleComplete],
  );

  const handleForgotPin = useCallback(() => {
    clearPin();
  }, [clearPin]);

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
          <View style={{ flex: 1 }}>
            {/*
              The TextInput is rendered with full width at the top of the screen
              but with height: 0 + overflow visible on iOS / transparent text on Android.
              This ensures the native system considers it a valid focusable element.
            */}
            <TextInput
              ref={inputRef}
              value={digits}
              onChangeText={handleChangeText}
              keyboardType="number-pad"
              maxLength={4}
              caretHidden
              autoCorrect={false}
              autoComplete="off"
              secureTextEntry={Platform.OS === "android"}
              style={styles.hiddenInput}
            />

            {/* Full-screen pressable overlay that triggers keyboard on tap */}
            <Pressable
              style={styles.overlay}
              onPress={openKeyboard}
            >
              {/* Top: companion + greeting */}
              <Animated.View
                entering={FadeInDown.duration(500)}
                style={{ alignItems: "center", gap: 20 }}
              >
                <EmotionalCompanion
                  state="idle"
                  size={110}
                  themeColor={
                    selectedTheme === "darkMode"
                      ? "#9370DB"
                      : themeColors.primary
                  }
                />
                <View style={{ alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Lock
                      size={18}
                      color="rgba(255,255,255,0.7)"
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontFamily: "Fraunces_700Bold",
                        fontSize: 26,
                        color: "#FFFFFF",
                      }}
                    >
                      Welcome back
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                      color: "rgba(255,255,255,0.75)",
                      textAlign: "center",
                    }}
                  >
                    Enter your PIN to continue
                  </Text>
                </View>
              </Animated.View>

              {/* Middle: dots + hint/error */}
              <Animated.View
                entering={FadeInDown.delay(100).duration(500)}
                style={{ alignItems: "center", gap: 18 }}
              >
                <PinDots filled={digits.length} shake={shake} />

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
                      fontSize: 13,
                      color: "rgba(255,255,255,0.4)",
                      textAlign: "center",
                    }}
                  >
                    Tap anywhere to open keyboard
                  </Text>
                )}
              </Animated.View>

              {/* Bottom: forgot PIN (appears after 3 failures) */}
              <Animated.View
                entering={FadeInDown.delay(180).duration(500)}
                style={{ alignItems: "center", minHeight: 44 }}
              >
                {failCount >= 3 && (
                  <Animated.View entering={FadeIn.duration(300)}>
                    <Pressable
                      onPress={handleForgotPin}
                      style={{ paddingHorizontal: 20, paddingVertical: 10 }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 14,
                          color: "rgba(255,255,255,0.6)",
                          textDecorationLine: "underline",
                        }}
                      >
                        Forgot PIN? Reset access
                      </Text>
                    </Pressable>
                  </Animated.View>
                )}
              </Animated.View>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // The TextInput must be "visible" to the native focus system.
  // We achieve invisibility by:
  //   - Making text color transparent (no cursor shown via caretHidden)
  //   - Setting height to 1 with no border/background
  //   - Positioning it at the top so it's within the visible screen bounds
  //     (off-screen elements can't receive focus on Android)
  // On Android, secureTextEntry hides any residual dots that might flash.
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    color: "transparent",
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    margin: 0,
    // DO NOT use opacity: 0 — Android won't focus invisible views
    // DO NOT use zIndex: -1 — Android won't focus views behind others
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 60,
    paddingTop: 32,
  },
});
