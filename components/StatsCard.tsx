import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatDate, getCurrentDateET, getWeekdaysInMonth } from '@/utils/date';

interface StatsCardProps {
  month: Date;
}

export function StatsCard({ month }: StatsCardProps) {
  const { logs } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const stats = useMemo(() => {
    const weekdays = getWeekdaysInMonth(month);
    const today = getCurrentDateET();

    let greenDays = 0;
    let redDays = 0;
    let greyDays = 0;
    let currentStreak = 0;
    let countingStreak = true;

    // Sort weekdays in reverse order to calculate streak from most recent
    const sortedWeekdays = [...weekdays].sort((a, b) => b.getTime() - a.getTime());

    for (const day of weekdays) {
      const dateStr = formatDate(day);
      const log = logs[dateStr];

      // Only count days up to today
      if (day <= today) {
        if (log?.status === 'green') {
          greenDays++;
        } else if (log?.status === 'red') {
          redDays++;
        } else {
          greyDays++;
        }
      }
    }

    // Calculate streak (consecutive green days from most recent)
    for (const day of sortedWeekdays) {
      if (day > today) continue;

      const dateStr = formatDate(day);
      const log = logs[dateStr];

      if (countingStreak) {
        if (log?.status === 'green') {
          currentStreak++;
        } else if (log?.status === 'red') {
          countingStreak = false;
        } else {
          // Grey day (not logged) - skip but don't break streak
          continue;
        }
      }
    }

    const totalLogged = greenDays + redDays;
    const rate = totalLogged > 0 ? Math.round((greenDays / totalLogged) * 100) : 0;

    return {
      streak: currentStreak,
      rate,
      missed: redDays,
    };
  }, [logs, month]);

  return (
    <View style={styles.container}>
      <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.statValue, { color: colors.green }]}>{stats.streak}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>STREAK</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.statValue, { color: colors.text }]}>{stats.rate}%</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RATE</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.statValue, { color: colors.red }]}>{stats.missed}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>MISSED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
