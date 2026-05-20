/**
 * Standalone Paywall
 *
 * Shown post-onboarding when the user's subscription has lapsed or cannot be verified.
 * Annual plan only in primary view.
 * Monthly plan is reserved as an exit-offer modal if users attempt to leave.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { tapHaptic, successHaptic, errorHaptic } from "@/lib/haptics";
import {
  Unlock,
  BellRing,
  CreditCard,
  Check,
  Moon,
  Smile,
  Brain,
  BookOpen,
  Heart,
  Mic,
  Activity,
  ChevronRight,
  Star,
  Users,
  X,
  type LucideIcon,
} from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from "@/lib/revenuecatClient";
import type { PurchasesPackage } from "@/lib/revenuecatClient";
import { NotificationService } from "@/lib/services/notification-service";

// ── Pricing constants ─────────────────────────────────────────────────────────
const MONTHLY_PRICE = "$9.99";
const YEARLY_PRICE = "$79.99";
const YEARLY_FULL = "$119.88";
const YEARLY_SAVING = "33%";

// ── Benefits list ─────────────────────────────────────────────────────────────
const BENEFITS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Brain,
    title: "Reduced Anxiety",
    description:
      "Expressing thoughts out loud reduces the mental load of worry, quieting your anxious mind within days.",
  },
  {
    icon: Moon,
    title: "Better Sleep",
    description:
      "Voice journaling before bed clears mental chatter, helping you fall asleep faster and wake up refreshed.",
  },
  {
    icon: Activity,
    title: "Voice Intelligence",
    description:
      "The only journaling app that reads your voice pace, speed, and tone to surface insights you'd never notice yourself.",
  },
  {
    icon: Smile,
    title: "Improved Mood",
    description:
      "Daily emotional check-ins create awareness of your mood patterns, giving you tools to shift your state.",
  },
  {
    icon: BookOpen,
    title: "Enhanced Self-Reflection",
    description:
      "AI-powered insights reveal patterns in your entries you might never have noticed on your own.",
  },
  {
    icon: Heart,
    title: "Better Emotional Awareness",
    description:
      "Track how you feel over time and discover what truly impacts your emotional wellbeing.",
  },
  {
    icon: Mic,
    title: "Always-On Transcription",
    description:
      "The most persistent and reliable voice transcription service on the market — always ready when you are.",
  },
];

const TESTIMONIAL = {
  text: "\"I used to lie awake replaying every conversation. Two weeks in and my mind is finally quiet at night.\"",
  author: "— Alex M., VocoLens user",
};


// ── Benefits carousel ─────────────────────────────────────────────────────────
function BenefitsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardOpacity = useSharedValue(1);

  const transitionTo = useCallback((next: number) => {
    cardOpacity.value = withTiming(0, { duration: 800 }, () => {
      runOnJS(setDisplayIndex)(next);
      cardOpacity.value = withTiming(1, { duration: 800 });
    });
    setActiveIndex(next);
  }, []);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % BENEFITS.length;
        transitionTo(next);
        return next;
      });
    }, 3500);
  }, [transitionTo]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));
  const benefit = BENEFITS[displayIndex];
  const Icon = benefit.icon;

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
      {/* Section title */}
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 18 }}>
          What you'll gain
        </Text>
      </View>

      {/* Crossfading benefit card */}
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "flex-start",
            backgroundColor: "rgba(255,255,255,0.10)",
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            minHeight: 96,
          },
          cardStyle,
        ]}
      >
        <View
          style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center", justifyContent: "center",
            marginRight: 14, flexShrink: 0,
          }}
        >
          <Icon size={20} color="#FFFFFF" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 5 }}>
            {benefit.title}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 }}>
            {benefit.description}
          </Text>
        </View>
      </Animated.View>

      {/* Dot indicators */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
        {BENEFITS.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              transitionTo(i);
              startAutoPlay();
            }}
          >
            <View
              style={{
                width: i === activeIndex ? 20 : 6, height: 6, borderRadius: 3,
                backgroundColor: i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.35)",
              }}
            />
          </Pressable>
        ))}
      </View>

      {/* Testimonial */}
      <View
        style={{
          marginTop: 14,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <View style={{ flexDirection: "row", gap: 2, marginBottom: 6 }}>
          {[0,1,2,3,4].map((i) => (
            <Star key={i} size={11} color="#FFD700" fill="#FFD700" strokeWidth={0} />
          ))}
        </View>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, fontStyle: "italic" }}>
          {TESTIMONIAL.text}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 6 }}>
          {TESTIMONIAL.author}
        </Text>
      </View>
    </View>
  );
}


// ── Monthly Exit-Offer Modal ──────────────────────────────────────────────────
function MonthlyExitModal({
  visible,
  themeColors,
  onAccept,
  onDecline,
  isPurchasing,
}: {
  visible: boolean;
  themeColors: (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
  onAccept: () => void;
  onDecline: () => void;
  isPurchasing: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <LinearGradient
          colors={[themeColors.secondary, themeColors.gradientEnd]}
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 17 }}>
              Wait — one more option
            </Text>
            <Pressable onPress={onDecline} hitSlop={12}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
            Not ready for annual? Try VocoLens monthly — no long-term commitment, cancel anytime.
          </Text>

          <View
            style={{
              borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
              backgroundColor: "rgba(255,255,255,0.12)",
              paddingVertical: 14, paddingHorizontal: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontFamily: "Inter_700Bold", fontSize: 11, marginBottom: 2 }}>
                Monthly Plan
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 22 }}>
                  {MONTHLY_PRICE}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  / month
                </Text>
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular", fontSize: 11 }}>
              Cancel anytime
            </Text>
          </View>

          <Pressable
            onPress={onAccept}
            disabled={isPurchasing}
            style={{
              borderRadius: 14, borderWidth: 2, borderColor: "#FFFFFF",
              paddingVertical: 14, alignItems: "center",
              opacity: isPurchasing ? 0.75 : 1, marginBottom: 10,
            }}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                Start monthly plan
              </Text>
            )}
          </Pressable>

          <Pressable onPress={onDecline} style={{ alignItems: "center", paddingTop: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular", fontSize: 13 }}>
              No thanks, exit
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}


// ── Main StandalonePaywall component ─────────────────────────────────────────
export function StandalonePaywall() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const notificationPreferences = useOnboardingStore((s) => s.notificationPreferences);
  const themeColors = THEME_COLORS[selectedTheme];
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchasingMonthly, setIsPurchasingMonthly] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (!isRevenueCatEnabled()) return;
    getOfferings().then((result) => {
      if (!result.ok || !result.data.current) return;
      const pkgs = result.data.current.availablePackages;
      setMonthlyPackage(pkgs.find((p) => p.identifier === "$rc_monthly") ?? null);
      setYearlyPackage(pkgs.find((p) => p.identifier === "$rc_annual") ?? null);
    });
  }, []);

  const grantYearly = (expirationDate?: string | null) => {
    successHaptic();
    setSubscription(true, "yearly");
    NotificationService.scheduleTrialEndReminder(expirationDate ?? null);
  };

  const grantMonthly = () => {
    successHaptic();
    setSubscription(true, "monthly");
    setShowExitModal(false);
    if (notificationPreferences?.time && notificationPreferences.days.length > 0) {
      NotificationService.rescheduleFromPreferences(
        notificationPreferences.time,
        notificationPreferences.days,
        true,
      );
    }
  };

  const handleContinue = async () => {
    tapHaptic();
    if (!isRevenueCatEnabled()) {
      grantYearly(null);
      return;
    }
    if (!yearlyPackage) {
      grantYearly(null);
      return;
    }
    setIsPurchasing(true);
    const result = await purchasePackage(yearlyPackage);
    setIsPurchasing(false);
    if (result.ok) {
      grantYearly(result.data.entitlements.active?.["premium"]?.expirationDate);
    } else if (result.reason === "sdk_error") {
      const userCancelled = (result.error as any)?.userCancelled === true;
      if (userCancelled) {
        errorHaptic();
      } else {
        grantYearly(null);
      }
    }
  };

  const handleMonthlyAccept = async () => {
    tapHaptic();
    if (!isRevenueCatEnabled()) {
      grantMonthly();
      return;
    }
    if (!monthlyPackage) {
      grantMonthly();
      return;
    }
    setIsPurchasingMonthly(true);
    const result = await purchasePackage(monthlyPackage);
    setIsPurchasingMonthly(false);
    if (result.ok) {
      grantMonthly();
    } else if (result.reason === "sdk_error") {
      const userCancelled = (result.error as any)?.userCancelled === true;
      if (!userCancelled) {
        errorHaptic();
        Alert.alert("Payment Error", "Something went wrong processing your payment. Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    if (!isRevenueCatEnabled()) return;
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);
    if (result.ok) {
      const isActive = Boolean(result.data.entitlements.active?.["premium"]);
      if (isActive) {
        successHaptic();
        setSubscription(true);
        if (notificationPreferences?.time && notificationPreferences.days.length > 0) {
          NotificationService.rescheduleFromPreferences(
            notificationPreferences.time,
            notificationPreferences.days,
            true,
          );
        }
      } else {
        errorHaptic();
        Alert.alert("No Active Subscription", "We couldn't find an active subscription to restore.");
      }
    } else {
      errorHaptic();
      Alert.alert("Restore Failed", "We couldn't find any previous purchases to restore.");
    }
  };

  const timelineSteps: { icon: LucideIcon; label: string; sublabel: string }[] = [
    { icon: Unlock,    label: "Today",                       sublabel: "Unlock all features instantly." },
    { icon: BellRing,  label: "In 2 Days — Reminder",        sublabel: "We'll remind you before your trial ends." },
    { icon: CreditCard, label: "In 3 Days — Billing Starts", sublabel: "You'll be charged unless you cancel." },
  ];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 280 }}
          >
            {/* Header */}
            <Animated.View
              entering={FadeInDown.delay(50).duration(600)}
              style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 10, alignItems: "center" }}
            >
              <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 22, textAlign: "center", lineHeight: 30, letterSpacing: 0.2, opacity: 0.92 }}>
                Start your 3-day FREE trial{"\n"}to continue.
              </Text>
              {/* Social proof pill */}
              <View
                style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
                  marginTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Users size={12} color="rgba(255,255,255,0.8)" strokeWidth={2} />
                <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  Join 500+ users sleeping better &amp; feeling calmer
                </Text>
              </View>
            </Animated.View>

            {/* 1 ── Benefits + testimonial */}
            <Animated.View entering={FadeInUp.delay(150).duration(500)}>
              <BenefitsCarousel />
            </Animated.View>

            {/* 2 ── Trial timeline */}
            <Animated.View
              entering={FadeInUp.delay(250).duration(500)}
              style={{
                marginHorizontal: 24, borderRadius: 24, padding: 20, marginBottom: 20,
                backgroundColor: "rgba(255,255,255,0.13)",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
              }}
            >
              {timelineSteps.map((step, i) => {
                const Icon = step.icon;
                const isLast = i === timelineSteps.length - 1;
                return (
                  <View key={i} style={{ flexDirection: "row", alignItems: "stretch" }}>
                    <View style={{ alignItems: "center", marginRight: 16, width: 44 }}>
                      <View
                        style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: "rgba(255,255,255,0.18)",
                          alignItems: "center", justifyContent: "center",
                          borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)",
                        }}
                      >
                        <Icon size={20} color="#FFFFFF" strokeWidth={2} />
                      </View>
                      {!isLast && (
                        <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 }} />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16, paddingTop: 2 }}>
                      <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 3 }}>
                        {step.label}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 22 }}>
                        {step.sublabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          </ScrollView>

          {/* ── Fixed bottom ─────────────────────────────────────────────── */}
          <LinearGradient
            colors={[themeColors.secondary, themeColors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28,
              borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)",
            }}
          >
            {/* Annual card */}
            <View style={{ marginBottom: 12 }}>
              <Pressable
                style={{
                  borderRadius: 20, borderWidth: 2.5, borderColor: "#FFFFFF",
                  backgroundColor: "rgba(255,255,255,0.20)", padding: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 7 }}>
                    <View style={{ backgroundColor: "#FFFFFF", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ color: themeColors.primary, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.6 }}>
                        3 DAYS FREE
                      </Text>
                    </View>
                    <View style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.4 }}>
                        SAVE {YEARLY_SAVING}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                    <Check size={13} color={themeColors.primary} strokeWidth={3} />
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_700Bold", fontSize: 12, marginBottom: 3 }}>Annual</Text>
                    <Text style={{ color: "#FFFFFF", fontFamily: "Fraunces_700Bold", fontSize: 28 }}>{YEARLY_PRICE}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", paddingBottom: 4 }}>
                    <Text style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular", fontSize: 12, textDecorationLine: "line-through" }}>
                      {YEARLY_FULL}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
                      ~$6.67 / month
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleContinue}
              disabled={isPurchasing}
              style={{
                width: "100%", borderRadius: 16, borderWidth: 2, borderColor: "#FFFFFF",
                shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25, shadowRadius: 16,
                elevation: Platform.OS === "android" ? 0 : 8,
                opacity: isPurchasing ? 0.75 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16 }}>
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={{ color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold", marginRight: 6 }}>
                      Try free for 3 days
                    </Text>
                    <ChevronRight size={20} color="#FFFFFF" />
                  </>
                )}
              </View>
            </Pressable>

            {/* No payment due now */}
            <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", marginTop: 6 }}>
              No payment due now · {YEARLY_PRICE}/yr after trial · Cancel anytime
            </Text>

            {/* Restore */}
            <Pressable onPress={handleRestore} disabled={isRestoring} style={{ marginTop: 10, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular", fontSize: 12 }}>
                {isRestoring ? "Restoring…" : "Restore purchases"}
              </Text>
            </Pressable>
          </LinearGradient>
        </SafeAreaView>
      </LinearGradient>

      {/* Exit-offer monthly modal */}
      <MonthlyExitModal
        visible={showExitModal}
        themeColors={themeColors}
        onAccept={handleMonthlyAccept}
        onDecline={() => setShowExitModal(false)}
        isPurchasing={isPurchasingMonthly}
      />
    </View>
  );
}
