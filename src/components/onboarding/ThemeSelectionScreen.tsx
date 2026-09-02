/**
 * Onboarding Screen: Theme Selection
 *
 * REDESIGNED INTERACTION MODEL
 * ────────────────────────────
 * This screen previously used a horizontal paging ScrollView and derived the
 * "which theme is selected" state by reading the scroll offset back out of the
 * ScrollView (onScroll / onMomentumScrollEnd). That meant there were TWO
 * sources of truth — the scroll position and the React state — and they could
 * disagree. Tapping an arrow set the state and then asked the ScrollView to
 * move; the trailing/throttled scroll callbacks that followed could report a
 * stale offset and drag the state back to the previous page. The visible
 * result was the reported bug: the centred orb rendered WITHOUT its white ring
 * and check icon, and the background gradient stayed on the previous theme,
 * even though the correct theme's name and colour were on screen.
 *
 * The redesign removes that entire class of bug rather than guarding against
 * it:
 *
 *   • There is no ScrollView and no scroll-offset maths anywhere. `activeIndex`
 *     is the SINGLE source of truth.
 *   • Exactly ONE card is rendered — the active one — so it is always styled as
 *     active. The white ring, the check icon, the orb gradient, the name, the
 *     description and the full-screen background all read from that same one
 *     index. They cannot drift apart because there is nothing to reconcile.
 *   • Swiping and tapping both call the identical `goToIndex()` function. A
 *     swipe is detected with PanResponder and simply resolves to "previous" or
 *     "next"; an arrow tap resolves to the same thing. Same code path, so the
 *     two interactions cannot behave differently.
 *
 * Content is unchanged: mascot, "Pick your colors", the swipe/tap hint, the
 * orb with its ring + check, theme name, theme description, the page dots and
 * the Continue button.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { Check, ChevronLeft, ChevronRight } from "lucide-react-native";
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

// Orb dimensions
const ORB  = 100;
const GLOW = ORB + 16;

// Arrow pulse distance (px)
const ARROW_PULSE = 6;

// How far a horizontal drag must travel before it counts as a page change.
// Proportional to screen width so it feels the same on any device.
const SWIPE_THRESHOLD = Math.max(40, SCREEN_WIDTH * 0.12);

export function ThemeSelectionScreen() {
  const selectedTheme    = useOnboardingStore((s) => s.selectedTheme);
  const setSelectedTheme = useOnboardingStore((s) => s.setSelectedTheme);
  const nextStep         = useOnboardingStore((s) => s.nextStep);
  const prevStep         = useOnboardingStore((s) => s.prevStep);
  const currentStep      = useOnboardingStore((s) => s.currentStep);
  const playClickSound   = useClickSound();

  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, THEMES.indexOf(selectedTheme)),
  );
  // +1 when moving forward, -1 when moving back — drives the enter animation's
  // direction so the card appears to come from the side you swiped/tapped.
  const [direction, setDirection] = useState(1);

  // Mirrors activeIndex so the PanResponder (created once) always reads the
  // current value instead of capturing a stale one.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // ── The one and only way the selection changes ──────────────────────────
  // Both arrow taps and swipes funnel through here, so they are guaranteed to
  // produce identical results. Stable identity (refs only, no activeIndex in
  // deps) so the PanResponder never needs rebuilding.
  const goToIndex = useCallback(
    (next: number) => {
      const current = activeIndexRef.current;
      const clamped = Math.max(0, Math.min(next, THEMES.length - 1));
      if (clamped === current) return;
      setDirection(clamped > current ? 1 : -1);
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
      setSelectedTheme(THEMES[clamped]);
      selectHaptic();
    },
    [setSelectedTheme],
  );

  const goPrev = useCallback(() => goToIndex(activeIndexRef.current - 1), [goToIndex]);
  const goNext = useCallback(() => goToIndex(activeIndexRef.current + 1), [goToIndex]);

  // ── Swipe handling ──────────────────────────────────────────────────────
  // Resolves a horizontal drag to prev/next and then calls the exact same
  // goToIndex() the arrows use.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Claim the gesture only for clearly-horizontal drags, so vertical
        // scrolling / other gestures are unaffected.
        onMoveShouldSetPanResponder: (_evt, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_evt, g) => {
          if (g.dx <= -SWIPE_THRESHOLD) goNext();
          else if (g.dx >= SWIPE_THRESHOLD) goPrev();
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [goNext, goPrev],
  );

  // ── Arrow pulse animations ───────────────────────────────────────────────
  const leftX  = useSharedValue(0);
  const rightX = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: 520, easing: Easing.inOut(Easing.ease) };
    leftX.value = withRepeat(
      withSequence(withTiming(-ARROW_PULSE, cfg), withTiming(0, cfg)),
      -1,
      false,
    );
    rightX.value = withRepeat(
      withSequence(withTiming(ARROW_PULSE, cfg), withTiming(0, cfg)),
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

  const showLeftArrow  = activeIndex > 0;
  const showRightArrow = activeIndex < THEMES.length - 1;

  const handleContinue = () => {
    // activeIndex is the single source of truth, so this is always the theme
    // the user can see on screen.
    setSelectedTheme(THEMES[activeIndex]);
    playClickSound();
    confirmHaptic();
    nextStep();
  };
  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  // Everything visual derives from this one value.
  const activeTheme = THEMES[activeIndex];
  const activeData  = THEME_COLORS[activeTheme];

  return (
    <View style={{ flex: 1 }}>
      {/* Live background — always matches the visible card */}
      <LinearGradient
        colors={activeData.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      />

      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <ProgressBar currentStep={currentStep} totalSteps={26} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 12 }}>

            {/* Character */}
            <View style={{ height: 80, alignItems: "center", justifyContent: "center" }}>
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={activeData.primary}
              />
            </View>

            {/* Title */}
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
                Swipe or tap the arrows · {THEMES.length} themes
              </Text>
            </Animated.View>

            {/* Card area — swipe surface + side arrows */}
            <View
              style={{ flex: 1, justifyContent: "center" }}
              {...panResponder.panHandlers}
            >
              {/* Left arrow */}
              {showLeftArrow && (
                <Animated.View
                  style={[
                    leftArrowStyle,
                    { position: "absolute", left: -20, zIndex: 10, alignSelf: "center" },
                  ]}
                >
                  <Pressable onPress={goPrev} hitSlop={16} style={{ padding: 4 }}>
                    <ChevronLeft size={28} color="rgba(255,255,255,0.70)" strokeWidth={2.2} />
                  </Pressable>
                </Animated.View>
              )}

              {/* Right arrow */}
              {showRightArrow && (
                <Animated.View
                  style={[
                    rightArrowStyle,
                    { position: "absolute", right: -20, zIndex: 10, alignSelf: "center" },
                  ]}
                >
                  <Pressable onPress={goNext} hitSlop={16} style={{ padding: 4 }}>
                    <ChevronRight size={28} color="rgba(255,255,255,0.70)" strokeWidth={2.2} />
                  </Pressable>
                </Animated.View>
              )}

              {/* The single active card. `key` makes it re-mount on change so
                  the directional enter animation plays. Because only the
                  active theme is ever rendered here, the ring + check + colour
                  are always correct by construction. */}
              <Animated.View
                key={activeTheme}
                entering={(direction >= 0 ? FadeInRight : FadeInLeft)
                  .duration(300)
                  .easing(SOFT)}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 20,
                  gap: 20,
                }}
              >
                {/* Orb with glow ring */}
                <View style={{ alignItems: "center", justifyContent: "center" }}>
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
                  <LinearGradient
                    colors={[activeData.gradientStart, activeData.gradientEnd]}
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
                        top: 12,
                        left: 12,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.38)",
                      }}
                    />
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
                    <Check size={30} color="#FFFFFF" strokeWidth={2.8} />
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
                      letterSpacing: 0.2,
                    }}
                  >
                    {activeData.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      color: "rgba(255,255,255,0.85)",
                      textAlign: "center",
                      lineHeight: 22,
                    }}
                  >
                    {activeData.description}
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* Dots + Continue — lifted off the bottom edge so the block sits
                higher and doesn't crowd the gesture bar / nav bar. */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ alignItems: "center", gap: 18, paddingBottom: 28 }}
            >
              {/* Page dots — the active one becomes a soft pill, inactive ones
                  are small, low-contrast circles. Slightly larger gap and a
                  dimmer inactive state read as more refined than uniform,
                  high-contrast dots. */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {THEMES.map((theme, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <Pressable
                      key={theme}
                      onPress={() => goToIndex(i)}
                      hitSlop={12}
                      // Generous vertical padding keeps the tap target
                      // comfortable without enlarging the visible dot.
                      style={{ paddingVertical: 6, paddingHorizontal: 2 }}
                    >
                      <View
                        style={{
                          width: isActive ? 22 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isActive
                            ? "#FFFFFF"
                            : "rgba(255,255,255,0.28)",
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ width: "100%" }}>
                <OnboardingCTAButton
                  label="Continue"
                  onPress={handleContinue}
                  borderColor={activeData.secondary || activeData.primary}
                />
              </View>
            </Animated.View>

          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
