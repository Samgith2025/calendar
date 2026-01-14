import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSettings } from '@/types';
import { isWeekendDay, getCurrentDateET } from './date';

const NOTIFICATION_TAG = 'trading-reminder';

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

// Cancel all scheduled reminder notifications
export async function cancelAllReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduled) {
    if (notification.identifier.startsWith(NOTIFICATION_TAG)) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  // Clear badge when canceling reminders
  await Notifications.setBadgeCountAsync(0);
}

// Parse time string "HH:mm" to hours and minutes
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

// Schedule persistent reminders for today
export async function scheduleReminders(
  settings: NotificationSettings,
  isTodayLogComplete: boolean
): Promise<number> {
  // Cancel any existing reminders first
  await cancelAllReminders();

  // Don't schedule if:
  // - Notifications disabled
  // - Today's log is already complete
  // - Today is a weekend (no trading)
  if (!settings.enabled || isTodayLogComplete) {
    return 0;
  }

  const now = getCurrentDateET();

  if (isWeekendDay(now)) {
    return 0;
  }

  // Check permissions
  const hasPermission = await hasNotificationPermissions();
  if (!hasPermission) {
    return 0;
  }

  const { hours: startHour, minutes: startMin } = parseTime(settings.startTime);
  const { hours: endHour, minutes: endMin } = parseTime(settings.endTime);

  // Create start and end Date objects for today
  const startDate = new Date(now);
  startDate.setHours(startHour, startMin, 0, 0);

  const endDate = new Date(now);
  endDate.setHours(endHour, endMin, 0, 0);

  // If we're past end time, don't schedule
  if (now >= endDate) {
    return 0;
  }

  // Start from now or startTime, whichever is later
  let nextNotification: Date;
  if (now > startDate) {
    // Round up to next interval boundary
    nextNotification = new Date(now);
    const minutes = nextNotification.getMinutes();
    const roundedMinutes = Math.ceil(minutes / settings.interval) * settings.interval;
    nextNotification.setMinutes(roundedMinutes, 0, 0);

    // If rounding pushed us to next hour, handle that
    if (roundedMinutes >= 60) {
      nextNotification.setHours(nextNotification.getHours() + Math.floor(roundedMinutes / 60));
      nextNotification.setMinutes(roundedMinutes % 60);
    }
  } else {
    nextNotification = new Date(startDate);
  }

  // Schedule notifications until end time (max 50 to stay well under iOS limit)
  let count = 0;
  const maxNotifications = 50;
  const notifications: Promise<string>[] = [];

  while (nextNotification < endDate && count < maxNotifications) {
    const secondsUntil = Math.max(1, Math.floor((nextNotification.getTime() - now.getTime()) / 1000));

    // Only schedule if in the future
    if (secondsUntil > 0) {
      const notification = Notifications.scheduleNotificationAsync({
        identifier: `${NOTIFICATION_TAG}-${count}`,
        content: {
          title: 'Trading Rules Check',
          body: "Did you follow your trading rules today? Don't forget to log!",
          sound: true,
          badge: 1,
          ...(Platform.OS === 'android' && { channelId: 'reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
        },
      });
      notifications.push(notification);
      count++;
    }

    // Move to next interval
    nextNotification = new Date(nextNotification.getTime() + settings.interval * 60 * 1000);
  }

  // Wait for all to be scheduled
  await Promise.all(notifications);

  return count;
}

// Get count of currently scheduled reminders
export async function getScheduledReminderCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((n) => n.identifier.startsWith(NOTIFICATION_TAG)).length;
}
