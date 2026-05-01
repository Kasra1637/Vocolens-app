import { EmotionType } from "./types";

export interface SubLabel {
  label: string;
  definition: string;
  example: string;
  emotion: EmotionType;
  tier: "low" | "mid" | "high";
}

export const PLUTCHIK_VOCABULARY: SubLabel[] = [
  // Happiness
  {
    emotion: "happiness",
    tier: "low",
    label: "Serenity",
    definition: "A calm, peaceful sense of contentment",
    example: "Feeling at ease after a warm cup of tea",
  },
  {
    emotion: "happiness",
    tier: "mid",
    label: "Joy",
    definition: "An active feeling of pleasure and delight",
    example: "Laughing with a close friend over dinner",
  },
  {
    emotion: "happiness",
    tier: "high",
    label: "Ecstasy",
    definition: "An overwhelming rush of intense joy",
    example: "Achieving a lifelong dream or milestone",
  },
  // Sadness
  {
    emotion: "sadness",
    tier: "low",
    label: "Pensiveness",
    definition: "A quiet, reflective sadness",
    example: "Thinking about a past memory that stirs emotion",
  },
  {
    emotion: "sadness",
    tier: "mid",
    label: "Sadness",
    definition: "A clear feeling of unhappiness or sorrow",
    example: "Missing someone you care about",
  },
  {
    emotion: "sadness",
    tier: "high",
    label: "Grief",
    definition: "Deep, painful sorrow from loss",
    example: "Losing a loved one or a major life change",
  },
  // Anger
  {
    emotion: "anger",
    tier: "low",
    label: "Annoyance",
    definition: "Mild irritation or displeasure",
    example: "Someone cutting in line ahead of you",
  },
  {
    emotion: "anger",
    tier: "mid",
    label: "Anger",
    definition: "A strong feeling of displeasure and opposition",
    example: "Feeling unfairly treated at work",
  },
  {
    emotion: "anger",
    tier: "high",
    label: "Rage",
    definition: "Intense, uncontrolled anger",
    example: "Discovering a serious betrayal of trust",
  },
  // Fear
  {
    emotion: "fear",
    tier: "low",
    label: "Apprehension",
    definition: "A sense of unease about something ahead",
    example: "Nervousness before a job interview",
  },
  {
    emotion: "fear",
    tier: "mid",
    label: "Fear",
    definition: "An unpleasant emotion caused by threat or danger",
    example: "Hearing an unexpected loud noise at night",
  },
  {
    emotion: "fear",
    tier: "high",
    label: "Terror",
    definition: "Extreme fear that overwhelms rational thought",
    example: "Being in immediate physical danger",
  },
  // Trust
  {
    emotion: "trust",
    tier: "low",
    label: "Acceptance",
    definition: "An openness to a person or situation",
    example: "Being willing to try a friend's suggestion",
  },
  {
    emotion: "trust",
    tier: "mid",
    label: "Trust",
    definition: "A firm belief in reliability and truth",
    example: "Confiding a secret in a close friend",
  },
  {
    emotion: "trust",
    tier: "high",
    label: "Admiration",
    definition: "Deep respect and warm approval",
    example: "Looking up to someone who overcame great challenges",
  },
  // Surprise
  {
    emotion: "surprise",
    tier: "low",
    label: "Distraction",
    definition: "A brief shift of attention from the unexpected",
    example: "Hearing your name called across a room",
  },
  {
    emotion: "surprise",
    tier: "mid",
    label: "Surprise",
    definition: "A reaction to something sudden and unexpected",
    example: "An unexpected gift from a friend",
  },
  {
    emotion: "surprise",
    tier: "high",
    label: "Amazement",
    definition: "Astonishment mixed with wonder",
    example: "Witnessing an incredible natural phenomenon",
  },
  // Disgust
  {
    emotion: "disgust",
    tier: "low",
    label: "Boredom",
    definition: "A mild sense of disinterest or displeasure",
    example: "Listening to a topic that doesn't engage you",
  },
  {
    emotion: "disgust",
    tier: "mid",
    label: "Disgust",
    definition: "A strong feeling of revulsion or disapproval",
    example: "Encountering dishonesty or unfairness",
  },
  {
    emotion: "disgust",
    tier: "high",
    label: "Loathing",
    definition: "Intense disgust and aversion",
    example: "Witnessing cruelty or abuse of power",
  },
  // Anticipation
  {
    emotion: "anticipation",
    tier: "low",
    label: "Interest",
    definition: "Curiosity and attention toward something",
    example: "Reading about a topic you'd like to explore",
  },
  {
    emotion: "anticipation",
    tier: "mid",
    label: "Anticipation",
    definition: "Expectant eagerness about what's coming",
    example: "Looking forward to a vacation next week",
  },
  {
    emotion: "anticipation",
    tier: "high",
    label: "Vigilance",
    definition: "Heightened alertness and readiness",
    example: "Preparing for an important life-changing event",
  },
];

export function getSubLabels(emotion: EmotionType): SubLabel[] {
  return PLUTCHIK_VOCABULARY.filter((s) => s.emotion === emotion);
}

export function getSubLabelForIntensity(
  emotion: EmotionType,
  intensity: number,
): SubLabel {
  const tier = intensity <= 33 ? "low" : intensity <= 66 ? "mid" : "high";
  return (
    PLUTCHIK_VOCABULARY.find((s) => s.emotion === emotion && s.tier === tier) ??
    PLUTCHIK_VOCABULARY.find((s) => s.emotion === emotion && s.tier === "mid")!
  );
}
