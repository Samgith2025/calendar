import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '@/context/AppContext';
import { formatDate, isTodayET, getCurrentDateET } from '@/utils/date';
import Colors, { STATUS_COLORS } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { DayStatus } from '@/types';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, startOfWeek, addDays } from 'date-fns';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', '%'];

interface WeekRow {
  days: (Date | null)[]; // 5 weekdays (Mon-Fri)
  weekRate: number | null; // % rate for the week
}

interface MonthGridProps {
  month: Date;
}

export function MonthGrid({ month }: MonthGridProps) {
  const { getDayStatus, logs } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const today = getCurrentDateET();

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Group days into weeks (Mon-Fri only)
    const weeksMap = new Map<string, Date[]>();

    for (const day of allDays) {
      if (isWeekend(day)) continue;

      // Get the Monday of this week as the key
      const dayOfWeek = getDay(day);
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekMonday = addDays(day, mondayOffset);
      const weekKey = formatDate(weekMonday);

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, []);
      }
      weeksMap.get(weekKey)!.push(day);
    }

    // Convert to WeekRow format
    const result: WeekRow[] = [];
    const sortedWeeks = Array.from(weeksMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [weekKey, weekDays] of sortedWeeks) {
      // Create array of 5 days (Mon-Fri), filling nulls for days outside the month
      const days: (Date | null)[] = [null, null, null, null, null];

      for (const day of weekDays) {
        const dayOfWeek = getDay(day);
        // Convert to 0-based index (Mon=0, Tue=1, etc.)
        const index = dayOfWeek === 0 ? 4 : dayOfWeek - 1; // Sunday shouldn't happen, but handle it
        if (index >= 0 && index < 5) {
          days[index] = day;
        }
      }

      // Calculate week rate (only for days up to today)
      let greenCount = 0;
      let totalLogged = 0;

      for (const day of days) {
        if (!day || day > today) continue;

        const dateStr = formatDate(day);
        const log = logs[dateStr];

        if (log?.status === 'green') {
          greenCount++;
          totalLogged++;
        } else if (log?.status === 'red') {
          totalLogged++;
        }
      }

      const weekRate = totalLogged > 0 ? Math.round((greenCount / totalLogged) * 100) : null;

      result.push({ days, weekRate });
    }

    return result;
  }, [month, logs, today]);

  const getBoxColor = (status: DayStatus) => {
    switch (status) {
      case 'green':
        return STATUS_COLORS.green;
      case 'red':
        return STATUS_COLORS.red;
      case 'grey':
        return colors.grey;
      default:
        return colors.greyLight;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.headerRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} style={[styles.headerCell, index === 5 && styles.rateHeaderCell]}>
            <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.days.map((day, dayIndex) => {
            if (!day) {
              return <View key={`empty-${dayIndex}`} style={styles.dayCell} />;
            }

            const isToday = isTodayET(day);
            const status = getDayStatus(day);
            const boxColor = getBoxColor(status);

            return (
              <View key={formatDate(day)} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayBox,
                    { backgroundColor: boxColor },
                    isToday && [styles.todayBox, { borderColor: colors.blue }],
                  ]}
                >
                  {status === 'green' && <Text style={styles.statusIcon}>✓</Text>}
                  {status === 'red' && <Text style={styles.statusIcon}>✗</Text>}
                </View>
              </View>
            );
          })}

          <View style={styles.rateCell}>
            {week.weekRate !== null ? (
              <Text
                style={[
                  styles.rateText,
                  {
                    color:
                      week.weekRate >= 80
                        ? colors.green
                        : week.weekRate >= 50
                        ? colors.text
                        : colors.red,
                  },
                ]}
              >
                {week.weekRate}%
              </Text>
            ) : (
              <Text style={[styles.rateText, { color: colors.textSecondary }]}>—</Text>
            )}
          </View>
        </View>
      ))}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: STATUS_COLORS.green }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Done</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: STATUS_COLORS.red }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Missed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.grey }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>No Log</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  rateHeaderCell: {
    flex: 0.8,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    padding: 1,
  },
  dayBox: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBox: {
    borderWidth: 2,
  },
  statusIcon: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rateCell: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
  },
});
