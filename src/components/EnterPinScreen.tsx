/**
 * Enter PIN Screen
 *
 * Shown every time the app is opened after PIN is set.
 * Displays a sleek on-screen numpad for the user to tap digits.
 * Correct PIN → sets isPinVerified → AuthGate lets the user through.
 * Wrong PIN → shake animation, 3 failed attempts shows "Forgot PIN?" option.
 */

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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
import { Lock, Delete } from "lucide-react-native";
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

// ── Numpad ────────────────────────────────────────────────────────────────────
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

function Numpad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <View style={styles.numpadContainer}>
      {KEYS.map((key, idx) => {
        if (key === "") {
          return <View key={idx} style={styles.numpadKeyEmpty} />;
        }
        return (
          <Pressable
            key={idx}
            onPress={() => onKey(key)}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
            style={({ pressed }) => [
              styles.numpadKey,
              pressed && styles.numpadKeyPressed,
            ]}
          >
            {key === "del" ? (
              <Delete size={24} color="#FFFFFF" strokeWidth={1.8} />
            ) : (
              <Text style={styles.numpadKeyText}>{key}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
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
    }, 700);
  }, []);

  const handleComplete = useCallback(
    (pin: string) => {
      const ok = verifyPin(pin);
      if (ok) {
        successHaptic();
        // AuthGate re-renders automatically via store subscription
      } else {
        const next = failCount + 1;
        setFailCount(next);
        doShake(next >= 3 ? "Incorrect PIN" : "Incorrect PIN, try again");
      }
    },
    [verifyPin, failCount, doShake],
  );

  const handleKey = useCallback(
    (key: string) => {
      tapHaptic();
      if (key === "del") {
        setDigits((d) => d.slice(0, -1));
        setError("");
        return;
      }
      if (digits.length >= 4) return;
      const next = digits + key;
      setDigits(next);
      if (next.length === 4) {
        setTimeout(() => handleComplete(next), 120);
      }
    },
    [digits, handleComplete],
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
                <Text style={styles.subtitle}>Enter your PIN to continue</Text>
              </View>
            </Animated.View>

            {/* Middle: dots + error */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={{ alignItems: "center", gap: 14 }}
            >
              <PinDots filled={digits.length} shake={shake} />
              {error ? (
                <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                  {error}
                </Animated.Text>
              ) : (
                <Text style={styles.hintText}>4-digit PIN</Text>
              )}
            </Animated.View>

            {/* Bottom: numpad + forgot */}
            <Animated.View
              entering={FadeInDown.delay(180).duration(500)}
              style={{ alignItems: "center", gap: 20 }}
            >
              <Numpad onKey={handleKey} />
              {failCount >= 3 && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Pressable
                    onPress={handleForgotPin}
                    style={{ paddingHorizontal: 20, paddingVertical: 10 }}
                  >
                    <Text style={styles.forgotText}>Forgot PIN? Reset access</Text>
                  </Pressable>
                </Animated.View>
              )}
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
    paddingTop: 24,
    paddingBottom: 32,
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
  errorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "rgba(255,120,120,1)",
    textAlign: "center",
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  forgotText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textDecorationLine: "underline",
  },
  numpadContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 264,
    justifyContent: "center",
    gap: 14,
  },
  numpadKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  numpadKeyPressed: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  numpadKeyEmpty: {
    width: 72,
    height: 72,
  },
  numpadKeyText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
});
