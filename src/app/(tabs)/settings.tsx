/**
 * Settings Screen
 * Customizable settings menu for theme, notifications, dark mode, PIN, time, and sign out
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
  Linking,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Palette, Bell, LogOut, Check, X, Shield, ChevronRight, Brain, ChartBar as BarChart3, TriangleAlert as AlertTriangle, Trash2, Download, Globe, Crown, RefreshCw, ExternalLink, KeyRound, Heart, Clock } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ExportJournalModal } from "@/components/ExportJournalModal";
import Animated from "react-native-reanimated";
import {
  TAB_ENTER_1 as ENTER_1,
  TAB_ENTER_2 as ENTER_2,
  TAB_ENTER_3 as ENTER_3,
  TAB_ENTER_4 as ENTER_4,
  TAB_ENTER_5 as ENTER_5,
  TAB_ENTER_6 as ENTER_6,
} from "@/lib/tabAnimations";
import {
  selectHaptic,
  tapHaptic,
  confirmHaptic,
  warningHaptic,
  successHaptic,
  errorHaptic,
} from "@/lib/haptics";
import { router, useIsFocused } from "expo-router";
import useOnboardingStore, {
  ThemeColorType,
  THEME_COLORS,
} from "@/lib/state/onboarding-store";
import useSettingsStore, {
  EmotionReflectionMode,
} from "@/lib/state/settings-store";
import {
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from "@/lib/theme";
import { ThemedSwitch } from "@/components/ThemedSwitch";
import { NotificationService } from "@/lib/services/notification-service";
import { BrandedAlert } from "@/components/BrandedAlert";
import {
  useUsageMinutes,
  useRemainingMinutes,
  USAGE_LIMIT_MINUTES,
} from "@/lib/state/user-stats-store";
import useUserStatsStore from "@/lib/state/user-stats-store";
import useJournalStore from "@/lib/state/journal-store";
import useBadgesStore from "@/lib/state/badges-store";
import usePinStore from "@/lib/state/pin-store";
import useBiometricStore from "@/lib/state/biometric-store";
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import {
  restorePurchases,
  hasAccessLevel,
} from "@/lib/adaptyClient";
import { removePin, changePin } from "@/lib/auth-service";
import { hexToRgba } from "@/lib/glass";
import { PinEntryScreen, type PinEntryScreenHandle } from "@/components/PinEntryScreen";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [animationKey, setAnimationKey] = useState(0);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [isRestoringInSettings, setIsRestoringInSettings] = useState(false);
  const [changePinVisible, setChangePinVisible] = useState(false);
  // 'verify' = enter current PIN, 'setup' = enter new PIN
  const [changePinStep, setChangePinStep] = useState<'verify' | 'setup'>('verify');
  const changePinVerifyRef = useRef<PinEntryScreenHandle>(null);
  const changePinSetupRef  = useRef<PinEntryScreenHandle>(null);
  // Onboarding Store (for theme and notification time)
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const setSelectedTheme = useOnboardingStore((s) => s.setSelectedTheme);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const notificationPreferences = useOnboardingStore(
    (s) => s.notificationPreferences,
  );

  // Subscription Store
  const hasSubscription = useSubscriptionStore((s) => s.hasSubscription);
  const planType = useSubscriptionStore((s) => s.planType);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);
  const clearSubscription = useSubscriptionStore((s) => s.clearSubscription);

  // Settings Store
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore(
    (s) => s.setNotificationsEnabled,
  );
  const dailyReminderTime = useSettingsStore((s) => s.dailyReminderTime);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const emotionReflectionMode = useSettingsStore(
    (s) => s.emotionReflectionMode,
  );
  const setEmotionReflectionMode = useSettingsStore(
    (s) => s.setEmotionReflectionMode,
  );
  // Usage tracking
  const usageMinutes = useUsageMinutes();
  const remainingMinutes = useRemainingMinutes();
  const usagePct = Math.min(1, usageMinutes / USAGE_LIMIT_MINUTES);
  const usageMinutesDisplay = Math.floor(usageMinutes);
  const remainingMinutesDisplay = Math.max(0, Math.floor(remainingMinutes));
  const isNearLimit = usagePct >= 0.8;
  const isAtLimit = usagePct >= 1;

  // Theme colors
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  // Replay entrance animations every time this tab gains focus
  useEffect(() => {
    if (isFocused) setAnimationKey((k) => k + 1);
  }, [isFocused]);

  // Glassmorphic style — exact match to onboarding selection cards (white opacity, theme-adaptive)
  const surfaceBg = "rgba(255, 255, 255, 0.14)";
  const borderColor = "rgba(255, 255, 255, 0.25)";

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const showAlert = (
    type: "success" | "error",
    title: string,
    message: string,
  ) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const formatReminderTime = (time: string): string => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const handleThemeSelect = (theme: ThemeColorType) => {
    selectHaptic();
    setSelectedTheme(theme);
  };

  const handleNotificationToggle = async (value: boolean) => {
    selectHaptic();

    if (value) {
      // User wants to enable notifications
      const status = await NotificationService.requestPermissions();

      if (status.granted) {
        // Schedule notifications using the stored time and days
        const timeToUse = notificationPreferences?.time || dailyReminderTime;
        const daysToUse = notificationPreferences?.days || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

        try {
          const ids = await NotificationService.scheduleWeeklyNotifications(timeToUse, daysToUse);
          // Even if ids is empty (e.g. expo-notifications unavailable in preview),
          // still enable the toggle so the user can see/edit their preferences.
          setNotificationsEnabled(true);
        } catch {
          // Still enable — the scheduling will retry on next app launch via AuthGate
          setNotificationsEnabled(true);
        }
      } else {
        Alert.alert(
          "Permission required",
          "Please enable notifications in your device settings to receive daily reminders.",
          [{ text: "OK" }],
        );
      }
    } else {
      // User wants to disable notifications
      await NotificationService.cancelAllNotifications();
      setNotificationsEnabled(false);
    }
  };

  const handleSignOut = () => {
    warningHaptic();
    setSignOutModalVisible(true);
  };

  const confirmSignOut = () => {
    confirmHaptic();
    setSignOutModalVisible(false);
    // Reset onboarding to go back to welcome screen
    useOnboardingStore.getState().resetOnboarding();
    router.replace("/(tabs)");
  };

  const cancelSignOut = () => {
    tapHaptic();
    setSignOutModalVisible(false);
  };

  // ── Subscription management handlers ──────────────────────────────────────
  const handleManageSubscription = () => {
    tapHaptic();
    setSubscriptionModalVisible(true);
  };

  const handleCancelSubscription = () => {
    tapHaptic();
    // Deep-link to Google Play subscription management page.
    // On iOS this would open the App Store subscriptions settings instead.
    const url = Platform.select({
      android: "https://play.google.com/store/account/subscriptions?sku=com.vocolens.app&package=com.vocolens.app",
      ios: "https://apps.apple.com/account/subscriptions",
      default: "https://play.google.com/store/account/subscriptions",
    });
    Linking.openURL(url!).catch(() =>
      Alert.alert(
        "Could not open store",
        "Please open the Google Play Store manually, go to Subscriptions, and cancel Vocolens from there.",
      ),
    );
  };

  const handleRestoreInSettings = async () => {
    tapHaptic();
    setIsRestoringInSettings(true);
    const result = await restorePurchases();
    setIsRestoringInSettings(false);
    if (result.ok) {
      if (hasAccessLevel(result.data)) {
        successHaptic();
        setSubscription(true, planType ?? undefined);
        showAlert("success", "Subscription restored", "Your subscription has been restored successfully.");
        setSubscriptionModalVisible(false);
      } else {
        errorHaptic();
        Alert.alert("No active subscription", "We couldn't find an active subscription linked to this account.");
      }
    } else {
      errorHaptic();
      Alert.alert("Restore failed", "Something went wrong. Please try again.");
    }
  };

  // ── Change PIN handlers ────────────────────────────────────────────────────
  const handleOpenChangePinModal = () => {
    tapHaptic();
    setChangePinStep('verify');
    setChangePinVisible(true);
  };

  const handleChangePinCurrentVerified = () => {
    // Current PIN confirmed — advance to new-PIN creation step.
    // The in-app PinKeypad is always visible, so no focus management needed.
    confirmHaptic();
    setChangePinStep('setup');
  };

  const handleChangePinNewSaved = async () => {
    // PinEntryScreen mode="setup" already called setPin() with the new PIN
    // via auth-service. We just close and celebrate.
    successHaptic();
    setChangePinVisible(false);
    showAlert('success', 'PIN updated', 'Your new PIN is active. Use it next time you open Vocolens.');
  };

  const handleChangePinCancel = () => {
    tapHaptic();
    setChangePinVisible(false);
  };

  const handleResetAllData = () => {
    warningHaptic();
    setResetStep(1);
    setResetModalVisible(true);
  };

  // ── Share App handlers ──────────────────────────────────────────────────────
  const [shareUnavailable, setShareUnavailable] = useState(false);

  const APP_LINK = "https://vocolens.com";
  const SHARE_MESSAGE = `I've been using Vocolens to track and understand my emotions — it's actually helped me a lot. Thought you might like it too: ${APP_LINK}`;

  const handleShareApp = async () => {
    tapHaptic();
    try {
      await Share.share(
        {
          message: SHARE_MESSAGE,
          url: APP_LINK,
          title: "Check out Vocolens",
        },
        { dialogTitle: "Share Vocolens" },
      );
    } catch {
      // Share API unavailable on this device — switch to copy-link fallback
      setShareUnavailable(true);
    }
  };

  const handleCopyLink = async () => {
    tapHaptic();
    try {
      await Clipboard.setStringAsync(APP_LINK);
      successHaptic();
      showAlert("success", "Link copied", "The link has been copied to your clipboard.");
    } catch {
      // silent
    }
  };

  const handleResetStep1Confirm = () => {
    warningHaptic();
    setResetStep(2);
  };

  const confirmResetAllData = async () => {
    confirmHaptic();
    setResetModalVisible(false);
    setResetStep(1);

    // Reset all stores
    useJournalStore.getState().clearAllEntries();
    useBadgesStore.getState().resetBadges();
    useUserStatsStore.getState().resetStats();
    useSettingsStore.getState().resetSettings();
    usePinStore.getState().clearPin();
    useBiometricStore.getState().disableBiometric();
    useEmotionCorrectionStore.getState().clearCorrections();
    useSubscriptionStore.getState().clearSubscription();

    // Clear PIN from secure storage (non-blocking)
    try {
      await removePin();
    } catch (err) {
      console.warn(
        "Failed to remove PIN from secure storage during reset:",
        err,
      );
      // Continue with reset — redirect is more important than clean secure store
    }

    // Reset onboarding last (redirects to welcome)
    useOnboardingStore.getState().resetOnboarding();
    router.replace("/(tabs)");
  };

  const cancelReset = () => {
    tapHaptic();
    setResetModalVisible(false);
    setResetStep(1);
  };

  if (!fontsLoaded) {
    return (
      <View className="flex-1" style={{ backgroundColor: THEME_COLORS[selectedTheme].backgroundGradient[1] }}>
        <LinearGradient
          colors={THEME_COLORS[selectedTheme].backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: THEME_COLORS[selectedTheme].backgroundGradient[2] }}>
      <LinearGradient
        colors={THEME_COLORS[selectedTheme].backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Header */}
          <Animated.View key={`s-hdr-${animationKey}`} entering={ENTER_1} className="px-6 pt-4 pb-6">
            <View>
              <Text
                className="text-white font-bold mb-2 text-center"
                style={{ fontFamily: "Fraunces_700Bold", fontSize: 30 }}
              >
                Settings
              </Text>
              <Text
                className="text-center"
                style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 16 }}
              >
                Customize your experience
              </Text>
            </View>
          </Animated.View>

          {/* Settings Content */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* ── Subscription ── */}
            <Animated.View key={`s-sub-${animationKey}`} entering={ENTER_2} className="mb-6">
              <Pressable
                onPress={handleManageSubscription}
                className="active:opacity-75"
                style={{
                  backgroundColor: surfaceBg,
                  borderWidth: 2,
                  borderColor: hasSubscription
                    ? "rgba(255,255,255,0.30)"
                    : "rgba(255,100,100,0.40)",
                  borderRadius: 24,
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 18,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Crown size={22} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                        fontSize: 18,
                      }}
                    >
                      Subscription
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        color: "rgba(255,255,255,0.55)",
                        fontSize: 14,
                        marginTop: 2,
                      }}
                    >
                      Tap to manage
                    </Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                </View>
              </Pressable>
            </Animated.View>

            {/* Usage Limit Card */}
            <Animated.View key={`s-usg-${animationKey}`} entering={ENTER_2} className="mb-6">
              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: isAtLimit
                    ? "rgba(255, 80, 80, 0.18)"
                    : isNearLimit
                      ? "rgba(255, 180, 50, 0.15)"
                      : "rgba(255, 255, 255, 0.12)",
                  borderWidth: 2,
                  borderColor: isAtLimit
                    ? "rgba(255, 100, 100, 0.5)"
                    : isNearLimit
                      ? "rgba(255, 200, 80, 0.4)"
                      : "rgba(255, 255, 255, 0.20)",
                }}
              >
                <View className="p-5">
                  {/* Header row */}
                  <View className="flex-row items-center mb-4">
                    <View className="flex-row items-center">
                      <View
                        className="items-center justify-center mr-3"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: isAtLimit
                            ? "rgba(255, 100, 100, 0.3)"
                            : "rgba(255, 255, 255, 0.15)",
                        }}
                      >
                        <Text style={{ fontSize: 17 }}>
                          {isAtLimit ? "🔒" : isNearLimit ? "⚠️" : "🎙️"}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            color: "#FFFFFF",
                            fontSize: 15,
                          }}
                        >
                          Monthly usage
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.65)",
                            fontSize: 11,
                          }}
                        >
                          Resets each calendar month
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Usage display */}
                  <View
                    className="rounded-full self-start px-4 py-2"
                    style={{
                      backgroundColor: isAtLimit
                        ? "rgba(255, 100, 100, 0.35)"
                        : isNearLimit
                          ? "rgba(255, 200, 80, 0.3)"
                          : hexToRgba(Colors.primary, 0.15),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        color: "#FFFFFF",
                        fontSize: 14,
                      }}
                    >
                      {usageMinutesDisplay} / {USAGE_LIMIT_MINUTES} min
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Theme Customization */}
            <Animated.View key={`s-thm-${animationKey}`} entering={ENTER_3} className="mb-6">
              <View
                className="rounded-3xl"
                style={{
                  backgroundColor: surfaceBg,
                  borderWidth: 2,
                  borderColor: borderColor,
                  overflow: "hidden",
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
                    className="items-center justify-center mr-3"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Palette size={22} color="#FFFFFF" />
                  </View>
                  <Text
                    
                    style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                  >
                    Theme colors
                  </Text>
                </View>

                <View className="p-5">
                {[
                  ["hotPink", "softPink", "lavenderBliss"],
                  ["violetWhisper", "oceanCalm", "darkMode"],
                ].map((row, rowIndex) => (
                  <View
                    key={rowIndex}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-around",
                      marginBottom: rowIndex === 0 ? 20 : 0,
                    }}
                  >
                    {(row as ThemeColorType[]).map((theme) => {
                      const themeData = THEME_COLORS[theme];
                      const isSelected = selectedTheme === theme;

                      return (
                        <Pressable
                          key={theme}
                          onPress={() => handleThemeSelect(theme)}
                          style={{ alignItems: "center", width: 52 }}
                        >
                          {/* Outer glow ring */}
                          {isSelected && (
                            <View
                              style={{
                                position: "absolute",
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                borderWidth: 2.5,
                                borderColor: "rgba(255,255,255,0.95)",
                                top: -6,
                                left: -6,
                                shadowColor: "#FFFFFF",
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.55,
                                shadowRadius: 10,
                              }}
                            />
                          )}

                          {/* Gradient orb */}
                          <LinearGradient
                            colors={[
                              themeData.gradientStart,
                              themeData.gradientEnd,
                            ]}
                            start={{ x: 0.15, y: 0 }}
                            end={{ x: 0.85, y: 1 }}
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 26,
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                            }}
                          >
                            {/* Inner highlight shimmer */}
                            <View
                              style={{
                                position: "absolute",
                                top: 7,
                                left: 7,
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: "rgba(255,255,255,0.38)",
                              }}
                            />
                            {/* Bottom shadow layer */}
                            <View
                              style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 20,
                                borderBottomLeftRadius: 26,
                                borderBottomRightRadius: 26,
                                backgroundColor: "rgba(0,0,0,0.10)",
                              }}
                            />
                            {isSelected && (
                              <Check
                                size={18}
                                color="#FFFFFF"
                                strokeWidth={2.8}
                              />
                            )}
                          </LinearGradient>

                          {/* Label */}
                          <Text
                            numberOfLines={2}
                            style={{
                              color: isSelected
                                ? "#FFFFFF"
                                : "rgba(255,255,255,0.65)",
                              fontSize: 10,
                              fontFamily: "Inter_600SemiBold",
                              textAlign: "center",
                              marginTop: 8,
                              lineHeight: 14,
                              maxWidth: 52,
                            }}
                          >
                            {themeData.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                </View>
              </View>
            </Animated.View>

            {/* Notifications */}
            <Animated.View key={`s-ntf-${animationKey}`} entering={ENTER_4} className="mb-6">
              <View
                className="rounded-3xl"
                style={{
                  backgroundColor: surfaceBg,
                  borderWidth: 2,
                  borderColor: borderColor,
                  overflow: "hidden",
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
                    className="items-center justify-center mr-3"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Bell size={22} color="#FFFFFF" />
                  </View>
                  <Text
                    style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                  >
                    Notifications
                  </Text>
                </View>

                <View className="p-5">
                  {/* Toggle */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-4">
                      <Text
                        className="text-base font-semibold mb-1"
                        style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 16 }}
                      >
                        Daily reminders
                      </Text>
                      <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 14 }}>
                        Get reminded to journal
                      </Text>
                    </View>
                    <ThemedSwitch
                      value={notificationsEnabled}
                      onValueChange={handleNotificationToggle}
                      trackColor={Colors.primary}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Time & Day selectors — shown when notifications are enabled */}
                  {notificationsEnabled && (
                    <View style={{ marginTop: 20 }}>
                      {/* Reminder Time */}
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 14,
                          marginBottom: 10,
                        }}
                      >
                        Reminder time
                      </Text>
                      <Pressable
                        onPress={() => {
                          tapHaptic();
                          setShowTimePicker(!showTimePicker);
                        }}
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.10)",
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.18)",
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            color: "#FFFFFF",
                            fontSize: 16,
                          }}
                        >
                          {formatReminderTime(notificationPreferences?.time || dailyReminderTime)}
                        </Text>
                        <Clock size={18} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                      </Pressable>

                      {/* Time Picker */}
                      {showTimePicker && (
                        <View
                          style={{
                            marginTop: 12,
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            borderRadius: 18,
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.15)",
                            overflow: "hidden",
                            padding: 8,
                          }}
                        >
                          <DateTimePicker
                            value={(() => {
                              const t = notificationPreferences?.time || dailyReminderTime;
                              const [h, m] = t.split(":").map(Number);
                              const d = new Date();
                              d.setHours(h, m, 0, 0);
                              return d;
                            })()}
                            mode="time"
                            display={Platform.OS === "android" ? "clock" : "spinner"}
                            themeVariant="dark"
                            style={{ backgroundColor: "transparent" }}
                            onChange={(_, date) => {
                              if (Platform.OS === "android") setShowTimePicker(false);
                              if (date) {
                                const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
                                useSettingsStore.getState().setDailyReminderTime(timeStr);
                                useOnboardingStore.getState().setNotificationPreferences({
                                  days: notificationPreferences?.days || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                                  time: timeStr,
                                });
                                NotificationService.scheduleWeeklyNotifications(
                                  timeStr,
                                  notificationPreferences?.days || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                                );
                              }
                            }}
                          />
                        </View>
                      )}

                      {/* Divider */}
                      <View
                        style={{
                          height: 1,
                          backgroundColor: "rgba(255, 255, 255, 0.10)",
                          marginVertical: 16,
                        }}
                      />

                      {/* Reminder Days */}
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            color: "#FFFFFF",
                            fontSize: 14,
                          }}
                        >
                          Reminder days
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            color: "rgba(255,255,255,0.50)",
                            fontSize: 13,
                          }}
                        >
                          {(notificationPreferences?.days || []).length}/7
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => {
                          const isSelected = (notificationPreferences?.days || []).includes(day);
                          const label = day.slice(0, 3).charAt(0).toUpperCase() + day.slice(1, 3);
                          return (
                            <Pressable
                              key={day}
                              onPress={() => {
                                tapHaptic();
                                const currentDays = new Set(notificationPreferences?.days || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
                                if (isSelected) {
                                  if (currentDays.size <= 1) return;
                                  currentDays.delete(day);
                                } else {
                                  currentDays.add(day);
                                }
                                const daysArray = Array.from(currentDays);
                                const timeStr = notificationPreferences?.time || dailyReminderTime;
                                useOnboardingStore.getState().setNotificationPreferences({
                                  days: daysArray,
                                  time: timeStr,
                                });
                                NotificationService.scheduleWeeklyNotifications(timeStr, daysArray);
                              }}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.20)",
                                backgroundColor: isSelected ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                                  color: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.50)",
                                  fontSize: 14,
                                }}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>

            {/* Emotion Reflection */}
            <Animated.View key={`s-emo-${animationKey}`} entering={ENTER_5} className="mb-6">
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
                    className="items-center justify-center mr-3"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Brain size={22} color="#FFFFFF" />
                  </View>
                  <Text
                    
                    style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                  >
                    Emotion reflection
                  </Text>
                </View>
                <View
                  className="p-5"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      fontSize: 15,
                      marginBottom: 4,
                    }}
                  >
                    After each recording
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 14,
                      marginBottom: 12,
                    }}
                  >
                    The AI learns from your confirms and adjusts. Choose how
                    much time you want to spend refining.
                  </Text>

                  {(["quick", "full", "off"] as EmotionReflectionMode[]).map(
                    (mode) => (
                      <Pressable
                        key={mode}
                        onPress={() => {
                          selectHaptic();
                          setEmotionReflectionMode(mode);
                        }}
                        className="flex-row items-center py-4"
                      >
                        <View
                          className="w-6 h-6 rounded-full mr-3 items-center justify-center"
                          style={{
                            borderWidth: 2,
                            borderColor:
                              emotionReflectionMode === mode
                                ? "#FFFFFF"
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {emotionReflectionMode === mode && (
                            <View
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: "#FFFFFF" }}
                            />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "#FFFFFF",
                              fontSize: 15,
                              textTransform: "capitalize",
                            }}
                          >
                            {mode}
                          </Text>
                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.6)",
                              fontSize: 14,
                              lineHeight: 18,
                            }}
                          >
                            {mode === "full"
                              ? "Emotion labels, V-A sliders, body check-in"
                              : mode === "quick"
                                ? "Emotion labels + sliders only"
                                : "Skip reflection, save immediately"}
                          </Text>
                        </View>
                      </Pressable>
                    ),
                  )}
                </View>

                <Pressable
                  onPress={() => {
                    tapHaptic();
                    router.push("/correction-history");
                  }}
                  className="p-5 active:opacity-70"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 15,
                          marginBottom: 2,
                        }}
                      >
                        My feedback history
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: 14,
                        }}
                      >
                        Confirmation rate, patterns, export CSV
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BarChart3 size={22} color="#FFFFFF" />
                    </View>
                  </View>
                </Pressable>
              </View>
            </Animated.View>

            {/* ── Share / Spread the Word ── */}
            <Animated.View key={`s-share-${animationKey}`} entering={ENTER_5} className="mb-6">
              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: surfaceBg,
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.40)",
                }}
              >
                {/* Body */}
                <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255, 255, 255, 0.75)",
                      fontSize: 14,
                      lineHeight: 22,
                    }}
                  >
                    Know someone who struggles to put their feelings into words? Share Vocolens — built by one person who gets it, not a company.
                  </Text>
                </View>

                {/* Button — Heart icon + "Share the words" inside one tappable container */}
                <Pressable
                  data-testid="share-app-card"
                  onPress={shareUnavailable ? handleCopyLink : handleShareApp}
                  className="active:opacity-75"
                  style={{
                    marginHorizontal: 16,
                    marginBottom: 16,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={Gradients.button}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 24,
                      borderRadius: 18,
                    }}
                  >
                    <Heart size={20} color="#FFFFFF" strokeWidth={2.5} />
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        color: "#FFFFFF",
                        fontSize: 17,
                        marginLeft: 10,
                      }}
                    >
                      Share the words
                    </Text>
                  </LinearGradient>
                </Pressable>

                {shareUnavailable && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <Pressable
                      data-testid="copy-link-button"
                      onPress={handleCopyLink}
                      className="active:opacity-80"
                      style={{
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: "rgba(255, 255, 255, 0.35)",
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        paddingVertical: 14,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 15,
                        }}
                      >
                        Copy link
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Privacy & Security */}
            <Animated.View key={`s-prv-${animationKey}`} entering={ENTER_6} className="mb-6">
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
                    className="items-center justify-center mr-3"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Shield size={22} color="#FFFFFF" />
                  </View>
                  <Text
                    
                    style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                  >
                    Privacy & security
                  </Text>
                </View>

                {/* Export & Reset Data */}
                <View className="p-5">
                  {/* Change PIN */}
                  <Pressable
                    onPress={handleOpenChangePinModal}
                    className="active:opacity-70"
                    style={{ marginBottom: 20 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: "rgba(255, 255, 255, 0.15)",
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        <KeyRound size={20} color="#FFFFFF" strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: 'Inter_600SemiBold',
                            color: '#FFFFFF',
                            fontSize: 15,
                            marginBottom: 2,
                          }}
                        >
                          Change PIN
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Inter_400Regular',
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: 14,
                          }}
                        >
                          Enter your current PIN, then create a new one
                        </Text>
                      </View>
                      <ChevronRight size={18} color="rgba(255,255,255,0.35)" strokeWidth={2} />
                    </View>
                  </Pressable>

                  {/* Divider */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      marginBottom: 20,
                    }}
                  />

                  {/* Export Journals */}
                  <Pressable
                    onPress={() => { tapHaptic(); setExportModalVisible(true); }}
                    className="active:opacity-70"
                    style={{ marginBottom: 20 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: "rgba(255, 255, 255, 0.15)",
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        <Download size={20} color="#FFFFFF" strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: 'Inter_600SemiBold',
                            color: '#FFFFFF',
                            fontSize: 15,
                            marginBottom: 2,
                          }}
                        >
                          Export your journals
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Inter_400Regular',
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: 14,
                            lineHeight: 18,
                          }}
                        >
                          Get your journal entries as a PDF archive with audio files organized by date
                        </Text>
                      </View>
                      <ChevronRight size={18} color="rgba(255,255,255,0.35)" strokeWidth={2} />
                    </View>
                  </Pressable>

                </View>
              </View>
            </Animated.View>

            {/* ── Reset All Data (separate container) ── */}
            <Animated.View key={`s-reset-${animationKey}`} entering={ENTER_6} className="mb-6">
              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: surfaceBg,
                  borderWidth: 2,
                  borderColor: "rgba(239, 68, 68, 0.35)",
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
                    className="items-center justify-center mr-3"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Trash2 size={22} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text
                    
                    style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
                  >
                    Reset all data
                  </Text>
                </View>

                <View className="p-5">
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 14,
                      marginBottom: 16,
                      lineHeight: 19,
                    }}
                  >
                    This will permanently delete all your journal entries,
                    stats, badges, PIN, and settings. The app will return to its
                    initial state.
                  </Text>
                  <Pressable
                    data-testid="reset-all-data-button"
                    onPress={handleResetAllData}
                    style={{
                      width: "100%",
                      borderRadius: 18,
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
                          fontSize: 18,
                        }}
                      >
                        Erase everything
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={signOutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelSignOut}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View
            className="rounded-3xl p-6 w-full max-w-md"
            style={{
              backgroundColor: Colors.surfaceHighlight,
              ...Shadows.large,
            }}
          >
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(239, 68, 68, 0.15)"
                    : "#FEE2E2",
                }}
              >
                <LogOut size={32} color="#DC2626" strokeWidth={2} />
              </View>
              <Text
                className="text-2xl font-bold mb-2"
                style={{
                  fontFamily: "Inter_700Bold",
                  color: Colors.textPrimary,
                }}
              >
                Sign out
              </Text>
              <Text
                className="text-center text-base"
                style={{ color: Colors.textSecondary }}
              >
                Are you sure you want to sign out? You'll return to the welcome
                screen.
              </Text>
            </View>

            <View className="space-y-3">
              <Pressable
                onPress={confirmSignOut}
                className="rounded-3xl overflow-hidden mb-3"
              >
                <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 16, alignItems: "center" }}
                >
                  <Text
                    className="text-white text-lg font-bold"
                    style={{ fontFamily: "Inter_700Bold" }}
                  >
                    Yes, sign out
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={cancelSignOut}
                className="rounded-3xl py-4 items-center border-2"
                style={{ borderColor: Colors.primary }}
              >
                <Text
                  className="text-lg font-bold"
                  style={{ fontFamily: "Inter_700Bold", color: Colors.primary }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset All Data Confirmation Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelReset}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View
            style={{
              backgroundColor: THEME_COLORS[selectedTheme].backgroundGradient[1],
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.20)",
              overflow: "hidden",
            }}
          >
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.20),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.30),
                }}
              >
                <AlertTriangle size={32} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text
                className="text-2xl font-bold mb-2"
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "#FFFFFF",
                }}
              >
                {resetStep === 1 ? "Reset all data?" : "Are you sure?"}
              </Text>
              <Text
                className="text-center text-base"
                style={{ color: "rgba(255, 255, 255, 0.75)", lineHeight: 22 }}
              >
                {resetStep === 1
                  ? "This will permanently erase all your journal entries, stats, badges, PIN, and settings."
                  : "This action cannot be undone. All your data will be permanently deleted and the app will return to its initial state."}
              </Text>
            </View>

            {/* Step indicator */}
            <View className="flex-row justify-center items-center gap-2 mb-4">
              <View
                className="w-8 h-1.5 rounded-full"
                style={{ backgroundColor: Colors.primary }}
              />
              <View
                className="w-8 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    resetStep === 2 ? Colors.primary : "rgba(255,255,255,0.2)",
                }}
              />
            </View>

            <View className="space-y-3">
              <Pressable
                data-testid={
                  resetStep === 1
                    ? "confirm-reset-step1-button"
                    : "confirm-reset-button"
                }
                onPress={
                  resetStep === 1
                    ? handleResetStep1Confirm
                    : confirmResetAllData
                }
                className="rounded-full py-3 items-center mb-3 active:opacity-80"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  borderWidth: 1.5,
                  borderColor: "rgba(255, 255, 255, 0.35)",
                }}
              >
                <Text
                  className="text-sm text-white"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {resetStep === 1
                    ? "Yes, reset everything"
                    : "Delete all data now"}
                </Text>
              </Pressable>

              <Pressable
                data-testid="cancel-reset-button"
                onPress={cancelReset}
                className="rounded-full py-3 items-center active:opacity-80"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  borderWidth: 1.5,
                  borderColor: "rgba(255, 255, 255, 0.35)",
                }}
              >
                <Text
                  className="text-sm text-white"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Subscription Management Modal ── */}
      <Modal
        visible={subscriptionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSubscriptionModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" }}>
          <LinearGradient
            colors={THEME_COLORS[selectedTheme].backgroundGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 40,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.15)",
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: hexToRgba(Colors.primary, 0.25),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Crown size={18} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text
                  style={{
                    fontFamily: "Fraunces_700Bold",
                    color: "#FFFFFF",
                    fontSize: 22,
                  }}
                >
                  Manage subscription
                </Text>
              </View>
              <Pressable
                onPress={() => setSubscriptionModalVisible(false)}
                hitSlop={12}
              >
                <X size={22} color="rgba(255,255,255,0.55)" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Current plan pill */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.10)",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 24,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: hasSubscription ? "#4ADE80" : "#F87171",
                }}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 14,
                  flex: 1,
                }}
              >
                {hasSubscription
                  ? planType === "yearly"
                    ? "Yearly Pro · $79.99 / year  ·  3-day free trial"
                    : planType === "quarterly"
                      ? "Quarterly Pro · $24.99 every 3 months"
                      : planType === "monthly"
                        ? "Monthly Pro · $9.99 / month"
                        : "Pro Plan — active"
                  : "No active subscription"}
              </Text>
            </View>

            {/* Action rows */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              {/* Restore purchases */}
              <Pressable
                onPress={handleRestoreInSettings}
                disabled={isRestoringInSettings}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 17,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.10)",
                  opacity: pressed || isRestoringInSettings ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: hexToRgba(Colors.primary, 0.20),
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <RefreshCw size={17} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      fontSize: 15,
                      marginBottom: 2,
                    }}
                  >
                    {isRestoringInSettings ? "Restoring…" : "Restore purchases"}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 12,
                    }}
                  >
                    Reactivate a subscription linked to this account
                  </Text>
                </View>
                <ChevronRight size={18} color="rgba(255,255,255,0.35)" strokeWidth={2} />
              </Pressable>

              {/* Cancel subscription — opens store */}
              <Pressable
                onPress={handleCancelSubscription}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 17,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(239,68,68,0.18)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <ExternalLink size={17} color="#F87171" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#F87171",
                      fontSize: 15,
                      marginBottom: 2,
                    }}
                  >
                    Cancel subscription
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 12,
                    }}
                  >
                    Opens Google Play · cancel from your subscriptions list
                  </Text>
                </View>
                <ChevronRight size={18} color="rgba(255,255,255,0.35)" strokeWidth={2} />
              </Pressable>
            </View>

            {/* Fine-print note */}
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.35)",
                fontSize: 11,
                textAlign: "center",
                lineHeight: 16,
              }}
            >
              Subscriptions are managed through the{" "}
              {Platform.OS === "ios" ? "App Store" : "Google Play Store"}.{"\n"}
              Cancelling stops future renewals — access continues until the current period ends.
            </Text>
          </LinearGradient>
        </View>
      </Modal>

      {/* ── Change PIN Modal ── */}
      <Modal
        visible={changePinVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={handleChangePinCancel}
        onShow={() => {
          // onShow fires after the OS finishes presenting the modal — the only
          // reliable moment to request keyboard focus. Direct ref call skips
          // InteractionManager timing entirely.
          if (changePinStep === 'verify') {
            changePinVerifyRef.current?.focusKeyboard();
          } else {
            changePinSetupRef.current?.focusKeyboard();
          }
        }}
      >
        <View style={{ flex: 1 }}>
          {changePinStep === 'verify' ? (
            <PinEntryScreen
              ref={changePinVerifyRef}
              mode="verify"
              title="Enter your current PIN"
              subtitle="Confirm your current PIN before setting a new one."
              onSuccess={handleChangePinCurrentVerified}
              onBack={handleChangePinCancel}
              androidFocusDelay={300}
            />
          ) : (
            <PinEntryScreen
              ref={changePinSetupRef}
              mode="setup"
              title="Enter your new PIN"
              subtitle="Choose a new 4-digit PIN for Vocolens."
              onComplete={handleChangePinNewSaved}
              onCancel={handleChangePinCancel}
              androidFocusDelay={300}
            />
          )}
        </View>
      </Modal>

      {/* Export Journal Modal */}
      <ExportJournalModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onSuccess={() => showAlert('success', 'Export downloaded', 'Your journal archive has been saved.')}
        onError={(msg) => showAlert('error', 'Export failed', msg)}
      />

      {/* Branded Alert */}
      <BrandedAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}
