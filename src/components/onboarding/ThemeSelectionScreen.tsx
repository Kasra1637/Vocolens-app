/**
 * Onboarding Screen: Theme Selection
 *
 * Horizontal swipe carousel — each card shows the rounded orb design
 * matching the Settings screen. Swipe left/right to browse themes.
 * Background gradient updates live to match the active card.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Check, Moon } from "lucide-react-native";
import { tapHaptic, selectHaptic, confirmHaptic } from "@/lib/haptics";
import useOnboardingStore, {
  ThemeColorType,
  THEME_COLORS,
} from "@/lib/state/onboarding-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THEMES = Object.keys(THEME_COLORS) as ThemeColorType[];

// Card layout — centered card fully visible with peek of adjacent cards
const H_PAD = 24;
const CARD_GAP = 16; // Reduced gap for better peeking
const PEEK = 30; // Amount of adjacent cards to peek
const CARD_WIDTH = SCREEN_WIDTH - H_PAD * 2 - PEEK * 2; // Account for peek on both sides
const PAGE_WIDTH = CARD_WIDTH + CARD_GAP; // Width of each page (card + gap)

// Orb dimensions
const ORB = 100;
const GLOW = ORB + 16;

export function ThemeSelectionScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const setSelectedTheme = useOnboardingStore((s) => s.setSelectedTheme);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const playClickSound = useClickSound();

  const scrollRef = useRef<ScrollView>(null);
  const initialIndex = Math.max(0, THEMES.indexOf(selectedTheme));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isScrolling, setIsScrolling] = useState(false);

  // Jump to the persisted theme on mount
  React.useEffect(() => {
    if (initialIndex > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          x: H_PAD + initialIndex * PAGE_WIDTH,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleScrollBeginDrag = () => {
    setIsScrolling(true);
  };

  const handleScrollEndDrag = () => {
    setIsScrolling(false);
  };

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollX = e.nativeEvent.contentOffset.x;
      const pageWidth = PAGE_WIDTH;
      // Calculate which page is closest to center, accounting for padding
      const rawPage = (scrollX - H_PAD) / pageWidth;

      // Calculate which page is closest to center
      const centerPage = Math.round(rawPage);
      const clampedPage = Math.max(0, Math.min(centerPage, THEMES.length - 1));

      if (clampedPage !== activeIndex) {
        setActiveIndex(clampedPage);
        setSelectedTheme(THEMES[clampedPage]);
        selectHaptic();

        // Smoothly snap to the centered position
        scrollRef.current?.scrollTo({
          x: H_PAD + clampedPage * pageWidth,
          animated: true,
        });
      }
    },
    [activeIndex],
  );

  const handleContinue = () => {
    playClickSound();
    confirmHaptic();
    nextStep();
  };
  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  const activeData = THEME_COLORS[THEMES[activeIndex]];

  return (
    <View style={{ flex: 1 }}>
      {/* Live background — updates with active theme */}
      <LinearGradient
        colors={activeData.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      />

      {/* Progress bar + back button overlay */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="box-none"
      >
        <ProgressBar currentStep={currentStep} totalSteps={13} />
        <SafeAreaView pointerEvents="box-none">
          <BackButton onPress={handleBack} show={currentStep > 0} />
        </SafeAreaView>
      </View>

      {/* Main content */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Space for progress bar + back button */}
          <View style={{ height: 72 }} />

          {/* Title */}
          <Animated.View
            entering={FadeInDown.delay(60).duration(500)}
            style={{ alignItems: "center", paddingBottom: 20 }}
            pointerEvents="none"
          >
            <Text
              style={{
                fontFamily: "Fraunces_700Bold",
                fontSize: 22,
                color: "#FFFFFF",
                opacity: 0.92,
                letterSpacing: 0.2,
              }}
            >
              Pick your colors
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: "rgba(255,255,255,0.65)",
                marginTop: 4,
              }}
            >
              Swipe to browse · {THEMES.length} themes
            </Text>
          </Animated.View>

          {/* Swipe carousel */}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled={true}
              decelerationRate="fast"
              onMomentumScrollEnd={handleMomentumScrollEnd}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingLeft: H_PAD,
                paddingRight: PEEK,
                gap: CARD_GAP,
              }}
              style={{ flexGrow: 0 }}
            >
              {THEMES.map((theme, i) => {
                const data = THEME_COLORS[theme];
                const isActive = i === activeIndex;

                return (
                  <Pressable
                    key={theme}
                    onPress={() => {
                      if (!isActive) {
                        scrollRef.current?.scrollTo({
                          x: H_PAD + i * PAGE_WIDTH,
                          animated: true,
                        });
                        setActiveIndex(i);
                        setSelectedTheme(theme);
                        selectHaptic();
                      }
                    }}
                  >
                    {/* Frosted-glass card */}
                    <View
                      style={{
                        width: CARD_WIDTH,
                        borderRadius: 28,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 36,
                        paddingHorizontal: 24,
                        gap: 20,
                        backgroundColor: isActive
                          ? "rgba(255,255,255,0.18)"
                          : "rgba(255,255,255,0.08)",
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive
                          ? "rgba(255,255,255,0.70)"
                          : "rgba(255,255,255,0.20)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: isActive ? 0.2 : 0.1,
                        shadowRadius: 20,
                        elevation: Platform.OS === "android" ? 0 : 10,
                      }}
                    >
                      {/* Orb with glow ring when active */}
                      <View
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isActive && (
                          <View
                            style={{
                              position: "absolute",
                              width: GLOW,
                              height: GLOW,
                              borderRadius: GLOW / 2,
                              borderWidth: 2.5,
                              borderColor: "rgba(255,255,255,0.90)",
                              shadowColor: "#FFFFFF",
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.55,
                              shadowRadius: 14,
                            }}
                          />
                        )}

                        <LinearGradient
                          colors={[data.gradientStart, data.gradientEnd]}
                          start={{ x: 0.15, y: 0 }}
                          end={{ x: 0.85, y: 1 }}
                          style={{
                            width: ORB,
                            height: ORB,
                            borderRadius: ORB / 2,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {/* Shimmer highlight */}
                          <View
                            style={{
                              position: "absolute",
                              top: 12,
                              left: 12,
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: "rgba(255,255,255,0.38)",
                            }}
                          />
                          {/* Depth shadow */}
                          <View
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: 32,
                              borderBottomLeftRadius: ORB / 2,
                              borderBottomRightRadius: ORB / 2,
                              backgroundColor: "rgba(0,0,0,0.10)",
                            }}
                          />
                          {isActive ? (
                            <Check
                              size={30}
                              color="#FFFFFF"
                              strokeWidth={2.8}
                            />
                          ) : theme === "darkMode" ? (
                            <Moon
                              size={26}
                              color="rgba(255,255,255,0.7)"
                              strokeWidth={2}
                            />
                          ) : null}
                        </LinearGradient>
                      </View>

                      {/* Name + description */}
                      <View style={{ alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 22,
                            color: "#FFFFFF",
                            textAlign: "center",
                            opacity: isActive ? 1 : 0.65,
                            letterSpacing: 0.2,
                          }}
                        >
                          {data.name}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 14,
                            color: isActive
                              ? "rgba(255,255,255,0.85)"
                              : "rgba(255,255,255,0.50)",
                            textAlign: "center",
                            lineHeight: 22,
                          }}
                        >
                          {data.description}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Dot indicators + Continue */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(500)}
            style={{
              paddingHorizontal: 24,
              paddingBottom: 32,
              paddingTop: 8,
              alignItems: "center",
              gap: 18,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
            >
              {THEMES.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === activeIndex ? 26 : 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor:
                      i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.32)",
                  }}
                />
              ))}
            </View>

            <View style={{ width: "100%" }}>
              <OnboardingCTAButton label="Continue" onPress={handleContinue} />
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </View>
  );
}
