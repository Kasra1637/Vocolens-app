import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { tapHaptic, warningHaptic, errorHaptic } from '@/lib/haptics';
import { TriangleAlert as AlertTriangle, ChevronLeft, RotateCcw } from 'lucide-react-native';
import useJournalStore from '@/lib/state/journal-store';
import useUserStatsStore from '@/lib/state/user-stats-store';
import useBadgesStore from '@/lib/state/badges-store';
import { useAuthStore } from '@/lib/state/auth-store';
import { removePin } from '@/lib/auth-service';
import { PinEntryModal } from '@/components/PinEntryModal';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors, getThemeGradients, BorderRadius } from '@/lib/theme';

export default function PrivacySettingsScreen() {
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeColors = getThemeColors(selectedTheme, isDarkMode);
  const themeGradients = getThemeGradients(selectedTheme, isDarkMode);

  const clearAllEntries = useJournalStore((s) => s.clearAllEntries);
  const resetStats = useUserStatsStore((s) => s.resetStats);
  const resetBadges = useBadgesStore((s) => s.resetBadges);
  const resetSettings = useSettingsStore((s) => s.resetSettings);
  const logout = useAuthStore((s) => s.logout);
  const setPinSetup = useAuthStore((s) => s.setPinSetup);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  const handleResetRequest = () => {
    warningHaptic();
    setShowPinVerify(true);
  };

  const handlePinVerified = () => {
    setShowPinVerify(false);
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    try {
      warningHaptic();
      clearAllEntries();
      resetStats();
      resetBadges();
      resetSettings();
      await removePin();
      logout();
      setPinSetup(false);
      resetOnboarding();
      setShowResetConfirm(false);
      router.replace('/(tabs)');
    } catch (error) {
      errorHaptic();
      setShowResetConfirm(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <LinearGradient
        colors={themeGradients.background}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <View className="px-6 pt-2 pb-4">
          <View className="flex-row items-center justify-center" style={{ minHeight: 44 }}>
            <Pressable
              onPress={() => { tapHaptic(); router.back(); }}
              className="absolute left-0 active:opacity-60"
              style={{ padding: 4 }}
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </Pressable>
            <View className="items-center">
              <Text style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 22, color: '#FFFFFF' }}>
                Privacy & Security
              </Text>
              <Text
                style={{
                  fontFamily: 'Comfortaa_400Regular',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 2,
                }}
              >
                Reset & data management
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section Label */}
          <Animated.View entering={FadeInDown.delay(40).duration(500)} className="mb-3">
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: 'rgba(239,68,68,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={16} color="#EF4444" strokeWidth={2.5} />
              </View>
              <Text
                style={{
                  fontFamily: 'Comfortaa_700Bold',
                  fontSize: 13,
                  color: '#EF4444',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Danger Zone
              </Text>
            </View>
          </Animated.View>

          {/* Reset All Data Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.3)',
                borderRadius: BorderRadius.xlarge,
              }}
            >
              {/* Red top band */}
              <View
                style={{
                  height: 3,
                  backgroundColor: '#EF4444',
                  opacity: 0.7,
                  borderTopLeftRadius: BorderRadius.xlarge,
                  borderTopRightRadius: BorderRadius.xlarge,
                }}
              />

              <View className="p-5">
                {/* Card header */}
                <View className="flex-row items-center mb-4">
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: 'rgba(239,68,68,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(239,68,68,0.25)',
                    }}
                  >
                    <RotateCcw size={22} color="#EF4444" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 17, color: '#FFFFFF' }}
                    >
                      Reset All App Data
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Comfortaa_400Regular',
                        fontSize: 12,
                        color: 'rgba(239,68,68,0.85)',
                        marginTop: 2,
                      }}
                    >
                      Irreversible action
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontFamily: 'Comfortaa_400Regular',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 21,
                    marginBottom: 16,
                  }}
                >
                  This will permanently erase everything and return the app to its initial state. The following will be deleted:
                </Text>

                {[
                  'All journal entries & audio',
                  'Statistics and streaks',
                  'Badges and achievements',
                  'PIN and security settings',
                  'App preferences and theme',
                ].map((item, i) => (
                  <View key={i} className="flex-row items-center mb-2" style={{ gap: 10 }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#EF4444',
                        opacity: 0.8,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: 'Comfortaa_400Regular',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {item}
                    </Text>
                  </View>
                ))}

                <Pressable
                  onPress={handleResetRequest}
                  className="active:opacity-70 mt-5"
                  style={{
                    backgroundColor: '#EF4444',
                    borderRadius: BorderRadius.medium,
                    paddingVertical: 14,
                    alignItems: 'center',
                    shadowColor: '#EF4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  <Text
                    style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 15, color: '#FFFFFF' }}
                  >
                    Reset All Data
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Info note */}
          <Animated.View entering={FadeInDown.delay(180).duration(500)} className="mt-5">
            <Text
              style={{
                fontFamily: 'Comfortaa_400Regular',
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                textAlign: 'center',
                lineHeight: 18,
              }}
            >
              You will be asked to verify your PIN before resetting.{'\n'}
              This action cannot be undone.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <View
            style={{
              backgroundColor: themeColors.surface,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.4)',
              borderRadius: BorderRadius.xxlarge,
              padding: 24,
              width: '100%',
              maxWidth: 360,
            }}
          >
            <View className="items-center mb-4">
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
              >
                <AlertTriangle size={30} color="#EF4444" strokeWidth={2} />
              </View>
            </View>

            <Text
              style={{
                fontFamily: 'Comfortaa_700Bold',
                fontSize: 20,
                color: '#FCA5A5',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              Reset Everything?
            </Text>
            <Text
              style={{
                fontFamily: 'Comfortaa_400Regular',
                fontSize: 14,
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 22,
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              All your entries, stats, badges, PIN, and settings will be permanently erased. You will start completely fresh. This cannot be undone.
            </Text>
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={confirmReset}
                className="active:opacity-70"
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: BorderRadius.medium,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 15, color: '#FFFFFF' }}
                >
                  Yes, Reset Everything
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowResetConfirm(false)}
                className="active:opacity-70"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  borderRadius: BorderRadius.medium,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Comfortaa_600SemiBold',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Verification Modal */}
      <PinEntryModal
        visible={showPinVerify}
        onSuccess={handlePinVerified}
        onDismiss={() => setShowPinVerify(false)}
      />
    </View>
  );
}
