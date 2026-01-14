import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useApp } from '@/context/AppContext';
import { formatDate, getCurrentDateET, getFirstTrackingDay, getWeekdaysInRange } from '@/utils/date';
import Colors, { GRID_COLORS } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { addMonths, subMonths } from 'date-fns';

export type ViewMode = 'month' | 'quarter' | 'year';

interface DotGridViewProps {
  mode: ViewMode;
}

type DotType = 'green' | 'red' | 'future' | 'before';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function DotGridView({ mode }: DotGridViewProps) {
  const { logs } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const today = getCurrentDateET();

  const { dots, greenCount, totalTracked } = useMemo(() => {
    const firstDay = getFirstTrackingDay(logs);
    if (!firstDay) return { dots: [], greenCount: 0, totalTracked: 0 };

    let startDate: Date;
    let endDate: Date;

    if (mode === 'quarter') {
      startDate = subMonths(today, 3);
      if (firstDay > startDate) startDate = firstDay;
      endDate = addMonths(today, 3);
    } else {
      startDate = firstDay;
      endDate = addMonths(firstDay, 12);
    }

    const weekdays = getWeekdaysInRange(startDate, endDate);

    let green = 0;
    let tracked = 0;

    const dotList: { date: Date; type: DotType }[] = weekdays.map((day) => {
      const dateStr = formatDate(day);
      const log = logs[dateStr];
      const isFuture = day > today;
      const isBeforeTracking = day < firstDay;

      if (isFuture) {
        return { date: day, type: 'future' as DotType };
      }

      if (isBeforeTracking) {
        return { date: day, type: 'before' as DotType };
      }

      tracked++;
      if (log?.status === 'green') {
        green++;
        return { date: day, type: 'green' as DotType };
      } else {
        return { date: day, type: 'red' as DotType };
      }
    });

    return { dots: dotList, greenCount: green, totalTracked: tracked };
  }, [logs, mode, today]);

  if (dots.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No tracking data yet. Submit your first checklist to start.
        </Text>
      </View>
    );
  }

  // Calculate grid dimensions for fixed columns
  const containerPadding = 16;
  const horizontalMargin = 32; // 16 * 2
  const availableWidth = SCREEN_WIDTH - horizontalMargin - (containerPadding * 2);

  // Columns tuned for iPhone 13 mini - 3M fits, 1Y needs more columns to fit
  const columns = mode === 'quarter' ? 12 : 16;
  const gap = 3;
  const dotSize = Math.floor((availableWidth - (gap * (columns - 1))) / columns);

  const getDotColor = (type: DotType): string => {
    switch (type) {
      case 'green':
        return GRID_COLORS.green;
      case 'red':
        return GRID_COLORS.red;
      case 'future':
      case 'before':
        return GRID_COLORS.empty;
    }
  };

  const futureCount = dots.filter((d) => d.type === 'future').length;
  const rate = totalTracked > 0 ? Math.round((greenCount / totalTracked) * 100) : 0;

  // Split dots into rows
  const rows: { date: Date; type: DotType }[][] = [];
  for (let i = 0; i < dots.length; i += columns) {
    rows.push(dots.slice(i, i + columns));
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'quarter' ? '3 Month View' : '12 Month Goal'}
        </Text>
        <Text style={styles.subtitle}>
          {greenCount}/{totalTracked} ({rate}%) • {futureCount} to go
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={[styles.row, { gap }]}>
            {row.map((dot) => (
              <View
                key={formatDate(dot.date)}
                style={[
                  styles.dot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize * 0.25, // Squircle effect
                    backgroundColor: getDotColor(dot.type),
                  },
                ]}
              />
            ))}
            {/* Fill remaining spots in last row with invisible dots */}
            {row.length < columns &&
              Array(columns - row.length)
                .fill(null)
                .map((_, i) => (
                  <View
                    key={`empty-${i}`}
                    style={{ width: dotSize, height: dotSize }}
                  />
                ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: GRID_COLORS.green }]} />
          <Text style={styles.legendText}>Followed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: GRID_COLORS.red }]} />
          <Text style={styles.legendText}>Broke</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: GRID_COLORS.empty }]} />
          <Text style={styles.legendText}>Remaining</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GRID_COLORS.containerBg,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: GRID_COLORS.headerText,
  },
  subtitle: {
    fontSize: 12,
    color: GRID_COLORS.subtitleText,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 16,
  },
  gridContainer: {
    gap: 3,
  },
  row: {
    flexDirection: 'row',
  },
  dot: {
    // Size set dynamically
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2.5, // Squircle
  },
  legendText: {
    fontSize: 11,
    color: GRID_COLORS.subtitleText,
  },
});
