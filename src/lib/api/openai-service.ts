/**
 * OpenAI API Service
 * Handles emotional analysis and AI insights using OpenAI GPT models
 *
 * Features:
 * - Secure API key management via environment variables
 * - Advanced emotional intelligence analysis
 * - Emotion classification
 * - Topic extraction and theme identification
 * - Personalized insights and recommendations
 * - Error handling and retry logic
 */

import { EmotionType } from '../types';
import Constants from 'expo-constants';

const OPENAI_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY ||
  process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EmotionalAnalysisResult {
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  topics: string[];
  analysis: string;
  insights: string[];
  confidence: number;
}

/**
 * Analyze transcript using OpenAI GPT for emotional intelligence
 * @param transcript - The transcribed text to analyze
 * @returns Detailed emotional analysis
 */
export async function analyzeEmotions(transcript: string): Promise<EmotionalAnalysisResult> {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY in .env file');
  }

  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  try {
    const systemPrompt = `You are an expert emotional intelligence analyst specializing in journal entry analysis based on Plutchik's wheel of emotions.
Your role is to provide compassionate, insightful analysis of journal transcripts to help users understand their emotions better.

Analyze the following journal transcript and provide:
1. Detected emotions (focus ONLY on these 8 core emotions from Plutchik's wheel: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation)
2. Primary emotion (the strongest emotion present from the 8 core emotions)
3. Emotion intensity (0-100, how strongly emotions are expressed)
4. Key topics or themes
5. A compassionate analysis paragraph
6. 2-3 actionable insights or reflections

IMPORTANT EMOTION DISTINCTIONS:
- Happiness: Joy, contentment, pleasure, delight
- Sadness: Grief, sorrow, melancholy, disappointment
- Anger: Frustration, irritation, rage, annoyance
- Disgust: Revulsion, distaste, aversion, disapproval
- Fear: Anxiety, worry, dread, nervousness (NOT the same as surprise)
- Surprise: Astonishment, amazement, shock, unexpectedness (NOT the same as fear)
- Trust: Confidence, faith, reliability, acceptance (NOT the same as happiness)
- Anticipation: Expectation, excitement, hope, eagerness (NOT the same as anxiety/fear)

When someone is anxious or worried, classify as FEAR, not anticipation.
When someone is looking forward to something positively, classify as ANTICIPATION.
When someone feels secure or has faith, classify as TRUST.
When something unexpected happens, classify as SURPRISE.

Format your response as valid JSON with this structure:
{
  "emotions": ["emotion1", "emotion2"],
  "primaryEmotion": "emotion",
  "emotionIntensity": 75,
  "topics": ["topic1", "topic2"],
  "analysis": "Your compassionate analysis here...",
  "insights": ["Insight 1", "Insight 2", "Insight 3"],
  "confidence": 0.85
}

Be empathetic, non-judgmental, and focus on emotional growth and self-awareness.`;

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Please analyze this journal entry:\n\n"${transcript}"`,
      },
    ];

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        temperature: 0.7, // Balanced creativity and consistency
        max_tokens: 1000,
        response_format: { type: 'json_object' }, // Ensure JSON response
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON response
    const analysisResult = JSON.parse(content);

    // Validate and sanitize the response - all 8 core emotions from Plutchik's wheel
    const validEmotions: EmotionType[] = [
      'happiness', 'sadness', 'anger', 'disgust', 'fear', 'surprise', 'trust', 'anticipation',
    ];

    const emotions = (analysisResult.emotions || [])
      .filter((e: string) => validEmotions.includes(e as EmotionType))
      .slice(0, 3) as EmotionType[];

    // Ensure we have at least one emotion
    if (emotions.length === 0) {
      emotions.push('happiness');
    }

    const primaryEmotion = validEmotions.includes(analysisResult.primaryEmotion)
      ? analysisResult.primaryEmotion
      : emotions[0];

    return {
      emotions,
      primaryEmotion,
      emotionIntensity: Math.max(0, Math.min(100, analysisResult.emotionIntensity || 50)),
      topics: (analysisResult.topics || ['reflection']).slice(0, 5),
      analysis: analysisResult.analysis || 'Your journal entry has been recorded.',
      insights: (analysisResult.insights || []).slice(0, 3),
      confidence: Math.max(0, Math.min(1, analysisResult.confidence || 0.8)),
    };
  } catch (error) {
    console.error('OpenAI emotional analysis error:', error);
    throw new Error(
      `Failed to analyze emotions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Analyze emotions with retry logic
 * @param transcript - The transcribed text to analyze
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Emotional analysis result
 */
export async function analyzeEmotionsWithRetry(
  transcript: string,
  maxRetries: number = 3
): Promise<EmotionalAnalysisResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeEmotions(transcript);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Emotional analysis attempt ${attempt} failed:`, lastError.message);

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Emotional analysis failed after all retries');
}

/**
 * Generate deeper insights from multiple journal entries
 * @param transcripts - Array of journal transcripts
 * @returns Pattern analysis and insights
 */
export async function generateDeepInsights(
  transcripts: string[]
): Promise<{
  patterns: string[];
  trends: string[];
  recommendations: string[];
}> {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OpenAI API key not configured');
  }

  if (transcripts.length === 0) {
    return {
      patterns: [],
      trends: [],
      recommendations: [],
    };
  }

  try {
    const systemPrompt = `You are an emotional intelligence coach analyzing patterns across multiple journal entries.
Identify recurring themes, emotional patterns, and provide actionable insights for personal growth.

Provide your analysis as JSON:
{
  "patterns": ["pattern1", "pattern2", "pattern3"],
  "trends": ["trend1", "trend2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}`;

    const transcriptSummary = transcripts.slice(0, 10).join('\n\n---\n\n');

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze these journal entries for patterns and insights:\n\n${transcriptSummary}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Deep insights error:', error);
    return {
      patterns: [],
      trends: [],
      recommendations: [],
    };
  }
}

/**
 * Check if OpenAI API is configured
 * @returns true if API key is configured
 */
export function isOpenAIConfigured(): boolean {
  return Boolean(OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-'));
}

export interface WeeklyReflectionResult {
  narrativeSummary: string;
  emotionalJourney: string;
  keyThemes: string[];
  growthMoment: string;
  weekAhead: string;
  dominantEmotion: EmotionType;
  emotionalRange: string;
  entryCount: number;
  weekLabel: string;
}

/**
 * Generate a weekly reflection narrative digest from a week's journal entries
 */
export async function generateWeeklyReflection(
  entries: Array<{
    transcript: string;
    primaryEmotion: EmotionType;
    emotionIntensity: number;
    topics: string[];
    createdAt: string;
    title: string;
  }>,
  weekLabel: string
): Promise<WeeklyReflectionResult> {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OpenAI API key not configured');
  }

  if (entries.length === 0) {
    throw new Error('No entries to reflect on');
  }

  const entryDigest = entries.map((e, i) => {
    const date = new Date(e.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    return `Entry ${i + 1} (${date}) — Emotion: ${e.primaryEmotion} (${e.emotionIntensity}% intensity)\nTopics: ${e.topics.join(', ')}\nExcerpt: "${e.transcript.slice(0, 300)}${e.transcript.length > 300 ? '...' : ''}"`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are a warm, insightful journaling companion creating a weekly reflection digest.
Your tone is compassionate, personal, and encouraging — like a wise friend who truly listened.
Write as if speaking directly to the person. Keep narratives warm and intimate, not clinical.

Respond with valid JSON only:
{
  "narrativeSummary": "2-3 sentence warm narrative overview of their week's emotional journey",
  "emotionalJourney": "1-2 sentences describing how their emotions evolved through the week",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "growthMoment": "1 sentence highlighting a meaningful moment or insight from their entries",
  "weekAhead": "1 encouraging sentence for the coming week",
  "dominantEmotion": "the most prevalent emotion (must be one of: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation)",
  "emotionalRange": "brief phrase describing their emotional range e.g. 'Mostly grounded with moments of joy'"
}`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Here are my journal entries from ${weekLabel}:\n\n${entryDigest}\n\nPlease create my weekly reflection digest.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data: OpenAIResponse = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in response');
  }

  const result = JSON.parse(content);

  const validEmotions: EmotionType[] = [
    'happiness', 'sadness', 'anger', 'disgust', 'fear', 'surprise', 'trust', 'anticipation',
  ];

  return {
    narrativeSummary: result.narrativeSummary || 'A week of meaningful reflection.',
    emotionalJourney: result.emotionalJourney || 'Your emotions told a story this week.',
    keyThemes: (result.keyThemes || []).slice(0, 4),
    growthMoment: result.growthMoment || 'You showed up for yourself this week.',
    weekAhead: result.weekAhead || 'Carry this week\'s wisdom forward.',
    dominantEmotion: validEmotions.includes(result.dominantEmotion) ? result.dominantEmotion : 'trust',
    emotionalRange: result.emotionalRange || 'A balanced week',
    entryCount: entries.length,
    weekLabel,
  };
}
