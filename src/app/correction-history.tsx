import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, CheckCircle2, RefreshCw, Download } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useEmotionCorrectionStore } from '@/lib/state/emotion-correction-store';
import { getThemeColors, getThemeGradients } from '@/lib/theme';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { tapHaptic, successHaptic } from '@/lib/haptics';

export default function CorrectionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);

  const { corrections, userBias, getConfirmationRate, getPersonalizationStrength } = useEmotionCorrectionStore();
  const confirmationRate = getConfirmationRate();
  const personalizationStrength = getPersonalizationStrength();

  // Top delta: most frequent correction pattern
  const topPattern = userBias.patterns[0];

  const handleBack = () => {
    tapHaptic();
    router.back();
  };

  const handleExportCSV = async () => {
    successHaptic();
    const headers = 'timestamp,aiEmotion,userEmotion,aiValence,userValence,aiArousal,userArousal,reason,correctionMode\n';
    const rows = corrections
      .map((c) =>
        [
          c.timestamp,
          c.aiEmotion,
          c.userEmotion,
          c.aiValence,
          c.userValence,
          c.aiArousal,
          c.userArousal,
          c.reason ? `"${c.reason.replace(/"/g, '""')}"` : '',
          c.correctionMode,
        ].join(',')
      )
      .join('\n');

    const csv = headers + rows;

    try {
      await Share.share({
        message: csv,
        title: 'Vocolens Correction History',
      });
    } catch (err) {
      Alert.alert('Export failed', 'Could not share CSV.');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={handleBack}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 18 }}>
          My Feedback
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            {/* Confirmation Rate */}
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <CheckCircle2 size={20} color="#22C55E" strokeWidth={2} />
              <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 24, marginTop: 8 }}>
                {Math.round(confirmationRate * 100)}%
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                AI confirmation rate
              </Text>
            </View>

            {/* Personalization Strength */}
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <TrendingUp size={20} color={Colors.primary} strokeWidth={2} />
              <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 24, marginTop: 8 }}>
                {Math.round(personalizationStrength * 100)}%
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                Personalization
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Top Delta */}
        {topPattern && (
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                Top pattern
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Inter_400Regular', color: '#FFFFFF', fontSize: 16, textTransform: 'capitalize' }}>
                  {topPattern.aiLabel}
                </Text>
                <RefreshCw size={16} color={Colors.primary} style={{ marginHorizontal: 12 }} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 16, textTransform: 'capitalize' }}>
                  {topPattern.actualLabel}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 }}>
                {topPattern.occurrences} times · {Math.round(topPattern.confidence * 100)}% confidence
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Recent Corrections List */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 16, marginBottom: 12 }}>
            Recent feedback
          </Text>

          {corrections.length === 0 ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' }}>
                No feedback yet. Confirm or adjust emotions after recording to build your personalized model.
              </Text>
            </View>
          ) : (
            corrections.slice(0, 20).map((c, i) => {
              const isConfirmation = c.aiEmotion === c.userEmotion && c.aiValence === c.userValence;
              return (
                <View
                  key={c.id}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {isConfirmation ? (
                        <CheckCircle2 size={14} color="#22C55E" />
                      ) : (
                        <RefreshCw size={14} color="#EAB308" />
                      )}
                      <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 13, marginLeft: 6, textTransform: 'capitalize' }}>
                        {isConfirmation ? 'Confirmed' : 'Adjusted'} {c.aiEmotion}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                      {formatDate(c.timestamp)}
                    </Text>
                  </View>
                  {!isConfirmation && (
                    <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>
                      → {c.userEmotion} · V: {c.aiValence}→{c.userValence} · A: {c.aiArousal}→{c.userArousal}
                    </Text>
                  )}
                  {c.reason && (
                    <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                      "{c.reason}"
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </Animated.View>

        {/* Export Button */}
        {corrections.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ marginTop: 12 }}>
            <Pressable
              onPress={handleExportCSV}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.25)',
              }}
            >
              <Download size={16} color="#FFFFFF" />
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 14, marginLeft: 8 }}>
                Export feedback as CSV
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
