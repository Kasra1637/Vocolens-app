/**
 * PaywallScreen — Adapty (custom code paywall)
 *
 * Shows the Annual plan by default with a trial timeline. Quarterly and
 * Monthly plans are hidden behind a "See other plans" expandable.
 *
 * Products (vendor product ids): monthly | three_month | yearly
 * Access level: "premium"
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
import Animated, { FadeIn, FadeInDown, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { tapHaptic, successHaptic, errorHaptic, selectHaptic } from "@/lib/haptics";
import { ChevronRight, ChevronDown, ChevronUp, X, MessageCircle, Shield, Eye, TrendingUp, Unlock, Bell, Star } from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import {
  configureAdapty,
  getPaywallProducts,
  findProductById,
  makePurchase,
  restorePurchases,
  hasAccessLevel,
  PLACEMENT_ONBOARDING_PAYWALL,
  PRODUCT_ID_MONTHLY,
  PRODUCT_ID_THREE_MONTH,
  PRODUCT_ID_YEARLY,
} from "@/lib/adaptyClient";
import type { AdaptyPaywallProduct } from "react-native-adapty";
import { NotificationService } from "@/lib/services/notification-service";

// ── Pricing fallbacks (shown when SDK not available) ──────────────────────────
const MONTHLY_PRICE    = "$9.99";
const THREE_MONTH_PRICE = "$24.99";
const YEARLY_PRICE     = "$79.99";
const YEARLY_PER_MONTH = "$6.67";
const THREE_MONTH_PER_MONTH = "$8.33";
const MONTHLY_PER_MONTH = "$9.99";
const TRIAL_DAYS = 3;

type PlanKey = "yearly" | "three_month" | "monthly";

function trackEvent(event: string, props?: Record<string, unknown>) {
  if (__DEV__) console.log(`[Analytics] ${event}`, props ?? "");
}

// ── Trial Timeline (shown only for annual plan) ────────────────────────────────
function TrialTimeline({
  yearlyPrice,
  themeColors,
}: {
  yearlyPrice: string;
  themeColors: (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
}) {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
  const formattedDate = trialEndDate.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const steps = [
    {
      Icon: Unlock,
      title: "Today",
      description: "Full access to voice journaling, emotion AI, and all insights",
    },
    {
      Icon: Bell,
      title: `Day ${TRIAL_DAYS - 1}`,
      description: "We'll remind you before your trial ends — no surprises",
    },
    {
      Icon: Star,
      title: `Day ${TRIAL_DAYS}`,
      description: `Your first charge of ${yearlyPrice}/yr begins on ${formattedDate}. Cancel anytime before`,
    },
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(500).easing(SOFT)}
      style={{
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
        padding: 16,
        marginBottom: 14,
      }}
    >
      {steps.map((step, idx) => (
        <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Timeline line + dot */}
          <View style={{ alignItems: "center", width: 36 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.14)",
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.35)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <step.Icon size={14} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            {idx < steps.length - 1 && (
              <View
                style={{
                  width: 1.5,
                  flex: 1,
                  minHeight: 24,
                  backgroundColor: "rgba(255,255,255,0.20)",
                  marginVertical: 4,
                }}
              />
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1, marginLeft: 12, paddingBottom: idx < steps.length - 1 ? 14 : 0 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                color: "#FFFFFF",
                fontSize: 13,
                marginBottom: 3,
              }}
            >
              {step.title}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.65)",
                fontSize: 12,
                lineHeight: 17,
              }}
            >
              {step.description}
            </Text>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

// ── Monthly exit-offer modal ───────────────────────────────────────────────────
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
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: "Fraunces_700Bold", fontSize: 20 }}>
              Not ready to commit?
            </Text>
            <Pressable onPress={onDecline} hitSlop={12}>
              <X size={22} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
            Try Vocolens monthly — no long-term commitment, cancel anytime
          </Text>

          <View style={{
            borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.50)",
            backgroundColor: "rgba(255,255,255,0.14)", paddingVertical: 16,
            paddingHorizontal: 18, flexDirection: "row", alignItems: "center",
            justifyContent: "space-between", marginBottom: 20,
          }}>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 }}>
                Monthly Plan
              </Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Fraunces_700Bold", fontSize: 24 }}>{monthlyPrice}</Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", fontSize: 12 }}>/month</Text>
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular", fontSize: 11 }}>
              No free trial
            </Text>
          </View>

          <Pressable
            onPress={onAccept}
            disabled={isPurchasing}
            style={{ borderRadius: 18, borderWidth: 2, borderColor: "#FFFFFF", overflow: "hidden", opacity: isPurchasing ? 0.7 : 1, marginBottom: 12 }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 6 }}
            >
              {isPurchasing
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>Start Monthly Plan</Text>}
            </LinearGradient>
          </Pressable>

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

// ── Main component ────────────────────────────────────────────────────────────
export function PaywallScreen() {
  const selectedTheme  = useOnboardingStore((s) => s.selectedTheme);
  const prevStep       = useOnboardingStore((s) => s.prevStep);
  const nextStep       = useOnboardingStore((s) => s.nextStep);
  const currentStep    = useOnboardingStore((s) => s.currentStep);
  const themeColors    = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  // Adapty product references (loaded from SDK)
  const [monthlyPkg,    setMonthlyPkg]    = useState<AdaptyPaywallProduct | null>(null);
  const [threeMonthPkg, setThreeMonthPkg] = useState<AdaptyPaywallProduct | null>(null);
  const [yearlyPkg,     setYearlyPkg]     = useState<AdaptyPaywallProduct | null>(null);

  const [selectedPlan,       setSelectedPlan]       = useState<PlanKey>("yearly");
  const [isPurchasing,       setIsPurchasing]        = useState(false);
  const [isPurchasingMonthly, setIsPurchasingMonthly] = useState(false);
  const [isRestoring,        setIsRestoring]         = useState(false);
  const [showExitModal,      setShowExitModal]       = useState(false);
  const [showMorePlans,      setShowMorePlans]       = useState(false);

  // ── Load products from Adapty ───────────────────────────────────────────────
  useEffect(() => {
    trackEvent("paywall_shown", { screen: "onboarding", default_plan: "yearly" });

    configureAdapty();
    (async () => {
      const result = await getPaywallProducts(PLACEMENT_ONBOARDING_PAYWALL);
      if (!result.ok) return;
      const { products } = result.data;
      setYearlyPkg(findProductById(products, PRODUCT_ID_YEARLY));
      setThreeMonthPkg(findProductById(products, PRODUCT_ID_THREE_MONTH));
      setMonthlyPkg(findProductById(products, PRODUCT_ID_MONTHLY));
    })();
  }, []);

  // ── Android hardware back → show exit modal ─────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!showExitModal) setShowExitModal(true);
      return true;
    });
    return () => sub.remove();
  }, [showExitModal]);

  // ── Purchase selected plan ────────────────────────────────────────────────
  const handleCTA = async () => {
    playClickSound(); tapHaptic();
    trackEvent("cta_tapped", { plan: selectedPlan });

    const pkg = selectedPlan === "yearly"
      ? yearlyPkg
      : selectedPlan === "three_month"
        ? threeMonthPkg
        : monthlyPkg;

    if (!pkg) {
      grantAccess(selectedPlan); return;
    }

    setIsPurchasing(true);
    const result = await makePurchase(pkg);
    setIsPurchasing(false);

    if (result.ok && result.data.type === "success" && hasAccessLevel(result.data.profile)) {
      grantAccess(selectedPlan);
    } else if (result.ok && result.data.type === "user_cancelled") {
      errorHaptic();
    } else if (!result.ok && result.reason === "sdk_error") {
      errorHaptic();
      Alert.alert("Payment Error", "Something went wrong. Please try again.");
    }
  };

  // ── Purchase monthly (exit-offer modal) ─────────────────────────────────────
  const handleMonthlyAccept = async () => {
    playClickSound();
    trackEvent("cta_tapped", { plan: "monthly" });

    if (!monthlyPkg) {
      grantAccess("monthly"); return;
    }

    setIsPurchasingMonthly(true);
    const result = await makePurchase(monthlyPkg);
    setIsPurchasingMonthly(false);

    if (result.ok && result.data.type === "success" && hasAccessLevel(result.data.profile)) {
      grantAccess("monthly");
    } else if (result.ok && result.data.type === "user_cancelled") {
      errorHaptic();
    } else if (!result.ok && result.reason === "sdk_error") {
      errorHaptic();
      Alert.alert("Payment Error", "Something went wrong. Please try again.");
    }
  };

  // ── Grant access helper ─────────────────────────────────────────────────────
  const grantAccess = (plan: PlanKey) => {
    successHaptic();
    setSubscription(true, plan === "three_month" ? "quarterly" : plan);
    if (plan === "yearly") {
      try { NotificationService.scheduleTrialDay2Reminder(null); } catch {}
      try { NotificationService.scheduleTrialEndReminder(null); } catch {}
    }
    setShowExitModal(false);
    nextStep();
  };

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleRestore = async () => {
    playClickSound(); trackEvent("restore_tapped");
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);

    if (result.ok && hasAccessLevel(result.data)) {
      successHaptic();
      setSubscription(true);
      nextStep();
    } else if (result.ok) {
      errorHaptic();
      Alert.alert("No Active Subscription", "We couldn't find an active subscription to restore.");
    } else {
      errorHaptic();
      Alert.alert("Restore Failed", "Something went wrong. Please try again.");
    }
  };

  const handleBack = () => {
    playClickSound(); tapHaptic();
    trackEvent("paywall_back");
    // If user hasn't expanded plans yet, show exit modal with monthly offer.
    // Otherwise just go back.
    if (!showMorePlans) {
      setShowExitModal(true);
    } else {
      prevStep();
    }
  };

  // ── Prices (live from SDK or fallback) ──────────────────────────────────────
  const yearlyPrice     = yearlyPkg?.price?.localizedString     ?? YEARLY_PRICE;
  const threeMonthPrice = threeMonthPkg?.price?.localizedString ?? THREE_MONTH_PRICE;
  const monthlyPrice    = monthlyPkg?.price?.localizedString    ?? MONTHLY_PRICE;

  // Calculate savings percentage: Annual vs Quarterly (annualized)
  const yearlyNum      = yearlyPkg?.price?.amount      ?? 79.99;
  const threeMonthNum  = threeMonthPkg?.price?.amount  ?? 24.99;
  const monthlyNum     = monthlyPkg?.price?.amount     ?? 9.99;
  const quarterlyAnnualized = threeMonthNum * 4;
  const monthlyAnnualized   = monthlyNum * 12;
  const savingsVsQuarterly  = Math.round(((quarterlyAnnualized - yearlyNum) / quarterlyAnnualized) * 100);
  const savingsVsMonthly    = Math.round(((monthlyAnnualized - yearlyNum) / monthlyAnnualized) * 100);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={themeColors.backgroundGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
        <ProgressBar currentStep={currentStep} totalSteps={24} />
        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "flex-end", paddingTop: 12, paddingBottom: 24 }}>

            {/* Hero */}
            <Animated.View entering={FadeIn.delay(50).duration(700).easing(SOFT)} style={{ alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 30, textAlign: "center", lineHeight: 38, opacity: 0.92, letterSpacing: 0.2 }}>
                {showMorePlans
                  ? "Your journal is ready.\nLet's make it yours."
                  : "How your free\ntrial works"}
              </Text>
              {!showMorePlans && (
                <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.60)", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20, maxWidth: "85%" }}>
                  Speak freely and let clarity find you
                </Text>
              )}
            </Animated.View>

            {/* Benefits — shown ONLY when quarterly/monthly plans are visible */}
            {showMorePlans && (
              <Animated.View entering={FadeInDown.delay(50).duration(400).easing(SOFT)} style={{ marginTop: 14, marginBottom: 14 }}>
                <View style={{ backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", paddingHorizontal: 16, paddingVertical: 14, gap: 11 }}>
                  {[
                    { Icon: MessageCircle, text: "Name feelings you couldn't before" },
                    { Icon: Shield, text: "Catch overwhelm before it hits" },
                    { Icon: Eye, text: "See your thought loops clearly" },
                    { Icon: TrendingUp, text: "Track patterns week after week" },
                  ].map((item, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <item.Icon size={16} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 19, flex: 1 }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Plan cards — toggle between annual view and quarterly/monthly view */}
            <Animated.View entering={FadeIn.delay(180).duration(700).easing(SOFT)} style={{ flexDirection: "column", gap: 10, marginBottom: 14 }}>

              {/* Trial Timeline — shown above annual card in yearly view */}
              {!showMorePlans && (
                <TrialTimeline yearlyPrice={yearlyPrice} themeColors={themeColors} />
              )}

              {/* Annual — shown only in default (yearly) view */}
              {!showMorePlans && (
                <Animated.View entering={FadeInDown.duration(350).easing(SOFT)}>
                  <Pressable
                    onPress={() => { selectHaptic(); setSelectedPlan("yearly"); trackEvent("plan_selected", { plan: "yearly" }); }}
                    style={{ width: "100%", borderRadius: 18, borderWidth: 2.5, borderColor: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.18)", padding: 14, position: "relative", overflow: "hidden" }}
                  >
                    <View style={{ position: "absolute", top: 0, right: 0, backgroundColor: "#FFFFFF", borderBottomLeftRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 9, color: themeColors.primary, letterSpacing: 0.5 }}>3-DAY FREE TRIAL</Text>
                    </View>
                    <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 13, letterSpacing: 0.2, marginBottom: 6 }}>Annual</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 26, lineHeight: 30 }}>{yearlyPrice}</Text>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ backgroundColor: "rgba(74, 222, 128, 0.20)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" }}>
                          <Text style={{ fontFamily: "Inter_700Bold", color: "#4ADE80", fontSize: 10 }}>
                            Save {savingsVsMonthly}% vs Monthly
                          </Text>
                        </View>
                        <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.70)", fontSize: 11 }}>
                          Just {YEARLY_PER_MONTH}/mo · Best value
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              )}

              {/* Quarterly + Monthly — side by side */}
              {showMorePlans && (
                <Animated.View entering={FadeInDown.duration(350).easing(SOFT)} style={{ flexDirection: "row", gap: 10 }}>
                  {/* Quarterly */}
                  <Pressable
                    onPress={() => { selectHaptic(); setSelectedPlan("three_month"); trackEvent("plan_selected", { plan: "three_month" }); }}
                    style={{ flex: 1, borderRadius: 18, borderWidth: selectedPlan === "three_month" ? 2.5 : 1.5, borderColor: selectedPlan === "three_month" ? "#FFFFFF" : "rgba(255,255,255,0.25)", backgroundColor: selectedPlan === "three_month" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)", padding: 14 }}
                  >
                    <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 13, letterSpacing: 0.2, marginBottom: 8 }}>Quarterly</Text>
                    <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 22, lineHeight: 26, marginBottom: 6 }}>{THREE_MONTH_PER_MONTH}<Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", fontSize: 11 }}>/mo</Text></Text>
                    <View style={{ backgroundColor: "rgba(74, 222, 128, 0.20)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 4 }}>
                      <Text style={{ fontFamily: "Inter_700Bold", color: "#4ADE80", fontSize: 9 }}>
                        Save {savingsVsQuarterly > 0 ? Math.round(((monthlyNum * 3 - threeMonthNum) / (monthlyNum * 3)) * 100) : 17}% vs Monthly
                      </Text>
                    </View>
                    <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.50)", fontSize: 10 }}>
                      Billed {threeMonthPrice} / 3 mo
                    </Text>
                  </Pressable>

                  {/* Monthly */}
                  <Pressable
                    onPress={() => { selectHaptic(); setSelectedPlan("monthly"); trackEvent("plan_selected", { plan: "monthly" }); }}
                    style={{ flex: 1, borderRadius: 18, borderWidth: selectedPlan === "monthly" ? 2.5 : 1.5, borderColor: selectedPlan === "monthly" ? "#FFFFFF" : "rgba(255,255,255,0.25)", backgroundColor: selectedPlan === "monthly" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)", padding: 14 }}
                  >
                    <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 13, letterSpacing: 0.2, marginBottom: 8 }}>Monthly</Text>
                    <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 22, lineHeight: 26, marginBottom: 6 }}>{monthlyPrice}<Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", fontSize: 11 }}>/mo</Text></Text>
                    <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.50)", fontSize: 10, marginTop: 4 }}>
                      Cancel anytime
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* Toggle between views */}
              <Pressable
                onPress={() => {
                  tapHaptic();
                  const nextState = !showMorePlans;
                  setShowMorePlans(nextState);
                  // When switching back to yearly view, re-select yearly
                  if (!nextState) setSelectedPlan("yearly");
                  // When switching to other plans, default-select quarterly
                  if (nextState && selectedPlan === "yearly") setSelectedPlan("three_month");
                  trackEvent("more_plans_toggled", { expanded: nextState });
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                  gap: 6,
                }}
              >
                <Text style={{ fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                  {showMorePlans ? "See yearly plan" : "See other plans"}
                </Text>
                {showMorePlans
                  ? <ChevronUp size={16} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                  : <ChevronDown size={16} color="rgba(255,255,255,0.55)" strokeWidth={2} />}
              </Pressable>
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeIn.delay(320).duration(600).easing(SOFT)} style={{ alignItems: "center" }}>
              <Pressable
                onPress={handleCTA}
                disabled={isPurchasing}
                style={{ width: "100%", borderRadius: 18, borderWidth: 2, borderColor: "#FFFFFF", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: Platform.OS === "android" ? 0 : 8, opacity: isPurchasing ? 0.7 : 1 }}
              >
                <LinearGradient colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.10)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, gap: 8 }}>
                  {isPurchasing
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <>
                        <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 18 }}>
                          {selectedPlan === "yearly"
                            ? "Start my free trial now"
                            : selectedPlan === "three_month"
                              ? "Continue with Quarterly"
                              : "Continue with Monthly"}
                        </Text>
                        <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                      </>}
                </LinearGradient>
              </Pressable>

              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", fontSize: 10, textAlign: "center", marginTop: 10, lineHeight: 15 }}>
                {selectedPlan === "yearly"
                  ? `No charge for ${TRIAL_DAYS} days · Then ${yearlyPrice}/yr · Cancel anytime`
                  : selectedPlan === "three_month"
                    ? `${threeMonthPrice} billed every 3 months · Cancel anytime`
                    : `${monthlyPrice} billed monthly · Cancel anytime`}
              </Text>

              {/* Legal + Restore */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
                <Pressable onPress={() => Linking.openURL("https://vocolens.com/terms")} hitSlop={8}>
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Terms</Text>
                </Pressable>
                <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>·</Text>
                <Pressable onPress={handleRestore} disabled={isRestoring} hitSlop={8}>
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                    {isRestoring ? "Restoring..." : "Restore Purchase"}
                  </Text>
                </Pressable>
                <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>·</Text>
                <Pressable onPress={() => Linking.openURL("https://vocolens.com/privacy")} hitSlop={8}>
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Privacy</Text>
                </Pressable>
              </View>

              {/* Dev escape */}
              {__DEV__ && (
                <Pressable
                  onPress={() => { tapHaptic(); setSubscription(true, selectedPlan === "three_month" ? "quarterly" : selectedPlan); nextStep(); }}
                  style={{ marginTop: 10 }}
                >
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.25)", fontSize: 12, textDecorationLine: "underline" }}>
                    [DEV] Escape payment
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <MonthlyExitModal
        visible={showExitModal}
        themeColors={themeColors}
        onAccept={handleMonthlyAccept}
        onDecline={() => { setShowExitModal(false); prevStep(); }}
        isPurchasing={isPurchasingMonthly}
        monthlyPrice={monthlyPrice}
      />
    </View>
  );
}
