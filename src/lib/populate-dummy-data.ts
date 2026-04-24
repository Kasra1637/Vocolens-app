// Populate stores with realistic dummy data for demo purposes
import useJournalStore from './state/journal-store';
import useUserStatsStore from './state/user-stats-store';
import { EmotionType } from './types';

const DUMMY_ENTRIES = [
  // Recent entries (last 7 days) with varied moods
  {
    title: 'Morning Reflections',
    transcript: 'Started my day with a great workout. Feeling energized and ready to tackle the day. The sunrise was beautiful and I feel grateful for this moment of peace.',
    duration: 145,
    emotions: ['happiness', 'trust', 'anticipation'] as EmotionType[],
    primaryEmotion: 'happiness' as EmotionType,
    emotionIntensity: 85,
    topics: ['exercise', 'gratitude', 'morning routine'],
    aiAnalysis: 'You seem to be in a positive mindset with strong feelings of contentment. Physical activity and nature connection are contributing to your well-being.',
    daysAgo: 0,
  },
  {
    title: 'Work Stress',
    transcript: 'Had a really challenging day at work. The project deadline is approaching and I feel overwhelmed by all the tasks. Need to find a way to manage this better.',
    duration: 178,
    emotions: ['fear', 'sadness', 'anger'] as EmotionType[],
    primaryEmotion: 'fear' as EmotionType,
    emotionIntensity: 72,
    topics: ['work', 'stress', 'deadlines'],
    aiAnalysis: 'Work-related stress is affecting your emotional state. Consider breaking down tasks and practicing stress management techniques.',
    daysAgo: 1,
  },
  {
    title: 'Evening Wind Down',
    transcript: 'Spent the evening reading and listening to music. Feeling much calmer after yesterday. Sometimes you just need to slow down and give yourself permission to rest.',
    duration: 132,
    emotions: ['trust', 'happiness'] as EmotionType[],
    primaryEmotion: 'trust' as EmotionType,
    emotionIntensity: 68,
    topics: ['self-care', 'relaxation', 'music'],
    aiAnalysis: 'You\'re practicing good self-care by creating space for rest and activities you enjoy.',
    daysAgo: 2,
  },
  {
    title: 'Exciting News',
    transcript: 'Got some amazing news today! My proposal was accepted and I\'ll be leading the new project. Can\'t believe it\'s happening. So much excitement and a bit of nervousness too.',
    duration: 156,
    emotions: ['happiness', 'anticipation', 'surprise'] as EmotionType[],
    primaryEmotion: 'happiness' as EmotionType,
    emotionIntensity: 92,
    topics: ['career', 'achievement', 'excitement'],
    aiAnalysis: 'Celebrating a significant professional milestone. Mixed feelings of excitement and nervousness are completely natural.',
    daysAgo: 3,
  },
  {
    title: 'Sunday Reset',
    transcript: 'Taking time to organize my thoughts and plan for the week ahead. Feeling balanced and centered. Grateful for quiet Sundays like this.',
    duration: 167,
    emotions: ['trust', 'happiness', 'anticipation'] as EmotionType[],
    primaryEmotion: 'trust' as EmotionType,
    emotionIntensity: 78,
    topics: ['planning', 'organization', 'gratitude'],
    aiAnalysis: 'Taking time for reflection and planning demonstrates strong self-awareness and intentionality.',
    daysAgo: 4,
  },
  {
    title: 'Frustrating Day',
    transcript: 'Nothing went according to plan today. Missed my alarm, spilled coffee, and had technical issues during an important meeting. Just one of those days.',
    duration: 143,
    emotions: ['anger', 'disgust', 'sadness'] as EmotionType[],
    primaryEmotion: 'anger' as EmotionType,
    emotionIntensity: 65,
    topics: ['frustration', 'setbacks', 'bad day'],
    aiAnalysis: 'Sometimes days don\'t go as planned. Remember that these moments are temporary and don\'t define your overall progress.',
    daysAgo: 5,
  },
  {
    title: 'Family Time',
    transcript: 'Had a wonderful dinner with family. Lots of laughter and good conversations. These moments remind me what really matters in life.',
    duration: 189,
    emotions: ['happiness', 'trust', 'surprise'] as EmotionType[],
    primaryEmotion: 'happiness' as EmotionType,
    emotionIntensity: 88,
    topics: ['family', 'connection', 'gratitude'],
    aiAnalysis: 'Strong social connections are contributing positively to your emotional well-being. Family time is clearly important to you.',
    daysAgo: 6,
  },
  // Additional entries for 14-day view
  {
    title: 'Midweek Check-in',
    transcript: 'Halfway through the week and feeling okay. Not amazing, not terrible, just steady. Sometimes that\'s enough.',
    duration: 121,
    emotions: ['trust', 'anticipation'] as EmotionType[],
    primaryEmotion: 'trust' as EmotionType,
    emotionIntensity: 55,
    topics: ['reflection', 'balance'],
    aiAnalysis: 'Accepting a neutral emotional state shows emotional maturity. Not every day needs to be extraordinary.',
    daysAgo: 8,
  },
  {
    title: 'Creative Flow',
    transcript: 'Got lost in a creative project today. Time flew by and I felt completely in the zone. This is what passion feels like.',
    duration: 174,
    emotions: ['happiness', 'anticipation', 'surprise'] as EmotionType[],
    primaryEmotion: 'happiness' as EmotionType,
    emotionIntensity: 90,
    topics: ['creativity', 'flow state', 'passion'],
    aiAnalysis: 'Experiencing flow states in creative activities is a powerful source of fulfillment and joy.',
    daysAgo: 10,
  },
  {
    title: 'Feeling Uncertain',
    transcript: 'Not sure what direction to take with some decisions coming up. Feel a bit anxious about making the wrong choice. Need to trust myself more.',
    duration: 158,
    emotions: ['fear', 'anticipation', 'sadness'] as EmotionType[],
    primaryEmotion: 'fear' as EmotionType,
    emotionIntensity: 62,
    topics: ['decisions', 'uncertainty', 'self-trust'],
    aiAnalysis: 'Decision-making anxiety is common. Remember that most decisions aren\'t permanent and you can adjust course.',
    daysAgo: 12,
  },
  // Additional entries for 30-day view
  {
    title: 'Breakthrough Moment',
    transcript: 'Finally figured out the solution to a problem I\'ve been working on for weeks. Feels incredible to overcome that challenge.',
    duration: 139,
    emotions: ['happiness', 'surprise', 'anticipation'] as EmotionType[],
    primaryEmotion: 'happiness' as EmotionType,
    emotionIntensity: 87,
    topics: ['achievement', 'problem-solving', 'breakthrough'],
    aiAnalysis: 'Overcoming challenges builds confidence and resilience. Celebrate these wins.',
    daysAgo: 15,
  },
  {
    title: 'Quiet Evening',
    transcript: 'Just a peaceful evening at home. Nothing special happened but that\'s okay. Sometimes the quiet moments are the most meaningful.',
    duration: 112,
    emotions: ['trust', 'happiness'] as EmotionType[],
    primaryEmotion: 'trust' as EmotionType,
    emotionIntensity: 70,
    topics: ['peace', 'home', 'contentment'],
    aiAnalysis: 'Finding contentment in ordinary moments is a sign of mindfulness and appreciation.',
    daysAgo: 18,
  },
  {
    title: 'Reconnecting',
    transcript: 'Reached out to an old friend today. It was so good to catch up and reconnect. Reminded me of the importance of maintaining relationships.',
    duration: 165,
    emotions: ['happiness', 'trust', 'surprise'] as EmotionType[],
    primaryEmotion: 'happiness' as EmotionType,
    emotionIntensity: 82,
    topics: ['friendship', 'connection', 'relationships'],
    aiAnalysis: 'Nurturing friendships contributes significantly to emotional well-being and life satisfaction.',
    daysAgo: 21,
  },
  {
    title: 'Dealing with Change',
    transcript: 'Big changes happening and I\'m not sure how I feel about it all. Scared but also a little excited. Change is always uncomfortable.',
    duration: 147,
    emotions: ['fear', 'anticipation', 'surprise'] as EmotionType[],
    primaryEmotion: 'fear' as EmotionType,
    emotionIntensity: 68,
    topics: ['change', 'transition', 'growth'],
    aiAnalysis: 'Mixed emotions about change are completely normal. Both fear and excitement can coexist.',
    daysAgo: 24,
  },
  {
    title: 'Grateful Heart',
    transcript: 'Took some time to reflect on all the good things in my life. Even with challenges, there\'s so much to be grateful for. Health, loved ones, opportunities.',
    duration: 181,
    emotions: ['happiness', 'trust', 'anticipation'] as EmotionType[],
    primaryEmotion: 'happiness' as EmotionType,
    emotionIntensity: 85,
    topics: ['gratitude', 'reflection', 'appreciation'],
    aiAnalysis: 'Practicing gratitude is a powerful tool for emotional well-being and perspective.',
    daysAgo: 27,
  },
];

export function populateDummyData(): void {
  const journalStore = useJournalStore.getState();
  const statsStore = useUserStatsStore.getState();

  // Clear existing data
  journalStore.clearAllEntries();
  statsStore.resetStats();

  // Add entries with proper dates
  const now = new Date();

  DUMMY_ENTRIES.forEach((entry) => {
    const entryDate = new Date(now);
    entryDate.setDate(now.getDate() - entry.daysAgo);

    // Create the entry
    const createdEntry = journalStore.addEntry({
      title: entry.title,
      transcript: entry.transcript,
      duration: entry.duration,
      emotions: entry.emotions,
      primaryEmotion: entry.primaryEmotion,
      emotionIntensity: entry.emotionIntensity,
      topics: entry.topics,
      aiAnalysis: entry.aiAnalysis,
    });

    // Update the created date to match the daysAgo
    journalStore.updateEntry(createdEntry.id, {
      createdAt: entryDate.toISOString(),
      updatedAt: entryDate.toISOString(),
    });

    // Update stats
    statsStore.incrementEntries();
    statsStore.addDuration(entry.duration);
    statsStore.updateStreak(entryDate.toISOString());
    statsStore.updateMoodStats(entry.emotionIntensity, entry.emotions);
  });

  console.log('✅ Dummy data populated successfully!');
  console.log(`📝 Created ${DUMMY_ENTRIES.length} journal entries`);
  console.log(`🔥 Current streak: ${statsStore.getStats().currentStreak} days`);
}

// Call this function to reset to dummy data
export function resetToDummyData(): void {
  populateDummyData();
}
