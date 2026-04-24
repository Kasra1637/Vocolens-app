// Advanced Emotional Intelligence & Pattern Analysis System
import { JournalEntry, EmotionType } from './types';

// Helper to determine if emotions are positive
const POSITIVE_EMOTIONS: EmotionType[] = ['happiness', 'trust', 'anticipation', 'surprise'];
const NEGATIVE_EMOTIONS: EmotionType[] = ['sadness', 'fear', 'anger', 'disgust'];

function getEmotionScore(emotions: EmotionType[]): number {
  const hasPositive = emotions.some(e => POSITIVE_EMOTIONS.includes(e));
  const hasNegative = emotions.some(e => NEGATIVE_EMOTIONS.includes(e));
  if (hasPositive && !hasNegative) return 80;
  if (hasNegative && !hasPositive) return 30;
  return 50;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EmotionalPattern {
  id: string;
  type: 'recurring' | 'trigger' | 'cycle' | 'shift' | 'correlation';
  title: string;
  description: string;
  confidence: number; // 0-100
  frequency: number; // How often this pattern occurs
  insight: string;
  actionable: string; // Actionable advice for the user
  relatedEmotions: EmotionType[];
  timeframe: string; // e.g., "Past 7 days", "Last month"
  dataPoints: number; // Number of entries analyzed
}

export interface EmotionalTrigger {
  trigger: string; // Topic or keyword
  emotions: EmotionType[];
  averageSentiment: number;
  occurrences: number;
  context: string;
  recommendation: string;
}

export interface MoodCycle {
  pattern: 'morning_dip' | 'evening_peak' | 'weekly_cycle' | 'stress_recovery';
  description: string;
  insight: string;
  strength: number; // 0-100, how strong the pattern is
}

export interface EmotionalShift {
  from: EmotionType;
  to: EmotionType;
  frequency: number;
  averageTimeBetween: string; // "2 days", "1 week"
  context: string;
  insight: string;
}

export interface DeepInsight {
  category: 'self_awareness' | 'growth' | 'warning' | 'strength' | 'recommendation';
  title: string;
  message: string;
  evidence: string[];
  priority: 'high' | 'medium' | 'low';
  emoji: string;
}

// ============================================================================
// EMOTIONAL VOCABULARY & COMPLEXITY ANALYSIS
// ============================================================================

const EMOTIONAL_COMPLEXITY_WORDS = {
  high: [
    'ambivalent', 'conflicted', 'bittersweet', 'melancholy', 'nostalgic',
    'contemplative', 'introspective', 'vulnerable', 'overwhelmed', 'uncertain',
    'apprehensive', 'tentative', 'reluctant', 'hesitant', 'wistful'
  ],
  nuanced: [
    'grateful', 'hopeful', 'inspired', 'content', 'peaceful', 'fulfilled',
    'disappointed', 'frustrated', 'concerned', 'worried', 'anxious'
  ],
  basic: [
    'happy', 'sad', 'angry', 'scared', 'excited', 'tired', 'okay', 'fine', 'good', 'bad'
  ]
};

const GROWTH_INDICATORS = [
  'realized', 'learned', 'understood', 'discovered', 'recognized',
  'noticed', 'aware', 'insight', 'perspective', 'growth', 'progress'
];

const STRESS_INDICATORS = [
  'overwhelmed', 'stressed', 'pressure', 'burden', 'exhausted',
  'drained', 'struggling', 'difficult', 'hard', 'too much', 'can\'t cope'
];

const RESILIENCE_INDICATORS = [
  'despite', 'overcame', 'managed', 'handled', 'got through',
  'survived', 'better than', 'proud', 'accomplished', 'succeeded'
];

const AVOIDANCE_INDICATORS = [
  'avoiding', 'ignore', 'don\'t want to think', 'pushing away',
  'distract', 'escape', 'run from', 'hide from'
];

// ============================================================================
// PATTERN DETECTION FUNCTIONS
// ============================================================================

/**
 * Analyzes emotional vocabulary complexity over time
 */
export function analyzeEmotionalVocabulary(entries: JournalEntry[]): DeepInsight | null {
  if (entries.length < 5) return null;

  let complexityScore = 0;
  let totalWords = 0;

  entries.forEach(entry => {
    const text = entry.transcript.toLowerCase();
    const words = text.split(/\s+/);
    totalWords += words.length;

    EMOTIONAL_COMPLEXITY_WORDS.high.forEach(word => {
      if (text.includes(word)) complexityScore += 3;
    });
    EMOTIONAL_COMPLEXITY_WORDS.nuanced.forEach(word => {
      if (text.includes(word)) complexityScore += 2;
    });
  });

  const avgComplexity = complexityScore / entries.length;

  if (avgComplexity > 5) {
    return {
      category: 'strength',
      title: 'Rich Emotional Vocabulary',
      message: 'You express emotions with nuance and depth, showing high emotional intelligence.',
      evidence: ['Use of complex emotional language', 'Detailed descriptions of feelings'],
      priority: 'medium',
      emoji: '🎭'
    };
  } else if (avgComplexity < 1) {
    return {
      category: 'recommendation',
      title: 'Expanding Emotional Awareness',
      message: 'Try exploring more specific words to describe your feelings. This can deepen self-understanding.',
      evidence: ['Opportunities to use more varied emotional language'],
      priority: 'low',
      emoji: '📖'
    };
  }

  return null;
}

/**
 * Detects recurring emotional triggers from topics
 */
export function detectEmotionalTriggers(entries: JournalEntry[]): EmotionalTrigger[] {
  if (entries.length < 10) return [];

  const topicEmotionMap = new Map<string, {
    emotions: Map<EmotionType, number>;
    sentiments: number[];
    count: number;
  }>();

  // Build map of topics to emotions
  entries.forEach(entry => {
    entry.topics.forEach(topic => {
      if (!topicEmotionMap.has(topic)) {
        topicEmotionMap.set(topic, {
          emotions: new Map(),
          sentiments: [],
          count: 0
        });
      }

      const data = topicEmotionMap.get(topic)!;
      entry.emotions.forEach(emotion => {
        data.emotions.set(emotion, (data.emotions.get(emotion) || 0) + 1);
      });

      const moodScore = getEmotionScore(entry.emotions);
      data.sentiments.push(moodScore);
      data.count++;
    });
  });

  const triggers: EmotionalTrigger[] = [];

  topicEmotionMap.forEach((data, topic) => {
    if (data.count >= 3) {
      const avgSentiment = data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length;
      const dominantEmotions = Array.from(data.emotions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([emotion]) => emotion);

      let context = '';
      let recommendation = '';

      if (avgSentiment < 40) {
        context = `${topic} consistently brings up challenging emotions`;
        recommendation = `Consider what aspects of ${topic} are most difficult and whether you need support`;
      } else if (avgSentiment > 65) {
        context = `${topic} is a source of positive feelings`;
        recommendation = `This area brings you joy - consider how to nurture it further`;
      } else {
        context = `${topic} evokes mixed emotions`;
        recommendation = `Explore the complexity of your feelings around ${topic}`;
      }

      triggers.push({
        trigger: topic,
        emotions: dominantEmotions,
        averageSentiment: Math.round(avgSentiment),
        occurrences: data.count,
        context,
        recommendation
      });
    }
  });

  return triggers.sort((a, b) => b.occurrences - a.occurrences).slice(0, 5);
}

/**
 * Detects mood cycles and temporal patterns
 */
export function detectMoodCycles(entries: JournalEntry[]): MoodCycle[] {
  if (entries.length < 14) return [];

  const cycles: MoodCycle[] = [];

  // Time-of-day patterns
  const morningMoods: number[] = [];
  const eveningMoods: number[] = [];

  entries.forEach(entry => {
    const hour = new Date(entry.createdAt).getHours();
    const moodScore = getEmotionScore(entry.emotions);

    if (hour >= 5 && hour < 12) {
      morningMoods.push(moodScore);
    } else if (hour >= 17 && hour < 24) {
      eveningMoods.push(moodScore);
    }
  });

  if (morningMoods.length >= 5 && eveningMoods.length >= 5) {
    const morningAvg = morningMoods.reduce((a, b) => a + b, 0) / morningMoods.length;
    const eveningAvg = eveningMoods.reduce((a, b) => a + b, 0) / eveningMoods.length;

    if (morningAvg < eveningAvg - 15) {
      cycles.push({
        pattern: 'morning_dip',
        description: 'Your mornings tend to be more challenging',
        insight: 'Consider a morning routine that sets a positive tone - perhaps journaling, exercise, or gratitude practice.',
        strength: Math.min(100, Math.abs(eveningAvg - morningAvg) * 2)
      });
    } else if (eveningAvg < morningAvg - 15) {
      cycles.push({
        pattern: 'evening_peak',
        description: 'Evenings can be more difficult for you',
        insight: 'Evening wind-down rituals may help - consider meditation, limiting screen time, or reflective writing.',
        strength: Math.min(100, Math.abs(morningAvg - eveningAvg) * 2)
      });
    }
  }

  // Weekly stress-recovery pattern
  const dayOfWeekMoods: { [key: number]: number[] } = {};
  entries.forEach(entry => {
    const day = new Date(entry.createdAt).getDay();
    const moodScore = getEmotionScore(entry.emotions);
    if (!dayOfWeekMoods[day]) dayOfWeekMoods[day] = [];
    dayOfWeekMoods[day].push(moodScore);
  });

  // Check for weekend recovery pattern
  const weekdayAvgs = [1, 2, 3, 4, 5].map(day => {
    const moods = dayOfWeekMoods[day] || [];
    return moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
  }).filter(x => x !== null) as number[];

  const weekendAvgs = [0, 6].map(day => {
    const moods = dayOfWeekMoods[day] || [];
    return moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
  }).filter(x => x !== null) as number[];

  if (weekdayAvgs.length >= 3 && weekendAvgs.length >= 1) {
    const weekdayAvg = weekdayAvgs.reduce((a, b) => a + b, 0) / weekdayAvgs.length;
    const weekendAvg = weekendAvgs.reduce((a, b) => a + b, 0) / weekendAvgs.length;

    if (weekendAvg > weekdayAvg + 10) {
      cycles.push({
        pattern: 'stress_recovery',
        description: 'You show a clear weekday stress, weekend recovery pattern',
        insight: 'Your work-life balance may need attention. Consider ways to bring more ease into your weekdays.',
        strength: Math.min(100, (weekendAvg - weekdayAvg) * 2)
      });
    }
  }

  return cycles;
}

/**
 * Analyzes emotional shifts and transitions
 */
export function analyzeEmotionalShifts(entries: JournalEntry[]): EmotionalShift[] {
  if (entries.length < 7) return [];

  const shifts: Map<string, { count: number; times: number[] }> = new Map();

  // Sort entries chronologically
  const sorted = [...entries].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const fromEmotion = current.primaryEmotion;
    const toEmotion = next.primaryEmotion;

    if (fromEmotion !== toEmotion) {
      const key = `${fromEmotion}->${toEmotion}`;
      const timeDiff = new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime();

      if (!shifts.has(key)) {
        shifts.set(key, { count: 0, times: [] });
      }
      const data = shifts.get(key)!;
      data.count++;
      data.times.push(timeDiff);
    }
  }

  const emotionalShifts: EmotionalShift[] = [];

  shifts.forEach((data, key) => {
    if (data.count >= 2) {
      const [from, to] = key.split('->') as [EmotionType, EmotionType];
      const avgTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;
      const avgDays = avgTime / (1000 * 60 * 60 * 24);

      let context = '';
      let insight = '';

      // Positive shifts
      if ((from === 'sadness' || from === 'fear') && (to === 'trust' || to === 'happiness')) {
        context = 'Natural recovery process';
        insight = 'You show resilience in bouncing back from difficult emotions. This is a strength to recognize.';
      }
      // Concerning shifts
      else if ((from === 'happiness' || from === 'trust') && (to === 'sadness' || to === 'fear')) {
        context = 'Recurring dip in mood';
        insight = 'Notice what triggers this shift. Understanding the pattern can help you address underlying causes.';
      }
      // Stress cycle
      else if (from === 'fear' && to === 'sadness') {
        context = 'Fear leading to sadness';
        insight = 'This cycle suggests stress management may be beneficial. Consider rest and stress-reduction techniques.';
      } else {
        context = `Emotional transition: ${from} to ${to}`;
        insight = `You experience this shift regularly, suggesting it's part of your emotional rhythm.`;
      }

      emotionalShifts.push({
        from,
        to,
        frequency: data.count,
        averageTimeBetween: avgDays < 1 ? 'same day' :
                           avgDays < 7 ? `${Math.round(avgDays)} days` :
                           `${Math.round(avgDays / 7)} weeks`,
        context,
        insight
      });
    }
  });

  return emotionalShifts.sort((a, b) => b.frequency - a.frequency).slice(0, 3);
}

/**
 * Detects growth indicators and self-awareness moments
 */
export function detectGrowthPatterns(entries: JournalEntry[]): DeepInsight[] {
  if (entries.length < 5) return [];

  const insights: DeepInsight[] = [];
  let growthMentions = 0;
  let resilienceMentions = 0;
  let avoidanceMentions = 0;
  let stressMentions = 0;

  entries.forEach(entry => {
    const text = entry.transcript.toLowerCase();

    GROWTH_INDICATORS.forEach(word => {
      if (text.includes(word)) growthMentions++;
    });

    RESILIENCE_INDICATORS.forEach(word => {
      if (text.includes(word)) resilienceMentions++;
    });

    AVOIDANCE_INDICATORS.forEach(word => {
      if (text.includes(word)) avoidanceMentions++;
    });

    STRESS_INDICATORS.forEach(word => {
      if (text.includes(word)) stressMentions++;
    });
  });

  // Growth mindset insight
  if (growthMentions >= 3) {
    insights.push({
      category: 'strength',
      title: 'Active Self-Reflection',
      message: 'You frequently pause to learn from experiences, showing strong self-awareness and growth mindset.',
      evidence: ['Regular mentions of insights and learning', 'Reflective language patterns'],
      priority: 'high',
      emoji: '🌱'
    });
  }

  // Resilience insight
  if (resilienceMentions >= 2) {
    insights.push({
      category: 'strength',
      title: 'Resilient Coping',
      message: 'You demonstrate resilience by acknowledging challenges while focusing on how you handle them.',
      evidence: ['Evidence of bouncing back', 'Problem-solving language'],
      priority: 'high',
      emoji: '💪'
    });
  }

  // Avoidance warning
  if (avoidanceMentions >= 3) {
    insights.push({
      category: 'warning',
      title: 'Avoidance Pattern',
      message: 'You may be avoiding certain emotions or situations. Gentle exploration of what you\'re avoiding could be healing.',
      evidence: ['Language suggesting avoidance', 'Patterns of deflection'],
      priority: 'high',
      emoji: '🚧'
    });
  }

  // Chronic stress
  if (stressMentions >= entries.length / 2) {
    insights.push({
      category: 'warning',
      title: 'Sustained Stress',
      message: 'Stress appears frequently in your entries. This may warrant additional support or stress-management strategies.',
      evidence: ['Consistent stress indicators', 'Overwhelm language'],
      priority: 'high',
      emoji: '⚠️'
    });
  }

  return insights;
}

/**
 * Analyzes emotional coherence (alignment between emotions and sentiment)
 */
export function analyzeEmotionalCoherence(entries: JournalEntry[]): DeepInsight | null {
  if (entries.length < 5) return null;

  let incoherentCount = 0;

  entries.forEach(entry => {
    const hasPositiveEmotion = entry.emotions.some(e =>
      ['happiness', 'trust', 'anticipation', 'surprise'].includes(e)
    );
    const hasNegativeEmotion = entry.emotions.some(e =>
      ['sadness', 'fear', 'anger', 'disgust'].includes(e)
    );

    // Check for emotional complexity (both positive and negative)
    if (hasPositiveEmotion && hasNegativeEmotion) {
      incoherentCount++;
    }
  });

  const incoherenceRate = incoherentCount / entries.length;

  if (incoherenceRate > 0.4) {
    return {
      category: 'self_awareness',
      title: 'Complex Emotional Experiences',
      message: 'You often experience mixed emotions simultaneously, reflecting emotional maturity and authenticity.',
      evidence: ['Presence of contradictory emotions', 'Nuanced emotional states'],
      priority: 'medium',
      emoji: '🎭'
    };
  }

  return null;
}

/**
 * Master function to generate comprehensive deep insights
 */
export function generateDeepInsights(entries: JournalEntry[]): {
  patterns: EmotionalPattern[];
  triggers: EmotionalTrigger[];
  cycles: MoodCycle[];
  shifts: EmotionalShift[];
  insights: DeepInsight[];
} {
  if (entries.length === 0) {
    return { patterns: [], triggers: [], cycles: [], shifts: [], insights: [] };
  }

  const insights: DeepInsight[] = [];

  // Gather all insights
  const vocabInsight = analyzeEmotionalVocabulary(entries);
  if (vocabInsight) insights.push(vocabInsight);

  insights.push(...detectGrowthPatterns(entries));

  const coherenceInsight = analyzeEmotionalCoherence(entries);
  if (coherenceInsight) insights.push(coherenceInsight);

  // Get other analyses
  const triggers = detectEmotionalTriggers(entries);
  const cycles = detectMoodCycles(entries);
  const shifts = analyzeEmotionalShifts(entries);

  // Convert to patterns format
  const patterns: EmotionalPattern[] = [];

  // Add trigger patterns
  triggers.slice(0, 3).forEach(trigger => {
    patterns.push({
      id: `trigger-${trigger.trigger}`,
      type: 'trigger',
      title: `${trigger.trigger} triggers strong reactions`,
      description: trigger.context,
      confidence: Math.min(100, trigger.occurrences * 15),
      frequency: trigger.occurrences,
      insight: trigger.recommendation,
      actionable: trigger.recommendation,
      relatedEmotions: trigger.emotions,
      timeframe: `Based on ${entries.length} entries`,
      dataPoints: trigger.occurrences
    });
  });

  return {
    patterns,
    triggers,
    cycles,
    shifts,
    insights
  };
}
