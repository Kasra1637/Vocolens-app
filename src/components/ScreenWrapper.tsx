import React from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { SCREEN_IN, SCREEN_OUT } from "@/lib/animations";

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: any;
}

/**
 * ScreenWrapper
 *
 * Provides consistent fade-and-lift transitions for screens.
 * Fades out while drifting up 16px, fades in while drifting down into place.
 */
export function ScreenWrapper({ children, style }: ScreenWrapperProps) {
  return (
    <Animated.View
      entering={SCREEN_IN}
      exiting={SCREEN_OUT}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
