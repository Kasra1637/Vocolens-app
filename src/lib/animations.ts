import {
  FadeInDown,
  FadeOutUp,
  FadeInUp,
  Easing,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

export const ANIM_DURATION = 400;
export const STAGGER_DELAY = 80;

/**
 * Screen Transitions:
 * Incoming: Fades in while drifting down 16px into place.
 */
export const SCREEN_IN = FadeInDown.duration(ANIM_DURATION).easing(
  Easing.out(Easing.quad),
);

/**
 * Screen Transitions:
 * Outgoing: Fades out while drifting up 16px.
 */
export const SCREEN_OUT = FadeOutUp.duration(ANIM_DURATION).easing(
  Easing.in(Easing.quad),
);

/**
 * Content Reveal:
 * Fading up from slightly below (starts 16px below, ends at 0).
 * Staggered delay applied based on index.
 */
export const getStaggeredFadeIn = (index: number) => {
  return FadeInUp.delay(index * STAGGER_DELAY)
    .duration(500)
    .springify()
    .damping(20)
    .stiffness(90);
};

/**
 * Progress bars and Data:
 * 900ms duration with soft easing.
 */
export const PROGRESS_ANIM_CONFIG = {
  duration: 900,
  easing: Easing.out(Easing.quad),
};

/**
 * Button Press Configuration
 */
export const BUTTON_PRESS_SCALE = 0.97;
export const BUTTON_RELEASE_DURATION = 150;

/**
 * Pulse Animation for Onboarding Continue Button
 * 4 second period (2s up, 2s down).
 */
export const PULSE_CONFIG = {
  duration: 2000,
  easing: Easing.inOut(Easing.quad),
};
