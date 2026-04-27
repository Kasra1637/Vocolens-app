import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withDelay, withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@react-navigation/native';
import { Mic } from 'lucide-react-native';

const BUTTON_SIZE = 92;
const RIPPLE_COUNT = 3;
const RIPPLE_DURATION = 2100;

// Returns a lightened version of the input hex color (very basic)
function lighten(hex: string, amt = 0.14) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const n = parseInt(c, 16);
  let r = Math.min(255, ((n >> 16) & 0xFF) + Math.floor(255*amt));
  let g = Math.min(255, ((n >> 8) & 0xFF) + Math.floor(255*amt));
  let b = Math.min(255, (n & 0xFF) + Math.floor(255*amt));
  return `rgb(${r},${g},${b})`;
}

function AnimatedRipple({ color, delay, lighter }: { color: string; delay: number; lighter: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: RIPPLE_DURATION }), -1, false)
    );
  }, []);
  const style = useAnimatedStyle(() => {
    const scale = 1 + 2 * progress.value;
    const opacity = 0.27 * (1 - progress.value);
    return {
      position: 'absolute',
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      left: 0, top: 0,
      borderRadius: BUTTON_SIZE/2,
      backgroundColor: lighter,
      opacity,
      transform: [{ scale }],
    };
  });
  return <Animated.View pointerEvents="none" style={style} />;
}

export function RecordFab({ onPress, disabled = false }: { onPress: () => void, disabled?: boolean }) {
  const { colors } = useTheme();
  const accent = colors.primary ?? '#007AFF';
  const lighter = lighten(accent, 0.18);

  return (
    <View style={styles.fabWrap} pointerEvents={disabled ? 'none' : 'auto'}>
      {[0, 1, 2].map(i => (
        <AnimatedRipple key={i} color={accent} lighter={lighter}
          delay={i * (RIPPLE_DURATION / RIPPLE_COUNT / 2)} />
      ))}

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: accent,
            shadowColor: accent,
            shadowOpacity: Platform.OS === 'ios' ? 0.38 : 0.30,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 11 },
            elevation: 10,
            borderColor: lighter,
          },
          pressed && { opacity: 0.92 }
        ]}
      >
        <View style={[
          styles.glow,
          { backgroundColor: lighter, opacity: 0.34 }
        ]} pointerEvents="none" />
        <Mic size={42} color="#fff" style={{ zIndex: 10 }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  fab: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 10,
    overflow: 'visible',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUTTON_SIZE / 2,
    zIndex: 1,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 25,
  },
});
