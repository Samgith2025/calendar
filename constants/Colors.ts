const tintColorLight = '#22c55e';
const tintColorDark = '#4ade80'; // Brighter green for dark mode

export default {
  light: {
    text: '#1f2937',
    textSecondary: '#6b7280',
    background: '#f3f4f6',
    cardBackground: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,
    border: '#e5e7eb',
    green: '#22c55e',
    red: '#ef4444',
    grey: '#d1d5db',
    greyLight: '#e5e7eb',
    blue: '#3b82f6',
    // Additional colors for better UI
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  dark: {
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    background: '#0f172a', // Slightly deeper dark
    cardBackground: '#1e293b', // Slate-800
    tint: tintColorDark,
    tabIconDefault: '#6b7280',
    tabIconSelected: tintColorDark,
    border: '#334155', // Slate-700
    green: '#4ade80', // Brighter green for dark mode
    red: '#f87171', // Brighter red for dark mode
    grey: '#475569', // Slate-600
    greyLight: '#334155', // Slate-700
    blue: '#60a5fa', // Brighter blue for dark mode
    // Additional colors for better UI
    success: '#4ade80',
    error: '#f87171',
    warning: '#fbbf24',
  },
};

export const STATUS_COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  grey: '#6b7280',
  none: 'transparent',
};

// HabitKit-style grid colors (always dark)
export const GRID_COLORS = {
  green: '#4ade80',
  red: '#f87171',
  empty: '#2d3748',
  containerBg: '#1a202c',
  headerText: '#f7fafc',
  subtitleText: '#a0aec0',
};
