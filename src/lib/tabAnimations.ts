/**
 * tabAnimations.ts
 *
 * Shared entrance animation constants for all five main tab screens:
 * Record, Entries, Insights, Awards, Settings.
 *
 * Easing curve — same SOFT bezier as onboarding WelcomeScreen:
 *   Easing.bezier(0.22, 1, 0.36, 1) — gentle deceleration, low overwhelm.
 *   Preserves the app's calm, intentional personality on returning screens.
 *
 * Duration & stagger — tuned for returning users switching tabs:
 *   900ms / 150ms stagger → too slow for a screen you've seen before.
 *   400ms / 60ms stagger  → responsive and fluid; still feels deliberate,
 *   not abrupt. First section has zero delay so content is immediate.
 *   Total animation window: ~700ms vs the previous ~1750ms.
 *
 * Usage:
 *   import { TAB_ENTER_1, TAB_ENTER_2, TAB_ENTER_3 } from "@/lib/tabAnimations";
 *   <Animated.View entering={TAB_ENTER_1}> ... </Animated.View>
 */
import { FadeIn, Easing } from "react-native-reanimated";

/** Same easing as WelcomeScreen SOFT — warm deceleration */
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

export const TAB_ENTER_1 = FadeIn.duration(400).delay(0).easing(SOFT);
export const TAB_ENTER_2 = FadeIn.duration(400).delay(60).easing(SOFT);
export const TAB_ENTER_3 = FadeIn.duration(400).delay(120).easing(SOFT);
export const TAB_ENTER_4 = FadeIn.duration(400).delay(180).easing(SOFT);
export const TAB_ENTER_5 = FadeIn.duration(400).delay(240).easing(SOFT);
export const TAB_ENTER_6 = FadeIn.duration(400).delay(300).easing(SOFT);
