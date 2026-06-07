// Journal Service - Business Logic Layer
import {
  JournalEntry,
  EmotionType,
  EmotionScores,
  EmotionIntensityLabels,
  RankedEmotion,
  BlendedEmotionType,
  TopicCategory,
  generateId,
  buildIntensityLabels,
} from "./types";
import useJournalStore from "./state/journal-store";
import useUserStatsStore from "./state/user-stats-store";
import useBadgesStore from "./state/badges-store";
import {
  countEntriesByTimeOfDay,
  countPositiveEntriesByValence,
  countNeutralEntriesByValence,
  getUniqueEmotions,
  getLongestSessionDuration,
  getTotalDurationSeconds,
  getUniqueTopicCount,
  getMaxEmotionIntensity,
  countWeeksWithMinEntries,
} from "./analytics";
import {
  transcribeAudioWithRetry,
  isDeepgramConfigured,
} from "./api/deepgram-service";
import { analyzeWithOpenRouter } from "./api/openrouter-service";
// Use legacy subpath — v55's top-level export no longer includes
// `EncodingType.Base64`, so the audio-to-base64 conversion crashes without this.
import * as FileSystem from "expo-file-system/legacy";
import { recordSessionUsage } from "./api/usage-service";
import { buildPersonalizationPrompt } from "./personalization";

/**
 * Analyze transcript for emotional content
 * Priority: OpenRouter backend (GPT-4o audio model with prosody) → local keyword analysis
 * @param personalizationContext User correction history to bias the model
 */
export async function analyzeTranscript(
  transcript: string,
  audioBase64?: string,
  personalizationContext?: string,
): Promise<{
  title?: string;
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  emotionScores: EmotionScores;
  emotionIntensityLabels?: EmotionIntensityLabels;
  topics: string[];
  analysis: string;
  reflection?: string;
  valence: number;
  arousal: number;
  suggestedBodySensations: string[];
  distressLevel: "low" | "moderate" | "high";
  aiTopThreeEmotions?: RankedEmotion[];
  aiBlendedEmotions?: BlendedEmotionType[];
  aiAmbivalenceFlags?: string[];
}> {
  // Ensure we have a transcript
  if (!transcript || transcript.trim().length === 0) {
    console.warn("Empty transcript, using default local analysis");
    return analyzeTranscriptLocal("reflection");
  }

  // Try OpenRouter backend first (GPT-4o audio model — prosody + content analysis)
  try {
    console.log(
      "Using GPT-4o audio model for emotional analysis (prosody + content)...",
    );
    const result = await analyzeWithOpenRouter(
      transcript,
      audioBase64,
      personalizationContext,
    );
    return {
      title: result.title,
      emotions: result.emotions,
      primaryEmotion: result.primaryEmotion,
      emotionIntensity: result.emotionIntensity,
      emotionScores: result.emotionScores,
      emotionIntensityLabels: result.emotionIntensityLabels,
      topics: result.topics,
      analysis: result.analysis,
      reflection: result.reflection,
      valence: result.valence ?? 0,
      arousal: result.arousal ?? 50,
      suggestedBodySensations: result.suggestedBodySensations ?? [],
      distressLevel: result.distressLevel ?? "low",
      aiTopThreeEmotions: result.aiTopThreeEmotions,
      aiBlendedEmotions: result.aiBlendedEmotions,
      aiAmbivalenceFlags: result.aiAmbivalenceFlags,
    };
  } catch (error) {
    console.warn(
      "OpenRouter analysis failed, falling back to local analysis:",
      error,
    );
  }

  // Local keyword-based analysis (final fallback - always succeeds)
  try {
    console.log("Using local keyword analysis (fallback)...");
    return analyzeTranscriptLocal(transcript);
  } catch (error) {
    console.error("Local analysis failed, using safe defaults:", error);
    return {
      emotions: ["happiness"],
      primaryEmotion: "happiness",
      emotionIntensity: 50,
      emotionScores: {
        happiness: 50,
        sadness: 0,
        anger: 0,
        disgust: 0,
        fear: 0,
        surprise: 0,
        trust: 30,
        anticipation: 20,
      },
      topics: ["reflection"],
      analysis: "Your journal entry has been recorded.",
      valence: 25,
      arousal: 40,
      suggestedBodySensations: [],
      distressLevel: "low",
    };
  }
}

/**
 * Local keyword-based transcript analysis
 * Used as fallback when OpenAI API is not available
 */
function analyzeTranscriptLocal(transcript: string): {
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  emotionScores: EmotionScores;
  emotionIntensityLabels: EmotionIntensityLabels;
  topics: string[];
  analysis: string;
  valence: number;
  arousal: number;
  suggestedBodySensations: string[];
  distressLevel: "low" | "moderate" | "high";
} {
  const lowerTranscript = transcript.toLowerCase();

  // Weighted keyword matching — score each emotion 0-100 based on keyword hits
  const emotionKeywords: Record<EmotionType, string[]> = {
    happiness: [
      "happy",
      "joy",
      "joyful",
      "delighted",
      "pleased",
      "content",
      "cheerful",
      "glad",
      "wonderful",
      "amazing",
      "great",
      "fantastic",
      "blessed",
      "grateful",
      "excited",
      "love",
      "beautiful",
      "good",
      "positive",
    ],
    sadness: [
      "sad",
      "unhappy",
      "down",
      "depressed",
      "miserable",
      "heartbroken",
      "grief",
      "mourning",
      "disappointed",
      "lonely",
      "melancholy",
      "blue",
      "sorrow",
      "cry",
      "miss",
      "lost",
      "hurt",
      "pain",
    ],
    anger: [
      "angry",
      "mad",
      "furious",
      "annoyed",
      "frustrated",
      "irritated",
      "rage",
      "outraged",
      "resentful",
      "hostile",
      "bitter",
      "hate",
      "unfair",
      "wrong",
      "terrible",
    ],
    disgust: [
      "disgusted",
      "repulsed",
      "sick",
      "revolted",
      "appalled",
      "gross",
      "unpleasant",
      "offensive",
      "distasteful",
      "horrible",
      "awful",
      "nasty",
    ],
    fear: [
      "afraid",
      "scared",
      "worried",
      "anxious",
      "nervous",
      "terrified",
      "frightened",
      "panicked",
      "uneasy",
      "dread",
      "concern",
      "stress",
      "overwhelmed",
      "uncertain",
      "insecure",
      "threat",
    ],
    surprise: [
      "surprised",
      "amazed",
      "shocked",
      "unexpected",
      "astonished",
      "startled",
      "stunned",
      "wow",
      "incredible",
      "unbelievable",
      "sudden",
      "discovered",
      "realized",
    ],
    trust: [
      "trust",
      "believe",
      "faith",
      "confident",
      "secure",
      "reliable",
      "dependable",
      "safe",
      "comfortable",
      "acceptance",
      "assured",
      "certain",
      "hope",
      "support",
    ],
    anticipation: [
      "excited",
      "looking forward",
      "anticipate",
      "expect",
      "eager",
      "hopeful",
      "optimistic",
      "ready",
      "prepared",
      "enthusiastic",
      "can't wait",
      "plan",
      "future",
      "goal",
      "dream",
    ],
  };

  // Count keyword hits per emotion and convert to 0-100 scores
  const rawScores: Record<EmotionType, number> = {
    happiness: 0,
    sadness: 0,
    anger: 0,
    disgust: 0,
    fear: 0,
    surprise: 0,
    trust: 0,
    anticipation: 0,
  };

  (Object.entries(emotionKeywords) as [EmotionType, string[]][]).forEach(
    ([emotion, keywords]) => {
      let hits = 0;
      keywords.forEach((keyword) => {
        // Count all occurrences, not just first match
        const regex = new RegExp(keyword.replace(/'/g, "'"), "gi");
        const matches = lowerTranscript.match(regex);
        if (matches) hits += matches.length;
      });
      rawScores[emotion] = hits;
    },
  );

  // Add a small baseline trust/happiness for any journal entry (people journal to process)
  rawScores.trust = Math.max(rawScores.trust, 1);
  rawScores.anticipation = Math.max(rawScores.anticipation, 1);

  const maxRaw = Math.max(...Object.values(rawScores), 1);

  // Normalize to 0-100, primary gets at least 50, others scale relative
  const emotionScores: EmotionScores = {
    happiness: 0,
    sadness: 0,
    anger: 0,
    disgust: 0,
    fear: 0,
    surprise: 0,
    trust: 0,
    anticipation: 0,
  };

  (Object.keys(rawScores) as EmotionType[]).forEach((emotion) => {
    const raw = rawScores[emotion];
    if (raw === 0) {
      emotionScores[emotion] = Math.floor(Math.random() * 12); // small noise floor 0-11
    } else {
      emotionScores[emotion] = Math.round((raw / maxRaw) * 85) + 10; // 10-95 range
    }
  });

  // Determine primaryEmotion (highest score)
  let primaryEmotion: EmotionType = "happiness";
  let highestScore = -1;
  (Object.keys(emotionScores) as EmotionType[]).forEach((emotion) => {
    if (emotionScores[emotion] > highestScore) {
      highestScore = emotionScores[emotion];
      primaryEmotion = emotion;
    }
  });

  // emotions array = all with score >= 30
  const emotions: EmotionType[] = (Object.keys(emotionScores) as EmotionType[])
    .filter((e) => emotionScores[e] >= 30)
    .sort((a, b) => emotionScores[b] - emotionScores[a])
    .slice(0, 4);

  if (emotions.length === 0) {
    emotions.push(primaryEmotion);
  }

  // Overall intensity = weighted average of top emotions
  const topScores = (Object.values(emotionScores) as number[])
    .sort((a, b) => b - a)
    .slice(0, 3);
  const emotionIntensity = Math.round(
    topScores.reduce((s, v) => s + v, 0) / topScores.length,
  );

  // Topic extraction
  const topicKeywords = [
    "work",
    "family",
    "health",
    "relationship",
    "goal",
    "dream",
    "stress",
    "gratitude",
    "self-care",
    "growth",
    "friend",
    "school",
    "money",
  ];
  const topics = topicKeywords.filter((topic) =>
    lowerTranscript.includes(topic),
  );
  const analysis = generateAnalysis(primaryEmotion, topics);

  // Compute valence-arousal from emotion scores
  const positive =
    emotionScores.happiness +
    emotionScores.trust +
    emotionScores.anticipation +
    emotionScores.surprise;
  const negative =
    emotionScores.sadness +
    emotionScores.fear +
    emotionScores.anger +
    emotionScores.disgust;
  const total = positive + negative;
  const valence =
    total === 0 ? 0 : Math.round(((positive - negative) / total) * 100);

  const highArousal =
    emotionScores.anger +
    emotionScores.fear +
    emotionScores.surprise +
    emotionScores.anticipation;
  const lowArousal =
    emotionScores.sadness +
    emotionScores.trust +
    emotionScores.disgust +
    emotionScores.happiness * 0.5;
  const arousalTotal = highArousal + lowArousal;
  const arousal =
    arousalTotal === 0 ? 50 : Math.round((highArousal / arousalTotal) * 100);

  const distress = -valence * 0.5 + arousal * 0.5;
  const distressLevel =
    distress > 60 ? "high" : distress > 30 ? "moderate" : "low";

  // Suggest body sensations based on dominant emotion
  const sensationMap: Record<EmotionType, string[]> = {
    happiness: ["lightness", "warmth"],
    sadness: ["heavy limbs", "chest tightness"],
    anger: ["tension in shoulders", "racing heart"],
    disgust: ["stomach discomfort", "coldness"],
    fear: ["racing heart", "breathlessness"],
    surprise: ["tingling", "restlessness"],
    trust: ["warmth", "lightness"],
    anticipation: ["restlessness", "racing heart"],
  };

  return {
    emotions,
    primaryEmotion,
    emotionIntensity: Math.min(100, Math.max(20, emotionIntensity)),
    emotionScores,
    emotionIntensityLabels: buildIntensityLabels(emotionScores),
    topics: topics.length > 0 ? topics : ["reflection"],
    analysis,
    valence,
    arousal,
    suggestedBodySensations: sensationMap[primaryEmotion] ?? [],
    distressLevel,
  };
}

function generateAnalysis(
  primaryEmotion: EmotionType,
  topics: string[],
): string {
  const emotionAdvice: Record<EmotionType, string> = {
    happiness:
      "Savor these positive moments and consider what contributed to this feeling.",
    sadness:
      "It's okay to feel sad. Consider what support you might need right now.",
    anger:
      "Your frustration is valid. Think about healthy ways to express and process it.",
    disgust:
      "Strong reactions can reveal important values. Reflect on what triggered this.",
    fear: "Acknowledge your fears and worries. Consider what small step you could take to address them.",
    surprise:
      "Unexpected events can be opportunities for growth and new perspectives.",
    trust:
      "Building trust starts with self-trust. Continue nurturing this feeling of security.",
    anticipation:
      "Channel this hopeful energy into preparation and positive action.",
  };

  const topicsPhrase =
    topics.length > 0
      ? ` Your focus on ${topics.join(", ")} shows meaningful self-reflection.`
      : "";

  return `Your entry reflects your emotional journey.${topicsPhrase} ${emotionAdvice[primaryEmotion]}`;
}

/**
 * Transcribe and analyze audio recording
 * Uses Deepgram for transcription and GPT-4o audio model for emotional analysis
 * (prosody from raw audio + content from transcript simultaneously)
 * Falls back gracefully if APIs are not configured.
 */
export async function transcribeAndAnalyze(
  audioUri: string,
  personalizationContext?: string,
): Promise<{
  transcript: string;
  analysis: {
    title?: string;
    emotions: EmotionType[];
    primaryEmotion: EmotionType;
    emotionIntensity: number;
    emotionScores?: import("./types").EmotionScores;
    emotionIntensityLabels?: import("./types").EmotionIntensityLabels;
    topics: string[];
    analysis: string;
    reflection?: string;
    valence: number;
    arousal: number;
    suggestedBodySensations: string[];
    distressLevel: "low" | "moderate" | "high";
  };
}> {
  let transcript = "";
  let audioBase64: string | undefined;

  // Read the audio file as base64 for GPT-4o audio model (prosody analysis)
  try {
    audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log("Audio file read as base64 for GPT-4o prosody analysis");
  } catch (err) {
    console.warn(
      "Could not read audio file as base64, will use text-only analysis:",
      err,
    );
  }

  // Try to transcribe with Deepgram
  try {
    const transcriptionResult = await transcribeAudioWithRetry(audioUri);
    transcript = transcriptionResult.transcript;
    console.log(
      "Deepgram transcription successful:",
      transcript.substring(0, 100),
    );
  } catch (error) {
    console.warn(
      "Deepgram transcription failed, using mock transcript:",
      error,
    );
    transcript = generateMockTranscript();
  }

  // Analyze with GPT-4o audio model (audio + transcript) - falls back to text-only / local
  let analysis;
  try {
    analysis = await analyzeTranscript(
      transcript,
      audioBase64,
      personalizationContext,
    );
  } catch (error) {
    console.warn("Analysis failed, using local fallback:", error);
    analysis = analyzeTranscriptLocal(transcript);
  }

  return {
    transcript,
    analysis,
  };
}

// Generate mock transcript for testing/fallback
function generateMockTranscript(): string {
  const mockTranscripts = [
    "Today has been a really good day. I woke up feeling energized and grateful for the opportunities ahead. I've been reflecting on my goals and I feel excited about the progress I'm making. There's a sense of peace and clarity that I haven't felt in a while.",
    "I've been feeling a bit overwhelmed lately with everything going on. Work has been stressful and I'm finding it hard to balance everything. I need to remember to take care of myself and not push too hard. It's okay to slow down sometimes.",
    "I'm really proud of what I accomplished this week. I finally finished that project I'd been working on and the feedback was amazing. It feels good to see my hard work paying off. I'm learning to trust myself more.",
    "Spent quality time with family today and it reminded me of what's truly important. Sometimes we get so caught up in our daily routines that we forget to cherish these moments. Feeling grateful and content.",
    "Had an interesting conversation that made me think differently about some things. I realize I've been holding onto some beliefs that no longer serve me. It's time for some positive changes and new perspectives.",
  ];
  return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
}

// Create a new journal entry with full processing
export interface ReflectionOverride {
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  valence: number;
  arousal: number;
  bodySensation?: import("./types").BodySensation;
  bodyRegions?: import("./types").BodyRegionSensation[];
  groundingUsed?: boolean;
  alexithymiaFlag?: boolean;
  distressLevel: "low" | "moderate" | "high";
  emotionScores?: EmotionScores;
  emotionIntensityLabels?: EmotionIntensityLabels;
}

export async function createJournalEntry(
  audioUri: string | undefined,
  duration: number,
  conversationTopic?: TopicCategory,
  conversationPrompt?: string,
  preTranscribedText?: string,
  reflectionOverride?: ReflectionOverride,
  personalizationContext?: string,
): Promise<JournalEntry> {
  const journalStore = useJournalStore.getState();
  const userStatsStore = useUserStatsStore.getState();
  const badgesStore = useBadgesStore.getState();

  let transcript: string;
  let analysis: {
    title?: string;
    emotions: EmotionType[];
    primaryEmotion: EmotionType;
    emotionIntensity: number;
    emotionScores?: import("./types").EmotionScores;
    emotionIntensityLabels?: import("./types").EmotionIntensityLabels;
    topics: string[];
    analysis: string;
    reflection?: string;
    valence: number;
    arousal: number;
    suggestedBodySensations: string[];
    distressLevel: "low" | "moderate" | "high";
    aiTopThreeEmotions?: RankedEmotion[];
    aiBlendedEmotions?: BlendedEmotionType[];
    aiAmbivalenceFlags?: string[];
  };

  // If reflection override is provided, skip AI analysis and use user-adjusted data
  if (reflectionOverride && preTranscribedText) {
    transcript = preTranscribedText;

    // Fetch the AI title (and reflection) upfront so the entry is stored with
    // its final title from the very first write — no follow-up update needed.
    let aiTitle: string | undefined;
    let aiReflectionText: string | undefined;
    try {
      const orResult = await analyzeWithOpenRouter(transcript);
      if (
        orResult.title &&
        orResult.title.trim().length > 0 &&
        !/^(journal entry|untitled|entry|new entry)$/i.test(orResult.title.trim())
      ) {
        aiTitle = orResult.title.trim();
      }
      if (orResult.reflection && orResult.reflection.trim().length > 0) {
        aiReflectionText = orResult.reflection;
      }
    } catch (err) {
      console.warn("[createJournalEntry] AI title fetch failed, using local fallback:", err);
    }

    // Local title fallback: first meaningful sentence fragment (3-6 words)
    const deriveLocalTitle = (text: string): string => {
      const clean = text.replace(/\s+/g, " ").trim();
      const sentences = clean.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
      for (const sentence of sentences) {
        const words = sentence.split(/\s+/).filter(Boolean);
        if (words.length >= 3) {
          return words
            .slice(0, 6)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        }
      }
      const fallbackWords = clean.split(/\s+/).slice(0, 6);
      return fallbackWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    };
    const generatedTitle = aiTitle ?? deriveLocalTitle(transcript);

    analysis = {
      emotions: reflectionOverride.emotions,
      primaryEmotion: reflectionOverride.primaryEmotion,
      // Compute intensity from emotion scores (avg of top-3) when available,
      // otherwise derive from V-A: arousal drives intensity, absolute valence amplifies it
      emotionIntensity: (() => {
        if (reflectionOverride.emotionScores) {
          const topScores = (
            Object.values(reflectionOverride.emotionScores) as number[]
          )
            .sort((a, b) => b - a)
            .slice(0, 3);
          return Math.round(
            topScores.reduce((s, v) => s + v, 0) / topScores.length,
          );
        }
        // Fallback: blend of arousal (60%) and absolute valence (40%)
        return Math.min(
          100,
          Math.max(
            10,
            Math.round(
              reflectionOverride.arousal * 0.6 +
                Math.abs(reflectionOverride.valence) * 0.4,
            ),
          ),
        );
      })(),
      emotionScores: reflectionOverride.emotionScores,
      emotionIntensityLabels: reflectionOverride.emotionIntensityLabels,
      topics: ["reflection"],
      title: generatedTitle,
      analysis: "Journal entry recorded with user reflection.",
      reflection: aiReflectionText,
      valence: reflectionOverride.valence,
      arousal: reflectionOverride.arousal,
      suggestedBodySensations: [],
      distressLevel: reflectionOverride.distressLevel,
    };

  } else if (preTranscribedText) {
    transcript = preTranscribedText;

    let audioBase64: string | undefined;
    if (audioUri) {
      try {
        audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        // non-fatal
      }
    }

    try {
      const analysisResult = await analyzeTranscript(
        transcript,
        audioBase64,
        personalizationContext,
      );
      analysis = analysisResult;
    } catch (error) {
      console.warn("Analysis failed, using local fallback:", error);
      analysis = analyzeTranscriptLocal(transcript);
    }
  } else {
    if (!audioUri) {
      throw new Error("Audio URI or transcript is required");
    }

    try {
      const result = await transcribeAndAnalyze(
        audioUri,
        personalizationContext,
      );
      transcript = result.transcript;
      analysis = result.analysis;
    } catch (error) {
      console.error("Failed to transcribe and analyze:", error);
      throw error;
    }
  }

  // Create the entry
  const entry = journalStore.addEntry({
    title: (analysis.title && analysis.title.trim().length > 0)
      ? analysis.title.trim()
      : "Journal Entry",
    transcript,
    audioUri,
    duration,
    emotions: analysis.emotions,
    primaryEmotion: analysis.primaryEmotion,
    emotionIntensity: analysis.emotionIntensity,
    emotionScores: analysis.emotionScores,
    emotionIntensityLabels: analysis.emotionIntensityLabels,
    valence: analysis.valence,
    arousal: analysis.arousal,
    distressLevel: analysis.distressLevel,
    bodySensation: reflectionOverride?.bodySensation,
    bodyRegions: reflectionOverride?.bodyRegions,
    groundingUsed: reflectionOverride?.groundingUsed,
    alexithymiaFlag: reflectionOverride?.alexithymiaFlag,
    topics: analysis.topics,
    aiAnalysis: analysis.analysis,
    aiReflection: analysis.reflection,
    aiTopThreeEmotions: analysis.aiTopThreeEmotions,
    aiBlendedEmotions: analysis.aiBlendedEmotions,
    aiAmbivalenceFlags: analysis.aiAmbivalenceFlags,
    conversationTopic,
    conversationPrompt,
  });

  // Update user stats - IMPORTANT: incrementEntries MUST be called first
  userStatsStore.incrementEntries();
  userStatsStore.addDuration(duration);
  // Record usage toward the 300-minute monthly limit (fire-and-forget)
  recordSessionUsage(duration).catch(() => {});
  userStatsStore.updateStreak(entry.createdAt);
  userStatsStore.updateMoodStats(analysis.emotionIntensity, analysis.emotions);

  // Check and update badges - calculate stats from ALL entries including the new one
  const allEntries = journalStore.entries;
  const timeOfDay = countEntriesByTimeOfDay(allEntries);
  const stats = userStatsStore.getStats();

  const newlyUnlocked = badgesStore.checkAndUpdateBadges({
    streak: stats.currentStreak,
    totalEntries: stats.totalEntries,
    positiveEntries: countPositiveEntriesByValence(allEntries),
    neutralEntries: countNeutralEntriesByValence(allEntries),
    morningEntries: timeOfDay.morning,
    eveningEntries: timeOfDay.evening,
    uniqueEmotions: getUniqueEmotions(allEntries),
    longestSessionSeconds: Math.max(
      getLongestSessionDuration(allEntries),
      duration,
    ),
    totalDurationSeconds: getTotalDurationSeconds(allEntries),
    uniqueTopicCount: getUniqueTopicCount(allEntries),
    maxEmotionIntensity: getMaxEmotionIntensity(allEntries),
    weeksWithFullCoverage: countWeeksWithMinEntries(allEntries, 7),
  });

  // Queue celebrations after a short delay so navigation to entry-detail
  // completes before the modal attempts to mount. Without the delay the modal
  // fires while the router transition is still in-flight and never renders.
  if (newlyUnlocked.length > 0) {
    setTimeout(() => {
      newlyUnlocked.forEach((id) => badgesStore.queueCelebration(id));
    }, 1200);
  }

  return entry;
}

// Delete entry and update stats
export function deleteJournalEntry(entryId: string): void {
  const journalStore = useJournalStore.getState();
  journalStore.deleteEntry(entryId);
}

// Get formatted entries for display
export function getFormattedEntries(
  filter?: {
    emotions?: EmotionType[];
    searchQuery?: string;
  },
  sortOrder: "newest" | "oldest" = "newest",
): JournalEntry[] {
  const journalStore = useJournalStore.getState();
  let entries = [...journalStore.entries];

  // Apply filters
  if (filter?.emotions && filter.emotions.length > 0) {
    entries = entries.filter((e) =>
      filter.emotions!.some((emotion) => e.emotions.includes(emotion)),
    );
  }

  if (filter?.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.transcript.toLowerCase().includes(query) ||
        e.title.toLowerCase().includes(query),
    );
  }

  // Sort
  entries.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  return entries;
}
