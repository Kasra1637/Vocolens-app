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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './api/client';

// ── Cache ─────────────────────────────────────────────────────────────────────
//
// Every call here is a billed OpenRouter request (POST /api/journal/ai-completion
// is in the Worker's PAID_PATHS), so this cache is a cost control, not just a
// latency optimisation. It has three layers:
//
//   1. `inflight` — request coalescing. Five hooks in hooks.ts call
//      getAIAnalysis() with identical arguments, and they use *different*
//      react-query keys, so react-query will NOT deduplicate them. Without a
//      shared in-flight promise, concurrent callers all miss the cache (which is
//      only populated after the await resolves) and each fires a real, billed
//      request. That is a classic cache stampede, and the comment in
//      useCreateEntry records it happening in practice ("4+ duplicate billings
//      per entry save"). Joining the in-flight promise makes N concurrent
//      callers cost exactly one request.
//
//   2. `cachedAnalysis` — in-memory result cache, cleared on every app launch.
//
//   3. AsyncStorage — survives relaunch, so simply reopening the app and
//      visiting Insights does not re-bill for an unchanged set of entries.
//      Only successful analyses are persisted.

interface CachedAnalysis {
  data: AIAnalysisResponse;
  /** Absolute expiry, so successes and fallbacks can have different lifetimes. */
  expiresAt: number;
  key: string;
}

let cachedAnalysis: CachedAnalysis | null = null;

/** Shared promise for an identical request that has not resolved yet. */
let inflight: { key: string; promise: Promise<AIAnalysisResponse> } | null = null;

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const PERSISTED_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day
/**
 * Fallback results are cached only briefly — long enough to stop a retry storm,
 * short enough that one transient 503 doesn't pin the canned "Keep Journaling"
 * copy in front of the user for a full 10 minutes.
 */
const FAILURE_CACHE_DURATION = 60 * 1000; // 1 minute

const PERSIST_KEY = 'vocolens_ai_analysis_cache_v1';

/**
 * Identifies a set of entries for caching purposes. Matches the react-query key
 * used by the hooks (count + newest entry timestamp) so the two layers
 * invalidate together — the previous version keyed on entry count alone, which
 * meant editing an entry, or deleting one and adding another, kept serving stale
 * insights for up to 10 minutes.
 */
function getCacheKey(entries: JournalEntry[]): string {
  return `${entries.length}-${entries[0]?.createdAt ?? 'empty'}`;
}

/**
 * Consumers sort/mutate what they get back (e.g. usePriorityInsights sorts
 * `insights` in place), so never hand out the cached object itself.
 */
function cloneAnalysis(analysis: AIAnalysisResponse): AIAnalysisResponse {
  return {
    patterns: [...analysis.patterns],
    triggers: [...analysis.triggers],
    cycles: [...analysis.cycles],
    shifts: [...analysis.shifts],
    insights: [...analysis.insights],
  };
}

async function readPersistedAnalysis(key: string): Promise<AIAnalysisResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key: string; savedAt: number; data: AIAnalysisResponse };
    if (parsed.key !== key) return null;
    if (Date.now() - parsed.savedAt >= PERSISTED_CACHE_DURATION) return null;
    if (!parsed.data || !Array.isArray(parsed.data.insights)) return null;
    return parsed.data;
  } catch {
    // Corrupt or unavailable storage is never fatal — just re-analyse.
    return null;
  }
}

async function writePersistedAnalysis(key: string, data: AIAnalysisResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ key, savedAt: Date.now(), data }),
    );
  } catch {
    // Non-fatal: the in-memory cache still applies for this session.
  }
}

/**
 * Drops every cached analysis, in memory and on disk.
 *
 * Must be called when the user deletes their journal data: the cached payload is
 * derived from their entries and quotes them in `evidence`, so leaving it in
 * AsyncStorage would outlive the data it came from.
 */
export async function clearAICache(): Promise<void> {
  cachedAnalysis = null;
  inflight = null;
  try {
    await AsyncStorage.removeItem(PERSIST_KEY);
  } catch {
    // Ignore — the in-memory copy is already gone.
  }
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

  const response = await apiFetch('/api/journal/ai-completion', {
    method: 'POST',
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

/**
 * Resolves an analysis for `entries`, consulting the persisted cache before
 * spending money, and recording the result in both cache layers.
 */
async function loadAnalysis(
  entries: JournalEntry[],
  key: string,
): Promise<AIAnalysisResponse> {
  // A previous launch may already have paid for this exact set of entries.
  const persisted = await readPersistedAnalysis(key);
  if (persisted) {
    cachedAnalysis = { data: persisted, expiresAt: Date.now() + CACHE_DURATION, key };
    return persisted;
  }

  // Too little material to analyse — no request, no charge.
  if (entries.length < 5) {
    const fallback = getDefaultAnalysis();
    cachedAnalysis = { data: fallback, expiresAt: Date.now() + CACHE_DURATION, key };
    return fallback;
  }

  try {
    const analysis = await callBackend(prepareEntriesForAI(entries));
    cachedAnalysis = { data: analysis, expiresAt: Date.now() + CACHE_DURATION, key };
    // Fire-and-forget: persisting is an optimisation, not a correctness concern.
    void writePersistedAnalysis(key, analysis);
    return analysis;
  } catch (error) {
    console.warn('[AI Emotional Intelligence] Analysis failed, using default:', error);
    const fallback = getDefaultAnalysis();
    // Deliberately NOT persisted, and only briefly cached.
    cachedAnalysis = { data: fallback, expiresAt: Date.now() + FAILURE_CACHE_DURATION, key };
    return fallback;
  }
}

export async function getAIAnalysis(entries: JournalEntry[]): Promise<AIAnalysisResponse> {
  const key = getCacheKey(entries);

  // 1. Fresh result already in memory.
  if (cachedAnalysis && cachedAnalysis.key === key && Date.now() < cachedAnalysis.expiresAt) {
    return cloneAnalysis(cachedAnalysis.data);
  }

  // 2. An identical request is already running — join it instead of starting a
  //    second billed call.
  if (inflight && inflight.key === key) {
    return cloneAnalysis(await inflight.promise);
  }

  // 3. Start the request and publish the promise SYNCHRONOUSLY, before the first
  //    await. This is what makes step 2 reachable: any caller that arrives while
  //    this one is still waiting sees the shared promise rather than an empty
  //    cache. Ordering here is load-bearing — do not await before assigning.
  const promise = loadAnalysis(entries, key);
  inflight = { key, promise };

  try {
    return cloneAnalysis(await promise);
  } finally {
    // Only clear if no newer request has replaced this one.
    if (inflight?.promise === promise) inflight = null;
  }
}
