export interface Rule {
  id: string;
  text: string;
  createdAt: string;
}

export type DayStatus = 'green' | 'red' | 'grey' | 'none';

export interface DayLog {
  date: string; // YYYY-MM-DD format
  status: DayStatus;
  ruleResults?: Record<string, boolean>; // ruleId -> completed
  noTradeDay?: boolean;
  lockedAt?: string; // ISO timestamp when day was locked
}

export interface AppData {
  rules: Rule[];
  logs: Record<string, DayLog>; // date -> DayLog
}

export interface WidgetSettings {
  theme: 'light' | 'dark';
  accentColor: string;
  showCompletionIndicator: boolean;
}

export type AppTheme = 'system' | 'light' | 'dark';

export type ReminderInterval = 5 | 15 | 30 | 60;

export interface NotificationSettings {
  enabled: boolean;
  startTime: string; // "HH:mm" format, e.g., "16:00"
  interval: ReminderInterval;
  endTime: string; // "HH:mm" format, e.g., "23:00"
}

export const REMINDER_INTERVALS: { value: ReminderInterval; label: string }[] = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

export const ACCENT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#6b7280', // grey
];
