/**
 * Privacy Settings Screen
 *
 * Allows users to:
 * - Export their journal data
 * - Delete all entries
 * - Delete their account
 * - Change PIN
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { tapHaptic, successHaptic, errorHaptic, warningHaptic } from '@/lib/haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Download, Trash2, ChevronLeft, AlertCircle } from 'lucide-react-native';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState<boolean>(false);
  const [showPinVerify, setShowPinVerify] = useState<boolean>(false);
  const [deleteAction, setDeleteAction] = useState<'entries' | 'account' | null>(null);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeColors = getThemeColors(selectedTheme, isDarkMode);
  const themeGradients = getThemeGradients(selectedTheme, isDarkMode);

  const clearAllEntries = useJournalStore((s) => s.clearAllEntries);
  const entries = useJournalStore((s) => s.entries);
  const resetStats = useUserStatsStore((s) => s.resetStats);
  const stats = useUserStatsStore((s) => s.stats);
  const resetBadges = useBadgesStore((s) => s.resetBadges);
  const getAllBadges = useBadgesStore((s) => s.getAllBadges);
  const logout = useAuthStore((s) => s.logout);
  const setPinSetup = useAuthStore((s) => s.setPinSetup);

  const handleExportData = async () => {
    try {
      tapHaptic();

      const exportStats = {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        totalEntries: stats.totalEntries,
        averageMood: stats.averageMood,
        lastEntryDate: stats.lastEntryDate,
      };
      const badges = getAllBadges();

      const exportData = {
        exportDate: new Date().toISOString(),
        entries,
        stats: exportStats,
        badges,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `journal_export_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Journal Data',
        });
        successHaptic();
      } else {
        Alert.alert('Success', `Data exported to: ${fileName}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
      errorHaptic();
    }
  };

  const handleDeleteEntries = () => {
    setDeleteAction('entries');
    setShowPinVerify(true);
  };

  const handleDeleteAccount = () => {
    setDeleteAction('account');
    setShowPinVerify(true);
  };

  const handlePinVerified = () => {
    setShowPinVerify(false);
    if (deleteAction === 'entries') {
      setShowDeleteConfirm(true);
    } else if (deleteAction === 'account') {
      setShowDeleteAccountConfirm(true);
    }
  };

  const confirmDeleteEntries = async () => {
    try {
      warningHaptic();
      clearAllEntries();
      resetStats();
      setShowDeleteConfirm(false);
      Alert.alert('Success', 'All journal entries have been deleted');
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete entries');
      errorHaptic();
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      warningHaptic();
      clearAllEntries();
      resetStats();
      resetBadges();
      await removePin();
      logout();
      setPinSetup(false);
      setShowDeleteAccountConfirm(false);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Error', 'Failed to delete account');
      errorHaptic();
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      {/* Full-screen gradient background */}
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
              onPress={() => {
                tapHaptic();
                router.back();
              }}
              className="absolute left-0 active:opacity-60"
              style={{ padding: 4 }}
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </Pressable>
            <View className="items-center">
              <Text
                style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 22, color: '#FFFFFF' }}
              >
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
                Manage your data
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Export Data */}
          <Animated.View entering={FadeInDown.delay(60).duration(500)} className="mb-4">
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: BorderRadius.xlarge,
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: BorderRadius.medium,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Download size={20} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text
                    style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 17, color: '#FFFFFF', flex: 1 }}
                  >
                    Export Your Data
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'Comfortaa_400Regular',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 20,
                    marginBottom: 16,
                  }}
                >
                  Download all your journal entries, statistics, and achievements as a JSON file.
                </Text>
                <Pressable
                  onPress={handleExportData}
                  className="active:opacity-70"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: BorderRadius.medium,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Comfortaa_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                    Export Data
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Delete All Entries */}
          <Animated.View entering={FadeInDown.delay(120).duration(500)} className="mb-4">
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: BorderRadius.xlarge,
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: BorderRadius.medium,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text
                    style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 17, color: '#FFFFFF', flex: 1 }}
                  >
                    Delete All Entries
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'Comfortaa_400Regular',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 20,
                    marginBottom: 16,
                  }}
                >
                  Permanently delete all your journal entries and reset your statistics. Your account and PIN will remain active.
                </Text>
                <Pressable
                  onPress={handleDeleteEntries}
                  className="active:opacity-70"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: BorderRadius.medium,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Comfortaa_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                    Delete All Entries
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Delete Account */}
          <Animated.View entering={FadeInDown.delay(180).duration(500)}>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: BorderRadius.xlarge,
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: BorderRadius.medium,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    <AlertCircle size={20} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text
                    style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 17, color: '#FFFFFF', flex: 1 }}
                  >
                    Delete Account
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'Comfortaa_400Regular',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 20,
                    marginBottom: 16,
                  }}
                >
                  Permanently delete your account, all entries, statistics, achievements, and security settings. This action cannot be undone.
                </Text>
                <Pressable
                  onPress={handleDeleteAccount}
                  className="active:opacity-70"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: BorderRadius.medium,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Comfortaa_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                    Delete Account
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Delete Entries Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <View
            style={{
              backgroundColor: themeColors.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              borderRadius: BorderRadius.xxlarge,
              padding: 24,
              width: '100%',
              maxWidth: 360,
            }}
          >
            <Text
              style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 20, color: '#FFFFFF', marginBottom: 10 }}
            >
              Delete All Entries?
            </Text>
            <Text
              style={{
                fontFamily: 'Comfortaa_400Regular',
                fontSize: 14,
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              This will permanently delete all your journal entries and reset your statistics. Your account will remain active. This action cannot be undone.
            </Text>
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={confirmDeleteEntries}
                className="active:opacity-70"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.4)',
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.6)',
                  borderRadius: BorderRadius.medium,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Comfortaa_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                  Delete All Entries
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
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
                <Text style={{ fontFamily: 'Comfortaa_600SemiBold', fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteAccountConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteAccountConfirm(false)}
      >
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <View
            style={{
              backgroundColor: themeColors.surface,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.35)',
              borderRadius: BorderRadius.xxlarge,
              padding: 24,
              width: '100%',
              maxWidth: 360,
            }}
          >
            <Text
              style={{ fontFamily: 'Comfortaa_700Bold', fontSize: 20, color: '#FCA5A5', marginBottom: 10 }}
            >
              Delete Account?
            </Text>
            <Text
              style={{
                fontFamily: 'Comfortaa_400Regular',
                fontSize: 14,
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              This will permanently delete your account, all entries, statistics, achievements, and security settings. You will need to set up a new PIN to use the app again. This action cannot be undone.
            </Text>
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={confirmDeleteAccount}
                className="active:opacity-70"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.4)',
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.6)',
                  borderRadius: BorderRadius.medium,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Comfortaa_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                  Delete Everything
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowDeleteAccountConfirm(false)}
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
                <Text style={{ fontFamily: 'Comfortaa_600SemiBold', fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>
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
