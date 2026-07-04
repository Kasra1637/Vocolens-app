/**
 * BiometricUnlockCelebration
 *
 * Shown every time the user successfully unlocks the app (biometric or PIN).
 *
 * Design language — voice journaling / emotional safety:
 *   · Three sound-wave ripple rings expand outward (voice metaphor, matches
 *     FirstLaunchCelebration) instead of party confetti — this is a daily
 *     moment of returning to a safe space, not a party.
 *   · EmotionalCompanion in 'success' state springs in — familiar, warm.
 *   · Personal greeting uses the user's first name.
 *   · Subline is grounding, not hype — "ready when you are."
 *   · Theme-coloured throughout.
 *   · Auto-dismisses at 2.8 s with a smooth exhale-style fade-out.
 *   · Tap anywhere to skip.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { celebrationHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';

const { width: SW } = Dimensions.get('window');

// ─── Sound-wave ripple ring ───────────────────────────────────────────────────
function RippleRing({
  color,
  delay,
  maxSize,
}: {
  color: string;
  delay: number;
  maxSize: number;
}) {
  const scale   = useSharedValue(0.15);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.50, { duration: 280, easing: Easing.out(Easing.ease) }),
        withTiming(0,    { duration: 820, easing: Easing.in(Easing.ease) }),
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
          position: 'absolute',
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
      ]}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  onDone: () => void;
}

export function BiometricUnlockCelebration({ onDone }: Props) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const userName      = useOnboardingStore((s) => s.userName);
  const themeColors   = THEME_COLORS[selectedTheme];
  const themeColor    = selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary;

  const firstName = userName?.split(' ')[0] ?? null;

  // Companion springs up from below
  const companionY     = useSharedValue(50);
  const companionScale = useSharedValue(0.65);

  // Whole overlay fades out
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    celebrationHaptic();

    companionY.value = withDelay(
      80,
      withSpring(0, { damping: 14, stiffness: 170 }),
    );
    companionScale.value = withDelay(
      80,
      withSpring(1, { damping: 12, stiffness: 190 }),
    );

    // Auto-dismiss after 2.8 s
    const t = setTimeout(() => {
      overlayOpacity.value = withTiming(
        0,
        { duration: 480, easing: Easing.inOut(Easing.ease) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        },
      );
    }, 2800);

    return () => clearTimeout(t);
  }, []);

  const overlayStyle   = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const companionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: companionY.value },
      { scale: companionScale.value },
    ],
  }));

  // Tap anywhere to skip
  const dismiss = () => {
    overlayOpacity.value = withTiming(
      0,
      { duration: 300, easing: Easing.inOut(Easing.ease) },
      (finished) => { if (finished) runOnJS(onDone)(); },
    );
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, overlayStyle]}>
      {/* Scrim */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,3,16,0.90)' }]} />

      {/* Sound-wave ripple rings */}
      <View style={styles.rippleLayer} pointerEvents="none">
        <RippleRing color={themeColor} delay={160}  maxSize={SW * 0.50} />
        <RippleRing color={themeColor} delay={420}  maxSize={SW * 0.75} />
        <RippleRing color={themeColor} delay={680}  maxSize={SW * 1.02} />
      </View>

      {/* Centred content */}
      <View style={styles.content}>
        {/* Companion */}
        <Animated.View style={companionStyle}>
          <EmotionalCompanion
            state="success"
            size={124}
            themeColor={themeColor}
          />
        </Animated.View>

        {/* Copy */}
        <Animated.View
          entering={FadeIn.delay(520).duration(640)}
          style={styles.textBlock}
        >
          <Text style={styles.headline}>
            {firstName ? `Good to see you, ${firstName} 👋` : 'Good to see you 👋'}
          </Text>
          <Text style={styles.subline}>
            Your journal is here.{'\n'}Ready when you are.
          </Text>
        </Animated.View>
      </View>

      {/* Tap to skip */}
      <Animated.View
        style={StyleSheet.absoluteFill}
        onTouchEnd={dismiss}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 9999,
  },
  rippleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 0,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  headline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 38,
    opacity: 0.94,
  },
  subline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
    lineHeight: 23,
  },
});
