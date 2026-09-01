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

// Storage key for tracking last sent message
const LAST_MESSAGE_INDEX_KEY = 'notification_last_message_index';

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

      if (Platform.OS === 'android') {
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
      await this.cancelAllNotifications();

      if (days.length === 0) return [];

      const identifiers: string[] = [];

      for (const day of days) {
        const weekday = DAY_TO_WEEKDAY[day.toLowerCase()];
        if (!weekday) continue;

        const message = await this.getNextMessage();

        const id = await N.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: message.body,
            sound: 'default',
            priority: N.AndroidNotificationPriority.HIGH,
            data: {
              type: 'daily-reminder',
              day,
              messageIndex: await this.getLastMessageIndex(),
            },
          },
          trigger: {
            weekday,
            hour: hours,
            minute: minutes,
            repeats: true,
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
      const message = await this.getNextMessage();

      await N.scheduleNotificationAsync({
        content: {
          title: message.title,
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
   * Schedule a "trial ends tomorrow" notification — fires on Day 2 of the
   * 3-day yearly-plan trial (i.e. 1 day before the trial converts to a paid
   * subscription).
   *
   * `expirationDate` should be the REAL trial-expiry timestamp from Adapty
   * (the purchased product's access level `expiresAt`, as an ISO string —
   * see PaywallScreen.tsx's handleCTA, which now threads this through from
   * the Adapty purchase result instead of always passing null). If it's
   * null/invalid, falls back to an estimate of 2 days from now, which only
   * matches reality if the trial started at the exact moment this method
   * is called.
   */
  static async scheduleTrialDay2Reminder(
    expirationDate?: string | null,
  ): Promise<string | null> {
    const N = getNotifications();
    if (!N) return null;

    try {
      const { granted } = await this.checkPermissions();
      if (!granted) return null;

      let triggerDate: Date;

      if (expirationDate) {
        const expiry = new Date(expirationDate);
        // 1 day before expiry
        triggerDate = isNaN(expiry.getTime())
          ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // fallback: 2 days from now
          : new Date(expiry.getTime() - 1 * 24 * 60 * 60 * 1000);
      } else {
        // No expiration date — assume 3-day trial started now, fire at Day 2
        triggerDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      }

      // Don't schedule if trigger is in the past
      if (triggerDate.getTime() <= Date.now()) return null;

      ensureHandlerConfigured();

      const id = await N.scheduleNotificationAsync({
        content: {
          title: '🎙️ One day left on your free trial',
          body: "You've already started building a clearer picture of how you feel. Keep it going — your trial wraps up tomorrow.",
          sound: 'default',
          data: { type: 'trial-day2-reminder' },
        },
        trigger: {
          type: (N as any).SchedulableTriggerInputTypes?.DATE ?? 'date',
          date: triggerDate,
        },
      });

      console.log(
        `[NotificationService] Scheduled Day 2 trial reminder for ${triggerDate.toISOString()} (id: ${id})`,
      );
      return id;
    } catch (error) {
      console.error('[NotificationService] scheduleTrialDay2Reminder error:', error);
      return null;
    }
  }

  /**
   * Schedule a "trial ending in a few hours" notification, timed 4 hours
   * before the trial converts to a paid subscription.
   *
   * `rcExpirationDate` should be the REAL trial-expiry timestamp from
   * Adapty (see scheduleTrialDay2Reminder's doc comment above — same
   * wiring applies here).
   */
  static async scheduleTrialEndReminder(
    rcExpirationDate?: string | null,
  ): Promise<string | null> {
    const N = getNotifications();
    if (!N) return null;

    try {
      const { granted } = await this.checkPermissions();
      if (!granted) return null;

      let triggerDate: Date;

      if (rcExpirationDate) {
        const expiry = new Date(rcExpirationDate);
        triggerDate = isNaN(expiry.getTime())
          ? new Date(Date.now() + 68 * 60 * 60 * 1000)
          : new Date(expiry.getTime() - 4 * 60 * 60 * 1000);
      } else {
        triggerDate = new Date(Date.now() + 68 * 60 * 60 * 1000);
      }

      if (triggerDate.getTime() <= Date.now()) return null;

      ensureHandlerConfigured();

      const id = await N.scheduleNotificationAsync({
        content: {
          title: '⏳ Your trial wraps up in a few hours',
          body: "Don't lose your streak or your insights — stay subscribed to keep checking in with Vocolens.",
          sound: 'default',
          data: { type: 'trial-end-reminder' },
        },
        trigger: {
          type: (N as any).SchedulableTriggerInputTypes?.DATE ?? 'date',
          date: triggerDate,
        },
      });

      return id;
    } catch (error) {
      console.error('[NotificationService] scheduleTrialEndReminder error:', error);
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
