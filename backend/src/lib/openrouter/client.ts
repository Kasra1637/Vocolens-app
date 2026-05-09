/**
 * OpenRouter API Client
 */

import {
  OPENROUTER_BASE_URL,
  AUDIO_MODEL,
  TEXT_FALLBACK_MODEL,
  getApiKey,
} from "./types.ts";
import type {
  AnalysisResult,
  WeeklyReflectionEntry,
  WeeklyReflectionResult,
  AICompletionRequest,
  EmotionType,
} from "./types.ts";
import { AUDIO_SYSTEM_PROMPT, TEXT_SYSTEM_PROMPT } from "./prompts.ts";
import { parseAnalysisJson } from "./parser.ts";

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://blink.new",
    "X-Title": "Vocolens",
  };
}

export async function analyzeTranscript(
  transcript: string,
  audioBase64?: string
): Promise<AnalysisResult> {
  const apiKey = getApiKey();

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    throw new Error(
      "[OpenRouter] OPENROUTER_API_KEY is missing or invalid. " +
      "Ensure it is set in /home/user/workspace/backend/.env and starts with sk-or-"
    );
  }

  // PATH 1: Audio provided → openai/gpt-4o-audio-preview
  if (audioBase64 && audioBase64.length > 100) {
    console.log(`[OpenRouter] Sending request → model=${AUDIO_MODEL} (audio+text multimodal)`);

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model: AUDIO_MODEL,
          messages: [
            { role: "system", content: AUDIO_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: { data: audioBase64, format: "wav" },
                },
                {
                  type: "text",
                  text: `Transcript of the audio above:\n\n"${transcript}"\n\nAnalyse both the vocal characteristics (prosody, tone, pitch, pace, energy) AND the text. Return JSON only.`,
                },
              ],
            },
          ],
          temperature: 0.6,
          max_tokens: 1400,
        }),
      });

      if (response.ok) {
        const data = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
          model?: string;
          error?: { message: string };
        };

        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const resolvedModel = data.model ?? AUDIO_MODEL;
          console.log(`[OpenRouter] ✓ GPT-4o Audio Preview response received | resolved_model=${resolvedModel}`);
          return parseAnalysisJson(content, true, resolvedModel);
        }

        console.warn(`[OpenRouter] Audio model returned empty content — falling back to text model`);
      } else {
        const errBody = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message: string } };
        console.warn(`[OpenRouter] Audio model error ${response.status}: ${errBody?.error?.message} — falling back to text model`);
      }
    } catch (err) {
      console.warn(`[OpenRouter] Audio model request threw: ${err} — falling back to text model`);
    }
  } else {
    console.log(`[OpenRouter] No audio provided — using text-only path`);
  }

  // PATH 2: Text only → openai/gpt-4o
  console.log(`[OpenRouter] Sending request → model=${TEXT_FALLBACK_MODEL} (text-only)`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: TEXT_FALLBACK_MODEL,
      messages: [
        { role: "system", content: TEXT_SYSTEM_PROMPT },
        { role: "user", content: `Analyse this journal entry:\n\n"${transcript}"` },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[OpenRouter] Text model error (${response.status}): ${errText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("[OpenRouter] Text model returned empty content");
  }

  const resolvedModel = data.model ?? TEXT_FALLBACK_MODEL;
  console.log(`[OpenRouter] ✓ GPT-4o text response received | resolved_model=${resolvedModel}`);
  return parseAnalysisJson(content, false, resolvedModel);
}

export async function analyzeTranscriptWithRetry(
  transcript: string,
  maxRetries = 3,
  audioBase64?: string
): Promise<AnalysisResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeTranscript(transcript, audioBase64);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[OpenRouter] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
        console.log(`[OpenRouter] Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("[OpenRouter] All retry attempts exhausted");
}

export async function generateWeeklyReflection(
  entries: WeeklyReflectionEntry[],
  weekLabel: string
): Promise<WeeklyReflectionResult> {
  const apiKey = getApiKey();

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    throw new Error("[OpenRouter] OPENROUTER_API_KEY is missing or invalid.");
  }

  if (entries.length === 0) {
    throw new Error("No entries to reflect on");
  }

  const entryDigest = entries
    .map((e, i) => {
      const date = new Date(e.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      return `Entry ${i + 1} (${date}) — Emotion: ${e.primaryEmotion} (${e.emotionIntensity}% intensity)\nTopics: ${e.topics.join(", ")}\nExcerpt: "${e.transcript.slice(0, 300)}${e.transcript.length > 300 ? "..." : ""}"`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `You are a warm, insightful journaling companion creating a weekly reflection digest.
Your tone is compassionate, personal, and encouraging — like a wise friend who truly listened.
Write as if speaking directly to the person. Keep narratives warm and intimate, not clinical.

Respond with valid JSON only (no markdown, no code fences):
{
  "narrativeSummary": "2-3 sentence warm narrative overview of their week's emotional journey",
  "emotionalJourney": "1-2 sentences describing how their emotions evolved through the week",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "growthMoment": "1 sentence highlighting a meaningful moment or insight from their entries",
  "weekAhead": "1 encouraging sentence for the coming week",
  "dominantEmotion": "the most prevalent emotion (one of: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation)",
  "emotionalRange": "brief phrase describing their emotional range e.g. 'Mostly grounded with moments of joy'"
}`;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: TEXT_FALLBACK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here are my journal entries from ${weekLabel}:\n\n${entryDigest}\n\nPlease create my weekly reflection digest.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[OpenRouter] Weekly reflection error (${response.status}): ${errText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("[OpenRouter] Weekly reflection returned empty content");
  }

  const jsonStr = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const result = JSON.parse(jsonStr);

  const validEmotions: EmotionType[] = [
    "happiness", "sadness", "anger", "disgust", "fear", "surprise", "trust", "anticipation",
  ];

  console.log(`[OpenRouter] Weekly reflection generated | entries=${entries.length} | dominant=${result.dominantEmotion}`);

  return {
    narrativeSummary: result.narrativeSummary || "A week of meaningful reflection.",
    emotionalJourney: result.emotionalJourney || "Your emotions told a story this week.",
    keyThemes: (Array.isArray(result.keyThemes) ? result.keyThemes : []).slice(0, 4) as string[],
    growthMoment: result.growthMoment || "You showed up for yourself this week.",
    weekAhead: result.weekAhead || "Carry this week's wisdom forward.",
    dominantEmotion: validEmotions.includes(result.dominantEmotion) ? result.dominantEmotion as EmotionType : "trust",
    emotionalRange: result.emotionalRange || "A balanced week",
    entryCount: entries.length,
    weekLabel,
  };
}

export async function generateAIEmotionalAnalysis(request: AICompletionRequest): Promise<unknown> {
  const apiKey = getApiKey();

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    throw new Error("[OpenRouter] OPENROUTER_API_KEY is missing or invalid.");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: TEXT_FALLBACK_MODEL,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[OpenRouter] AI completion error (${response.status}): ${errText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("[OpenRouter] AI completion returned empty content");
  }

  const jsonStr = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(jsonStr);
}
