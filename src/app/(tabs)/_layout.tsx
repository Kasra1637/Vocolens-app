import React from 'react';
import { Tabs } from 'expo-router';
import { MicTabIcon, BarChartTabIcon, BookTabIcon, AwardTabIcon, SettingsTabIcon } from '@/components/TabIcons';
import { tabSwitchHaptic } from '@/lib/haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useClientOnlyValue } from '@/lib/useClientOnlyValue';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

const ICON_SIZE = 22;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme] || THEME_COLORS.lavenderBliss;
  // Use the darkest (last) stop of the background gradient so the tab bar
  // blends seamlessly with the bottom of the screen background.
  const navBarColor = themeColors.backgroundGradient[2];

  const renderIcon = (index: number, isFocused: boolean) => {
    const color = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.4)';

    switch (index) {
      case 0: // Record
        return <MicTabIcon      size={ICON_SIZE} color={color} filled={isFocused} />;
      case 1: // Journal
        return <BookTabIcon     size={ICON_SIZE} color={color} filled={isFocused} />;
      case 2: // Insights
        return <BarChartTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      case 3: // Awards
        return <AwardTabIcon    size={ICON_SIZE} color={color} filled={isFocused} />;
      case 4: // Settings
        return <SettingsTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      default:
        return null;
    }
  };

  const LABELS = ['Record', 'Entries', 'Insights', 'Awards', 'Settings'];

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: navBarColor,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 18,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            tabSwitchHaptic();
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
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8, gap: 4 }}
            >
              {renderIcon(index, isFocused)}
              <Text
                style={{
                  fontFamily: isFocused ? 'Inter_700Bold' : 'Inter_400Regular',
                  fontSize: 10,
                  color: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  letterSpacing: 0.3,
                }}
              >
                {LABELS[index]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/* Safe area spacer — fills under the home indicator / Android nav bar */}
      <View style={{ height: insets.bottom > 0 ? insets.bottom : 12 }} />
    </View>
  );
}

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
