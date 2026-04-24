/**
 * Notification Service
 *
 * Handles push notification scheduling, permissions, and management
 * for daily journaling reminders based on user's selected time and timezone.
 * Features rotating daily messages that don't repeat on consecutive days.
 * Supports per-day-of-week scheduling with automatic local timezone detection.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for tracking last sent message
const LAST_MESSAGE_INDEX_KEY = 'notification_last_message_index';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Rotating daily notification messages
 * Each message has a headline (title) and subheadline (body)
 */
export interface NotificationMessage {
  title: string;
  body: string;
}

export const NOTIFICATION_MESSAGES: NotificationMessage[] = [
  {
    title: 'What stood out to you today?',
    body: 'A quick voice note helps you remember what matters.',
  },
  {
    title: 'What made you smile today?',
    body: 'Capture the good moments before they slip away.',
  },
  {
    title: "Ready for today's reflection?",
    body: "You're building something meaningful, one day at a time.",
  },
  {
    title: 'Got a minute to yourself?',
    body: 'Your thoughts today are worth saving.',
  },
  {
    title: 'Take a breath and reflect',
    body: 'Even 60 seconds of journaling can shift your whole day.',
  },
];

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

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

export class NotificationService {
  /**
   * Get the last used message index from storage
   */
  static async getLastMessageIndex(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(LAST_MESSAGE_INDEX_KEY);
      return value !== null ? parseInt(value, 10) : null;
    } catch (error) {
      console.error('Error getting last message index:', error);
      return null;
    }
  }

  /**
   * Save the last used message index to storage
   */
  static async setLastMessageIndex(index: number): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_MESSAGE_INDEX_KEY, index.toString());
    } catch (error) {
      console.error('Error saving last message index:', error);
    }
  }

  /**
   * Get a random message index that's different from the last one used
   * Ensures no consecutive repeats
   */
  static async getNextMessageIndex(): Promise<number> {
    const lastIndex = await this.getLastMessageIndex();
    const totalMessages = NOTIFICATION_MESSAGES.length;

    if (lastIndex === null) {
      return Math.floor(Math.random() * totalMessages);
    }

    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * totalMessages);
    } while (newIndex === lastIndex && totalMessages > 1);

    return newIndex;
  }

  /**
   * Get the next notification message (rotated, no consecutive repeats)
   */
  static async getNextMessage(): Promise<NotificationMessage> {
    const index = await this.getNextMessageIndex();
    await this.setLastMessageIndex(index);
    return NOTIFICATION_MESSAGES[index];
  }

  /**
   * Request notification permissions from the user
   */
  static async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-reminders', {
          name: 'Daily Journaling Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#9370DB',
        });
      }

      return {
        granted: finalStatus === 'granted',
        canAskAgain: existingStatus === 'undetermined',
        status: finalStatus as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Check current notification permission status
   */
  static async checkPermissions(): Promise<NotificationPermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: status === 'undetermined',
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Schedule weekly notifications for specific days at a specific local time.
   * Uses the device's local timezone automatically (expo-notifications fires
   * at the wall-clock time the user picked, honoring their local TZ).
   *
   * @param time - Time string in "HH:MM" format (24-hour, local time)
   * @param days - Array of day names e.g. ['monday', 'wednesday', 'friday']
   */
  static async scheduleWeeklyNotifications(time: string, days: string[]): Promise<string[]> {
    try {
      const { granted } = await this.checkPermissions();
      if (!granted) {
        console.warn('Notification permissions not granted');
        return [];
      }

      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('Invalid time format:', time);
        return [];
      }

      // Cancel existing notifications before rescheduling
      await this.cancelAllNotifications();

      if (days.length === 0) {
        return [];
      }

      const identifiers: string[] = [];

      for (const day of days) {
        const weekday = DAY_TO_WEEKDAY[day.toLowerCase()];
        if (!weekday) continue;

        const message = await this.getNextMessage();

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: message.body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
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
          } as Notifications.NotificationTriggerInput,
        });

        identifiers.push(identifier);
        console.log(`Scheduled notification for ${day} at ${time} (ID: ${identifier})`);
      }

      return identifiers;
    } catch (error) {
      console.error('Error scheduling weekly notifications:', error);
      return [];
    }
  }

  /**
   * Schedule daily notification at a specific time with rotating messages.
   * Kept for backward compatibility — schedules every day.
   */
  static async scheduleDailyNotification(time: string): Promise<string | null> {
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const ids = await this.scheduleWeeklyNotifications(time, allDays);
    return ids.length > 0 ? ids[0] : null;
  }

  /**
   * Reschedule notification with a new rotating message
   */
  static async rescheduleWithNewMessage(time: string): Promise<string | null> {
    return this.scheduleDailyNotification(time);
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Format notification time for display
   * Converts "HH:MM" to user-friendly format based on 12h/24h preference
   */
  static formatTime(time: string, use24Hour: boolean = false): string {
    const [hours, minutes] = time.split(':').map(Number);

    if (use24Hour) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Get time string from Date object in "HH:MM" format (local time)
   */
  static getTimeString(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get the device's local timezone name (e.g. "America/New_York")
   */
  static getLocalTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Test notification — sends immediately with a random rotating message
   */
  static async sendTestNotification(): Promise<void> {
    try {
      const { granted } = await this.checkPermissions();
      if (!granted) {
        console.warn('Cannot send test notification: permissions not granted');
        return;
      }

      const message = await this.getNextMessage();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          sound: 'default',
          data: { type: 'test-notification' },
        },
        trigger: null,
      });

      console.log(`Test notification sent with message: "${message.title}"`);
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  static getAllMessages(): NotificationMessage[] {
    return NOTIFICATION_MESSAGES;
  }

  static getMessageCount(): number {
    return NOTIFICATION_MESSAGES.length;
  }

  /**
   * Schedule a one-shot "trial ending soon" notification timed to the actual
   * RevenueCat trial expiration date minus a 4-hour buffer.
   *
   * @param rcExpirationDate - The exact `expirationDate` string from RevenueCat's
   *   EntitlementInfo (e.g. `customerInfo.entitlements.active['premium'].expirationDate`).
   *   When provided the reminder fires 4 hours before the real expiry so the user
   *   has time to act before billing starts.
   *   When null/undefined (RC not enabled, or lifetime entitlement) the reminder
   *   falls back to 68 hours from now — matching the 3-day trial minus 4 hours.
   */
  static async scheduleTrialEndReminder(rcExpirationDate?: string | null): Promise<string | null> {
    try {
      // Always confirm permission before scheduling
      const { granted } = await this.checkPermissions();
      if (!granted) {
        console.log('Trial-end reminder skipped: notification permissions not granted');
        return null;
      }

      let triggerDate: Date;

      if (rcExpirationDate) {
        const expiry = new Date(rcExpirationDate);
        // Guard against invalid dates returned by the SDK
        if (isNaN(expiry.getTime())) {
          console.warn('Trial-end reminder: invalid expiration date from RevenueCat, falling back to 68h');
          triggerDate = new Date(Date.now() + 68 * 60 * 60 * 1000);
        } else {
          // 4-hour buffer before the actual expiry
          triggerDate = new Date(expiry.getTime() - 4 * 60 * 60 * 1000);
        }
      } else {
        // Fallback: 68 hours from now (3-day trial − 4 hours)
        triggerDate = new Date(Date.now() + 68 * 60 * 60 * 1000);
      }

      // Don't schedule a notification that is already in the past
      if (triggerDate.getTime() <= Date.now()) {
        console.log('Trial-end reminder skipped: trigger date is in the past');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your free trial ends soon',
          body: "Your 3-day trial wraps up in a few hours. Stay subscribed to keep journaling.",
          sound: 'default',
          data: { type: 'trial-end-reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      console.log(`Trial-end reminder scheduled for ${triggerDate.toISOString()} (ID: ${identifier})`);
      return identifier;
    } catch (error) {
      console.error('Error scheduling trial-end reminder:', error);
      return null;
    }
  }

  /**
   * Re-schedule daily reminders from persisted preferences.
   * Only runs when the user has an active subscription and has granted
   * notification permissions. Safe to call on every app launch — skips
   * silently if daily reminders are already scheduled so there is no
   * redundant cancel+reschedule cycle.
   *
   * @param time           - "HH:MM" string saved in onboarding-store (null = disabled)
   * @param days           - Array of day names saved in onboarding-store ([] = disabled)
   * @param hasSubscription - Must be true (confirmed from RevenueCat) before scheduling
   */
  static async rescheduleFromPreferences(
    time: string | null,
    days: string[],
    hasSubscription: boolean,
  ): Promise<void> {
    if (!hasSubscription || !time || days.length === 0) return;

    // Confirm permission before doing any scheduling work
    const { granted } = await this.checkPermissions();
    if (!granted) {
      console.log('Daily reminders skipped: notification permissions not granted');
      return;
    }

    // Skip if daily reminders are already present in the OS scheduler
    const scheduled = await this.getScheduledNotifications();
    const hasDailyReminder = scheduled.some(
      (n) => (n.content.data as any)?.type === 'daily-reminder',
    );
    if (hasDailyReminder) return;

    // No daily reminders found — reschedule from saved preferences
    const ids = await this.scheduleWeeklyNotifications(time, days);
    console.log(`Re-scheduled ${ids.length} daily reminders from preferences (${days.join(', ')} at ${time})`);
  }
}
