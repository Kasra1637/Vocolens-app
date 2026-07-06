import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Pause,
  Check,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Settings,
  AlertCircle,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
  FadeOut,
  interpolateColor,
} from "react-native-reanimated";
import {
  TAB_ENTER_1 as ENTER_1,
  TAB_ENTER_2 as ENTER_2,
  TAB_ENTER_3 as ENTER_3,
} from "@/lib/tabAnimations";
import { MicButton } from "@/components/MicButton";
import {
  heavyHaptic,
  tapHaptic,
  errorHaptic,
  successHaptic,
  warningHaptic,
} from "@/lib/haptics";
import { router } from "expo-router";
import {
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
  BorderRadius,
  Spacing,
} from "@/lib/theme";
import { useCreateEntry } from "@/lib/hooks";
import { useRealtimeVoiceRecording } from "@/lib/hooks/useRealtimeVoiceRecording";
import { MicTabIcon } from "@/components/TabIcons";
import { TopicCategory, EmotionType } from "@/lib/types";
import EmotionReflectionScreen from "@/components/emotion-reflection";
import type { ReflectionResult } from "@/components/emotion-reflection";
import GroundingToolsModal from "@/components/GroundingToolsModal";
import { analyzeTranscript } from "@/lib/journal-service";
import { buildPersonalizationPrompt } from "@/lib/personalization";
import useReflectionStore from "@/lib/state/reflection-store";
import useRecordingStore from "@/lib/state/recording-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import {
  useUsageMinutes,
  useRemainingMinutes,
  useIsAtLimit,
  USAGE_LIMIT_MINUTES,
} from "@/lib/state/user-stats-store";
import { hexToRgba } from "@/lib/glass";
import { useEntrySavedSound } from "@/lib/hooks/useEntrySavedSound";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types
type RecordingState =
  | "idle"
  | "listening"
  | "recording"
  | "paused"
  | "processing"
  | "permission_denied";

// Conversation starters by topic
const CONVERSATION_STARTERS: Record<TopicCategory, string[]> = {
  emotional: [
    "What emotion has been most present for you today?",
    "When did you last feel truly at peace? Describe that moment.",
    "What feeling are you trying to understand better right now?",
    "How has your mood shifted throughout the day?",
    "What emotion surprised you recently, and why?",
    "If your feelings had a color today, what would it be?",
    "What's something you need to release emotionally?",
    "Which emotion do you find hardest to express?",
  ],
  goals: [
    "What's one small step you could take toward your biggest goal?",
    "What does success look like to you right now?",
    "What habit would transform your life if you mastered it?",
    "What goal excites and scares you at the same time?",
    "What's one thing you've been putting off that matters?",
    "If you could achieve one thing this month, what would it be?",
    "What skill do you want to develop, and why?",
    "What's the next version of yourself you're working toward?",
  ],
  reflection: [
    "What pattern in your life are you noticing lately?",
    "What assumption about yourself are you challenging?",
    "What have you learned about yourself this week?",
    "How have you grown in the past year?",
    "What belief is holding you back from something you want?",
    "What would your younger self think of who you are today?",
    "What are you most proud of about how you handled a recent challenge?",
    "What does your inner voice tell you that you need to hear?",
  ],
  decision: [
    "What decision have you been avoiding, and why?",
    "What's the pros and cons list in your head right now?",
    "What would you do if you weren't afraid of failing?",
    "What's your gut telling you about a choice you're facing?",
    "What advice would you give your best friend in your situation?",
    "What decision feels heavy, and what would lighten it?",
    "What option aligns most with your values?",
    "What's the worst that could happen, and could you handle it?",
  ],
  manifestation: [
    "What does your ideal day look like in vivid detail?",
    "What reality are you actively creating for yourself?",
    "What would you do if you knew you couldn't fail?",
    "What does abundance mean to you right now?",
    "How do you want to feel in your life daily?",
    "What future version of yourself can you visualize clearly?",
    "What opportunities are you open to receiving?",
    "What intention are you setting for this next chapter?",
  ],
};

const TOPIC_LABELS: Record<TopicCategory, string> = {
  emotional: "Emotional processing",
  goals: "Goal setting",
  reflection: "Self-reflection",
  decision: "Decision making",
  manifestation: "Manifestation",
};

// Prompts for journaling
const PROMPTS = [
  "What's on your mind today?",
  "How are you feeling right now?",
  "What made you smile today?",
  "What are you grateful for?",
  "What's been challenging lately?",
];

export default function SpeakScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [animationKey, setAnimationKey] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [currentPrompt, setCurrentPrompt] = useState(PROMPTS[0]);
  const [duration, setDuration] = useState(0);
  const MIN_RECORDING_SECONDS = 50;
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | undefined>(
    undefined,
  );
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | undefined>(
    undefined,
  );
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const recordingDurationRef = useRef(0);
  // Lock to prevent double-tap on stop button triggering duplicate API calls
  const isAnalyzingRef = useRef(false);

  // Emotion reflection state
  const [showReflection, setShowReflection] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const [reflectionTranscript, setReflectionTranscript] = useState("");
  const [reflectionAudioUri, setReflectionAudioUri] = useState<
    string | undefined
  >();
  const [reflectionDuration, setReflectionDuration] = useState(0);
  const [suggestedEmotions, setSuggestedEmotions] = useState<EmotionType[]>([]);
  const [suggestedBodySensations, setSuggestedBodySensations] = useState<
    string[]
  >([]);
  const [initialValence, setInitialValence] = useState(0);
  const [initialArousal, setInitialArousal] = useState(50);
  const [initialDistress, setInitialDistress] = useState<
    "low" | "moderate" | "high"
  >("low");

  // Get selected theme and dark mode
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  // Usage limit tracking
  const usageMinutes = useUsageMinutes();
  const remainingMinutes = useRemainingMinutes();
  const isAtLimit = useIsAtLimit();
  const usagePct = Math.min(1, usageMinutes / USAGE_LIMIT_MINUTES);
  const isNearLimit = usagePct >= 0.8 && !isAtLimit;

  // Mutation hook for creating entries
  const createEntryMutation = useCreateEntry();

  // Soft chime played when an entry is successfully committed
  const playEntrySavedChime = useEntrySavedSound();

  // Voice recording hook with real-time transcription
  const [voiceState, voiceActions] = useRealtimeVoiceRecording();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Animation values
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const buttonBackgroundColor = useSharedValue(0); // 0 = theme color, 1 = white

  // Pulse animation for button size - always active
  useEffect(() => {
    if (
      recordingState === "processing" ||
      recordingState === "permission_denied" ||
      recordingState === "recording" ||
      recordingState === "listening"
    ) {
      // No animation during processing or recording
      cancelAnimation(buttonScale);
      buttonScale.value = withTiming(1);
    } else {
      // Pulse animation for idle state only
      buttonScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [recordingState]);

  // Replay entrance animations every time this tab gains focus
  useEffect(() => {
    if (isFocused) setAnimationKey((k) => k + 1);
  }, [isFocused]);

  // Clear transcript and reset voice state when user navigates away from this tab
  useEffect(() => {
    if (!isFocused) {
      voiceActions.reset();
      useRecordingStore.getState().setRecordingActive(false);
    }
  }, [isFocused]);

  // Duration timer
  useEffect(() => {
    if (recordingState === "recording") {
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          recordingDurationRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [recordingState]);

  // Check initial permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      // Set recording-active to suppress AuthGate re-lock during the OS
      // permission dialog (which backgrounds the app on some platforms).
      useRecordingStore.getState().setRecordingActive(true);
      const result = await voiceActions.requestPermission();
      useRecordingStore.getState().setRecordingActive(false);
      if (result.status === "denied" && !result.canAskAgain) {
        console.log("Microphone permission permanently denied");
      }
    };
    checkPermission();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    // Block if monthly usage limit reached
    if (isAtLimit) {
      errorHaptic();
      return;
    }
    try {
      heavyHaptic();
      setRecordingState("listening");
      setDuration(0);

      // Signal recording intent BEFORE requesting permission — the OS
      // permission dialog sends the app to background, which would otherwise
      // trigger AuthGate's re-lock and show the PIN screen.
      useRecordingStore.getState().setRecordingActive(true);

      // Request permission immediately
      const permissionResult = await voiceActions.requestPermission();

      if (permissionResult.status !== "granted") {
        useRecordingStore.getState().setRecordingActive(false);
        setRecordingState("permission_denied");
        errorHaptic();
        return;
      }

      // Start recording
      await voiceActions.startRecording();

      // Transition to recording after a brief listening period
      setTimeout(() => {
        setRecordingState("recording");
        tapHaptic();
      }, 500);
    } catch (error) {
      console.error("Failed to start recording:", error);
      useRecordingStore.getState().setRecordingActive(false);
      setRecordingState("idle");
      errorHaptic();
    }
  };

  const stopRecording = async () => {
    // Prevent duplicate calls if user double-taps or timeout retries fire
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    try {
      heavyHaptic();
      setRecordingState("processing");

      // Clear recording-active flag so AuthGate can re-lock normally again
      useRecordingStore.getState().setRecordingActive(false);

      const finalDuration = recordingDurationRef.current;

      // Stop recording and get transcription
      const finalTranscript = await voiceActions.stopRecording();

      // Get the recording URI
      const audioUri = voiceActions.getRecordingUri();
      console.log("[Journal] Recording stopped - audioUri:", audioUri);
      console.log("[Journal] Transcript length:", finalTranscript?.length || 0);

      if (finalTranscript && finalTranscript.trim().length > 0) {
        try {
          // Build personalization context from user's correction history
          const personalizationContext = buildPersonalizationPrompt();

          // Analyze transcript for emotion suggestions (with personalization bias)
          const analysis = await analyzeTranscript(
            finalTranscript,
            undefined,
            personalizationContext,
          );

          // Store data for reflection screen
          setReflectionTranscript(finalTranscript);
          setReflectionAudioUri(audioUri || undefined);
          setReflectionDuration(finalDuration);
          setSuggestedEmotions(analysis.emotions);
          setSuggestedBodySensations(analysis.suggestedBodySensations);
          setInitialValence(analysis.valence);
          setInitialArousal(analysis.arousal);
          setInitialDistress(analysis.distressLevel);

          setRecordingState("idle");

          const mode = useSettingsStore.getState().emotionReflectionMode;
          if (mode === "off") {
            // Skip reflection, create entry directly
            const entry = await createEntryMutation.mutateAsync({
              audioUri: audioUri || undefined,
              transcript: finalTranscript,
              duration: finalDuration,
              conversationTopic: selectedTopic,
              conversationPrompt: currentQuestion,
              reflectionOverride: {
                emotions: analysis.emotions,
                primaryEmotion: analysis.emotions[0] ?? "trust",
                valence: analysis.valence,
                arousal: analysis.arousal,
                alexithymiaFlag: false,
                distressLevel: analysis.distressLevel,
                aiTitle: analysis.title,
              },
            });
            successHaptic();
            playEntrySavedChime();
            voiceActions.reset();
            if (entry?.id) router.push(`/entry-detail?id=${entry.id}`);
          } else {
            // Route to hybrid reflection flow
            useReflectionStore.getState().setPending({
              transcript: finalTranscript,
              audioUri: audioUri || undefined,
              duration: finalDuration,
              suggestedEmotions: analysis.emotions,
              suggestedBodySensations: analysis.suggestedBodySensations,
              initialValence: analysis.valence,
              initialArousal: analysis.arousal,
              initialDistress: analysis.distressLevel,
              conversationTopic: selectedTopic,
              conversationPrompt: currentQuestion,
              aiTitle: analysis.title,
            });
            router.push("/reflection");
          }
        } catch (error) {
          console.error("Failed to analyze recording:", error);
          setRecordingState("idle");
          errorHaptic();
        }
      } else {
        console.log("No transcript available");
        setRecordingState("idle");
        warningHaptic();
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setRecordingState("idle");
      errorHaptic();
    } finally {
      isAnalyzingRef.current = false;
    }
  };

  const handleReflectionComplete = async (result: ReflectionResult) => {
    setShowReflection(false);
    setRecordingState("processing");

    try {
      const entry = await createEntryMutation.mutateAsync({
        audioUri: reflectionAudioUri,
        transcript: reflectionTranscript,
        duration: reflectionDuration,
        conversationTopic: selectedTopic,
        conversationPrompt: currentQuestion,
        reflectionOverride: {
          emotions: result.emotions,
          primaryEmotion: result.primaryEmotion,
          valence: result.valence,
          arousal: result.arousal,
          bodySensation: result.bodySensation,
          alexithymiaFlag: result.alexithymiaFlag,
          distressLevel: result.distressLevel,
        },
      });

      successHaptic();
      playEntrySavedChime();
      voiceActions.reset();

      if (entry && entry.id) {
        router.push(`/entry-detail?id=${entry.id}`);
      }
    } catch (entryError) {
      console.error("Failed to save entry:", entryError);
      setRecordingState("idle");
      errorHaptic();
    }
  };

  const handleMicPress = () => {
    if (recordingState === "idle" || recordingState === "permission_denied") {
      startRecording();
    }
  };

  const handlePause = async () => {
    try {
      tapHaptic();
      await voiceActions.pauseRecording();
      setRecordingState("paused");
    } catch (error) {
      console.error("Failed to pause recording:", error);
    }
  };

  const handleResume = async () => {
    try {
      tapHaptic();
      await voiceActions.resumeRecording();
      setRecordingState("recording");
    } catch (error) {
      console.error("Failed to resume recording:", error);
    }
  };

  const handleOpenSettings = async () => {
    tapHaptic();
    await voiceActions.openSettings();
  };

  const cyclePrompt = () => {
    tapHaptic();
    const currentIndex = PROMPTS.indexOf(currentPrompt);
    const nextIndex = (currentIndex + 1) % PROMPTS.length;
    setCurrentPrompt(PROMPTS[nextIndex]);
  };

  const handleTopicChange = (topic: TopicCategory) => {
    tapHaptic();
    setSelectedTopic(topic);
    setShowTopicDropdown(false);
    // Get a random question from the new topic
    const questions = CONVERSATION_STARTERS[topic];
    const randomIndex = Math.floor(Math.random() * questions.length);
    setCurrentQuestion(questions[randomIndex]);
  };

  const refreshQuestion = () => {
    tapHaptic();
    if (!selectedTopic) return;
    const questions = CONVERSATION_STARTERS[selectedTopic];
    // Get a different random question
    const currentIndex = questions.indexOf(currentQuestion ?? "");
    let newIndex = Math.floor(Math.random() * questions.length);
    // Ensure we get a different question if there's more than one
    if (questions.length > 1) {
      while (newIndex === currentIndex) {
        newIndex = Math.floor(Math.random() * questions.length);
      }
    }
    setCurrentQuestion(questions[newIndex]);
  };

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Button background color animation
  const buttonGradientStyle = useAnimatedStyle(() => {
    const animatedColor = interpolateColor(
      buttonBackgroundColor.value,
      [0, 1],
      [Colors.primary, "#FFFFFF"],
    );
    return {
      backgroundColor: animatedColor,
    };
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1" style={{ backgroundColor: Gradients.background[2] }}>
        <LinearGradient
          colors={Gradients.background}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>
    );
  }

  const isRecording =
    recordingState === "recording" || recordingState === "listening";
  const isPaused = recordingState === "paused";
  const isActiveSession = isRecording || isPaused;
  const isProcessing =
    recordingState === "processing" || voiceState.isTranscribing;
  const isPermissionDenied = recordingState === "permission_denied";
  const hasTranscript =
    voiceState.transcript && voiceState.transcript.trim().length > 0;

  // Get permission message
  const getPermissionMessage = () => {
    if (voiceState.permissionStatus === "denied" && !voiceState.canAskAgain) {
      return "Microphone access is permanently blocked. Please enable it in your device settings to use voice recording.";
    }
    if (voiceState.permissionStatus === "denied") {
      return "Microphone access is required for voice recording. Tap the button to grant permission.";
    }
    return null;
  };

  const permissionMessage = getPermissionMessage();

  // Get error message
  const errorMessage = voiceState.error;

  return (
    <View className="flex-1" style={{ backgroundColor: Gradients.background[2] }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View
        className="flex-1 items-center"
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 24,
          gap: 12,
        }}
      >
        {/* Header */}
        <Animated.View key={`r-hdr-${animationKey}`} entering={ENTER_1} className="items-center">
          <Text
            style={{
              fontFamily: "Fraunces_700Bold",
              color: "#FFFFFF",
              fontSize: 30,
            }}
            className="mb-2 text-center"
          >
            {isPaused
              ? "Recording paused"
              : isProcessing && voiceState.isTranscribing
                ? "Transcribing..."
                : isProcessing
                  ? "Processing..."
                  : isRecording
                    ? "Listening..."
                    : "Speak your mind"}
          </Text>
          {!isRecording ? (
            <Pressable onPress={!isProcessing ? cyclePrompt : undefined}>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
                className="text-base text-center px-4"
              >
                {currentPrompt || "What's on your mind today?"}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* Permission Denied Warning */}
        {permissionMessage && permissionMessage.trim().length > 0 ? (
          <View className="w-full">
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: "transparent",
                borderWidth: 0,
              }}
            >
              <View className="p-4">
                <View className="flex-row items-start">
                  <AlertCircle
                    size={20}
                    color="#FFFFFF"
                    strokeWidth={2}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <View className="flex-1">
                    {permissionMessage &&
                    permissionMessage.trim().length > 0 ? (
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 13,
                          lineHeight: 22,
                          marginBottom: 8,
                        }}
                      >
                        {permissionMessage}
                      </Text>
                    ) : null}
                    {!voiceState.canAskAgain ? (
                      <Pressable
                        onPress={handleOpenSettings}
                        className="rounded-full py-2 px-4 items-center justify-center"
                        style={{ backgroundColor: "#EF4444" }}
                      >
                        <View className="flex-row items-center">
                          <Settings size={14} color="#FFFFFF" strokeWidth={2} />
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "#FFFFFF",
                              fontSize: 12,
                              marginLeft: 6,
                            }}
                          >
                            Open settings
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Usage limit / near-limit banner */}
        {(isAtLimit || isNearLimit) && !isRecording && !isProcessing ? (
          <View className="w-full">
            <View
              className="rounded-3xl p-4"
              style={{
                backgroundColor: isAtLimit
                  ? "rgba(255, 60, 60, 0.18)"
                  : "rgba(255, 185, 50, 0.15)",
                borderWidth: 1,
                borderColor: isAtLimit
                  ? "rgba(255, 100, 100, 0.45)"
                  : "rgba(255, 210, 80, 0.4)",
              }}
            >
              <View className="flex-row items-start">
                <Text style={{ fontSize: 18, marginRight: 10 }}>
                  {isAtLimit ? "🔒" : "⚠️"}
                </Text>
                <View className="flex-1">
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      color: "#FFFFFF",
                      fontSize: 13,
                      marginBottom: 3,
                    }}
                  >
                    {isAtLimit
                      ? "Monthly limit reached"
                      : "Almost at your limit"}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.75)",
                      fontSize: 12,
                      lineHeight: 22,
                    }}
                  >
                    {isAtLimit
                      ? `You've used all ${USAGE_LIMIT_MINUTES} minutes this month. Resets next month.`
                      : `${Math.floor(remainingMinutes)} minutes remaining of your ${USAGE_LIMIT_MINUTES}-minute monthly plan.`}
                  </Text>
                </View>
              </View>

              {/* Mini progress bar */}
              <View
                className="h-1.5 rounded-full mt-3"
                style={{ backgroundColor: hexToRgba(Colors.primary, 0.12) }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, usagePct * 100)}%`,
                    backgroundColor: isAtLimit ? "#FF5050" : "#FFB830",
                  }}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Error Message */}
        {errorMessage &&
        typeof errorMessage === "string" &&
        errorMessage.trim().length > 0 &&
        !permissionMessage ? (
          <View className="w-full">
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(251, 191, 36, 0.15)"
                  : "rgba(254, 243, 199, 1)",
                borderWidth: 1,
                borderColor: isDarkMode
                  ? "rgba(251, 191, 36, 0.3)"
                  : "rgba(251, 191, 36, 0.2)",
                ...Shadows.medium,
              }}
            >
              <View className="p-4">
                <View className="flex-row items-start">
                  <AlertCircle
                    size={20}
                    color="#F59E0B"
                    strokeWidth={2}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <View className="flex-1">
                    {errorMessage &&
                    typeof errorMessage === "string" &&
                    errorMessage.trim().length > 0 ? (
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: isDarkMode ? "#FCD34D" : "#92400E",
                          fontSize: 13,
                          lineHeight: 22,
                        }}
                      >
                        {errorMessage}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Recording Status Display with Live Transcription */}
        {isActiveSession ? (
          <View
            className="w-full rounded-3xl overflow-hidden"
            style={{
              backgroundColor: "transparent",
              ...Shadows.medium,
              maxHeight: 220,
            }}
          >
            <ScrollView
              className="p-5"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                    }}
                    className="text-sm ml-2"
                  >
                    {isPaused
                      ? "Paused"
                      : voiceState.isTranscribing
                        ? "Transcribing..."
                        : "Recording"}
                  </Text>
                  <View className="ml-2 flex-row items-center">
                    <LiveIndicator primaryColor="#FFFFFF" />
                  </View>
                </View>
              </View>

              {/* Transcript display — shows words once transcription completes */}
              {voiceState.transcript &&
              voiceState.transcript.trim().length > 0 ? (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "#FFFFFF",
                    lineHeight: 22,
                    fontSize: 14,
                  }}
                >
                  {voiceState.transcript}
                </Text>
              ) : (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255, 255, 255, 0.7)",
                    lineHeight: 22,
                    fontSize: 13,
                    fontStyle: "italic",
                  }}
                >
                  {voiceState.isTranscribing
                    ? "Sending to Deepgram..."
                    : "Speak freely. Your words will be transcribed when you stop."}
                </Text>
              )}
            </ScrollView>
          </View>
        ) : null}

        {/* Transcription Result Display */}
        {hasTranscript && !isRecording && !isProcessing ? (
          <View
            className="w-full rounded-3xl overflow-hidden"
            style={{
              backgroundColor: hexToRgba(Colors.primary, 0.1),
              borderWidth: 1.5,
              borderColor: hexToRgba(Colors.primary, 0.2),
              ...Shadows.medium,
              maxHeight: 200,
            }}
          >
            <ScrollView
              className="p-5"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <View className="flex-row items-center mb-3">
                <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                  className="text-sm ml-2"
                >
                  Your recording
                </Text>
              </View>

              <View>
                {voiceState.transcript &&
                voiceState.transcript.trim().length > 0 ? (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "#FFFFFF",
                      lineHeight: 22,
                      fontSize: 14,
                    }}
                  >
                    {voiceState.transcript}
                  </Text>
                ) : null}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {/* Duration Display — shown while recording or paused */}
        {isActiveSession ? (
          <View style={{ marginTop: 16 }} className="items-center">
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
              className="text-3xl"
            >
              {formatDuration(duration)}
              {isPaused ? (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 18,
                  }}
                >
                  {" "}
                  paused
                </Text>
              ) : null}
            </Text>

            {/* 50-second goal progress bar */}
            <View style={{ width: 220, marginTop: 14 }}>
              {/* Track */}
              <View style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.16)",
                overflow: "hidden",
              }}>
                <View style={{
                  height: "100%",
                  borderRadius: 3,
                  width: `${Math.min(100, (duration / MIN_RECORDING_SECONDS) * 100)}%`,
                  backgroundColor: duration >= MIN_RECORDING_SECONDS
                    ? "#4ADE80"
                    : Colors.primary,
                }} />
              </View>

              {/* Milestone markers */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                }}>0s</Text>
                <Text style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 10,
                  color: duration >= MIN_RECORDING_SECONDS
                    ? "#4ADE80"
                    : duration >= 25
                      ? "rgba(255,255,255,0.80)"
                      : "rgba(255,255,255,0.35)",
                }}>
                  {duration >= MIN_RECORDING_SECONDS
                    ? "✓ Great insight depth!"
                    : `${MIN_RECORDING_SECONDS - duration}s to go`}
                </Text>
                <Text style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 10,
                  color: duration >= MIN_RECORDING_SECONDS
                    ? "#4ADE80"
                    : "rgba(255,255,255,0.35)",
                }}>50s</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Processing Indicator — animated dots + status text */}
        {isProcessing ? (
          <View className="items-center" style={{ gap: 14 }}>
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: 20,
                paddingHorizontal: 24,
                paddingVertical: 16,
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* Animated pulsing dots */}
              <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <ProcessingDot
                    key={i}
                    delay={i * 180}
                    primaryColor="#FFFFFF"
                  />
                ))}
              </View>
              {/* Status text */}
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {voiceState.isTranscribing
                  ? "Transcribing your voice..."
                  : "Analyzing emotions..."}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Spacer pushes mic button to bottom */}
        <View style={{ flex: 1, maxHeight: 60 }} />

        {/* Microphone Button */}
        {/* ── Recording Controls / Mic Button ── */}
        <Animated.View entering={ENTER_3} className="items-center" style={{ marginBottom: 48 }}>
          {isActiveSession ? (
            /* Recording or Paused — two-button layout */
            <View className="items-center">
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 32 }}
              >
                {/* Pause / Resume button */}
                <View className="items-center" style={{ gap: 6 }}>
                  <Pressable
                    onPressIn={() => {
                      buttonScale.value = withSpring(0.92);
                    }}
                    onPressOut={() => {
                      buttonScale.value = withSpring(1);
                    }}
                    onPress={isPaused ? handleResume : handlePause}
                  >
                    <View>
                      {isPaused ? (
                        <LinearGradient
                          colors={[Colors.gradientEnd, Colors.gradientStart]}
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 44,
                            alignItems: "center",
                            justifyContent: "center",
                            ...Shadows.large,
                          }}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                        >
                          <MicTabIcon size={38} color="#FFFFFF" filled />
                        </LinearGradient>
                      ) : (
                        <View
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 44,
                            backgroundColor: hexToRgba(Colors.primary, 0.18),
                            borderWidth: 1.5,
                            borderColor: hexToRgba(Colors.primary, 0.3),
                            alignItems: "center",
                            justifyContent: "center",
                            ...Shadows.medium,
                          }}
                        >
                          <Pause
                            size={30}
                            color="#FFFFFF"
                            fill="#FFFFFF"
                            strokeWidth={0}
                          />
                        </View>
                      )}
                    </View>
                  </Pressable>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 11,
                    }}
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </Text>
                </View>

                {/* Save & Analyze button */}
                <View className="items-center" style={{ gap: 6 }}>
                  <Pressable onPress={stopRecording} disabled={isProcessing}>
                    <LinearGradient
                      colors={["#EF4444", "#DC2626"]}
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        ...Shadows.large,
                      }}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Check size={36} color="#FFFFFF" strokeWidth={3} />
                    </LinearGradient>
                  </Pressable>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 11,
                    }}
                  >
                    Save
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* Idle — enhanced mic button with sonar ripples, halo glow, and 3-stop gradient */
            <>
              <MicButton
                onPress={handleMicPress}
                onPressIn={() => {
                  buttonScale.value = withSpring(0.92);
                }}
                onPressOut={() => {
                  buttonScale.value = withSpring(1);
                }}
                disabled={isProcessing || isAtLimit}
                isAtLimit={isAtLimit}
                micButtonGradient={Gradients.micButton}
                glowColor={Colors.buttonGlow}
                scale={buttonScale}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: isAtLimit ? "rgba(255,120,120,0.9)" : "#FFFFFF",
                }}
                className="text-xs mt-3"
              >
                {isProcessing
                  ? "Please wait..."
                  : isAtLimit
                    ? "Monthly limit reached"
                    : `Tap to start · ${Math.floor(remainingMinutes)} min left`}
              </Text>
              {!isProcessing && !isAtLimit && (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 6,
                    paddingHorizontal: 24,
                  }}
                >
                  Record for at least 50s for accurate emotional insights
                </Text>
              )}
            </>
          )}
        </Animated.View>
      </View>

      {/* Emotion Reflection Screen */}
      <EmotionReflectionScreen
        visible={showReflection}
        transcript={reflectionTranscript}
        suggestedEmotions={suggestedEmotions}
        suggestedBodySensations={suggestedBodySensations}
        initialValence={initialValence}
        initialArousal={initialArousal}
        initialDistressLevel={initialDistress}
        onComplete={handleReflectionComplete}
        onDismiss={() => {
          setShowReflection(false);
          setRecordingState("idle");
          voiceActions.reset();
        }}
        onGrounding={() => setShowGrounding(true)}
      />

      {/* Grounding Tools Modal */}
      <GroundingToolsModal
        visible={showGrounding}
        onDismiss={() => setShowGrounding(false)}
      />
    </View>
  );
}

// Processing dot component
interface ProcessingDotProps {
  delay: number;
  primaryColor: string;
}

function ProcessingDot({ delay, primaryColor }: ProcessingDotProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Stagger start by `delay` ms then pulse indefinitely
    const t = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: primaryColor,
        },
      ]}
    />
  );
}

// Live indicator component
interface LiveIndicatorProps {
  primaryColor: string;
}

function LiveIndicator({ primaryColor }: LiveIndicatorProps) {
  return (
    <View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#EF4444",
          marginLeft: 6,
        },
      ]}
    />
  );
}
