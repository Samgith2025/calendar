import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useApp } from '@/context/AppContext';
import { MonthGrid } from '@/components/MonthGrid';
import { StatsCard } from '@/components/StatsCard';
import { DailyChecklist } from '@/components/DailyChecklist';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatMonthYear, getCurrentDateET } from '@/utils/date';
import { addMonths, subMonths } from 'date-fns';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TrackScreen() {
  const { isLoading } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [currentMonth, setCurrentMonth] = useState(getCurrentDateET());

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
            <FontAwesome name="chevron-left" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {formatMonthYear(currentMonth)}
          </Text>
          <Pressable onPress={goToNextMonth} style={styles.navButton}>
            <FontAwesome name="chevron-right" size={18} color={colors.text} />
          </Pressable>
        </View>

        <StatsCard month={currentMonth} />

        <View style={styles.section}>
          <MonthGrid month={currentMonth} />
        </View>

        <View style={styles.section}>
          <DailyChecklist />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 10,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  section: {
    marginTop: 12,
  },
});
