/**
 * Privacy Settings Screen — "Manage Your Data"
 *
 * Allows users to:
 * - Export their journal data
 * - Delete all entries
 * - Delete their account
 *
 * Design: rebuilt to match the app-wide glassmorphic card system used on the
 * Settings tab (surfaceBg/borderColor glass cards, circular duotone icon chips
 * with a diagonal highlight gradient, phosphor-react-native icons) instead of
 * the older lucide + tinted-primary-color look this screen used to have.
 *
 * PIN gate: Delete All Entries and Delete Account are gated behind the same
 * full-screen PinEntryScreen ("Enter Your PIN") used by the Settings tab's
 * Change PIN flow, so the "enter your PIN" moment looks identical everywhere
 * in the app — including the create/confirm dot-and-keypad treatment.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  tapHaptic,
  successHaptic,
  errorHaptic,
  warningHaptic,
} from "@/lib/haptics";
import * as Sharing from "expo-sharing";
// Legacy API: this file uses `documentDirectory` and `writeAsStringAsync`, which
// only exist on the legacy surface. The new expo-file-system API exposes neither,
// so importing "expo-file-system" here made `documentDirectory` undefined and
// broke the data export entirely. Every other FileSystem consumer in the app
// also imports from /legacy — keep them consistent.
import * as FileSystem from "expo-file-system/legacy";
import { CaretLeft, DownloadSimple, Trash, Warning } from "phosphor-react-native";
import useJournalStore from "@/lib/state/journal-store";
import useUserStatsStore from "@/lib/state/user-stats-store";
import useBadgesStore from "@/lib/state/badges-store";
import { calculateAverageMood } from "@/lib/analytics";
import { deleteAllAudioFiles } from "@/lib/journal-service";
import { deleteUsageOnServer } from "@/lib/api/usage-service";
import { useAuthStore } from "@/lib/state/auth-store";
import { removePin } from "@/lib/auth-service";
import { clearAICache } from "@/lib/ai-emotional-intelligence";
import { PinEntryScreen } from "@/components/PinEntryScreen";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BrandedAlert } from "@/components/BrandedAlert";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import useBiometricStore from "@/lib/state/biometric-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import { getThemeColors, getThemeGradients } from "@/lib/theme";

// ── Shared glass tokens — exact match to the Settings tab's card system ──────
const surfaceBg = "rgba(255, 255, 255, 0.14)";
const borderColor = "rgba(255, 255, 255, 0.25)";
const destructiveBorderColor = "rgba(239, 68, 68, 0.35)";

export default function PrivacySettingsScreen() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] =
    useState<boolean>(false);
  const [showPinVerify, setShowPinVerify] = useState<boolean>(false);
  const [deleteAction, setDeleteAction] = useState<
    "entries" | "account" | null
  >(null);
  const [alert, setAlert] = useState<{ type: "success" | "error" | "warning"; title: string; message: string } | null>(null);

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
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const disableBiometric = useBiometricStore((s) => s.disableBiometric);
  const disablePin = useBiometricStore((s) => s.disablePin);
  const clearSubscription = useSubscriptionStore((s) => s.clearSubscription);
  const clearCorrections = useEmotionCorrectionStore((s) => s.clearCorrections);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const handleExportData = async () => {
    try {
      tapHaptic();

      const exportStats = {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        totalEntries: stats.totalEntries,
        averageMood: calculateAverageMood(entries),
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
      const fileName = `journal_export_${new Date().toISOString().split("T")[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export Journal Data",
        });
        successHaptic();
      } else {
        setAlert({ type: "success", title: "Success", message: `Data exported to: ${fileName}` });
      }
    } catch (error) {
      console.error("Export error:", error);
      setAlert({ type: "error", title: "Error", message: "Failed to export data" });
      errorHaptic();
    }
  };

  const handleDeleteEntries = () => {
    tapHaptic();
    setDeleteAction("entries");
    setShowPinVerify(true);
  };

  const handleDeleteAccount = () => {
    tapHaptic();
    setDeleteAction("account");
    setShowPinVerify(true);
  };

  const handlePinVerified = () => {
    setShowPinVerify(false);
    if (deleteAction === "entries") {
      setShowDeleteConfirm(true);
    } else if (deleteAction === "account") {
      setShowDeleteAccountConfirm(true);
    }
  };

  const confirmDeleteEntries = async () => {
    try {
      warningHaptic();
      await deleteAllAudioFiles();
      clearAllEntries();
      resetStats();
      // The cached AI analysis is derived from these entries and quotes them,
      // so it must not outlive them.
      await clearAICache();
      setShowDeleteConfirm(false);
      setAlert({ type: "success", title: "Success", message: "All journal entries have been deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      setAlert({ type: "error", title: "Error", message: "Failed to delete entries" });
      errorHaptic();
    }
  };

  // Deletes ALL local app state so the app returns to a genuinely fresh
  // install — matching what the confirmation dialog promises ("your account,
  // all entries, statistics, achievements, and security settings").
  //
  // Previously this only cleared entries/stats/badges/AI cache/PIN, leaving
  // onboarding data (name, theme, mood/goal answers), biometric/PIN-lock
  // toggles, the local subscription flag, and emotion-correction history all
  // intact — so a user who "deleted everything" would be dropped straight
  // back onto the main dashboard, still apparently subscribed and still
  // recognised by name, instead of seeing the welcome/onboarding flow.
  //
  // Note on the subscription flag specifically: clearing it does NOT cancel
  // any real Google Play / App Store billing subscription — that can only be
  // cancelled by the user directly in the Play Store / App Store, and this
  // action never touches that. It only resets this device's local cache of
  // "premium is currently unlocked". If the user's real subscription is still
  // active, AuthGate's normal Adapty re-verification on next launch will
  // simply confirm that and restore premium access automatically — clearing
  // the flag here does not lock out a still-paying subscriber, it just
  // ensures "delete account" doesn't leave a stale local flag behind.
  const confirmDeleteAccount = async () => {
    try {
      warningHaptic();
      await deleteAllAudioFiles();
      // Erase the server-side usage record too, so account deletion is honoured
      // on the backend and not just on-device. Never throws (best-effort): if
      // it fails, the anonymous, ephemeral row is left behind but a fresh
      // install already starts a new bucket — local deletion must still proceed.
      await deleteUsageOnServer();
      clearAllEntries();
      resetStats();
      resetBadges();
      await clearAICache();
      await removePin();
      clearCorrections();
      clearSubscription();
      disableBiometric();
      disablePin();
      resetOnboarding();
      // Return app preferences (dark mode, notifications, reminder time,
      // reflection mode) to their defaults too — otherwise a "fresh install"
      // delete would leave the previous user's settings behind.
      resetSettings();
      logout();
      setPinSetup(false);
      setShowDeleteAccountConfirm(false);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Delete account error:", error);
      setAlert({ type: "error", title: "Error", message: "Failed to delete account" });
      errorHaptic();
    }
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: themeColors.background }}
    >
      {/* Full-screen gradient background */}
      <LinearGradient
        colors={themeGradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header — small glass back button + centered title, matching the
            rest of the app's secondary screens (e.g. My Feedback History). */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255, 255, 255, 0.12)",
          }}
        >
          <Pressable
            onPress={() => {
              tapHaptic();
              router.back();
            }}
            className="active:opacity-70"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.20)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CaretLeft size={20} color="#FFFFFF" weight="regular" />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "Fraunces_700Bold",
                fontSize: 18,
                color: "#FFFFFF",
              }}
            >
              Privacy & Security
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "rgba(255,255,255,0.55)",
                marginTop: 2,
              }}
            >
              Manage your data
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Export Data */}
          <Animated.View
            entering={FadeInDown.delay(60).duration(500)}
            className="mb-4"
          >
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: surfaceBg,
                borderWidth: 2,
                borderColor: borderColor,
              }}
            >
              {/* Section header */}
              <View
                className="flex-row items-center px-5 pt-5 pb-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  className="mr-3"
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                  />
                  <DownloadSimple size={24} color="#FFFFFF" weight="regular" />
                </View>
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                >
                  Export Your Data
                </Text>
              </View>

              <View className="p-5">
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 21,
                    marginBottom: 18,
                  }}
                >
                  Download all your journal entries, statistics, and
                  achievements as a JSON file.
                </Text>
                <Pressable
                  data-testid="export-data-button"
                  onPress={handleExportData}
                  className="active:opacity-70"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.18)",
                    borderWidth: 1.5,
                    borderColor: "rgba(255, 255, 255, 0.35)",
                    borderRadius: 999,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      color: "#FFFFFF",
                    }}
                  >
                    Export data
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Delete All Entries */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(500)}
            className="mb-4"
          >
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: surfaceBg,
                borderWidth: 2,
                borderColor: destructiveBorderColor,
              }}
            >
              {/* Section header */}
              <View
                className="flex-row items-center px-5 pt-5 pb-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  className="mr-3"
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                  />
                  <Trash size={24} color="#FFFFFF" weight="regular" />
                </View>
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                >
                  Delete All Entries
                </Text>
              </View>

              <View className="p-5">
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 21,
                    marginBottom: 18,
                  }}
                >
                  Permanently delete all your journal entries and reset your
                  statistics. Your account and PIN will remain active.
                </Text>
                <Pressable
                  data-testid="delete-entries-button"
                  onPress={handleDeleteEntries}
                  className="active:opacity-80"
                  style={{
                    width: "100%",
                    borderRadius: 50,
                    borderWidth: 2,
                    borderColor: "#EF4444",
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: Platform.OS === "android" ? 0 : 8,
                  }}
                  android_ripple={{ color: "rgba(255,255,255,0.2)" }}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "Inter_700Bold",
                        fontSize: 16,
                      }}
                    >
                      Delete all entries
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Delete Account */}
          <Animated.View entering={FadeInDown.delay(180).duration(500)}>
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: surfaceBg,
                borderWidth: 2,
                borderColor: destructiveBorderColor,
              }}
            >
              {/* Section header */}
              <View
                className="flex-row items-center px-5 pt-5 pb-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  className="mr-3"
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                  />
                  <Warning size={24} color="#FFFFFF" weight="regular" />
                </View>
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                >
                  Delete Account
                </Text>
              </View>

              <View className="p-5">
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 21,
                    marginBottom: 18,
                  }}
                >
                  Permanently delete your account, all entries, statistics,
                  achievements, and security settings. This action cannot be
                  undone.
                </Text>
                <Pressable
                  data-testid="delete-account-button"
                  onPress={handleDeleteAccount}
                  className="active:opacity-80"
                  style={{
                    width: "100%",
                    borderRadius: 50,
                    borderWidth: 2,
                    borderColor: "#EF4444",
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: Platform.OS === "android" ? 0 : 8,
                  }}
                  android_ripple={{ color: "rgba(255,255,255,0.2)" }}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "Inter_700Bold",
                        fontSize: 16,
                      }}
                    >
                      Delete account
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Delete Entries Confirmation — canonical ConfirmDialog, same
          component/style used for Settings' "Reset all data". Severe because
          this is genuinely permanent data loss. */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        icon="trash"
        destructiveness="severe"
        title="Delete all entries?"
        message="This will permanently delete all your journal entries and reset your statistics. Your account will remain active. This action cannot be undone."
        confirmLabel="Delete all entries"
        onConfirm={confirmDeleteEntries}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Delete Account Confirmation — canonical ConfirmDialog. */}
      <ConfirmDialog
        visible={showDeleteAccountConfirm}
        icon="warning"
        destructiveness="severe"
        title="Delete account?"
        message={`This will permanently delete your account, all entries, statistics, achievements, and security settings, and reset the app to a fresh install. You will need to set up a new PIN to use the app again. This action cannot be undone.\n\nThis does not cancel an active ${Platform.OS === "ios" ? "App Store" : "Google Play"} subscription — manage or cancel that separately in the ${Platform.OS === "ios" ? "App Store" : "Play Store"}.`}
        confirmLabel="Delete everything"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteAccountConfirm(false)}
      />

      <BrandedAlert
        visible={alert !== null}
        type={alert?.type ?? "success"}
        title={alert?.title ?? ""}
        message={alert?.message ?? ""}
        onClose={() => setAlert(null)}
      />

      {/* PIN Verification — the exact same full-screen PinEntryScreen used by
          Settings > Change PIN, so "Enter Your PIN" looks identical wherever
          it appears in the app (icon circle, Fraunces heading, animated dot
          row, circular PinKeypad). */}
      <Modal
        visible={showPinVerify}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowPinVerify(false)}
      >
        <View style={{ flex: 1 }}>
          <PinEntryScreen
            mode="verify"
            title="Enter Your PIN"
            subtitle="Confirm your PIN to continue."
            onSuccess={handlePinVerified}
            onBack={() => setShowPinVerify(false)}
          />
        </View>
      </Modal>
    </View>
  );
}
