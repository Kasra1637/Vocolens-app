/**
 * LanguagePickerModal
 *
 * Full-screen modal for selecting the voice transcription language.
 * Presented via a route (not a component prop) so it can be triggered
 * from anywhere in the app (e.g. recording screen header button).
 * Uses the same language list and selection UX as onboarding.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { X, Search, Globe } from "lucide-react-native";
import { router } from "expo-router";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { getThemeGradients } from "@/lib/theme";
import { hexToRgba, GlassLayers } from "@/lib/glass";
import { LANGUAGES } from "@/lib/languages";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LanguagePickerModal() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = THEME_COLORS[selectedTheme];
  const primaryColor = theme.primary;
  const selectedLanguage = useOnboardingStore(
    (s) => s.selectedTranscriptionLanguage,
  );
  const setSelectedTranscriptionLanguage = useOnboardingStore(
    (s) => s.setSelectedTranscriptionLanguage,
  );
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);

  const [query, setQuery] = useState("");

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

  const handleSelect = (code: string) => {
    tapHaptic();
    setSelectedTranscriptionLanguage(code);
  };

  const handleDone = () => {
    successHaptic();
    router.back();
  };

  const accentColor = "#FFFFFF";
  const surfaceBg = hexToRgba(primaryColor, 0.1);
  const selectedBg = hexToRgba(primaryColor, 0.22);
  const borderSel = hexToRgba(primaryColor, 0.55);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={Gradients.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <SafeAreaView edges={["top"]} style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 16,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Globe size={20} color="#FFFFFF" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  fontSize: 20,
                  color: "#FFFFFF",
                }}
              >
                Recording Language
              </Text>
            </View>
            <Pressable
              onPress={handleDone}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: hexToRgba(primaryColor, 0.15),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 14,
            }}
          >
            Used for all voice recordings
          </Text>

          {/* Search bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: hexToRgba(primaryColor, 0.1),
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: hexToRgba(primaryColor, 0.15),
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <GlassLayers primaryColor={primaryColor} borderRadius={14} />
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
        </SafeAreaView>

        {/* Language list */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.map((lang) => {
            const isSelected = lang.code === selectedLanguage;
            return (
              <Pressable
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                style={({ pressed }) => ({
                  backgroundColor: isSelected ? selectedBg : surfaceBg,
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
                  <Text
                    style={{ fontSize: 22, marginRight: 12, color: "#FFFFFF" }}
                  >
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
                      <Text style={{ fontSize: 13, color: "#1A1A2E" }}>✓</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}

          {filtered.length === 0 && (
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
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
