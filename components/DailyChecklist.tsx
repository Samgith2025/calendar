import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export function DailyChecklist() {
  const { rules, todayLog, canEditToday, submitDayLog, markNoTradeDay } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [ruleStates, setRuleStates] = useState<Record<string, boolean | null>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset rule states when rules change
  useEffect(() => {
    const initial: Record<string, boolean | null> = {};
    rules.forEach((rule) => {
      initial[rule.id] = null;
    });
    setRuleStates(initial);
  }, [rules]);

  const toggleRule = (ruleId: string) => {
    setRuleStates((prev) => {
      const current = prev[ruleId];
      let next: boolean | null;
      if (current === null) {
        next = true;
      } else if (current === true) {
        next = false;
      } else {
        next = null;
      }
      return { ...prev, [ruleId]: next };
    });
  };

  const handleSubmit = () => {
    const allMarked = rules.every((rule) => ruleStates[rule.id] !== null);
    if (!allMarked) {
      Alert.alert('Incomplete', 'Please mark all rules before submitting.');
      return;
    }

    const results: Record<string, boolean> = {};
    rules.forEach((rule) => {
      results[rule.id] = ruleStates[rule.id] === true;
    });

    submitDayLog(results);
  };

  const handleNoTrade = () => {
    Alert.alert(
      'No Trade Today',
      'Mark today as following your plan (no setup)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => markNoTradeDay() },
      ]
    );
  };

  if (!canEditToday) {
    const isGreen = todayLog?.status === 'green';
    const isNoTrade = todayLog?.noTradeDay;
    const loggedRules = rules.filter((rule) => todayLog?.ruleResults?.[rule.id] !== undefined);

    return (
      <Pressable
        style={[styles.container, { backgroundColor: colors.cardBackground }]}
        onPress={() => loggedRules.length > 0 && setIsExpanded(!isExpanded)}
      >
        <View style={styles.completedRow}>
          <FontAwesome
            name={isGreen ? 'check-circle' : 'times-circle'}
            size={20}
            color={isGreen ? colors.green : colors.red}
          />
          <Text style={[styles.completedTitle, { color: colors.text }]}>
            {isNoTrade
              ? 'No Trade Day'
              : isGreen
              ? 'Rules Followed'
              : 'Rules Broken'}
          </Text>
          {loggedRules.length > 0 && (
            <FontAwesome
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textSecondary}
              style={styles.expandIcon}
            />
          )}
        </View>

        {isExpanded && loggedRules.length > 0 && (
          <View style={styles.resultsContainer}>
            {loggedRules.map((rule) => {
              const followed = todayLog?.ruleResults?.[rule.id];
              return (
                <View key={rule.id} style={styles.resultRow}>
                  <FontAwesome
                    name={followed ? 'check' : 'times'}
                    size={12}
                    color={followed ? colors.green : colors.red}
                  />
                  <Text style={[styles.resultText, { color: colors.text }]}>
                    {rule.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Pressable>
    );
  }

  if (rules.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No rules set up yet. Go to Settings to add your trading rules.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.title, { color: colors.text }]}>Today's Checklist</Text>

      {rules.map((rule) => {
        const state = ruleStates[rule.id];
        return (
          <Pressable
            key={rule.id}
            style={[
              styles.ruleRow,
              { borderColor: colors.border },
              state === true && { backgroundColor: colors.green + '20' },
              state === false && { backgroundColor: colors.red + '20' },
            ]}
            onPress={() => toggleRule(rule.id)}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: colors.border },
                state === true && { backgroundColor: colors.green, borderColor: colors.green },
                state === false && { backgroundColor: colors.red, borderColor: colors.red },
              ]}
            >
              {state === true && <FontAwesome name="check" size={12} color="white" />}
              {state === false && <FontAwesome name="times" size={12} color="white" />}
            </View>
            <Text style={[styles.ruleText, { color: colors.text }]}>{rule.text}</Text>
          </Pressable>
        );
      })}

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.submitButton, { backgroundColor: colors.green }]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </Pressable>

        <Pressable
          style={[styles.noTradeButton, { borderColor: colors.border }]}
          onPress={handleNoTrade}
        >
          <Text style={[styles.noTradeButtonText, { color: colors.textSecondary }]}>
            No Trade Today
          </Text>
        </Pressable>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ruleText: {
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 6,
    gap: 8,
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  noTradeButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  noTradeButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 16,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  expandIcon: {
    marginLeft: 'auto',
  },
  resultsContainer: {
    marginTop: 10,
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 13,
  },
});
