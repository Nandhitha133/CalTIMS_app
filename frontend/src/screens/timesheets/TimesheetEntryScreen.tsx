// screens/timesheet/TimesheetEntryScreen.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfWeek, addDays, isSameDay, getWeek } from 'date-fns';
import {
  Plus,
  Trash2,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  AlertTriangle,
  Clock,
  X,
  Briefcase,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
  Zap,
  RefreshCw,
  CheckCheck,
} from 'lucide-react-native';
import { useSocketEvent } from '../../services/socket';
import {
  timesheetAPI,
  projectAPI,
  settingsAPI,
  taskAPI,
  leaveAPI,
  calendarAPI,
  attendanceAPI
} from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Interfaces
interface Row {
  id: number;
  projectId: string;
  taskType: string;
  dayHours: string[];
  dayMeta: any[];
  isLeaveRow?: boolean;
}

// Constants
const DEFAULT_TASK_TYPES = ['Development', 'Bug Fixing', 'Design', 'Meeting', 'Documentation', 'Testing'];
const DEFAULT_LEAVE_TYPES = ['Annual', 'Sick', 'Casual', 'Unpaid'];
const PERMISSION_ROW_MARKER = '__PERMISSION__';

const isLeaveTaskType = (taskType: string, leaveTypes: string[] = DEFAULT_LEAVE_TYPES) =>
  leaveTypes.some(lt => lt.toLowerCase() === taskType?.toLowerCase());

const isPermissionRow = (taskType: string) => taskType === PERMISSION_ROW_MARKER;

const isLopType = (type: string) => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes('lop') || t.includes('loss of pay') || t.includes('unpaid');
};

const formatHours = (total: number) => {
  const decimal = Number(total) || 0;
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper to extract data from API response
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

// Dropdown Modal Component
const DropdownModal = ({ visible, onClose, options, selectedValue, onSelect, title }: any) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.dropdownModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option: any) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.dropdownOption, selectedValue === option.value && styles.dropdownOptionSelected]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={[styles.dropdownOptionText, selectedValue === option.value && styles.dropdownOptionTextSelected]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && <CheckCircle2 size={16} color="#6366f1" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Quick Fill Suggestions Panel Component
const QuickFillSuggestions = ({
  visible,
  onClose,
  onRepeatLastWeek,
  onFillStandardHours,
  onAutoFill,
  isRepeatLoading,
  isWeekSubmitted,
  workingHoursPerDay,
  isRepeatDisabled,
  isFillDisabled,
  isAutoFillDisabled,
}: any) => {
  if (!visible) return null;

  return (
    <View style={styles.suggestionsCard}>
      <View style={styles.suggestionsHeader}>
        <View style={styles.suggestionsIconContainer}>
          <Sparkles size={18} color="#6366f1" />
        </View>
        <View style={styles.suggestionsTitleContainer}>
          <Text style={styles.suggestionsTitle}>Quick Fill</Text>
          <Text style={styles.suggestionsSubtitle}>Fill your timesheet in seconds</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.suggestionsClose}>
          <X size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.suggestionsButtons}>
        <TouchableOpacity
          style={[styles.suggestionButton, styles.repeatButton, (isWeekSubmitted || isRepeatDisabled) && styles.suggestionButtonDisabled]}
          onPress={onRepeatLastWeek}
          disabled={isWeekSubmitted || isRepeatDisabled}
        >
          {isRepeatLoading ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <>
              <RefreshCw size={14} color="#4f46e5" />
              <Text style={styles.repeatButtonText}>Repeat Last Week</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.suggestionButton, styles.standardButton, (isWeekSubmitted || isFillDisabled) && styles.suggestionButtonDisabled]}
          onPress={onFillStandardHours}
          disabled={isWeekSubmitted || isFillDisabled}
        >
          <Zap size={14} color="#7c3aed" />
          <Text style={styles.standardButtonText}>Fill {workingHoursPerDay}h / Day</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.suggestionButton, styles.attendanceButton, (isWeekSubmitted || isAutoFillDisabled) && styles.suggestionButtonDisabled]}
          onPress={onAutoFill}
          disabled={isWeekSubmitted || isAutoFillDisabled}
        >
          <CheckCheck size={14} color="#059669" />
          <Text style={styles.attendanceButtonText}>Fill from Attendance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Row Component
const TimesheetRow = ({
  row,
  index,
  weekDays,
  projects,
  allTasks,
  tsSettings,
  leaveTaskTypes,
  isRowLocked,
  lockedDays,
  holidays,
  onUpdateRow,
  onUpdateHour,
  onRemoveRow,
  isWorkingDay,
  workingHoursPerDay,
  onOpenProjectPicker,
  onOpenTaskPicker,
}: any) => {
  const isPermission = isPermissionRow(row.taskType);
  const rowTotal = row.dayHours.reduce((acc: number, time: string) => {
    if (!time || time === '-8') return acc;
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    return acc + h + (m / 60);
  }, 0);

  const getProjectName = (projectId: string) => {
    const project = projects?.find((p: any) => (p.id || p._id) === projectId);
    return project?.name || 'Select Project';
  };

  const getTaskName = (taskType: string) => {
    if (taskType === 'Select Task') return 'Select Task';
    return taskType;
  };

  return (
    <View style={[styles.tableRow, isPermission && styles.permissionRow]}>
      {/* Serial Number */}
      <View style={[styles.cell, styles.cellSno]}>
        <Text style={styles.snoText}>{index + 1}</Text>
      </View>

      {/* Project Name */}
      <View style={[styles.cell, styles.cellProject]}>
        {isPermission ? (
          <View style={styles.permissionCell}>
            <Text style={styles.permissionText}>Permission</Text>
          </View>
        ) : row.isLeaveRow ? (
          <View style={styles.leaveCell}>
            <Text style={styles.leaveText}>System Leave</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => onOpenProjectPicker(row.id)}
            disabled={isRowLocked(row)}
          >
            <Text style={[styles.selectButtonText, !row.projectId && styles.placeholderText]} numberOfLines={1}>
              {row.projectId ? getProjectName(row.projectId) : 'Select Project'}
            </Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Task Type */}
      <View style={[styles.cell, styles.cellTask]}>
        {isPermission ? (
          <View style={styles.permissionCell}>
            <Text style={styles.permissionText}>Permission Request</Text>
          </View>
        ) : row.isLeaveRow ? (
          <View style={styles.leaveCell}>
            <Text style={styles.leaveText}>{row.taskType || 'Leave'}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => onOpenTaskPicker(row.id, row.projectId)}
            disabled={isRowLocked(row) || !row.projectId}
          >
            <Text style={[styles.selectButtonText, row.taskType === 'Select Task' && styles.placeholderText]} numberOfLines={1}>
              {getTaskName(row.taskType)}
            </Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Day Hours */}
      {weekDays.map((day: Date, dayIdx: number) => {
        if (!isWorkingDay(day)) return null;

        const isHoliday = holidays.has(format(day, 'yyyy-MM-dd'));
        const isFutureDate = day.getTime() > new Date().setHours(23, 59, 59, 999);
        const isPendingCell = row.dayMeta?.[dayIdx]?.isPending;
        const isApprovedCell = row.dayMeta?.[dayIdx]?.isApproved;
        const cellLeaveType = row.dayMeta?.[dayIdx]?.type;
        const isLeaveCell = isPendingCell || isApprovedCell;
        const isLop = isLopType(cellLeaveType);
        const isProjectOrTaskNotSelected = !row.isLeaveRow && !isPermissionRow(row.taskType) && (!row.projectId || row.taskType === 'Select Task');
        const isDisabledInput = isRowLocked(row) || lockedDays[dayIdx] || isHoliday || isFutureDate || isProjectOrTaskNotSelected;

        const getCellStyle = () => {
          if (isLop && isPendingCell) return styles.cellLopPending;
          if (isLop && isApprovedCell) return styles.cellLopApproved;
          if (isPendingCell) return styles.cellPending;
          if (isApprovedCell) return styles.cellApproved;
          if (isHoliday) return styles.cellHoliday;
          return styles.cellNormal;
        };

        return (
          <View key={dayIdx} style={[styles.cell, styles.cellHour, getCellStyle()]}>
            {isLop && isLeaveCell ? (
              <Text style={styles.lopText}>0</Text>
            ) : (
              <View style={[styles.hourInputContainer, isDisabledInput && styles.cellDisabled]}>
                <TextInput
                  style={[styles.hourInput, isDisabledInput && styles.hourInputDisabled]}
                  value={row.dayHours[dayIdx].split(':')[0]}
                  onChangeText={(text) => {
                    const h = text.replace(/\D/g, '').slice(0, 2);
                    const m = row.dayHours[dayIdx].split(':')[1] || '00';
                    onUpdateHour(row.id, dayIdx, `${h}:${m}`);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor="#94a3b8"
                  editable={!isDisabledInput}
                  onBlur={() => {
                    let hStr = row.dayHours[dayIdx].split(':')[0] || '00';
                    if (hStr === '') hStr = '00';
                    else hStr = String(Math.min(24, parseInt(hStr, 10) || 0)).padStart(2, '0');
                    const mStr = row.dayHours[dayIdx].split(':')[1] || '00';
                    onUpdateHour(row.id, dayIdx, `${hStr}:${mStr}`);
                  }}
                />
                <Text style={styles.hourSeparator}>:</Text>
                <TextInput
                  style={[styles.hourInput, isDisabledInput && styles.hourInputDisabled]}
                  value={row.dayHours[dayIdx].split(':')[1]}
                  onChangeText={(text) => {
                    const m = text.replace(/\D/g, '').slice(0, 2);
                    const h = row.dayHours[dayIdx].split(':')[0] || '00';
                    onUpdateHour(row.id, dayIdx, `${h}:${m}`);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor="#94a3b8"
                  editable={!isDisabledInput}
                  onBlur={() => {
                    const hStr = row.dayHours[dayIdx].split(':')[0] || '00';
                    let mStr = row.dayHours[dayIdx].split(':')[1] || '00';
                    if (mStr === '') mStr = '00';
                    else {
                      let mNum = parseInt(mStr, 10) || 0;
                      if (mNum > 59) mNum = 59;
                      mStr = String(mNum).padStart(2, '0');
                    }
                    onUpdateHour(row.id, dayIdx, `${hStr}:${mStr}`);
                  }}
                />
              </View>
            )}
            {isLeaveCell && cellLeaveType && (
              <Text style={styles.leaveCellText}>{cellLeaveType}</Text>
            )}
          </View>
        );
      })}

      {/* Row Total */}
      <View style={[styles.cell, styles.cellTotal]}>
        <Text style={[styles.totalHours, row.isLeaveRow && styles.leaveTotalHours]}>
          {formatHours(rowTotal)}
        </Text>
      </View>

      {/* Action */}
      <View style={[styles.cell, styles.cellAction]}>
        {!row.isLeaveRow && (
          <TouchableOpacity
            onPress={() => onRemoveRow(row.id)}
            disabled={isRowLocked(row)}
            style={[styles.deleteButtonContainer, isRowLocked(row) && styles.deleteButtonDisabled]}
          >
            <Trash2 size={16} color={isRowLocked(row) ? '#cbd5e1' : '#ef4444'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Modal Components
const UnsavedChangesModal = ({ visible, onSave, onDiscard, onClose, isSaving, isWeekSubmitted }: any) => {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Unsaved Changes</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <AlertTriangle size={32} color="#f59e0b" />
            </View>
            <Text style={styles.modalText}>You have pending changes in your timesheet.</Text>
            <Text style={styles.modalSubtext}>Leaving now will result in data loss.</Text>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalButtonSecondary} onPress={onDiscard}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonPrimary, isSaving && { opacity: 0.5 }]}
              onPress={onSave}
              disabled={isSaving || isWeekSubmitted}
            >
              {isSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.modalButtonText}>Save Draft</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const RowLimitModal = ({ visible, onClose, message }: any) => {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cannot Add Row</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={[styles.modalIcon, { backgroundColor: '#fef2f2' }]}>
              <AlertTriangle size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalText}>{message}</Text>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={onClose}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function TimesheetEntryScreen({ navigation }: { navigation: any }) {
  const route = useRoute();
  const params = route.params as any;
  const editId = params?.id;
  const initialDateStr = params?.date || params?.weekStart;

  // State
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (!initialDateStr) return new Date();
    try {
      const parts = initialDateStr.split(/[- /]/).map(Number);
      if (parts.length >= 3) return new Date(parts[0], parts[1] - 1, parts[2]);
      return new Date(initialDateStr);
    } catch { return new Date(); }
  });
  const [rows, setRows] = useState<Row[]>([
    { id: Date.now(), projectId: '', taskType: 'Select Task', dayHours: Array(7).fill('00:00'), dayMeta: Array(7).fill(null) }
  ]);
  const [isDirty, setIsDirty] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [tsSettings, setTsSettings] = useState<any>(null);
  const [fullSettings, setFullSettings] = useState<any>(null);
  const [weekLeaves, setWeekLeaves] = useState<any[]>([]);
  const [globalHolidays, setGlobalHolidays] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [existingTimesheets, setExistingTimesheets] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showRowLimitModal, setShowRowLimitModal] = useState(false);
  const [rowLimitMessage, setRowLimitMessage] = useState('');

  // Quick Fill States
  const [isRepeatLoading, setIsRepeatLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Dropdown states
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [currentRowId, setCurrentRowId] = useState<number | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [taskOptions, setTaskOptions] = useState<any[]>([]);

  // Memos
  const weekStartsOn = 1; // Monday
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Dynamic settings from backend (Unified from fullSettings)
  const timesheetSettings = fullSettings?.timesheet || tsSettings;
  const complianceSettings = fullSettings?.compliance || {};
  const generalSettings = fullSettings?.general || {};

  const maxHoursPerDay = 24;
  const minHoursPerDay = 8;
  const maxHoursPerWeek = timesheetSettings?.maxHoursPerWeek || 48;
  const workingHoursPerDay = generalSettings?.workingHoursPerDay || timesheetSettings?.workingHoursPerDay || 8;

  const leaveTaskTypes = timesheetSettings?.leaveTypes || DEFAULT_LEAVE_TYPES;
  const taskCategories = timesheetSettings?.taskCategories || DEFAULT_TASK_TYPES;

  const isAttendanceEnabled = useMemo(() => {
    if (!fullSettings?.hardwareGateways) return false;
    return Object.values(fullSettings.hardwareGateways).some((gw: any) => gw.enabled);
  }, [fullSettings]);

  // ─── Quick Fill Functions ─────────────────────────────────────────────────

  // Repeat Last Week
  const handleRepeatLastWeek = async () => {
    if (isWeekSubmitted) {
      Alert.alert('Error', 'Cannot modify a submitted week');
      return;
    }

    // Ensure user data is available
    let currentUserId = user?.id || user?._id;
    if (!currentUserId) {
      const userData = await loadUserData();
      currentUserId = userData?.id || userData?._id;
    }

    if (!currentUserId) {
      Alert.alert('Error', 'User information not found. Please log in again.');
      return;
    }

    setIsRepeatLoading(true);
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const lastWeekStart = addDays(weekStart, -7);
      const from = format(lastWeekStart, 'yyyy-MM-dd');
      const to = format(addDays(lastWeekStart, 6), 'yyyy-MM-dd');

      console.log(`Fetching last week timesheets from ${from} to ${to} for user ${currentUserId}`);
      const response = await timesheetAPI.getAll({ from, to, userId: currentUserId });
      const lastWeekTimesheets = extractData(response, []);

      if (!lastWeekTimesheets || lastWeekTimesheets.length === 0) {
        Alert.alert('Info', 'No timesheet found for last week to copy.');
        return;
      }

      const activeProjectIds = new Set((projects || []).map((p: any) => (p.id || p._id).toString()));
      const rowMap = new Map();

      lastWeekTimesheets.forEach((ts: any) => {
        if (!ts.rows) return;
        ts.rows.forEach((r: any) => {
          const pid = (r.projectId?._id || r.projectId?.id || r.projectId)?.toString();
          if (!pid || pid === 'LEAVE-SYS') return;

          // Allow copying even if project not in current "assigned" list, 
          // but we should ideally check if it still exists.
          // For now, we'll be permissive.

          const category = (r.category || r.taskType || 'Select Task').trim();
          const key = `${pid}-${category.toLowerCase()}`;
          if (rowMap.has(key)) return;

          const newDayHours = Array(7).fill('00:00');
          weekDays.forEach((day, i) => {
            if (day.getTime() > today.getTime()) return; // Only fill up to today

            const lastWeekDay = format(addDays(lastWeekStart, i), 'yyyy-MM-dd');
            const entry = r.entries?.find((e: any) => {
              try {
                const entryDate = typeof e.date === 'string' ? e.date.split('T')[0] : format(new Date(e.date), 'yyyy-MM-dd');
                return entryDate === lastWeekDay;
              } catch { return false; }
            });
            if (entry) {
              const h = Math.floor(entry.hoursWorked || 0);
              const m = Math.round(((entry.hoursWorked || 0) - h) * 60);
              newDayHours[i] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
          });

          rowMap.set(key, {
            id: Date.now() + Math.random(),
            projectId: pid,
            taskType: category,
            dayHours: newDayHours,
            dayMeta: Array(7).fill(null),
            isLeaveRow: false,
          });
        });
      });

      if (rowMap.size === 0) {
        Alert.alert('Info', 'No project rows found in last week to copy.');
        return;
      }

      const newRows = Array.from(rowMap.values());
      setRows(newRows);
      setIsDirty(true);
      Alert.alert('Success', `Copied ${newRows.length} project row${newRows.length > 1 ? 's' : ''} from last week. Don't forget to save!`);
    } catch (err) {
      console.error('Repeat last week failed:', err);
      Alert.alert('Error', 'Failed to load last weeks timesheet.');
    } finally {
      setIsRepeatLoading(false);
    }
  };

  // Fill Standard Hours
  const handleFillStandardHours = () => {
    if (isWeekSubmitted) {
      Alert.alert('Error', 'Cannot modify a submitted week');
      return;
    }

    let activeRowIndices = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => !r.isLeaveRow && !isPermissionRow(r.taskType));

    // If no active row, and we have a default empty row, use it
    if (activeRowIndices.length === 0 && rows.length === 1 && !rows[0].projectId) {
      activeRowIndices = [{ r: rows[0], idx: 0 }];
    }

    if (activeRowIndices.length === 0) {
      Alert.alert('Error', 'Add at least one project row before filling.');
      return;
    }

    const perRowHrs = workingHoursPerDay / activeRowIndices.length;
    const perRowH = Math.floor(perRowHrs);
    const perRowM = Math.round((perRowHrs - perRowH) * 60);
    const perRowStr = `${String(perRowH).padStart(2, '0')}:${String(perRowM).padStart(2, '0')}`;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let filledDays = 0;

    const newRows = rows.map((row, rowIdx) => {
      const isActive = activeRowIndices.some(({ idx }) => idx === rowIdx);
      if (!isActive) return { ...row };

      const newDayHours = [...row.dayHours];
      weekDays.forEach((day, i) => {
        if (!isWorkingDay(day)) return;
        if (day.getTime() > today.getTime()) return; // Only fill up to today
        if (lockedDays[i]) return;
        if (holidays.has(format(day, 'yyyy-MM-dd'))) return;

        const cur = newDayHours[i];
        if (!cur || cur === '00:00') {
          newDayHours[i] = perRowStr;
          if (rowIdx === activeRowIndices[0].idx) filledDays++;
        }
      });
      return { ...row, dayHours: newDayHours };
    });

    if (filledDays === 0) {
      Alert.alert('Info', 'All working days already have hours logged.');
      return;
    }

    setRows(newRows);
    setIsDirty(true);
    Alert.alert('Success', `Filled ${filledDays} day${filledDays > 1 ? 's' : ''} with ${workingHoursPerDay}h standard hours`);
  };

  // Auto-fill from Attendance
  const handleAutoFill = () => {
    if (isWeekSubmitted) {
      Alert.alert('Error', 'Cannot modify a submitted week');
      return;
    }

    const maxHrs = tsSettings?.maxHoursPerDay || 24;

    const attendanceByDate: Record<string, number> = {};
    if (attendanceLogs && attendanceLogs.length > 0) {
      attendanceLogs.forEach((log: any) => {
        if (!log.date && !log.workDate) return;
        const dateStr = log.date || log.workDate;
        const dateKey = typeof dateStr === 'string'
          ? dateStr.split('T')[0]
          : format(new Date(dateStr), 'yyyy-MM-dd');

        // Use netHours or hoursWorked, fallback to 0
        const net = parseFloat(log.netHours || log.hoursWorked || log.totalHours || 0);
        if (net > 0) {
          attendanceByDate[dateKey] = Math.min(net, maxHrs);
        }
      });
    }

    let activeRowIndices = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => !r.isLeaveRow && !isPermissionRow(r.taskType));

    // If no active row, and we have a default empty row, use it
    if (activeRowIndices.length === 0 && rows.length === 1 && !rows[0].projectId) {
      activeRowIndices = [{ r: rows[0], idx: 0 }];
    }

    if (activeRowIndices.length === 0) {
      Alert.alert('Error', 'Add at least one project row before auto-filling.');
      return;
    }

    let filledDays = 0;
    const newRows = rows.map(row => ({ ...row, dayHours: [...row.dayHours] }));

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    weekDays.forEach((day, i) => {
      if (!isWorkingDay(day)) return;
      if (day.getTime() > today.getTime()) return; // Only fill up to today
      if (lockedDays[i]) return;
      if (holidays.has(format(day, 'yyyy-MM-dd'))) return;

      const dateKey = format(day, 'yyyy-MM-dd');
      const hasAttendance = Object.keys(attendanceByDate).length > 0;

      let dailyTarget = 0;
      if (attendanceByDate[dateKey]) {
        dailyTarget = attendanceByDate[dateKey];
      } else {
        // Only use standard hours for past/current days if no attendance log found
        dailyTarget = workingHoursPerDay;
      }

      if (dailyTarget <= 0) return;

      const alreadyLogged = activeRowIndices.reduce((acc, { r }) => {
        const time = r.dayHours[i];
        if (!time || time === '00:00') return acc;
        const [h, m] = time.split(':').map(Number);
        return acc + h + (m / 60);
      }, 0);

      if (alreadyLogged > 0) return;

      const perRowHrs = dailyTarget / activeRowIndices.length;
      const perRowH = Math.floor(perRowHrs);
      const perRowM = Math.round((perRowHrs - perRowH) * 60);
      const perRowStr = `${String(perRowH).padStart(2, '0')}:${String(perRowM).padStart(2, '0')}`;

      activeRowIndices.forEach(({ idx }) => {
        newRows[idx].dayHours[i] = perRowStr;
      });
      filledDays++;
    });

    if (filledDays === 0) {
      Alert.alert('Info', 'All working days already have hours logged or no attendance data available.');
      return;
    }

    setRows(newRows);
    setIsDirty(true);
    const source = Object.keys(attendanceByDate).length > 0 ? 'attendance logs' : `${workingHoursPerDay}h daily limit`;
    Alert.alert('Success', `Auto-filled ${filledDays} day${filledDays > 1 ? 's' : ''} from ${source}`);
  };

  // Data Fetching
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        const parsedUser = {
          ...parsed,
          id: parsed.id || parsed._id,
          _id: parsed._id || parsed.id,
        };
        setUser(parsedUser);
        return parsedUser;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return null;
  };

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll({ status: 'active', assignedOnly: true });
      const data = extractData(response, []);
      setProjects(data);
      setProjectOptions(data.map((p: any) => ({ value: p.id || p._id, label: p.name })));
    } catch (error) { console.error('Error fetching projects:', error); }
  };

  const fetchTasks = async (currentUser?: any) => {
    try {
      const role = currentUser?.role || user?.role;
      const isAdmin = ['admin', 'super_admin', 'owner'].includes(role?.toLowerCase());
      const response = await taskAPI.getAll({ isActive: true, assignedOnly: !isAdmin });
      const data = extractData(response, []);
      setAllTasks(data);
    } catch (error) { console.error('Error fetching tasks:', error); }
  };

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getTimesheetSettings();
      setTsSettings(extractData(response));
    } catch (error) { console.error('Error fetching settings:', error); }
  };

  const fetchFullSettings = async () => {
    try {
      const response = await settingsAPI.getSettings();
      setFullSettings(extractData(response));
    } catch (error) { console.error('Error fetching full settings:', error); }
  };

  const fetchWeekLeaves = async () => {
    try {
      const from = format(weekStart, 'yyyy-MM-dd');
      const to = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const response = await leaveAPI.getAll({ from, to, limit: 100 });
      setWeekLeaves(extractData(response, []));
    } catch (error) { console.error('Error fetching week leaves:', error); }
  };

  const fetchGlobalHolidays = async () => {
    try {
      const from = format(weekStart, 'yyyy-MM-dd');
      const to = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const response = await calendarAPI.getAll({ from, to, eventType: 'holiday' });
      const data = extractData(response, []);
      setGlobalHolidays(data.filter((e: any) => e.isPublic));
    } catch (error) { console.error('Error fetching holidays:', error); }
  };

  const fetchAttendanceLogs = async () => {
    try {
      const response = await attendanceAPI.getAll({
        from: format(weekStart, 'yyyy-MM-dd'),
        to: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
      });
      setAttendanceLogs(extractData(response, []));
    } catch (error) { console.error('Error fetching attendance:', error); }
  };

  const fetchExistingTimesheets = async (currentUser?: any) => {
    try {
      if (editId) {
        const response = await timesheetAPI.getById(editId);
        const data = extractData(response);
        if (data) setExistingTimesheets([data]);
      } else {
        const userId = currentUser?.id || user?.id;
        if (!userId) return;
        const from = format(weekStart, 'yyyy-MM-dd');
        const to = format(addDays(weekStart, 6), 'yyyy-MM-dd');
        const response = await timesheetAPI.getAll({ from, to, userId });
        setExistingTimesheets(extractData(response, []));
      }
    } catch (error) { console.error('Error fetching timesheets:', error); }
  };

  const fetchAllData = async (currentUser?: any) => {
    setLoading(true);
    await Promise.all([
      fetchProjects(),
      fetchTasks(currentUser),
      fetchSettings(),
      fetchFullSettings(),
      fetchWeekLeaves(),
      fetchGlobalHolidays(),
      fetchAttendanceLogs(),
      fetchExistingTimesheets(currentUser),
    ]);
    setLoading(false);
  };

  // Refresh settings when backend notifies of changes
  useSocketEvent('settings_updated', (payload: any) => {
    console.log('[Socket] Settings updated event received in TimesheetEntryScreen:', payload);
    // Refresh timesheet-related settings so min/max/enforcement flags propagate
    fetchFullSettings();
    fetchSettings();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const loadedUser = await loadUserData();
        if (!active) return;
        await fetchAllData(loadedUser || user);
      };
      load();
      return () => { active = false; };
    }, [weekStart, editId, user?.id])
  );

  // Navigation Guard
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!isDirty) return;
      e.preventDefault();
      setShowUnsavedModal(true);
      setPendingNavigation(e.data.action.payload?.name || null);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  // Sync Logic
  useEffect(() => {
    if (!existingTimesheets.length && !weekLeaves.length) return;

    const rowMap = new Map();
    const leaveMetaArray = Array(7).fill(null);
    const leaveHoursArray = Array(7).fill('00:00');

    existingTimesheets.forEach((ts: any) => {
      if (!ts.rows) return;
      ts.rows.forEach((r: any) => {
        const pid = r.projectId?.id || r.projectId?._id || r.projectId;
        const projectIdStr = pid?.toString() || 'unknown';
        const category = (r.category || 'Select Task').trim();
        const projectCode = r.projectId?.code || projects?.find((p: any) => (p.id || p._id) === projectIdStr)?.code || '';
        const isSystemLeave = projectCode === 'LEAVE-SYS';

        if (isSystemLeave) {
          weekDays.forEach((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const entry = r.entries?.find((e: any) => {
              try { return format(new Date(e.date), 'yyyy-MM-dd') === dayStr; } catch { return false; }
            });
            if (entry) {
              const hoursVal = entry.hoursWorked || 0;
              const h = isLopType(category) ? 0 : Math.floor(hoursVal);
              const m = isLopType(category) ? 0 : Math.round((hoursVal - h) * 60);
              leaveMetaArray[i] = { type: category, isApproved: true };
              leaveHoursArray[i] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
          });
        } else {
          const key = `${projectIdStr}-${category.toLowerCase()}`;
          if (!rowMap.has(key)) {
            rowMap.set(key, {
              id: r.id || r._id || `temp-${Math.random()}`,
              projectId: pid,
              taskType: category,
              dayHours: Array(7).fill('00:00'),
              dayMeta: Array(7).fill(null),
              isLeaveRow: false,
            });
          }
          const targetRow = rowMap.get(key);
          weekDays.forEach((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const entry = r.entries?.find((e: any) => {
              try { return format(new Date(e.date), 'yyyy-MM-dd') === dayStr; } catch { return false; }
            });
            if (entry) {
              const hours = entry.hoursWorked || 0;
              const h = Math.floor(hours);
              const m = Math.round((hours - h) * 60);
              targetRow.dayHours[i] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
          });
        }
      });
    });

    weekLeaves.forEach((leave: any) => {
      const status = leave.status?.toLowerCase();
      if (status !== 'pending' && status !== 'approved') return;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const leaveHours = isLopType(leave.leaveType) ? 0 : (leave.isHalfDay ? workingHoursPerDay / 2 : workingHoursPerDay);
      const category = leave.leaveType?.charAt(0).toUpperCase() + leave.leaveType?.slice(1);

      weekDays.forEach((day, i) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const cur = new Date(day); cur.setHours(0, 0, 0, 0);
        const lStart = new Date(start); lStart.setHours(0, 0, 0, 0);
        const lEnd = new Date(end); lEnd.setHours(0, 0, 0, 0);

        if (cur >= lStart && cur <= lEnd && cur.getDay() !== 0 && cur.getDay() !== 6) {
          leaveMetaArray[i] = {
            type: `${category} (${status === 'pending' ? 'Pending' : 'Approved'})`,
            isPending: status === 'pending',
            isApproved: status === 'approved',
          };
          leaveHoursArray[i] = `${String(Math.floor(leaveHours)).padStart(2, '0')}:${String(Math.round((leaveHours % 1) * 60)).padStart(2, '0')}`;
        }
      });
    });

    let finalRows = Array.from(rowMap.values());
    if (finalRows.length === 0) {
      finalRows = [{ id: Date.now(), projectId: '', taskType: 'Select Task', dayHours: Array(7).fill('00:00'), dayMeta: Array(7).fill(null) }];
    }

    finalRows.forEach((row, rowIndex) => {
      row.dayMeta = [...leaveMetaArray];
      if (rowIndex === 0) {
        leaveHoursArray.forEach((h, i) => { if (leaveMetaArray[i]) row.dayHours[i] = h; });
      } else {
        leaveMetaArray.forEach((m, i) => { if (m) row.dayHours[i] = '00:00'; });
      }
    });

    setRows(finalRows);
    setIsDirty(false);
  }, [existingTimesheets, weekLeaves, weekDays, projects, workingHoursPerDay]);

  // Handlers
  const handleWeekChange = (offset: number) => {
    setCurrentDate(addDays(currentDate, offset * 7));
  };

  const handleAddPermission = () => {
    const alreadyHasPermission = rows.some(r => isPermissionRow(r.taskType));
    if (alreadyHasPermission) {
      Alert.alert('Error', 'Only one permission row is allowed per week.');
      return;
    }
    setRows(prevRows => [...prevRows, {
      id: Date.now(),
      projectId: PERMISSION_ROW_MARKER,
      taskType: PERMISSION_ROW_MARKER,
      dayHours: Array(7).fill('00:00'),
      dayMeta: Array(7).fill(null),
      isLeaveRow: false
    }]);
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const maxRows = timesheetSettings?.maxRowsPerWeek || 20;
    const currentWorkRows = rows.filter(r => !r.isLeaveRow && !isPermissionRow(r.taskType));
    if (currentWorkRows.length >= maxRows) {
      setRowLimitMessage(`Maximum ${maxRows} project rows allowed per week.`);
      setShowRowLimitModal(true);
      return;
    }
    const hasEmptyRow = rows.some(r => !r.isLeaveRow && !isPermissionRow(r.taskType) && (r.projectId === '' || r.taskType === 'Select Task'));
    if (hasEmptyRow) {
      Alert.alert('Error', 'Please complete the existing empty row first');
      return;
    }
    setRows(prevRows => [...prevRows, { id: Date.now(), projectId: '', taskType: 'Select Task', dayHours: Array(7).fill('00:00'), dayMeta: Array(7).fill(null) }]);
    setIsDirty(true);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payloads = rows.filter(r => r.projectId && !r.isLeaveRow && r.projectId !== 'LEAVE-SYS' && !isPermissionRow(r.taskType)).map(row => ({
        projectId: row.projectId,
        category: row.taskType,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        entries: weekDays.filter(day => isWorkingDay(day)).map((day) => {
          const i = weekDays.indexOf(day);
          const isLeaveCell = row.dayMeta && (row.dayMeta[i]?.isPending || row.dayMeta[i]?.isApproved);
          const isFullDay = isLeaveCell && row.dayMeta[i]?.isFullDay;
          let hoursWorked = 0;
          if (!isFullDay) {
            const [hStr, mStr] = row.dayHours[i].split(':');
            const h = parseInt(hStr, 10) || 0;
            const m = parseInt(mStr, 10) || 0;
            hoursWorked = h + (m / 60);
          }
          return { date: format(day, 'yyyy-MM-dd'), hoursWorked };
        })
      }));
      if (payloads.length > 0) await timesheetAPI.bulkUpsert(payloads);
      Alert.alert('Success', 'Timesheets saved successfully');
      setIsDirty(false);
      fetchExistingTimesheets();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitWeek = async () => {
    if (!isSubmitAllowed) {
      if (isTimesheetFrozen) {
        Alert.alert('Validation Error', 'This timesheet is frozen and cannot be submitted.');
      } else {
        Alert.alert('Validation Error', `The submission deadline (${submissionDeadlineName}) has passed. You can no longer submit this timesheet.`);
      }
      return;
    }

    // Organization Policy Enforcement
    if (timesheetSettings?.enforceMinHoursOnSubmit) {
      // 1. Check Daily Minimums
      for (let i = 0; i < 7; i++) {
        if (!isWorkingDay(weekDays[i])) continue;
        if (holidays.has(format(weekDays[i], 'yyyy-MM-dd'))) continue;

        const dayTotal = calculateDayTotal(i);
        if (dayTotal > 0 && dayTotal < minHoursPerDay) {
          Alert.alert(
            'Policy Violation',
            `Daily minimum not met for ${format(weekDays[i], 'EEEE')}. You have logged ${formatHours(dayTotal)} but organizational policy requires a minimum of ${minHoursPerDay} hours.`
          );
          return;
        }
      }

      // 2. Check Weekly Maximum
      if (totalWeekHours > maxHoursPerWeek) {
        Alert.alert(
          'Policy Violation',
          `Weekly maximum exceeded. You have logged ${formatHours(totalWeekHours)} but organizational policy limits weekly entries to ${maxHoursPerWeek} hours.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloads = rows.filter(r => r.projectId && !r.isLeaveRow && r.projectId !== 'LEAVE-SYS' && !isPermissionRow(r.taskType)).map(row => ({
        projectId: row.projectId,
        category: row.taskType,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        entries: weekDays.filter(day => isWorkingDay(day)).map((day) => {
          const i = weekDays.indexOf(day);
          const isLeaveCell = row.dayMeta && (row.dayMeta[i]?.isPending || row.dayMeta[i]?.isApproved);
          const isFullDay = isLeaveCell && row.dayMeta[i]?.isFullDay;
          let hoursWorked = 0;
          if (!isFullDay) {
            const [hStr, mStr] = row.dayHours[i].split(':');
            const h = parseInt(hStr, 10) || 0;
            const m = parseInt(mStr, 10) || 0;
            hoursWorked = h + (m / 60);
          }
          return { date: format(day, 'yyyy-MM-dd'), hoursWorked };
        })
      }));
      await timesheetAPI.bulkSubmit(payloads);
      Alert.alert('Success', 'Week submitted for approval');
      setIsDirty(false);
      fetchExistingTimesheets();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndNavigate = async () => {
    await handleSaveDraft();
    setShowUnsavedModal(false);
    if (pendingNavigation) navigation.navigate(pendingNavigation);
  };

  const handleDiscardAndNavigate = () => {
    setIsDirty(false);
    setShowUnsavedModal(false);
    if (pendingNavigation) navigation.navigate(pendingNavigation);
  };

  const handleRemoveRow = (id: number) => {
    const workRows = rows.filter(r => !r.isLeaveRow);
    if (workRows.length === 1 && workRows[0].id === id) {
      Alert.alert('Error', 'Cannot delete the last project row');
      return;
    }
    setRows(prevRows => prevRows.filter(r => r.id !== id));
    setIsDirty(true);
  };

  const handleUpdateRow = (id: number, updates: Record<string, any>) => {
    setRows(prevRows => prevRows.map(r => {
      if (r.id !== id) return r;
      setIsDirty(true);
      return { ...r, ...updates };
    }));
  };

  const handleUpdateHour = (rowId: number, dayIndex: number, value: string) => {
    const [hStr, mStr] = value.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const newEntryHours = h + (m / 60);

    if (newEntryHours > 24) {
      Alert.alert('Error', 'Individual entry cannot exceed 24 hours');
      return;
    }

    const targetRow = rows.find(r => r.id === rowId);
    if (!targetRow) return;

    if (isPermissionRow(targetRow.taskType)) {
      const permissionMaxHoursPerDay = timesheetSettings?.permissionMaxHoursPerDay || 2;
      const permissionMaxDaysPerWeek = timesheetSettings?.permissionMaxDaysPerWeek || 1;

      if (newEntryHours > permissionMaxHoursPerDay) {
        Alert.alert('Policy Violation', `Permission hours cannot exceed ${permissionMaxHoursPerDay} hours per day.`);
        return;
      }
      
      if (newEntryHours > 0) {
        let daysWithPermission = 0;
        targetRow.dayHours.forEach((time, idx) => {
          if (idx !== dayIndex && time && time !== '00:00') {
             const [rh, rm] = time.split(':').map(Number);
             if (rh > 0 || rm > 0) daysWithPermission++;
          }
        });
        if (daysWithPermission + 1 > permissionMaxDaysPerWeek) {
          Alert.alert('Policy Violation', `You can only request permission for up to ${permissionMaxDaysPerWeek} days per week.`);
          return;
        }
      }
    }

    // Calculate daily total including this new value
    const otherRowsTotal = rows.reduce((acc, row) => {
      if (row.id === rowId) return acc;
      const time = row.dayHours[dayIndex];
      const [rh, rm] = (time || '00:00').split(':').map(Number);
      return acc + rh + (rm / 60);
    }, 0);

    if (otherRowsTotal + newEntryHours > maxHoursPerDay) {
      Alert.alert('Policy Violation', `Total hours for ${format(weekDays[dayIndex], 'EEEE')} cannot exceed ${maxHoursPerDay} hours as per organization policy.`);
      return;
    }

    setRows(prevRows => prevRows.map(r => {
      if (r.id !== rowId || r.isLeaveRow) return r;
      const newHours = [...r.dayHours];
      newHours[dayIndex] = value;
      setIsDirty(true);
      return { ...r, dayHours: newHours };
    }));
  };

  // Dropdown Handlers
  const handleOpenProjectPicker = (rowId: number) => {
    setCurrentRowId(rowId);
    setShowProjectPicker(true);
  };

  const handleSelectProject = (projectId: string) => {
    if (currentRowId) {
      handleUpdateRow(currentRowId, { projectId, taskType: 'Select Task' });

      const projectTasks = allTasks.filter((t: any) => (t.projectId?.id || t.projectId?._id || t.projectId) === projectId);
      const globalTasks = (taskCategories as string[]).filter((t: string) => !projectTasks.some((pt: any) => pt.name === t));
      const allTaskOptions = [
        ...projectTasks.map((t: any) => ({ value: t.name, label: t.name })),
        ...globalTasks.map((t: string) => ({ value: t, label: t }))
      ];
      setTaskOptions(allTaskOptions);
    }
  };

  const handleOpenTaskPicker = (rowId: number, projectId: string) => {
    if (!projectId) {
      Alert.alert('Error', 'Please select a project first');
      return;
    }
    setCurrentRowId(rowId);
    setCurrentProjectId(projectId);

    const projectTasks = allTasks.filter((t: any) => (t.projectId?.id || t.projectId?._id || t.projectId) === projectId);
    const globalTasks = (taskCategories as string[]).filter((t: string) => !projectTasks.some((pt: any) => pt.name === t));
    const options = [
      ...projectTasks.map((t: any) => ({ value: t.name, label: t.name })),
      ...globalTasks.map((t: string) => ({ value: t, label: t }))
    ];
    setTaskOptions(options);
    setShowTaskPicker(true);
  };

  const handleSelectTask = (taskName: string) => {
    if (currentRowId) {
      handleUpdateRow(currentRowId, { taskType: taskName });
    }
  };

  const calculateRowTotal = (row: any) => {
    return row.dayHours.reduce((acc: number, time: string) => {
      if (!time || time === '-8') return acc;
      const [h, m] = time.split(':').map(Number);
      return acc + h + (m / 60);
    }, 0);
  };

  const totalWeekHours = useMemo(() => rows.reduce((acc, row) => acc + calculateRowTotal(row), 0), [rows]);

  const isWeekSubmitted = useMemo(() => {
    const weekStr = format(weekStart, 'yyyy-MM-dd');
    const currentWeekTs = existingTimesheets?.find(t => {
      const tsDate = typeof t.weekStartDate === 'string' ? t.weekStartDate.split('T')[0] : format(new Date(t.weekStartDate), 'yyyy-MM-dd');
      return tsDate === weekStr;
    });
    return currentWeekTs ? ['submitted', 'approved', 'frozen', 'admin_filled'].includes(currentWeekTs.status?.toLowerCase()) : false;
  }, [existingTimesheets, weekStart]);



  const autoLockDeadlineStr = useMemo(() => timesheetSettings?.freezeTimesheet || complianceSettings?.autoFreezeTimesheets || 'Monday 18:00', [complianceSettings, timesheetSettings]);
  const weeklyDeadlineStr = useMemo(() => timesheetSettings?.submissionDeadline || 'Friday 18:00', [timesheetSettings]);

  const isTimesheetFrozen = useMemo(() => {
    const weekStr = format(weekStart, 'yyyy-MM-dd');
    const currentWeekTs = existingTimesheets?.find(t => {
      const tsDate = typeof t.weekStartDate === 'string' ? t.weekStartDate.split('T')[0] : format(new Date(t.weekStartDate), 'yyyy-MM-dd');
      return tsDate === weekStr;
    });
    if (currentWeekTs?.status?.toLowerCase() === 'frozen') return true;

    const [dayName, timeStr] = autoLockDeadlineStr.trim().split(/\s+/);
    const daysMap: Record<string, number> = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
    const targetDayIndex = daysMap[dayName?.toLowerCase()] ?? 1;

    const wsd = fullSettings?.general?.weekStartDay || 'monday';
    const isMondayStart = wsd.toLowerCase() === 'monday';
    let offset = isMondayStart ? (targetDayIndex === 0 ? 6 : targetDayIndex - 1) : targetDayIndex;

    // If the lock day is Mon/Tue/Wed, it refers to the NEXT week. If Thu/Fri/Sat/Sun, it refers to THIS week.
    const lockDaysOffset = offset <= 2 ? 7 + offset : offset;

    const lockDate = addDays(weekStart, lockDaysOffset);
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      lockDate.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
      lockDate.setHours(23, 59, 59, 999);
    }

    return new Date() > lockDate;
  }, [existingTimesheets, weekStart, autoLockDeadlineStr, fullSettings]);

  const isRowLocked = (row: any) => {
    if (row.isLeaveRow || isPermissionRow(row.taskType)) return false;
    if (isTimesheetFrozen) return true;
    const weekStr = format(weekStart, 'yyyy-MM-dd');
    const currentWeekTs = existingTimesheets?.find(t => {
      const tsDate = typeof t.weekStartDate === 'string' ? t.weekStartDate.split('T')[0] : format(new Date(t.weekStartDate), 'yyyy-MM-dd');
      return tsDate === weekStr;
    });
    return currentWeekTs ? ['submitted', 'approved', 'frozen', 'admin_filled'].includes(currentWeekTs.status?.toLowerCase()) : false;
  };

  const holidays = useMemo(() => {
    const holidaySet = new Set();
    globalHolidays.forEach((event: any) => {
      let curr = new Date(event.startDate);
      const end = new Date(event.endDate);
      while (curr <= end) {
        holidaySet.add(format(curr, 'yyyy-MM-dd'));
        curr = addDays(curr, 1);
      }
    });
    return holidaySet;
  }, [globalHolidays]);

  const lockedDays = useMemo(() => {
    const locked = Array(7).fill(false);
    rows.forEach(row => {
      row.dayMeta?.forEach((meta: any, i: number) => {
        if (meta && meta.isFullDay) locked[i] = true;
      });
    });
    return locked;
  }, [rows]);

  const isWorkingDay = (date: Date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const calculateDayTotal = (dayIndex: number) => rows.reduce((acc, row) => {
    const time = row.dayHours[dayIndex];
    if (!time || time === '-8') return acc;
    const [h, m] = time.split(':').map(Number);
    return acc + h + (m / 60);
  }, 0);

  const getSwipeHoursForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const logsForDay = attendanceLogs
      .filter((log: any) => {
        try {
          return format(new Date(log.timestamp), 'yyyy-MM-dd') === dayStr;
        } catch {
          return false;
        }
      })
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (logsForDay.length === 0) return '—';

    let totalMs = 0;
    let currentCheckIn: number | null = null;

    logsForDay.forEach((log: any) => {
      const type = log.type?.toLowerCase();
      const time = new Date(log.timestamp).getTime();
      if (type === 'check-in') {
        if (currentCheckIn === null) {
          currentCheckIn = time;
        }
      } else if (type === 'check-out') {
        if (currentCheckIn !== null) {
          totalMs += (time - currentCheckIn);
          currentCheckIn = null;
        }
      }
    });

    if (totalMs === 0) {
      const checkIns = logsForDay.filter((l: any) => l.type?.toLowerCase() === 'check-in');
      const checkOuts = logsForDay.filter((l: any) => l.type?.toLowerCase() === 'check-out');
      if (checkIns.length > 0 && checkOuts.length > 0) {
        const firstIn = new Date(checkIns[0].timestamp).getTime();
        const lastOut = new Date(checkOuts[checkOuts.length - 1].timestamp).getTime();
        if (lastOut > firstIn) {
          totalMs = lastOut - firstIn;
        }
      }
    }

    if (totalMs <= 0) return '—';

    const totalHours = totalMs / (1000 * 60 * 60);
    return formatHours(totalHours);
  };

  const submissionDeadlineName = useMemo(() => {
    const deadline = timesheetSettings?.submissionDeadline || 'Friday 18:00';
    const dayName = deadline.toLowerCase().split(' ')[0];
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  }, [timesheetSettings]);

  const isSubmitAllowed = useMemo(() => {
    if (isTimesheetFrozen) return false;
    const deadline = timesheetSettings?.submissionDeadline || 'Friday 18:00';
    const targetDayName = deadline.toLowerCase().split(' ')[0];
    const daysMap: Record<string, number> = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
    const targetDayIndex = daysMap[targetDayName] ?? 5;

    const wsd = fullSettings?.general?.weekStartDay || 'monday';
    const isMondayStart = wsd.toLowerCase() === 'monday';
    let offset = isMondayStart ? (targetDayIndex === 0 ? 6 : targetDayIndex - 1) : targetDayIndex;

    const deadlineDate = addDays(weekStart, offset);
    deadlineDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today <= deadlineDate;
  }, [weekStart, timesheetSettings, fullSettings, isTimesheetFrozen]);

  const hasActiveRows = useMemo(() => {
    return rows.some(r => !r.isLeaveRow && !isPermissionRow(r.taskType) && r.projectId && r.taskType !== 'Select Task');
  }, [rows]);

  if (loading && !refreshing) return <LoadingSpinner />;

  return (
    <Layout
      title="Timesheet Entry"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Quick Fill Suggestions Panel */}
          <QuickFillSuggestions
            visible={showSuggestions && !isWeekSubmitted && !isTimesheetFrozen}
            onClose={() => setShowSuggestions(false)}
            onRepeatLastWeek={handleRepeatLastWeek}
            onFillStandardHours={handleFillStandardHours}
            onAutoFill={handleAutoFill}
            isRepeatLoading={isRepeatLoading}
            isWeekSubmitted={isWeekSubmitted}
            workingHoursPerDay={workingHoursPerDay}
            isRepeatDisabled={false}
            isFillDisabled={rows.length === 0}
            isAutoFillDisabled={rows.length === 0}
          />

          {/* Re-open suggestions button */}
          {!showSuggestions && !isWeekSubmitted && !isTimesheetFrozen && (
            <TouchableOpacity style={styles.reopenSuggestionsButton} onPress={() => setShowSuggestions(true)}>
              <Sparkles size={14} color="#6366f1" />
              <Text style={styles.reopenSuggestionsText}>Quick Fill</Text>
            </TouchableOpacity>
          )}

          {/* Timesheet Frozen Banner */}
          {isTimesheetFrozen && (
            <View style={styles.frozenBannerContainer}>
              <View style={styles.frozenBannerContent}>
                <View style={styles.frozenBannerHeader}>
                  <AlertTriangle size={16} color="#e11d48" />
                  <Text style={styles.frozenBannerTitle}>Timesheet Frozen</Text>
                </View>
                <Text style={styles.frozenBannerText}>
                  This timesheet week has been frozen — the submission deadline ({weeklyDeadlineStr}) has passed and no further edits are allowed. (Auto-lock: {autoLockDeadlineStr})
                </Text>
                <Text style={styles.frozenBannerText}>
                  Please raise a Help & Support ticket so the admin can assist you.
                </Text>
              </View>
              <TouchableOpacity style={styles.raiseTicketButton} onPress={() => navigation.navigate('Incidents' as never)}>
                <Text style={styles.raiseTicketButtonText}>Raise Ticket</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Header Section */}
          <View style={styles.headerContainer}>
            <View style={styles.navWrapper}>
              <TouchableOpacity onPress={() => handleWeekChange(-1)} style={styles.navButton}>
                <ChevronLeft size={16} color="#64748b" />
              </TouchableOpacity>
              <View style={styles.weekInfo}>
                <Calendar size={14} color="#6366f1" />
                <Text style={styles.weekMonthText}>{format(weekStart, 'MMMM yyyy')}</Text>
                <View style={styles.navDivider} />
                <Text style={styles.weekSubTextItalic}>Week: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')} (Week {getWeek(weekStart)})</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleWeekChange(1)}
                disabled={isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))}
                style={[styles.navButton, isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) && styles.navButtonDisabled]}
              >
                <ChevronRight size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerControls}>
              <View style={styles.deadlineBadge}>
                <Clock size={14} color="#64748b" />
                <Text style={styles.deadlineText}>DEADLINE: <Text style={styles.deadlineTextBold}>{weeklyDeadlineStr}</Text></Text>
              </View>

              <TouchableOpacity
                onPress={() => setCurrentDate(new Date())}
                style={styles.currentWeekButton}
              >
                <Calendar size={14} color="white" />
                <Text style={styles.currentWeekButtonText}>CURRENT WEEK</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View style={styles.mainCardHeaderTop}>
                <Text style={styles.cardTitle}>Week Entry</Text>
                <View style={[styles.statusBadge, isWeekSubmitted ? styles.statusBadgeSubmitted : styles.statusBadgeDraft]}>
                  <Text style={[styles.statusBadgeText, isWeekSubmitted ? styles.statusBadgeTextSubmitted : styles.statusBadgeTextDraft]}>
                    {isWeekSubmitted ? 'Submitted' : 'Draft'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.cardButton, styles.projectButton]}
                  onPress={handleAddRow}
                  disabled={isWeekSubmitted}
                >
                  <Plus size={12} color="#4f46e5" />
                  <Text style={styles.projectButtonText}>ADD PROJECT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardButton, styles.permissionButton]}
                  onPress={handleAddPermission}
                  disabled={isWeekSubmitted}
                >
                  <Plus size={12} color="#7c3aed" />
                  <Text style={styles.permissionButtonText}>ADD PERMISSION</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardButton, styles.saveButton]}
                  onPress={handleSaveDraft}
                  disabled={isSaving || isWeekSubmitted}
                >
                  {isSaving ? <ActivityIndicator size="small" color="#475569" /> : <Save size={12} color="#475569" />}
                  <Text style={styles.saveButtonText}>SAVE DRAFT</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.headerSno]}>S.NO</Text>
                    <Text style={[styles.headerCell, styles.headerProject]}>PROJECT NAME</Text>
                    <Text style={[styles.headerCell, styles.headerTask]}>TASK / LEAVE TYPE</Text>
                    {weekDays.map((day, i) => {
                      if (!isWorkingDay(day)) return null;
                      const dayTotal = calculateDayTotal(i);
                      const isLowHours = dayTotal > 0 && dayTotal < minHoursPerDay;
                      return (
                        <View key={i} style={[styles.headerCell, styles.headerDay]}>
                          <Text style={styles.dayName}>{format(day, 'EEE')}</Text>
                          <Text style={styles.dayDate}>{format(day, 'MMM d')}</Text>
                          {isLowHours && (
                            <View style={styles.lowHoursBadge}>
                              <AlertTriangle size={8} color="#ea580c" />
                              <Text style={styles.lowHoursText}>LOW HOURS</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    <Text style={[styles.headerCell, styles.headerTotal]}>WORK HOURS</Text>
                    <Text style={[styles.headerCell, styles.headerAction]}>ACTION</Text>
                  </View>

                  {rows.map((row, index) => (
                    <TimesheetRow
                      key={row.id}
                      row={row}
                      index={index}
                      weekDays={weekDays}
                      projects={projects}
                      allTasks={allTasks}
                      tsSettings={tsSettings}
                      leaveTaskTypes={leaveTaskTypes}
                      isRowLocked={isRowLocked}
                      lockedDays={lockedDays}
                      holidays={holidays}
                      onUpdateRow={handleUpdateRow}
                      onUpdateHour={handleUpdateHour}
                      onRemoveRow={handleRemoveRow}
                      isWorkingDay={isWorkingDay}
                      workingHoursPerDay={workingHoursPerDay}
                      onOpenProjectPicker={handleOpenProjectPicker}
                      onOpenTaskPicker={handleOpenTaskPicker}
                    />
                  ))}

                  {/* Swipe Hours Row */}
                  <View style={styles.swipeRowContainer}>
                    <View style={styles.swipeLabelCell}>
                      <Text style={styles.swipeLabelText}>Office Presence (Swipe Hours)</Text>
                      <Info size={14} color="#64748b" style={{ marginLeft: scale(6) }} />
                    </View>
                    {weekDays.map((day, i) => {
                      if (!isWorkingDay(day)) return null;
                      return (
                        <View key={i} style={[styles.cell, styles.cellHour, styles.swipeValueCell]}>
                          <Text style={styles.swipeValueText}>{getSwipeHoursForDay(day)}</Text>
                        </View>
                      );
                    })}
                    <View style={[styles.cell, styles.cellTotal, styles.swipeValueCell]}>
                      <Text style={styles.swipeValueText}>—</Text>
                    </View>
                    <View style={[styles.cell, styles.cellAction, styles.swipeValueCell]}>
                      <Text style={styles.swipeValueText} />
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Footer Stats */}
          <View style={styles.footerStats}>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Total Week Hours:</Text>
              <Text style={styles.statsValue}>{formatHours(totalWeekHours)}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Working Days:</Text>
              <Text style={styles.statsValue}>{workingHoursPerDay}h/day</Text>
            </View>
          </View>

          {/* Policy Info */}
          <View style={styles.policyInfoContainer}>
            <View style={styles.policyRow}>
              <View style={[styles.policyDot, { backgroundColor: '#f87171' }]} />
              <Text style={styles.policyText}>
                Daily Limit: <Text style={styles.policyBold}>{maxHoursPerDay} hrs</Text>
              </Text>
            </View>
            <View style={styles.policyRow}>
              <View style={[styles.policyDot, { backgroundColor: '#fbbf24' }]} />
              <Text style={styles.policyText}>
                Permission: <Text style={styles.policyBold}>{timesheetSettings?.permissionMaxHoursPerDay || 2} hrs/day</Text>
                <Text style={styles.policySubtext}>  ({timesheetSettings?.permissionMaxDaysPerWeek || 1} d/week max)  / ({timesheetSettings?.permissionMaxDaysPerMonth || 4} d/month max)</Text>
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (isWeekSubmitted || isSubmitting || !isSubmitAllowed) && styles.submitButtonDisabled]}
            onPress={handleSubmitWeek}
            disabled={isWeekSubmitted || isSubmitting || !isSubmitAllowed}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Send size={18} color="white" />
                <Text style={styles.submitButtonText}>
                  {isWeekSubmitted ? 'Week Submitted' : (!isSubmitAllowed ? `Cannot Submit Before ${submissionDeadlineName}` : `Submit Week (${formatHours(totalWeekHours)})`)}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Attendance Card */}
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
              <Clock size={16} color="#6366f1" />
              <Text style={styles.attendanceTitle}>Office Swipe Integration</Text>
            </View>
            <Text style={styles.attendanceText}>
              {isAttendanceEnabled
                ? "Biometric attendance integration is active. Your swipe hours are automatically synced."
                : "Attendance device integration is not configured. Contact your administrator."
              }
            </Text>
            <View style={[styles.attendanceStatus, isAttendanceEnabled ? styles.statusActive : styles.statusInactive]}>
              <Text style={styles.attendanceStatusText}>Status: {isAttendanceEnabled ? 'Active' : 'Not Configured'}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Hours</Text>
          <Text style={styles.summaryValue}>{formatHours(totalWeekHours)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Projects</Text>
          <Text style={styles.summaryValue}>{rows.filter(r => !r.isLeaveRow && r.projectId && !isPermissionRow(r.taskType)).length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={[styles.summaryValue, isWeekSubmitted && { color: '#10b981' }]}>
            {isWeekSubmitted ? 'Submitted' : 'Draft'}
          </Text>
        </View>
      </View>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
        options={projectOptions}
        selectedValue={currentRowId ? rows.find(r => r.id === currentRowId)?.projectId : ''}
        onSelect={handleSelectProject}
        title="Select Project"
      />

      <DropdownModal
        visible={showTaskPicker}
        onClose={() => setShowTaskPicker(false)}
        options={taskOptions}
        selectedValue={currentRowId ? rows.find(r => r.id === currentRowId)?.taskType : ''}
        onSelect={handleSelectTask}
        title="Select Task"
      />

      {/* Modals */}
      <UnsavedChangesModal
        visible={showUnsavedModal}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onClose={() => setShowUnsavedModal(false)}
        isSaving={isSaving}
        isWeekSubmitted={isWeekSubmitted}
      />
      <RowLimitModal visible={showRowLimitModal} onClose={() => setShowRowLimitModal(false)} message={rowLimitMessage} />

      {(isSaving || isSubmitting) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ marginTop: verticalScale(12), color: '#64748b' }}>{isSaving ? 'Saving...' : 'Submitting...'}</Text>
        </View>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  // Quick Fill Suggestions
  suggestionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#e0e7ff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(4),
    elevation: 2,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  suggestionsIconContainer: {
    width: scale(32),
    height: verticalScale(32),
    borderRadius: scale(10),
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  suggestionsTitleContainer: {
    flex: 1,
  },
  suggestionsTitle: {
    fontSize: moderateScale(13),
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  suggestionsSubtitle: {
    fontSize: moderateScale(9),
    color: '#6366f1',
    marginTop: verticalScale(1),
  },
  suggestionsClose: {
    padding: scale(6),
  },
  suggestionsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
    flex: 1,
    minWidth: scale(100),
    justifyContent: 'center',
  },
  suggestionButtonDisabled: {
    opacity: 0.5,
  },
  repeatButton: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  repeatButtonText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#4f46e5',
  },
  standardButton: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  standardButtonText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#7c3aed',
  },
  attendanceButton: {
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
  },
  attendanceButtonText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#059669',
  },
  reopenSuggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: scale(4),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: '#f1f5f9',
    borderRadius: scale(20),
    marginRight: scale(16),
    marginBottom: verticalScale(8),
  },
  reopenSuggestionsText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#6366f1',
  },

  // Frozen Banner
  frozenBannerContainer: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#ffe4e6',
    borderRadius: scale(8),
    padding: scale(12),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(16),
    flexDirection: 'column',
  },
  frozenBannerContent: {
    marginBottom: verticalScale(10),
  },
  frozenBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  frozenBannerTitle: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: '#e11d48',
    marginLeft: scale(6),
  },
  frozenBannerText: {
    fontSize: moderateScale(12),
    color: '#be123c',
    marginBottom: verticalScale(4),
    lineHeight: verticalScale(18),
  },
  raiseTicketButton: {
    backgroundColor: '#e11d48',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  raiseTicketButtonText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },

  // Header
  headerContainer: {
    marginHorizontal: scale(16),
    marginBottom: verticalScale(16),
    marginTop: verticalScale(8),
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  navWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: scale(24),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(8),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: scale(2),
  },
  navButton: { padding: scale(6), borderRadius: scale(20), backgroundColor: '#f8fafc' },
  navButtonDisabled: { opacity: 0.5 },
  weekInfo: { flexDirection: 'row', alignItems: 'center', marginHorizontal: scale(8), gap: scale(8) },
  weekMonthText: { fontSize: moderateScale(13), fontWeight: 'bold', color: '#1e293b' },
  navDivider: { width: scale(1), height: verticalScale(16), backgroundColor: '#cbd5e1' },
  weekSubTextItalic: { fontSize: moderateScale(12), color: '#64748b', fontStyle: 'italic' },

  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(24),
    gap: scale(6),
  },
  deadlineText: {
    fontSize: moderateScale(12),
    color: '#475569',
  },
  deadlineTextBold: {
    fontWeight: 'bold',
    color: '#334155',
  },

  currentWeekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#6366f1',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(24),
    elevation: 2,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: scale(4),
  },
  currentWeekButtonText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },

  // Main Card
  mainCard: {
    backgroundColor: 'white',
    borderRadius: scale(16),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(4),
    overflow: 'hidden',
  },
  mainCardHeader: {
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'column',
    gap: scale(12),
  },
  mainCardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(12),
    borderWidth: 1,
  },
  statusBadgeDraft: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statusBadgeSubmitted: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
  },
  statusBadgeTextDraft: {
    color: '#1d4ed8',
  },
  statusBadgeTextSubmitted: {
    color: '#047857',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    width: '100%',
  },
  cardButton: {
    flex: 1,
    minWidth: scale(105),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
  },
  projectButton: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  projectButtonText: {
    color: '#4f46e5',
    fontWeight: 'bold',
    fontSize: moderateScale(10),
  },
  permissionButton: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  permissionButtonText: {
    color: '#7c3aed',
    fontWeight: 'bold',
    fontSize: moderateScale(10),
  },
  saveButton: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  saveButtonText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: moderateScale(10),
  },

  // Table
  tableContainer: {
    backgroundColor: 'white',
  },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerCell: { paddingVertical: verticalScale(12), paddingHorizontal: scale(8), fontSize: moderateScale(10), fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', justifyContent: 'center' },
  headerSno: { width: scale(50), textAlign: 'center' },
  headerProject: { width: scale(180) },
  headerTask: { width: scale(180) },
  headerDay: { width: scale(90), alignItems: 'center', justifyContent: 'center' },
  headerTotal: { width: scale(100), textAlign: 'center' },
  headerAction: { width: scale(70), textAlign: 'center' },
  dayName: { fontSize: moderateScale(11), fontWeight: 'bold', color: '#1e293b' },
  dayDate: { fontSize: moderateScale(9), color: '#94a3b8', marginTop: verticalScale(2) },
  lowHoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: scale(20),
    paddingVertical: verticalScale(2),
    paddingHorizontal: scale(8),
    marginTop: verticalScale(4),
  },
  lowHoursText: {
    fontSize: moderateScale(8),
    fontWeight: 'bold',
    color: '#ea580c',
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  permissionRow: { backgroundColor: '#fefce8' },
  cell: { paddingVertical: verticalScale(10), paddingHorizontal: scale(8), justifyContent: 'center' },
  cellSno: { width: scale(50), alignItems: 'center' },
  snoText: { fontSize: moderateScale(13), color: '#64748b' },
  cellProject: { width: scale(180) },
  cellTask: { width: scale(180) },
  cellHour: { width: scale(90), alignItems: 'center' },
  cellTotal: { width: scale(100), alignItems: 'center' },
  cellAction: { width: scale(70), alignItems: 'center' },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: scale(12), paddingHorizontal: scale(12), paddingVertical: verticalScale(10), backgroundColor: '#f8fafc', height: verticalScale(44) },
  selectButtonText: { fontSize: moderateScale(12), color: '#1e293b', flex: 1 },
  placeholderText: { color: '#94a3b8' },
  permissionCell: { backgroundColor: '#fef3c7', padding: scale(8), borderRadius: scale(8) },
  permissionText: { fontSize: moderateScale(12), fontWeight: '600', color: '#854d0e' },
  leaveCell: { backgroundColor: '#ecfdf5', padding: scale(8), borderRadius: scale(8), borderWidth: 1, borderColor: '#d1fae5' },
  leaveText: { fontSize: moderateScale(12), fontWeight: '600', color: '#10b981' },
  hourInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: scale(12), backgroundColor: '#f8fafc', width: scale(75), height: verticalScale(40) },
  hourInput: { width: scale(25), textAlign: 'center', fontSize: moderateScale(13), fontWeight: '500', padding: 0, backgroundColor: 'transparent', color: '#1e293b' },
  hourInputDisabled: { opacity: 0.5 },
  hourSeparator: { fontSize: moderateScale(13), fontWeight: '500', color: '#94a3b8', paddingHorizontal: scale(2) },
  cellNormal: { backgroundColor: 'white' },
  cellDisabled: { backgroundColor: '#f1f5f9', opacity: 0.5 },
  cellPending: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7' },
  cellApproved: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#d1fae5' },
  cellHoliday: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe' },
  cellLopPending: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2' },
  cellLopApproved: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2' },
  lopText: { fontSize: moderateScale(13), fontWeight: 'bold', color: '#ef4444' },
  leaveCellText: { fontSize: moderateScale(8), marginTop: verticalScale(2), textAlign: 'center' },
  totalHours: { fontSize: moderateScale(14), fontWeight: 'bold', color: '#22c55e' },
  leaveTotalHours: { color: '#10b981' },
  deleteButtonContainer: { width: scale(32), height: verticalScale(32), borderRadius: scale(16), backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  deleteButtonDisabled: { backgroundColor: '#f1f5f9' },
  swipeRowContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#f8fafc', height: verticalScale(50) },
  swipeLabelCell: { width: scale(410), flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16) },
  swipeLabelText: { fontSize: moderateScale(12), fontWeight: '600', color: '#334155' },
  swipeValueCell: { justifyContent: 'center', alignItems: 'center' },
  swipeValueText: { fontSize: moderateScale(12), color: '#64748b', fontWeight: '500' },
  footerStats: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: scale(16), marginBottom: verticalScale(16), padding: scale(12), backgroundColor: 'white', borderRadius: scale(12), borderWidth: 1, borderColor: '#e2e8f0' },
  statsRow: { flexDirection: 'row', gap: scale(8) },
  statsLabel: { fontSize: moderateScale(12), color: '#64748b' },
  statsValue: { fontSize: moderateScale(12), fontWeight: 'bold', color: '#1e293b' },
  policyInfoContainer: { marginHorizontal: scale(16), marginBottom: verticalScale(16), gap: scale(6) },
  policyRow: { flexDirection: 'row', alignItems: 'center' },
  policyDot: { width: scale(6), height: verticalScale(6), borderRadius: scale(3), marginRight: scale(8) },
  policyText: { fontSize: moderateScale(11), color: '#64748b' },
  policyBold: { fontWeight: '700', color: '#334155' },
  policySubtext: { color: '#94a3b8' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), backgroundColor: '#6366f1', marginHorizontal: scale(16), marginBottom: verticalScale(16), paddingVertical: verticalScale(14), borderRadius: scale(12) },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: moderateScale(14), fontWeight: 'bold', color: 'white' },
  attendanceCard: { marginHorizontal: scale(16), marginBottom: verticalScale(20), padding: scale(16), backgroundColor: 'white', borderRadius: scale(16), borderWidth: 1, borderColor: '#e2e8f0' },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(8) },
  attendanceTitle: { fontSize: moderateScale(13), fontWeight: 'bold', color: '#1e293b' },
  attendanceText: { fontSize: moderateScale(11), color: '#64748b', marginBottom: verticalScale(12), lineHeight: verticalScale(16) },
  attendanceStatus: { alignSelf: 'flex-start', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(20) },
  statusActive: { backgroundColor: '#ecfdf5' },
  statusInactive: { backgroundColor: '#fef2f2' },
  attendanceStatusText: { fontSize: moderateScale(10), fontWeight: 'bold' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: verticalScale(12), backgroundColor: '#f8fafc', borderRadius: scale(12), marginHorizontal: scale(16), marginBottom: verticalScale(16) },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: moderateScale(10), color: '#64748b', marginBottom: verticalScale(4) },
  summaryValue: { fontSize: moderateScale(14), fontWeight: 'bold', color: '#1e293b' },
  summaryDivider: { width: 1, height: verticalScale(30), backgroundColor: '#e2e8f0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: scale(24), width: '85%', maxWidth: scale(400), overflow: 'hidden' },
  dropdownModal: { backgroundColor: 'white', borderRadius: scale(24), width: '90%', maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(20), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: moderateScale(18), fontWeight: 'bold', color: '#1e293b' },
  modalContent: { padding: scale(20), alignItems: 'center' },
  modalIcon: { width: scale(64), height: verticalScale(64), borderRadius: scale(32), backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(16) },
  modalText: { fontSize: moderateScale(14), color: '#475569', textAlign: 'center', marginBottom: verticalScale(8) },
  modalSubtext: { fontSize: moderateScale(12), color: '#94a3b8', textAlign: 'center', marginBottom: verticalScale(20) },
  modalFooter: { flexDirection: 'row', gap: scale(12), padding: scale(20), borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  modalButtonPrimary: { flex: 1, paddingVertical: verticalScale(12), borderRadius: scale(12), alignItems: 'center', backgroundColor: '#6366f1' },
  modalButtonSecondary: { flex: 1, paddingVertical: verticalScale(12), borderRadius: scale(12), alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: 'white' },
  modalButtonTextSecondary: { color: '#64748b' },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingVertical: verticalScale(14), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownOptionSelected: { backgroundColor: '#eff6ff' },
  dropdownOptionText: { fontSize: moderateScale(15), color: '#1e293b' },
  dropdownOptionTextSelected: { color: '#6366f1', fontWeight: '600' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
});