/**
 * Emotional Companion Character - Person on a Bell
 *
 * A continuously animated character that reacts emotionally to app states.
 * Built with independent animation layers for organic, lifelike motion.
 * Designed as a person sitting on a bell - perfect metaphor for voice journaling.
 *
 * Features:
 * - 7 independent animation layers (body, head, eyes, eyebrows, mouth, arms, particles)
 * - 5 emotional states (idle, listening, processing, success, error)
 * - Staggered timing (0.8s - 10s) prevents visible repetition
 * - GPU-accelerated with smooth easing curves
 * - Person-on-a-bell design - engaging journaling metaphor
 * - Large expressive eyes with continuous sparkle effects
 * - Simple round cute smile - friendly and approachable
 * - Bell shape represents voice/sound journaling concept
 *
 * States:
 * - IDLE: Friendly invitation with natural blinking and scanning
 * - LISTENING: Active listening with engaged expressions
 * - PROCESSING: Contemplative thinking with head tilts
 * - SUCCESS: Joyful celebration with bouncing and sparkling
 * - ERROR: Empathetic support with comforting sway
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

export type CompanionState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface EmotionalCompanionProps {
  state?: CompanionState;
  size?: number;
  themeColor?: string;
}

// Custom organic easing functions
const organicEasing = Easing.bezier(0.4, 0.0, 0.2, 1);
const breathingEasing = Easing.bezier(0.45, 0.05, 0.55, 0.95);
const floatingEasing = Easing.bezier(0.42, 0, 0.58, 1);
const bouncyEasing = Easing.bezier(0.68, -0.55, 0.265, 1.55);

export function EmotionalCompanion({
  state = 'idle',
  size = 200,
  themeColor = '#8B5CF6',
}: EmotionalCompanionProps) {
  // === INDEPENDENT ANIMATION LAYERS ===

  // Body layer - Base breathing and floating (3.4s, 5.2s)
  const bodyBreathing = useSharedValue(0);
  const bodyFloat = useSharedValue(0);
  const bodyBounce = useSharedValue(0);

  // Head layer - Tilts and nods (4.8s, 6.7s, 8.3s)
  const headTilt = useSharedValue(0);
  const headNod = useSharedValue(0);
  const headRock = useSharedValue(0);

  // Eyes layer - Blinking and gaze (4.5s, 7.8s, 9.2s)
  const eyesBlink = useSharedValue(1); // 1 = open, 0 = closed
  const eyesGazeX = useSharedValue(0);
  const eyesGazeY = useSharedValue(0);
  const eyesSparkle = useSharedValue(0);

  // Eyebrows layer - Expression (5.5s, 7.3s)
  const eyebrowsRaise = useSharedValue(0);
  const eyebrowsTilt = useSharedValue(0);
  const eyebrowsFurrow = useSharedValue(0);

  // Mouth layer - Smiles and expressions (3.8s, 6.4s, 8.9s)
  const mouthSmile = useSharedValue(0);
  const mouthPulse = useSharedValue(0);
  const mouthWidth = useSharedValue(1);

  // Arms/Hands layer - Gestures (2.9s, 5.6s, 7.9s, 9.4s)
  const armLeftRotation = useSharedValue(0);
  const armRightRotation = useSharedValue(0);
  const armLeftY = useSharedValue(0);
  const armRightY = useSharedValue(0);

  // Initialize animations based on state
  useEffect(() => {
    // Reset all animations
    bodyBreathing.value = 0;
    bodyFloat.value = 0;
    bodyBounce.value = 0;
    headTilt.value = 0;
    headNod.value = 0;
    headRock.value = 0;
    eyesBlink.value = 1;
    eyesGazeX.value = 0;
    eyesGazeY.value = 0;
    eyesSparkle.value = 0;
    eyebrowsRaise.value = 0;
    eyebrowsTilt.value = 0;
    eyebrowsFurrow.value = 0;
    mouthSmile.value = 0;
    mouthPulse.value = 0;
    mouthWidth.value = 1;
    armLeftRotation.value = 0;
    armRightRotation.value = 0;
    armLeftY.value = 0;
    armRightY.value = 0;

    // === BODY LAYER ===
    if (state === 'success') {
      // Joyful bouncing
      bodyBounce.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: bouncyEasing }),
          withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
        ),
        -1,
        false
      );
    } else {
      // Normal breathing and floating
      bodyBreathing.value = withRepeat(
        withTiming(1, { duration: 3400, easing: breathingEasing }),
        -1,
        true
      );
      bodyFloat.value = withRepeat(
        withTiming(1, { duration: 5200, easing: floatingEasing }),
        -1,
        true
      );
    }

    // === HEAD LAYER ===
    if (state === 'processing') {
      // Thinking head tilt side-to-side
      headTilt.value = withRepeat(
        withTiming(1, { duration: 4800, easing: organicEasing }),
        -1,
        true
      );
      headRock.value = withRepeat(
        withTiming(1, { duration: 8300, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (state === 'error') {
      // Slow comforting sway
      headTilt.value = withRepeat(
        withTiming(1, { duration: 6700, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    } else {
      // Normal nodding
      headNod.value = withRepeat(
        withTiming(1, { duration: 6700, easing: organicEasing }),
        -1,
        true
      );
    }

    // === EYES LAYER ===
    if (state === 'idle') {
      // Natural blinking every 4-5 seconds
      eyesBlink.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 4000 }),
          withTiming(0, { duration: 100, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 100, easing: Easing.in(Easing.ease) }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
      // Eyes scan left → right → center
      eyesGazeX.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 2600, easing: organicEasing }),
          withTiming(1, { duration: 2600, easing: organicEasing }),
          withTiming(0, { duration: 2600, easing: organicEasing })
        ),
        -1,
        false
      );
    } else if (state === 'listening') {
      // Wide, engaged eyes tracking
      eyesBlink.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 6000 }),
          withTiming(0.3, { duration: 80 }),
          withTiming(1, { duration: 80 })
        ),
        -1,
        false
      );
      eyesGazeX.value = withRepeat(
        withTiming(1, { duration: 3200, easing: organicEasing }),
        -1,
        true
      );
    } else if (state === 'processing') {
      // Thinking patterns
      eyesGazeX.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: organicEasing }),
          withTiming(-0.5, { duration: 1500, easing: organicEasing }),
          withTiming(0, { duration: 1000, easing: organicEasing })
        ),
        -1,
        false
      );
      eyesGazeY.value = withRepeat(
        withTiming(1, { duration: 5500, easing: organicEasing }),
        -1,
        true
      );
    } else if (state === 'success') {
      // Sparkle and twinkle
      eyesSparkle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })
        ),
        -1,
        false
      );
    } else if (state === 'error') {
      // Gentle empathetic blinking
      eyesBlink.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3500 }),
          withTiming(0, { duration: 150 }),
          withTiming(1, { duration: 150 })
        ),
        -1,
        false
      );
      // Eyes move with concern
      eyesGazeY.value = withRepeat(
        withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }

    // === EYEBROWS LAYER ===
    if (state === 'idle') {
      // Occasionally lift
      eyebrowsRaise.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 5000 }),
          withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })
        ),
        -1,
        false
      );
    } else if (state === 'listening') {
      // Animated with excitement
      eyebrowsRaise.value = withRepeat(
        withTiming(1, { duration: 2800, easing: organicEasing }),
        -1,
        true
      );
    } else if (state === 'processing') {
      // Subtle furrow
      eyebrowsFurrow.value = withRepeat(
        withTiming(1, { duration: 5500, easing: organicEasing }),
        -1,
        true
      );
    } else if (state === 'error') {
      // Soft angled worried eyebrows
      eyebrowsTilt.value = withRepeat(
        withTiming(1, { duration: 7300, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }

    // === MOUTH LAYER ===
    // Always animate smile in all states for continuous expression
    if (state === 'idle') {
      // Smile subtly grows and shrinks
      mouthSmile.value = withRepeat(
        withTiming(1, { duration: 6400, easing: organicEasing }),
        -1,
        true
      );
    } else if (state === 'listening') {
      // Pulsing as if actively listening
      mouthSmile.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      mouthPulse.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      mouthWidth.value = withRepeat(
        withTiming(1.15, { duration: 3800, easing: organicEasing }),
        -1,
        true
      );
    } else if (state === 'success') {
      // Large pulsing smile
      mouthSmile.value = withRepeat(
        withTiming(1, { duration: 800, easing: bouncyEasing }),
        -1,
        true
      );
      mouthWidth.value = withRepeat(
        withTiming(1.3, { duration: 800, easing: bouncyEasing }),
        -1,
        true
      );
    } else if (state === 'processing') {
      // Gentle thoughtful smile animation
      mouthSmile.value = withRepeat(
        withTiming(1, { duration: 5000, easing: organicEasing }),
        -1,
        true
      );
    } else if (state === 'error') {
      // Soft comforting smile animation
      mouthSmile.value = withRepeat(
        withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }

    // === ARMS LAYER ===
    if (state === 'listening') {
      // Arms moving energetically
      armLeftRotation.value = withRepeat(
        withTiming(1, { duration: 2900, easing: organicEasing }),
        -1,
        true
      );
      armRightRotation.value = withDelay(
        400,
        withRepeat(
          withTiming(1, { duration: 5600, easing: organicEasing }),
          -1,
          true
        )
      );
    } else if (state === 'processing') {
      // One arm raised in thinking pose
      armRightY.value = withTiming(-15, { duration: 800, easing: organicEasing });
      armRightRotation.value = withRepeat(
        withTiming(1, { duration: 7900, easing: organicEasing }),
        -1,
        true
      );
    } else {
      // Gentle idle gestures
      armLeftRotation.value = withRepeat(
        withTiming(1, { duration: 7900, easing: floatingEasing }),
        -1,
        true
      );
      armRightRotation.value = withDelay(
        800,
        withRepeat(
          withTiming(1, { duration: 9400, easing: floatingEasing }),
          -1,
          true
        )
      );
    }

  }, [state]);

  // === ANIMATED STYLES ===

  // Body composition - softer, smoother movements
  const bodyStyle = useAnimatedStyle(() => {
    let translateY = 0;
    let scale = 1;

    if (state === 'success') {
      translateY = interpolate(bodyBounce.value, [0, 1], [0, -8]); // Reduced from -15
      scale = interpolate(bodyBounce.value, [0, 1], [1, 1.04]); // Reduced from 1.08
    } else {
      const breathScale = interpolate(
        bodyBreathing.value,
        [0, 1],
        [1.0, state === 'listening' ? 1.015 : 1.01] // Reduced from 1.03/1.02
      );
      const floatY = interpolate(
        bodyFloat.value,
        [0, 1],
        state === 'error' ? [-0.8, 0.8] : [-1, 1] // Reduced from -1.5/1.5 and -2/2
      );
      translateY = floatY;
      scale = breathScale;
    }

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Head composition - softer, smoother movements
  const headStyle = useAnimatedStyle(() => {
    let rotation = 0;
    let translateY = 0;

    if (state === 'processing') {
      const tilt = interpolate(headTilt.value, [0, 1], [-6, 6]); // Reduced from -12/12
      const rock = interpolate(headRock.value, [0, 1], [-1.5, 1.5]); // Reduced from -3/3
      rotation = tilt;
      translateY = rock;
    } else if (state === 'error') {
      rotation = interpolate(headTilt.value, [0, 1], [-4, 4]); // Reduced from -8/8
    } else {
      const nod = interpolate(headNod.value, [0, 1], [-1, 1]); // Reduced from -2/2
      translateY = nod;
    }

    return {
      transform: [{ rotate: `${rotation}deg` }, { translateY }],
    };
  });

  // Eyes composition
  const eyesStyle = useAnimatedStyle(() => {
    const scaleY = eyesBlink.value;
    const translateX = interpolate(eyesGazeX.value, [-1, 1], [-3, 3]);
    const translateY = interpolate(eyesGazeY.value, [0, 1], [-2, 2]);

    return {
      transform: [{ scaleY }, { translateX }, { translateY }],
    };
  });

  // Eye pupils (for gaze)
  const leftPupilStyle = useAnimatedStyle(() => {
    const translateX = interpolate(eyesGazeX.value, [-1, 1], [-3, 3]);
    const translateY = interpolate(eyesGazeY.value, [0, 1], [-2, 2]);
    return { transform: [{ translateX }, { translateY }] };
  });

  const rightPupilStyle = useAnimatedStyle(() => {
    const translateX = interpolate(eyesGazeX.value, [-1, 1], [-3, 3]);
    const translateY = interpolate(eyesGazeY.value, [0, 1], [-2, 2]);
    return { transform: [{ translateX }, { translateY }] };
  });

  // Eyebrows composition - softer movements
  const eyebrowsStyle = useAnimatedStyle(() => {
    let translateY = 0;
    let rotation = 0;

    const raise = interpolate(eyebrowsRaise.value, [0, 1], [0, -1.5]); // Reduced from -3
    const tilt = interpolate(eyebrowsTilt.value, [0, 1], [-2, 2]); // Reduced from -4/4
    const furrow = interpolate(eyebrowsFurrow.value, [0, 1], [0, 1]); // Reduced from 2

    translateY = raise + furrow;
    rotation = tilt;

    return {
      transform: [{ translateY }, { rotate: `${rotation}deg` }],
    };
  });

  // Mouth composition - warm and genuine smile with softer scaling
  const mouthStyle = useAnimatedStyle(() => {
    const smileScale = interpolate(
      mouthSmile.value,
      [0, 1],
      [1.02, state === 'success' ? 1.25 : 1.15] // Reduced from 1.05/1.6/1.3
    );
    const pulse = interpolate(mouthPulse.value, [0, 1], [1.0, 1.1]); // Reduced from 1.2
    const width = mouthWidth.value;

    return {
      transform: [{ scaleY: smileScale * pulse }, { scaleX: width }],
    };
  });

  // Arms composition - softer, gentler movements
  const leftArmStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      armLeftRotation.value,
      [0, 1],
      state === 'listening' ? [-10, 10] : [-4, 4] // Reduced from -20/20 and -8/8
    );
    const translateY = armLeftY.value;

    return {
      transform: [{ rotate: `${rotation}deg` }, { translateY }],
    };
  });

  const rightArmStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      armRightRotation.value,
      [0, 1],
      state === 'listening' ? [-8, 8] : state === 'processing' ? [-3, 3] : [-4, 4] // Reduced from -15/15, -5/5, -8/8
    );
    const translateY = armRightY.value;

    return {
      transform: [{ rotate: `${rotation}deg` }, { translateY }],
    };
  });

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: state === 'success' ? eyesSparkle.value : 0,
    transform: [
      { scale: interpolate(eyesSparkle.value, [0, 1], [0.5, 1.5]) }
    ],
  }));


  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Main character - Person on a Bell design */}
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        {/* Unified body-head blob - seamless design */}
        <View
          style={{
            position: 'absolute',
            left: size * 0.2,
            top: size * 0.15,
            width: size * 0.6,
            height: size * 0.7,
            backgroundColor: themeColor,
            borderRadius: size * 0.4, // Ultra-rounded for cohesive blob
            opacity: 1,
          }}
        />

        {/* Left arm - integrated into body */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: size * 0.22,
              top: size * 0.48,
              width: size * 0.09,
              height: size * 0.22,
              backgroundColor: themeColor,
              borderRadius: size * 0.12, // Fully rounded capsule
              opacity: 0.95,
            },
            leftArmStyle,
          ]}
        >
          {/* Hand - seamlessly connected */}
          <View
            style={{
              position: 'absolute',
              bottom: -size * 0.04,
              left: -size * 0.01,
              width: size * 0.11,
              height: size * 0.11,
              backgroundColor: themeColor,
              borderRadius: size * 0.055,
              opacity: 1,
            }}
          />
        </Animated.View>

        {/* Right arm - integrated into body */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              right: size * 0.22,
              top: size * 0.48,
              width: size * 0.09,
              height: size * 0.22,
              backgroundColor: themeColor,
              borderRadius: size * 0.12, // Fully rounded capsule
              opacity: 0.95,
            },
            rightArmStyle,
          ]}
        >
          {/* Hand - seamlessly connected */}
          <View
            style={{
              position: 'absolute',
              bottom: -size * 0.04,
              right: -size * 0.01,
              width: size * 0.11,
              height: size * 0.11,
              backgroundColor: themeColor,
              borderRadius: size * 0.055,
              opacity: 1,
            }}
          />
        </Animated.View>

        {/* Facial features container - no separate head */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: size * 0.2,
              top: size * 0.15,
              width: size * 0.6,
              height: size * 0.5,
            },
            headStyle,
          ]}
        >
          {/* Eyebrows - curved and adorable */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: size * 0.14,
                left: 0,
                right: 0,
                height: size * 0.04,
              },
              eyebrowsStyle,
            ]}
          >
            {/* Left eyebrow - adorable curved arc */}
            <View
              style={{
                position: 'absolute',
                left: size * 0.08,
                top: 0,
                width: size * 0.09,
                height: size * 0.025,
                backgroundColor: '#000000',
                borderRadius: size * 0.025,
                borderTopLeftRadius: size * 0.05,
                borderTopRightRadius: size * 0.05,
              }}
            />
            {/* Right eyebrow - adorable curved arc */}
            <View
              style={{
                position: 'absolute',
                right: size * 0.08,
                top: 0,
                width: size * 0.09,
                height: size * 0.025,
                backgroundColor: '#000000',
                borderRadius: size * 0.025,
                borderTopLeftRadius: size * 0.05,
                borderTopRightRadius: size * 0.05,
              }}
            />
          </Animated.View>

          {/* Eyes - Large circular with white ring and dark pupils */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: size * 0.20,
                left: 0,
                right: 0,
                height: size * 0.14,
              },
              eyesStyle,
            ]}
          >
            {/* Left eye - circular with white ring */}
            <View
              style={{
                position: 'absolute',
                left: size * 0.10,
                top: size * 0.01,
                width: size * 0.12,
                height: size * 0.12,
                backgroundColor: 'white',
                borderRadius: size * 0.06, // Perfect circle
              }}
            >
              {/* Dark blue pupil - larger for enhanced adorability */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: size * 0.02,
                    top: size * 0.02,
                    width: size * 0.08,
                    height: size * 0.08,
                    backgroundColor: '#000000',
                    borderRadius: size * 0.04,
                  },
                  leftPupilStyle,
                ]}
              >
                {/* White highlight - small circle */}
                <View
                  style={{
                    position: 'absolute',
                    left: size * 0.018,
                    top: size * 0.012,
                    width: size * 0.026,
                    height: size * 0.026,
                    backgroundColor: 'white',
                    borderRadius: size * 0.013,
                  }}
                />
              </Animated.View>
            </View>

            {/* Right eye - circular with white ring */}
            <View
              style={{
                position: 'absolute',
                right: size * 0.10,
                top: size * 0.01,
                width: size * 0.12,
                height: size * 0.12,
                backgroundColor: 'white',
                borderRadius: size * 0.06, // Perfect circle
              }}
            >
              {/* Dark blue pupil - larger for enhanced adorability */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: size * 0.02,
                    top: size * 0.02,
                    width: size * 0.08,
                    height: size * 0.08,
                    backgroundColor: '#000000',
                    borderRadius: size * 0.04,
                  },
                  rightPupilStyle,
                ]}
              >
                {/* White highlight - small circle */}
                <View
                  style={{
                    position: 'absolute',
                    left: size * 0.018,
                    top: size * 0.012,
                    width: size * 0.026,
                    height: size * 0.026,
                    backgroundColor: 'white',
                    borderRadius: size * 0.013,
                  }}
                />
              </Animated.View>
            </View>

            {/* Sparkles for success state */}
            <Animated.View style={sparkleStyle}>
              <View
                style={{
                  position: 'absolute',
                  left: size * 0.02,
                  top: -size * 0.02,
                  width: size * 0.025,
                  height: size * 0.025,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: size * 0.0125,
                  transform: [{ rotate: '45deg' }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: size * 0.02,
                  top: -size * 0.02,
                  width: size * 0.025,
                  height: size * 0.025,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: size * 0.0125,
                  transform: [{ rotate: '45deg' }],
                }}
              />
            </Animated.View>
          </Animated.View>

          {/* Mouth - Cute curved smile line with looping animation */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: size * 0.42,
                left: size * 0.20,
                width: size * 0.20,
                height: size * 0.06,
                alignItems: 'center',
                justifyContent: 'center',
              },
              mouthStyle,
            ]}
          >
            {/* Simple curved smile line - adorable and friendly */}
            <View
              style={{
                width: size * 0.16,
                height: size * 0.04,
                backgroundColor: '#000000',
                borderBottomLeftRadius: size * 0.1,
                borderBottomRightRadius: size * 0.1,
                borderTopLeftRadius: size * 0.01,
                borderTopRightRadius: size * 0.01,
              }}
            />
          </Animated.View>
        </Animated.View>

        {/* Success sparkles around character */}
        {state === 'success' && (
          <>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: size * 0.1,
                  top: size * 0.1,
                  width: size * 0.04,
                  height: size * 0.04,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: size * 0.02,
                },
                sparkleStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  right: size * 0.1,
                  top: size * 0.15,
                  width: size * 0.035,
                  height: size * 0.035,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: size * 0.0175,
                },
                sparkleStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: size * 0.15,
                  bottom: size * 0.2,
                  width: size * 0.04,
                  height: size * 0.04,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: size * 0.02,
                },
                sparkleStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  right: size * 0.15,
                  bottom: size * 0.25,
                  width: size * 0.04,
                  height: size * 0.04,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: size * 0.02,
                },
                sparkleStyle,
              ]}
            />
          </>
        )}
      </Animated.View>
    </View>
  );
}
