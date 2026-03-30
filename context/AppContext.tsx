import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppData, DayLog, Rule, DayStatus, WidgetSettings, NotificationSettings } from '@/types';
import * as storage from '@/utils/storage';
import { formatDate, getCurrentDateET, isPastDay, isTodayET, isWeekendDay } from '@/utils/date';
import { reloadWidget, syncWidgetData } from '@/utils/storage';
import { scheduleReminders, cancelAllReminders, cancelFollowUpReminders } from '@/utils/notifications';

interface AppContextType {
  rules: Rule[];
  logs: Record<string, DayLog>;
  widgetSettings: WidgetSettings;
  notificationSettings: NotificationSettings;
  isLoading: boolean;
  addRule: (text: string) => Promise<void>;
  updateRule: (id: string, text: string) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  submitDayLog: (ruleResults: Record<string, boolean>) => Promise<void>;
  submitDayLogForDate: (date: string, ruleResults: Record<string, boolean>) => Promise<void>;
  markNoTradeDay: () => Promise<void>;
  markNoTradeDayForDate: (date: string) => Promise<void>;
  markBrokePlan: () => Promise<void>;
  markBrokePlanForDate: (date: string) => Promise<void>;
  getDayStatus: (date: Date) => DayStatus;
  updateWidgetSettings: (settings: Partial<WidgetSettings>) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  refreshData: () => Promise<void>;
  todayLog: DayLog | null;
  canEditToday: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({
    theme: 'dark',
    accentColor: '#22c55e',
    showCompletionIndicator: true,
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    startTime: '16:00',
    interval: 15,
    endTime: '23:00',
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const appData = await storage.getAppData();
      setRules(appData.rules);
      setLogs(appData.logs);
      const settings = await storage.getWidgetSettings();
      setWidgetSettings(settings);
      const notifSettings = await storage.getNotificationSettings();
      setNotificationSettings(notifSettings);
      // Ensure widget has latest data on every app launch
      await syncWidgetData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addRule = async (text: string) => {
    try {
      const newRule = await storage.addRule(text);
      setRules((prev) => [...prev, newRule]);
      await syncWidgetData();
    } catch (error) {
      console.error('Failed to add rule:', error);
      throw error;
    }
  };

  const updateRule = async (id: string, text: string) => {
    try {
      await storage.updateRule(id, text);
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, text } : r)));
      await syncWidgetData();
    } catch (error) {
      console.error('Failed to update rule:', error);
      throw error;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await storage.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      await syncWidgetData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      throw error;
    }
  };

  const submitDayLogForDate = async (date: string, ruleResults: Record<string, boolean>) => {
    const allFollowed = Object.values(ruleResults).every((v) => v);
    const log: DayLog = {
      date,
      status: allFollowed ? 'green' : 'red',
      ruleResults,
      noTradeDay: false,
    };
    await storage.saveDayLog(log);
    setLogs((prev) => ({ ...prev, [date]: log }));
    if (date === formatDate(getCurrentDateET())) await cancelFollowUpReminders(date);
    await reloadWidget();
  };

  const submitDayLog = async (ruleResults: Record<string, boolean>) => {
    await submitDayLogForDate(formatDate(getCurrentDateET()), ruleResults);
  };

  const markNoTradeDayForDate = async (date: string) => {
    const log: DayLog = {
      date,
      status: 'green',
      noTradeDay: true,
    };
    await storage.saveDayLog(log);
    setLogs((prev) => ({ ...prev, [date]: log }));
    if (date === formatDate(getCurrentDateET())) await cancelFollowUpReminders(date);
    await reloadWidget();
  };

  const markNoTradeDay = async () => {
    await markNoTradeDayForDate(formatDate(getCurrentDateET()));
  };

  const markBrokePlanForDate = async (date: string) => {
    const ruleResults: Record<string, boolean> = {};
    rules.forEach((rule) => {
      ruleResults[rule.id] = false;
    });
    const log: DayLog = {
      date,
      status: 'red',
      ruleResults,
      noTradeDay: false,
    };
    await storage.saveDayLog(log);
    setLogs((prev) => ({ ...prev, [date]: log }));
    if (date === formatDate(getCurrentDateET())) await cancelFollowUpReminders(date);
    await reloadWidget();
  };

  const markBrokePlan = async () => {
    await markBrokePlanForDate(formatDate(getCurrentDateET()));
  };

  const getDayStatus = (date: Date): DayStatus => {
    if (isWeekendDay(date)) {
      return 'none';
    }

    const dateStr = formatDate(date);
    const log = logs[dateStr];

    if (log) {
      return log.status;
    }

    if (isPastDay(date)) {
      return 'grey';
    }

    if (isTodayET(date)) {
      return 'none';
    }

    return 'none';
  };

  const updateWidgetSettings = async (settings: Partial<WidgetSettings>) => {
    const newSettings = { ...widgetSettings, ...settings };
    await storage.saveWidgetSettings(newSettings);
    setWidgetSettings(newSettings);
    // Refresh widget to show new theme/color
    await reloadWidget();
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    const newSettings = { ...notificationSettings, ...settings };
    await storage.saveNotificationSettings(newSettings);
    setNotificationSettings(newSettings);

    // Reschedule reminders with new settings
    const today = formatDate(getCurrentDateET());
    const isTodayComplete = !!logs[today];
    await scheduleReminders(newSettings, isTodayComplete);
  };

  const today = formatDate(getCurrentDateET());
  const todayLog = logs[today] || null;
  const canEditToday = !todayLog;

  return (
    <AppContext.Provider
      value={{
        rules,
        logs,
        widgetSettings,
        notificationSettings,
        isLoading,
        addRule,
        updateRule,
        deleteRule,
        submitDayLog,
        submitDayLogForDate,
        markNoTradeDay,
        markNoTradeDayForDate,
        markBrokePlan,
        markBrokePlanForDate,
        getDayStatus,
        updateWidgetSettings,
        updateNotificationSettings,
        refreshData,
        todayLog,
        canEditToday,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
