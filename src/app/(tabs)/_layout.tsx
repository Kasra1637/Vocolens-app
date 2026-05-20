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
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useClientOnlyValue } from "@/lib/useClientOnlyValue";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ICON_SIZE = 22;
const TRAY_MARGIN = 20;
const TRAY_WIDTH = SCREEN_WIDTH - TRAY_MARGIN * 2;
const TAB_WIDTH = TRAY_WIDTH / 5;

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

  const pillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: activeIndex.value * TAB_WIDTH }],
    };
  });

  const renderIcon = (index: number, isFocused: boolean) => {
    const color = isFocused ? "#FFFFFF" : "rgba(255,255,255,0.5)";

    switch (index) {
      case 0:
        return <MicTabIcon size={ICON_SIZE} color={color} filled={isFocused} />;
      case 1:
        return (
          <BookTabIcon size={ICON_SIZE} color={color} filled={isFocused} />
        );
      case 2:
        return (
          <BarChartTabIcon size={ICON_SIZE} color={color} filled={isFocused} />
        );
      case 3:
        return (
          <AwardTabIcon size={ICON_SIZE} color={color} filled={isFocused} />
        );
      case 4:
        return (
          <SettingsTabIcon size={ICON_SIZE} color={color} filled={isFocused} />
        );
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
  const glassTint = hexToRgba(primaryColor, 0.2);
  const tintWash = hexToRgba(primaryColor, 0.12);
  const specularColor = hexToRgba(primaryColor, 0.18);
  const bottomShadowColor = hexToRgba(primaryColor, 0.15);
  const outerBorderColor = hexToRgba(primaryColor, 0.1);
  const innerBorderColor = hexToRgba(primaryColor, 0.05);
  const pillGradientStart = hexToRgba(primaryColor, 0.35);
  const pillGradientEnd = hexToRgba(primaryColor, 0.15);
  const pillSpecularColor = hexToRgba(primaryColor, 0.25);
  const pillBorderColor = hexToRgba(primaryColor, 0.15);
  const iconGlowColor = hexToRgba(primaryColor, 0.22);
  const inactiveLabelOpacity = 0.5;

  return (
    <View
      style={[styles.container, { bottom: Math.max(insets.bottom, 12) + 8 }]}
    >
      {/* Glass Tray Container */}
      <View style={styles.tray}>
        {/* Deep blur base layer */}
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Tint wash layer - subtle theme color */}
        <View style={[styles.tintWash, { backgroundColor: tintWash }]} />

        {/* Top light gradient - subtle shine from top */}
        <LinearGradient
          colors={[hexToRgba(primaryColor, 0.08), "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topLight}
        />

        {/* Specular highlight line - top edge (theme-derived) */}
        <View
          style={[styles.specularLine, { backgroundColor: specularColor }]}
        />

        {/* Bottom shadow line (theme-derived) */}
        <View
          style={[styles.bottomShadow, { backgroundColor: bottomShadowColor }]}
        />

        {/* Fine outer border (theme-derived) */}
        <View style={[styles.outerBorder, { borderColor: outerBorderColor }]} />

        {/* Inner border glow (theme-derived) */}
        <View style={[styles.innerBorder, { borderColor: innerBorderColor }]} />

        {/* Tab Content */}
        <View style={styles.content}>
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
                  style={[
                    styles.label,
                    {
                      fontFamily: isFocused
                        ? "Inter_700Bold"
                        : "Inter_400Regular",
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: TRAY_MARGIN,
    right: TRAY_MARGIN,
    height: 76,
    zIndex: 100,
  },
  tray: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  tintWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  topLight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  specularLine: {
    position: "absolute",
    top: 0.5,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 0.5,
  },
  bottomShadow: {
    position: "absolute",
    bottom: 0.5,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 0.5,
  },
  outerBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
  },
  innerBorder: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 22,
    borderWidth: 0.5,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconContainer: {
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  pill: {
    position: "absolute",
    width: TAB_WIDTH - 12,
    height: 60,
    borderRadius: 22,
    marginHorizontal: 6,
    marginTop: 10,
    overflow: "hidden",
  },
  pillSpecular: {
    position: "absolute",
    top: 0.5,
    left: 6,
    right: 6,
    height: 1,
    borderRadius: 0.5,
  },
  pillBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    borderWidth: 1,
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
