/**
 * Enter PIN Screen
 *
 * Shown every time the app is opened after PIN is set.
 * Correct PIN → sets isPinVerified → AuthGate lets the user through.
 * Wrong PIN → shake animation, 3 failed attempts shows "Forgot PIN?" option.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Delete, Lock } from 'lucide-react-native';
import { successHaptic, tapHaptic, errorHaptic } from '@/lib/haptics';
import usePinStore from '@/lib/state/pin-store';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';

// ── Dot row ──────────────────────────────────────────────────────────────────
function PinDots({
  filled,
  shake,
  accentColor,
}: {
  filled: number;
  shake: Animated.SharedValue<number>;
  accentColor: string;
}) {
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <Animated.View style={[{ flexDirection: 'row', gap: 20, justifyContent: 'center' }, shakeStyle]}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: i < filled ? accentColor : 'rgba(255,255,255,0.5)',
            backgroundColor: i < filled ? accentColor : 'transparent',
            shadowColor: i < filled ? accentColor : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: i < filled ? 0.8 : 0,
            shadowRadius: 6,
          }}
        />
      ))}
    </Animated.View>
  );
}

// ── Numpad ────────────────────────────────────────────────────────────────────
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

function Numpad({ onKey, accentColor }: { onKey: (k: string) => void; accentColor: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 268, justifyContent: 'center', gap: 16 }}>
      {KEYS.map((key, idx) => {
        if (key === '') return <View key={idx} style={{ width: 76, height: 76 }} />;
        return (
          <Pressable
            key={idx}
            onPress={() => onKey(key)}
            android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true }}
            style={({ pressed }) => ({
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: pressed
                ? 'rgba(255,255,255,0.22)'
                : 'rgba(255,255,255,0.10)',
              borderWidth: 1.5,
              borderColor: pressed
                ? 'rgba(255,255,255,0.4)'
                : 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            {key === 'del' ? (
              <Delete size={22} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 }}>
                {key}
              </Text>
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

  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
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
      setDigits('');
      setError('');
    }, 700);
  }, []);

  const handleComplete = useCallback((pin: string) => {
    const ok = verifyPin(pin);
    if (ok) {
      successHaptic();
    } else {
      const next = failCount + 1;
      setFailCount(next);
      doShake(next >= 3 ? 'Incorrect PIN' : 'Incorrect PIN, try again');
    }
  }, [verifyPin, failCount, doShake]);

  const handleKey = useCallback((key: string) => {
    tapHaptic();
    if (key === 'del') {
      setDigits((d) => d.slice(0, -1));
      setError('');
      return;
    }
    if (digits.length >= 4) return;
    const next = digits + key;
    setDigits(next);
    if (next.length === 4) {
      setTimeout(() => handleComplete(next), 120);
    }
  }, [digits, handleComplete]);

  const handleForgotPin = useCallback(() => {
    clearPin();
  }, [clearPin]);

  const bgColors = themeColors.backgroundGradient;
  // Use the theme's button gradient accent color for dots and highlights
  const accentColor = themeColors.buttonGradient[0];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Soft inner glow overlay */}
        <View
          style={{
            ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            backgroundColor: 'rgba(0,0,0,0.08)',
          }}
          pointerEvents="none"
        />

        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              paddingBottom: 48,
              paddingTop: 40,
            }}
          >
            {/* Top: companion + greeting */}
            <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', gap: 20 }}>
              <View
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: 65,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.22)',
                }}
              >
                <EmotionalCompanion
                  state="idle"
                  size={100}
                  themeColor={accentColor}
                />
              </View>

              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Lock size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 28,
                      color: '#FFFFFF',
                      letterSpacing: -0.5,
                    }}
                  >
                    Welcome back
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.65)',
                    textAlign: 'center',
                  }}
                >
                  Enter your PIN to continue
                </Text>
              </View>
            </Animated.View>

            {/* Middle: dots + error */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={{ alignItems: 'center', gap: 20 }}
            >
              {/* Frosted pill behind dots */}
              <View
                style={{
                  paddingHorizontal: 36,
                  paddingVertical: 22,
                  borderRadius: 28,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <PinDots filled={digits.length} shake={shake} accentColor={accentColor} />
              </View>

              {error ? (
                <Animated.Text
                  entering={FadeIn.duration(200)}
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 13,
                    color: 'rgba(255,140,140,1)',
                    textAlign: 'center',
                  }}
                >
                  {error}
                </Animated.Text>
              ) : (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  4-digit PIN
                </Text>
              )}
            </Animated.View>

            {/* Bottom: numpad + forgot */}
            <Animated.View
              entering={FadeInDown.delay(180).duration(500)}
              style={{ alignItems: 'center', gap: 28 }}
            >
              <Numpad onKey={handleKey} accentColor={accentColor} />

              {failCount >= 3 && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Pressable
                    onPress={handleForgotPin}
                    style={({ pressed }) => ({
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 20,
                      backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'transparent',
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 14,
                        color: 'rgba(255,255,255,0.55)',
                        textDecorationLine: 'underline',
                      }}
                    >
                      Forgot PIN? Reset access
                    </Text>
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
