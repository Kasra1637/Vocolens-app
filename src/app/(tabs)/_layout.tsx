import React from 'react';
import { Tabs } from 'expo-router';
import { MicTabIcon, BarChartTabIcon, BookTabIcon, AwardTabIcon, SettingsTabIcon } from '@/components/TabIcons';
import { tabSwitchHaptic } from '@/lib/haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing,
  useReducedMotion
} from 'react-native-reanimated';

import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_SIZE = 22;
const TRAY_MARGIN = 20;
const TRAY_WIDTH = SCREEN_WIDTH - (TRAY_MARGIN * 2);
const TAB_WIDTH = TRAY_WIDTH / 5;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  
  // Shared value for the active tab index animation
  const activeIndex = useSharedValue(state.index);

  React.useEffect(() => {
    activeIndex.value = withTiming(state.index, {
      duration: reducedMotion ? 0 : 600, // Slow, deliberate, respect reduced motion
      easing: Easing.bezier(0.33, 1, 0.68, 1), // Gentle, sophisticated curve
    });
  }, [state.index, reducedMotion]);

  const pillStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: activeIndex.value * TAB_WIDTH }
      ],
    };
  });

  const renderIcon = (index: number, isFocused: boolean) => {
    const color = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.4)';

    switch (index) {
      case 0: return <MicTabIcon      size={ICON_SIZE} color={color} filled={isFocused} />;
      case 1: return <BookTabIcon     size={ICON_SIZE} color={color} filled={isFocused} />;
      case 2: return <BarChartTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      case 3: return <AwardTabIcon    size={ICON_SIZE} color={color} filled={isFocused} />;
      case 4: return <SettingsTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      default: return null;
    }
  };

  const LABELS = ['Record', 'Entries', 'Insights', 'Awards', 'Settings'];

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      <BlurView
        intensity={60}
        tint="dark"
        style={styles.blurContainer}
      >
        <View style={styles.content}>
          {/* Active Tab Pill Background */}
          <Animated.View style={[styles.pill, pillStyle]} />
          
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              if (!isFocused) tabSwitchHaptic();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
              >
                <View style={styles.iconContainer}>
                  {renderIcon(index, isFocused)}
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      fontFamily: isFocused ? 'Inter_700Bold' : 'Inter_400Regular',
                      color: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                    }
                  ]}
                >
                  {LABELS[index]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: TRAY_MARGIN,
    right: TRAY_MARGIN,
    height: 76,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconContainer: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  pill: {
    position: 'absolute',
    width: TAB_WIDTH - 12,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    marginHorizontal: 6,
    zIndex: -1,
  },
});

export default function TabLayout() {
  const TabBarComponent = React.useMemo(() => {
    const Bar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;
    Bar.displayName = 'CustomTabBar';
    return Bar;
  }, []);

  return (
    <Tabs
      tabBar={TabBarComponent}
      initialRouteName="insights"
      screenOptions={{
        headerShown: useClientOnlyValue(false, false),
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Record'   }} />
      <Tabs.Screen name="entries"    options={{ title: 'Entries'  }} />
      <Tabs.Screen name="insights"   options={{ title: 'Insights' }} />
      <Tabs.Screen name="milestones" options={{ title: 'Awards'   }} />
      <Tabs.Screen name="settings"   options={{ title: 'Settings' }} />
    </Tabs>
  );
}
