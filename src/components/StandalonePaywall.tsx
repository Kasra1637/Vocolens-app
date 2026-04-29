/**
 * Standalone Paywall
 *
 * Shown post-onboarding when the user's subscription has lapsed or cannot be verified.
 * Mirrors the onboarding PaywallScreen UI but operates independently of the onboarding flow.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { tapHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
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
  type LucideIcon,
} from 'lucide-react-native';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from '@/lib/revenuecatClient';
import type { PurchasesPackage } from 'react-native-purchases';
import { NotificationService } from '@/lib/services/notification-service';

type PricingPlan = 'monthly' | 'yearly';

const MONTHLY_PRICE = '$9.99';
const YEARLY_PRICE  = '$79.99';
const YEARLY_FULL   = '$119.88';
const YEARLY_SAVING = '33%';

const BENEFITS: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Moon,     title: 'Better Sleep',              description: 'Voice journaling before bed clears mental chatter, helping you fall asleep faster and wake up refreshed.' },
  { icon: Smile,    title: 'Improved Mood',             description: 'Daily emotional check-ins create awareness of your mood patterns, giving you tools to shift your state.' },
  { icon: Brain,    title: 'Reduced Anxiety',           description: 'Expressing thoughts out loud reduces the mental load of worry, quieting your anxious mind.' },
  { icon: BookOpen, title: 'Enhanced Self-Reflection',  description: 'AI-powered insights reveal patterns in your entries you might never have noticed on your own.' },
  { icon: Heart,    title: 'Better Emotional Awareness',description: 'Track how you feel over time and discover what truly impacts your emotional wellbeing.' },
  { icon: Mic,      title: 'Always-On Transcription',   description: 'The most persistent and reliable voice transcription service on the market — always ready when you are.' },
  { icon: Activity, title: 'Voice Intelligence',        description: 'The only voice journaling app that uses your voice pace, speed, and tone to analyze and improve your life.' },
];

function BenefitsCarousel() {
  const [activeIndex, setActiveIndex]   = useState(0);
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));
  const benefit = BENEFITS[displayIndex];
  const Icon = benefit.icon;

  return (
    <View style={{ marginBottom: 2, paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 18, marginBottom: 10 }}>
        What you'll gain
      </Text>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', minHeight: 96 }, cardStyle]}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
          <Icon size={20} color="#FFFFFF" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 5 }}>{benefit.title}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 }}>{benefit.description}</Text>
        </View>
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {BENEFITS.map((_, i) => (
          <Pressable key={i} onPress={() => { if (intervalRef.current) clearInterval(intervalRef.current); transitionTo(i); startAutoPlay(); }}>
            <View style={{ width: i === activeIndex ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeIndex ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function StandalonePaywall() {
  const selectedTheme           = useOnboardingStore((s) => s.selectedTheme);
  const notificationPreferences = useOnboardingStore((s) => s.notificationPreferences);
  const themeColors             = THEME_COLORS[selectedTheme];
  const setSubscription         = useSubscriptionStore((s) => s.setSubscription);

  const [selectedPlan,    setSelectedPlan]    = useState<PricingPlan>('yearly');
  const [monthlyPackage,  setMonthlyPackage]  = useState<PurchasesPackage | null>(null);
  const [yearlyPackage,   setYearlyPackage]   = useState<PurchasesPackage | null>(null);
  const [isPurchasing,    setIsPurchasing]    = useState(false);
  const [isRestoring,     setIsRestoring]     = useState(false);

  const monthlyScale = useSharedValue(1);
  const yearlyScale  = useSharedValue(1);
  const monthlyAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: monthlyScale.value }] }));
  const yearlyAnimStyle  = useAnimatedStyle(() => ({ transform: [{ scale: yearlyScale.value  }] }));

  useEffect(() => {
    if (!isRevenueCatEnabled()) return;
    getOfferings().then((result) => {
      if (!result.ok || !result.data.current) return;
      const pkgs = result.data.current.availablePackages;
      setMonthlyPackage(pkgs.find((p) => p.identifier === '$rc_monthly') ?? null);
      setYearlyPackage(pkgs.find((p) => p.identifier === '$rc_annual')  ?? null);
    });
  }, []);

  const handleSelectPlan = (plan: PricingPlan) => {
    tapHaptic();
    setSelectedPlan(plan);
    const sv = plan === 'monthly' ? monthlyScale : yearlyScale;
    sv.value = withSpring(0.97, { damping: 12 }, () => { sv.value = withSpring(1); });
  };

  const handleContinue = async () => {
    if (!isRevenueCatEnabled()) {
      // Dev / test — grant access without a real purchase
      successHaptic();
      setSubscription(true, selectedPlan);
      if (selectedPlan === 'yearly') NotificationService.scheduleTrialEndReminder(null);
      return;
    }

    const pkg = selectedPlan === 'monthly' ? monthlyPackage : yearlyPackage;
    if (!pkg) {
      // Packages not loaded — only unblock for yearly (trial) flows in dev
      if (selectedPlan === 'yearly') {
        successHaptic();
        setSubscription(true, 'yearly');
        NotificationService.scheduleTrialEndReminder(null);
      }
      return;
    }

    setIsPurchasing(true);
    const result = await purchasePackage(pkg);
    setIsPurchasing(false);

    if (result.ok) {
      successHaptic();
      setSubscription(true, selectedPlan);
      if (selectedPlan === 'yearly') {
        const expirationDate = result.data.entitlements.active?.['premium']?.expirationDate ?? null;
        NotificationService.scheduleTrialEndReminder(expirationDate);
      }
    } else if (result.reason === 'sdk_error') {
      const userCancelled = (result.error as any)?.userCancelled === true;
      if (userCancelled) {
        errorHaptic();
        // Stay on paywall — user cancelled intentionally
      } else if (selectedPlan === 'yearly') {
        // Non-cancel SDK error on yearly (trial) — grant access optimistically
        successHaptic();
        setSubscription(true, 'yearly');
        NotificationService.scheduleTrialEndReminder(null);
      } else {
        // Monthly SDK error — do NOT grant access; show a generic error
        errorHaptic();
        Alert.alert('Payment Error', 'Something went wrong processing your payment. Please try again.');
      }
    }
  };

  const handleRestore = async () => {
    if (!isRevenueCatEnabled()) return;
    setIsRestoring(true);
    const result = await restorePurchases();
    setIsRestoring(false);
    if (result.ok) {
      const isActive = Boolean(result.data.entitlements.active?.['premium']);
      if (isActive) {
        successHaptic();
        setSubscription(true);
        // Re-schedule daily reminders from saved preferences after restore
        if (notificationPreferences?.time && notificationPreferences.days.length > 0) {
          NotificationService.rescheduleFromPreferences(
            notificationPreferences.time,
            notificationPreferences.days,
            true,
          );
        }
      } else {
        errorHaptic();
        Alert.alert('No Active Subscription', 'We couldn\'t find an active subscription to restore.');
      }
    } else {
      errorHaptic();
      Alert.alert('Restore Failed', 'We couldn\'t find any previous purchases to restore.');
    }
  };

  const timelineSteps: { icon: LucideIcon; label: string; sublabel: string }[] = [
    { icon: Unlock,     label: 'Today',                      sublabel: 'Unlock all features instantly.' },
    { icon: BellRing,   label: 'In 2 Days — Reminder',       sublabel: 'We\'ll remind you before your trial ends.' },
    { icon: CreditCard, label: 'In 3 Days — Billing Starts', sublabel: 'You\'ll be charged unless you cancel.' },
  ];

  const ctaLabel = isPurchasing
    ? 'Processing…'
    : selectedPlan === 'yearly'
    ? 'Start my 3-day free trial'
    : 'Start my journey';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={themeColors.backgroundGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 340 }}>
            <Animated.View entering={FadeInDown.delay(50).duration(600)} style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 22, textAlign: 'center', lineHeight: 30 }}>
                {selectedPlan === 'yearly'
                  ? 'Start your 3-day FREE trial\nto continue.'
                  : 'Upgrade to Premium\n& unlock everything.'}
              </Text>
            </Animated.View>

            {selectedPlan === 'yearly' && (
              <Animated.View entering={FadeInUp.delay(150).duration(500)} style={{ marginHorizontal: 24, borderRadius: 24, padding: 20, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }}>
                {timelineSteps.map((step, i) => {
                  const Icon = step.icon;
                  const isLast = i === timelineSteps.length - 1;
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                      <View style={{ alignItems: 'center', marginRight: 16, width: 44 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' }}>
                          <Icon size={20} color="#FFFFFF" strokeWidth={2} />
                        </View>
                        {!isLast && <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 }} />}
                      </View>
                      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16, paddingTop: 2 }}>
                        <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 3 }}>{step.label}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 22 }}>{step.sublabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </Animated.View>
            )}

            <Animated.View entering={FadeInUp.delay(250).duration(500)}>
              <BenefitsCarousel />
            </Animated.View>
          </ScrollView>

          {/* Fixed bottom */}
          <LinearGradient
            colors={[themeColors.secondary, themeColors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}
          >
            <View style={{ gap: 10, marginBottom: 14 }}>
              {/* Yearly card */}
              <Animated.View style={yearlyAnimStyle}>
                <Pressable onPress={() => handleSelectPlan('yearly')} style={{ borderRadius: 20, borderWidth: selectedPlan === 'yearly' ? 2.5 : 1.5, borderColor: selectedPlan === 'yearly' ? '#FFFFFF' : 'rgba(255,255,255,0.32)', backgroundColor: selectedPlan === 'yearly' ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)', padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 7 }}>
                      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                        <Text style={{ color: themeColors.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.6 }}>3 DAYS FREE</Text>
                      </View>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                        <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.4 }}>SAVE {YEARLY_SAVING}</Text>
                      </View>
                    </View>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selectedPlan === 'yearly' ? 0 : 1.5, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: selectedPlan === 'yearly' ? '#FFFFFF' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedPlan === 'yearly' && <Check size={13} color={themeColors.primary} strokeWidth={3} />}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_700Bold', fontSize: 12, marginBottom: 3 }}>Yearly</Text>
                      <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 28 }}>{YEARLY_PRICE}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter_400Regular', fontSize: 12, textDecorationLine: 'line-through', marginBottom: 4 }}>{YEARLY_FULL}</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>

              {/* Monthly card */}
              <Animated.View style={monthlyAnimStyle}>
                <Pressable onPress={() => handleSelectPlan('monthly')} style={{ borderRadius: 16, borderWidth: selectedPlan === 'monthly' ? 2 : 1.5, borderColor: selectedPlan === 'monthly' ? '#FFFFFF' : 'rgba(255,255,255,0.28)', backgroundColor: selectedPlan === 'monthly' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)', paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_700Bold', fontSize: 11, marginBottom: 2 }}>Monthly</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 20 }}>{MONTHLY_PRICE}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', fontSize: 12 }}>per month</Text>
                    </View>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selectedPlan === 'monthly' ? 0 : 1.5, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: selectedPlan === 'monthly' ? '#FFFFFF' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedPlan === 'monthly' && <Check size={13} color={themeColors.primary} strokeWidth={3} />}
                  </View>
                </Pressable>
              </Animated.View>
            </View>

            {/* CTA */}
            <Pressable onPress={handleContinue} disabled={isPurchasing} style={{ width: '100%', borderRadius: 16, borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: Platform.OS === 'android' ? 0 : 8, opacity: isPurchasing ? 0.75 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontFamily: 'Inter_700Bold', marginRight: 6 }}>{ctaLabel}</Text>
                    <ChevronRight size={20} color="#FFFFFF" />
                  </>
                )}
              </View>
            </Pressable>

            <Text style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              {selectedPlan === 'yearly'
                ? `3 days free, then ${YEARLY_PRICE}/yr. Cancel anytime.`
                : `${MONTHLY_PRICE}/mo. Cancel anytime.`}
            </Text>

            <Pressable onPress={handleRestore} disabled={isRestoring} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter_400Regular', fontSize: 12 }}>
                {isRestoring ? 'Restoring…' : 'Restore purchases'}
              </Text>
            </Pressable>
          </LinearGradient>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
