/**
 * Settings Screen
 * Customizable settings menu for theme, notifications, dark mode, PIN, time, and sign out
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Palette,
  Bell,
  Lock,
  Clock,
  LogOut,
  Check,
  X,
  Shield,
  ChevronRight,
  Moon,
  Brain,
  BarChart3,
  AlertTriangle,
  Trash2,
  Download,
  Globe,
} from "lucide-react-native";
import Animated from "react-native-reanimated";
import {
  selectHaptic,
  tapHaptic,
  confirmHaptic,
  warningHaptic,
} from "@/lib/haptics";
import { router } from "expo-router";
import useOnboardingStore, {
  ThemeColorType,
  THEME_COLORS,
} from "@/lib/state/onboarding-store";
import useSettingsStore, {
  TimeFormat,
  EmotionReflectionMode,
} from "@/lib/state/settings-store";
import {
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from "@/lib/theme";
import { ThemedSwitch } from "@/components/ThemedSwitch";
import { NotificationService } from "@/lib/services/notification-service";
import { changePin, verifyPin } from "@/lib/auth-service";
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
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import { removePin } from "@/lib/auth-service";
import { exportAllDataAsCsv } from "@/lib/export-data";
import { getLanguageByCode } from "@/lib/languages";
import { hexToRgba, GlassLayers } from "@/lib/glass";

export default function SettingsScreen() {
  const insets = { top: 0, bottom: 0 }; // SafeAreaView handles this
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinStep, setPinStep] = useState<"current" | "new">("current");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [isExporting, setIsExporting] = useState(false);
  // Onboarding Store (for theme and notification time)
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const setSelectedTheme = useOnboardingStore((s) => s.setSelectedTheme);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const notificationPreferences = useOnboardingStore(
    (s) => s.notificationPreferences,
  );

  // Settings Store
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore(
    (s) => s.setNotificationsEnabled,
  );
  const dailyReminderTime = useSettingsStore((s) => s.dailyReminderTime);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const setTimeFormat = useSettingsStore((s) => s.setTimeFormat);
  const emotionReflectionMode = useSettingsStore(
    (s) => s.emotionReflectionMode,
  );
  const setEmotionReflectionMode = useSettingsStore(
    (s) => s.setEmotionReflectionMode,
  );
  const selectedLanguage = useOnboardingStore(
    (s) => s.selectedTranscriptionLanguage,
  );
  const currentLang = getLanguageByCode(selectedLanguage);

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
        // Schedule notifications using the stored time from onboarding
        const timeToUse = notificationPreferences?.time || dailyReminderTime;
        const scheduled =
          await NotificationService.scheduleDailyNotification(timeToUse);

        if (scheduled) {
          setNotificationsEnabled(true);
        } else {
          Alert.alert(
            "Error",
            "Failed to schedule notifications. Please try again.",
          );
        }
      } else {
        Alert.alert(
          "Permission Required",
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

  const handleTimeFormatToggle = (value: boolean) => {
    selectHaptic();
    setTimeFormat(value ? "24h" : "12h");
  };

  const handleOpenPinChange = () => {
    tapHaptic();
    setPinModalVisible(true);
    setPinStep("current");
    setCurrentPin("");
    setNewPin("");
  };

  const handlePinChange = async () => {
    confirmHaptic();

    if (pinStep === "current") {
      // Verify current PIN
      const isValid = await verifyPin(currentPin);
      if (!isValid) {
        showAlert(
          "error",
          "Incorrect PIN",
          "Current PIN is incorrect. Please try again.",
        );
        setCurrentPin("");
        return;
      }
      setPinStep("new");
    } else if (pinStep === "new") {
      // Change PIN directly
      const success = await changePin(currentPin, newPin);
      if (success) {
        showAlert(
          "success",
          "PIN Changed",
          "Your PIN has been changed successfully.",
        );
        setPinModalVisible(false);
        setCurrentPin("");
        setNewPin("");
        setPinStep("current");
      } else {
        showAlert(
          "error",
          "Change Failed",
          "Failed to change PIN. Please try again.",
        );
      }
    }
  };

  const handlePinInput = (value: string) => {
    if (pinStep === "current") {
      setCurrentPin(value);
    } else {
      setNewPin(value);
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

  const handleExportData = async () => {
    tapHaptic();
    setIsExporting(true);
    try {
      await exportAllDataAsCsv();
    } catch {
      showAlert(
        "error",
        "Export Failed",
        "Could not export your data. Please try again.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetAllData = () => {
    warningHaptic();
    setResetStep(1);
    setResetModalVisible(true);
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
      <View className="flex-1">
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
    <View className="flex-1">
      <LinearGradient
        colors={THEME_COLORS[selectedTheme].backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="px-6 pt-4 pb-6">
            <View>
              <Text
                className="text-white font-bold mb-2 text-center"
                style={{ fontFamily: "Fraunces_700Bold", fontSize: 22 }}
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
          </View>

          {/* Settings Content */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Usage Limit Card */}
            <View className="mb-6">
              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: isAtLimit
                    ? "rgba(255, 80, 80, 0.18)"
                    : isNearLimit
                      ? "rgba(255, 180, 50, 0.15)"
                      : hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1,
                  borderColor: isAtLimit
                    ? "rgba(255, 100, 100, 0.5)"
                    : isNearLimit
                      ? "rgba(255, 200, 80, 0.4)"
                      : hexToRgba(Colors.primary, 0.15),
                }}
              >
                <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
                <View className="p-5">
                  {/* Header row */}
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center">
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: isAtLimit
                            ? "rgba(255, 100, 100, 0.3)"
                            : hexToRgba(Colors.primary, 0.2),
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
                          Monthly Usage
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
                    <View
                      className="px-3 py-1 rounded-full"
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
                          fontSize: 12,
                        }}
                      >
                        {usageMinutesDisplay} / {USAGE_LIMIT_MINUTES} min
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View
                    className="h-3 rounded-full mb-3"
                    style={{ backgroundColor: hexToRgba(Colors.primary, 0.12) }}
                  >
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, usagePct * 100)}%`,
                        backgroundColor: isAtLimit
                          ? "#FF5050"
                          : isNearLimit
                            ? "#FFB830"
                            : Colors.primary,
                      }}
                    />
                  </View>

                  {/* Status text */}
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: isAtLimit
                        ? "rgba(255,180,180,0.95)"
                        : isNearLimit
                          ? "rgba(255,230,150,0.95)"
                          : "rgba(255,255,255,0.7)",
                      fontSize: 12,
                    }}
                  >
                    {isAtLimit
                      ? "Monthly limit reached. Usage resets at the start of next month."
                      : `${remainingMinutesDisplay} minutes remaining this month`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Theme Customization */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.2) }}
                >
                  <Palette size={20} color="#FFFFFF" />
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Theme Colors
                </Text>
              </View>

              <View
                className="rounded-3xl p-5"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  {(
                    [
                      "hotPink",
                      "softPink",
                      "lavenderBliss",
                      "violetWhisper",
                      "darkMode",
                    ] as ThemeColorType[]
                  ).map((theme) => {
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
                          {isSelected ? (
                            <Check
                              size={18}
                              color="#FFFFFF"
                              strokeWidth={2.8}
                            />
                          ) : theme === "darkMode" ? (
                            <Moon
                              size={16}
                              color="rgba(255,255,255,0.7)"
                              strokeWidth={2}
                            />
                          ) : null}
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
              </View>
            </View>

            {/* Notifications */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.2) }}
                >
                  <Bell size={20} color="#FFFFFF" />
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Notifications
                </Text>
              </View>

              <View
                className="rounded-3xl p-5"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="text-base font-semibold mb-1"
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                    >
                      Daily Reminders
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: 15,
                      }}
                    >
                      Get reminded to journal every day
                    </Text>
                  </View>
                  <ThemedSwitch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={Colors.primary}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* Time Format */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.2) }}
                >
                  <Clock size={20} color="#FFFFFF" />
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Time Format
                </Text>
              </View>

              <View
                className="rounded-3xl p-5"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text
                      className="text-base font-semibold mb-1"
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                    >
                      24-Hour Format
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: 15,
                      }}
                    >
                      {timeFormat === "24h"
                        ? "Using 24-hour format (14:00)"
                        : "Using 12-hour format (2:00 PM)"}
                    </Text>
                  </View>
                  <ThemedSwitch
                    value={timeFormat === "24h"}
                    onValueChange={handleTimeFormatToggle}
                    trackColor={Colors.primary}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* Emotion Reflection */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.2) }}
                >
                  <Brain size={20} color="#FFFFFF" />
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                >
                  Emotion Reflection
                </Text>
              </View>

              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
                <View
                  className="p-5"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: hexToRgba(Colors.primary, 0.1),
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
                      fontSize: 13,
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
                                ? Colors.primary
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {emotionReflectionMode === mode && (
                            <View
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: Colors.primary }}
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
                              fontSize: 13,
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
                        My Feedback History
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: 13,
                        }}
                      >
                        Confirmation rate, patterns, export CSV
                      </Text>
                    </View>
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: hexToRgba(Colors.primary, 0.2),
                      }}
                    >
                      <BarChart3 size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* Transcription Language */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.2) }}
                >
                  <Text style={{ fontSize: 18 }}>{currentLang.flag}</Text>
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Transcription Language
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  tapHaptic();
                  router.push("/language-picker");
                }}
                className="rounded-3xl overflow-hidden active:opacity-70"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
                <View
                  className="p-5"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View className="flex-1">
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                        fontSize: 15,
                        marginBottom: 2,
                      }}
                    >
                      {currentLang.flag} {currentLang.name}
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: 13,
                      }}
                    >
                      Used for all voice transcriptions
                    </Text>
                  </View>
                  <ChevronRight
                    size={20}
                    color="rgba(255, 255, 255, 0.6)"
                    strokeWidth={2}
                  />
                </View>
              </Pressable>
            </View>

            {/* Privacy & Security */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.2) }}
                >
                  <Shield size={20} color="#FFFFFF" />
                </View>
                <Text
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  Privacy & Security
                </Text>
              </View>

              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
                <Pressable
                  onPress={handleOpenPinChange}
                  className="p-5 active:opacity-70"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: hexToRgba(Colors.primary, 0.1),
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold mb-1"
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                        }}
                      >
                        Change PIN
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.8)",
                          fontSize: 15,
                        }}
                      >
                        Update your security PIN
                      </Text>
                    </View>
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: hexToRgba(Colors.primary, 0.2),
                      }}
                    >
                      <Lock size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    tapHaptic();
                    router.push("/legal");
                  }}
                  className="p-5 active:opacity-70"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: hexToRgba(Colors.primary, 0.1),
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold mb-1"
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                        }}
                      >
                        Privacy Policy & Terms
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.8)",
                          fontSize: 15,
                        }}
                      >
                        How your data is used & protected
                      </Text>
                    </View>
                    <ChevronRight
                      size={20}
                      color="rgba(255, 255, 255, 0.6)"
                      strokeWidth={2}
                    />
                  </View>
                </Pressable>

                {/* Export & Reset Data */}
                <View className="p-5">
                  {/* Export Data */}
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      fontSize: 15,
                      marginBottom: 4,
                    }}
                  >
                    Export All Data
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 13,
                      marginBottom: 14,
                      lineHeight: 19,
                    }}
                  >
                    Download a CSV backup of your journal entries, stats,
                    badges, and settings.
                  </Text>
                  <Pressable
                    data-testid="export-data-button"
                    onPress={handleExportData}
                    disabled={isExporting}
                    className="rounded-2xl overflow-hidden active:opacity-80 mb-5"
                    style={{ opacity: isExporting ? 0.6 : 1 }}
                  >
                    <View
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 24,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: hexToRgba(Colors.primary, 0.15),
                        borderWidth: 1,
                        borderColor: hexToRgba(Colors.primary, 0.2),
                        borderRadius: 16,
                      }}
                    >
                      <Download
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          color: "#FFFFFF",
                          fontSize: 15,
                        }}
                      >
                        {isExporting ? "Exporting..." : "Export as CSV"}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Divider */}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "rgba(239, 68, 68, 0.2)",
                      marginBottom: 16,
                    }}
                  />

                  {/* Reset All Data */}
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#EF4444",
                      fontSize: 15,
                      marginBottom: 4,
                    }}
                  >
                    Reset All Data
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 13,
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
                    className="rounded-2xl overflow-hidden active:opacity-80"
                  >
                    <LinearGradient
                      colors={["#EF4444", "#DC2626"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 24,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          color: "#FFFFFF",
                          fontSize: 15,
                        }}
                      >
                        Reset All Data
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* PIN Change Modal */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View
            className="rounded-3xl p-6 w-full max-w-md"
            style={{
              backgroundColor: Colors.surfaceHighlight,
              ...Shadows.large,
            }}
          >
            <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
            {/* Header with centered title */}
            <View
              style={{
                position: "relative",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                className="text-2xl font-bold text-center"
                style={{
                  fontFamily: "Inter_700Bold",
                  color: Colors.textPrimary,
                }}
              >
                Change PIN
              </Text>
              <Pressable
                onPress={() => setPinModalVisible(false)}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(139, 92, 246, 0.15)"
                    : "#F3F4F6",
                  position: "absolute",
                  right: 0,
                  top: 0,
                }}
              >
                <X size={18} color={Colors.textPrimary} />
              </Pressable>
            </View>

            {/* Step indicator */}
            <View className="flex-row justify-center items-center gap-2 mb-4">
              <View
                className="w-8 h-2 rounded-full"
                style={{ backgroundColor: Colors.primary }}
              />
              <View
                className="w-8 h-2 rounded-full"
                style={{
                  backgroundColor:
                    pinStep === "new"
                      ? Colors.primary
                      : isDarkMode
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.15)",
                }}
              />
            </View>

            <Text
              className="text-center text-base mb-6"
              style={{ color: Colors.textSecondary }}
            >
              {pinStep === "current"
                ? "Confirm your old PIN"
                : "Enter your new PIN"}
            </Text>

            {/* PIN Input Display */}
            <View className="flex-row justify-center mb-6 gap-3">
              {[0, 1, 2, 3].map((index) => {
                const currentValue =
                  pinStep === "current" ? currentPin : newPin;
                const isFilled = index < currentValue.length;
                return (
                  <View
                    key={index}
                    className="w-14 h-14 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: isFilled
                        ? Colors.primary
                        : isDarkMode
                          ? "rgba(139, 92, 246, 0.15)"
                          : "#F3F4F6",
                      borderWidth: 2,
                      borderColor: isFilled ? Colors.primary : "transparent",
                    }}
                  >
                    {isFilled && (
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: "#FFFFFF" }}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Number Pad */}
            <View className="mb-4">
              <View className="flex-row justify-center gap-3 mb-3">
                {[1, 2, 3].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => {
                      const currentValue =
                        pinStep === "current" ? currentPin : newPin;
                      if (currentValue.length < 4) {
                        tapHaptic();
                        handlePinInput(currentValue + num.toString());
                      }
                    }}
                    className="w-16 h-16 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: isDarkMode
                        ? "rgba(139, 92, 246, 0.15)"
                        : "#F3F4F6",
                    }}
                  >
                    <Text
                      className="text-2xl font-bold"
                      style={{
                        color: Colors.textPrimary,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row justify-center gap-3 mb-3">
                {[4, 5, 6].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => {
                      const currentValue =
                        pinStep === "current" ? currentPin : newPin;
                      if (currentValue.length < 4) {
                        tapHaptic();
                        handlePinInput(currentValue + num.toString());
                      }
                    }}
                    className="w-16 h-16 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: isDarkMode
                        ? "rgba(139, 92, 246, 0.15)"
                        : "#F3F4F6",
                    }}
                  >
                    <Text
                      className="text-2xl font-bold"
                      style={{
                        color: Colors.textPrimary,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row justify-center gap-3 mb-3">
                {[7, 8, 9].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => {
                      const currentValue =
                        pinStep === "current" ? currentPin : newPin;
                      if (currentValue.length < 4) {
                        tapHaptic();
                        handlePinInput(currentValue + num.toString());
                      }
                    }}
                    className="w-16 h-16 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: isDarkMode
                        ? "rgba(139, 92, 246, 0.15)"
                        : "#F3F4F6",
                    }}
                  >
                    <Text
                      className="text-2xl font-bold"
                      style={{
                        color: Colors.textPrimary,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row justify-center gap-3">
                <View className="w-16 h-16" />
                <Pressable
                  onPress={() => {
                    const currentValue =
                      pinStep === "current" ? currentPin : newPin;
                    if (currentValue.length < 4) {
                      tapHaptic();
                      handlePinInput(currentValue + "0");
                    }
                  }}
                  className="w-16 h-16 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor: isDarkMode
                      ? "rgba(139, 92, 246, 0.15)"
                      : "#F3F4F6",
                  }}
                >
                  <Text
                    className="text-2xl font-bold"
                    style={{
                      color: Colors.textPrimary,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    0
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    const currentValue =
                      pinStep === "current" ? currentPin : newPin;
                    handlePinInput(currentValue.slice(0, -1));
                  }}
                  className="w-16 h-16 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor: isDarkMode
                      ? "rgba(139, 92, 246, 0.15)"
                      : "#F3F4F6",
                  }}
                >
                  <X size={24} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handlePinChange}
              disabled={
                (pinStep === "current" && currentPin.length !== 4) ||
                (pinStep === "new" && newPin.length !== 4)
              }
              className="rounded-2xl overflow-hidden"
              style={{
                opacity:
                  (pinStep === "current" && currentPin.length !== 4) ||
                  (pinStep === "new" && newPin.length !== 4)
                    ? 0.5
                    : 1,
              }}
            >
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 16, alignItems: "center" }}
              >
                <Text
                  className="text-white text-lg font-bold"
                  style={{ fontFamily: "Inter_700Bold" }}
                >
                  {pinStep === "new" ? "Change PIN" : "Continue"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

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
            <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
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
                Sign Out
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
                className="rounded-2xl overflow-hidden mb-3"
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
                    Yes, Sign Out
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={cancelSignOut}
                className="rounded-2xl py-4 items-center border-2"
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
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View
            className="rounded-3xl p-6 w-full max-w-md"
            style={{
              backgroundColor: Colors.surfaceHighlight,
              ...Shadows.large,
            }}
          >
            <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(239, 68, 68, 0.15)"
                    : "#FEE2E2",
                }}
              >
                <AlertTriangle size={32} color="#DC2626" strokeWidth={2} />
              </View>
              <Text
                className="text-2xl font-bold mb-2"
                style={{
                  fontFamily: "Inter_700Bold",
                  color: Colors.textPrimary,
                }}
              >
                {resetStep === 1 ? "Reset All Data?" : "Are you sure?"}
              </Text>
              <Text
                className="text-center text-base"
                style={{ color: Colors.textSecondary, lineHeight: 22 }}
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
                style={{ backgroundColor: "#EF4444" }}
              />
              <View
                className="w-8 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    resetStep === 2 ? "#EF4444" : "rgba(255,255,255,0.2)",
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
                className="rounded-2xl overflow-hidden mb-3"
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
                    {resetStep === 1
                      ? "Yes, Reset Everything"
                      : "Delete All Data Now"}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                data-testid="cancel-reset-button"
                onPress={cancelReset}
                className="rounded-2xl py-4 items-center border-2"
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
