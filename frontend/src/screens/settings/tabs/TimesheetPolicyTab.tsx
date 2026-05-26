// screens/settings/TimesheetPolicyTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { 
  X, 
  Plus, 
  Check, 
  Save, 
  LayoutGrid, 
  Clock, 
  CalendarClock, 
  Settings2, 
  ShieldCheck 
} from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import { useSocketEvent } from '../../../services/socket';
import Header from '../../../components/common/Header';
import Slider from '@react-native-community/slider';

// Types
interface TimesheetPolicy {
  submissionDeadline: string;
  freezeTimesheet: string;
  allowEditAfterSubmission: boolean;
  managerApprovalRequired: boolean;
  minHoursPerDay: number;
  maxHoursPerDay: number;
  enforceMinHoursOnSubmit: boolean;
  permissionMaxHoursPerDay: number;
  permissionMaxDaysPerWeek: number;
  permissionMaxDaysPerMonth: number;
}

// Chip Component
const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      <TouchableOpacity onPress={onRemove} style={styles.chipRemove}>
        <X size={12} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
};

// Add Chip Input Component
const AddChipInput = ({ 
  placeholder, 
  onAdd, 
  maxLength = 50 
}: { 
  placeholder: string; 
  onAdd: (value: string) => void; 
  maxLength?: number;
}) => {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <View style={[styles.addChipContainer, isFocused && styles.addChipContainerFocused]}>
      <Plus size={16} color="#94a3b8" />
      <TextInput
        style={styles.addChipInput}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={setValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={handleAdd}
        maxLength={maxLength}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleAdd} style={styles.addChipButton}>
          <Check size={16} color="#6366f1" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Section Card Component
const SectionCard = ({ 
  title, 
  subtitle, 
  icon: IconComponent, 
  children 
}: { 
  title: string; 
  subtitle: string; 
  icon: any; 
  children: React.ReactNode;
}) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <IconComponent size={20} color="#6366f1" />
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

// Main Component
export default function TimesheetPolicyTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const [taskCategories, setTaskCategories] = useState<string[]>([]);
  const [policy, setPolicy] = useState<TimesheetPolicy>({
    submissionDeadline: 'Friday 18:00',
    freezeTimesheet: 'Monday 18:00',
    allowEditAfterSubmission: false,
    managerApprovalRequired: true,
    minHoursPerDay: 4,
    maxHoursPerDay: 12,
    enforceMinHoursOnSubmit: false,
    permissionMaxHoursPerDay: 2,
    permissionMaxDaysPerWeek: 1,
    permissionMaxDaysPerMonth: 4,
  });
  const [initialState, setInitialState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings().then((r: any) => r.data?.data || r.data || r),
  });

  useSocketEvent('settings_updated', (payload) => {
    console.log('[Socket] Settings updated event received in TimesheetPolicyTab:', payload);
    refetch();
  });

  useEffect(() => {
    if (data?.timesheet) {
      const loadedCategories = data.timesheet.taskCategories || [];
      const loadedPolicy = {
        submissionDeadline: data.timesheet.submissionDeadline || 'Friday 18:00',
        freezeTimesheet: data.timesheet.freezeTimesheet || 'Monday 18:00',
        allowEditAfterSubmission: !!data.timesheet.allowEditAfterSubmission,
        managerApprovalRequired: !!data.timesheet.managerApprovalRequired,
        minHoursPerDay: data.timesheet.minHoursPerDay ?? 4,
        maxHoursPerDay: data.timesheet.maxHoursPerDay ?? 12,
        enforceMinHoursOnSubmit: !!data.timesheet.enforceMinHoursOnSubmit,
        permissionMaxHoursPerDay: data.timesheet.permissionMaxHoursPerDay ?? 2,
        permissionMaxDaysPerWeek: data.timesheet.permissionMaxDaysPerWeek ?? 1,
        permissionMaxDaysPerMonth: data.timesheet.permissionMaxDaysPerMonth ?? 4,
      };
      setTaskCategories(loadedCategories);
      setPolicy(loadedPolicy);
      setInitialState(JSON.stringify({ taskCategories: loadedCategories, ...loadedPolicy }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.updateSettings({
      timesheet: {
        taskCategories,
        ...policy,
      },
    }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Success', text2: 'Timesheet policies updated!' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setInitialState(JSON.stringify({ taskCategories, ...policy }));
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'Save failed' });
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updatePolicy = <K extends keyof TimesheetPolicy>(key: K, value: TimesheetPolicy[K]) => {
    setPolicy(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const currentState = JSON.stringify({ taskCategories, ...policy });
    if (currentState === initialState) {
      Toast.show({ type: 'info', text1: 'Info', text2: 'There is nothing to change' });
      return;
    }
    saveMutation.mutate();
  };

  const handleAddCategory = (value: string) => {
    if (!taskCategories.includes(value)) {
      setTaskCategories([...taskCategories, value]);
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Category already exists' });
    }
  };

  const handleDeleteCategory = (index: number) => {
    setDeleteIndex(index);
    setDeleteModalVisible(true);
  };

  const confirmDeleteCategory = () => {
    if (deleteIndex !== null) {
      setTaskCategories(taskCategories.filter((_, idx) => idx !== deleteIndex));
    }
    setDeleteModalVisible(false);
    setDeleteIndex(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading timesheet policies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Timesheet Policy"
        showBackButton={true}
        showSidebarButton={false}
        onBackPress={() => navigation.navigate('Settings' as never)}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Sticky Header with Save Button */}
        <View style={styles.stickyHeader}>
          <View>
            <Text style={styles.title}>Timesheet Policies</Text>
            <Text style={styles.description}>Control entry rules, approval workflows, and limits</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Task Catalog Section */}
        <SectionCard title="Task Catalog" subtitle="Manage available categories for time entries" icon={LayoutGrid}>
          <View style={styles.chipContainer}>
            {taskCategories.map((cat, i) => (
              <Chip key={i} label={cat} onRemove={() => handleDeleteCategory(i)} />
            ))}
          </View>
          <AddChipInput
            placeholder="e.g. Code Review, Client Meeting..."
            onAdd={handleAddCategory}
            maxLength={50}
          />
        </SectionCard>

        {/* Submission Rules Section */}
        <SectionCard title="Submission Rules" subtitle="Time-based entry controls" icon={Clock}>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weekly Deadline</Text>
              <TextInput
                style={styles.input}
                value={policy.submissionDeadline}
                onChangeText={(text) => updatePolicy('submissionDeadline', text)}
                placeholder="Friday 18:00"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Auto-Lock Schedule</Text>
              <TextInput
                style={styles.input}
                value={policy.freezeTimesheet}
                onChangeText={(text) => updatePolicy('freezeTimesheet', text)}
                placeholder="Monday 10:00"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </SectionCard>

        {/* Permission Log Section */}
        <SectionCard title="Permission Log" subtitle="Configure limits for permission row entries" icon={CalendarClock}>
          {/* Per-Day Maximum */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Per-Day Maximum</Text>
                <Text style={styles.sliderSubtitle}>Cap on daily permission entries</Text>
              </View>
              <View style={styles.valueBadge}>
                <Text style={styles.valueBadgeText}>{policy.permissionMaxHoursPerDay} HRS</Text>
              </View>
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={8}
              step={0.5}
              value={policy.permissionMaxHoursPerDay}
              onValueChange={(value) => updatePolicy('permissionMaxHoursPerDay', value)}
              minimumTrackTintColor="#f59e0b"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#f59e0b"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0H</Text>
              <Text style={styles.sliderLabel}>2H</Text>
              <Text style={styles.sliderLabel}>4H</Text>
              <Text style={styles.sliderLabel}>6H</Text>
              <Text style={styles.sliderLabel}>8H</Text>
            </View>
          </View>

          {/* Max Days Per Week */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Weekly Limit</Text>
                <Text style={styles.sliderSubtitle}>Max days / week</Text>
              </View>
              <View style={[styles.valueBadge, styles.primaryBadge]}>
                <Text style={styles.valueBadgeText}>
                  {policy.permissionMaxDaysPerWeek === 0 ? '∞' : `${policy.permissionMaxDaysPerWeek}D`}
                </Text>
              </View>
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={5}
              step={1}
              value={policy.permissionMaxDaysPerWeek}
              onValueChange={(value) => updatePolicy('permissionMaxDaysPerWeek', value)}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#6366f1"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>∞</Text>
              <Text style={styles.sliderLabel}>1D</Text>
              <Text style={styles.sliderLabel}>2D</Text>
              <Text style={styles.sliderLabel}>3D</Text>
              <Text style={styles.sliderLabel}>4D</Text>
              <Text style={styles.sliderLabel}>5D</Text>
            </View>
          </View>

          {/* Max Days Per Month */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Monthly Limit</Text>
                <Text style={styles.sliderSubtitle}>Max days / month</Text>
              </View>
              <View style={[styles.valueBadge, styles.primaryBadge]}>
                <Text style={styles.valueBadgeText}>
                  {policy.permissionMaxDaysPerMonth === 0 ? '∞' : `${policy.permissionMaxDaysPerMonth}D`}
                </Text>
              </View>
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={20}
              step={1}
              value={policy.permissionMaxDaysPerMonth}
              onValueChange={(value) => updatePolicy('permissionMaxDaysPerMonth', value)}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#6366f1"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>∞</Text>
              <Text style={styles.sliderLabel}>5D</Text>
              <Text style={styles.sliderLabel}>10D</Text>
              <Text style={styles.sliderLabel}>15D</Text>
              <Text style={styles.sliderLabel}>20D</Text>
            </View>
          </View>
        </SectionCard>

        {/* Daily Guardrails Section */}
        <SectionCard title="Daily Guardrails" subtitle="Hour entry constraints" icon={Settings2}>
          {/* Min Hours Per Day */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Min Threshold</Text>
              </View>
              <View style={[styles.valueBadge, styles.indigoBadge]}>
                <Text style={styles.valueBadgeText}>{policy.minHoursPerDay} HRS</Text>
              </View>
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={8}
              step={0.5}
              value={policy.minHoursPerDay}
              onValueChange={(value) => updatePolicy('minHoursPerDay', value)}
              minimumTrackTintColor="#4f46e5"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#4f46e5"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0H</Text>
              <Text style={styles.sliderLabel}>2H</Text>
              <Text style={styles.sliderLabel}>4H</Text>
              <Text style={styles.sliderLabel}>6H</Text>
              <Text style={styles.sliderLabel}>8H</Text>
            </View>
          </View>

          {/* Max Hours Per Day */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Max Capacity</Text>
              </View>
              <View style={[styles.valueBadge, styles.indigoBadge]}>
                <Text style={styles.valueBadgeText}>{policy.maxHoursPerDay} HRS</Text>
              </View>
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={8}
              maximumValue={24}
              step={0.5}
              value={policy.maxHoursPerDay}
              onValueChange={(value) => updatePolicy('maxHoursPerDay', value)}
              minimumTrackTintColor="#4f46e5"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#4f46e5"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>8H</Text>
              <Text style={styles.sliderLabel}>12H</Text>
              <Text style={styles.sliderLabel}>16H</Text>
              <Text style={styles.sliderLabel}>20H</Text>
              <Text style={styles.sliderLabel}>24H</Text>
            </View>
          </View>

          {/* Enforce on Submit Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleHeader}>
              <View>
                <View style={styles.toggleTitleRow}>
                  <Text style={styles.toggleTitle}>Hard Enforcement</Text>
                  <View style={[styles.enforcementBadge, policy.enforceMinHoursOnSubmit && styles.enforcementBadgeActive]}>
                    <Text style={[styles.enforcementBadgeText, policy.enforceMinHoursOnSubmit && styles.enforcementBadgeTextActive]}>
                      {policy.enforceMinHoursOnSubmit ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.toggleSubtitle}>
                  Strictly block submission if daily hours don't meet thresholds.
                </Text>
              </View>
              <Switch
                value={policy.enforceMinHoursOnSubmit}
                onValueChange={(value) => updatePolicy('enforceMinHoursOnSubmit', value)}
                trackColor={{ false: '#e2e8f0', true: '#ef4444' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.warningBox, policy.enforceMinHoursOnSubmit && styles.warningBoxActive]}>
              <ShieldCheck size={14} color={policy.enforceMinHoursOnSubmit ? "#ef4444" : "#94a3b8"} />
              <Text style={[styles.warningText, policy.enforceMinHoursOnSubmit && styles.warningTextActive]}>
                {policy.enforceMinHoursOnSubmit ? (
                  <>
                    <Text style={styles.warningBold}>Submission Locked:</Text> Employees cannot submit if any worked day is below{' '}
                    <Text style={styles.warningBold}>{policy.minHoursPerDay}h</Text> or above{' '}
                    <Text style={styles.warningBold}>{policy.maxHoursPerDay}h</Text>.
                  </>
                ) : (
                  <>
                    <Text style={styles.warningBold}>Soft Warning:</Text> Limits will be shown as warnings but won't block submission.
                  </>
                )}
              </Text>
            </View>
          </View>
        </SectionCard>
      </ScrollView>

      {/* Delete Category Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Category?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this task category? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteButton} onPress={confirmDeleteCategory}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 14,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sectionContent: {
    padding: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  chipRemove: {
    padding: 2,
  },
  addChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  addChipContainerFocused: {
    borderColor: '#6366f1',
    backgroundColor: '#fff',
  },
  addChipInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
  },
  addChipButton: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
  sliderCard: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sliderTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sliderSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
  },
  valueBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  primaryBadge: {
    backgroundColor: '#e0e7ff',
  },
  indigoBadge: {
    backgroundColor: '#e0e7ff',
  },
  valueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    marginTop: 8,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  toggleTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleSubtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  enforcementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  enforcementBadgeActive: {
    backgroundColor: '#fee2e2',
  },
  enforcementBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  enforcementBadgeTextActive: {
    color: '#ef4444',
  },
  warningBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  warningBoxActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  warningText: {
    flex: 1,
    fontSize: 10,
    color: '#64748b',
    lineHeight: 16,
  },
  warningTextActive: {
    color: '#dc2626',
  },
  warningBold: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});