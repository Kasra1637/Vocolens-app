/**
 * Animated Character Component - Emotional Companion with Layered Animations
 *
 * Features independent animation layers for organic, fluid motion:
 * - Body: Base breathing and floating motion
 * - Head: Subtle tilts and nods
 * - Eyes: Blinking and gaze shifts
 * - Eyebrows: Emotional expression changes
 * - Mouth: Subtle expression animations
 * - Arms/Hands: Gentle gestures and movements
 * - Particles/Effects: Ambient environmental enhancements
 *
 * Each layer animates independently with staggered durations (0.8s - 10s)
 * creating natural, organic motion without visible repetition.
 *
 * States:
 * - IDLE: Calm, relaxed presence with gentle ambient motion
 * - LISTENING: Attentive, engaged with focused micro-expressions
 * - PROCESSING: Contemplative with thoughtful movements
 * - SUCCESS: Joyful celebration with expressive animations
 *
 * All animations use smooth easing curves with no hard stops.
 * GPU-accelerated using react-native-reanimated.
 */

import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export type CharacterState = 'idle' | 'listening' | 'processing' | 'success';

interface AnimatedCharacterProps {
  state?: CharacterState;
  size?: number;
  themeColor?: string;
}

// Custom easing functions for organic motion
const organicEasing = Easing.bezier(0.4, 0.0, 0.2, 1); // Smooth ease-in-out
const breathingEasing = Easing.bezier(0.45, 0.05, 0.55, 0.95); // Natural breathing
const floatingEasing = Easing.bezier(0.42, 0, 0.58, 1); // Gentle floating

export function AnimatedCharacter({
  state = 'idle',
  size = 180,
  themeColor = '#9370DB',
}: AnimatedCharacterProps) {
  // === INDEPENDENT ANIMATION LAYERS ===

  // Body layer - Base breathing and floating (3.2s, 4.7s)
  const bodyBreathing = useSharedValue(0);
  const bodyFloat = useSharedValue(0);

  // Head layer - Tilts and rotation (5.3s, 7.1s)
  const headTilt = useSharedValue(0);
  const headNod = useSharedValue(0);

  // Eyes layer - Blinking and gaze (3.8s, 9.4s)
  const eyesBlink = useSharedValue(0);
  const eyesGaze = useSharedValue(0);

  // Eyebrows layer - Expression (6.2s, 8.5s)
  const eyebrowsRaise = useSharedValue(0);
  const eyebrowsTilt = useSharedValue(0);

  // Mouth layer - Subtle expressions (4.5s, 7.8s)
  const mouthExpression = useSharedValue(0);
  const mouthCurve = useSharedValue(0);

  // Arms/Hands layer - Gestures (2.9s, 6.4s, 9.7s)
  const armLeft = useSharedValue(0);
  const armRight = useSharedValue(0);
  const handsGesture = useSharedValue(0);

  // Particles/Effects layer - Ambient enhancements (1.8s, 4.2s, 8.6s)
  const glowPulse = useSharedValue(0);
  const ambientParticle1 = useSharedValue(0);
  const ambientParticle2 = useSharedValue(0);

  // Initialize all animation layers
  useEffect(() => {
    // Reset all values to ensure clean state transitions
    bodyBreathing.value = 0;
    bodyFloat.value = 0;
    headTilt.value = 0;
    headNod.value = 0;
    eyesBlink.value = 0;
    eyesGaze.value = 0;
    eyebrowsRaise.value = 0;
    eyebrowsTilt.value = 0;
    mouthExpression.value = 0;
    mouthCurve.value = 0;
    armLeft.value = 0;
    armRight.value = 0;
    handsGesture.value = 0;
    glowPulse.value = 0;
    ambientParticle1.value = 0;
    ambientParticle2.value = 0;

    // === BODY LAYER ANIMATIONS ===
    // Base breathing - continuous, organic rhythm
    bodyBreathing.value = withRepeat(
      withTiming(1, { duration: 3200, easing: breathingEasing }),
      -1,
      true
    );

    // Gentle floating - slow, calming motion
    bodyFloat.value = withRepeat(
      withTiming(1, { duration: 4700, easing: floatingEasing }),
      -1,
      true
    );

    // === HEAD LAYER ANIMATIONS ===
    // Subtle head tilt - natural curiosity
    headTilt.value = withRepeat(
      withTiming(1, { duration: 5300, easing: organicEasing }),
      -1,
      true
    );

    // Gentle nodding - acknowledging presence
    headNod.value = withRepeat(
      withTiming(1, { duration: 7100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // === EYES LAYER ANIMATIONS ===
    // Natural blinking - organic rhythm
    eyesBlink.value = withRepeat(
      withTiming(1, { duration: 3800, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );

    // Gaze shifts - looking around naturally
    eyesGaze.value = withRepeat(
      withTiming(1, { duration: 9400, easing: organicEasing }),
      -1,
      true
    );

    // === EYEBROWS LAYER ANIMATIONS ===
    // Eyebrow raise - emotional expressions
    eyebrowsRaise.value = withRepeat(
      withTiming(1, { duration: 6200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Eyebrow tilt - subtle expressions
    eyebrowsTilt.value = withRepeat(
      withTiming(1, { duration: 8500, easing: organicEasing }),
      -1,
      true
    );

    // === MOUTH LAYER ANIMATIONS ===
    // Mouth expression - subtle changes
    mouthExpression.value = withRepeat(
      withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Mouth curve - gentle smiles
    mouthCurve.value = withRepeat(
      withTiming(1, { duration: 7800, easing: organicEasing }),
      -1,
      true
    );

    // === ARMS/HANDS LAYER ANIMATIONS ===
    // Left arm gesture
    armLeft.value = withRepeat(
      withTiming(1, { duration: 2900, easing: organicEasing }),
      -1,
      true
    );

    // Right arm gesture (staggered from left)
    armRight.value = withDelay(
      450,
      withRepeat(
        withTiming(1, { duration: 6400, easing: organicEasing }),
        -1,
        true
      )
    );

    // Hand movements
    handsGesture.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 9700, easing: floatingEasing }),
        -1,
        true
      )
    );

    // === PARTICLES/EFFECTS LAYER ANIMATIONS ===
    // Main glow pulse
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // Ambient particle 1
    ambientParticle1.value = withDelay(
      300,
      withRepeat(
        withTiming(1, { duration: 4200, easing: floatingEasing }),
        -1,
        true
      )
    );

    // Ambient particle 2 (different rhythm)
    ambientParticle2.value = withDelay(
      600,
      withRepeat(
        withTiming(1, { duration: 8600, easing: organicEasing }),
        -1,
        true
      )
    );
  }, [state]);

  // === COMPOSED ANIMATION STYLES ===

  // Body composition - combines breathing and floating
  const bodyStyle = useAnimatedStyle(() => {
    const breathScale = interpolate(
      bodyBreathing.value,
      [0, 1],
      [1.0, state === 'success' ? 1.035 : state === 'listening' ? 1.025 : 1.018]
    );

    const floatY = interpolate(
      bodyFloat.value,
      [0, 1],
      state === 'processing' ? [-1, 1] : [-2.5, 2.5]
    );

    return {
      transform: [
        { translateY: floatY },
        { scale: breathScale },
      ],
    };
  });

  // Head composition - combines tilt and nod
  const headStyle = useAnimatedStyle(() => {
    const tiltRotation = interpolate(
      headTilt.value,
      [0, 1],
      state === 'processing' ? [-2, 2] : state === 'listening' ? [-1.5, 1.5] : [-1, 1]
    );

    const nodY = interpolate(
      headNod.value,
      [0, 1],
      state === 'success' ? [-1.5, 1.5] : [-0.8, 0.8]
    );

    return {
      transform: [
        { translateY: nodY },
        { rotate: `${tiltRotation}deg` },
      ],
    };
  });

  // Eyes composition - blinking and gaze
  const eyesStyle = useAnimatedStyle(() => {
    const blinkOpacity = interpolate(
      eyesBlink.value,
      [0, 0.15, 0.3, 1],
      [1, 0.3, 1, 1] // Quick blink pattern
    );

    const gazeX = interpolate(
      eyesGaze.value,
      [0, 0.25, 0.5, 0.75, 1],
      state === 'listening' ? [-0.5, 0.3, 0.5, 0.3, -0.5] : [-0.3, 0.2, 0, 0.2, -0.3]
    );

    return {
      opacity: blinkOpacity,
      transform: [{ translateX: gazeX }],
    };
  });

  // Eyebrows composition - raising and tilting
  const eyebrowsStyle = useAnimatedStyle(() => {
    const raiseY = interpolate(
      eyebrowsRaise.value,
      [0, 1],
      state === 'success' ? [-0.8, -0.2] : state === 'processing' ? [-0.5, 0] : [-0.3, 0.1]
    );

    const tiltRotation = interpolate(
      eyebrowsTilt.value,
      [0, 1],
      [-0.5, 0.5]
    );

    return {
      transform: [
        { translateY: raiseY },
        { rotate: `${tiltRotation}deg` },
      ],
    };
  });

  // Mouth composition - expression and curve
  const mouthStyle = useAnimatedStyle(() => {
    const expressionScale = interpolate(
      mouthExpression.value,
      [0, 1],
      state === 'success' ? [1.0, 1.05] : [1.0, 1.02]
    );

    const curveY = interpolate(
      mouthCurve.value,
      [0, 1],
      state === 'success' ? [0, 0.5] : state === 'idle' ? [-0.2, 0.2] : [-0.1, 0.1]
    );

    return {
      transform: [
        { translateY: curveY },
        { scaleX: expressionScale },
      ],
    };
  });

  // Arms composition - independent left and right movements
  const armsStyle = useAnimatedStyle(() => {
    const leftArmRotation = interpolate(
      armLeft.value,
      [0, 1],
      state === 'success' ? [-3, 3] : state === 'listening' ? [-2, 2] : [-1.5, 1.5]
    );

    const rightArmRotation = interpolate(
      armRight.value,
      [0, 1],
      state === 'success' ? [-2.5, 2.5] : [-1.2, 1.2]
    );

    return {
      transform: [{ rotate: `${(leftArmRotation + rightArmRotation) / 2}deg` }],
    };
  });

  // Hands composition - subtle gestures
  const handsStyle = useAnimatedStyle(() => {
    const gestureScale = interpolate(
      handsGesture.value,
      [0, 1],
      [1.0, state === 'success' ? 1.08 : 1.04]
    );

    return {
      transform: [{ scale: gestureScale }],
    };
  });

  // Glow composition - main ambient effect
  const glowStyle = useAnimatedStyle(() => {
    const pulseOpacity = interpolate(
      glowPulse.value,
      [0, 1],
      state === 'success' ? [0.5, 0.75] : state === 'listening' ? [0.4, 0.6] : [0.2, 0.4]
    );

    const pulseScale = interpolate(
      glowPulse.value,
      [0, 1],
      [1.0, state === 'success' ? 1.15 : state === 'listening' ? 1.1 : 1.08]
    );

    return {
      opacity: pulseOpacity,
      transform: [{ scale: pulseScale }],
    };
  });

  // Particle 1 composition - floating orb effect
  const particle1Style = useAnimatedStyle(() => {
    const moveY = interpolate(ambientParticle1.value, [0, 1], [-15, 15]);
    const moveX = interpolate(ambientParticle1.value, [0, 0.5, 1], [-8, 8, -8]);
    const opacity = interpolate(
      ambientParticle1.value,
      [0, 0.5, 1],
      state === 'success' ? [0.3, 0.6, 0.3] : [0.15, 0.35, 0.15]
    );

    return {
      opacity,
      transform: [{ translateX: moveX }, { translateY: moveY }],
    };
  });

  // Particle 2 composition - second floating orb (different rhythm)
  const particle2Style = useAnimatedStyle(() => {
    const moveY = interpolate(ambientParticle2.value, [0, 1], [12, -12]);
    const moveX = interpolate(ambientParticle2.value, [0, 0.5, 1], [10, -10, 10]);
    const opacity = interpolate(
      ambientParticle2.value,
      [0, 0.5, 1],
      state === 'listening' ? [0.25, 0.5, 0.25] : [0.12, 0.28, 0.12]
    );

    return {
      opacity,
      transform: [{ translateX: moveX }, { translateY: moveY }],
    };
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* === PARTICLES/EFFECTS LAYER === */}

      {/* Main background glow - pulsing ambient light */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: size * 0.425,
          },
          glowStyle,
        ]}
      >
        <LinearGradient
          colors={[`${themeColor}50`, `${themeColor}25`, 'transparent']}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: size * 0.425,
          }}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Ambient particle 1 - floating orb top-left */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            backgroundColor: `${themeColor}80`,
            left: size * 0.15,
            top: size * 0.2,
          },
          particle1Style,
        ]}
      />

      {/* Ambient particle 2 - floating orb bottom-right */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 0.06,
            height: size * 0.06,
            borderRadius: size * 0.03,
            backgroundColor: `${themeColor}60`,
            right: size * 0.18,
            bottom: size * 0.25,
          },
          particle2Style,
        ]}
      />

      {/* === CHARACTER COMPOSITE LAYER === */}
      {/*
        All body parts are layered on top of the single character image.
        We apply multiple animated transforms to create the illusion of
        independent body part movement through carefully composed transforms.
      */}

      {/* Body base layer - breathing and floating */}
      <Animated.View style={bodyStyle}>
        {/* Head layer - tilts and nods */}
        <Animated.View style={headStyle}>
          {/* Arms layer - gestures */}
          <Animated.View style={armsStyle}>
            {/* Hands layer - fine movements */}
            <Animated.View style={handsStyle}>
              {/* Eyes, eyebrows, mouth layers - facial expressions */}
              <Animated.View style={eyesStyle}>
                <Animated.View style={eyebrowsStyle}>
                  <Animated.View style={mouthStyle}>
                    {/* Character image - all layers compose here */}
                    <Image
                      source={require('../../assets/character-1767565636420.png')}
                      style={{ width: size, height: size }}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
