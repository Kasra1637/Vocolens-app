import React from "react";
import { Tabs } from "expo-router";
import {
  MicTabIcon,
  BarChartTabIcon,
  BookTabIcon,
  AwardTabIcon,
  SettingsTabIcon,
} from "@/components/TabIcons";
import { tabSwitchHaptic } from "@/lib/haptics";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { useClientOnlyValue } from "@/lib/useClientOnlyValue";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";

const ICON_SIZE = 24;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Theme colors - reactively update when theme changes
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = THEME_COLORS[selectedTheme];
  const primaryColor = theme.primary;

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Derive the darkest colour from the theme's background gradient for seamless merge
  const barBg = theme.backgroundGradient[1];

  const renderIcon = (index: number, isFocused: boolean) => {
    const color = isFocused ? "#FFFFFF" : "rgba(255,255,255,0.45)";

    switch (index) {
      case 0:
        return <MicTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      case 1:
        return <BookTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      case 2:
        return <BarChartTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      case 3:
        return <AwardTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      case 4:
        return <SettingsTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      default:
        return null;
    }
  };

  const LABELS = ["Record", "Entries", "Insights", "Awards", "Settings"];

  return (
    <View style={[styles.container, { backgroundColor: barBg }]}>
      {/* Blur layer for glassmorphic depth */}
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Darkened overlay to ensure readability */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />

      {/* Subtle theme tint wash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(primaryColor, 0.12) }]} />

      {/* Thin top separator line */}
      <View style={[styles.topLine, { backgroundColor: hexToRgba(primaryColor, 0.20) }]} />

      {/* Tab row — paddingBottom handles safe area inside the bar */}
      <View style={[styles.tabRow, { paddingBottom: insets.bottom }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            if (!isFocused) tabSwitchHaptic();
            const event = navigation.emit({
              type: "tabPress",
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
              {/* Active indicator dot */}
              {isFocused && (
                <View style={[styles.activeDot, { backgroundColor: primaryColor }]} />
              )}

              <View style={styles.iconContainer}>
                {renderIcon(index, isFocused)}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
                    color: isFocused ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                  },
                ]}
              >
                {LABELS[index]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 6,
  },
  activeDot: {
    position: "absolute",
    top: -6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  iconContainer: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: "center",
  },
});

export default function TabLayout() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);

  const TabBarComponent = React.useMemo(() => {
    const Bar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;
    Bar.displayName = "CustomTabBar";
    return Bar;
  }, []);

  // Re-read on every render so sceneContainerStyle stays in sync when
  // the user changes their theme — never reads a stale cached colour.
  const sceneBg = THEME_COLORS[selectedTheme].backgroundGradient[1];

  return (
    <Tabs
      tabBar={TabBarComponent}
      initialRouteName="insights"
      screenOptions={{
        headerShown: useClientOnlyValue(false, false),
        // Matches the darkest gradient stop so the native container never
        // shows a colour that differs from the screen's own LinearGradient.
        sceneContainerStyle: { backgroundColor: sceneBg },
        // Disable the navigator's own crossfade — we run our own per-screen
        // entrance animations. The built-in animation adds an overlap frame
        // that is the primary source of the remaining blank flash.
        animation: "none",
        // Pre-render all tab screens so switching is instant with no
        // first-mount cost.
        lazy: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Record" }} />
      <Tabs.Screen name="entries" options={{ title: "Entries" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
      <Tabs.Screen name="milestones" options={{ title: "Awards" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
