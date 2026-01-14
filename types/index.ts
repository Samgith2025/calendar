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
