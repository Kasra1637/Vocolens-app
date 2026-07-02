/**
 * SubscriptionLapsedPaywall
 *
 * Full-screen paywall shown when a user's subscription has expired.
 * Completely blocks app access until the user re-subscribes.
 *
 * Design: urgency-focused — centered messaging that creates a sense of
 * loss and time pressure, making the user feel what they're missing out on.
 * Matches the design system of onboarding/PaywallScreen.tsx (Fraunces
 * headings, Inter body, FadeIn animations, themed LinearGradient).
 *
 * Offers yearly / quarterly plan selection with monthly downgrade option.
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
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { tapHaptic, successHaptic, errorHaptic, selectHaptic } from "@/lib/haptics";
import { ChevronRight, X } from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSubscriptionStore from "@/lib/state/subscription-store";
import {
  configureAdapty,
  getPaywallProducts,
  findProductById,
  makePurchase,
  restorePurchases,
  hasAccessLevel,
  PLACEMENT_MAIN_PAYWALL,
  PRODUCT_ID_MONTHLY,
  PRODUCT_ID_THREE_MONTH,
  PRODUCT_ID_YEARLY,
} from "@/lib/adaptyClient";
import type { AdaptyPaywallProduct } from "react-native-adapty";
import { NotificationService } from "@/lib/services/notification-service";

// ── Pricing fallbacks ─────────────────────────────────────────────────────────
const MONTHLY_PRICE = "$9.99";
const THREE_MONTH_PRICE = "$24.99";
const YEARLY_PRICE = "$79.99";
const YEARLY_PER_MONTH = "$6.67";
const THREE_MONTH_PER_MONTH = "$8.33";

type PlanKey = "yearly" | "three_month" | "monthly";

// ── Monthly downgrade modal ───────────────────────────────────────────────────
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
              Prefer a lighter plan?
            </Text>
            <Pressable onPress={onDecline} hitSlop={12}>
              <X size={22} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
            Keep access to your journal and all your progress — cancel anytime.
          </Text>

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
                <Text style={{ color: "#FFFFFF", fontFamily: "Fraunces_700Bold", fontSize: 24 }}>{monthlyPrice}</Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular", fontSize: 12 }}>/month</Text>
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular", fontSize: 11 }}>
              Cancel anytime
            </Text>
          </View>

          <Pressable
            onPress={onAccept}
            disabled={isPurchasing}
            style={{ borderRadius: 18, borderWidth: 2, borderColor: "#FFFFFF", overflow: "hidden", opacity: isPurchasing ? 0.7 : 1, marginBottom: 12 }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, gap: 6 }}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 16 }}>Start Monthly Plan</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={onDecline} style={{ alignItems: "center", paddingTop: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.40)", fontFamily: "Inter_400Regular", fontSize: 13 }}>
              Not now
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SubscriptionLapsedPaywall() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const notificationPreferences = useOnboardingStore((s) => s.notificationPreferences);
  const themeColors = THEME_COLORS[selectedTheme];
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  // Adapty products
  const [monthlyPkg, setMonthlyPkg] = useState<AdaptyPaywallProduct | null>(null);
  const [threeMonthPkg, setThreeMonthPkg] = useState<AdaptyPaywallProduct | null>(null);
  const [yearlyPkg, setYearlyPkg] = useState<AdaptyPaywallProduct | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "three_month">("yearly");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPurchasingMonthly, setIsPurchasingMonthly] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // ── Load products ───────────────────────────────────────────────────────────
  useEffect(() => {
    configureAdapty();
    (async () => {
      const result = await getPaywallProducts(PLACEMENT_MAIN_PAYWALL);
      if (!result.ok) return;
      const { products } = result.data;
      setYearlyPkg(findProductById(products, PRODUCT_ID_YEARLY));
      setThreeMonthPkg(findProductById(products, PRODUCT_ID_THREE_MONTH));
      setMonthlyPkg(findProductById(products, PRODUCT_ID_MONTHLY));
    })();
  }, []);

  // ── Purchase handlers ───────────────────────────────────────────────────────
  const grantAccess = (plan: PlanKey) => {
    successHaptic();
    setSubscription(true, plan === "three_month" ? "quarterly" : plan);
    if (notificationPreferences?.time && notificationPreferences.days.length > 0) {
      NotificationService.rescheduleFromPreferences(notificationPreferences.time, notificationPreferences.days, true);
    }
  };

  const handleCTA = async () => {
    tapHaptic();
    const pkg = selectedPlan === "yearly" ? yearlyPkg : threeMonthPkg;
    if (!pkg) { grantAccess(selectedPlan); return; }

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

  const handleMonthlyAccept = async () => {
    tapHaptic();
    if (!monthlyPkg) { grantAccess("monthly"); return; }

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

  const handleRestore = async () => {
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);

    if (result.ok && hasAccessLevel(result.data)) {
      successHaptic();
      setSubscription(true);
    } else if (result.ok) {
      errorHaptic();
      Alert.alert("No Active Subscription", "We couldn't find an active subscription to restore.");
    } else {
      errorHaptic();
      Alert.alert("Restore Failed", "Something went wrong. Please try again.");
    }
  };

  // ── Prices ──────────────────────────────────────────────────────────────────
  const yearlyPrice = yearlyPkg?.price?.localizedString ?? YEARLY_PRICE;
  const threeMonthPrice = threeMonthPkg?.price?.localizedString ?? THREE_MONTH_PRICE;
  const monthlyPrice = monthlyPkg?.price?.localizedString ?? MONTHLY_PRICE;

  const yearlyNum = yearlyPkg?.price?.amount ?? 79.99;
  const threeMonthNum = threeMonthPkg?.price?.amount ?? 24.99;
  const quarterlyAnnualized = threeMonthNum * 4;
  const savingsPercent = Math.round(((quarterlyAnnualized - yearlyNum) / quarterlyAnnualized) * 100);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={themeColors.backgroundGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "flex-end", paddingTop: 24, paddingBottom: 24 }}>

            {/* Urgency hero — all text centered */}
            <Animated.View entering={FadeIn.delay(50).duration(700).easing(SOFT)} style={{ alignItems: "center", marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 28,
                  textAlign: "center",
                  lineHeight: 36,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                }}
              >
                Your subscription{"\n"}has ended.
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.70)",
                  fontSize: 15,
                  textAlign: "center",
                  marginTop: 12,
                  lineHeight: 22,
                  maxWidth: "90%",
                }}
              >
                Your journal entries, streaks, and insights are locked. Reactivate now to pick up right where you left off — every day without it, your progress fades.
              </Text>
            </Animated.View>

            {/* Urgency nudge */}
            <Animated.View entering={FadeIn.delay(120).duration(700).easing(SOFT)} style={{ alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  backgroundColor: "rgba(239,68,68,0.12)",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.30)",
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#F87171",
                    fontSize: 13,
                    textAlign: "center",
                    lineHeight: 19,
                  }}
                >
                  Your streak will reset to zero if you don't reactivate today.
                </Text>
              </View>
            </Animated.View>

            {/* Plan cards */}
            <Animated.View entering={FadeIn.delay(180).duration(700).easing(SOFT)} style={{ flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {/* Annual */}
              <Pressable
                onPress={() => { selectHaptic(); setSelectedPlan("yearly"); }}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  borderWidth: selectedPlan === "yearly" ? 2.5 : 1.5,
                  borderColor: selectedPlan === "yearly" ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                  backgroundColor: selectedPlan === "yearly" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
                  padding: 14,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <View style={{ position: "absolute", top: 0, right: 0, backgroundColor: "#FFFFFF", borderBottomLeftRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 9, color: themeColors.primary, letterSpacing: 0.5 }}>BEST VALUE</Text>
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

              {/* Quarterly */}
              <Pressable
                onPress={() => { selectHaptic(); setSelectedPlan("three_month"); }}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  borderWidth: selectedPlan === "three_month" ? 2.5 : 1.5,
                  borderColor: selectedPlan === "three_month" ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                  backgroundColor: selectedPlan === "three_month" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
                  padding: 14,
                }}
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
            <Animated.View entering={FadeIn.delay(260).duration(600).easing(SOFT)} style={{ alignItems: "center" }}>
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
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, gap: 8 }}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={{ color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 18 }}>
                        Reactivate Now
                      </Text>
                      <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Downgrade option */}
              <Pressable onPress={() => setShowExitModal(true)} style={{ marginTop: 12 }}>
                <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.50)", fontSize: 13, textAlign: "center" }}>
                  Or switch to monthly ({monthlyPrice}/mo)
                </Text>
              </Pressable>

              {/* Fine print */}
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                  textAlign: "center",
                  marginTop: 10,
                  lineHeight: 15,
                }}
              >
                {selectedPlan === "yearly"
                  ? `${yearlyPrice}/yr · Cancel anytime`
                  : `${threeMonthPrice} every 3 months · Cancel anytime`}
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
                  onPress={() => { tapHaptic(); setSubscription(true, selectedPlan === "three_month" ? "quarterly" : selectedPlan); }}
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
        onDecline={() => setShowExitModal(false)}
        isPurchasing={isPurchasingMonthly}
        monthlyPrice={monthlyPrice}
      />
    </View>
  );
}
