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
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useClientOnlyValue } from "@/lib/useClientOnlyValue";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";

const ICON_SIZE = 22;
// No rounded corners — completely flush with the screen edge on all sides
const TOP_RADIUS = 0;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  // Theme colors - reactively update when theme changes
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = THEME_COLORS[selectedTheme];

  // Shared value for the active tab index animation
  const activeIndex = useSharedValue(state.index);

  React.useEffect(() => {
    activeIndex.value = withTiming(state.index, {
      duration: reducedMotion ? 0 : 600,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    });
  }, [state.index, reducedMotion]);

  const renderIcon = (index: number, isFocused: boolean) => {
    const color = isFocused ? "#FFFFFF" : "rgba(255,255,255,0.5)";

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

  // ─── Theme-derived color utilities ──────────────────────────────────────────
  const primaryColor = theme.primary;

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // All surface / border / accent colors derived from theme primary
  const tintWash = hexToRgba(primaryColor, 0.22);
  const specularColor = hexToRgba(primaryColor, 0.30);
  const outerBorderColor = hexToRgba(primaryColor, 0.28);
  const innerBorderColor = hexToRgba(primaryColor, 0.12);
  const inactiveLabelOpacity = 0.5;

  // Height of the icon+label row — safe-area padding added below as extra fill
  const TAB_ROW_HEIGHT = 64;

  return (
    // Full-width container anchored to the bottom — completely flush, no gaps
    <View style={[styles.container, { backgroundColor: "rgba(0,0,0,0.72)" }]}>
      {/* ── Glassmorphic surface ────────────────────────────────────────────── */}

      {/* Deep blur base */}
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Solid dark base so blur has something to tint against */}
      <View style={[StyleSheet.absoluteFill, styles.darkBase]} />

      {/* Theme-tinted colour wash */}
      <View style={[StyleSheet.absoluteFill, styles.tintWash, { backgroundColor: tintWash }]} />

      {/* Top-edge light gradient (shine) */}
      <LinearGradient
        colors={[hexToRgba(primaryColor, 0.12), "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topLight}
      />

      {/* Specular highlight line on the very top edge — top only, no side borders */}
      <View style={[styles.specularLine, { backgroundColor: specularColor }]} />

      {/* Single top border line only — no sides, no corners, no rounding */}
      <View style={[styles.topBorder, { backgroundColor: outerBorderColor }]} />

      {/* ── Tab row ─────────────────────────────────────────────────────────── */}
      <View style={[styles.content, { height: TAB_ROW_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
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
              <View style={styles.iconContainer}>
                {renderIcon(index, isFocused)}
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.label,
                  {
                    fontFamily: isFocused ? "Inter_700Bold" : "Inter_400Regular",
                    color: isFocused
                      ? "#FFFFFF"
                      : `rgba(255,255,255,${inactiveLabelOpacity})`,
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
  // Full-width, anchored to bottom — no border radius, no overflow hidden, no gaps
  container: {
    width: "100%",
    zIndex: 100,
  },
  darkBase: {
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  tintWash: {
    // filled dynamically
  },
  topLight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  specularLine: {
    position: "absolute",
    top: 0.5,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 0.5,
  },
  // Single 1px line across the very top — no side/bottom borders, no radius
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 2,
    paddingTop: 4,
    height: "100%",
  },
  iconContainer: {
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
    textAlign: "center",
  },
});

export default function TabLayout() {
  const TabBarComponent = React.useMemo(() => {
    const Bar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;
    Bar.displayName = "CustomTabBar";
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
      <Tabs.Screen name="index" options={{ title: "Record" }} />
      <Tabs.Screen name="entries" options={{ title: "Entries" }} />
      <Tabs.Screen name="insights" options={{ title: "Insights" }} />
      <Tabs.Screen name="milestones" options={{ title: "Awards" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
