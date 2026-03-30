import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSettings } from '@/types';
import { getCurrentDateET, formatDate } from '@/utils/date';

const NOTIFICATION_ID_BASE = 'trading-reminder-base';
const NOTIFICATION_ID_FOLLOWUP_PREFIX = 'trading-reminder-followup';
// iOS allows 64 total pending; 5 base (one per weekday Mon-Fri) + up to 58 follow-ups + 1 buffer
const MAX_FOLLOWUP_SLOTS = 58;
const QUIET_HOUR_END = 22; // Don't schedule past 10 PM
const MAX_DAYS_AHEAD = 14; // Calendar days to look ahead when pre-scheduling follow-ups
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

// Cancel only today's follow-up reminders — called when today's log is submitted.
// Future days' follow-ups remain queued in the OS so they fire without the app opening.
export async function cancelFollowUpReminders(todayStr: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.identifier.startsWith(`${NOTIFICATION_ID_FOLLOWUP_PREFIX}-${todayStr}-`)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.warn('[Notifications] Failed to cancel follow-ups:', error);
  }
}

// Schedule reminders for today and upcoming weekdays.
// Base notification: 5 WEEKLY triggers (Mon-Fri), permanent, fire every week at startTime.
// Follow-ups: one-time DATE triggers pre-scheduled across the next several weekdays so
// they fire without the app needing to open. Completing today's log cancels only that
// day's follow-ups — future days remain untouched in the OS queue.
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

  // Build the list of follow-up time slots within a day
  const endTotalMinutes = endHour * 60 + endMin;
  const cutoffMinutes = Math.min(endTotalMinutes, QUIET_HOUR_END * 60);

  const followupSlots: { hour: number; minute: number; index: number }[] = [];
  let slotMinutes = startHour * 60 + startMin + settings.interval;
  let slotIndex = 1;
  while (slotMinutes < cutoffMinutes) {
    followupSlots.push({
      hour: Math.floor(slotMinutes / 60) % 24,
      minute: slotMinutes % 60,
      index: slotIndex,
    });
    slotMinutes += settings.interval;
    slotIndex++;
  }

  if (followupSlots.length === 0) return WEEKDAYS.length;

  // Pre-schedule follow-ups for today and upcoming weekdays up to the slot limit.
  // Identifiers include the date (e.g. followup-2026-03-30-1) so per-day cancellation works.
  const now = getCurrentDateET();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = formatDate(now);
  const promises: Promise<string>[] = [];

  for (let dayOffset = 0; dayOffset < MAX_DAYS_AHEAD && promises.length < MAX_FOLLOWUP_SLOTS; dayOffset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) continue;

    const dateStr = formatDate(date);
    const isToday = dateStr === todayStr;

    // Skip today entirely if log is already complete
    if (isToday && isTodayLogComplete) continue;

    for (const { hour, minute, index } of followupSlots) {
      if (promises.length >= MAX_FOLLOWUP_SLOTS) break;

      // For today, skip times already in the past
      if (isToday && hour * 60 + minute <= nowMinutes) continue;

      const fireDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0);

      promises.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${NOTIFICATION_ID_FOLLOWUP_PREFIX}-${dateStr}-${index}`,
          content: {
            title: 'Trading Rules Check',
            body: "Did you follow your trading rules today? Don't forget to log!",
            sound: true,
            badge: 1,
            data: { type: 'daily_reminder', scope: 'follow_up', date: dateStr, index },
            ...(Platform.OS === 'android' && { channelId: 'reminders' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
          },
        })
      );
    }
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
