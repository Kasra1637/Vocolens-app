/**
 * Onboarding Screen: Language Selection
 *
 * Lets the user pick their preferred language for voice transcription.
 * Presents all Deepgram Nova-2 supported languages in a searchable scrollable list.
 * The Continue button is positioned directly under the 4th language (Danish)
 * so it's immediately visible — users scroll down to see more languages.
 */

import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { Check, Search } from "lucide-react-native";
import { tapHaptic, selectHaptic, confirmHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { LANGUAGES } from "@/lib/languages";

export function LanguageSelectionScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const selectedLanguage = useOnboardingStore(
    (s) => s.selectedTranscriptionLanguage,
  );
  const setSelectedTranscriptionLanguage = useOnboardingStore(
    (s) => s.setSelectedTranscriptionLanguage,
  );
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const playClickSound = useClickSound();

  const [query, setQuery] = useState("");

  const theme = THEME_COLORS[selectedTheme];
  const isDark = selectedTheme === "darkMode";

  const bgColors = theme.backgroundGradient;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  // Always show only the top 4 — whether default or search results
  const isSearching = query.trim().length > 0;
  const featuredLangs = LANGUAGES.slice(0, 4); // English, Spanish, French, Danish

  const handleSelect = (code: string) => {
    tapHaptic();
    setSelectedTranscriptionLanguage(code);
  };

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

  const accentColor = isDark ? "#A78BFA" : "#FFFFFF";
  const surfaceBg = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(255,255,255,0.18)";
  const selectedBgColor = isDark
    ? "rgba(163,139,250,0.22)"
    : "rgba(255,255,255,0.38)";
  const borderSel = isDark ? "rgba(163,139,250,0.6)" : "rgba(255,255,255,0.8)";

  // Shared language row renderer
  const renderLanguageRow = (lang: (typeof LANGUAGES)[0]) => {
    const isSelected = lang.code === selectedLanguage;
    return (
      <Pressable
        key={lang.code}
        onPress={() => handleSelect(lang.code)}
        style={({ pressed }) => ({
          backgroundColor: isSelected ? selectedBgColor : surfaceBg,
          borderRadius: 14,
          marginBottom: 8,
          borderWidth: 1.5,
          borderColor: isSelected ? borderSel : "transparent",
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 13,
          }}
        >
          <Text style={{ fontSize: 22, marginRight: 12, color: "#FFFFFF" }}>
            {lang.flag}
          </Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 14,
                color: "#FFFFFF",
                letterSpacing: 0.1,
              }}
            >
              {lang.name}
            </Text>
            {lang.native !== lang.name && (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 1,
                }}
              >
                {lang.native}
              </Text>
            )}
          </View>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              marginLeft: 10,
              backgroundColor: isSelected ? accentColor : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isSelected && (
              <Check
                size={13}
                color={isDark ? "#1A1A2E" : theme.primary}
                strokeWidth={3}
              />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: 90,
            paddingBottom: 8,
            paddingHorizontal: 24,
            alignItems: "center",
          }}
          pointerEvents="none"
        >
          <Animated.Text
            entering={FadeIn.delay(60).duration(500).easing(SOFT)}
            style={{
              fontFamily: "Fraunces_700Bold",
              fontSize: 30,
              color: "#FFFFFF",
              opacity: 0.92,
              letterSpacing: 0.2,
              textAlign: "center",
              lineHeight: 38,
            }}
          >
            Select your native tongue
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(120).duration(500).easing(SOFT)}
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "rgba(255,255,255,0.65)",
              marginTop: 3,
              letterSpacing: 0.1,
              textAlign: "center",
            }}
          >
            Select from {LANGUAGES.length} languages to use for your voice journaling
          </Animated.Text>
        </View>

        {/* Search bar */}
        <Animated.View
          entering={FadeIn.delay(160).duration(500).easing(SOFT)}
          style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: surfaceBg,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <Search size={15} color="rgba(255,255,255,0.55)" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search language…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={{
                flex: 1,
                marginLeft: 8,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: "#FFFFFF",
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </Animated.View>

        {/* Language list */}
        <Animated.View
          entering={FadeIn.delay(200).duration(500).easing(SOFT)}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 24,
            }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Language rows — always top 4 whether browsing or searching */}
            {(isSearching ? filtered.slice(0, 4) : featuredLangs).map(renderLanguageRow)}

            {isSearching && filtered.length === 0 && (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                  marginTop: 32,
                }}
              >
                No languages match "{query}"
              </Text>
            )}

            {/* Continue button — always at the bottom of the visible list */}
            <View style={{ marginTop: 4, marginBottom: 8 }}>
              <OnboardingCTAButton onPress={handleContinue} label="Continue" />
            </View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>

      {/* Progress bar + back button overlay */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="box-none"
      >
        <ProgressBar currentStep={currentStep} totalSteps={22} />
        <SafeAreaView pointerEvents="box-none">
          <BackButton onPress={handleBack} show={currentStep > 0} />
        </SafeAreaView>
      </View>
    </View>
  );
}
