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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
  ShieldCheck,
  ShieldAlert,
  Database,
  CalendarDays,
  Info,
  Lock,
  Unlock
} from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import { useSocketEvent } from '../../../services/socket';
import { useAuthStore } from '../../../store/authStore';
import Layout from '../../../components/common/Layout';
import PageHeader from '../../../components/common/PageHeader';
import Slider from '@react-native-community/slider';
import { scale, verticalScale, moderateScale } from '../../../utils/responsive';

// Types
interface TimesheetPolicy {
  submissionDeadline: string;
  freezeTimesheet: string;
  allowEditAfterSubmission: boolean;
  managerApprovalRequired: boolean;
  minHoursPerDay: number;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  enforceMinHoursOnSubmit: boolean;
  permissionMaxHoursPerDay: number;
  permissionMaxDaysPerWeek: number;
  permissionMaxDaysPerMonth: number;

  // Compliance section
  allowBackdatedEntries: boolean;
  auditLogRetentionDays: number;
  requireReasonForLate: boolean;
  autoFreezeTimesheets: string;
  timesheetFreezeDay: number; // Added freeze day
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

// Freeze Day Slider Component
const FreezeDaySlider = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const [showValueModal, setShowValueModal] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  const handleValueChange = () => {
    const numValue = parseInt(tempValue) || 1;
    onChange(Math.min(31, Math.max(1, numValue)));
    setShowValueModal(false);
  };

  return (
    <View style={styles.freezeDayContainer}>
      <View style={styles.freezeDayHeader}>
        <Text style={styles.freezeDayLabel}>Freeze Day of Month</Text>
        <TouchableOpacity
          style={styles.freezeDayBadge}
          onPress={() => {
            setTempValue(String(value));
            setShowValueModal(true);
          }}
        >
          <Text style={styles.freezeDayBadgeText}>{value}</Text>
        </TouchableOpacity>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={31}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#6366f1"
        maximumTrackTintColor="#e2e8f0"
        thumbTintColor="#6366f1"
      />
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderMark}>1</Text>
        <Text style={styles.sliderMark}>15</Text>
        <Text style={styles.sliderMark}>31</Text>
      </View>

      <View style={styles.infoBox}>
        <Info size={14} color="#6366f1" />
        <Text style={styles.infoBoxText}>
          Entries from the previous month will be frozen on this day of the current month.
        </Text>
      </View>

      {/* Value Edit Modal */}
      <Modal visible={showValueModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.valueModal}>
            <Text style={styles.valueModalTitle}>Set Freeze Day</Text>
            <TextInput
              style={styles.valueModalInput}
              value={tempValue}
              onChangeText={setTempValue}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.valueModalButtons}>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonCancel]}
                onPress={() => setShowValueModal(false)}
              >
                <Text style={styles.valueModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonConfirm]}
                onPress={handleValueChange}
              >
                <Text style={[styles.valueModalButtonText, styles.valueModalButtonConfirmText]}>
                  Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Editable Badge Component for Sliders
const EditableBadge = ({ 
  value, 
  onChange,
  badgeStyle,
  textStyle,
  formatValue,
  min,
  max
}: { 
  value: number; 
  onChange: (value: number) => void;
  badgeStyle?: any;
  textStyle?: any;
  formatValue: (v: number) => string;
  min?: number;
  max?: number;
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  const handleSave = () => {
    let numValue = parseFloat(tempValue);
    if (!isNaN(numValue)) {
      if (min !== undefined && numValue < min) {
        Alert.alert('Not Allowed', `Value cannot be less than ${min}.`);
        return;
      }
      if (max !== undefined && numValue > max) {
        Alert.alert('Not Allowed', `Value cannot be greater than ${max}.`);
        return;
      }
      onChange(numValue);
    }
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.valueBadge, badgeStyle]} 
        onPress={() => {
          setTempValue(String(value));
          setShowModal(true);
        }}
      >
        <Text style={[styles.valueBadgeText, textStyle]}>
          {formatValue(value)}
        </Text>
      </TouchableOpacity>
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.valueModal}>
            <Text style={styles.valueModalTitle}>Edit Value</Text>
            <TextInput
              style={styles.valueModalInput}
              value={tempValue}
              onChangeText={setTempValue}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.valueModalButtons}>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonCancel]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.valueModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonConfirm]}
                onPress={handleSave}
              >
                <Text style={[styles.valueModalButtonText, styles.valueModalButtonConfirmText]}>
                  Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Main Component
export default function TimesheetPolicyTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const [taskCategories, setTaskCategories] = useState<string[]>([]);
  const [policy, setPolicy] = useState<TimesheetPolicy>({
    submissionDeadline: 'Friday 18:00',
    freezeTimesheet: 'Monday 18:00',
    allowEditAfterSubmission: false,
    managerApprovalRequired: true,
    minHoursPerDay: 4,
    maxHoursPerDay: 12,
    maxHoursPerWeek: 48,
    enforceMinHoursOnSubmit: false,
    permissionMaxHoursPerDay: 2,
    permissionMaxDaysPerWeek: 1,
    permissionMaxDaysPerMonth: 4,
    allowBackdatedEntries: false,
    auditLogRetentionDays: 365,
    requireReasonForLate: true,
    autoFreezeTimesheets: 'Monday 18:00',
    timesheetFreezeDay: 28,
  });
  const [initialState, setInitialState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings().then((r: any) => r?.data?.data ?? r?.data ?? r ?? null),
  });

  useSocketEvent('settings_updated', (payload) => {
    console.log('[Socket] Settings updated event received in TimesheetPolicyTab:', payload);
    refetch();
  });

  useEffect(() => {
    if (data?.timesheet) {
      const loadedCategories = data.timesheet.taskCategories || [];
      const compliance = data.compliance || {};
      const loadedPolicy = {
        submissionDeadline: data.timesheet.submissionDeadline || 'Friday 18:00',
        freezeTimesheet: data.timesheet.freezeTimesheet || 'Monday 18:00',
        allowEditAfterSubmission: !!data.timesheet.allowEditAfterSubmission,
        managerApprovalRequired: !!data.timesheet.managerApprovalRequired,
        minHoursPerDay: data.timesheet.minHoursPerDay ?? 4,
        maxHoursPerDay: data.timesheet.maxHoursPerDay ?? 12,
        maxHoursPerWeek: data.timesheet.maxHoursPerWeek ?? 48,
        enforceMinHoursOnSubmit: !!data.timesheet.enforceMinHoursOnSubmit,
        permissionMaxHoursPerDay: data.timesheet.permissionMaxHoursPerDay ?? 2,
        permissionMaxDaysPerWeek: data.timesheet.permissionMaxDaysPerWeek ?? 1,
        permissionMaxDaysPerMonth: data.timesheet.permissionMaxDaysPerMonth ?? 4,
        
        // Compliance section
        allowBackdatedEntries: !!compliance.allowBackdatedEntries,
        auditLogRetentionDays: compliance.auditLogRetentionDays ?? 365,
        requireReasonForLate: !!compliance.requireReasonForLate,
        autoFreezeTimesheets: compliance.autoFreezeTimesheets || 'Monday 18:00',
        timesheetFreezeDay: compliance.timesheetFreezeDay ?? 28,
      };
      setTaskCategories(loadedCategories);
      setPolicy(loadedPolicy);
      setInitialState(JSON.stringify({ taskCategories: loadedCategories, ...loadedPolicy }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const { 
        allowBackdatedEntries, 
        auditLogRetentionDays, 
        requireReasonForLate, 
        autoFreezeTimesheets,
        timesheetFreezeDay,
        ...timesheetPolicy 
      } = policy;

      return settingsAPI.updateSettings({
        timesheet: {
          taskCategories,
          ...timesheetPolicy,
        },
        compliance: {
          allowBackdatedEntries,
          auditLogRetentionDays,
          requireReasonForLate,
          autoFreezeTimesheets,
          timesheetFreezeDay,
        }
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Timesheet policies updated!');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setInitialState(JSON.stringify({ taskCategories, ...policy }));
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Save failed');
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updatePolicy = <K extends keyof TimesheetPolicy>(key: K, value: TimesheetPolicy[K]) => {
    if (key === 'permissionMaxDaysPerWeek') {
      const weeklyVal = value as number;
      const monthlyVal = policy.permissionMaxDaysPerMonth;
      if (monthlyVal !== 0 && (weeklyVal === 0 || weeklyVal > monthlyVal)) {
        Alert.alert('Not Allowed', 'Weekly limit cannot be higher than the monthly limit.');
        return;
      }
    } else if (key === 'permissionMaxDaysPerMonth') {
      const monthlyVal = value as number;
      const weeklyVal = policy.permissionMaxDaysPerWeek;
      if (monthlyVal !== 0 && (weeklyVal === 0 || weeklyVal > monthlyVal)) {
        Alert.alert('Not Allowed', 'Monthly limit cannot be lower than the weekly limit. Reduce the weekly limit first.');
        return;
      }
    } else if (key === 'minHoursPerDay') {
      const minVal = value as number;
      if (minVal > policy.maxHoursPerDay) {
        Alert.alert('Not Allowed', 'Daily minimum cannot be higher than the daily maximum.');
        return;
      }
    } else if (key === 'maxHoursPerDay') {
      const maxVal = value as number;
      if (maxVal < policy.minHoursPerDay) {
        Alert.alert('Not Allowed', 'Daily maximum cannot be lower than the daily minimum.');
        return;
      }
      if (maxVal > policy.maxHoursPerWeek) {
        Alert.alert('Not Allowed', 'Daily maximum cannot be higher than the weekly limit.');
        return;
      }
    } else if (key === 'maxHoursPerWeek') {
      const weeklyVal = value as number;
      if (weeklyVal < policy.maxHoursPerDay) {
        Alert.alert('Not Allowed', 'Weekly limit cannot be lower than the daily maximum.');
        return;
      }
    }
    setPolicy(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (policy.permissionMaxDaysPerWeek === 0 && policy.permissionMaxDaysPerMonth !== 0) {
      Alert.alert('Not Allowed', 'Weekly limit (∞) cannot be higher than the monthly limit.');
      return;
    }
    if (policy.permissionMaxDaysPerWeek !== 0 && policy.permissionMaxDaysPerMonth !== 0 && policy.permissionMaxDaysPerWeek > policy.permissionMaxDaysPerMonth) {
      Alert.alert('Not Allowed', 'Weekly limit cannot be higher than the monthly limit.');
      return;
    }

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
    <Layout
      title="Timesheet Policy"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={isLoading}
      onRefresh={handleRefresh}
      scrollable={false}
      backgroundColor="#f8fafc"
      showBackButton={true}
      onBackPress={() => navigation.navigate('Settings' as never)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          <PageHeader
            title="Timesheet Policies"
            subtitle="Control entry rules, approval workflows, and limits"
            icon={CalendarDays}
            iconColor="#6366f1"
            iconBgColor="#eef2ff"
          />

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
              <EditableBadge
                value={policy.permissionMaxHoursPerDay}
                onChange={(val) => updatePolicy('permissionMaxHoursPerDay', val)}
                formatValue={(v) => `${v} HRS`}
                min={0}
                max={12}
              />
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={12}
              step={0.5}
              value={policy.permissionMaxHoursPerDay}
              onValueChange={(value) => updatePolicy('permissionMaxHoursPerDay', value)}
              onSlidingStart={() => setScrollEnabled(false)}
              onSlidingComplete={() => setScrollEnabled(true)}
              minimumTrackTintColor="#f59e0b"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#f59e0b"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0H</Text>
              <Text style={styles.sliderLabel}>3H</Text>
              <Text style={styles.sliderLabel}>6H</Text>
              <Text style={styles.sliderLabel}>9H</Text>
              <Text style={styles.sliderLabel}>12H</Text>
            </View>
          </View>

          {/* Max Days Per Week */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Weekly Limit</Text>
                <Text style={styles.sliderSubtitle}>Max days / week</Text>
              </View>
              <EditableBadge
                value={policy.permissionMaxDaysPerWeek}
                onChange={(val) => updatePolicy('permissionMaxDaysPerWeek', val)}
                badgeStyle={styles.primaryBadge}
                textStyle={{ color: '#6366f1' }}
                formatValue={(v) => v === 0 ? '∞' : `${v}D`}
                min={0}
                max={6}
              />
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={6}
              step={1}
              value={policy.permissionMaxDaysPerWeek}
              onValueChange={(value) => updatePolicy('permissionMaxDaysPerWeek', value)}
              onSlidingStart={() => setScrollEnabled(false)}
              onSlidingComplete={() => setScrollEnabled(true)}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#6366f1"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>∞</Text>
              <Text style={styles.sliderLabel}>2D</Text>
              <Text style={styles.sliderLabel}>4D</Text>
              <Text style={styles.sliderLabel}>6D</Text>
            </View>
          </View>

          {/* Max Days Per Month */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Monthly Limit</Text>
                <Text style={styles.sliderSubtitle}>Max days / month</Text>
              </View>
              <EditableBadge
                value={policy.permissionMaxDaysPerMonth}
                onChange={(val) => updatePolicy('permissionMaxDaysPerMonth', val)}
                badgeStyle={styles.primaryBadge}
                textStyle={{ color: '#6366f1' }}
                formatValue={(v) => v === 0 ? '∞' : `${v}D`}
                min={0}
                max={31}
              />
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={31}
              step={1}
              value={policy.permissionMaxDaysPerMonth}
              onValueChange={(value) => updatePolicy('permissionMaxDaysPerMonth', value)}
              onSlidingStart={() => setScrollEnabled(false)}
              onSlidingComplete={() => setScrollEnabled(true)}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#6366f1"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>∞</Text>
              <Text style={styles.sliderLabel}>10D</Text>
              <Text style={styles.sliderLabel}>20D</Text>
              <Text style={styles.sliderLabel}>31D</Text>
            </View>
          </View>
        </SectionCard>

        {/* Entry Guardrails Section */}
        <SectionCard title="Entry Guardrails" subtitle="Hour entry constraints and enforcement" icon={Settings2}>
          {/* Min Hours Per Day */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Daily Minimum</Text>
                <Text style={styles.sliderSubtitle}>Threshold for warning/block</Text>
              </View>
              <EditableBadge
                value={policy.minHoursPerDay}
                onChange={(val) => updatePolicy('minHoursPerDay', val)}
                badgeStyle={styles.indigoBadge}
                formatValue={(v) => `${v} HRS`}
                min={0}
                max={8}
              />
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={8}
              step={0.5}
              value={policy.minHoursPerDay}
              onValueChange={(value) => updatePolicy('minHoursPerDay', value)}
              onSlidingStart={() => setScrollEnabled(false)}
              onSlidingComplete={() => setScrollEnabled(true)}
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
                <Text style={styles.sliderTitle}>Daily Maximum</Text>
                <Text style={styles.sliderSubtitle}>Cap on total daily hours</Text>
              </View>
              <EditableBadge
                value={policy.maxHoursPerDay}
                onChange={(val) => updatePolicy('maxHoursPerDay', val)}
                badgeStyle={styles.indigoBadge}
                formatValue={(v) => `${v} HRS`}
                min={8}
                max={24}
              />
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={8}
              maximumValue={24}
              step={0.5}
              value={policy.maxHoursPerDay}
              onValueChange={(value) => updatePolicy('maxHoursPerDay', value)}
              onSlidingStart={() => setScrollEnabled(false)}
              onSlidingComplete={() => setScrollEnabled(true)}
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

          {/* Max Hours Per Week */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <View>
                <Text style={styles.sliderTitle}>Weekly Limit</Text>
                <Text style={styles.sliderSubtitle}>Max allowed hours per week</Text>
              </View>
              <EditableBadge
                value={policy.maxHoursPerWeek}
                onChange={(val) => updatePolicy('maxHoursPerWeek', val)}
                badgeStyle={styles.indigoBadge}
                formatValue={(v) => `${v} HRS`}
                min={policy.maxHoursPerDay}
                max={168}
              />
            </View>
            
            <Slider
              style={styles.slider}
              minimumValue={20}
              maximumValue={80}
              step={1}
              value={policy.maxHoursPerWeek}
              onValueChange={(value) => updatePolicy('maxHoursPerWeek', value)}
              onSlidingStart={() => setScrollEnabled(false)}
              onSlidingComplete={() => setScrollEnabled(true)}
              minimumTrackTintColor="#4f46e5"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#4f46e5"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>20H</Text>
              <Text style={styles.sliderLabel}>35H</Text>
              <Text style={styles.sliderLabel}>50H</Text>
              <Text style={styles.sliderLabel}>65H</Text>
              <Text style={styles.sliderLabel}>80H</Text>
            </View>
          </View>

          {/* Enforce on Submit Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={[styles.toggleTitleRow, { gap: 0 }]}>
                  <Text style={[styles.toggleTitle, { marginRight: 8 }]}>Hard Enforcement</Text>
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

            <View style={[styles.warningBox, policy.enforceMinHoursOnSubmit && styles.warningBoxActive, { gap: 0 }]}>
              {policy.enforceMinHoursOnSubmit ? (
                <Lock size={14} color="#ef4444" style={{ marginRight: 10, marginTop: 2 }} />
              ) : (
                <Unlock size={14} color="#94a3b8" style={{ marginRight: 10, marginTop: 2 }} />
              )}
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



          {/* Save Button */}
          <TouchableOpacity
            style={styles.bottomSaveButton}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.saveButtonContent}>
                <Save size={20} color="white" style={{ marginRight: 10 }} />
                <Text style={styles.saveButtonText}>Save Policies</Text>
              </View>
            )}
          </TouchableOpacity>
         </ScrollView>
       </KeyboardAvoidingView>

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
     </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  content: { padding: moderateScale(16), paddingBottom: verticalScale(120) },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: verticalScale(12), fontSize: moderateScale(14), color: '#64748b' },
  description: { fontSize: moderateScale(13), color: '#64748b', marginTop: verticalScale(4) },
  saveButton: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), paddingHorizontal: scale(20), paddingVertical: verticalScale(10), backgroundColor: '#1e293b', borderRadius: moderateScale(14) },
  saveButtonDisabled: { opacity: 0.5 },
  bottomSaveButton: { backgroundColor: '#6366f1', borderRadius: moderateScale(16), paddingVertical: verticalScale(16), alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(10), marginBottom: verticalScale(20), shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveButtonContent: { flexDirection: 'row', alignItems: 'center' },
  saveButtonText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },
  sectionCard: { backgroundColor: '#fff', borderRadius: moderateScale(24), borderWidth: 1, borderColor: '#e2e8f0', marginBottom: verticalScale(20), overflow: 'hidden' },
  sectionHeader: { padding: moderateScale(16), borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc' },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12) },
  sectionTitle: { fontSize: moderateScale(14), fontWeight: '700', color: '#1e293b' },
  sectionSubtitle: { fontSize: moderateScale(11), color: '#64748b', marginTop: verticalScale(2) },
  sectionContent: { padding: moderateScale(16) },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(8), marginBottom: verticalScale(16) },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: scale(10), paddingVertical: verticalScale(6), borderRadius: moderateScale(20), gap: moderateScale(6) },
  chipText: { fontSize: moderateScale(12), fontWeight: '500', color: '#475569' },
  chipRemove: { padding: moderateScale(2) },
  addChipContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: moderateScale(12), paddingHorizontal: scale(12), paddingVertical: verticalScale(10), gap: moderateScale(8) },
  addChipContainerFocused: { borderColor: '#6366f1', backgroundColor: '#fff' },
  addChipInput: { flex: 1, fontSize: moderateScale(13), color: '#1e293b', padding: 0 },
  addChipButton: { padding: moderateScale(4) },
  inputRow: { flexDirection: 'row', gap: moderateScale(16) },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: moderateScale(10), fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: verticalScale(8) },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: moderateScale(12), paddingHorizontal: scale(14), paddingVertical: verticalScale(12), fontSize: moderateScale(13), fontWeight: '500', color: '#1e293b' },
  inputHelper: { fontSize: moderateScale(10), color: '#94a3b8', marginTop: verticalScale(6), marginLeft: scale(4) },
  sliderCard: { marginBottom: verticalScale(24), paddingBottom: verticalScale(16), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(16) },
  sliderTitle: { fontSize: moderateScale(10), fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: verticalScale(4) },
  sliderSubtitle: { fontSize: moderateScale(10), color: '#94a3b8' },
  valueBadge: { backgroundColor: '#fef3c7', paddingHorizontal: scale(10), paddingVertical: verticalScale(6), borderRadius: moderateScale(12) },
  primaryBadge: { backgroundColor: '#e0e7ff' },
  indigoBadge: { backgroundColor: '#e0e7ff' },
  valueBadgeText: { fontSize: moderateScale(11), fontWeight: '700', color: '#d97706' },
  slider: { width: '100%', height: verticalScale(40) },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: verticalScale(8), paddingHorizontal: scale(8) },
  sliderLabel: { fontSize: moderateScale(8), fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase' },
  sliderMark: { fontSize: moderateScale(9), color: '#94a3b8' },
  toggleContainer: { marginTop: verticalScale(8) },
  freezeDayContainer: { gap: moderateScale(12) },
  freezeDayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  freezeDayLabel: { fontSize: moderateScale(11), fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  freezeDayBadge: { backgroundColor: '#eef2ff', paddingHorizontal: scale(12), paddingVertical: verticalScale(6), borderRadius: moderateScale(12) },
  freezeDayBadgeText: { fontSize: moderateScale(14), fontWeight: '700', color: '#6366f1' },
  infoBox: { flexDirection: 'row', gap: moderateScale(10), padding: moderateScale(12), backgroundColor: '#eef2ff', borderRadius: moderateScale(12), borderWidth: 1, borderColor: '#c7d2fe' },
  infoBoxText: { flex: 1, fontSize: moderateScale(10), color: '#4f46e5', lineHeight: moderateScale(14) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  valueModal: { backgroundColor: '#fff', borderRadius: moderateScale(20), padding: moderateScale(20), width: SCREEN_WIDTH - scale(48), alignItems: 'center' },
  valueModalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b', marginBottom: verticalScale(16) },
  valueModalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: moderateScale(12), paddingHorizontal: scale(16), paddingVertical: verticalScale(12), fontSize: moderateScale(20), fontWeight: '600', color: '#1e293b', textAlign: 'center', width: '100%', marginBottom: verticalScale(20) },
  valueModalButtons: { flexDirection: 'row', gap: moderateScale(12), width: '100%' },
  valueModalButton: { flex: 1, paddingVertical: verticalScale(12), borderRadius: moderateScale(12), alignItems: 'center' },
  valueModalButtonCancel: { backgroundColor: '#f1f5f9' },
  valueModalButtonConfirm: { backgroundColor: '#6366f1' },
  valueModalButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#374151' },
  valueModalButtonConfirmText: { color: '#fff' },
  toggleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  toggleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), marginBottom: verticalScale(4) },
  toggleTitle: { fontSize: moderateScale(10), fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 },
  toggleSubtitle: { fontSize: moderateScale(10), color: '#64748b' },
  enforcementBadge: { paddingHorizontal: scale(8), paddingVertical: verticalScale(3), borderRadius: moderateScale(8), backgroundColor: '#f1f5f9' },
  enforcementBadgeActive: { backgroundColor: '#fee2e2' },
  enforcementBadgeText: { fontSize: moderateScale(8), fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  enforcementBadgeTextActive: { color: '#ef4444' },
  warningBox: { flexDirection: 'row', gap: moderateScale(10), padding: moderateScale(14), backgroundColor: '#f8fafc', borderRadius: moderateScale(16), borderWidth: 1, borderColor: '#e2e8f0' },
  warningBoxActive: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  warningText: { flex: 1, fontSize: moderateScale(10), color: '#64748b', lineHeight: moderateScale(16) },
  warningTextActive: { color: '#dc2626' },
  warningBold: { fontWeight: '700' },
  modalContainer: { backgroundColor: '#fff', borderRadius: moderateScale(24), padding: moderateScale(24), width: '80%', maxWidth: scale(320) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b', marginBottom: verticalScale(12) },
  modalMessage: { fontSize: moderateScale(14), color: '#64748b', marginBottom: verticalScale(20) },
  modalButtons: { flexDirection: 'row', gap: moderateScale(12) },
  modalCancelButton: { flex: 1, paddingVertical: verticalScale(12), alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: moderateScale(12) },
  modalCancelText: { fontSize: moderateScale(14), fontWeight: '600', color: '#64748b' },
  modalDeleteButton: { flex: 1, paddingVertical: verticalScale(12), alignItems: 'center', backgroundColor: '#ef4444', borderRadius: moderateScale(12) },
  modalDeleteText: { fontSize: moderateScale(14), fontWeight: '600', color: '#fff' },
});