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
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { MicTabIcon } from './TabIcons';

const BUTTON_SIZE = 104;
const BUTTON_RADIUS = BUTTON_SIZE / 2;
const BEZEL_SIZE = BUTTON_SIZE + 32;
const BEZEL_RADIUS = BEZEL_SIZE / 2;
const HALO_SIZE = BEZEL_SIZE + 40;
const HALO_RADIUS = HALO_SIZE / 2;
const RIPPLE_BASE = BUTTON_SIZE;

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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const n = parseInt(c, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function SonarRipple({
  color,
  delay,
}: {
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );
    return () => cancelAnimation(progress);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 + progress.value * 0.55;
    const opacity = 0.18 * (1 - progress.value * progress.value);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const rgb = hexToRgb(color);
  const borderCol = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`
    : color;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sonarRipple,
        { borderColor: borderCol },
        animatedStyle,
      ]}
    />
  );
}

function OuterHalo({ color }: { color: string }) {
  const opacity = useSharedValue(0.2);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) })
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
          ...(Platform.OS !== 'web'
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 30,
              }
            : {}),
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

  const rgb = hexToRgb(gradientOuter);
  const bezelBg = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`
    : 'rgba(255,255,255,0.12)';
  const bezelBorder = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.30)`
    : 'rgba(255,255,255,0.2)';
  const bezelInnerBorder = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45)`
    : 'rgba(255,255,255,0.3)';

  return (
    <View style={styles.container} pointerEvents={disabled ? 'none' : 'auto'}>
      {/* Sonar Ripple Rings */}
      <View style={styles.rippleContainer}>
        {[0, 1, 2].map((i) => (
          <SonarRipple key={i} color={gradientOuter} delay={i * 900} />
        ))}
      </View>

      {/* Outer Halo Glow */}
      <OuterHalo color={glowColor} />

      {/* Main Button with Bezel */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start recording"
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.outerBezelWrap, buttonAnimatedStyle]}>
          {/* Frosted bezel ring */}
          <View
            style={[
              styles.bezelRing,
              {
                backgroundColor: bezelBg,
                borderColor: bezelBorder,
                ...(Platform.OS !== 'web'
                  ? {
                      shadowColor: gradientOuter,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 16,
                    }
                  : {}),
              },
            ]}
          >
            {/* Inner bezel highlight */}
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.18)',
                'rgba(255,255,255,0.04)',
                'rgba(255,255,255,0.0)',
              ]}
              style={styles.bezelHighlight}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.4, 1]}
            />

            {/* Actual button circle inside the bezel */}
            <View
              style={[
                styles.buttonCircle,
                {
                  borderColor: bezelInnerBorder,
                  ...(Platform.OS !== 'web'
                    ? {
                        shadowColor: gradientInner,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.4,
                        shadowRadius: 14,
                      }
                    : {}),
                },
              ]}
            >
              {/* 3-stop sculpted gradient */}
              <LinearGradient
                colors={[gradientOuter, gradientMiddle, gradientInner]}
                style={styles.gradientFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                locations={[0, 0.45, 1]}
              />

              {/* Top gloss highlight */}
              <LinearGradient
                colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                style={styles.glossHighlight}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                locations={[0, 0.35, 0.7]}
              />

              {/* Bottom shadow crescent */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)']}
                style={styles.bottomShadow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />

              {/* Mic Icon */}
              <View style={[styles.iconContainer, { opacity: isAtLimit ? 0.45 : 1 }]}>
                <MicTabIcon size={44} color="#FFFFFF" filled />
              </View>
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
    width: HALO_SIZE + 40,
    height: HALO_SIZE + 40,
  },
  rippleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sonarRipple: {
    position: 'absolute',
    width: RIPPLE_BASE,
    height: RIPPLE_BASE,
    borderRadius: RIPPLE_BASE / 2,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  outerHalo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_RADIUS,
  },
  outerBezelWrap: {
    width: BEZEL_SIZE,
    height: BEZEL_SIZE,
    borderRadius: BEZEL_RADIUS,
  },
  bezelRing: {
    width: BEZEL_SIZE,
    height: BEZEL_SIZE,
    borderRadius: BEZEL_RADIUS,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bezelHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BEZEL_RADIUS,
  },
  buttonCircle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 8,
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
  glossHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
