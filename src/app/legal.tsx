/**
 * Legal Screen — Terms of Service & Privacy Policy
 *
 * Accurately reflects the app's actual data flows:
 *  - Audio transcription via Deepgram (audio leaves device)
 *  - Text-only analysis via OpenRouter backend
 *  - All journal data stored locally on device (Zustand + AsyncStorage)
 *  - No cloud backup, no analytics SDKs, no account servers
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ArrowLeft, FileText, Shield } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { tapHaptic, selectionHaptic } from "@/lib/haptics";
import { hexToRgba, GlassLayers } from "@/lib/glass";
import {
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
  BorderRadius,
} from "@/lib/theme";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";

type TabType = "privacy" | "terms";

const EFFECTIVE_DATE = "March 10, 2026";
const APP_NAME = "Vocolens";
const CONTACT_EMAIL = "connect@vocolens.com";

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("privacy");

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View
        className="flex-row items-center px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
      >
        <Pressable
          onPress={() => {
            tapHaptic();
            router.back();
          }}
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        <Text
          style={{
            fontFamily: "Fraunces_700Bold",
            color: "#FFFFFF",
            fontSize: 20,
          }}
        >
          Legal
        </Text>
      </View>

      {/* Tab Switcher */}
      <View className="px-5 mb-4">
        <View
          className="flex-row p-1 rounded-2xl"
          style={{ backgroundColor: hexToRgba(Colors.primary, 0.12) }}
        >
          {(
            [
              { key: "privacy", label: "Privacy Policy", icon: Shield },
              { key: "terms", label: "Terms of Service", icon: FileText },
            ] as { key: TabType; label: string; icon: typeof Shield }[]
          ).map(({ key, label, icon: Icon }) => (
            <Pressable
              key={key}
              onPress={() => {
                selectionHaptic();
                setActiveTab(key);
              }}
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
              style={{
                backgroundColor:
                  activeTab === key
                    ? hexToRgba(Colors.primary, 0.2)
                    : "transparent",
              }}
            >
              <Icon size={14} color="#FFFFFF" strokeWidth={2} />
              <Text
                style={{
                  fontFamily:
                    activeTab === key
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                  color: "#FFFFFF",
                  fontSize: 13,
                  marginLeft: 6,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "privacy" ? (
          <PrivacyPolicy
            isDarkMode={isDarkMode}
            primaryColor={Colors.primary}
          />
        ) : (
          <TermsOfService
            isDarkMode={isDarkMode}
            primaryColor={Colors.primary}
          />
        )}
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Shared helpers                                         */
/* ─────────────────────────────────────────────────────── */

function Section({
  title,
  children,
  primaryColor,
}: {
  title: string;
  children: React.ReactNode;
  primaryColor: string;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
      <View
        className="rounded-3xl p-5"
        style={{
          backgroundColor: hexToRgba(primaryColor, 0.1),
          borderWidth: 1,
          borderColor: hexToRgba(primaryColor, 0.18),
          overflow: "hidden",
        }}
      >
        <GlassLayers primaryColor={primaryColor} borderRadius={24} />
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            color: "#FFFFFF",
            fontSize: 15,
            marginBottom: 10,
          }}
        >
          {title}
        </Text>
        {children}
      </View>
    </Animated.View>
  );
}

function Body({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: "Inter_400Regular",
        color: "rgba(255, 255, 255, 0.9)",
        fontSize: 13,
        lineHeight: 22,
      }}
    >
      {children}
    </Text>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View className="flex-row mb-2" style={{ alignItems: "flex-start" }}>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: 13,
          marginRight: 8,
          lineHeight: 22,
        }}
      >
        •
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 13,
          lineHeight: 22,
          flex: 1,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

function Highlight({
  children,
  primaryColor,
}: {
  children: string;
  primaryColor?: string;
}) {
  return (
    <Text
      style={{
        fontFamily: "Inter_600SemiBold",
        color: "#FFFFFF",
        fontSize: 13,
        lineHeight: 22,
        backgroundColor: primaryColor
          ? hexToRgba(primaryColor, 0.12)
          : "rgba(255, 255, 255, 0.12)",
        borderRadius: 6,
        paddingHorizontal: 4,
      }}
    >
      {children}
    </Text>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row mb-1">
      <Text
        style={{
          fontFamily: "Inter_600SemiBold",
          color: "rgba(255,255,255,0.6)",
          fontSize: 12,
          width: 110,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          color: "rgba(255,255,255,0.9)",
          fontSize: 12,
          flex: 1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  PRIVACY POLICY                                         */
/* ─────────────────────────────────────────────────────── */

function PrivacyPolicy({
  isDarkMode,
  primaryColor,
}: {
  isDarkMode: boolean;
  primaryColor: string;
}) {
  return (
    <View>
      {/* Meta */}
      <Animated.View
        entering={FadeInDown.delay(50).duration(400)}
        className="mb-5"
      >
        <View
          className="rounded-3xl p-5"
          style={{
            backgroundColor: hexToRgba(primaryColor, 0.07),
            borderWidth: 1,
            borderColor: hexToRgba(primaryColor, 0.12),
            overflow: "hidden",
          }}
        >
          <GlassLayers primaryColor={primaryColor} borderRadius={24} />
          <MetaLine label="App" value={APP_NAME} />
          <MetaLine label="Effective Date" value={EFFECTIVE_DATE} />
          <MetaLine label="Contact" value={CONTACT_EMAIL} />
        </View>
      </Animated.View>

      <Section primaryColor={primaryColor} title="Our Core Commitment">
        <Body>
          {`${APP_NAME} is built on a simple principle: your personal reflections belong to you. We designed the app so your journal entries are stored only on your device. We do not operate user accounts, we do not store your data on our servers, and we do not sell or share your information with advertisers.\n\nThis policy explains exactly what data leaves your device, why, and what happens to it.`}
        </Body>
      </Section>

      <Section
        primaryColor={primaryColor}
        title="Data That Stays on Your Device"
      >
        <Body>
          {
            "The following data never leaves your device under normal operation:\n"
          }
        </Body>
        <Bullet>
          All journal entries (text transcripts, AI analysis, emotion scores,
          topics)
        </Bullet>
        <Bullet>
          Audio recordings (.wav files saved to your device's local storage)
        </Bullet>
        <Bullet>Your emotional growth statistics and streak data</Bullet>
        <Bullet>Your badge and milestone progress</Bullet>
        <Bullet>App preferences (theme, dark mode, time format)</Bullet>
        <Bullet>
          Onboarding responses (mood, goals, journaling preferences)
        </Bullet>
        <Bullet>
          Your PIN code (encrypted using your device's secure hardware keystore)
        </Bullet>
        <Body>
          {
            "\nAll of this data is stored locally using AsyncStorage on your device. There is no cloud synchronisation, no server-side backup, and no remote access to this data."
          }
        </Body>
      </Section>

      <Section
        primaryColor={primaryColor}
        title="Data Sent to Third-Party Services"
      >
        <Body>
          {
            "Two external services receive data when you create a journal entry:\n"
          }
        </Body>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            color: "#FFFFFF",
            fontSize: 13,
            marginBottom: 6,
            marginTop: 4,
          }}
        >
          1. Deepgram (Speech-to-Text)
        </Text>
        <Bullet>
          Your audio recording (WAV format) is sent to Deepgram's API to be
          transcribed into text.
        </Bullet>
        <Bullet>
          Deepgram processes the audio and returns a text transcript. The audio
          is not stored by us after transcription.
        </Bullet>
        <Bullet>
          Deepgram's own privacy policy governs how they handle audio data. See
          deepgram.com/privacy.
        </Bullet>
        <Bullet>
          If Deepgram is unavailable or no API key is configured, a fallback
          transcript is used and no audio is transmitted.
        </Bullet>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            color: "#FFFFFF",
            fontSize: 13,
            marginBottom: 6,
            marginTop: 12,
          }}
        >
          2. OpenAI (Emotional Analysis)
        </Text>
        <Bullet>
          Both your audio recording and text transcript are sent to our analysis
          backend for emotional analysis.
        </Bullet>
        <Bullet>
          Our backend forwards this data to OpenAI's API using the
          gpt-4o-audio-preview model, which analyses emotions from both your
          speech characteristics (tone, pacing, vocal cues) and the content of
          your words simultaneously.
        </Bullet>
        <Bullet>
          This multimodal analysis enables deeper, more accurate emotion
          detection than text-only analysis — GPT-4o processes the raw audio and
          text together to score the 8 core emotions and generate a personalised
          reflection.
        </Bullet>
        <Bullet>
          No user identifiers, account details, or persistent metadata are sent
          alongside the audio or transcript.
        </Bullet>
        <Bullet>
          OpenAI's privacy policy governs how they handle audio and text data.
          See openai.com/privacy.
        </Bullet>
        <Bullet>
          If the analysis backend is unavailable, the app falls back to
          on-device keyword-based analysis — no data is sent externally in this
          case.
        </Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="Audio Data">
        <Body>
          {`Audio recordings are saved as .wav files in your device's local app storage directory.\n\nWhen you record a journal entry:\n`}
        </Body>
        <Bullet>
          Your audio is temporarily transmitted to Deepgram over an encrypted
          HTTPS connection for speech-to-text transcription.
        </Bullet>
        <Bullet>
          Your audio is also temporarily transmitted to OpenAI's GPT-4o audio
          model (via our secure analysis backend) so it can analyse vocal
          characteristics — tone, pitch, pacing, and energy — alongside the
          transcript text to produce more accurate emotion detection.
        </Bullet>
        <Bullet>
          Neither Deepgram nor OpenAI receive any personally identifying
          information alongside the audio.
        </Bullet>
        <Bullet>
          We do not store, listen to, or retain your audio recordings on our
          servers. Audio is processed transiently and discarded.
        </Bullet>
        <Bullet>
          The local audio file remains on your device. You can delete it by
          deleting the journal entry.
        </Bullet>
        <Bullet>
          Deleting an entry removes the associated audio file from your device.
        </Bullet>
        <Bullet>
          Deleting your account removes all audio files and journal data from
          your device permanently.
        </Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="Local Notifications">
        <Body>
          {`${APP_NAME} can send daily reminder notifications to encourage journaling. These notifications:\n`}
        </Body>
        <Bullet>
          Are scheduled and delivered entirely on-device using the operating
          system's notification system.
        </Bullet>
        <Bullet>
          Do not involve any external server or push notification service.
        </Bullet>
        <Bullet>
          Contain only generic reminder messages — no personal data is included.
        </Bullet>
        <Bullet>
          Can be disabled at any time in the app's Settings screen.
        </Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="In-App Purchases">
        <Body>
          {`${APP_NAME} offers a premium subscription. Subscription purchases are handled by Apple App Store or Google Play.\n\nWe use RevenueCat to manage subscription status. RevenueCat may receive your device's anonymous app store identifier to verify purchase status. No personal information beyond purchase status is shared. See revenuecat.com/privacy.`}
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="No Analytics or Tracking">
        <Body>
          {`${APP_NAME} does not include any third-party analytics, advertising, or crash-reporting SDKs. We do not track:\n`}
        </Body>
        <Bullet>How you use the app (screens viewed, buttons tapped)</Bullet>
        <Bullet>How often you open the app</Bullet>
        <Bullet>Your device identifiers or advertising IDs</Bullet>
        <Bullet>Your location</Bullet>
        <Bullet>Any behavioural or demographic data</Bullet>
        <Body>
          {
            "\nAll usage statistics visible in the app (streaks, entry counts, mood trends) are computed locally from your on-device data and never transmitted."
          }
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Security">
        <Body>{"We take reasonable measures to protect your data:\n"}</Body>
        <Bullet>
          Your PIN is stored in your device's secure hardware keystore (iOS
          Keychain / Android Keystore), never in plain text.
        </Bullet>
        <Bullet>All network communications use HTTPS / TLS encryption.</Bullet>
        <Bullet>
          Our analysis backend restricts access using CORS policies and does not
          log or retain transcript data after analysis is returned.
        </Bullet>
        <Bullet>
          We do not operate a user account database — there is no centralised
          store of your information to breach.
        </Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="Your Rights & Controls">
        <Body>{"You have full control over your data at all times:\n"}</Body>
        <Bullet>
          Export — Download all your journal entries, statistics, and
          achievements as a JSON file via Settings → Privacy Settings → Export
          Data.
        </Bullet>
        <Bullet>
          Delete Entries — Permanently delete all journal entries and reset
          statistics (Settings → Privacy Settings → Delete All Entries).
        </Bullet>
        <Bullet>
          Delete Account — Erase all data, settings, PIN, and app state,
          returning the app to its initial state (Settings → Privacy Settings →
          Delete Account).
        </Bullet>
        <Bullet>
          Notifications — Disable reminders at any time in Settings.
        </Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="Children's Privacy">
        <Body>
          {`${APP_NAME} is not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe a child under 13 has used the app and their data has been transmitted to a third-party service, please contact us at ${CONTACT_EMAIL}.`}
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Changes to This Policy">
        <Body>
          {`We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this document. Continued use of the app after changes constitutes acceptance of the revised policy.\n\nFor significant changes that affect how your data is handled, we will notify you through an in-app prompt.`}
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Contact Us">
        <Body>
          {`If you have questions about this Privacy Policy or how your data is handled, please contact us at:\n\n${CONTACT_EMAIL}`}
        </Body>
      </Section>
    </View>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  TERMS OF SERVICE                                        */
/* ─────────────────────────────────────────────────────── */

function TermsOfService({
  isDarkMode,
  primaryColor,
}: {
  isDarkMode: boolean;
  primaryColor: string;
}) {
  return (
    <View>
      {/* Meta */}
      <Animated.View
        entering={FadeInDown.delay(50).duration(400)}
        className="mb-5"
      >
        <View
          className="rounded-3xl p-5"
          style={{
            backgroundColor: hexToRgba(primaryColor, 0.07),
            borderWidth: 1,
            borderColor: hexToRgba(primaryColor, 0.12),
            overflow: "hidden",
          }}
        >
          <GlassLayers primaryColor={primaryColor} borderRadius={24} />
          <MetaLine label="App" value={APP_NAME} />
          <MetaLine label="Effective Date" value={EFFECTIVE_DATE} />
          <MetaLine label="Contact" value={CONTACT_EMAIL} />
        </View>
      </Animated.View>

      <Section primaryColor={primaryColor} title="Acceptance of Terms">
        <Body>
          {`By downloading or using ${APP_NAME}, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the app.\n\nThese terms apply to all users of the app, including the free trial and paid subscription tiers.`}
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Description of Service">
        <Body>
          {`${APP_NAME} is a voice-based journaling application that allows you to record audio entries, have them transcribed to text, and receive AI-powered emotional analysis. The app provides:\n`}
        </Body>
        <Bullet>Voice recording and local audio storage</Bullet>
        <Bullet>Speech-to-text transcription via Deepgram</Bullet>
        <Bullet>
          Emotional analysis (8 core emotion scoring) via OpenAI GPT-4o audio
          model — analyses both vocal tone and transcript content
        </Bullet>
        <Bullet>
          AI-generated empathetic reflections with text-to-speech playback
        </Bullet>
        <Bullet>
          Personal growth tracking, streak counters, and achievement badges
        </Bullet>
        <Bullet>Local data export and full account deletion</Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="Subscriptions & Free Trial">
        <Body>
          {`${APP_NAME} offers a 3-day free trial followed by a paid subscription.\n`}
        </Body>
        <Bullet>
          The free trial begins when you complete onboarding and select a paid
          plan.
        </Bullet>
        <Bullet>
          You will be charged at the end of the trial period unless you cancel
          before it ends.
        </Bullet>
        <Bullet>
          Subscriptions are managed by Apple App Store or Google Play.
          Cancellation, refunds, and billing disputes are subject to their
          respective policies.
        </Bullet>
        <Bullet>
          We do not process payments directly and do not store payment card
          information.
        </Bullet>
        <Bullet>
          Prices are displayed in the app and may change with reasonable notice.
        </Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="Permitted Use">
        <Body>
          {`You may use ${APP_NAME} for lawful personal journaling purposes only. You agree not to:\n`}
        </Body>
        <Bullet>
          Use the app to record or transcribe third parties without their
          consent
        </Bullet>
        <Bullet>
          Reverse-engineer, decompile, or attempt to extract the app's source
          code
        </Bullet>
        <Bullet>
          Use the app in a way that violates any applicable law or regulation
        </Bullet>
        <Bullet>
          Attempt to circumvent the subscription or access premium features
          without payment
        </Bullet>
        <Bullet>
          Use the app's AI analysis outputs as a substitute for professional
          mental health advice
        </Bullet>
      </Section>

      <Section primaryColor={primaryColor} title="Not a Medical Service">
        <Body>
          {`${APP_NAME} is a personal journaling tool and is not a medical device, mental health service, or therapy application.\n\nThe emotional analysis, scores, and reflections generated by the app are produced by an AI language model and are for informational and self-reflection purposes only. They do not constitute:\n`}
        </Body>
        <Bullet>Medical diagnosis or treatment</Bullet>
        <Bullet>Mental health therapy or counselling</Bullet>
        <Bullet>Crisis intervention services</Bullet>
        <Body>
          {
            "\nIf you are experiencing a mental health crisis, please contact a qualified mental health professional or a crisis helpline in your region."
          }
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Your Content">
        <Body>
          {`You own all content you create in ${APP_NAME}, including your voice recordings and written transcripts.\n\nBy using the app, you grant us a limited, temporary licence to transmit your audio recording and transcript text to our analysis backend and to Deepgram and OpenAI solely for the purpose of providing the transcription and emotional analysis services described in this agreement. This licence does not give us the right to use your content for any other purpose.\n\nAs described in the Privacy Policy, your journal data is stored locally on your device and is not backed up to our servers.`}
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Third-Party Services">
        <Body>
          {`${APP_NAME} integrates with the following third-party services:\n`}
        </Body>
        <Bullet>Deepgram — Speech-to-text transcription (deepgram.com)</Bullet>
        <Bullet>
          OpenAI GPT-4o — AI emotional analysis from both audio speech
          characteristics and transcript text (openai.com)
        </Bullet>
        <Bullet>RevenueCat — Subscription management (revenuecat.com)</Bullet>
        <Bullet>
          Apple App Store / Google Play — App distribution and payments
        </Bullet>
        <Body>
          {
            "\nYour use of these services through the app is also governed by each provider's own terms of service and privacy policy. We are not responsible for the practices of these third parties."
          }
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Data Loss Disclaimer">
        <Body>
          {`Because your journal data is stored only on your device:\n`}
        </Body>
        <Bullet>
          Deleting the app will permanently delete all your journal entries.
        </Bullet>
        <Bullet>
          Losing your device without a device-level backup means your journal
          data cannot be recovered.
        </Bullet>
        <Bullet>
          We strongly recommend using your device's built-in backup (iCloud /
          Google Drive) or exporting your data via Settings → Privacy Settings →
          Export Data.
        </Bullet>
        <Bullet>
          We are not liable for loss of data resulting from device failure,
          accidental deletion, or app removal.
        </Bullet>
      </Section>

      <Section
        primaryColor={primaryColor}
        title="Disclaimers & Limitation of Liability"
      >
        <Body>
          {`${APP_NAME} is provided "as is" without warranties of any kind, express or implied.\n\nTo the maximum extent permitted by applicable law, we disclaim all warranties including accuracy of AI-generated analysis, uninterrupted availability of third-party APIs, and fitness for any particular purpose.\n\nOur total liability for any claim arising from your use of the app shall not exceed the amount you paid for your subscription in the 12 months preceding the claim.`}
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Governing Law">
        <Body>
          {`These Terms shall be governed by and construed in accordance with applicable laws. Disputes will be resolved through good-faith negotiation first; if unresolved, through binding arbitration or a court of competent jurisdiction.`}
        </Body>
      </Section>

      <Section primaryColor={primaryColor} title="Changes to These Terms">
        <Body>
          {`We may update these Terms of Service. Continued use of the app after changes constitutes your acceptance of the revised terms. We will notify you of material changes through an in-app prompt.\n\nFor questions, contact us at ${CONTACT_EMAIL}.`}
        </Body>
      </Section>
    </View>
  );
}
