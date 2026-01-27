import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AppData, DayLog, Rule, WidgetSettings, AppTheme, NotificationSettings } from '@/types';

const STORAGE_KEYS = {
  APP_DATA: 'trading_tracker_data',
  WIDGET_SETTINGS: 'widget_settings',
  APP_THEME: 'app_theme',
  NOTIFICATION_SETTINGS: 'notification_settings',
};

const APP_GROUP = 'group.com.samson.tradingtracker';

const DEFAULT_APP_DATA: AppData = {
  rules: [],
  logs: {},
};

const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  theme: 'dark',
  accentColor: '#22c55e',
  showCompletionIndicator: true,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  startTime: '16:00',
  interval: 15,
  endTime: '23:00',
};

// Helper to sync data to App Groups for widget access (iOS only)
function syncToWidget(key: string, data: string): void {
  if (Platform.OS === 'ios') {
    try {
      const { ExtensionStorage } = require('@bacons/apple-targets');
      const storage = new ExtensionStorage(APP_GROUP);
      storage.set(key, data);
    } catch (error) {
      // Silently fail if widget sync fails - app should still work
      console.warn('Widget sync failed:', error);
    }
  }
}

export async function getAppData(): Promise<AppData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_DATA);
    if (data) {
      const parsed = JSON.parse(data);
      // Dedupe rules by ID (fix for duplicate key bug)
      if (parsed.rules && Array.isArray(parsed.rules)) {
        const originalLength = parsed.rules.length;
        const seen = new Set<string>();
        parsed.rules = parsed.rules.filter((rule: Rule) => {
          if (seen.has(rule.id)) {
            return false;
          }
          seen.add(rule.id);
          return true;
        });
        // If duplicates were removed, persist the cleaned data
        if (parsed.rules.length < originalLength) {
          await AsyncStorage.setItem(STORAGE_KEYS.APP_DATA, JSON.stringify(parsed));
        }
      }
      return parsed;
    }
    return DEFAULT_APP_DATA;
  } catch (error) {
    console.error('Error loading app data:', error);
    return DEFAULT_APP_DATA;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  try {
    const jsonData = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEYS.APP_DATA, jsonData);
    // Sync to widget
    syncToWidget(STORAGE_KEYS.APP_DATA, jsonData);
  } catch (error) {
    console.error('Error saving app data:', error);
  }
}

export async function getRules(): Promise<Rule[]> {
  const data = await getAppData();
  return data.rules;
}

export async function saveRules(rules: Rule[]): Promise<void> {
  const data = await getAppData();
  data.rules = rules;
  await saveAppData(data);
}

function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export async function addRule(text: string): Promise<Rule> {
  const data = await getAppData();
  const newRule: Rule = {
    id: generateUniqueId(),
    text,
    createdAt: new Date().toISOString(),
  };
  data.rules.push(newRule);
  await saveAppData(data);
  return newRule;
}

export async function updateRule(id: string, text: string): Promise<void> {
  const data = await getAppData();
  const rule = data.rules.find((r) => r.id === id);
  if (rule) {
    rule.text = text;
    await saveAppData(data);
  }
}

export async function deleteRule(id: string): Promise<void> {
  const data = await getAppData();
  data.rules = data.rules.filter((r) => r.id !== id);
  await saveAppData(data);
}

export async function getDayLog(date: string): Promise<DayLog | null> {
  const data = await getAppData();
  return data.logs[date] || null;
}

export async function saveDayLog(log: DayLog): Promise<void> {
  const data = await getAppData();
  data.logs[log.date] = log;
  await saveAppData(data);
}

export async function getAllLogs(): Promise<Record<string, DayLog>> {
  const data = await getAppData();
  return data.logs;
}

export async function getWidgetSettings(): Promise<WidgetSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WIDGET_SETTINGS);
    if (data) {
      return JSON.parse(data);
    }
    return DEFAULT_WIDGET_SETTINGS;
  } catch (error) {
    console.error('Error loading widget settings:', error);
    return DEFAULT_WIDGET_SETTINGS;
  }
}

export async function saveWidgetSettings(settings: WidgetSettings): Promise<void> {
  try {
    const jsonData = JSON.stringify(settings);
    await AsyncStorage.setItem(STORAGE_KEYS.WIDGET_SETTINGS, jsonData);
    // Sync to widget
    syncToWidget(STORAGE_KEYS.WIDGET_SETTINGS, jsonData);
  } catch (error) {
    console.error('Error saving widget settings:', error);
  }
}

// App theme management
export async function getAppTheme(): Promise<AppTheme> {
  try {
    const theme = await AsyncStorage.getItem(STORAGE_KEYS.APP_THEME);
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return 'system';
  } catch (error) {
    console.error('Error loading app theme:', error);
    return 'system';
  }
}

export async function saveAppTheme(theme: AppTheme): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_THEME, theme);
  } catch (error) {
    console.error('Error saving app theme:', error);
  }
}

// Force refresh widget timeline (call after data changes)
export function reloadWidget(): void {
  if (Platform.OS === 'ios') {
    try {
      const { ExtensionStorage } = require('@bacons/apple-targets');
      ExtensionStorage.reloadWidget();
    } catch (error) {
      console.warn('Widget reload failed:', error);
    }
  }
}

// DEV MODE: Generate random test data for testing
export async function generateTestData(days: number = 75): Promise<void> {
  const data = await getAppData();

  // Add sample rules if none exist
  if (data.rules.length === 0) {
    data.rules = [
      { id: 'test-1', text: 'Follow my trading plan', createdAt: new Date().toISOString() },
      { id: 'test-2', text: 'No revenge trading', createdAt: new Date().toISOString() },
      { id: 'test-3', text: 'Risk max 1% per trade', createdAt: new Date().toISOString() },
    ];
  }

  // Generate logs for past N weekdays
  const today = new Date();
  let currentDate = new Date(today);
  let daysGenerated = 0;

  while (daysGenerated < days) {
    currentDate.setDate(currentDate.getDate() - 1);

    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = currentDate.toISOString().split('T')[0];

    // Random status: ~80% green, ~20% red for realistic data
    const isGreen = Math.random() < 0.8;
    const isNoTrade = isGreen && Math.random() < 0.15; // 15% of green days are no-trade

    const ruleResults: Record<string, boolean> = {};
    if (!isNoTrade) {
      data.rules.forEach((rule) => {
        ruleResults[rule.id] = isGreen ? true : Math.random() < 0.5;
      });
    }

    data.logs[dateStr] = {
      date: dateStr,
      status: isGreen ? 'green' : 'red',
      noTradeDay: isNoTrade,
      ruleResults: isNoTrade ? undefined : ruleResults,
    };

    daysGenerated++;
  }

  await saveAppData(data);
}

// DEV MODE: Clear all logs (preserves rules)
export async function clearAllLogs(): Promise<void> {
  const data = await getAppData();
  data.logs = {};
  await saveAppData(data);
}

// DEV MODE: Clear today's log only
export async function clearTodayLog(): Promise<void> {
  const data = await getAppData();
  const today = new Date().toISOString().split('T')[0];
  if (data.logs[today]) {
    delete data.logs[today];
    await saveAppData(data);
  }
}

// Notification settings management
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (data) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('Error loading notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}
