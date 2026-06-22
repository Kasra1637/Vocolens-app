/**
 * PaywallScreen — RevenueCat v10 + RevenueCatUI
 *
 * Uses RevenueCatUI.presentPaywall() to show the remotely-configured
 * paywall from the RevenueCat dashboard.  Falls back to a native
 * custom paywall when the native UI module is unavailable (Expo Go).
 *
 * Products: monthly | three_month | yearly
 * Entitlement: "Vocolens Pro"
 */

import React, { useState, useEffect, useCallback } from "react";
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
import { Check, ChevronRight, X, Settings, MessageCircle, Shield, Eye, TrendingUp } from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import {
  configureRevenueCat,
  getCustomerInfo,
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasEntitlement,
  isRevenueCatEnabled,
  RC_ENTITLEMENT,
} from "@/lib/revenueCatClient";
import type { PurchasesPackage } from "react-native-purchases";
import { NotificationService } from "@/lib/services/notification-service";

// ── Pricing fallbacks (shown when SDK not available) ──────────────────────────
const MONTHLY_PRICE    = "$9.99";
const THREE_MONTH_PRICE = "$24.99";
const YEARLY_PRICE     = "$79.99";
const YEARLY_PER_MONTH = "$6.67";
const THREE_MONTH_PER_MONTH = "$8.33";
const TRIAL_DAYS = 3;

type PlanKey = "yearly" | "three_month" | "monthly";

function trackEvent(event: string, props?: Record<string, unknown>) {
  if (__DEV__) console.log(`[Analytics] ${event}`, props ?? "");
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

  // RevenueCat package references (loaded from SDK)
  const [monthlyPkg,    setMonthlyPkg]    = useState<PurchasesPackage | null>(null);
  const [threeMonthPkg, setThreeMonthPkg] = useState<PurchasesPackage | null>(null);
  const [yearlyPkg,     setYearlyPkg]     = useState<PurchasesPackage | null>(null);

  const [selectedPlan,       setSelectedPlan]       = useState<"yearly" | "three_month">("yearly");
  const [isPurchasing,       setIsPurchasing]        = useState(false);
  const [isPurchasingMonthly, setIsPurchasingMonthly] = useState(false);
  const [isRestoring,        setIsRestoring]         = useState(false);
  const [showExitModal,      setShowExitModal]       = useState(false);

  // ── Load offerings ──────────────────────────────────────────────────────────
  useEffect(() => {
    trackEvent("paywall_shown", { screen: "onboarding", default_plan: "yearly" });
    if (!isRevenueCatEnabled()) return;

    configureRevenueCat();
    (async () => {
      const result = await getOfferings();
      if (!result.ok) return;
      // Prefer the current offering; fall back to all packages across all offerings.
      // Match by RC packageType, then RC package identifier, then product identifier.
      const allPkgs = (result.data.current?.availablePackages ?? []).length > 0
        ? result.data.current!.availablePackages
        : result.data.offerings.flatMap((o: any) => o.availablePackages);
      setYearlyPkg(
        allPkgs.find((p: any) => p.packageType === "ANNUAL"      || p.identifier === "$rc_annual"      || p.product.identifier === "yearly")       ?? null
      );
      setThreeMonthPkg(
        allPkgs.find((p: any) => p.packageType === "THREE_MONTH" || p.identifier === "$rc_three_month" || p.product.identifier === "three_month")  ?? null
      );
      setMonthlyPkg(
        allPkgs.find((p: any) => p.packageType === "MONTHLY"     || p.identifier === "$rc_monthly"     || p.product.identifier === "monthly")      ?? null
      );
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

  // ── Purchase selected plan (yearly / three_month) ───────────────────────────
  const handleCTA = async () => {
    playClickSound(); tapHaptic();
    trackEvent("cta_tapped", { plan: selectedPlan });

    const pkg = selectedPlan === "yearly" ? yearlyPkg : threeMonthPkg;

    if (!isRevenueCatEnabled() || !pkg) {
      grantAccess(selectedPlan); return;
    }

    setIsPurchasing(true);
    const result = await purchasePackage(pkg);
    setIsPurchasing(false);

    if (result.ok && hasEntitlement(result.data)) {
      grantAccess(selectedPlan);
    } else if (result.reason === "sdk_error") {
      const cancelled = (result.error as any)?.userCancelled === true;
      if (!cancelled) {
        errorHaptic();
        Alert.alert("Payment Error", "Something went wrong. Please try again.");
      } else {
        errorHaptic();
      }
    }
  };

  // ── Purchase monthly (exit-offer modal) ─────────────────────────────────────
  const handleMonthlyAccept = async () => {
    playClickSound();
    trackEvent("cta_tapped", { plan: "monthly" });

    if (!isRevenueCatEnabled() || !monthlyPkg) {
      grantAccess("monthly"); return;
    }

    setIsPurchasingMonthly(true);
    const result = await purchasePackage(monthlyPkg);
    setIsPurchasingMonthly(false);

    if (result.ok && hasEntitlement(result.data)) {
      grantAccess("monthly");
    } else if (result.reason === "sdk_error") {
      const cancelled = (result.error as any)?.userCancelled === true;
      if (!cancelled) {
        errorHaptic();
        Alert.alert("Payment Error", "Something went wrong. Please try again.");
      }
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
    if (!isRevenueCatEnabled()) return;
    playClickSound(); trackEvent("restore_tapped");
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);

    if (result.ok && hasEntitlement(result.data)) {
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
    setShowExitModal(true);
  };

  // ── Prices (live from SDK or fallback) ──────────────────────────────────────
  const yearlyPrice     = yearlyPkg?.product?.priceString     ?? YEARLY_PRICE;
  const threeMonthPrice = threeMonthPkg?.product?.priceString ?? THREE_MONTH_PRICE;
  const monthlyPrice    = monthlyPkg?.product?.priceString    ?? MONTHLY_PRICE;

  // Calculate savings percentage: Annual vs Quarterly (annualized)
  const yearlyNum      = yearlyPkg?.product?.price      ?? 79.99;
  const threeMonthNum  = threeMonthPkg?.product?.price  ?? 24.99;
  const quarterlyAnnualized = threeMonthNum * 4;
  const savingsPercent = Math.round(((quarterlyAnnualized - yearlyNum) / quarterlyAnnualized) * 100);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={themeColors.backgroundGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
        <ProgressBar currentStep={currentStep} totalSteps={22} />
        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "flex-end", paddingTop: 12, paddingBottom: 24 }}>

            {/* Hero */}
            <Animated.View entering={FadeIn.delay(50).duration(700).easing(SOFT)} style={{ alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 30, textAlign: "center", lineHeight: 38, opacity: 0.92, letterSpacing: 0.2 }}>
                Your journal is ready.{"\n"}Let's make it yours.
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.60)", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20, maxWidth: "85%" }}>
                Speak freely and let clarity find you
              </Text>
            </Animated.View>

            {/* Benefits */}
            <Animated.View entering={FadeIn.delay(120).duration(700).easing(SOFT)} style={{ marginTop: 14, marginBottom: 14 }}>
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

            {/* Plan cards */}
            <Animated.View entering={FadeIn.delay(180).duration(700).easing(SOFT)} style={{ flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {/* Annual */}
              <Pressable
                onPress={() => { selectHaptic(); setSelectedPlan("yearly"); trackEvent("plan_selected", { plan: "yearly" }); }}
                style={{ width: "100%", borderRadius: 18, borderWidth: selectedPlan === "yearly" ? 2.5 : 1.5, borderColor: selectedPlan === "yearly" ? "#FFFFFF" : "rgba(255,255,255,0.25)", backgroundColor: selectedPlan === "yearly" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)", padding: 14, position: "relative", overflow: "hidden" }}
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
                        Save {savingsPercent}% vs Quarterly
                      </Text>
                    </View>
                    <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.70)", fontSize: 11 }}>
                      Just {YEARLY_PER_MONTH}/mo
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Three-month */}
              <Pressable
                onPress={() => { selectHaptic(); setSelectedPlan("three_month"); trackEvent("plan_selected", { plan: "three_month" }); }}
                style={{ width: "100%", borderRadius: 18, borderWidth: selectedPlan === "three_month" ? 2.5 : 1.5, borderColor: selectedPlan === "three_month" ? "#FFFFFF" : "rgba(255,255,255,0.25)", backgroundColor: selectedPlan === "three_month" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)", padding: 14 }}
              >
                <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 13, letterSpacing: 0.2, marginBottom: 6 }}>Quarterly</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 26, lineHeight: 30 }}>{threeMonthPrice}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.70)", fontSize: 11 }}>
                    Just {THREE_MONTH_PER_MONTH}/mo
                  </Text>
                </View>
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
                          {selectedPlan === "yearly" ? `Start Free ${TRIAL_DAYS}-Day Trial` : "Continue with Quarterly"}
                        </Text>
                        <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                      </>}
                </LinearGradient>
              </Pressable>

              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", fontSize: 10, textAlign: "center", marginTop: 10, lineHeight: 15 }}>
                {selectedPlan === "yearly"
                  ? `No charge for ${TRIAL_DAYS} days · Then ${yearlyPrice}/yr · Cancel anytime`
                  : `${threeMonthPrice} billed every 3 months · Cancel anytime`}
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
