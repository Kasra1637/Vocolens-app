import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { MicTabIcon } from './TabIcons';

const BUTTON_SIZE = 100;
const BUTTON_RADIUS = BUTTON_SIZE / 2;
const HALO_SIZE = BUTTON_SIZE + 24; // 12px padding around button
const HALO_RADIUS = HALO_SIZE / 2;

interface MicButtonProps {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  isAtLimit?: boolean;
  micButtonGradient: [string, string, string];
  glowColor: string;
  scale?: Animated.SharedValue<number>;
}

// Sonar ripple ring component
function SonarRipple({
  color,
  delay,
  index,
}: {
  color: string;
  delay: number;
  index: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + progress.value * 1.8;
    const opacity = 0.4 * (1 - progress.value);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sonarRipple,
        {
          backgroundColor: color,
          borderColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

// Outer halo glow component
function OuterHalo({ color }: { color: string }) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.outerHalo,
        {
          backgroundColor: color,
          shadowColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function MicButton({
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  isAtLimit = false,
  micButtonGradient,
  glowColor,
  scale: externalScale,
}: MicButtonProps) {
  const [gradientOuter, gradientMiddle, gradientInner] = micButtonGradient;

  // Internal scale for press animations (if external scale not provided)
  const internalScale = useSharedValue(1);
  const scale = externalScale ?? internalScale;

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    onPressIn?.();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    onPressOut?.();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container} pointerEvents={disabled ? 'none' : 'auto'}>
      {/* Sonar Ripple Rings */}
      <View style={styles.rippleContainer}>
        {[0, 1, 2].map((i) => (
          <SonarRipple
            key={i}
            color={glowColor}
            delay={i * 800}
            index={i}
          />
        ))}
      </View>

      {/* Outer Halo Glow */}
      <OuterHalo color={glowColor} />

      {/* Main Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start recording"
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          {/* Theme-tinted bezel/border */}
          <View
            style={[
              styles.bezel,
              {
                borderColor: gradientOuter,
                shadowColor: gradientOuter,
              },
            ]}
          >
            {/* 3-stop gradient background */}
            <LinearGradient
              colors={[gradientOuter, gradientMiddle, gradientInner]}
              style={styles.gradientBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              locations={[0, 0.5, 1]}
            />

            {/* Inner highlight/gloss effect */}
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
              style={styles.innerHighlight}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.5 }}
            />

            {/* Mic Icon */}
            <View style={styles.iconContainer}>
              <MicTabIcon
                size={44}
                color="#FFFFFF"
                filled
                style={{ opacity: isAtLimit ? 0.45 : 1 }}
              />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: BUTTON_SIZE + 60,
    height: BUTTON_SIZE + 60,
  },
  rippleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sonarRipple: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  outerHalo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_RADIUS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  buttonContainer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
  },
  bezel: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
    borderWidth: 3,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  innerHighlight: {
    ...StyleSheet.absoluteFillObject,
    height: '50%',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
