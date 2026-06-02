/**
 * PaywallScreen v2 — High-converting annual-first paywall
 *
 * Design principles:
 * - Annual-only on main screen; monthly shown as downsell on back/close
 * - Warm, reflective, trustworthy, premium — not aggressive or salesy
 * - 3-day free trial on annual plan
 * - Feature flag support for A/B testing
 * - Analytics events for full funnel visibility
 *
 * Conversion features:
 * - Monthly plan hidden on main screen; surfaces as exit-offer modal on back
 * - Plutchik Model trust cue (research-backed, native to app)
 * - Day 2 trial reminder notification (1 day before expiry)
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
  Linking,
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
  activateAdapty,
  getPaywall,
  logPaywallImpression,
  makePurchase,
  restoreAdaptyPurchases,
  isAdaptyEnabled,
  hasEntitlement,
} from "@/lib/adaptyClient";
import type { AdaptyPaywallProduct } from "@/lib/adaptyClient";
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
// Anchors are kept in sync with Adapty Dashboard products:
//   monthly_journal   → $9.99 / month        (exit-offer modal only)
//   quarterly_journal → $24.99 / 3 months    (≈ $8.33/mo, ~17% off monthly)
//   yearly_journal    → $79.99 / year        (≈ $6.67/mo, ~33% off monthly, 3-day trial)
const MONTHLY_PRICE = "$9.99";
const QUARTERLY_PRICE = "$24.99";
const QUARTERLY_MONTHLY_EQUIVALENT = "$8.33";
const QUARTERLY_SAVINGS = "17%";
const YEARLY_PRICE = "$79.99";
const YEARLY_MONTHLY_EQUIVALENT = "$6.67";
const YEARLY_SAVINGS = "33%";
const TRIAL_DAYS = 3;

type PlanType = "yearly" | "quarterly" | "monthly";

// ── Monthly Exit-Offer Modal ──────────────────────────────────────────────────
function MonthlyExitModal({
  visible,
  themeColors,
  onAccept,
  onDecline,
  isPurchasing,
  monthlyPrice,
}: {
  visible: boolean;
  themeColors: (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
  onAccept: () => void;
  onDecline: () => void;
  isPurchasing: boolean;
  monthlyPrice: string;
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
                  {monthlyPrice}
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

  const [monthlyProduct, setMonthlyProduct] = useState<AdaptyPaywallProduct | null>(null);
  const [quarterlyProduct, setQuarterlyProduct] = useState<AdaptyPaywallProduct | null>(null);
  const [yearlyProduct, setYearlyProduct] = useState<AdaptyPaywallProduct | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "quarterly">("yearly");
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

    if (!isAdaptyEnabled()) return;
    (async () => {
      await activateAdapty();
      const result = await getPaywall("main_paywall");
      if (!result.ok) return;
      const { paywall, products } = result.data;
      setYearlyProduct(products.find((p) => p.vendorProductId === "yearly_journal") ?? null);
      setQuarterlyProduct(products.find((p) => p.vendorProductId === "quarterly_journal") ?? null);
      setMonthlyProduct(products.find((p) => p.vendorProductId === "monthly_journal") ?? null);
      await logPaywallImpression(paywall);
    })();
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

  // ── Purchase (Selected plan: yearly or quarterly) ─────────────────────────
  const handleCTA = async () => {
    playClickSound();
    tapHaptic();
    trackEvent("cta_tapped", { plan: selectedPlan });

    const product =
      selectedPlan === "yearly" ? yearlyProduct : quarterlyProduct;

    if (!isAdaptyEnabled() || !product) {
      grantAccess(selectedPlan);
      return;
    }

    setIsPurchasing(true);
    const result = await makePurchase(product);
    setIsPurchasing(false);

    if (result.ok) {
      if (hasEntitlement(result.data, "pro_journal")) {
        grantAccess(selectedPlan);
      }
    } else if (result.reason === "sdk_error") {
      const userCancelled = (result.error as any)?.userCancelled === true;
      if (userCancelled) {
        errorHaptic();
      } else {
        errorHaptic();
        Alert.alert("Payment Error", "Something went wrong. Please try again.");
      }
    }
  };

  // ── Purchase (Monthly — from exit modal) ──────────────────────────────────
  const handleMonthlyAccept = async () => {
    playClickSound();
    trackEvent("cta_tapped", { plan: "monthly" });

    if (!isAdaptyEnabled()) {
      grantAccess("monthly");
      return;
    }

    if (!monthlyProduct) {
      grantAccess("monthly");
      return;
    }

    setIsPurchasingMonthly(true);
    const result = await makePurchase(monthlyProduct);
    setIsPurchasingMonthly(false);

    if (result.ok) {
      if (hasEntitlement(result.data, "pro_journal")) {
        grantAccess("monthly");
      }
    } else if (result.reason === "sdk_error") {
      const userCancelled = (result.error as any)?.userCancelled === true;
      if (!userCancelled) {
        errorHaptic();
        Alert.alert("Payment Error", "Something went wrong. Please try again.");
      }
    }
  };

  const grantAccess = (plan: PlanType) => {
    successHaptic();
    setSubscription(true, plan);
    if (plan === "yearly" && FEATURE_FLAGS.trial_on_annual) {
      // Schedule trial reminders — wrapped in try/catch so a notification
      // failure never blocks advancing to the next onboarding screen.
      try { NotificationService.scheduleTrialDay2Reminder(null); } catch {}
      try { NotificationService.scheduleTrialEndReminder(null); } catch {}
    }
    setShowExitModal(false);
    nextStep();
  };

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!isAdaptyEnabled()) return;
    playClickSound();
    trackEvent("restore_tapped");
    setIsRestoring(true);
    const result = await restoreAdaptyPurchases();
    setIsRestoring(false);
    if (result.ok) {
      if (hasEntitlement(result.data, "pro_journal")) {
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
                Speak freely and let clarity find you.
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

            {/* ── Plan selection: Quarterly + Yearly side-by-side ── */}
            <Animated.View
              entering={FadeIn.delay(180).duration(700).easing(SOFT)}
              style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}
            >
              {/* ── Quarterly card ── */}
              <Pressable
                onPress={() => {
                  selectHaptic();
                  setSelectedPlan("quarterly");
                  trackEvent("plan_selected", { plan: "quarterly" });
                }}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  borderWidth: selectedPlan === "quarterly" ? 2.5 : 1.5,
                  borderColor:
                    selectedPlan === "quarterly"
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.25)",
                  backgroundColor:
                    selectedPlan === "quarterly"
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.08)",
                  padding: 14,
                  minHeight: 168,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    color: "#FFFFFF",
                    fontSize: 14,
                    marginBottom: 8,
                    letterSpacing: 0.2,
                  }}
                >
                  Quarterly
                </Text>

                <Text
                  style={{
                    fontFamily: "Fraunces_700Bold",
                    color: "#FFFFFF",
                    fontSize: 26,
                    lineHeight: 30,
                  }}
                >
                  {quarterlyProduct?.price?.localizedString ?? QUARTERLY_PRICE}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  every 3 months
                </Text>

                <View style={{ marginTop: "auto" }}>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.70)",
                      fontSize: 12,
                    }}
                  >
                    Just {QUARTERLY_MONTHLY_EQUIVALENT}/mo
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Save {QUARTERLY_SAVINGS}
                  </Text>
                </View>
              </Pressable>

              {/* ── Annual card (highlighted as Best Value) ── */}
              <Pressable
                onPress={() => {
                  selectHaptic();
                  setSelectedPlan("yearly");
                  trackEvent("plan_selected", { plan: "yearly" });
                }}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  borderWidth: selectedPlan === "yearly" ? 2.5 : 1.5,
                  borderColor:
                    selectedPlan === "yearly"
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.25)",
                  backgroundColor:
                    selectedPlan === "yearly"
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.08)",
                  padding: 14,
                  minHeight: 168,
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
                      borderBottomLeftRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 9,
                        color: themeColors.primary,
                        letterSpacing: 0.5,
                      }}
                    >
                      BEST VALUE
                    </Text>
                  </View>
                )}

                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    color: "#FFFFFF",
                    fontSize: 14,
                    marginBottom: 8,
                    letterSpacing: 0.2,
                    marginTop: 14,
                  }}
                >
                  Annual
                </Text>

                <Text
                  style={{
                    fontFamily: "Fraunces_700Bold",
                    color: "#FFFFFF",
                    fontSize: 26,
                    lineHeight: 30,
                  }}
                >
                  {yearlyProduct?.price?.localizedString ?? YEARLY_PRICE}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  per year
                </Text>

                <View style={{ marginTop: "auto" }}>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.70)",
                      fontSize: 12,
                    }}
                  >
                    Just {YEARLY_MONTHLY_EQUIVALENT}/mo
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Save {YEARLY_SAVINGS}
                  </Text>
                  {FEATURE_FLAGS.trial_on_annual && (
                    <View
                      style={{
                        backgroundColor: "rgba(255,255,255,0.20)",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        alignSelf: "flex-start",
                        marginTop: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 9,
                          letterSpacing: 0.3,
                        }}
                      >
                        {TRIAL_DAYS}-DAY FREE TRIAL
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
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
                        {selectedPlan === "yearly"
                          ? `Start Free ${TRIAL_DAYS}-Day Trial`
                          : "Continue with Quarterly"}
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
                {selectedPlan === "yearly"
                  ? `No charge for ${TRIAL_DAYS} days · Then ${
                      yearlyProduct?.price?.localizedString ?? YEARLY_PRICE
                    }/yr · Cancel anytime`
                  : `${
                      quarterlyProduct?.price?.localizedString ?? QUARTERLY_PRICE
                    } billed every 3 months · Cancel anytime`}
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

              {/* Legal links + Restore — single row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
                <Pressable onPress={() => Linking.openURL("https://vocolens.com/terms")} hitSlop={8}>
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                    Terms of Service
                  </Text>
                </Pressable>
                <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>·</Text>
                <Pressable onPress={handleRestore} disabled={isRestoring} hitSlop={8}>
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                    {isRestoring ? "Restoring..." : "Restore Purchase"}
                  </Text>
                </Pressable>
                <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>·</Text>
                <Pressable onPress={() => Linking.openURL("https://vocolens.com/privacy")} hitSlop={8}>
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                    Privacy Policy
                  </Text>
                </Pressable>
              </View>

              {/* Dev testing escape hatch */}
              <Pressable
                onPress={() => {
                  tapHaptic();
                  trackEvent("escape_payment_tapped", { plan: selectedPlan });
                  setSubscription(true, selectedPlan);
                  nextStep();
                }}
                style={{ marginTop: 10 }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.25)",
                    fontSize: 12,
                    textDecorationLine: "underline",
                  }}
                >
                  Escape payment
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
        monthlyPrice={monthlyProduct?.price?.localizedString ?? MONTHLY_PRICE}
      />
    </View>
  );
}
