/**
 * Notification Service
 *
 * Handles local notification scheduling, permissions, and management
 * for daily journaling reminders based on user's selected time and timezone.
 *
 * Expo Go compatibility note:
 *   Remote push notifications (device token registration) were removed from
 *   Expo Go in SDK 53. This service uses LOCAL scheduled notifications only,
 *   which still work in Expo Go. The key fix is:
 *     - No top-level import of expo-notifications (that causes
 *       DevicePushTokenAutoRegistration.fx.js to side-load and crash)
 *     - expo-notifications is required lazily inside each method via a
 *       getNotifications() helper, wrapped in try/catch
 *     - setNotificationHandler is called lazily (ensureHandlerConfigured),
 *       never at module evaluation time
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useJournalStore from '@/lib/state/journal-store';

// Storage key for tracking last sent message
const LAST_MESSAGE_INDEX_KEY = 'notification_last_message_index';
// Separate rotation memory for the "no entries yet" pool below, so the two
// pools rotate independently and don't share (or skip) each other's history.
const EMPTY_STATE_LAST_MESSAGE_INDEX_KEY = 'notification_empty_state_last_message_index';

// expo-notifications weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
const DAY_TO_WEEKDAY: Record<string, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

/**
 * Rotating daily notification messages
 */
export interface NotificationMessage {
  title: string;
  body: string;
}

export const NOTIFICATION_MESSAGES: NotificationMessage[] = [
  {
    title: '🎙️ 60 seconds. That\'s it.',
    body: 'No typing, no overthinking — just talk.',
  },
  {
    title: '🪞 Name it to tame it',
    body: 'Speak what you\'re feeling — Vocolens helps make sense of the rest.',
  },
  {
    title: '🌊 Overwhelm builds quietly',
    body: 'Catch it early. Talk it out with Vocolens.',
  },
  {
    title: '💭 Something on your mind?',
    body: 'A quick voice note can untangle more than you\'d expect.',
  },
  {
    title: '✨ Your journal\'s ready',
    body: 'Whenever you are. No pressure, no prep.',
  },
  {
    title: '🔍 What\'s underneath today?',
    body: 'Speak it out loud and see what Vocolens notices.',
  },
  {
    title: '🌿 A moment for yourself',
    body: 'Just a minute of talking can shift your whole day.',
  },
  {
    title: '🔥 You\'ve kept your streak going',
    body: 'That\'s real. Keep it up with today\'s check-in.',
  },
  {
    title: '📈 Consistency is the insight',
    body: 'Your streak is showing you patterns. Keep going.',
  },
  {
    title: '👋 Quick check-in',
    body: 'How\'s today actually going? Say it out loud.',
  },
];

/**
 * Rotating messages shown ONLY to users who have never saved a journal
 * entry yet (see hasNoJournalEntries below). Once someone has recorded at
 * least one entry, these are never selected again — scheduleWeeklyNotifications
 * automatically switches them over to the regular NOTIFICATION_MESSAGES pool
 * the next time reminders are (re)scheduled.
 *
 * Tone is deliberately more encouraging/activating than the regular pool —
 * the goal here is to get someone who is curious but hasn't tried the app yet
 * to record their very first entry, not to sustain an existing habit.
 */
export const EMPTY_STATE_NOTIFICATION_MESSAGES: NotificationMessage[] = [
  {
    title: '🎙️ First entry: 60 seconds',
    body: 'No typing, no blank page — just talk.',
  },
  {
    title: '✨ Ready anytime',
    body: 'Nothing recorded yet. Say what\'s on your mind.',
  },
  {
    title: '🌱 Start today',
    body: 'One voice note shows what Vocolens can do.',
  },
  {
    title: '💜 Waiting to hear from you',
    body: 'Tap the mic — your first insight awaits.',
  },
];

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

// ── Lazy require helper ───────────────────────────────────────────────────────
// Importing expo-notifications at module top level causes the side-effect file
// DevicePushTokenAutoRegistration.fx.js to load, which calls addPushTokenListener
// and throws "Android Push notifications removed from Expo Go" in SDK 53+.
// We lazily require only the specific sub-modules we need (permissions, scheduling)
// and catch any errors that occur during require or usage.
let _notificationsModule: typeof import('expo-notifications') | null | undefined = undefined;

function getNotifications(): typeof import('expo-notifications') | null {
  if (_notificationsModule !== undefined) return _notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications');
    _notificationsModule = mod;
    return mod;
  } catch (e) {
    console.warn('[NotificationService] expo-notifications not available in this environment:', (e as Error)?.message);
    _notificationsModule = null;
    return null;
  }
}

// ── One-time handler setup ────────────────────────────────────────────────────
let handlerConfigured = false;
function ensureHandlerConfigured(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  const N = getNotifications();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Silently ignore if the environment doesn't support it
  }
}

const DENIED: NotificationPermissionStatus = {
  granted: false,
  canAskAgain: false,
  status: 'denied',
};

// ── Personalization ───────────────────────────────────────────────────────────
// Reads the first name the user gave during onboarding (NameCollectionScreen)
// so notification titles can address them directly. Falls back to null (no
// personalization) for users who skipped/haven't reached that step, or if the
// store read fails for any reason — the generic title is always a safe result.
function getUserFirstName(): string | null {
  try {
    const userName = useOnboardingStore.getState().userName;
    if (!userName) return null;
    // Mirrors the "first word only" convention used for the Insights greeting
    // (see app/(tabs)/insights.tsx) — a user who typed a full name still gets
    // addressed by just their first name.
    const first = userName.trim().split(/\s+/)[0];
    return first || null;
  } catch {
    return null;
  }
}

// Inserts ", {name}" as a vocative directly before any trailing punctuation,
// so the result reads as grammatically correct regardless of whether the
// base title is a statement ("Your journal's ready." -> "Your journal's
// ready, Kasra."), a question ("Something on your mind?" -> "Something on
// your mind, Kasra?"), or has no terminal punctuation at all ("Quick
// check-in" -> "Quick check-in, Kasra"). Returns the title unchanged if no
// name is available.
function personalizeTitle(title: string, name: string | null): string {
  if (!name) return title;
  const trailingPunctuation = title.match(/([.!?]+)\s*$/);
  if (trailingPunctuation) {
    const punctuation = trailingPunctuation[1];
    const base = title.slice(0, title.length - punctuation.length).replace(/\s+$/, '');
    return `${base}, ${name}${punctuation}`;
  }
  return `${title}, ${name}`;
}

// ── "No entries yet" detection ────────────────────────────────────────────────
// Reads the journal store directly (same pattern as getUserFirstName above) so
// this plain service class never needs a React hook to know whether the user
// has ever saved a voice journal entry.
function hasNoJournalEntries(): boolean {
  try {
    return useJournalStore.getState().entries.length === 0;
  } catch {
    // If the store can't be read for any reason, default to the regular
    // (non-empty-state) pool rather than risk nudging an existing journaller
    // with "you haven't started yet" copy.
    return false;
  }
}

export class NotificationService {
  // ── Message rotation ──────────────────────────────────────────────────────

  static async getLastMessageIndex(): Promise<number | null> {
    try {
      const v = await AsyncStorage.getItem(LAST_MESSAGE_INDEX_KEY);
      return v !== null ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  }

  static async setLastMessageIndex(index: number): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_MESSAGE_INDEX_KEY, index.toString());
    } catch {
      // ignore storage errors
    }
  }

  static async getNextMessageIndex(): Promise<number> {
    const last = await this.getLastMessageIndex();
    const total = NOTIFICATION_MESSAGES.length;
    if (last === null) return Math.floor(Math.random() * total);
    let next: number;
    do {
      next = Math.floor(Math.random() * total);
    } while (next === last && total > 1);
    return next;
  }

  static async getNextMessage(): Promise<NotificationMessage> {
    const index = await this.getNextMessageIndex();
    await this.setLastMessageIndex(index);
    return NOTIFICATION_MESSAGES[index];
  }

  static getAllMessages(): NotificationMessage[] {
    return NOTIFICATION_MESSAGES;
  }

  static getMessageCount(): number {
    return NOTIFICATION_MESSAGES.length;
  }

  // ── "No entries yet" message rotation ─────────────────────────────────────
  // Independent rotation state (its own AsyncStorage key, its own "last shown"
  // memory) so this pool doesn't consume or skip slots in the regular pool's
  // rotation — a user could go back and forth between having 0 and >0 entries
  // (e.g. after "Delete all entries") and each pool should resume its own
  // sequence exactly where it left off.

  static async getEmptyStateLastMessageIndex(): Promise<number | null> {
    try {
      const v = await AsyncStorage.getItem(EMPTY_STATE_LAST_MESSAGE_INDEX_KEY);
      return v !== null ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  }

  static async setEmptyStateLastMessageIndex(index: number): Promise<void> {
    try {
      await AsyncStorage.setItem(EMPTY_STATE_LAST_MESSAGE_INDEX_KEY, index.toString());
    } catch {
      // ignore storage errors
    }
  }

  static async getNextEmptyStateMessage(): Promise<NotificationMessage> {
    const total = EMPTY_STATE_NOTIFICATION_MESSAGES.length;
    const last = await this.getEmptyStateLastMessageIndex();
    let next: number;
    if (last === null) {
      next = Math.floor(Math.random() * total);
    } else {
      do {
        next = Math.floor(Math.random() * total);
      } while (next === last && total > 1);
    }
    await this.setEmptyStateLastMessageIndex(next);
    return EMPTY_STATE_NOTIFICATION_MESSAGES[next];
  }

  static getAllEmptyStateMessages(): NotificationMessage[] {
    return EMPTY_STATE_NOTIFICATION_MESSAGES;
  }

  /**
   * Picks the next message from whichever pool matches the user's current
   * journal state — the encouragement pool if they have never saved an entry,
   * otherwise the regular rotating pool. This is the single place scheduling
   * code should call instead of getNextMessage()/getNextEmptyStateMessage()
   * directly, so the "which pool" decision only lives in one spot.
   */
  static async getNextScheduledMessage(): Promise<NotificationMessage> {
    return hasNoJournalEntries() ? this.getNextEmptyStateMessage() : this.getNextMessage();
  }

  // ── Permissions ───────────────────────────────────────────────────────────

  static async requestPermissions(): Promise<NotificationPermissionStatus> {
    const N = getNotifications();
    if (!N) return DENIED;

    try {
      const { status: existing } = await N.getPermissionsAsync();
      let final = existing;

      if (existing !== 'granted') {
        const { status } = await N.requestPermissionsAsync();
        final = status;
      }

      await this.ensureAndroidChannel();

      return {
        granted: final === 'granted',
        canAskAgain: existing === 'undetermined',
        status: final as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('[NotificationService] requestPermissions error:', error);
      return DENIED;
    }
  }

  static async checkPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const N = getNotifications();
      if (!N) return DENIED;

      const { status } = await N.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: status === 'undetermined',
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (e) {
      console.warn('[NotificationService] checkPermissions failed (likely Expo Go):', (e as Error)?.message);
      return DENIED;
    }
  }

  // ── Android channel ─────────────────────────────────────────────────────
  // Idempotent — safe to call repeatedly (setNotificationChannelAsync just
  // updates an existing channel). Extracted so EVERY scheduling path ensures
  // the channel exists, not only requestPermissions(): on Android 8+ a
  // scheduled notification whose channelId has no matching channel is
  // silently dropped, and paths like AuthGate.rescheduleFromPreferences and
  // the settings time-change re-schedule don't call requestPermissions first.
  static async ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    const N = getNotifications();
    if (!N) return;
    try {
      await N.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Journaling Reminders',
        importance: N.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#9370DB',
      });
    } catch {
      // Channel setup is not critical — keep going
    }
  }

  // ── Scheduling ────────────────────────────────────────────────────────────

  static async scheduleWeeklyNotifications(
    time: string,
    days: string[],
  ): Promise<string[]> {
    const N = getNotifications();
    if (!N) return [];

    try {
      const { granted } = await this.checkPermissions();
      if (!granted) return [];

      const [hours, minutes] = time.split(':').map(Number);
      if (
        isNaN(hours) || isNaN(minutes) ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59
      ) {
        console.error('[NotificationService] Invalid time format:', time);
        return [];
      }

      ensureHandlerConfigured();
      // Guarantee the Android channel exists before scheduling against it.
      await this.ensureAndroidChannel();
      await this.cancelAllNotifications();

      if (days.length === 0) return [];

      const identifiers: string[] = [];

      for (const day of days) {
        const weekday = DAY_TO_WEEKDAY[day.toLowerCase()];
        if (!weekday) continue;

        // Each iteration re-reads the journal state — a week's worth of
        // reminders is only scheduled once per call (see cancelAllNotifications
        // above), so if the user records their first entry between now and a
        // future reschedule, the empty-state pool naturally stops being chosen
        // the next time this runs (see AuthGate / journal-service triggers).
        const isEmptyState = hasNoJournalEntries();
        const message = isEmptyState
          ? await this.getNextEmptyStateMessage()
          : await this.getNextMessage();
        const personalizedTitle = personalizeTitle(message.title, getUserFirstName());

        const id = await N.scheduleNotificationAsync({
          content: {
            title: personalizedTitle,
            body: message.body,
            sound: 'default',
            priority: N.AndroidNotificationPriority.HIGH,
            data: {
              type: 'daily-reminder',
              day,
              messageIndex: isEmptyState
                ? await this.getEmptyStateLastMessageIndex()
                : await this.getLastMessageIndex(),
              pool: isEmptyState ? 'empty-state' : 'regular',
            },
          },
          trigger: {
            // Modern expo-notifications (SDK 52+) trigger shape. The old
            // `{ weekday, hour, minute, repeats: true }` object is no longer
            // honored — scheduleNotificationAsync still returned an id (so it
            // looked scheduled and logged success), but the OS never
            // registered a repeating alarm, so the notification silently
            // never fired. `type: WEEKLY` is the current recurring-weekly form.
            type: (N as any).SchedulableTriggerInputTypes?.WEEKLY ?? 'weekly',
            weekday,
            hour: hours,
            minute: minutes,
            // channelId MUST be set here on Android. The channel is created in
            // requestPermissions() AND ensureAndroidChannel() below, but a
            // scheduled notification that doesn't reference a valid channel is
            // silently dropped on Android 8+ (API 26+).
            channelId: 'daily-reminders',
          } as any,
        });

        identifiers.push(id);
      }

      console.log(
        `[NotificationService] Scheduled ${identifiers.length} notifications (${days.join(', ')} at ${time})`,
      );
      return identifiers;
    } catch (error) {
      console.error('[NotificationService] scheduleWeeklyNotifications error:', error);
      return [];
    }
  }

  static async scheduleDailyNotification(time: string): Promise<string | null> {
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const ids = await this.scheduleWeeklyNotifications(time, allDays);
    return ids.length > 0 ? ids[0] : null;
  }

  static async rescheduleWithNewMessage(time: string): Promise<string | null> {
    return this.scheduleDailyNotification(time);
  }

  static async cancelAllNotifications(): Promise<void> {
    const N = getNotifications();
    if (!N) return;
    try {
      await N.cancelAllScheduledNotificationsAsync();
    } catch {
      // ignore
    }
  }

  static async getScheduledNotifications(): Promise<any[]> {
    const N = getNotifications();
    if (!N) return [];
    try {
      return await N.getAllScheduledNotificationsAsync();
    } catch {
      return [];
    }
  }

  static async sendTestNotification(): Promise<void> {
    const N = getNotifications();
    if (!N) return;

    try {
      const { granted } = await this.checkPermissions();
      if (!granted) return;

      ensureHandlerConfigured();
      const message = await this.getNextScheduledMessage();

      await N.scheduleNotificationAsync({
        content: {
          title: personalizeTitle(message.title, getUserFirstName()),
          body: message.body,
          sound: 'default',
          data: { type: 'test-notification' },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('[NotificationService] sendTestNotification error:', error);
    }
  }

  /**
   * Schedule the SINGLE trial-conversion reminder — fires 24 hours before
   * the 3-day yearly-plan trial converts to a paid subscription.
   *
   * This is intentionally the only trial-related notification. A second
   * "few hours before" reminder was removed: one clearly-timed notice with
   * the exact charge amount and date is transparent; a second one landing
   * right before the charge reads as pressure rather than a helpful
   * reminder, and adds refund/complaint risk without real benefit.
   *
   * `expirationDate` should be the REAL trial-expiry timestamp from Adapty
   * (the purchased product's access level `expiresAt`, as an ISO string —
   * see PaywallScreen.tsx's grantAccess, which threads this through from
   * the Adapty purchase result). If it's null/invalid, falls back to an
   * estimate of 2 days from now, which only matches reality if the trial
   * started at the exact moment this method is called.
   *
   * `yearlyPrice` should be the localized price string shown on the
   * paywall (e.g. "$79.99") — included in the notification body so the
   * user sees the exact charge amount and date upfront rather than a vague
   * "ends soon". Falls back to a price-less phrasing if omitted.
   */
  static async scheduleTrialDay2Reminder(
    expirationDate?: string | null,
    yearlyPrice?: string | null,
  ): Promise<string | null> {
    const N = getNotifications();
    if (!N) return null;

    try {
      const { granted } = await this.checkPermissions();
      if (!granted) return null;

      let triggerDate: Date;
      let chargeDate: Date;

      if (expirationDate) {
        const expiry = new Date(expirationDate);
        if (isNaN(expiry.getTime())) {
          triggerDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // fallback: 2 days from now
          chargeDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        } else {
          // 1 day (24h) before expiry
          triggerDate = new Date(expiry.getTime() - 1 * 24 * 60 * 60 * 1000);
          chargeDate = expiry;
        }
      } else {
        // No expiration date — assume 3-day trial started now, fire at Day 2
        triggerDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        chargeDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      }

      // Don't schedule if trigger is in the past
      if (triggerDate.getTime() <= Date.now()) return null;

      ensureHandlerConfigured();

      const formattedChargeDate = chargeDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const body = yearlyPrice
        ? `You'll be charged ${yearlyPrice} for your yearly plan on ${formattedChargeDate} unless you cancel. Keep checking in with Vocolens, or manage your subscription anytime in Settings.`
        : `Your yearly plan starts on ${formattedChargeDate} unless you cancel. Keep checking in with Vocolens, or manage your subscription anytime in Settings.`;

      const id = await N.scheduleNotificationAsync({
        content: {
          title: personalizeTitle('🎙️ Your trial ends tomorrow', getUserFirstName()),
          body,
          sound: 'default',
          data: { type: 'trial-day2-reminder' },
        },
        trigger: {
          type: (N as any).SchedulableTriggerInputTypes?.DATE ?? 'date',
          date: triggerDate,
        },
      });

      console.log(
        `[NotificationService] Scheduled trial-conversion reminder for ${triggerDate.toISOString()} (id: ${id})`,
      );
      return id;
    } catch (error) {
      console.error('[NotificationService] scheduleTrialDay2Reminder error:', error);
      return null;
    }
  }

  static async rescheduleFromPreferences(
    time: string | null,
    days: string[],
    hasSubscription: boolean,
  ): Promise<void> {
    if (!hasSubscription || !time || days.length === 0) return;

    const { granted } = await this.checkPermissions();
    if (!granted) return;

    const scheduled = await this.getScheduledNotifications();
    const hasDailyReminder = scheduled.some(
      (n) => (n.content?.data as any)?.type === 'daily-reminder',
    );
    if (hasDailyReminder) return;

    await this.scheduleWeeklyNotifications(time, days);
  }

  /**
   * Call once, right after the user's very first journal entry is saved.
   *
   * Notification content is baked in at schedule time, so if daily reminders
   * were already queued while the user had zero entries, the OS still holds
   * a week's worth of "no entries yet" copy in its notification queue even
   * though that's no longer true the instant the first entry is saved.
   *
   * This forces a fresh scheduleWeeklyNotifications() pass from the user's
   * stored time/days — which internally re-checks hasNoJournalEntries() per
   * day — so every reminder from this point on is drawn from the regular
   * rotating pool instead. Safe/no-op if reminders were never enabled, and
   * harmless if called when the entry wasn't actually the first one (it just
   * reschedules with what would already be the regular pool).
   */
  static async refreshAfterFirstEntry(): Promise<void> {
    try {
      const prefs = useOnboardingStore.getState().notificationPreferences;
      if (!prefs?.time || !prefs.days || prefs.days.length === 0) return;

      const { granted } = await this.checkPermissions();
      if (!granted) return;

      await this.scheduleWeeklyNotifications(prefs.time, prefs.days);
    } catch (error) {
      console.warn(
        '[NotificationService] refreshAfterFirstEntry error:',
        (error as Error)?.message,
      );
    }
  }

  // ── Formatting helpers ────────────────────────────────────────────────────

  static formatTime(time: string, use24Hour = false): string {
    const [hours, minutes] = time.split(':').map(Number);
    if (use24Hour) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  static getTimeString(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  static getLocalTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
