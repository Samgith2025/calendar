import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useApp } from '@/context/AppContext';
import { getMonthGridDays, formatDate, isWeekendDay, isTodayET } from '@/utils/date';
import Colors, { STATUS_COLORS } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { DayStatus } from '@/types';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface MonthGridProps {
  month: Date;
  onDayPress?: (date: Date) => void;
}

export function MonthGrid({ month, onDayPress }: MonthGridProps) {
  const { getDayStatus } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const gridDays = getMonthGridDays(month);

  const getBoxColor = (status: DayStatus, isWeekend: boolean) => {
    if (isWeekend) {
      return 'transparent';
    }
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
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} style={styles.weekdayCell}>
            <Text style={[styles.weekdayLabel, { color: colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {gridDays.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const isWeekend = isWeekendDay(day);
          const isToday = isTodayET(day);
          const status = getDayStatus(day);
          const boxColor = getBoxColor(status, isWeekend);

          return (
            <Pressable
              key={formatDate(day)}
              style={styles.dayCell}
              onPress={() => onDayPress?.(day)}
              disabled={isWeekend}
            >
              <View
                style={[
                  styles.dayBox,
                  { backgroundColor: boxColor },
                  isWeekend && styles.weekendBox,
                  isToday && styles.todayBox,
                ]}
              >
                {status === 'green' && !isWeekend && (
                  <Text style={styles.statusIcon}>✓</Text>
                )}
                {status === 'red' && !isWeekend && (
                  <Text style={styles.statusIcon}>✗</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.greyLight }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: STATUS_COLORS.green }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Done</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: STATUS_COLORS.red }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Missed</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayBox: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekendBox: {
    backgroundColor: 'transparent',
  },
  todayBox: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  statusIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
  },
});
