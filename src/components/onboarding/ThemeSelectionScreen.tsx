/**
 * Onboarding Screen: Theme Selection
 *
 * Horizontal swipe carousel — each card shows the rounded orb design
 * matching the Settings screen. Swipe left/right to browse themes.
 * Background gradient updates live to match the active card.
 */

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { Check, Moon, ChevronLeft, ChevronRight } from "lucide-react-native";
import { tapHaptic, selectHaptic, confirmHaptic } from "@/lib/haptics";
import useOnboardingStore, {
  ThemeColorType,
  THEME_COLORS,
} from "@/lib/state/onboarding-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THEMES = Object.keys(THEME_COLORS) as ThemeColorType[];

// Each page is exactly SCREEN_WIDTH — pagingEnabled locks one card per swipe.
const H_PAD = 24;
const CARD_WIDTH = SCREEN_WIDTH - H_PAD * 2;

// Orb dimensions
const ORB  = 100;
const GLOW = ORB + 16;

// Arrow pulse distance (px)
const ARROW_PULSE = 6;

export function ThemeSelectionScreen() {
  const selectedTheme    = useOnboardingStore((s) => s.selectedTheme);
  const setSelectedTheme = useOnboardingStore((s) => s.setSelectedTheme);
  const nextStep         = useOnboardingStore((s) => s.nextStep);
  const prevStep         = useOnboardingStore((s) => s.prevStep);
  const currentStep      = useOnboardingStore((s) => s.currentStep);
  const playClickSound   = useClickSound();

  const scrollRef    = useRef<ScrollView>(null);
  const initialIndex = Math.max(0, THEMES.indexOf(selectedTheme));
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // ── Arrow pulse animations ───────────────────────────────────────────────
  const leftX  = useSharedValue(0);
  const rightX = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: 520, easing: Easing.inOut(Easing.ease) };
    leftX.value = withRepeat(
      withSequence(
        withTiming(-ARROW_PULSE, cfg),
        withTiming(0,            cfg),
      ),
      -1,
      false,
    );
    rightX.value = withRepeat(
      withSequence(
        withTiming(ARROW_PULSE, cfg),
        withTiming(0,           cfg),
      ),
      -1,
      false,
    );
  }, []);

  const leftArrowStyle  = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }],
  }));
  const rightArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }],
  }));

  // Hide left arrow on the very first theme (Midnight Glow, index 0).
  // Hide right arrow on the very last theme (Ocean Calm, last index).
  const showLeftArrow  = activeIndex > 0;
  const showRightArrow = activeIndex < THEMES.length - 1;

  // ── Scroll to persisted theme on mount ───────────────────────────────────
  useEffect(() => {
    if (initialIndex > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
      }, 50);
    }
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw     = e.nativeEvent.contentOffset.x / SCREEN_WIDTH;
      const clamped = Math.max(0, Math.min(Math.round(raw), THEMES.length - 1));
      if (clamped !== activeIndex) {
        setActiveIndex(clamped);
        setSelectedTheme(THEMES[clamped]);
        selectHaptic();
      }
    },
    [activeIndex],
  );

  // Update activeIndex continuously while scrolling so arrow visibility
  // updates in real time — not just after momentum ends.
  const handleScrollContinuous = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw     = e.nativeEvent.contentOffset.x / SCREEN_WIDTH;
      const clamped = Math.max(0, Math.min(Math.round(raw), THEMES.length - 1));
      if (clamped !== activeIndex) {
        setActiveIndex(clamped);
      }
    },
    [activeIndex],
  );

  const handleContinue = () => {
    // Commit the currently displayed card's theme to the store before advancing.
    // This guarantees the correct theme is saved even if the scroll event
    // fired slightly before or after the carousel settled.
    setSelectedTheme(THEMES[activeIndex]);
    playClickSound();
    confirmHaptic();
    nextStep();
  };
  const handleBack     = () => { playClickSound(); tapHaptic();     prevStep(); };

  const activeData = THEME_COLORS[THEMES[activeIndex]];

  return (
    <View style={{ flex: 1 }}>
      {/* Live background — fills the screen and updates with the active theme */}
      <LinearGradient
        colors={activeData.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      />

      {/* Full-screen content — same structure as PersonalizePermissionScreen */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <ProgressBar currentStep={currentStep} totalSteps={22} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          {/* Matching PersonalizePermissionScreen vertical rhythm */}
          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 12 }}>

            {/* Character — matches PersonalizePermissionScreen container */}
            <View
              style={{
                height: 80,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={activeData.primary}
              />
            </View>

            {/* Title — matches PersonalizePermissionScreen */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 14 }}
            >
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  textAlign: "center",
                  opacity: 0.92,
                  letterSpacing: 0.2,
                  lineHeight: 38,
                }}
              >
                Pick your colors
              </Text>
            </Animated.View>

            {/* Subtitle hint */}
            <Animated.View
              entering={FadeIn.delay(230).duration(900).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 16 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Swipe to browse · {THEMES.length} themes
              </Text>
            </Animated.View>

            {/* Carousel + side arrows — fills remaining space */}
            <View style={{ flex: 1, justifyContent: "center" }}>

              {/* Left pulsing arrow */}
              {showLeftArrow && (
                <Animated.View
                  style={[
                    leftArrowStyle,
                    {
                      position: "absolute",
                      left: -20,
                      zIndex: 10,
                      alignSelf: "center",
                      padding: 4,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <ChevronLeft size={28} color="rgba(255,255,255,0.70)" strokeWidth={2.2} />
                </Animated.View>
              )}

              {/* Right pulsing arrow */}
              {showRightArrow && (
                <Animated.View
                  style={[
                    rightArrowStyle,
                    {
                      position: "absolute",
                      right: -20,
                      zIndex: 10,
                      alignSelf: "center",
                      padding: 4,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <ChevronRight size={28} color="rgba(255,255,255,0.70)" strokeWidth={2.2} />
                </Animated.View>
              )}

              {/* Carousel — extend to full screen width by breaking out of the 24px padding */}
              <View style={{ marginHorizontal: -24 }}>
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleScroll}
                  onScroll={handleScrollContinuous}
                  scrollEventThrottle={SCREEN_WIDTH / 2}
                  style={{ flexGrow: 0, width: SCREEN_WIDTH }}
                >
                  {THEMES.map((theme, i) => {
                    const data     = THEME_COLORS[theme];
                    const isActive = i === activeIndex;

                    return (
                      <Pressable
                        key={theme}
                        onPress={() => {
                          if (!isActive) {
                            scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
                            setActiveIndex(i);
                            setSelectedTheme(theme);
                            selectHaptic();
                          }
                        }}
                        style={{ width: SCREEN_WIDTH, alignItems: "center", justifyContent: "center" }}
                      >
                        <View
                          style={{
                            width: CARD_WIDTH,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 20,
                            paddingHorizontal: 24,
                            gap: 20,
                          }}
                        >
                          {/* Orb with glow ring */}
                          <View style={{ alignItems: "center", justifyContent: "center" }}>
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
                              <View
                                style={{
                                  position: "absolute",
                                  top: 12, left: 12,
                                  width: 24, height: 24,
                                  borderRadius: 12,
                                  backgroundColor: "rgba(255,255,255,0.38)",
                                }}
                              />
                              <View
                                style={{
                                  position: "absolute",
                                  bottom: 0, left: 0, right: 0,
                                  height: 32,
                                  borderBottomLeftRadius: ORB / 2,
                                  borderBottomRightRadius: ORB / 2,
                                  backgroundColor: "rgba(0,0,0,0.10)",
                                }}
                              />
                              {isActive ? (
                                <Check size={30} color="#FFFFFF" strokeWidth={2.8} />
                              ) : theme === "darkMode" ? (
                                <Moon size={26} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                              ) : null}
                            </LinearGradient>
                          </View>

                          {/* Name + description */}
                          <View style={{ alignItems: "center", gap: 8 }}>
                            <Text
                              style={{
                                fontFamily: "Inter_700Bold",
                                fontSize: 24,
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
                                color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.50)",
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
            </View>

            {/* Dots + Continue — directly below carousel, no flex spacer pushing it down */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ alignItems: "center", gap: 10, paddingBottom: 8 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                {THEMES.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === activeIndex ? 26 : 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.32)",
                    }}
                  />
                ))}
              </View>
              <View style={{ width: "100%" }}>
                <OnboardingCTAButton label="Continue" onPress={handleContinue} />
              </View>
            </Animated.View>

          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
