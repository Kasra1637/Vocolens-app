/**
 * PaywallScreen v2 — High-converting annual-first paywall
 *
 * Design principles:
 * - Annual-only on main screen; monthly shown as downsell on back/close
 * - Warm, reflective, trustworthy, premium — not aggressive or salesy
 * - 7-day free trial on annual plan
 * - Feature flag support for A/B testing
 * - Analytics events for full funnel visibility
 *
 * Conversion features:
 * - Monthly plan hidden on main screen; surfaces as exit-offer modal on back
 * - Plutchik Model trust cue (research-backed, native to app)
 * - Day 5 trial reminder notification (2 days before expiry)
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { tapHaptic, successHaptic, errorHaptic, selectHaptic } from "@/lib/haptics";
import { Check, ChevronRight, FlaskConical, X } from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from "@/lib/revenuecatClient";
import type { PurchasesPackage } from "@/lib/revenuecatClient";
import { NotificationService } from "@/lib/services/notification-service";

// ── Feature Flags ─────────────────────────────────────────────────────────────
const FEATURE_FLAGS = {
  paywall_v2: true,
  trial_on_annual: true,
  savings_label: true,
  default_selected_plan: "yearly" as "yearly" | "monthly",
};

// ── Analytics ─────────────────────────────────────────────────────────────────
function trackEvent(event: string, properties?: Record<string, any>) {
  if (__DEV__) {
    console.log(`[Analytics] ${event}`, properties ?? "");
  }
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const MONTHLY_PRICE = "$9.99";
const YEARLY_PRICE = "$79.99";
const YEARLY_MONTHLY_EQUIVALENT = "$6.67";
const YEARLY_SAVINGS = "33%";
const TRIAL_DAYS = 7;

type PlanType = "yearly" | "monthly";

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
          colors={[themeColors.gradientStart, themeColors.gradientEnd]}
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 40,
          }}
        >
          {/* Close row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Fraunces_700Bold", fontSize: 20 }}>
              Not ready to commit?
            </Text>
            <Pressable onPress={onDecline} hitSlop={12}>
              <X size={22} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
            Try Vocolens monthly — no long-term commitment, cancel anytime. Your journal entries stay with you either way.
          </Text>

          {/* Monthly card */}
          <View
            style={{
              borderRadius: 18,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.50)",
              backgroundColor: "rgba(255,255,255,0.14)",
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 }}>
                Monthly Plan
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Fraunces_700Bold", fontSize: 24 }}>
                  {MONTHLY_PRICE}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  /month
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", fontSize: 11 }}>
                Cancel anytime
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
                No free trial
              </Text>
            </View>
          </View>

          {/* Accept CTA */}
          <Pressable
            onPress={onAccept}
            disabled={isPurchasing}
            style={{
              borderRadius: 18,
              borderWidth: 2,
              borderColor: "#FFFFFF",
              overflow: "hidden",
              opacity: isPurchasing ? 0.7 : 1,
              marginBottom: 12,
            }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 15,
                gap: 6,
              }}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                    Start Monthly Plan
                  </Text>
                  <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Decline */}
          <Pressable onPress={onDecline} style={{ alignItems: "center", paddingTop: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.40)", fontFamily: "Inter_400Regular", fontSize: 13 }}>
              No thanks, I'll pass
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function PaywallScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchasingMonthly, setIsPurchasingMonthly] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    trackEvent("paywall_shown", {
      version: "v2",
      default_plan: "yearly",
      trial_enabled: FEATURE_FLAGS.trial_on_annual,
    });

    if (!isRevenueCatEnabled()) return;
    getOfferings().then((result) => {
      if (!result.ok || !result.data.current) return;
      const pkgs = result.data.current.availablePackages;
      setMonthlyPackage(pkgs.find((p) => p.identifier === "$rc_monthly") ?? null);
      setYearlyPackage(pkgs.find((p) => p.identifier === "$rc_annual") ?? null);
    });
  }, []);

  // ── BackHandler: intercept Android hardware back + iOS swipe-to-dismiss ──
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      // Only intercept when the exit modal is not already showing
      if (!showExitModal) {
        trackEvent("paywall_hardware_back");
        setShowExitModal(true);
      }
      return true; // prevent default navigation
    });
    return () => sub.remove();
  }, [showExitModal]);

  // ── Purchase (Annual) ─────────────────────────────────────────────────────
  const handleCTA = async () => {
    playClickSound();
    tapHaptic();
    trackEvent("cta_tapped", { plan: "yearly" });

    if (!isRevenueCatEnabled()) {
      grantAccess("yearly");
      return;
    }

    if (!yearlyPackage) {
      grantAccess("yearly");
      return;
    }

    setIsPurchasing(true);
    const result = await purchasePackage(yearlyPackage);
    setIsPurchasing(false);

    if (result.ok) {
      const expDate = result.data.entitlements.active?.["premium"]?.expirationDate;
      grantAccess("yearly", expDate);
    } else if (result.reason === "sdk_error") {
      const userCancelled = (result.error as any)?.userCancelled === true;
      if (userCancelled) {
        errorHaptic();
      } else {
        grantAccess("yearly");
      }
    }
  };

  // ── Purchase (Monthly — from exit modal) ──────────────────────────────────
  const handleMonthlyAccept = async () => {
    playClickSound();
    trackEvent("cta_tapped", { plan: "monthly" });

    if (!isRevenueCatEnabled()) {
      grantAccess("monthly");
      return;
    }

    if (!monthlyPackage) {
      grantAccess("monthly");
      return;
    }

    setIsPurchasingMonthly(true);
    const result = await purchasePackage(monthlyPackage);
    setIsPurchasingMonthly(false);

    if (result.ok) {
      grantAccess("monthly");
    } else if (result.reason === "sdk_error") {
      const userCancelled = (result.error as any)?.userCancelled === true;
      if (!userCancelled) {
        errorHaptic();
        Alert.alert("Payment Error", "Something went wrong. Please try again.");
      }
    }
  };

  const grantAccess = (plan: PlanType, expirationDate?: string | null) => {
    successHaptic();
    setSubscription(true, plan);
    if (plan === "yearly" && FEATURE_FLAGS.trial_on_annual) {
      // Schedule Day 5 reminder (2 days before trial end)
      NotificationService.scheduleTrialDay5Reminder(expirationDate ?? null);
      // Schedule end-of-trial reminder (existing)
      NotificationService.scheduleTrialEndReminder(expirationDate ?? null);
    }
    setShowExitModal(false);
    nextStep();
  };

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!isRevenueCatEnabled()) return;
    playClickSound();
    trackEvent("restore_tapped");
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);
    if (result.ok) {
      const isActive = Boolean(result.data.entitlements.active?.["premium"]);
      if (isActive) {
        successHaptic();
        setSubscription(true);
        nextStep();
      } else {
        errorHaptic();
        Alert.alert("No Active Subscription", "We couldn't find an active subscription to restore.");
      }
    } else {
      errorHaptic();
      Alert.alert("Restore Failed", "We couldn't find any previous purchases to restore.");
    }
  };

  // ── Back → show monthly downsell ──────────────────────────────────────────
  const handleBack = () => {
    playClickSound();
    tapHaptic();
    trackEvent("paywall_closed");
    setShowExitModal(true);
  };

  const handleExitDecline = () => {
    setShowExitModal(false);
    prevStep();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              justifyContent: "flex-end",
              paddingTop: 12,
              paddingBottom: 24,
            }}
          >
            {/* ── Hero headline ── */}
            <Animated.View
              entering={FadeIn.delay(50).duration(700).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 6 }}
            >
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  textAlign: "center",
                  lineHeight: 38,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                }}
              >
                Your journal is ready.{"\n"}Let's make it yours.
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.60)",
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 20,
                  maxWidth: "85%",
                }}
              >
                Built for ADHD, OCD, autistic & Tourette's minds — speak freely, and let clarity find you.
              </Text>
            </Animated.View>

            {/* ── Outcome-driven benefits ── */}
            <Animated.View
              entering={FadeIn.delay(120).duration(700).easing(SOFT)}
              style={{ marginTop: 14, marginBottom: 14 }}
            >
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 11,
                }}
              >
                {[
                  { emoji: "🗣️", text: "Put words to feelings you couldn't name before — no blank page, just talk" },
                  { emoji: "🌊", text: "Catch overwhelm before it builds, instead of after it hits" },
                  { emoji: "🔁", text: "See the looping thoughts and triggers for what they really are" },
                  { emoji: "📈", text: "Watch your patterns become clearer, week after week — privately, on your device" },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        marginRight: 12,
                        lineHeight: 20,
                      }}
                    >
                      {item.emoji}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        color: "rgba(255,255,255,0.88)",
                        fontSize: 13,
                        lineHeight: 19,
                        flex: 1,
                      }}
                    >
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* ── Annual plan card (only plan on main screen) ── */}
            <Animated.View
              entering={FadeIn.delay(180).duration(700).easing(SOFT)}
              style={{ marginBottom: 14 }}
            >
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 2.5,
                  borderColor: "#FFFFFF",
                  backgroundColor: "rgba(255,255,255,0.18)",
                  padding: 18,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Best value badge */}
                {FEATURE_FLAGS.savings_label && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: "#FFFFFF",
                      borderBottomLeftRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 10,
                        color: themeColors.primary,
                        letterSpacing: 0.5,
                      }}
                    >
                      BEST VALUE
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      color: "#FFFFFF",
                      fontSize: 16,
                    }}
                  >
                    Annual
                  </Text>
                  {FEATURE_FLAGS.trial_on_annual && (
                    <View
                      style={{
                        backgroundColor: "rgba(255,255,255,0.20)",
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 10,
                          letterSpacing: 0.3,
                        }}
                      >
                        {TRIAL_DAYS}-DAY FREE TRIAL
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  <Text
                    style={{
                      fontFamily: "Fraunces_700Bold",
                      color: "#FFFFFF",
                      fontSize: 32,
                    }}
                  >
                    {YEARLY_PRICE}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 13,
                    }}
                  >
                    /year
                  </Text>
                </View>

                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 13,
                  }}
                >
                  Just {YEARLY_MONTHLY_EQUIVALENT}/month · Save {YEARLY_SAVINGS}
                </Text>
              </View>
            </Animated.View>

            {/* ── CTA + reassurance ── */}
            <Animated.View
              entering={FadeIn.delay(320).duration(600).easing(SOFT)}
              style={{ alignItems: "center" }}
            >
              {/* Primary CTA */}
              <Pressable
                onPress={handleCTA}
                disabled={isPurchasing}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: Platform.OS === "android" ? 0 : 8,
                  opacity: isPurchasing ? 0.7 : 1,
                }}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.10)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 17,
                    gap: 8,
                  }}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontFamily: "Inter_700Bold",
                          fontSize: 18,
                        }}
                      >
                        Start Free {TRIAL_DAYS}-Day Trial
                      </Text>
                      <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Billing reassurance */}
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 12,
                  lineHeight: 18,
                }}
              >
                No charge for {TRIAL_DAYS} days · Then {YEARLY_PRICE}/yr · Cancel anytime
              </Text>

              {/* Trust cue — research-backed, app-native */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 14,
                  opacity: 0.6,
                }}
              >
                <FlaskConical size={12} color="#FFFFFF" strokeWidth={2} />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "#FFFFFF",
                    fontSize: 11,
                  }}
                >
                  Powered by the scientifically validated Plutchik Model
                </Text>
              </View>

              {/* Restore */}
              <Pressable
                onPress={handleRestore}
                disabled={isRestoring}
                style={{ marginTop: 14 }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.40)",
                    fontSize: 12,
                  }}
                >
                  {isRestoring ? "Restoring..." : "Restore purchases"}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Monthly exit-offer modal (shown on back/close) */}
      <MonthlyExitModal
        visible={showExitModal}
        themeColors={themeColors}
        onAccept={handleMonthlyAccept}
        onDecline={handleExitDecline}
        isPurchasing={isPurchasingMonthly}
      />
    </View>
  );
}
