/**
 * Onboarding Screen 9: Notification Preferences Screen
 *
 * - Day-of-week selector row (Mon–Sun pill buttons)
 * - Tap-to-open time picker (native DateTimePicker)
 * - Timezone auto-detected from device
 * - Connects to NotificationService.scheduleWeeklyNotifications()
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  Alert,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { tapHaptic, selectHaptic, confirmHaptic, selectionHaptic } from "@/lib/haptics";
import { Clock, Bell, BellOff, Check } from "lucide-react-native";
// DateTimePicker removed — replaced by custom TimeWheelPicker below
import useOnboardingStore, {
  THEME_COLORS,
  DayOfWeek,
} from "@/lib/state/onboarding-store";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

// ─── Custom branded scroll-wheel time picker ──────────────────────────────────
// Renders three snap-scrolling columns: Hour · Minute · AM/PM.
// Fully styled from the caller-supplied primaryColor — no native OS picker used.

const ITEM_H = 52;   // height of each wheel row
const VISIBLE = 5;   // odd number so the centre cell is the selected one
const WHEEL_H = ITEM_H * VISIBLE;
const PAD     = ITEM_H * Math.floor(VISIBLE / 2); // top/bottom padding

const HOURS   = Array.from({ length: 12 },  (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 },  (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  primaryColor: string;
  width: number;
}

function WheelColumn({ items, selectedIndex, onSelect, primaryColor, width }: WheelColumnProps) {
  const scrollRef     = useRef<ScrollView>(null);
  const lastHapticIdx = useRef(selectedIndex);

  // Scroll to selected item whenever it changes externally (e.g. initial mount)
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, [selectedIndex]);

  // Fire a selection haptic every time the scroll crosses into a new item slot
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (clamped !== lastHapticIdx.current) {
        lastHapticIdx.current = clamped;
        selectionHaptic();
      }
    },
    [items.length],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      onSelect(clamped);
    },
    [items.length, onSelect],
  );

  return (
    <View style={{ width, height: WHEEL_H, overflow: "hidden" }}>
      {/* Selection highlight band behind the centre row */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: PAD,
          left: 4,
          right: 4,
          height: ITEM_H,
          borderRadius: 14,
          backgroundColor: primaryColor + "30",
          borderWidth: 1.5,
          borderColor: primaryColor + "70",
          zIndex: 1,
        }}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingTop: PAD, paddingBottom: PAD }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={ITEM_H / 2}   // fires roughly every half-item — enough for per-item haptics
        bounces={false}
      >
        {items.map((label, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={label + i}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              style={{
                height: ITEM_H,
                width,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: isSelected ? "Inter_700Bold" : "Inter_400Regular",
                  fontSize: isSelected ? 28 : 22,
                  color: "#FFFFFF",
                  opacity: isSelected ? 1 : 0.35,
                  letterSpacing: isSelected ? 0.5 : 0,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

    </View>
  );
}

interface TimeWheelPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  primaryColor: string;
}

function TimeWheelPicker({ value, onChange, primaryColor }: TimeWheelPickerProps) {
  const rawHour   = value.getHours();
  const period    = rawHour >= 12 ? 1 : 0;                  // 0=AM 1=PM
  const hour12    = rawHour % 12 === 0 ? 12 : rawHour % 12; // 1-12
  const hourIdx   = hour12 - 1;                             // 0-11
  const minuteIdx = value.getMinutes();                     // 0-59

  const emit = useCallback(
    (hIdx: number, mIdx: number, pIdx: number) => {
      const h12    = hIdx + 1;
      const hour24 = pIdx === 1
        ? h12 === 12 ? 12 : h12 + 12
        : h12 === 12 ? 0  : h12;
      const d = new Date(value);
      d.setHours(hour24, mIdx, 0, 0);
      onChange(d);
    },
    [value, onChange],
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      {/* Hours */}
      <WheelColumn
        items={HOURS}
        selectedIndex={hourIdx}
        onSelect={(i) => emit(i, minuteIdx, period)}
        primaryColor={primaryColor}
        width={80}
      />

      {/* Colon separator */}
      <Text
        style={{
          color: "rgba(255,255,255,0.60)",
          fontSize: 28,
          fontFamily: "Inter_700Bold",
          marginBottom: 4,
          width: 16,
          textAlign: "center",
        }}
      >
        :
      </Text>

      {/* Minutes */}
      <WheelColumn
        items={MINUTES}
        selectedIndex={minuteIdx}
        onSelect={(i) => emit(hourIdx, i, period)}
        primaryColor={primaryColor}
        width={80}
      />

      {/* Thin divider */}
      <View style={{ width: 12 }} />

      {/* AM/PM */}
      <WheelColumn
        items={PERIODS}
        selectedIndex={period}
        onSelect={(i) => emit(hourIdx, minuteIdx, i)}
        primaryColor={primaryColor}
        width={64}
      />
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
  const [timezone] = useState(getNotificationService().getLocalTimezone());

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      await getNotificationService().checkPermissions();
    } catch (e) {
      console.warn('[NotificationPreferences] checkPermissions error (Expo Go):', (e as Error)?.message);
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

  // Saves the selected time and schedules notifications — called by X button.
  const handleCancelTime = async () => {
    playClickSound();
    confirmHaptic();
    setSelectedTime(tempTime);
    setShowTimePicker(false);

    if (enableNotifications && selectedDays.size > 0) {
      try {
        const timeString = getNotificationService().getTimeString(tempTime);
        const daysArray = Array.from(selectedDays);
        await getNotificationService().scheduleWeeklyNotifications(
          timeString,
          daysArray,
        );
      } catch (e) {
        console.warn('[NotificationPreferences] handleCancelTime scheduling error:', (e as Error)?.message);
      }
    }
  };

  // ---------- toggle ----------
  const handleToggleNotifications = async () => {
    playClickSound();
    tapHaptic();

    if (!enableNotifications) {
      const status = await getNotificationService().requestPermissions();
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
                Your journaling time
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
                      textAlign: "left",
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
          animationType="slide"
          onRequestClose={handleCancelTime}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.60)",
              justifyContent: "flex-end",
            }}
          >
            <LinearGradient
              colors={themeColors.backgroundGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingTop: 16,
                paddingBottom: Platform.OS === "ios" ? 44 : 32,
                paddingHorizontal: 24,
                borderTopWidth: 1.5,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              {/* Header row: X dismiss (left) + title (centre) */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                {/* Check — saves and closes */}
                <Pressable
                  onPress={handleCancelTime}
                  hitSlop={12}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.10)",
                    borderWidth: 1.5,
                    borderColor: "rgba(255,255,255,0.22)",
                  })}
                  accessibilityLabel="Confirm"
                  accessibilityRole="button"
                >
                  <Check size={18} color="rgba(255,255,255,0.80)" strokeWidth={2.5} />
                </Pressable>

                {/* Title — centred in remaining space */}
                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Fraunces_700Bold",
                    color: "#FFFFFF",
                    fontSize: 20,
                    textAlign: "center",
                    opacity: 0.95,
                    marginRight: 36, // balance the X width so text is truly centred
                  }}
                >
                  What time works for you?
                </Text>
              </View>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.60)",
                  fontSize: 13,
                  textAlign: "center",
                  marginBottom: 28,
                }}
              >
                We'll send your reminder at this time
              </Text>

              {/* Branded scroll-wheel picker — X button saves and closes */}
              <TimeWheelPicker
                value={tempTime}
                onChange={setTempTime}
                primaryColor={themeColors.primary}
              />
            </LinearGradient>
          </View>
        </Modal>
      )}
    </View>
  );
}
