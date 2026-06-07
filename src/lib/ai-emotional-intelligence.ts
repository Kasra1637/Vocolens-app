// AI-Powered Emotional Intelligence Analysis
//
// Routes all calls through the Cloudflare Worker backend so activity appears
// in the OpenRouter dashboard under the server-side API key.
// Falls back to a safe local default if the backend is unreachable.

import { JournalEntry } from './types';
import {
  DeepInsight,
  EmotionalPattern,
  EmotionalTrigger,
  MoodCycle,
  EmotionalShift,
} from './emotional-intelligence';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIAnalysisResponse {
  patterns: EmotionalPattern[];
  triggers: EmotionalTrigger[];
  cycles: MoodCycle[];
  shifts: EmotionalShift[];
  insights: DeepInsight[];
}

// ── Config ────────────────────────────────────────────────────────────────────

function getBackendUrl(): string {
  return (
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    'https://vocolens-api.kasrammarvel.workers.dev'
  ).trim();
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CachedAnalysis {
  data: AIAnalysisResponse;
  timestamp: number;
  entryCount: number;
}

let cachedAnalysis: CachedAnalysis | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function clearAICache(): void {
  cachedAnalysis = null;
}

// ── Default (safe fallback) ───────────────────────────────────────────────────

function getDefaultAnalysis(): AIAnalysisResponse {
  return {
    patterns: [],
    triggers: [],
    cycles: [],
    shifts: [],
    insights: [
      {
        category: 'recommendation',
        title: 'Keep Journaling',
        message:
          'Continue recording your thoughts and emotions. The more entries you add, the more personalised insights we can provide.',
        evidence: [],
        priority: 'medium',
        emoji: '📝',
      },
    ],
  };
}

// ── Entry serialisation ───────────────────────────────────────────────────────

function prepareEntriesForAI(entries: JournalEntry[]): string {
  return entries
    .slice(0, 20)
    .map((entry, index) => {
      const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      return `Entry ${index + 1} (${date}):
Emotions: ${entry.emotions.join(', ')}
Intensity: ${entry.emotionIntensity}/100
Content: ${entry.transcript.slice(0, 300)}${entry.transcript.length > 300 ? '...' : ''}`;
    })
    .join('\n\n');
}

// ── Backend proxy call ────────────────────────────────────────────────────────

async function callBackend(entriesText: string): Promise<AIAnalysisResponse> {
  const systemPrompt = `You are an expert emotional intelligence analyst and therapist. Analyze journal entries to provide deep psychological insights. Be empathetic, insightful, and provide actionable advice.

Return a JSON object with this exact structure:
{
  "patterns": [
    {
      "id": "unique-id",
      "type": "recurring|trigger|cycle|shift|correlation",
      "title": "Short title",
      "description": "Detailed description",
      "confidence": 0-100,
      "frequency": 0,
      "insight": "Key insight",
      "actionable": "Actionable advice",
      "relatedEmotions": ["happiness"],
      "timeframe": "Past 7 days",
      "dataPoints": 0
    }
  ],
  "triggers": [
    {
      "trigger": "topic/keyword",
      "emotions": ["emotion1"],
      "averageSentiment": 0-100,
      "occurrences": 0,
      "context": "When this appears",
      "recommendation": "How to handle"
    }
  ],
  "cycles": [
    {
      "pattern": "morning_dip|evening_peak|weekly_cycle|stress_recovery",
      "description": "Description",
      "insight": "Insight",
      "strength": 0-100
    }
  ],
  "shifts": [
    {
      "from": "emotion",
      "to": "emotion",
      "frequency": 0,
      "averageTimeBetween": "2 days",
      "context": "What triggers this",
      "insight": "Key insight"
    }
  ],
  "insights": [
    {
      "category": "self_awareness|growth|warning|strength|recommendation",
      "title": "Insight title",
      "message": "Detailed message",
      "evidence": ["evidence1"],
      "priority": "high|medium|low",
      "emoji": "💡"
    }
  ]
}

Limit to 2-3 items per category. Respond with ONLY a valid JSON object — no markdown, no commentary.`;

  const userPrompt = `Analyze these journal entries and provide emotional intelligence insights:\n\n${entriesText}\n\nRespond with valid JSON only.`;

  const response = await fetch(`${getBackendUrl()}/api/journal/ai-completion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error('[AI Emotional Intelligence] Backend returned', response.status);
    return getDefaultAnalysis();
  }

  const json = await response.json() as {
    success?: boolean;
    data?: unknown;
    error?: string;
  };

  if (!json.success || !json.data) {
    console.error('[AI Emotional Intelligence] Backend error:', json.error);
    return getDefaultAnalysis();
  }

  return validateAndCleanAnalysis(json.data as AIAnalysisResponse);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateAndCleanAnalysis(analysis: AIAnalysisResponse): AIAnalysisResponse {
  return {
    patterns: Array.isArray(analysis.patterns) ? analysis.patterns.slice(0, 3) : [],
    triggers: Array.isArray(analysis.triggers) ? analysis.triggers.slice(0, 3) : [],
    cycles:   Array.isArray(analysis.cycles)   ? analysis.cycles.slice(0, 2)   : [],
    shifts:   Array.isArray(analysis.shifts)   ? analysis.shifts.slice(0, 3)   : [],
    insights: Array.isArray(analysis.insights)
      ? analysis.insights.slice(0, 5).map((insight) => ({
          ...insight,
          category: validateCategory(insight.category),
          priority: validatePriority(insight.priority),
          emoji:    insight.emoji || '💡',
          evidence: Array.isArray(insight.evidence) ? insight.evidence : [],
        }))
      : [],
  };
}

function validateCategory(
  category: string,
): 'self_awareness' | 'growth' | 'warning' | 'strength' | 'recommendation' {
  const valid = ['self_awareness', 'growth', 'warning', 'strength', 'recommendation'];
  return valid.includes(category)
    ? (category as 'self_awareness' | 'growth' | 'warning' | 'strength' | 'recommendation')
    : 'recommendation';
}

function validatePriority(priority: string): 'high' | 'medium' | 'low' {
  const valid = ['high', 'medium', 'low'];
  return valid.includes(priority) ? (priority as 'high' | 'medium' | 'low') : 'medium';
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeWithAI(entries: JournalEntry[]): Promise<AIAnalysisResponse> {
  if (entries.length < 5) return getDefaultAnalysis();

  try {
    return await callBackend(prepareEntriesForAI(entries));
  } catch (error) {
    console.warn('[AI Emotional Intelligence] Analysis failed, using default:', error);
    return getDefaultAnalysis();
  }
}

export async function getAIAnalysis(entries: JournalEntry[]): Promise<AIAnalysisResponse> {
  const now = Date.now();

  if (
    cachedAnalysis &&
    now - cachedAnalysis.timestamp < CACHE_DURATION &&
    cachedAnalysis.entryCount === entries.length
  ) {
    return cachedAnalysis.data;
  }

  const analysis = await analyzeWithAI(entries);

  cachedAnalysis = { data: analysis, timestamp: now, entryCount: entries.length };

  return analysis;
}
