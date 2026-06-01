/**
 * AnimatedStreakFlame
 *
 * A reusable, celebratory flame badge for streak displays. It:
 *  - Gives the flame a gentle, living "breathing" pulse when there's an active streak.
 *  - Fires a one-shot celebratory pop + expanding glow ring whenever the streak
 *    value INCREASES (reinforcing progress and achievement).
 *  - Stays calm and static when the streak is 0.
 *
 * Motion is tuned to the app's neurodivergent-friendly language: soft springs,
 * gentle overshoot, nothing jarring or looping aggressively.
 */

import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Flame } from "lucide-react-native";

interface AnimatedStreakFlameProps {
  /** Current streak count — drives the celebratory pop when it increases. */
  streak: number;
  /** Icon size. */
  size?: number;
  /** Diameter of the surrounding badge tile. */
  badgeSize?: number;
  /** Border radius of the badge tile. */
  badgeRadius?: number;
  /** Background colour of the badge tile. */
  badgeColor?: string;
  /** Colour used for the celebratory glow ring. */
  glowColor?: string;
  /** Icon colour. */
  iconColor?: string;
  /** Icon stroke width. */
  strokeWidth?: number;
}

export function AnimatedStreakFlame({
  streak,
  size = 26,
  badgeSize = 48,
  badgeRadius = 16,
  badgeColor = "rgba(255,255,255,0.15)",
  glowColor = "rgba(255,255,255,0.5)",
  iconColor = "#FFFFFF",
  strokeWidth = 2,
}: AnimatedStreakFlameProps) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(0.7);
  const ringOpacity = useSharedValue(0);
  const prevStreak = useSharedValue(streak);
  const breathe = useSharedValue(0);

  // Gentle continuous "breathing" while a streak is active.
  useEffect(() => {
    if (streak > 0) {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      breathe.value = withTiming(0, { duration: 300 });
    }
  }, [streak]);

  // Celebratory pop + glow ring whenever the streak increases.
  useEffect(() => {
    const prev = prevStreak.value;
    if (streak > prev && streak > 0) {
      // Springy pop with a gentle overshoot
      scale.value = withSequence(
        withSpring(1.32, { damping: 7, stiffness: 220 }),
        withSpring(1, { damping: 11, stiffness: 200 }),
      );
      // Expanding glow ring that fades out
      ringScale.value = 0.7;
      ringOpacity.value = withSequence(
        withTiming(0.85, { duration: 120 }),
        withDelay(60, withTiming(0, { duration: 760, easing: Easing.out(Easing.ease) })),
      );
      ringScale.value = withTiming(1.85, {
        duration: 900,
        easing: Easing.out(Easing.ease),
      });
    }
    prevStreak.value = streak;
  }, [streak]);

  const iconStyle = useAnimatedStyle(() => {
    // Combine the one-shot pop scale with the subtle breathing scale.
    const breatheScale = 1 + breathe.value * 0.06;
    return {
      transform: [{ scale: scale.value * breatheScale }],
    };
  });

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View
      style={{
        width: badgeSize,
        height: badgeSize,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Celebratory glow ring (behind the badge) */}
      <Animated.View
        pointerEvents="none"
        style={[
          ringStyle,
          {
            position: "absolute",
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeRadius + 4,
            borderWidth: 2.5,
            borderColor: glowColor,
          },
        ]}
      />

      {/* Badge tile */}
      <View
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeRadius,
          backgroundColor: badgeColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View style={iconStyle}>
          <Flame size={size} color={iconColor} strokeWidth={strokeWidth} />
        </Animated.View>
      </View>
    </View>
  );
}
