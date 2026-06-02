/**
 * FirstLaunchCelebration
 *
 * A warm, one-time welcome animation shown the very first time a new user
 * enters the app after completing onboarding.
 *
 * Design language — voice journaling metaphor:
 *   • Three concentric ripple rings expand outward from the companion, like
 *     sound waves radiating from a voice — the core action of this app.
 *   • The EmotionalCompanion bounces in from below in its 'success' state,
 *     celebrating the user's decision to start their journaling journey.
 *   • A personal welcome headline fades in (uses the user's first name if set).
 *   • A short, warm subline anchors the emotional intent of the app.
 *   • Everything is styled with the user's chosen theme colour.
 *   • Auto-dismisses after ~3 seconds with a gentle fade-out.
 *   • Never plays again — gated by hasSeenWelcomeCelebration in onboarding-store.
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

// ── Ripple ring ───────────────────────────────────────────────────────────────
interface RippleProps {
  color: string;
  delay: number;
  maxSize: number;
}

function RippleRing({ color, delay, maxSize }: RippleProps) {
  const scale  = useSharedValue(0.15);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.55, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(0,    { duration: 900, easing: Easing.in(Easing.ease) }),
      ),
    );
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }),
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
          borderWidth: 2,
          borderColor: color,
        },
      ]}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  onDone: () => void;
}

export function FirstLaunchCelebration({ onDone }: Props) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const userName      = useOnboardingStore((s) => s.userName);
  const themeColors   = THEME_COLORS[selectedTheme];
  const themeColor    = selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary;

  // Companion springs up from slightly below centre
  const companionY     = useSharedValue(60);
  const companionScale = useSharedValue(0.6);

  // Whole overlay fades out at the end
  const overlayOpacity = useSharedValue(1);

  const firstName = userName?.split(' ')[0] ?? null;

  useEffect(() => {
    celebrationHaptic();

    // Companion bounces in
    companionY.value = withDelay(
      120,
      withSpring(0, { damping: 13, stiffness: 160 }),
    );
    companionScale.value = withDelay(
      120,
      withSpring(1, { damping: 11, stiffness: 180 }),
    );

    // Auto-dismiss: fade out after 3 s
    const t = setTimeout(() => {
      overlayOpacity.value = withTiming(
        0,
        { duration: 500, easing: Easing.inOut(Easing.ease) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        },
      );
    }, 3000);

    return () => clearTimeout(t);
  }, []);

  const overlayStyle   = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const companionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: companionY.value },
      { scale: companionScale.value },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, overlayStyle]}>
      {/* Dark scrim */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,3,16,0.92)' }]} />

      {/* Ripple rings — staggered so they read as outward sound waves */}
      <View style={styles.rippleContainer} pointerEvents="none">
        <RippleRing color={themeColor} delay={200}  maxSize={SW * 0.52} />
        <RippleRing color={themeColor} delay={480}  maxSize={SW * 0.78} />
        <RippleRing color={themeColor} delay={760}  maxSize={SW * 1.05} />
      </View>

      {/* Centred content */}
      <View style={styles.content}>
        {/* Companion */}
        <Animated.View style={companionStyle}>
          <EmotionalCompanion
            state="success"
            size={130}
            themeColor={themeColor}
          />
        </Animated.View>

        {/* Welcome headline */}
        <Animated.View
          entering={FadeIn.delay(600).duration(700)}
          style={styles.textBlock}
        >
          <Text style={styles.headline}>
            {firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
          </Text>

          <Text style={styles.subline}>
            Your space to speak freely{'\n'}and discover what's within.
          </Text>
        </Animated.View>

        {/* Subtle bottom hint */}
        <Animated.Text
          entering={FadeIn.delay(1100).duration(600)}
          style={styles.hint}
        >
          Tap anywhere to begin
        </Animated.Text>
      </View>

      {/* Tap-anywhere to dismiss early */}
      <Animated.View
        style={StyleSheet.absoluteFill}
        onTouchEnd={() => {
          overlayOpacity.value = withTiming(
            0,
            { duration: 300, easing: Easing.inOut(Easing.ease) },
            (finished) => {
              if (finished) runOnJS(onDone)();
            },
          );
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 9999,
  },
  rippleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 4,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  headline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 40,
    opacity: 0.95,
  },
  subline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 24,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 36,
    letterSpacing: 0.3,
  },
});
