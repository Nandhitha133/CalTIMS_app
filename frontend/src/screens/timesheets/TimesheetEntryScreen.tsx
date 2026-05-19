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
  Calendar,
  AlertTriangle,
  Clock,
  X,
  Briefcase,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
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
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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
    const [h, m] = time.split(':').map(Number);
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
            <Text style={[styles.selectButtonText, !row.projectId && styles.placeholderText]}>
              {row.projectId ? getProjectName(row.projectId) : 'Select Project'}
            </Text>
            <Briefcase size={16} color="#64748b" />
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
            <Text style={[styles.selectButtonText, row.taskType === 'Select Task' && styles.placeholderText]}>
              {getTaskName(row.taskType)}
            </Text>
            <ChevronRight size={16} color="#64748b" />
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
              <View style={styles.hourInputContainer}>
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
                />
                <Text style={styles.hourSeparator}>:</Text>
                <TextInput
                  style={[styles.hourInput, isDisabledInput && styles.hourInputDisabled]}
                  value={row.dayHours[dayIdx].split(':')[1]}
                  onChangeText={(text) => {
                    let m = parseInt(text.replace(/\D/g, ''), 10) || 0;
                    if (m > 59) m = 59;
                    const h = row.dayHours[dayIdx].split(':')[0] || '00';
                    onUpdateHour(row.id, dayIdx, `${h}:${String(m).padStart(2, '0')}`);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor="#94a3b8"
                  editable={!isDisabledInput}
                  onBlur={() => {
                    let m = parseInt(row.dayHours[dayIdx].split(':')[1], 10) || 0;
                    if (m > 59) m = 59;
                    const h = row.dayHours[dayIdx].split(':')[0] || '00';
                    onUpdateHour(row.id, dayIdx, `${h}:${String(m).padStart(2, '0')}`);
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
          <TouchableOpacity onPress={() => onRemoveRow(row.id)} disabled={isRowLocked(row)}>
            <Trash2 size={18} color={isRowLocked(row) ? '#cbd5e1' : '#ef4444'} />
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
  const workingHoursPerDay = tsSettings?.workingHoursPerDay || 8;
  const leaveTaskTypes = tsSettings?.leaveTypes || DEFAULT_LEAVE_TYPES;
  const taskCategories = tsSettings?.taskCategories || DEFAULT_TASK_TYPES;

  const isAttendanceEnabled = useMemo(() => {
    if (!fullSettings?.hardwareGateways) return false;
    return Object.values(fullSettings.hardwareGateways).some((gw: any) => gw.enabled);
  }, [fullSettings]);

  // Data Fetching
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) { console.error('Error loading user data:', error); }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll({ status: 'active', assignedOnly: true });
      const data = extractData(response, []);
      setProjects(data);
      setProjectOptions(data.map((p: any) => ({ value: p.id || p._id, label: p.name })));
    } catch (error) { console.error('Error fetching projects:', error); }
  };

  const fetchTasks = async () => {
    try {
      const isAdmin = ['admin', 'super_admin', 'owner'].includes(user?.role?.toLowerCase());
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

  const fetchExistingTimesheets = async () => {
    try {
      if (editId) {
        const response = await timesheetAPI.getById(editId);
        const data = extractData(response);
        if (data) setExistingTimesheets([data]);
      } else {
        const from = format(weekStart, 'yyyy-MM-dd');
        const to = format(addDays(weekStart, 6), 'yyyy-MM-dd');
        const response = await timesheetAPI.getAll({ from, to, userId: user?.id });
        setExistingTimesheets(extractData(response, []));
      }
    } catch (error) { console.error('Error fetching timesheets:', error); }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProjects(),
      fetchTasks(),
      fetchSettings(),
      fetchFullSettings(),
      fetchWeekLeaves(),
      fetchGlobalHolidays(),
      fetchAttendanceLogs(),
      fetchExistingTimesheets(),
    ]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchAllData();
    }, [weekStart, editId])
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
    const maxRows = tsSettings?.maxRowsPerWeek || 20;
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
        entries: weekDays.map((day, i) => {
          const isLeaveCell = row.dayMeta && (row.dayMeta[i]?.isPending || row.dayMeta[i]?.isApproved);
          const isFullDay = isLeaveCell && row.dayMeta[i]?.isFullDay;
          let hoursWorked = 0;
          if (!isFullDay) {
            const [h, m] = row.dayHours[i].split(':').map(Number);
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
    setIsSubmitting(true);
    try {
      const payloads = rows.filter(r => r.projectId && !r.isLeaveRow && r.projectId !== 'LEAVE-SYS' && !isPermissionRow(r.taskType)).map(row => ({
        projectId: row.projectId,
        category: row.taskType,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        entries: weekDays.map((day, i) => {
          const isLeaveCell = row.dayMeta && (row.dayMeta[i]?.isPending || row.dayMeta[i]?.isApproved);
          const isFullDay = isLeaveCell && row.dayMeta[i]?.isFullDay;
          let hoursWorked = 0;
          if (!isFullDay) {
            const [h, m] = row.dayHours[i].split(':').map(Number);
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
    if (parseInt(hStr, 10) + (parseInt(mStr, 10) / 60) > 24) {
      Alert.alert('Error', 'Individual entry cannot exceed 24 hours');
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

      // Update task options for this row
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

  const isRowLocked = (row: any) => {
    if (row.isLeaveRow || isPermissionRow(row.taskType)) return false;
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>


          <View style={styles.navContainer}>
            <TouchableOpacity onPress={() => handleWeekChange(-1)} style={styles.navButton}>
              <ChevronLeft size={20} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.weekInfo}>
              <Calendar size={16} color="#6366f1" />
              <Text style={styles.weekDate}>
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </Text>
              <Text style={styles.weekNumber}>Week {getWeek(weekStart)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleWeekChange(1)}
              disabled={isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))}
              style={[styles.navButton, isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) && styles.navButtonDisabled]}
            >
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.addButton]} onPress={handleAddRow} disabled={isWeekSubmitted}>
              <Plus size={16} color="white" />
              <Text style={styles.actionButtonText}>Add Project</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.permissionButton]} onPress={handleAddPermission} disabled={isWeekSubmitted}>
              <Clock size={16} color="white" />
              <Text style={styles.actionButtonText}>Add Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSaveDraft} disabled={isSaving || isWeekSubmitted}>
              {isSaving ? <ActivityIndicator size="small" color="white" /> : <Save size={16} color="white" />}
              <Text style={styles.actionButtonText}>Save Draft</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.headerSno]}>#</Text>
                  <Text style={[styles.headerCell, styles.headerProject]}>Project Name</Text>
                  <Text style={[styles.headerCell, styles.headerTask]}>Task / Leave Type</Text>
                  {weekDays.map((day, i) => isWorkingDay(day) && (
                    <View key={i} style={[styles.headerCell, styles.headerDay]}>
                      <Text style={styles.dayName}>{format(day, 'EEE')}</Text>
                      <Text style={styles.dayDate}>{format(day, 'MMM d')}</Text>
                    </View>
                  ))}
                  <Text style={[styles.headerCell, styles.headerTotal]}>Hours</Text>
                  <Text style={[styles.headerCell, styles.headerAction]}>Action</Text>
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
              </View>
            </ScrollView>
          </View>

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

          <TouchableOpacity
            style={[styles.submitButton, (isWeekSubmitted || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmitWeek}
            disabled={isWeekSubmitted || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Send size={18} color="white" />
                <Text style={styles.submitButtonText}>
                  {isWeekSubmitted ? 'Week Submitted' : `Submit Week (${formatHours(totalWeekHours)})`}
                </Text>
              </>
            )}
          </TouchableOpacity>

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
          <Text style={{ marginTop: 12, color: '#64748b' }}>{isSaving ? 'Saving...' : 'Submitting...'}</Text>
        </View>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navButton: { padding: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  navButtonDisabled: { opacity: 0.5 },
  weekInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekDate: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  weekNumber: { fontSize: 11, color: '#64748b', marginLeft: 4 },

  actionButtons: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  addButton: { backgroundColor: '#6366f1' },
  permissionButton: { backgroundColor: '#f59e0b' },
  saveButton: { backgroundColor: '#64748b' },
  actionButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },

  tableContainer: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerCell: { paddingVertical: 12, paddingHorizontal: 8, fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  headerSno: { width: 40, textAlign: 'center' },
  headerProject: { width: 160 },
  headerTask: { width: 140 },
  headerDay: { width: 80, alignItems: 'center' },
  headerTotal: { width: 70, textAlign: 'center' },
  headerAction: { width: 50, textAlign: 'center' },
  dayName: { fontSize: 11, fontWeight: 'bold' },
  dayDate: { fontSize: 9, color: '#94a3b8' },

  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  permissionRow: { backgroundColor: '#fefce8' },
  cell: { paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center' },
  cellSno: { width: 40, alignItems: 'center' },
  snoText: { fontSize: 13, color: '#64748b' },
  cellProject: { width: 160 },
  cellTask: { width: 140 },
  cellHour: { width: 80, alignItems: 'center' },
  cellTotal: { width: 70, alignItems: 'center' },
  cellAction: { width: 50, alignItems: 'center' },

  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f8fafc' },
  selectButtonText: { fontSize: 12, color: '#1e293b', flex: 1 },
  placeholderText: { color: '#94a3b8' },
  permissionCell: { backgroundColor: '#fef3c7', padding: 8, borderRadius: 8 },
  permissionText: { fontSize: 12, fontWeight: '600', color: '#854d0e' },
  disabledCell: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, opacity: 0.7 },
  disabledText: { fontSize: 12, color: '#64748b' },
  leaveCell: { backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1fae5' },
  leaveText: { fontSize: 12, fontWeight: '600', color: '#10b981' },

  hourInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  hourInput: { width: 30, textAlign: 'center', fontSize: 13, fontWeight: '500', padding: 4, backgroundColor: 'transparent' },
  hourInputDisabled: { opacity: 0.5 },
  hourSeparator: { fontSize: 13, fontWeight: '500', color: '#64748b' },

  cellNormal: { backgroundColor: '#f8fafc', borderRadius: 8 },
  cellDisabled: { backgroundColor: '#f1f5f9', borderRadius: 8, opacity: 0.5 },
  cellPending: { backgroundColor: '#fffbeb', borderRadius: 8, borderWidth: 1, borderColor: '#fef3c7' },
  cellApproved: { backgroundColor: '#ecfdf5', borderRadius: 8, borderWidth: 1, borderColor: '#d1fae5' },
  cellHoliday: { backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#dbeafe' },
  cellLopPending: { backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2' },
  cellLopApproved: { backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2' },
  lopText: { fontSize: 13, fontWeight: 'bold', color: '#ef4444' },
  leaveCellText: { fontSize: 8, marginTop: 2, textAlign: 'center' },

  totalHours: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  leaveTotalHours: { color: '#10b981' },

  footerStats: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 16, padding: 12, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statsLabel: { fontSize: 12, color: '#64748b' },
  statsValue: { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },

  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f1', marginHorizontal: 16, marginBottom: 16, paddingVertical: 14, borderRadius: 12 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 14, fontWeight: 'bold', color: 'white' },

  attendanceCard: { marginHorizontal: 16, marginBottom: 20, padding: 16, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  attendanceTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  attendanceText: { fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 16 },
  attendanceStatus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusActive: { backgroundColor: '#ecfdf5' },
  statusInactive: { backgroundColor: '#fef2f2' },
  attendanceStatusText: { fontSize: 10, fontWeight: 'bold', color: '#10b981' },

  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8fafc', borderRadius: 12, marginHorizontal: 16, marginBottom: 16 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: '#64748b', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 24, width: '85%', maxWidth: 400, overflow: 'hidden' },
  dropdownModal: { backgroundColor: 'white', borderRadius: 24, width: '90%', maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  modalContent: { padding: 20, alignItems: 'center' },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalText: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 8 },
  modalSubtext: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  modalButtonPrimary: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366f1' },
  modalButtonSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalButtonText: { fontSize: 14, fontWeight: '600', color: 'white' },
  modalButtonTextSecondary: { color: '#64748b' },

  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownOptionSelected: { backgroundColor: '#eff6ff' },
  dropdownOptionText: { fontSize: 15, color: '#1e293b' },
  dropdownOptionTextSelected: { color: '#6366f1', fontWeight: '600' },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
});