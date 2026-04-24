import { Share } from 'react-native';
import { Badge } from './types';

// ─── Copy ─────────────────────────────────────────────────────────────────────

const BADGE_EMOJIS: Record<string, string> = {
  'streak-3':           '🔥',
  'streak-7':           '⚡️',
  'streak-14':          '🎯',
  'streak-30':          '🏆',
  'streak-100':         '👑',
  'entries-10':         '📖',
  'entries-50':         '✍️',
  'entries-100':        '🏅',
  'entries-250':        '📚',
  'entries-500':        '📕',
  'early-bird':         '🌅',
  'night-owl':          '🌙',
  'emotional-explorer': '❤️',
  'optimist':           '☀️',
  'mindful':            '⚖️',
  'weekly-ritual':      '📅',
  'first-entry':        '✨',
  'long-session':       '⏰',
};

const BADGE_SHARE_LINES: Record<string, string> = {
  'streak-3':           '3 days journaling in a row — a real habit is forming.',
  'streak-7':           'A full week of voice journaling. Consistency is everything.',
  'streak-14':          'Two weeks strong. This is who I\'m becoming.',
  'streak-30':          '30 consecutive days of self-reflection. Truly life-changing.',
  'streak-100':         '100 days in a row. This journey has changed me.',
  'entries-10':         'My first 10 journal entries are in. The adventure begins.',
  'entries-50':         '50 voice journal entries deep. Self-discovery in progress.',
  'entries-100':        '100 entries! Building a library of my inner world.',
  'entries-250':        '250 entries. My story, told in my own voice.',
  'entries-500':        '500 journal entries — an entire archive of my growth.',
  'early-bird':         'Mornings are my time to reflect. 10 sunrise entries done.',
  'night-owl':          'Late nights and deep thoughts. 10 evening entries logged.',
  'emotional-explorer': 'Logged all 8 core emotions. Feeling the full spectrum.',
  'optimist':           '20 positive entries. Choosing gratitude, day by day.',
  'mindful':            'Finding balance in every entry. Balanced Soul, earned.',
  'weekly-ritual':      'A full week of daily journaling. Ritual officially unlocked.',
  'first-entry':        'Just took the first step on my voice journaling journey.',
  'long-session':       'Went deep — a 10+ minute reflection session. Worth every second.',
};

const RARITY_LABELS: Record<string, string> = {
  common:    '🌟 Common',
  rare:      '💫 Rare',
  epic:      '🔮 Epic',
  legendary: '👑 Legendary',
};

// ─── URL builder ──────────────────────────────────────────────────────────────

/**
 * Builds a shareable vocolens.com URL with UTM + referral params.
 * e.g. https://vocolens.com?utm_source=share&utm_medium=milestone&utm_campaign=streak-7&ref=K2X9MF3A
 */
export function buildShareUrl(badgeId: string, referralCode: string): string {
  const params = new URLSearchParams({
    utm_source:   'share',
    utm_medium:   'milestone',
    utm_campaign: badgeId,
    ref:          referralCode,
  });
  return `https://vocolens.com?${params.toString()}`;
}

// ─── Share action ─────────────────────────────────────────────────────────────

export interface ShareMilestoneOptions {
  badge: Badge;
  referralCode: string;
}

/**
 * Opens the native share sheet with a rich milestone message and referral URL.
 */
export async function shareMilestone({ badge, referralCode }: ShareMilestoneOptions): Promise<void> {
  const emoji     = BADGE_EMOJIS[badge.id]      ?? '🎉';
  const line      = BADGE_SHARE_LINES[badge.id]  ?? badge.description;
  const rarity    = RARITY_LABELS[badge.rarity]  ?? '';
  const shareUrl  = buildShareUrl(badge.id, referralCode);

  const message = [
    `${emoji} Just unlocked "${badge.title}" on Vocolens! ${rarity}`,
    '',
    line,
    '',
    '📲 Try Vocolens — your AI voice journal:',
    shareUrl,
  ].join('\n');

  try {
    await Share.share(
      {
        message,
        url: shareUrl,   // iOS uses this for link previews; Android uses message
        title: `I unlocked "${badge.title}" on Vocolens!`,
      },
      {
        dialogTitle: `Share your milestone`,
      }
    );
  } catch {
    // User cancelled or share failed — no-op
  }
}
