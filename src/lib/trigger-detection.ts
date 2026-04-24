// Trigger Detection Service
// Analyzes journal entries to identify recurring emotional triggers

import { JournalEntry, EmotionType } from './types';

// Emotion classification
const POSITIVE_EMOTIONS: EmotionType[] = ['happiness', 'trust', 'anticipation', 'surprise'];
const NEGATIVE_EMOTIONS: EmotionType[] = ['sadness', 'fear', 'anger', 'disgust'];

export type TriggerType = 'positive' | 'negative';

export interface DetectedTrigger {
  id: string;
  trigger: string; // The topic/situation/activity
  type: TriggerType;
  associatedEmotions: EmotionType[];
  frequency: number; // Number of occurrences
  totalEntries: number; // Total entries in time window
  confidence: number; // 0-100, based on consistency
  insight: string; // Human-readable insight
  timeWindow: '7D' | '14D' | '30D';
}

export interface TriggerAnalysisResult {
  triggers: DetectedTrigger[];
  hasEnoughData: boolean;
  minEntriesRequired: number;
  currentEntries: number;
}

// Common trigger keywords to look for in transcripts
const TRIGGER_PATTERNS = {
  work: ['work', 'job', 'office', 'meeting', 'deadline', 'boss', 'colleague', 'project', 'task', 'career'],
  family: ['family', 'mom', 'dad', 'parent', 'sibling', 'brother', 'sister', 'child', 'kid', 'spouse', 'partner'],
  social: ['friend', 'social', 'party', 'gathering', 'conversation', 'connection', 'people', 'relationship'],
  health: ['health', 'exercise', 'workout', 'gym', 'sleep', 'tired', 'energy', 'sick', 'doctor', 'body'],
  finance: ['money', 'finance', 'budget', 'expense', 'debt', 'saving', 'cost', 'payment', 'bill'],
  selfCare: ['self-care', 'relax', 'rest', 'meditation', 'quiet', 'alone', 'peace', 'calm', 'reading'],
  gratitude: ['grateful', 'gratitude', 'thankful', 'blessed', 'appreciate', 'appreciation'],
  stress: ['stress', 'overwhelm', 'pressure', 'anxious', 'worry', 'burden', 'too much'],
  achievement: ['achieve', 'accomplish', 'success', 'goal', 'win', 'proud', 'progress', 'milestone'],
  change: ['change', 'transition', 'new', 'different', 'unknown', 'uncertainty', 'decision'],
};

/**
 * Get entries within a specific time window
 */
function getEntriesInWindow(entries: JournalEntry[], days: number): JournalEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return entries.filter(entry => new Date(entry.createdAt) >= cutoff);
}

/**
 * Determine if emotions are predominantly positive or negative
 */
function classifyEmotions(emotions: EmotionType[]): TriggerType {
  const positiveCount = emotions.filter(e => POSITIVE_EMOTIONS.includes(e)).length;
  const negativeCount = emotions.filter(e => NEGATIVE_EMOTIONS.includes(e)).length;
  return positiveCount >= negativeCount ? 'positive' : 'negative';
}

/**
 * Extract trigger topics from transcript
 */
function extractTriggers(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase();
  const foundTriggers: string[] = [];

  for (const [category, keywords] of Object.entries(TRIGGER_PATTERNS)) {
    for (const keyword of keywords) {
      if (lowerTranscript.includes(keyword)) {
        foundTriggers.push(category);
        break; // Only count each category once per entry
      }
    }
  }

  return foundTriggers;
}

/**
 * Generate human-readable insight for a trigger
 */
function generateInsight(trigger: string, type: TriggerType, emotions: EmotionType[]): string {
  const triggerLabels: Record<string, string> = {
    work: 'work-related entries',
    family: 'family-related moments',
    social: 'social interactions',
    health: 'health and wellness activities',
    finance: 'financial matters',
    selfCare: 'self-care activities',
    gratitude: 'gratitude practice',
    stress: 'stressful situations',
    achievement: 'achievements and progress',
    change: 'life changes or transitions',
  };

  const triggerLabel = triggerLabels[trigger] || trigger;
  const primaryEmotion = emotions[0];

  if (type === 'positive') {
    return `${primaryEmotion.charAt(0).toUpperCase() + primaryEmotion.slice(1)} often appears with ${triggerLabel}`;
  } else {
    return `${primaryEmotion.charAt(0).toUpperCase() + primaryEmotion.slice(1)} tends to surface around ${triggerLabel}`;
  }
}

/**
 * Calculate confidence based on consistency of emotional response
 */
function calculateConfidence(occurrences: number, totalEntries: number, emotionConsistency: number): number {
  // Base confidence from frequency (more occurrences = higher confidence)
  const frequencyScore = Math.min(occurrences / 5, 1) * 40; // Max 40 points

  // Consistency score (how often the same emotion type appears with this trigger)
  const consistencyScore = emotionConsistency * 40; // Max 40 points

  // Coverage score (what percentage of relevant entries have this pattern)
  const coverageScore = Math.min(occurrences / totalEntries, 0.5) * 2 * 20; // Max 20 points

  return Math.round(frequencyScore + consistencyScore + coverageScore);
}

/**
 * Main trigger detection function
 */
export function detectTriggers(
  entries: JournalEntry[],
  timeWindow: '7D' | '14D' | '30D' = '30D'
): TriggerAnalysisResult {
  const days = timeWindow === '7D' ? 7 : timeWindow === '14D' ? 14 : 30;
  const windowEntries = getEntriesInWindow(entries, days);
  const minRequired = 5; // Minimum entries needed for analysis

  if (windowEntries.length < minRequired) {
    return {
      triggers: [],
      hasEnoughData: false,
      minEntriesRequired: minRequired,
      currentEntries: windowEntries.length,
    };
  }

  // Build trigger-emotion map
  const triggerMap = new Map<string, {
    emotions: EmotionType[];
    types: TriggerType[];
    count: number;
  }>();

  windowEntries.forEach(entry => {
    const triggers = extractTriggers(entry.transcript);
    const entryType = classifyEmotions(entry.emotions);

    // Also use topics from the entry
    const allTriggers = [...new Set([...triggers, ...entry.topics.map(t => t.toLowerCase())])];

    allTriggers.forEach(trigger => {
      const existing = triggerMap.get(trigger) || { emotions: [], types: [], count: 0 };
      existing.emotions.push(...entry.emotions);
      existing.types.push(entryType);
      existing.count++;
      triggerMap.set(trigger, existing);
    });
  });

  // Convert to detected triggers (only those with 3+ occurrences)
  const detectedTriggers: DetectedTrigger[] = [];

  triggerMap.forEach((data, trigger) => {
    if (data.count >= 3) {
      // Calculate dominant emotion type
      const positiveCount = data.types.filter(t => t === 'positive').length;
      const negativeCount = data.types.filter(t => t === 'negative').length;
      const dominantType: TriggerType = positiveCount >= negativeCount ? 'positive' : 'negative';

      // Get unique emotions and count occurrences
      const emotionCounts = new Map<EmotionType, number>();
      data.emotions.forEach(e => {
        emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1);
      });

      // Sort emotions by frequency
      const sortedEmotions = Array.from(emotionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion]) => emotion);

      // Calculate emotion consistency (how often the dominant type appears)
      const dominantTypeCount = dominantType === 'positive' ? positiveCount : negativeCount;
      const emotionConsistency = dominantTypeCount / data.count;

      const confidence = calculateConfidence(data.count, windowEntries.length, emotionConsistency);

      detectedTriggers.push({
        id: `trigger-${trigger}-${timeWindow}`,
        trigger,
        type: dominantType,
        associatedEmotions: sortedEmotions,
        frequency: data.count,
        totalEntries: windowEntries.length,
        confidence,
        insight: generateInsight(trigger, dominantType, sortedEmotions),
        timeWindow,
      });
    }
  });

  // Sort by frequency and confidence
  detectedTriggers.sort((a, b) => {
    const scoreA = a.frequency * 2 + a.confidence;
    const scoreB = b.frequency * 2 + b.confidence;
    return scoreB - scoreA;
  });

  return {
    triggers: detectedTriggers.slice(0, 6), // Return top 6 triggers
    hasEnoughData: true,
    minEntriesRequired: minRequired,
    currentEntries: windowEntries.length,
  };
}

/**
 * Get trigger analysis for all time windows
 */
export function getComprehensiveTriggerAnalysis(entries: JournalEntry[]): {
  '7D': TriggerAnalysisResult;
  '14D': TriggerAnalysisResult;
  '30D': TriggerAnalysisResult;
} {
  return {
    '7D': detectTriggers(entries, '7D'),
    '14D': detectTriggers(entries, '14D'),
    '30D': detectTriggers(entries, '30D'),
  };
}
