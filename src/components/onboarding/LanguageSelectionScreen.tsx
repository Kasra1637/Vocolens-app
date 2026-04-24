/**
 * Onboarding Screen: Language Selection
 *
 * Lets the user pick their preferred language for voice transcription.
 * Presents all Deepgram Nova-2 supported languages in a searchable scrollable list.
 * Saves the choice to the onboarding store so every recording session uses it.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Check, Search } from 'lucide-react-native';
import { tapHaptic, selectHaptic, confirmHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { BackButton } from '@/components/onboarding/BackButton';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';
import { useClickSound } from '@/lib/hooks/useClickSound';

// All Deepgram Nova-2 supported languages
const LANGUAGES: { code: string; name: string; native: string; flag: string }[] = [
  { code: 'en',    name: 'English',             native: 'English',             flag: '🇺🇸' },
  { code: 'en-AU', name: 'English (Australia)',  native: 'English (Australia)', flag: '🇦🇺' },
  { code: 'en-GB', name: 'English (UK)',         native: 'English (UK)',        flag: '🇬🇧' },
  { code: 'en-IN', name: 'English (India)',      native: 'English (India)',     flag: '🇮🇳' },
  { code: 'en-NZ', name: 'English (New Zealand)',native: 'English (NZ)',        flag: '🇳🇿' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '普通话',              flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)',native: '繁體中文',             flag: '🇹🇼' },
  { code: 'da',    name: 'Danish',               native: 'Dansk',               flag: '🇩🇰' },
  { code: 'nl',    name: 'Dutch',                native: 'Nederlands',          flag: '🇳🇱' },
  { code: 'nl-BE', name: 'Flemish',              native: 'Vlaams',              flag: '🇧🇪' },
  { code: 'fi',    name: 'Finnish',              native: 'Suomi',               flag: '🇫🇮' },
  { code: 'fr',    name: 'French',               native: 'Français',            flag: '🇫🇷' },
  { code: 'de',    name: 'German',               native: 'Deutsch',             flag: '🇩🇪' },
  { code: 'el',    name: 'Greek',                native: 'Ελληνικά',            flag: '🇬🇷' },
  { code: 'hi',    name: 'Hindi',                native: 'हिन्दी',              flag: '🇮🇳' },
  { code: 'id',    name: 'Indonesian',           native: 'Bahasa Indonesia',    flag: '🇮🇩' },
  { code: 'it',    name: 'Italian',              native: 'Italiano',            flag: '🇮🇹' },
  { code: 'ja',    name: 'Japanese',             native: '日本語',               flag: '🇯🇵' },
  { code: 'ko',    name: 'Korean',               native: '한국어',               flag: '🇰🇷' },
  { code: 'lv',    name: 'Latvian',              native: 'Latviešu',            flag: '🇱🇻' },
  { code: 'lt',    name: 'Lithuanian',           native: 'Lietuvių',            flag: '🇱🇹' },
  { code: 'ms',    name: 'Malay',                native: 'Bahasa Melayu',       flag: '🇲🇾' },
  { code: 'no',    name: 'Norwegian',            native: 'Norsk',               flag: '🇳🇴' },
  { code: 'pl',    name: 'Polish',               native: 'Polski',              flag: '🇵🇱' },
  { code: 'pt',    name: 'Portuguese',           native: 'Português',           flag: '🇵🇹' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)',  native: 'Português (Brasil)',  flag: '🇧🇷' },
  { code: 'ro',    name: 'Romanian',             native: 'Română',              flag: '🇷🇴' },
  { code: 'ru',    name: 'Russian',              native: 'Русский',             flag: '🇷🇺' },
  { code: 'sk',    name: 'Slovak',               native: 'Slovenčina',          flag: '🇸🇰' },
  { code: 'es',    name: 'Spanish',              native: 'Español',             flag: '🇪🇸' },
  { code: 'es-419',name: 'Spanish (Latin America)',native: 'Español (Latinoamérica)',flag: '🌎' },
  { code: 'sv',    name: 'Swedish',              native: 'Svenska',             flag: '🇸🇪' },
  { code: 'ta',    name: 'Tamil',                native: 'தமிழ்',               flag: '🇱🇰' },
  { code: 'th',    name: 'Thai',                 native: 'ภาษาไทย',             flag: '🇹🇭' },
  { code: 'tr',    name: 'Turkish',              native: 'Türkçe',              flag: '🇹🇷' },
  { code: 'uk',    name: 'Ukrainian',            native: 'Українська',          flag: '🇺🇦' },
  { code: 'vi',    name: 'Vietnamese',           native: 'Tiếng Việt',          flag: '🇻🇳' },
];

export function LanguageSelectionScreen() {
  const selectedTheme                  = useOnboardingStore((s) => s.selectedTheme);
  const selectedLanguage               = useOnboardingStore((s) => s.selectedTranscriptionLanguage);
  const setSelectedTranscriptionLanguage = useOnboardingStore((s) => s.setSelectedTranscriptionLanguage);
  const nextStep                       = useOnboardingStore((s) => s.nextStep);
  const prevStep                       = useOnboardingStore((s) => s.prevStep);
  const currentStep                    = useOnboardingStore((s) => s.currentStep);
  const playClickSound                 = useClickSound();

  const [query, setQuery] = useState('');

  const theme = THEME_COLORS[selectedTheme];
  const isDark = selectedTheme === 'darkMode';

  const bgColors = theme.backgroundGradient;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [query]);

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

  const accentColor = isDark ? '#A78BFA' : '#FFFFFF';
  const surfaceBg   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.18)';
  const selectedBg  = isDark ? 'rgba(163,139,250,0.22)' : 'rgba(255,255,255,0.38)';
  const borderSel   = isDark ? 'rgba(163,139,250,0.6)'  : 'rgba(255,255,255,0.8)';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{ paddingTop: 90, paddingBottom: 8, alignItems: 'center' }} pointerEvents="none">
          <Animated.Text
            entering={FadeInDown.delay(60).duration(500)}
            style={{
              fontFamily: 'Comfortaa_700Bold',
              fontSize: 22,
              color: '#FFFFFF',
              opacity: 0.92,
              letterSpacing: 0.2,
            }}
          >
            Select your native tongue
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(120).duration(500)}
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
              marginTop: 3,
              letterSpacing: 0.1,
            }}
          >
            Used for all voice recordings
          </Animated.Text>
        </View>

        {/* Search bar */}
        <Animated.View
          entering={FadeInDown.delay(160).duration(500)}
          style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: surfaceBg,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
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
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: '#FFFFFF',
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </Animated.View>

        {/* Language list */}
        <Animated.View entering={FadeInDown.delay(220).duration(500)} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}
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
                    borderColor: isSelected ? borderSel : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                    }}
                  >
                    {/* Flag */}
                    <Text style={{ fontSize: 22, marginRight: 12, color: '#FFFFFF' }}>{lang.flag}</Text>

                    {/* Names */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontFamily: 'Inter_700Bold',
                          fontSize: 14,
                          color: '#FFFFFF',
                          letterSpacing: 0.1,
                        }}
                      >
                        {lang.name}
                      </Text>
                      {lang.native !== lang.name && (
                        <Text
                          style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.6)',
                            marginTop: 1,
                          }}
                        >
                          {lang.native}
                        </Text>
                      )}
                    </View>

                    {/* Checkmark — always reserve space so layout doesn't shift */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        marginLeft: 10,
                        backgroundColor: isSelected ? accentColor : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <Check size={13} color={isDark ? '#1A1A2E' : theme.primary} strokeWidth={3} />
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {filtered.length === 0 && (
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center',
                  marginTop: 32,
                }}
              >
                No languages match "{query}"
              </Text>
            )}
          </ScrollView>
        </Animated.View>

        {/* Continue button */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(500)}
          style={{ paddingHorizontal: 24, paddingBottom: 48, paddingTop: 8 }}
        >
          <OnboardingCTAButton onPress={handleContinue} label="Continue" />
        </Animated.View>
      </LinearGradient>

      {/* Progress bar + back button overlay */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <ProgressBar currentStep={currentStep} totalSteps={14} />
        <SafeAreaView pointerEvents="box-none">
          <BackButton onPress={handleBack} show={currentStep > 0} />
        </SafeAreaView>
      </View>
    </View>
  );
}
