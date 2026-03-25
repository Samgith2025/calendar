import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSettings } from '@/types';
import { getCurrentDateET } from '@/utils/date';

const NOTIFICATION_ID_BASE = 'trading-reminder-base';
const NOTIFICATION_ID_FOLLOWUP_PREFIX = 'trading-reminder-followup';
// iOS allows 64 total pending; 5 base (one per weekday Mon-Fri) + up to 58 follow-ups + 1 buffer
const MAX_FOLLOWUPS = 58;
const QUIET_HOUR_END = 22; // Don't schedule past 10 PM
// Weekday numbers used by expo-notifications (1=Sun, 2=Mon ... 6=Fri, 7=Sat)
const WEEKDAYS = [2, 3, 4, 5, 6] as const; // Mon–Fri

// Configure how notifications appear when app is in foreground
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Request notification permissions from user
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Trading Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// Check if permissions are granted
export async function hasNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// Parse time string "HH:mm" to hours and minutes
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

// Cancel all scheduled reminders (base + follow-ups) — used on settings change
export async function cancelAllReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (
        notification.identifier.startsWith(NOTIFICATION_ID_BASE) ||
        notification.identifier.startsWith(NOTIFICATION_ID_FOLLOWUP_PREFIX)
      ) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.warn('[Notifications] Failed to cancel all:', error);
  }
}

// Cancel only follow-up reminders — called when today's log is submitted
// Leaves the base notification intact so it fires again tomorrow
export async function cancelFollowUpReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.scope === 'follow_up') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.warn('[Notifications] Failed to cancel follow-ups:', error);
  }
}

// Schedule daily reminders using DAILY triggers.
// These fire at the same time every day without the app needing to be open.
// Base notification is permanent — fires every day at startTime.
// Follow-ups fire at each interval slot and are cancelled when today's log is submitted.
// When the app opens the next day, this function reschedules the follow-ups.
export async function scheduleReminders(
  settings: NotificationSettings,
  isTodayLogComplete: boolean
): Promise<number> {
  await cancelAllReminders();

  if (!settings.enabled) return 0;

  const hasPermission = await hasNotificationPermissions();
  if (!hasPermission) return 0;

  const { hours: startHour, minutes: startMin } = parseTime(settings.startTime);
  const { hours: endHour, minutes: endMin } = parseTime(settings.endTime);

  // Schedule base notification for each weekday (Mon–Fri) using WEEKLY triggers.
  // This ensures the OS never fires on Saturday or Sunday.
  await Promise.all(
    WEEKDAYS.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${NOTIFICATION_ID_BASE}-${weekday}`,
        content: {
          title: 'Trading Rules Check',
          body: 'Time to log your trading rules for today!',
          sound: true,
          badge: 1,
          data: { type: 'daily_reminder', scope: 'base', index: 0 },
          ...(Platform.OS === 'android' && { channelId: 'reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: startHour,
          minute: startMin,
        },
      })
    )
  );

  // If today's log is already complete, skip follow-ups.
  // They'll be rescheduled automatically when the app opens tomorrow.
  if (isTodayLogComplete) return WEEKDAYS.length;

  // Skip follow-ups on weekends — no trading happens, nothing to log.
  const now = getCurrentDateET();
  const todayDow = now.getDay(); // 0=Sun, 6=Sat
  if (todayDow === 0 || todayDow === 6) return WEEKDAYS.length;

  // Schedule follow-ups as one-time triggers for TODAY only.
  // This means completing the task cancels only today's — tomorrow's are set up fresh when the app opens.
  const endTotalMinutes = endHour * 60 + endMin;
  const cutoffMinutes = Math.min(endTotalMinutes, QUIET_HOUR_END * 60);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const promises: Promise<string>[] = [];
  let index = 1;
  let totalMinutes = startHour * 60 + startMin + settings.interval;

  while (totalMinutes < cutoffMinutes && index <= MAX_FOLLOWUPS) {
    // Only schedule follow-ups that are still in the future
    if (totalMinutes > nowMinutes) {
      const hour = Math.floor(totalMinutes / 60) % 24;
      const minute = totalMinutes % 60;
      const fireDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

      promises.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${NOTIFICATION_ID_FOLLOWUP_PREFIX}-${index}`,
          content: {
            title: 'Trading Rules Check',
            body: "Did you follow your trading rules today? Don't forget to log!",
            sound: true,
            badge: 1,
            data: { type: 'daily_reminder', scope: 'follow_up', index },
            ...(Platform.OS === 'android' && { channelId: 'reminders' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
          },
        })
      );
    }

    totalMinutes += settings.interval;
    index++;
  }

  await Promise.all(promises);
  return promises.length + WEEKDAYS.length;
}

// Get count of currently scheduled reminders
export async function getScheduledReminderCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(
    (n) =>
      n.identifier.startsWith(NOTIFICATION_ID_BASE) ||
      n.identifier.startsWith(NOTIFICATION_ID_FOLLOWUP_PREFIX)
  ).length;
}
