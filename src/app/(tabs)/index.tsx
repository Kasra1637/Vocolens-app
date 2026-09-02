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
  CaretDown,
  ArrowsClockwise,
  Sparkle,
  GearSix,
  WarningCircle,
  Trash,
} from "phosphor-react-native";
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
import { BrandedAlert } from "@/components/BrandedAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UsageLimitError } from "@/lib/api/usage-service";
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
import {
  useRealtimeVoiceRecording,
  TranscriptionFailedError,
} from "@/lib/hooks/useRealtimeVoiceRecording";
import { transcribeAudioFile } from "@/lib/deepgram-transcription-service";
import { MicTabIcon } from "@/components/TabIcons";
import { TopicCategory, EmotionType } from "@/lib/types";

import { analyzeTranscript } from "@/lib/journal-service";
import { buildPersonalizationPrompt } from "@/lib/personalization";
import useReflectionStore from "@/lib/state/reflection-store";
import useRecordingStore from "@/lib/state/recording-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import {
  useUsageMinutes,
  useIsAtLimit,
  usageDisplayMinutes,
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

  // Get selected theme and dark mode
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  // Usage limit tracking. `usageMinutes` counts only audio that became a saved
  // entry, so a fresh install reads the full allowance until the first save.
  const usageMinutes = useUsageMinutes();
  const isAtLimit = useIsAtLimit();
  const usagePct = Math.min(1, usageMinutes / USAGE_LIMIT_MINUTES);
  const isNearLimit = usagePct >= 0.8 && !isAtLimit;
  // Whole minutes for the copy below, derived so this screen and the settings
  // screen can never quote different numbers for the same balance.
  const { remaining: remainingMinutesDisplay } =
    usageDisplayMinutes(usageMinutes);

  // Shown when the *server* rejects a request because the allowance is spent.
  // This can happen mid-flow (the recording itself pushed the user over, or
  // another device consumed the balance), so it needs its own notice rather
  // than relying only on the pre-recording banner.
  // Structured so the alert can carry an accurate title and, where the failure
  // is recoverable, a retry action. Previously this was a bare string rendered
  // under a hardcoded "Monthly limit reached" heading, so a transcription
  // failure or a silent recording was reported to the user as a billing limit.
  type Notice = {
    title: string;
    message: string;
    /** Rendered as a "Try again" button when set. */
    onRetry?: () => void;
  };
  const [notice, setNotice] = useState<Notice | null>(null);
  // Discarding destroys an un-saved recording, so it is confirmed first.
  const [confirmDiscard, setConfirmDiscard] = useState(false);

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

  // Tear down recording state when the user navigates away from this tab.
  //
  // reset() only clears UI state — it does NOT stop the recorder. Relying on it
  // alone left the microphone live after leaving the tab (this screen stays
  // mounted, so the unmount cleanup never runs), while simultaneously clearing
  // the recording-active flag that suppresses AuthGate's re-lock. Backgrounding
  // from there could throw up the PIN screen over a still-running recording.
  //
  // Anything in progress is therefore discarded outright: the transcript the
  // user could see is gone either way, so keeping the audio would only orphan a
  // file they can no longer reach.
  useEffect(() => {
    if (isFocused) return;

    const wasActive =
      recordingState === "listening" ||
      recordingState === "recording" ||
      isPaused;

    if (wasActive) {
      // cancelRecording unloads the recorder, restores the audio mode and
      // deletes the partial file.
      voiceActions.cancelRecording().catch(() => {});
      setRecordingState("idle");
      setDuration(0);
      recordingDurationRef.current = 0;
    }

    voiceActions.reset();
    useRecordingStore.getState().setRecordingActive(false);
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
      // Must be reset alongside the state. The timer that maintains this ref
      // only starts once recordingState flips to "recording" ~500ms later, so
      // a recording stopped before the first tick would otherwise be saved
      // with the PREVIOUS session's duration — corrupting stats and badges.
      recordingDurationRef.current = 0;

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

  /**
   * Analyse a transcript and route to the reflection flow (or save directly).
   *
   * Extracted from stopRecording so the "Try again" action on an analysis
   * failure re-runs exactly this path instead of forcing the user to re-record
   * words we already have.
   */
  const analyseAndRoute = async (
    finalTranscript: string,
    audioUri: string | null,
    finalDuration: number,
  ): Promise<void> => {
    try {
      // Build personalization context from user's correction history
      const personalizationContext = buildPersonalizationPrompt();

      // Analyze transcript for emotion suggestions (with personalization bias)
      const analysis = await analyzeTranscript(
        finalTranscript,
        undefined,
        personalizationContext,
      );

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
            emotionScores: analysis.emotionScores,
            emotionIntensityLabels: analysis.emotionIntensityLabels,
            topics: analysis.topics,
            aiAnalysis: analysis.analysis,
            aiReflection: analysis.reflection,
            aiTopThreeEmotions: analysis.aiTopThreeEmotions,
            aiBlendedEmotions: analysis.aiBlendedEmotions,
            aiAmbivalenceFlags: analysis.aiAmbivalenceFlags,
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
          // Full AI analysis — threaded to createJournalEntry via reflection.tsx
          emotionScores: analysis.emotionScores,
          emotionIntensityLabels: analysis.emotionIntensityLabels,
          emotionIntensity: analysis.emotionIntensity,
          topics: analysis.topics,
          aiAnalysis: analysis.analysis,
          aiReflection: analysis.reflection,
          aiTopThreeEmotions: analysis.aiTopThreeEmotions,
          aiBlendedEmotions: analysis.aiBlendedEmotions,
          aiAmbivalenceFlags: analysis.aiAmbivalenceFlags,
        });
        router.push("/reflection");
      }
    } catch (error) {
      console.error("Failed to analyze recording:", error);
      setRecordingState("idle");
      errorHaptic();
      if (error instanceof UsageLimitError) {
        setNotice({ title: "Monthly limit reached", message: error.message });
      } else {
        // The transcript survived; only the emotion analysis failed. Offer a
        // retry that re-runs analysis on the text we already have rather than
        // making the user re-record.
        setNotice({
          title: "Couldn't analyse that entry",
          message:
            "We transcribed your recording but couldn't complete the emotional analysis. This is usually a temporary connection issue.",
          onRetry: () => {
            // Re-acquire the re-entrancy lock: stopRecording's `finally` has
            // already released it by the time this fires, so without this a
            // double-tap on "Try again" would run two analyses concurrently.
            if (isAnalyzingRef.current) return;
            isAnalyzingRef.current = true;
            setNotice(null);
            setRecordingState("processing");
            analyseAndRoute(finalTranscript, audioUri, finalDuration).finally(() => {
              isAnalyzingRef.current = false;
            });
          },
        });
      }
    }
  };

  /**
   * Re-transcribe an already-captured recording after a transport/API failure.
   * The audio is still on disk, so the user's words are not lost.
   */
  const retryTranscription = async (
    audioUri: string | null,
    finalDuration: number,
  ): Promise<void> => {
    if (!audioUri) {
      setNotice({
        title: "Recording unavailable",
        message:
          "That recording is no longer available to retry. Please record a new entry.",
      });
      return;
    }
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    try {
      setRecordingState("processing");
      const result = await transcribeAudioFile(audioUri, "en");
      const retried = result.transcript;
      if (retried && retried.trim().length > 0) {
        await analyseAndRoute(retried, audioUri, finalDuration);
      } else {
        setRecordingState("idle");
        errorHaptic();
        setNotice({
          title: "No speech detected",
          message:
            "We couldn't hear any speech in that recording. Check that your microphone isn't muted or covered, then try again somewhere quieter.",
        });
      }
    } catch (error) {
      console.error("Retry transcription failed:", error);
      setRecordingState("idle");
      errorHaptic();
      if (error instanceof UsageLimitError) {
        setNotice({ title: "Monthly limit reached", message: error.message });
      } else {
        setNotice({
          title: "Transcription failed",
          message:
            "We still couldn't turn that recording into text. Please check your connection and try recording again.",
        });
      }
    } finally {
      isAnalyzingRef.current = false;
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
      // Journal content and on-device file paths must never reach release logs
      // (readable via adb logcat / Console.app). Dev-only.
      if (__DEV__) {
        console.log("[Journal] Recording stopped - audioUri:", audioUri);
        console.log("[Journal] Transcript length:", finalTranscript?.length || 0);
      }

      if (finalTranscript && finalTranscript.trim().length > 0) {
        await analyseAndRoute(finalTranscript, audioUri, finalDuration);
      } else {
        // Transcription succeeded but found no words: mic muted, genuine
        // silence, or an unsupported audio format. Distinct from a failed
        // transcription request, which now throws TranscriptionFailedError.
        setRecordingState("idle");
        errorHaptic();
        setNotice({
          title: "No speech detected",
          message:
            "We couldn't hear any speech in that recording. Check that your microphone isn't muted or covered, then try again somewhere quieter.",
        });
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setRecordingState("idle");
      errorHaptic();
      if (error instanceof UsageLimitError) {
        setNotice({ title: "Monthly limit reached", message: error.message });
      } else if (error instanceof TranscriptionFailedError) {
        // Not the user's fault and not silence. The audio is still on disk, so
        // retry re-transcribes the same file instead of discarding their words.
        setNotice({
          title: "Transcription failed",
          message:
            "Your recording was saved but we couldn't turn it into text. This is usually a connection problem, not something you did.",
          onRetry: () => {
            setNotice(null);
            retryTranscription(error.audioUri, recordingDurationRef.current);
          },
        });
      } else {
        setNotice({
          title: "Something went wrong",
          message:
            error instanceof Error && error.message
              ? error.message
              : "We couldn't finish processing that recording. Please try again.",
        });
      }
    } finally {
      isAnalyzingRef.current = false;
    }
  };

  const handleMicPress = () => {
    if (recordingState === "idle" || recordingState === "permission_denied") {
      startRecording();
    }
  };

  /**
   * Abandon the in-progress recording. Unloads the recorder, restores the audio
   * mode and deletes the partial file so it isn't orphaned on disk.
   */
  const handleDiscard = async () => {
    setConfirmDiscard(false);
    try {
      await voiceActions.cancelRecording();
    } catch (error) {
      console.error("Failed to discard recording:", error);
    } finally {
      useRecordingStore.getState().setRecordingActive(false);
      setRecordingState("idle");
      setDuration(0);
      recordingDurationRef.current = 0;
      voiceActions.reset();
      tapHaptic();
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
                  <WarningCircle
                    size={20}
                    color="#FFFFFF"
                    weight="regular"
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <View className="flex-1">
                    {permissionMessage &&
                    permissionMessage.trim().length > 0 ? (
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 14,
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
                          <GearSix size={14} color="#FFFFFF" weight="regular" />
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
                      fontSize: 14,
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
                      : `${remainingMinutesDisplay} minutes remaining of your ${USAGE_LIMIT_MINUTES}-minute monthly plan.`}
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
                  <WarningCircle
                    size={20}
                    color="#F59E0B"
                    weight="regular"
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
                          fontSize: 14,
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
                  <Sparkle size={16} color="#FFFFFF" weight="regular" />
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
                    fontSize: 14,
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
                <Sparkle size={16} color="#FFFFFF" weight="regular" />
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
                  fontSize: 14,
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
                style={{ flexDirection: "row", alignItems: "center", gap: 24 }}
              >
                {/* Discard button — the only way to abandon a recording without
                    saving it. Without this the user's only exits were Save or
                    leaving the tab. */}
                <View className="items-center" style={{ gap: 6 }}>
                  <Pressable
                    onPress={() => {
                      tapHaptic();
                      setConfirmDiscard(true);
                    }}
                    disabled={isProcessing}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: "rgba(255,255,255,0.10)",
                        borderWidth: 1.5,
                        borderColor: "rgba(255,255,255,0.22)",
                        alignItems: "center",
                        justifyContent: "center",
                        ...Shadows.medium,
                      }}
                    >
                      <Trash size={26} color="rgba(255,255,255,0.9)" weight="regular" />
                    </View>
                  </Pressable>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 11,
                    }}
                  >
                    Discard
                  </Text>
                </View>

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
                            weight="thin"
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
                      <Check size={36} color="#FFFFFF" weight="bold" />
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
                    : `Tap to start · ${remainingMinutesDisplay} min left`}
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

      {/* Recording/analysis failures and the server-reported monthly limit.
          The title comes from the notice itself so each failure is named
          accurately, and recoverable ones offer a retry. */}
      <BrandedAlert
        visible={notice !== null}
        type="error"
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        confirmLabel={notice?.onRetry ? "Not now" : "OK"}
        secondaryLabel={notice?.onRetry ? "Try again" : undefined}
        onSecondary={notice?.onRetry}
        onClose={() => setNotice(null)}
      />

      {/* Discard confirmation — canonical ConfirmDialog (see component for
          design rationale: recoverable action, so theme-colored, not red) */}
      <ConfirmDialog
        visible={confirmDiscard}
        icon="trash"
        title="Discard this recording?"
        message="Your recording and everything you've said will be deleted. This can't be undone."
        confirmLabel="Discard"
        cancelLabel="Keep recording"
        onConfirm={handleDiscard}
        onCancel={() => setConfirmDiscard(false)}
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
