/**
 * ConfirmationInsightCard
 *
 * The single shared card used by every onboarding confirmation/insight screen
 * (Mood, Goal, JournalingFrequency, ProcessingStyle, SelfAwareness).
 *
 * Why this exists
 * ---------------
 * These five screens were previously five hand-maintained copies of the same
 * card. Each iteration drifted a little (different border radius, icon size,
 * badge size, insight text size/opacity, spacing), so the "same" moment in
 * onboarding rendered five slightly different ways — and the most valuable
 * line (the insight) ended up as the smallest, dimmest text on some of them.
 * Centralising the card here means the design can only ever change in one
 * place, and all five screens stay cohesive by construction.
 *
 * Information hierarchy (top to bottom)
 * -------------------------------------
 *   1. Icon ring     — echoes the exact icon the user tapped on the preceding
 *                      selection screen, so the confirmation feels like a
 *                      direct response to their choice.
 *   2. Eyebrow       — short conversational lead-in addressing the user
 *                      ("You're feeling", "You want to", …) that flows into
 *                      the value below it, so the two read as one phrase.
 *   3. Value         — the user's selection, the visual anchor of the card.
 *   4. Secondary     — optional supporting detail (only Mood uses this today,
 *                      for the follow-up that inspired the mood).
 *   5. Accent rule   — short centred divider separating "what you chose" from
 *                      "what that means for you".
 *   6. Insight       — the payoff: what the app will do for them. Deliberately
 *                      the most readable body text on the card.
 *
 * Icons are intentionally rendered WHITE rather than tinted with the selected
 * theme colour: the card sits on a theme-coloured gradient, so a themed icon
 * risks low contrast on some themes.
 */

import React from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

interface ConfirmationInsightCardProps {
  /** Per-selection icon, mirroring the icon shown on the selection screen. */
  icon: PhosphorIcon;
  /**
   * Short conversational lead-in (sentence case, addressing the user with
   * "you/your") that flows into `value` — e.g. "You're feeling" → "Anxious".
   */
  eyebrow: string;
  /** The user's selection — the anchor of the card. */
  value: string;
  /** Optional supporting detail shown directly beneath the value. */
  secondaryLine?: string;
  /**
   * The payoff message. Accepts a node (not just a string) so a screen can
   * emphasise part of the sentence — JournalingFrequency bolds its study
   * figures inline.
   */
  insight: React.ReactNode;
  /**
   * Animated style for the icon ring's entrance (scale spring), owned by the
   * host screen so each screen keeps its existing timing.
   */
  ringAnimatedStyle?: any;
}

export function ConfirmationInsightCard({
  icon: Icon,
  eyebrow,
  value,
  secondaryLine,
  insight,
  ringAnimatedStyle,
}: ConfirmationInsightCardProps) {
  return (
    <View
      style={{
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 4,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.18)",
      }}
    >
      {/* 1. Icon ring */}
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <Animated.View
          style={[
            {
              width: 90,
              height: 90,
              borderRadius: 45,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
            },
            ringAnimatedStyle,
          ]}
        >
          <Icon size={38} color="#FFFFFF" weight="regular" />
        </Animated.View>
      </View>

      {/* 2. Eyebrow — a short conversational lead-in ("You're feeling", "You
          want to", …) that flows straight into the value below it. Styled in
          sentence case (NOT uppercase) with minimal letter-spacing so it reads
          as the app speaking to the user, rather than as a clinical form-field
          label. Pass eyebrow copy in sentence case. */}
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: 14,
          letterSpacing: 0.2,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        {eyebrow}
      </Text>

      {/* 3. Value */}
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          color: "#FFFFFF",
          fontSize: 22,
          lineHeight: 30,
          letterSpacing: 0.2,
          textAlign: "center",
          marginTop: 6,
        }}
      >
        {value}
      </Text>

      {/* 4. Optional secondary detail */}
      {secondaryLine ? (
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 13,
            lineHeight: 18,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          {secondaryLine}
        </Text>
      ) : null}

      {/* 5. Accent rule */}
      <View
        style={{
          alignSelf: "center",
          width: 40,
          height: 2,
          borderRadius: 1,
          backgroundColor: "rgba(255, 255, 255, 0.25)",
          marginTop: 18,
          marginBottom: 18,
        }}
      />

      {/* 6. Insight — the payoff */}
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 14,
          lineHeight: 22,
          textAlign: "center",
        }}
      >
        {insight}
      </Text>
    </View>
  );
}
