import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  Keyboard,
  InputAccessoryView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ACCENT_COLORS, AppTheme, REMINDER_INTERVALS, ReminderInterval } from '@/types';
import { generateTestData, clearAllLogs, clearTodayLog, reloadWidget } from '@/utils/storage';
import { requestNotificationPermissions, getScheduledReminderCount } from '@/utils/notifications';

const __DEV_MODE__ = true; // Toggle this to show/hide dev tools

const THEME_OPTIONS: { key: AppTheme; label: string }[] = [
  { key: 'system', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

// Preset time options for reminder start/end
const TIME_OPTIONS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function ProfileScreen() {
  const {
    rules,
    addRule,
    updateRule,
    deleteRule,
    widgetSettings,
    updateWidgetSettings,
    notificationSettings,
    updateNotificationSettings,
    refreshData,
  } = useApp();
  const { appTheme, setAppTheme } = useTheme();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [newRuleText, setNewRuleText] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);

  const handleAddRule = async () => {
    if (!newRuleText.trim()) {
      Alert.alert('Error', 'Please enter a rule.');
      return;
    }
    await addRule(newRuleText.trim());
    setNewRuleText('');
  };

  const handleEditRule = (id: string, text: string) => {
    setEditingRuleId(id);
    setEditingText(text);
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim()) {
      Alert.alert('Error', 'Rule cannot be empty.');
      return;
    }
    if (editingRuleId) {
      await updateRule(editingRuleId, editingText.trim());
      setEditingRuleId(null);
      setEditingText('');
    }
  };

  const handleDeleteRule = (id: string) => {
    Alert.alert('Delete Rule', 'Are you sure you want to delete this rule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRule(id) },
    ]);
  };

  const handleGenerateTestData = async () => {
    setIsGenerating(true);
    try {
      await generateTestData(75);
      await refreshData();
      reloadWidget();
      Alert.alert('Done', '75 days of test data generated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate test data.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearAllLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'This will delete all your daily logs but keep your rules. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Logs',
          style: 'destructive',
          onPress: async () => {
            await clearAllLogs();
            await refreshData();
            reloadWidget();
            Alert.alert('Done', 'All logs cleared. Rules preserved.');
          },
        },
      ]
    );
  };

  const handleToggleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notificationSettings.enabled) {
      // Enabling - request permissions first
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permissions Required',
          'Please enable notifications in Settings to receive reminders.'
        );
        return;
      }
    }
    await updateNotificationSettings({ enabled: !notificationSettings.enabled });
  };

  const handleSelectTime = (time: string) => {
    if (showTimePicker === 'start') {
      updateNotificationSettings({ startTime: time });
    } else if (showTimePicker === 'end') {
      updateNotificationSettings({ endTime: time });
    }
    setShowTimePicker(null);
  };

  const handleSelectInterval = (interval: ReminderInterval) => {
    updateNotificationSettings({ interval });
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const addRuleInputRef = useRef<TextInput>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>

        {/* App Theme Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
            <View style={styles.themeToggle}>
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.key}
                  style={[
                    styles.themeButton,
                    { backgroundColor: colors.background },
                    appTheme === option.key && { backgroundColor: colors.green },
                  ]}
                  onPress={() => setAppTheme(option.key)}
                >
                  <Text
                    style={[
                      styles.themeButtonText,
                      { color: colors.textSecondary },
                      appTheme === option.key && { color: '#ffffff' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminders</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Get persistent reminders until you log your trading day.
          </Text>

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Reminders</Text>
            <Pressable
              style={[
                styles.toggle,
                { backgroundColor: notificationSettings.enabled ? colors.green : colors.grey },
              ]}
              onPress={handleToggleNotifications}
            >
              <View
                style={[
                  styles.toggleKnob,
                  notificationSettings.enabled && styles.toggleKnobActive,
                ]}
              />
            </Pressable>
          </View>

          {notificationSettings.enabled && (
            <>
              <View style={[styles.settingRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 }]}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Start Time</Text>
                <Pressable
                  style={[styles.timeButton, { backgroundColor: colors.background }]}
                  onPress={() => setShowTimePicker('start')}
                >
                  <Text style={[styles.timeButtonText, { color: colors.text }]}>
                    {formatTimeDisplay(notificationSettings.startTime)}
                  </Text>
                  <FontAwesome name="chevron-down" size={12} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>End Time</Text>
                <Pressable
                  style={[styles.timeButton, { backgroundColor: colors.background }]}
                  onPress={() => setShowTimePicker('end')}
                >
                  <Text style={[styles.timeButtonText, { color: colors.text }]}>
                    {formatTimeDisplay(notificationSettings.endTime)}
                  </Text>
                  <FontAwesome name="chevron-down" size={12} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Interval</Text>
                <View style={styles.themeToggle}>
                  {REMINDER_INTERVALS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.themeButton,
                        { backgroundColor: colors.background },
                        notificationSettings.interval === option.value && { backgroundColor: colors.blue },
                      ]}
                      onPress={() => handleSelectInterval(option.value)}
                    >
                      <Text
                        style={[
                          styles.themeButtonText,
                          { color: colors.textSecondary },
                          notificationSettings.interval === option.value && { color: '#ffffff' },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowTimePicker(null)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select {showTimePicker === 'start' ? 'Start' : 'End'} Time
              </Text>
              <ScrollView style={styles.timeList}>
                {TIME_OPTIONS.map((time) => (
                  <Pressable
                    key={time}
                    style={[
                      styles.timeOption,
                      { borderColor: colors.border },
                      (showTimePicker === 'start' && notificationSettings.startTime === time) ||
                      (showTimePicker === 'end' && notificationSettings.endTime === time)
                        ? { backgroundColor: colors.blue }
                        : {},
                    ]}
                    onPress={() => handleSelectTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        { color: colors.text },
                        (showTimePicker === 'start' && notificationSettings.startTime === time) ||
                        (showTimePicker === 'end' && notificationSettings.endTime === time)
                          ? { color: '#ffffff' }
                          : {},
                      ]}
                    >
                      {formatTimeDisplay(time)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Trading Rules Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Trading Rules</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Define the rules you must follow each trading day.
          </Text>

          {rules.map((rule) => (
            <View key={rule.id} style={[styles.ruleItem, { borderColor: colors.border }]}>
              {editingRuleId === rule.id ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={[
                      styles.editInput,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={editingText}
                    onChangeText={setEditingText}
                    autoFocus
                  />
                  <View style={styles.editButtons}>
                    <Pressable
                      style={[styles.editButton, { backgroundColor: colors.green }]}
                      onPress={handleSaveEdit}
                    >
                      <FontAwesome name="check" size={14} color="white" />
                    </Pressable>
                    <Pressable
                      style={[styles.editButton, { backgroundColor: colors.grey }]}
                      onPress={() => setEditingRuleId(null)}
                    >
                      <FontAwesome name="times" size={14} color="white" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={[styles.ruleText, { color: colors.text }]}>{rule.text}</Text>
                  <View style={styles.ruleActions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => handleEditRule(rule.id, rule.text)}
                    >
                      <FontAwesome name="pencil" size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => handleDeleteRule(rule.id)}
                    >
                      <FontAwesome name="trash" size={16} color={colors.red} />
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ))}

          <View style={styles.addRuleContainer}>
            <TextInput
              ref={addRuleInputRef}
              style={[
                styles.addInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="Add new rule..."
              placeholderTextColor={colors.textSecondary}
              value={newRuleText}
              onChangeText={setNewRuleText}
              onSubmitEditing={handleAddRule}
              onFocus={() => {
                setTimeout(() => {
                  addRuleInputRef.current?.measureInWindow((x, y) => {
                    scrollViewRef.current?.scrollTo({ y: y - 150, animated: true });
                  });
                }, 100);
              }}
            />
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.green }]}
              onPress={handleAddRule}
            >
              <FontAwesome name="plus" size={16} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Widget Settings Section */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Widget Settings</Text>

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
            <View style={styles.themeToggle}>
              <Pressable
                style={[
                  styles.themeButton,
                  { backgroundColor: colors.background },
                  widgetSettings.theme === 'light' && { backgroundColor: colors.blue },
                ]}
                onPress={() => updateWidgetSettings({ theme: 'light' })}
              >
                <Text
                  style={[
                    styles.themeButtonText,
                    { color: colors.textSecondary },
                    widgetSettings.theme === 'light' && { color: '#ffffff' },
                  ]}
                >
                  Light
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.themeButton,
                  { backgroundColor: colors.background },
                  widgetSettings.theme === 'dark' && { backgroundColor: colors.blue },
                ]}
                onPress={() => updateWidgetSettings({ theme: 'dark' })}
              >
                <Text
                  style={[
                    styles.themeButtonText,
                    { color: colors.textSecondary },
                    widgetSettings.theme === 'dark' && { color: '#ffffff' },
                  ]}
                >
                  Dark
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.colorSection}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Accent Color</Text>
            <View style={styles.colorGrid}>
              {ACCENT_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    widgetSettings.accentColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => updateWidgetSettings({ accentColor: color })}
                >
                  {widgetSettings.accentColor === color && (
                    <FontAwesome name="check" size={12} color="white" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.settingRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Show Completion Indicator</Text>
            <Pressable
              style={[
                styles.toggle,
                { backgroundColor: widgetSettings.showCompletionIndicator ? colors.green : colors.grey },
              ]}
              onPress={() =>
                updateWidgetSettings({ showCompletionIndicator: !widgetSettings.showCompletionIndicator })
              }
            >
              <View
                style={[
                  styles.toggleKnob,
                  widgetSettings.showCompletionIndicator && styles.toggleKnobActive,
                ]}
              />
            </Pressable>
          </View>
        </View>

        {/* Dev Tools Section - Only visible when __DEV_MODE__ is true */}
        {__DEV_MODE__ && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.red }]}>Dev Tools</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Testing utilities. Set __DEV_MODE__ to false before release.
            </Text>

            <Pressable
              style={[styles.devButton, { backgroundColor: colors.blue }]}
              onPress={handleGenerateTestData}
              disabled={isGenerating}
            >
              <FontAwesome name="database" size={16} color="white" />
              <Text style={styles.devButtonText}>
                {isGenerating ? 'Generating...' : 'Generate 75 Days Test Data'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.devButton, { backgroundColor: colors.warning }]}
              onPress={async () => {
                await clearTodayLog();
                await refreshData();
                reloadWidget();
                Alert.alert('Done', "Today's log cleared.");
              }}
            >
              <FontAwesome name="eraser" size={16} color="white" />
              <Text style={styles.devButtonText}>Clear Today's Log</Text>
            </Pressable>

            <Pressable
              style={[styles.devButton, { backgroundColor: colors.red }]}
              onPress={handleClearAllLogs}
            >
              <FontAwesome name="trash" size={16} color="white" />
              <Text style={styles.devButtonText}>Clear All Logs</Text>
            </Pressable>
          </View>
        )}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ruleText: {
    flex: 1,
    fontSize: 16,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 6,
  },
  editContainer: {
    flex: 1,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addRuleContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
  },
  themeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  themeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  themeButtonActive: {
    // backgroundColor set dynamically via inline style
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorSection: {
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'white',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  devButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeList: {
    maxHeight: 300,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  timeOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
