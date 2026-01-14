import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AppData, DayLog, Rule, WidgetSettings } from '@/types';

const STORAGE_KEYS = {
  APP_DATA: 'trading_tracker_data',
  WIDGET_SETTINGS: 'widget_settings',
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

// Helper to sync data to App Groups for widget access (iOS only)
async function syncToWidget(key: string, data: string): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      // expo-widgets provides SharedGroupPreferences
      const SharedGroupPreferences = require('expo-widgets').SharedGroupPreferences;
      if (SharedGroupPreferences) {
        await SharedGroupPreferences.setItem(key, data, APP_GROUP);
      }
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
        const seen = new Set<string>();
        parsed.rules = parsed.rules.filter((rule: Rule) => {
          if (seen.has(rule.id)) {
            return false;
          }
          seen.add(rule.id);
          return true;
        });
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
    await syncToWidget(STORAGE_KEYS.APP_DATA, jsonData);
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
    await syncToWidget(STORAGE_KEYS.WIDGET_SETTINGS, jsonData);
  } catch (error) {
    console.error('Error saving widget settings:', error);
  }
}

// Force refresh widget timeline (call after data changes)
export async function reloadWidget(): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      const { reloadAllTimelines } = require('expo-widgets');
      if (reloadAllTimelines) {
        await reloadAllTimelines();
      }
    } catch (error) {
      console.warn('Widget reload failed:', error);
    }
  }
}
