import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { formatDate } from '@/utils/date';
import { format } from 'date-fns';

interface DayDetailModalProps {
  date: Date | null;
  onClose: () => void;
}

export function DayDetailModal({ date, onClose }: DayDetailModalProps) {
  const { rules, logs, submitDayLogForDate, markNoTradeDayForDate, markBrokePlanForDate } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [ruleStates, setRuleStates] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    if (!date) return;
    const dateStr = formatDate(date);
    const existingLog = logs[dateStr];
    const initial: Record<string, boolean | null> = {};
    rules.forEach((rule) => {
      if (existingLog?.ruleResults && rule.id in existingLog.ruleResults) {
        initial[rule.id] = existingLog.ruleResults[rule.id];
      } else {
        initial[rule.id] = null;
      }
    });
    setRuleStates(initial);
  }, [date, logs, rules]);

  const dateStr = date ? formatDate(date) : '';
  const existingLog = date ? logs[dateStr] : null;
  const dateLabel = date ? format(date, 'EEE, MMM d') : '';

  const toggleRule = (ruleId: string) => {
    setRuleStates((prev) => {
      const current = prev[ruleId];
      let next: boolean | null;
      if (current === null) next = true;
      else if (current === true) next = false;
      else next = null;
      return { ...prev, [ruleId]: next };
    });
  };

  const handleSubmit = async () => {
    const allMarked = rules.every((rule) => ruleStates[rule.id] !== null);
    if (!allMarked) {
      Alert.alert('Incomplete', 'Please mark all rules before submitting.');
      return;
    }
    const results: Record<string, boolean> = {};
    rules.forEach((rule) => {
      results[rule.id] = ruleStates[rule.id] === true;
    });
    await submitDayLogForDate(dateStr, results);
    onClose();
  };

  const handleNoTrade = () => {
    Alert.alert('No Trade Day', 'Mark this day as following your plan (no setup)?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await markNoTradeDayForDate(dateStr);
          onClose();
        },
      },
    ]);
  };

  const handleBrokePlan = () => {
    Alert.alert('Broke My Plan', 'Mark this day as not following your plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          await markBrokePlanForDate(dateStr);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={date !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.cardBackground }]}>
        {date && (
          <>
            <View style={styles.header}>
              <Text style={[styles.dateLabel, { color: colors.text }]}>{dateLabel}</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <FontAwesome name="times" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {existingLog && (
              <View style={styles.statusRow}>
                <FontAwesome
                  name={existingLog.status === 'green' ? 'check-circle' : 'times-circle'}
                  size={13}
                  color={existingLog.status === 'green' ? colors.green : colors.red}
                />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {existingLog.noTradeDay
                    ? 'No Trade Day'
                    : existingLog.status === 'green'
                    ? 'Rules Followed'
                    : 'Rules Broken'}
                </Text>
              </View>
            )}

            {rules.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No rules set up yet. Go to Settings to add your trading rules.
              </Text>
            ) : (
              <>
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
                    <Text style={styles.submitButtonText}>{existingLog ? 'Update' : 'Submit'}</Text>
                  </Pressable>

                  <View style={styles.secondaryButtons}>
                    <Pressable
                      style={[styles.secondaryButton, { borderColor: colors.border }]}
                      onPress={handleNoTrade}
                    >
                      <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                        No Trade
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryButton, { borderColor: colors.red + '60' }]}
                      onPress={handleBrokePlan}
                    >
                      <Text style={[styles.secondaryButtonText, { color: colors.red }]}>
                        Broke Plan
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
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
  secondaryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 16,
  },
});
