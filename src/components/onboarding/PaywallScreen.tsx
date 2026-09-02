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
import { CaretRight, CaretDown, CaretUp, X, ChatCircle, Shield, Eye, TrendUp, LockOpen, Bell, Star } from "phosphor-react-native";
import Constants from "expo-constants";
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
  ADAPTY_ACCESS_LEVEL,
  PLACEMENT_ONBOARDING_PAYWALL,
  PRODUCT_ID_MONTHLY,
  PRODUCT_ID_THREE_MONTH,
  PRODUCT_ID_YEARLY,
} from "@/lib/adaptyClient";
import type { AdaptyProfile } from "react-native-adapty";
import type { AdaptyPaywallProduct } from "react-native-adapty";
import { NotificationService } from "@/lib/services/notification-service";

// ── Tester bypass flag ────────────────────────────────────────────────────────
// Set to `true` while distributing via internal testing on Google Play.
// ── Tester bypass ─────────────────────────────────────────────────────────────
// Needed while Adapty is not live so closed-testing participants can get past
// the paywall (Google Play requires 12 testers for 14 days before production).
//
// Driven by an env var, NOT a hand-edited constant: `eas.json` sets
// EXPO_PUBLIC_ALLOW_TESTER_SKIP="true" only on the `preview` profile. The
// `production` profile does not set it, so this is structurally false in a
// production build and cannot be shipped by forgetting to flip a boolean.
const ALLOW_TESTER_SKIP =
  (Constants.expoConfig?.extra?.EXPO_PUBLIC_ALLOW_TESTER_SKIP ??
    process.env.EXPO_PUBLIC_ALLOW_TESTER_SKIP) === 'true';

// ── Pricing fallbacks (shown when SDK not available) ──────────────────────────
// These are ONLY used as display fallbacks in the unlikely case where live
// prices couldn't be loaded. They must NEVER unlock the app (see handleCTA).
const MONTHLY_PRICE    = "$9.99";
const THREE_MONTH_PRICE = "$24.99";
const YEARLY_PRICE     = "$79.99";
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
      Icon: LockOpen,
      title: "Today",
      description: "Full access to voice journaling, emotion AI, and all insights",
    },
    {
      Icon: Bell,
      title: `Day ${TRIAL_DAYS - 1}`,
      description: `We'll send one reminder 24 hours before you're charged ${yearlyPrice}/yr`,
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
              <step.Icon size={14} color="#FFFFFF" weight="duotone" />
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
              <X size={22} color="rgba(255,255,255,0.6)" weight="duotone" />
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
            style={{ borderRadius: 18, borderWidth: 2, borderColor: themeColors.secondary, overflow: "hidden", opacity: isPurchasing ? 0.7 : 1, marginBottom: 12 }}
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

// ── Trial-charge reminder opt-in modal ─────────────────────────────────────────
// Shown right after a successful Yearly-plan purchase, ONLY if the OS
// notification permission hasn't already been explicitly denied. This is
// deliberately separate from the daily-reminder permission ask earlier in
// onboarding (NotificationPreferencesScreen) — a user may decline daily
// journaling nudges but still want a single, one-time heads-up before their
// trial converts to a paid charge. Framing it as its own narrow, one-time ask
// gives it a fair chance independent of whatever they decided about daily
// reminders.
//
// If permission was already granted (e.g. they said yes to daily reminders),
// this modal is skipped entirely and the reminder is scheduled immediately —
// no need to ask twice.
//
// If permission was already denied at the OS level, this modal is also
// skipped — re-showing the OS prompt is not possible once truly denied, so
// asking again here would set an expectation this build cannot fulfill.
function TrialReminderOptInModal({
  visible,
  themeColors,
  onEnable,
  onDecline,
}: {
  visible: boolean;
  themeColors: (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
  onEnable: () => void;
  onDecline: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <LinearGradient
          colors={[themeColors.gradientStart, themeColors.gradientEnd]}
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 60, height: 60, borderRadius: 30,
                backgroundColor: "rgba(255,255,255,0.14)",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
                alignItems: "center", justifyContent: "center", marginBottom: 14,
              }}
            >
              <Bell size={28} color="#FFFFFF" weight="duotone" />
            </View>
            <Text style={{ color: "#FFFFFF", fontFamily: "Fraunces_700Bold", fontSize: 20, textAlign: "center" }}>
              Get a heads-up before you're charged?
            </Text>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginBottom: 24, textAlign: "center" }}>
            We'll send just one reminder, 24 hours before your trial ends — no daily nudges, just this.
          </Text>

          <Pressable
            onPress={onEnable}
            style={{ borderRadius: 18, borderWidth: 2, borderColor: themeColors.secondary, overflow: "hidden", marginBottom: 12 }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ paddingVertical: 15, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                Yes, remind me
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onDecline} style={{ alignItems: "center", paddingTop: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.40)", fontFamily: "Inter_400Regular", fontSize: 13 }}>
              No thanks
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

  // ── Trial-charge reminder opt-in (yearly plan only) ─────────────────────────
  // Holds the real trial-expiry ISO string between the purchase succeeding
  // and the user responding to TrialReminderOptInModal (or it being skipped
  // entirely), so scheduleTrialDay2Reminder() always gets the accurate date
  // regardless of which path (immediate schedule / modal accept / decline)
  // is taken.
  const [showTrialReminderModal, setShowTrialReminderModal] = useState(false);
  const [pendingTrialExpiryIso,  setPendingTrialExpiryIso]  = useState<string | null>(null);

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
      errorHaptic();
      Alert.alert(
        "Products Unavailable",
        "We couldn't load subscription options. Please check your connection and try again.",
      );
      return;
    }

    setIsPurchasing(true);
    const result = await makePurchase(pkg);
    setIsPurchasing(false);

    if (result.ok && result.data.type === "success" && hasAccessLevel(result.data.profile)) {
      grantAccess(selectedPlan, result.data.profile);
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
      errorHaptic();
      Alert.alert(
        "Products Unavailable",
        "We couldn't load subscription options. Please check your connection and try again.",
      );
      return;
    }

    setIsPurchasingMonthly(true);
    const result = await makePurchase(monthlyPkg);
    setIsPurchasingMonthly(false);

    if (result.ok && result.data.type === "success" && hasAccessLevel(result.data.profile)) {
      grantAccess("monthly", result.data.profile);
    } else if (result.ok && result.data.type === "user_cancelled") {
      errorHaptic();
    } else if (!result.ok && result.reason === "sdk_error") {
      errorHaptic();
      Alert.alert("Payment Error", "Something went wrong. Please try again.");
    }
  };

  // ── Grant access helper ─────────────────────────────────────────────────────
  // `profile` is the just-updated Adapty profile from the purchase result —
  // used to read the REAL trial-expiry timestamp for the trial reminder
  // notification below. Previously this was always called with `null`,
  // which ignores Adapty's actual trial end date and falls back to a fixed
  // "2 days from now" estimate — only accurate if the trial started at the
  // exact instant grantAccess() runs. Since purchase network round-trips add
  // real delay, that estimate can drift enough for the "ends tomorrow"
  // reminder to fire on the wrong day.
  //
  // Only ONE trial reminder is scheduled (24h before charge) — the earlier
  // second "4 hours before" reminder was removed. A single, clearly-timed
  // notification with the exact charge amount and date reads as transparent;
  // stacking two, with the second landing right before the charge, reads as
  // pressure and increases refund/complaint risk without adding real value.
  //
  // For the yearly plan specifically, this reminder must have a real chance
  // of reaching the user REGARDLESS of whatever they decided about DAILY
  // journaling reminders earlier in onboarding — declining daily nudges
  // shouldn't silently forfeit this one, separate, one-time "you're about to
  // be charged" heads-up. See handleYearlyTrialReminder below for how that's
  // handled without re-showing an OS prompt that was already truly denied.
  const grantAccess = (plan: PlanKey, profile?: AdaptyProfile) => {
    successHaptic();
    setSubscription(true, plan === "three_month" ? "quarterly" : plan);
    setShowExitModal(false);

    if (plan === "yearly") {
      const expiresAt = profile?.accessLevels?.[ADAPTY_ACCESS_LEVEL]?.expiresAt;
      const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : null;
      // Deliberately not awaited here — grantAccess stays synchronous;
      // handleYearlyTrialReminder itself decides when to call nextStep()
      // once permission has been resolved one way or another (immediately,
      // via the opt-in modal, or skipped if truly denied).
      handleYearlyTrialReminder(expiresAtIso);
    } else {
      // Monthly / quarterly have no trial — nothing to remind about, proceed
      // immediately as before.
      nextStep();
    }
  };

  // ── Yearly-plan trial reminder: request permission independent of the
  //    earlier daily-reminder ask ───────────────────────────────────────────
  // Checks current OS notification permission WITHOUT prompting
  // (checkPermissions), then:
  //   - "granted"     → already allowed (e.g. said yes to daily reminders
  //                      earlier) — schedule immediately, no extra prompt.
  //   - "denied"      → truly denied at the OS level already. No app can
  //                      re-trigger that system prompt once denied, so
  //                      asking again here would promise something this
  //                      build cannot deliver — skip silently and proceed.
  //   - "undetermined" → never actually answered a real OS prompt yet (e.g.
  //                      they left daily reminders off without ever seeing
  //                      the system dialog). Show our own narrowly-scoped
  //                      opt-in modal, framed around just this one reminder,
  //                      before triggering the real permission request.
  const handleYearlyTrialReminder = async (expiresAtIso: string | null) => {
    setPendingTrialExpiryIso(expiresAtIso);
    try {
      const { status } = await NotificationService.checkPermissions();
      if (status === "granted") {
        try { await NotificationService.scheduleTrialDay2Reminder(expiresAtIso, yearlyPrice); } catch {}
        nextStep();
      } else if (status === "denied") {
        nextStep();
      } else {
        setShowTrialReminderModal(true);
      }
    } catch {
      nextStep();
    }
  };

  const handleTrialReminderOptInEnable = async () => {
    tapHaptic();
    setShowTrialReminderModal(false);
    try {
      const { granted } = await NotificationService.requestPermissions();
      if (granted) {
        await NotificationService.scheduleTrialDay2Reminder(pendingTrialExpiryIso, yearlyPrice);
      }
    } catch {
      // no-op — proceed regardless, this reminder is best-effort
    }
    nextStep();
  };

  const handleTrialReminderOptInDecline = () => {
    tapHaptic();
    setShowTrialReminderModal(false);
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

  // Per-month prices computed from the live amounts so they stay in sync with
  // the storefront's currency and price tier — never hardcoded.
  const currencySymbol = yearlyPkg?.price?.currencySymbol ?? "$";
  const yearlyPerMonth = `${currencySymbol}${(yearlyNum / 12).toFixed(2)}`;
  const threeMonthPerMonth = `${currencySymbol}${(threeMonthNum / 3).toFixed(2)}`;
  const quarterlyAnnualized = threeMonthNum * 4;
  const monthlyAnnualized   = monthlyNum * 12;
  const savingsVsQuarterly  = Math.round(((quarterlyAnnualized - yearlyNum) / quarterlyAnnualized) * 100);
  const savingsVsMonthly    = Math.round(((monthlyAnnualized - yearlyNum) / monthlyAnnualized) * 100);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={themeColors.backgroundGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
        <ProgressBar currentStep={currentStep} totalSteps={25} />
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
            </Animated.View>

            {/* Benefits — shown ONLY when quarterly/monthly plans are visible */}
            {showMorePlans && (
              <Animated.View entering={FadeInDown.delay(50).duration(400).easing(SOFT)} style={{ marginTop: 14, marginBottom: 14 }}>
                <View style={{ backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", paddingHorizontal: 16, paddingVertical: 14, gap: 11 }}>
                  {[
                    { Icon: ChatCircle, text: "Detect & name your emotions" },
                    { Icon: Shield, text: "Catch overwhelm before it hits" },
                    { Icon: Eye, text: "See your thought loops clearly" },
                    { Icon: TrendUp, text: "Track patterns week after week" },
                  ].map((item, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                        <item.Icon size={14} color="#FFFFFF" weight="duotone" />
                      </View>
                      <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 19, flex: 1 }}>{item.text}</Text>
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
                    style={{ width: "100%", borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.18)", padding: 14, overflow: "hidden" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 13, letterSpacing: 0.2 }}>Annual</Text>
                      <View style={{ backgroundColor: "#FFFFFF", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 9, color: themeColors.primary, letterSpacing: 0.5 }}>3-DAY FREE TRIAL</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 26, lineHeight: 30 }}>{yearlyPrice}</Text>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ backgroundColor: "rgba(74, 222, 128, 0.20)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start" }}>
                          <Text style={{ fontFamily: "Inter_700Bold", color: "#4ADE80", fontSize: 10 }}>
                            Save {savingsVsMonthly}% vs Monthly
                          </Text>
                        </View>
                        <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.70)", fontSize: 11 }}>
                          Just {yearlyPerMonth}/mo · Best value
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
                    <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 22, lineHeight: 26, marginBottom: 6 }}>{threeMonthPerMonth}<Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", fontSize: 11 }}>/mo</Text></Text>
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
                  ? <CaretUp size={16} color="rgba(255,255,255,0.55)" weight="duotone" />
                  : <CaretDown size={16} color="rgba(255,255,255,0.55)" weight="duotone" />}
              </Pressable>
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeIn.delay(320).duration(600).easing(SOFT)} style={{ alignItems: "center" }}>
              <Pressable
                onPress={handleCTA}
                disabled={isPurchasing}
                style={{ width: "100%", borderRadius: 50, borderWidth: 2, borderColor: themeColors.secondary, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: Platform.OS === "android" ? 0 : 8, opacity: isPurchasing ? 0.7 : 1 }}
              >
                <LinearGradient colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.10)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, gap: 8 }}>
                  {isPurchasing
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <>
                        <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 18 }}>
                          {selectedPlan === "yearly"
                            ? "Start my free trial now"
                            : selectedPlan === "three_month"
                              ? "Continue with quarterly"
                              : "Continue with monthly"}
                        </Text>
                        <CaretRight size={20} color="#FFFFFF" weight="bold" />
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

              {/* Tester skip — visible in internal testing builds */}
              {ALLOW_TESTER_SKIP && (
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    trackEvent("tester_skip_tapped");
                    setSubscription(true, "yearly");
                    nextStep();
                  }}
                  style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16 }}
                >
                  <Text style={{ fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.50)", fontSize: 13, textAlign: "center" }}>
                    Skip — I'm a tester
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <TrialReminderOptInModal
        visible={showTrialReminderModal}
        themeColors={themeColors}
        onEnable={handleTrialReminderOptInEnable}
        onDecline={handleTrialReminderOptInDecline}
      />

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
