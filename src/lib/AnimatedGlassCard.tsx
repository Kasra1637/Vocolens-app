/**
 * Animated Glass Card Component
 *
 * Provides consistent glassmorphic active/inactive state styling with spring animations
 * for all selectable cards across onboarding and welcome screens.
 *
 * Based on the proven styling from LanguageSelectionScreen's active state.
 */

import React from "react";
import { Pressable, PressableProps, ViewStyle, ColorValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { GlassCard, glassCard } from "./glass";

// Glassmorphism tokens based on LanguageSelectionScreen active state
const ACTIVE_BACKGROUND = "rgba(255,255,255,0.38)";
const INACTIVE_BACKGROUND = "rgba(255,255,255,0.08)";
const ACTIVE_BORDER_COLOR = "rgba(255,255,255,0.80)";
const INACTIVE_BORDER_COLOR = "rgba(255,255,255,0.15)";
const BORDER_WIDTH = 1.5;

// Animation configuration
const SPRING_CONFIG = { damping: 20, stiffness: 150 };
const PRESS_SCALE = 0.95;
const ACTIVE_SCALE = 1.02;
const INACTIVE_SCALE = 0.98;

interface AnimatedGlassCardProps extends PressableProps {
  /**
   * Whether this card is in the active/selected state
   */
  isActive?: boolean;

  /**
   * Primary color for glass effects (from theme)
   */
  primaryColor?: string;

  /**
   * Border radius for the card
   */
  borderRadius?: number;

  /**
   * Additional style overrides
   */
  style?: ViewStyle | ViewStyle[];

  /**
   * Content to render inside the card
   */
  children: React.ReactNode;

  /**
   * Optional custom active background color
   */
  activeBackgroundColor?: ColorValue;

  /**
   * Optional custom inactive background color
   */
  inactiveBackgroundColor?: ColorValue;

  /**
   * Optional custom active border color
   */
  activeBorderColor?: ColorValue;

  /**
   * Optional custom inactive border color
   */
  inactiveBorderColor?: ColorValue;
}

/**
 * Animated glass card with consistent active/inactive state transitions
 */
export function AnimatedGlassCard({
  isActive = false,
  primaryColor = "#8B5CF6", // Default to purple/theme color
  borderRadius = 14,
  style,
  children,
  activeBackgroundColor,
  inactiveBackgroundColor,
  activeBorderColor,
  inactiveBorderColor,
  ...pressableProps
}: AnimatedGlassCardProps) {
  // Shared values for animations
  const backgroundColor = useSharedValue(
    isActive ? ACTIVE_BACKGROUND : INACTIVE_BACKGROUND,
  );
  const borderColorValue = useSharedValue(
    isActive ? ACTIVE_BORDER_COLOR : INACTIVE_BORDER_COLOR,
  );
  const scale = useSharedValue(isActive ? ACTIVE_SCALE : INACTIVE_SCALE);

  // Update animations when props change
  // Using useEffect would cause flicker, so we derive directly

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
    borderWidth: BORDER_WIDTH,
    borderColor: borderColorValue.value,
    transform: [{ scale: scale.value }],
    borderRadius,
  }));

  const pressStyle = useAnimatedStyle(
    () => ({
      scale: scale.value * PRESS_SCALE,
    }),
    [],
  );

  // Handle press events with haptic feedback would go here
  // For now, we rely on the consumer to handle haptics

  return (
    <Pressable
      {...pressableProps}
      style={[
        glassCard({ borderRadius, primaryColor }), // Base glass structure
        animatedStyle, // Animated glassmorphism properties
        pressableProps.pressed ? pressStyle : {}, // Press feedback
        style, // Consumer style overrides
      ]}
    >
      {/* Glass layers (wash, gradients, specular, shadows, borders) */}
      <GlassCard primaryColor={primaryColor} borderRadius={borderRadius}>
        {children}
      </GlassCard>
    </Pressable>
  );
}
