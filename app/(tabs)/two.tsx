import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ACCENT_COLORS } from '@/types';

export default function ProfileScreen() {
  const {
    rules,
    addRule,
    updateRule,
    deleteRule,
    widgetSettings,
    updateWidgetSettings,
  } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [newRuleText, setNewRuleText] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>

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
              style={[
                styles.addInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="Add new rule..."
              placeholderTextColor={colors.textSecondary}
              value={newRuleText}
              onChangeText={setNewRuleText}
              onSubmitEditing={handleAddRule}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
});
