import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface AnimatedWaveBackgroundProps {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  isDarkMode: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Individual wave band component with horizontal scrolling
interface WaveBandProps {
  color: string;
  opacity: number;
  height: number;
  verticalPosition: number; // 0-1, where 0 is top and 1 is bottom
  animationDuration: number;
  delay: number;
  reverse?: boolean;
}

function WaveBand({
  color,
  opacity,
  height,
  verticalPosition,
  animationDuration,
  delay,
  reverse = false,
}: WaveBandProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Start animation after delay
    setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, {
          duration: animationDuration,
          easing: Easing.linear, // Linear for continuous scrolling
        }),
        -1,
        false // No reverse - continuous loop
      );
    }, delay);
  }, [animationDuration, delay]);

  const animatedStyle = useAnimatedStyle(() => {
    // Create continuous horizontal scrolling
    const translateX = interpolate(
      progress.value,
      [0, 1],
      reverse ? [0, -SCREEN_WIDTH] : [0, SCREEN_WIDTH]
    );

    return {
      transform: [{ translateX }],
    };
  });

  const topPosition = SCREEN_HEIGHT * verticalPosition;

  return (
    <View
      style={{
        position: 'absolute',
        top: topPosition,
        left: 0,
        width: SCREEN_WIDTH,
        height: height,
        opacity: opacity,
        overflow: 'hidden',
      }}
    >
      {/* First band */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: reverse ? -SCREEN_WIDTH : 0,
            width: SCREEN_WIDTH * 3, // Triple width for seamless loop
            height: height,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[`${color}00`, color, color, `${color}00`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            flex: 1,
            borderRadius: height / 2,
          }}
        />
      </Animated.View>

      {/* Second band for seamless loop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: reverse ? 0 : -SCREEN_WIDTH,
            width: SCREEN_WIDTH * 3,
            height: height,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[`${color}00`, color, color, `${color}00`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            flex: 1,
            borderRadius: height / 2,
          }}
        />
      </Animated.View>
    </View>
  );
}

export function AnimatedWaveBackground({
  primaryColor,
  secondaryColor,
  backgroundColor,
  isDarkMode,
}: AnimatedWaveBackgroundProps) {
  // Generate purple gradient palette based on theme
  const getPurpleGradientPalette = () => {
    if (isDarkMode) {
      return {
        deep: '#2D1B4E',      // Deep violet
        rich: '#3D2463',      // Rich purple
        medium: '#4A2C6D',    // Medium purple
        soft: '#5B3A82',      // Soft purple
        light: '#6D4A96',     // Light purple
        pale: '#7E5AA5',      // Pale purple
        lavender: '#9370DB',  // Lavender
        mist: primaryColor,   // Theme primary
      };
    }
    return {
      deep: '#7E22CE',        // Deep violet
      rich: '#9333EA',        // Rich purple
      medium: '#A855F7',      // Medium purple
      soft: '#C084FC',        // Soft purple
      light: '#D8B4FE',       // Light purple
      pale: '#E9D5FF',        // Pale purple
      lavender: '#F3E8FF',    // Lavender
      mist: primaryColor,     // Theme primary
    };
  };

  const palette = getPurpleGradientPalette();

  // Define wave bands configuration matching reference image
  // Alternating left-to-right and right-to-left for visual interest
  const waveBands = [
    {
      color: palette.deep,
      opacity: isDarkMode ? 0.20 : 0.12,
      height: SCREEN_HEIGHT * 0.18,
      verticalPosition: 0.08,
      animationDuration: 25000,
      delay: 0,
      reverse: false,
    },
    {
      color: palette.rich,
      opacity: isDarkMode ? 0.18 : 0.11,
      height: SCREEN_HEIGHT * 0.16,
      verticalPosition: 0.18,
      animationDuration: 22000,
      delay: 500,
      reverse: true,
    },
    {
      color: palette.medium,
      opacity: isDarkMode ? 0.16 : 0.10,
      height: SCREEN_HEIGHT * 0.20,
      verticalPosition: 0.30,
      animationDuration: 28000,
      delay: 1000,
      reverse: false,
    },
    {
      color: palette.soft,
      opacity: isDarkMode ? 0.15 : 0.09,
      height: SCREEN_HEIGHT * 0.17,
      verticalPosition: 0.42,
      animationDuration: 24000,
      delay: 1500,
      reverse: true,
    },
    {
      color: palette.light,
      opacity: isDarkMode ? 0.14 : 0.08,
      height: SCREEN_HEIGHT * 0.19,
      verticalPosition: 0.54,
      animationDuration: 26000,
      delay: 2000,
      reverse: false,
    },
    {
      color: palette.pale,
      opacity: isDarkMode ? 0.12 : 0.07,
      height: SCREEN_HEIGHT * 0.15,
      verticalPosition: 0.65,
      animationDuration: 23000,
      delay: 2500,
      reverse: true,
    },
    {
      color: palette.lavender,
      opacity: isDarkMode ? 0.11 : 0.06,
      height: SCREEN_HEIGHT * 0.18,
      verticalPosition: 0.76,
      animationDuration: 27000,
      delay: 3000,
      reverse: false,
    },
    {
      color: palette.mist,
      opacity: isDarkMode ? 0.10 : 0.05,
      height: SCREEN_HEIGHT * 0.14,
      verticalPosition: 0.86,
      animationDuration: 25000,
      delay: 3500,
      reverse: true,
    },
  ];

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
      pointerEvents="none"
    >
      {/* Gradient background base */}
      <LinearGradient
        colors={
          isDarkMode
            ? ['#0A0414', '#0F0A1F', '#1A1229', '#251A35']
            : ['#FAF5FF', '#F5F0FF', '#F3E8FF', '#E9D5FF']
        }
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Render all wave bands */}
      {waveBands.map((band, index) => (
        <WaveBand
          key={`wave-${index}`}
          color={band.color}
          opacity={band.opacity}
          height={band.height}
          verticalPosition={band.verticalPosition}
          animationDuration={band.animationDuration}
          delay={band.delay}
          reverse={band.reverse}
        />
      ))}

      {/* Soft vignette overlay for depth */}
      <LinearGradient
        colors={[
          `${backgroundColor}00`,
          `${backgroundColor}00`,
          `${backgroundColor}15`,
        ]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </View>
  );
}
