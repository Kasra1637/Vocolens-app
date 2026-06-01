/**
 * Onboarding Screen 9: Notification Preferences Screen
 *
 * - Day-of-week selector row (Mon–Sun pill buttons)
 * - Tap-to-open time picker (native DateTimePicker)
 * - Timezone auto-detected from device
 * - Connects to NotificationService.scheduleWeeklyNotifications()
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic, confirmHaptic } from "@/lib/haptics";
import { Clock, Bell, BellOff } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import useOnboardingStore, {
  THEME_COLORS,
  DayOfWeek,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
function getNotificationService() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@/lib/services/notification-service').NotificationService as typeof import('@/lib/services/notification-service').NotificationService;
  } catch (e) {
    console.warn('[NotificationPreferences] notification-service not available:', (e as Error)?.message);
    // Return a safe stub that won't crash the app in Expo Go
    return {
      checkPermissions: async () => ({ granted: false, canAskAgain: false, status: 'denied' as const }),
      requestPermissions: async () => ({ granted: false, canAskAgain: false, status: 'denied' as const }),
      scheduleWeeklyNotifications: async () => [] as string[],
      cancelAllNotifications: async () => {},
      getTimeString: (date: Date) => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
      getLocalTimezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    } as any;
  }
}

const ALL_DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "M" },
  { key: "tuesday", label: "Tuesday", short: "T" },
  { key: "wednesday", label: "Wednesday", short: "W" },
  { key: "thursday", label: "Thursday", short: "Th" },
  { key: "friday", label: "Friday", short: "F" },
  { key: "saturday", label: "Saturday", short: "Sa" },
  { key: "sunday", label: "Sunday", short: "Su" },
];

const WEEKDAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];
const WEEKEND: DayOfWeek[] = ["saturday", "sunday"];
const EVERYDAY: DayOfWeek[] = ALL_DAYS.map((d) => d.key);

export function NotificationPreferencesScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setNotificationPreferences = useOnboardingStore(
    (s) => s.setNotificationPreferences,
  );
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedTime, setSelectedTime] = useState<Date>(
    new Date(new Date().setHours(20, 0, 0, 0)),
  );
  const [tempTime, setTempTime] = useState<Date>(
    new Date(new Date().setHours(20, 0, 0, 0)),
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(
    new Set(EVERYDAY),
  );
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");
  const [timezone] = useState(getNotificationService().getLocalTimezone());

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const status = await getNotificationService().checkPermissions();
      setPermissionStatus(status.status);
    } catch (e) {
      console.warn('[NotificationPreferences] checkPermissions error (Expo Go):', (e as Error)?.message);
      setPermissionStatus('denied');
    }
  };

  // ---------- day helpers ----------
  const toggleDay = (day: DayOfWeek) => {
    playClickSound();
    tapHaptic();
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        // Always keep at least one day selected
        if (next.size === 1) return prev;
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const applyPreset = (preset: "everyday" | "weekdays" | "weekends") => {
    playClickSound();
    selectHaptic();
    if (preset === "everyday") setSelectedDays(new Set(EVERYDAY));
    else if (preset === "weekdays") setSelectedDays(new Set(WEEKDAYS));
    else setSelectedDays(new Set(WEEKEND));
  };

  const isPresetActive = (preset: "everyday" | "weekdays" | "weekends") => {
    if (preset === "everyday")
      return (
        EVERYDAY.every((d) => selectedDays.has(d)) &&
        selectedDays.size === EVERYDAY.length
      );
    if (preset === "weekdays")
      return (
        WEEKDAYS.every((d) => selectedDays.has(d)) &&
        selectedDays.size === WEEKDAYS.length
      );
    if (preset === "weekends")
      return (
        WEEKEND.every((d) => selectedDays.has(d)) &&
        selectedDays.size === WEEKEND.length
      );
    return false;
  };

  // ---------- time helpers ----------
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const handleShowTimePicker = () => {
    playClickSound();
    tapHaptic();
    setTempTime(selectedTime);
    setShowTimePicker(true);
  };

  const handleConfirmTime = () => {
    playClickSound();
    confirmHaptic();
    setSelectedTime(tempTime);
    setShowTimePicker(false);
  };

  const handleCancelTime = () => {
    playClickSound();
    tapHaptic();
    setShowTimePicker(false);
  };

  // ---------- toggle ----------
  const handleToggleNotifications = async () => {
    playClickSound();
    tapHaptic();

    if (!enableNotifications) {
      const status = await getNotificationService().requestPermissions();
      setPermissionStatus(status.status);
      if (status.granted) {
        setEnableNotifications(true);
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive daily reminders.",
          [{ text: "OK" }],
        );
      }
    } else {
      setEnableNotifications(false);
    }
  };

  // ---------- continue ----------
  const handleContinue = async () => {
    playClickSound();
    confirmHaptic();

    const timeString = getNotificationService().getTimeString(selectedTime);
    const daysArray = enableNotifications ? Array.from(selectedDays) : [];

    setNotificationPreferences({
      days: daysArray,
      time: enableNotifications ? timeString : null,
    });

    if (enableNotifications && daysArray.length > 0) {
      const ids = await getNotificationService().scheduleWeeklyNotifications(
        timeString,
        daysArray,
      );
      console.log(
        `Scheduled ${ids.length} notifications for ${daysArray.join(", ")} at ${timeString} (${timezone})`,
      );
    } else {
      await getNotificationService().cancelAllNotifications();
    }

    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  // ---------- render ----------
  const PRESET_LABELS = ["everyday", "weekdays", "weekends"] as const;

  return (
    <View className="flex-1">
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <ScrollView
            className="flex-1 px-6 py-2"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Character */}
            <View
              className="items-center justify-center"
              style={{ height: 80 }}
            >
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Title */}
            <Animated.View
              entering={FadeIn.delay(200).duration(900).easing(SOFT)}
              className="items-center mb-3"
            >
              <Text
                className="text-center mb-1"
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                  lineHeight: 38,
                }}
              >
                Set your journaling time
              </Text>
              <Text
                className="text-sm text-center px-2"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: "Inter_400Regular",
                }}
              >
                Choose which days and when to get reminders
              </Text>
            </Animated.View>

            {/* Enable / Disable toggle */}
            <Animated.View
              entering={FadeIn.delay(300).duration(800).easing(SOFT)}
              className="mb-4"
            >
              <Pressable
                onPress={handleToggleNotifications}
                style={{
                  borderRadius: 18,
                  backgroundColor: enableNotifications
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(255,255,255,0.10)",
                  borderWidth: 2,
                  borderColor: enableNotifications
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.18)",
                }}
              >
                <View className="flex-row items-center justify-between p-4">
                  <View className="flex-row items-center flex-1">
                    {enableNotifications ? (
                      <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
                    ) : (
                      <BellOff
                        size={22}
                        color="rgba(255,255,255,0.45)"
                        strokeWidth={2.5}
                      />
                    )}
                    <View className="ml-3 flex-1">
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 15,
                        }}
                      >
                        {enableNotifications ? "Reminders on" : "Reminders off"}
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                        }}
                      >
                        Tap to {enableNotifications ? "disable" : "enable"}
                      </Text>
                    </View>
                  </View>
                  {/* pill indicator */}
                  <View
                    style={{
                      width: 48,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: enableNotifications
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(255,255,255,0.12)",
                      justifyContent: "center",
                      alignItems: enableNotifications
                        ? "flex-end"
                        : "flex-start",
                      paddingHorizontal: 3,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "#FFFFFF",
                        opacity: enableNotifications ? 1 : 0.5,
                      }}
                    />
                  </View>
                </View>
              </Pressable>
            </Animated.View>

            {enableNotifications && (
              <>
                {/* ---- Day selector ---- */}
                <Animated.View
                  entering={FadeIn.delay(380).duration(800).easing(SOFT)}
                  className="mb-4"
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      color: "#FFFFFF",
                      fontSize: 14,
                      marginBottom: 10,
                      opacity: 0.9,
                    }}
                  >
                    Reminder days
                  </Text>

                  {/* Day pills */}
                  <View className="flex-row justify-between">
                    {ALL_DAYS.map((day) => {
                      const active = selectedDays.has(day.key);
                      return (
                        <Pressable
                          key={day.key}
                          onPress={() => toggleDay(day.key)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: active
                              ? "rgba(255,255,255,0.28)"
                              : "rgba(255,255,255,0.08)",
                            borderWidth: 1.5,
                            borderColor: active
                              ? "rgba(255,255,255,0.65)"
                              : "rgba(255,255,255,0.18)",
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontFamily: active
                                ? "Inter_700Bold"
                                : "Inter_400Regular",
                              fontSize: 12,
                              opacity: active ? 1 : 0.55,
                            }}
                          >
                            {day.short}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Selected days summary */}
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    {selectedDays.size === 7
                      ? "Every day"
                      : selectedDays.size === 0
                        ? "No days selected"
                        : `${selectedDays.size} day${selectedDays.size > 1 ? "s" : ""} selected`}
                  </Text>
                </Animated.View>

                {/* ---- Time picker button ---- */}
                <Animated.View
                  entering={FadeIn.delay(450).duration(800).easing(SOFT)}
                  className="mb-2"
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      color: "#FFFFFF",
                      fontSize: 14,
                      marginBottom: 10,
                      opacity: 0.9,
                    }}
                  >
                    Reminder time
                  </Text>

                  <Pressable
                    onPress={handleShowTimePicker}
                    style={{
                      borderRadius: 20,
                      backgroundColor: "rgba(255,255,255,0.18)",
                      borderWidth: 2,
                      borderColor: "rgba(255,255,255,0.45)",
                      paddingVertical: 20,
                      paddingHorizontal: 24,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View className="flex-row items-center">
                      <Clock
                        size={22}
                        color="#FFFFFF"
                        strokeWidth={2}
                        style={{ marginRight: 12 }}
                      />
                      <Text
                        style={{
                          fontFamily: "Fraunces_700Bold",
                          color: "#FFFFFF",
                          fontSize: 32,
                        }}
                      >
                        {formatTime(selectedTime)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                      }}
                    >
                      Tap to edit
                    </Text>
                  </Pressable>
                </Animated.View>

                {/* Timezone info removed per design update */}
              </>
            )}

            {/* Disabled state */}
            {!enableNotifications && (
              <Animated.View
                entering={FadeIn.delay(400).duration(800).easing(SOFT)}
                className="items-center py-10"
              >
                <BellOff
                  size={56}
                  color="rgba(255,255,255,0.25)"
                  strokeWidth={2}
                />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 15,
                    textAlign: "center",
                    marginTop: 14,
                  }}
                >
                  Notifications are disabled
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 6,
                  }}
                >
                  You can always enable them later in settings
                </Text>
              </Animated.View>
            )}

            {/* Continue button — directly below content, close to reminder time */}
            <Animated.View
              entering={FadeIn.delay(500).duration(800).easing(SOFT)}
              style={{ marginTop: 16, marginBottom: 8 }}
            >
              <OnboardingCTAButton label="Continue" onPress={handleContinue} />
            </Animated.View>
          </ScrollView>

        </SafeAreaView>
      </LinearGradient>

      {/* ---------- Time Picker Modal ---------- */}
      {showTimePicker && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={handleCancelTime}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              justifyContent: "flex-end",
            }}
          >
            <LinearGradient
              colors={[themeColors.primary, themeColors.gradientEnd]}
              style={{
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingTop: 20,
                paddingBottom: 36,
                paddingHorizontal: 24,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "#FFFFFF",
                  fontSize: 18,
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                Pick a time
              </Text>

              <DateTimePicker
                value={tempTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                textColor="#FFFFFF"
                themeVariant="dark"
                onChange={(_, date) => {
                  if (date) setTempTime(date);
                  if (Platform.OS === "android") {
                    setSelectedTime(date ?? tempTime);
                    setShowTimePicker(false);
                  }
                }}
                style={{ height: 160 }}
              />

              {Platform.OS === "ios" && (
                <View className="flex-row gap-3 mt-4">
                  <Pressable
                    onPress={handleCancelTime}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderWidth: 1.5,
                      borderColor: "rgba(255,255,255,0.3)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmTime}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.28)",
                      borderWidth: 2,
                      borderColor: "#FFFFFF",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "Inter_700Bold",
                        fontSize: 16,
                      }}
                    >
                      Confirm
                    </Text>
                  </Pressable>
                </View>
              )}
            </LinearGradient>
          </View>
        </Modal>
      )}
    </View>
  );
}
