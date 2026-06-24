// screens/timesheets/TimesheetComplianceScreen.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  FlatList,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfWeek, subDays, addDays, isAfter, isBefore } from 'date-fns';
import RNFS from 'react-native-fs';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase,
  Edit3,
  X,
  Save,
  AlertTriangle,
  Search,
  ShieldCheck,
  Plus,
  Trash2,
  Filter,
  CheckCircle,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react-native';
import { timesheetAPI, projectAPI, settingsAPI, taskAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import ProGuard from '../../components/common/ProGuard';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';


interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  department?: string;
  organizationId?: string;
}

interface ComplianceItem {
  user: User;
  status: 'missing' | 'frozen' | 'admin_filled' | 'draft' | 'submitted' | 'approved' | 'rejected';
  totalHours: number;
}

interface Project {
  _id: string;
  id: string;
  name: string;
  code: string;
  startDate?: string;
  onlyProjectTasks?: boolean;
}

interface Task {
  _id: string;
  id: string;
  name: string;
  projectId?: string;
}

interface Row {
  id: string;
  projectId: string;
  taskType: string;
  dayHours: string[];
}

const DEFAULT_TASK_TYPES = ['Development', 'Bug Fixing', 'Design', 'Meeting', 'Documentation', 'Testing', 'Code Review', 'Deployment'];

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'missing':
        return { bg: '#f1f5f9', text: '#64748b', label: 'Missing', icon: null };
      case 'frozen':
        return { bg: '#fef2f2', text: '#ef4444', label: 'Frozen', icon: <AlertTriangle size={10} color="#ef4444" /> };
      case 'admin_filled':
        return { bg: '#eff6ff', text: '#3b82f6', label: 'Admin Filled', icon: <CheckCircle size={10} color="#3b82f6" /> };
      case 'submitted':
        return { bg: '#fef3c7', text: '#d97706', label: 'Submitted', icon: <Clock size={10} color="#d97706" /> };
      case 'approved':
        return { bg: '#ecfdf5', text: '#10b981', label: 'Approved', icon: <CheckCircle size={10} color="#10b981" /> };
      case 'rejected':
        return { bg: '#fef2f2', text: '#ef4444', label: 'Rejected', icon: <AlertTriangle size={10} color="#ef4444" /> };
      default:
        return { bg: '#f1f5f9', text: '#64748b', label: status, icon: null };
    }
  };

  const config = getStatusConfig();
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

// Compliance Card Component
const ComplianceCard = ({
  item,
  onFill,
  theme
}: {
  item: ComplianceItem;
  onFill: () => void;
  theme: 'light' | 'dark';
}) => {
  const canFill = item.status === 'missing' || item.status === 'frozen';

  return (
    <View style={[styles.card, {
      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
      borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
    }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.user.name || '?').charAt(0)}</Text>
          </View>
          <View>
            <Text style={[styles.employeeName, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
              {item.user.name}
            </Text>
            <Text style={styles.employeeId}>ID: {item.user.employeeId || '—'}</Text>
            <Text style={styles.department}>{item.user.department || '—'}</Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.hoursContainer}>
          <Clock size={14} color={theme === 'dark' ? '#94a3b8' : '#64748b'} />
          <Text style={[styles.hoursText, { color: theme === 'dark' ? '#cbd5e1' : '#475569' }]}>
            Total: {item.totalHours?.toFixed(2) || 0}h
          </Text>
        </View>

        {canFill && (
          <TouchableOpacity style={styles.fillButton} onPress={onFill}>
            <Edit3 size={14} color="#3b82f6" />
            <Text style={styles.fillButtonText}>Fill Timesheet</Text>
          </TouchableOpacity>
        )}

        {item.status === 'admin_filled' && (
          <Text style={styles.resolvedText}>✓ Resolved by Admin</Text>
        )}
      </View>
    </View>
  );
};

// Fill Timesheet Modal Component
const FillModal = ({
  visible,
  onClose,
  user: selectedUser,
  weekStart,
  weekDays,
  projects,
  tasks,
  taskCategories,
  onSave,
  isSaving,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  weekStart: Date;
  weekDays: Date[];
  projects: Project[];
  tasks: Task[];
  taskCategories: string[];
  onSave: (rows: Row[]) => Promise<void>;
  isSaving: boolean;
  theme: 'light' | 'dark';
}) => {
  const [rows, setRows] = useState<Row[]>([{
    id: Date.now().toString(),
    projectId: '',
    taskType: 'Development',
    dayHours: Array(7).fill('00:00')
  }]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerOptions, setPickerOptions] = useState<{ label: string; value: string }[]>([]);
  const [pickerValue, setPickerValue] = useState<string>('');
  const [onPickerSelect, setOnPickerSelect] = useState<(val: string) => void>(() => { });

  useEffect(() => {
    if (visible) {
      setRows([{
        id: Date.now().toString(),
        projectId: '',
        taskType: 'Development',
        dayHours: Array(7).fill('00:00')
      }]);
    }
  }, [visible]);

  const handleAddRow = () => {
    setRows([...rows, {
      id: Date.now().toString(),
      projectId: '',
      taskType: 'Development',
      dayHours: Array(7).fill('00:00')
    }]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      Alert.alert('Error', 'Cannot remove the last row');
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const handleUpdateRow = (id: string, field: keyof Row, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleUpdateHour = (rowId: string, dayIndex: number, value: string) => {
    // Only allow numeric input
    const hours = value.replace(/\D/g, '').slice(0, 2);

    setRows(rows.map(r => {
      if (r.id !== rowId) return r;
      const newHours = [...r.dayHours];
      const currentM = r.dayHours[dayIndex].split(':')[1] || '00';

      // Store exactly what they typed to allow empty strings/clearing
      newHours[dayIndex] = `${hours}:${currentM}`;
      return { ...r, dayHours: newHours };
    }));
  };

  const handleFillRowStandardHours = (rowId: string) => {
    setRows(rows.map(r => {
      if (r.id !== rowId) return r;
      const newDayHours = [...r.dayHours];
      weekDays.forEach((day, i) => {
        // Simple Mon-Fri check
        const isWorkDay = day.getDay() !== 0 && day.getDay() !== 6;
        const isFutureDate = format(day, 'yyyy-MM-dd') > format(new Date(), 'yyyy-MM-dd');
        if (isWorkDay && !isDayBeforeProjectStart(day, r.projectId) && !isFutureDate) {
          newDayHours[i] = '08:00';
        }
      });
      return { ...r, dayHours: newDayHours };
    }));
  };

  const handleSave = () => {
    const validRows = rows.filter(r => r.projectId);
    if (validRows.length === 0) {
      Alert.alert('Error', 'Please add at least one valid project row');
      return;
    }
    onSave(rows);
  };

  const getFilteredTasks = (projectId: string) => {
    const project = projects.find(p => p.id === projectId || p._id === projectId);
    const projectTasks = tasks.filter(t => t.projectId === projectId);

    if (project?.onlyProjectTasks && projectTasks.length > 0) {
      return projectTasks;
    }
    return taskCategories;
  };

  const isDayBeforeProjectStart = (day: Date, projectId: string) => {
    const project = projects.find(p => p.id === projectId || p._id === projectId);
    if (!project?.startDate) return false;
    const projectStart = new Date(project.startDate);
    projectStart.setHours(0, 0, 0, 0);
    return isBefore(day, projectStart);
  };

  const openProjectPicker = (rowId: string, currentValue: string) => {
    setPickerTitle('Select Project');
    setPickerOptions(projects.map(p => ({ label: p.name || p.code, value: String(p.id || p._id) })));
    setPickerValue(currentValue);
    setOnPickerSelect(() => (val: string) => {
      handleUpdateRow(rowId, 'projectId', val);
    });
    setPickerVisible(true);
  };

  const openTaskPicker = (rowId: string, projectId: string, currentValue: string) => {
    const filteredTasks = getFilteredTasks(projectId);
    setPickerTitle('Select Task');
    setPickerOptions(filteredTasks.map(t => {
      const name = typeof t === 'string' ? t : t.name;
      return { label: name, value: name };
    }));
    setPickerValue(currentValue);
    setOnPickerSelect(() => (val: string) => {
      handleUpdateRow(rowId, 'taskType', val);
    });
    setPickerVisible(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
          <View style={modalStyles.header}>
            <View>
              <Text style={[modalStyles.title, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
                Fill Timesheet
              </Text>
              <Text style={modalStyles.subtitle}>
                {selectedUser?.name} • {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} contentContainerStyle={{ width: scale(600), flexDirection: 'column' }}>
              <View style={[modalStyles.content, { width: scale(600) }]}>
                {/* Header Row */}
                <View style={modalStyles.tableHeader}>
                  <Text style={[modalStyles.headerCell, modalStyles.projectCell]}>Project</Text>
                  <Text style={[modalStyles.headerCell, modalStyles.taskCell]}>Task</Text>
                  {weekDays.map((day, i) => (
                    <View key={i} style={[modalStyles.headerCell, modalStyles.dayCell]}>
                      <Text style={modalStyles.dayName}>{format(day, 'EEE')}</Text>
                      <Text style={modalStyles.dayNumber}>{format(day, 'dd')}</Text>
                    </View>
                  ))}
                  <View style={[modalStyles.headerCell, modalStyles.actionCell]}>
                    <Text style={modalStyles.dayName}>⚡</Text>
                  </View>
                </View>

                {/* Rows */}
                {rows.map((row, idx) => {
                  const projectObj = projects.find(p => String(p.id || p._id) === row.projectId);
                  return (
                    <View key={row.id} style={modalStyles.tableRow}>
                      <View style={[modalStyles.cell, modalStyles.projectCell]}>
                        <TouchableOpacity
                          style={[modalStyles.selectWrapper, { backgroundColor: theme === 'dark' ? '#334155' : '#f8fafc', height: verticalScale(40), justifyContent: 'center' }]}
                          onPress={() => openProjectPicker(row.id, row.projectId)}
                        >
                          <Text style={[modalStyles.selectInputText, { color: theme === 'dark' ? '#ffffff' : (row.projectId ? '#1e293b' : '#94a3b8') }]} numberOfLines={1}>
                            {projectObj ? projectObj.name : 'Select Project'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={[modalStyles.cell, modalStyles.taskCell]}>
                        <TouchableOpacity
                          style={[modalStyles.selectWrapper, { backgroundColor: theme === 'dark' ? '#334155' : '#f8fafc', height: verticalScale(40), justifyContent: 'center' }]}
                          onPress={() => openTaskPicker(row.id, row.projectId, row.taskType)}
                        >
                          <Text style={[modalStyles.selectInputText, { color: theme === 'dark' ? '#ffffff' : (row.taskType ? '#1e293b' : '#94a3b8') }]} numberOfLines={1}>
                            {row.taskType || 'Select Task'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {weekDays.map((day, dayIdx) => {
                        const isFutureDate = format(day, 'yyyy-MM-dd') > format(new Date(), 'yyyy-MM-dd');
                        const isDisabled = isDayBeforeProjectStart(day, row.projectId) || isFutureDate;
                        return (
                          <View key={dayIdx} style={[modalStyles.cell, modalStyles.dayCell]}>
                            <TextInput
                              style={[
                                modalStyles.hourInput,
                                isDisabled && modalStyles.hourInputDisabled,
                                { backgroundColor: theme === 'dark' ? '#334155' : '#f8fafc', color: theme === 'dark' ? '#ffffff' : '#1e293b' }
                              ]}
                              value={row.dayHours[dayIdx].split(':')[0]}
                              onChangeText={(text) => handleUpdateHour(row.id, dayIdx, text)}
                              keyboardType="numeric"
                              maxLength={2}
                              placeholder="00"
                              placeholderTextColor="#94a3b8"
                              editable={!isDisabled}
                            />
                          </View>
                        );
                      })}

                      <View style={[modalStyles.cell, modalStyles.actionCell]}>
                        <TouchableOpacity
                          style={modalStyles.rowActionBtn}
                          onPress={() => handleFillRowStandardHours(row.id)}
                        >
                          <Zap size={14} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={modalStyles.rowActionBtn}
                          onPress={() => handleRemoveRow(row.id)}
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                <TouchableOpacity style={modalStyles.addButton} onPress={handleAddRow}>
                  <Plus size={16} color="#3b82f6" />
                  <Text style={modalStyles.addButtonText}>Add Another Row</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </ScrollView>

          <View style={modalStyles.footer}>
            <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
              <Text style={modalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.saveButton, isSaving && modalStyles.disabledButton]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Save size={16} color="white" />
                  <Text style={modalStyles.saveButtonText}>Save as Admin Fill</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Picker Selector Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={modalStyles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[modalStyles.pickerContent, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
            <View style={[modalStyles.pickerHeader, { borderBottomColor: theme === 'dark' ? '#334155' : '#f1f5f9' }]}>
              <Text style={[modalStyles.pickerHeaderTitle, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
                {pickerTitle}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    modalStyles.pickerOptionItem,
                    item.value === pickerValue && modalStyles.pickerSelectedOption
                  ]}
                  onPress={() => {
                    onPickerSelect(item.value);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={[
                    modalStyles.pickerOptionText,
                    { color: theme === 'dark' ? '#cbd5e1' : '#475569' },
                    item.value === pickerValue && modalStyles.pickerSelectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={modalStyles.pickerListContent}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

// Success Modal Component
const SuccessModal = ({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: 'light' | 'dark' }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={successModalStyles.overlay}>
      <View style={[successModalStyles.container, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
        <View style={successModalStyles.iconWrapper}>
          <CheckCircle2 size={56} color="#10b981" />
        </View>
        <Text style={[successModalStyles.title, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
          Success!
        </Text>
        <Text style={successModalStyles.message}>
          Timesheet has been filled and recorded successfully by Admin.
        </Text>
        <TouchableOpacity style={successModalStyles.doneButton} onPress={onClose}>
          <Text style={successModalStyles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function TimesheetComplianceScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [complianceData, setComplianceData] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => subDays(new Date(), 7));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCategories, setTaskCategories] = useState<string[]>(DEFAULT_TASK_TYPES);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const limit = 10;

  const weekStartsOn = 1; // Monday
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadPreferences();
      fetchProjects();
      fetchTasks();
      fetchTaskCategories();
      fetchComplianceData();
    }, [weekStart, page])
  );

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2 || searchQuery.trim().length === 0) {
        fetchComplianceData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Frontend-side filtering for instant results without reloading
  const filteredComplianceData = useMemo(() => {
    if (!searchQuery.trim()) return complianceData;
    const term = searchQuery.trim().toLowerCase();

    return complianceData.filter(item => {
      const nameMatch = (item.user?.name || '').toLowerCase().includes(term);
      const emailMatch = (item.user?.email || '').toLowerCase().includes(term);
      const employeeIdMatch = (item.user?.employeeId || '').toLowerCase().includes(term);
      const departmentMatch = (item.user?.department || '').toLowerCase().includes(term);
      const statusMatch = (item.status || '').toLowerCase().includes(term);

      return nameMatch || emailMatch || employeeIdMatch || departmentMatch || statusMatch;
    });
  }, [complianceData, searchQuery]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem('dashboard_preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setTheme(prefs.theme || 'light');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll({ status: 'active' });
      const data = (response as any)?.data || [];
      setProjects(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await taskAPI.getAll({ isActive: true });
      const data = (response as any)?.data || [];
      setTasks(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTaskCategories = async () => {
    try {
      const response = await settingsAPI.getTimesheetSettings();
      const data = (response as any)?.data || {};
      const categories = data.taskCategories || data.data?.taskCategories;
      if (categories && categories.length > 0) {
        setTaskCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching task categories:', error);
    }
  };

  const fetchUserProjects = async (userId: string) => {
    try {
      const response = await projectAPI.getAll({ status: 'active', assignedOnly: true, userId });
      const data = (response as any)?.data || [];
      setUserProjects(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  const fetchUserTasks = async (userId: string, orgId?: string) => {
    try {
      const response = await taskAPI.getAll({ isActive: true, assignedOnly: false, organizationId: orgId });
      const data = (response as any)?.data || [];
      setUserTasks(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    }
  };

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const response = await timesheetAPI.getCompliance({
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        search: searchQuery,
        page,
        limit,
      });
      const data = (response as any)?.data;
      const pagination = (response as any)?.pagination;

      setComplianceData(Array.isArray(data) ? data : data?.data || []);
      setTotalPages(pagination?.totalPages || 1);
      setTotalResults(pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      Alert.alert('Error', 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchComplianceData(), fetchProjects(), fetchTasks()]);
    setRefreshing(false);
  };

  const handleWeekChange = (offset: number) => {
    const newDate = addDays(currentDate, offset * 7);
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn });

    if (offset > 0 && startOfWeek(newDate, { weekStartsOn }) > currentWeekStart) {
      Alert.alert('Info', 'Cannot navigate to future weeks');
      return;
    }
    setCurrentDate(newDate);
    setPage(1);
  };

  const handleOpenModal = async (item: ComplianceItem) => {
    setSelectedUser(item.user);
    await Promise.all([
      fetchUserProjects(item.user._id || item.user.id),
      fetchUserTasks(item.user._id || item.user.id, item.user.organizationId)
    ]);
    setShowModal(true);
  };

  const handleSaveAdminFill = async (rows: Row[]) => {
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      const validRows = rows.filter(r => r.projectId);
      const payloadRows = validRows.map(row => ({
        projectId: row.projectId,
        category: row.taskType,
        weekStartDate: format(weekStart, 'yyyy-MM-dd'),
        entries: weekDays.map((day, i) => {
          const [hStr, mStr] = row.dayHours[i].split(':');
          const h = parseInt(hStr || '0', 10);
          const m = parseInt(mStr || '0', 10);
          return {
            date: format(day, 'yyyy-MM-dd'),
            hoursWorked: (h || 0) + ((m || 0) / 60),
          };
        }),
      }));

      await timesheetAPI.adminFill({
        targetUserId: selectedUser._id || selectedUser.id,
        rows: payloadRows
      });

      setShowModal(false);
      setShowSuccessModal(true);
      fetchComplianceData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fill timesheet');
    } finally {
      setIsSaving(false);
    }
  };



  const isCurrentWeekDisabled = () => {
    const nextWeekStart = startOfWeek(addDays(currentDate, 7), { weekStartsOn });
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn });
    return isAfter(nextWeekStart, currentWeekStart);
  };

  if (loading && complianceData.length === 0 && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ProGuard
      title="Compliance & Locks"
      subtitle="Timesheet compliance monitoring, automated locks, and advanced audit logs are part of the Enterprise Pro tier."
      icon={ShieldCheck}
    >
      <Layout
        title="Timesheet Compliance"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View style={styles.container}>
          <View style={styles.content}>


            {/* Week Navigation */}
            <View style={[styles.navContainer, {
              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
              borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
            }]}>
              <TouchableOpacity onPress={() => handleWeekChange(-1)} style={styles.navButton}>
                <ChevronLeft size={20} color="#64748b" />
              </TouchableOpacity>

              <View style={styles.weekInfo}>
                <Calendar size={16} color="#3b82f6" />
                <Text style={[styles.weekDate, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleWeekChange(1)}
                style={[styles.navButton, isCurrentWeekDisabled() && styles.navButtonDisabled]}
                disabled={isCurrentWeekDisabled()}
              >
                <ChevronRight size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search and Export Bar */}
            <View style={styles.searchBar}>
              <View style={[styles.searchContainer, {
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
              }]}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  style={[styles.searchInput, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}
                  placeholder="Search by name or emp id..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsText}>{totalResults} EMPLOYEES</Text>
              {loading && complianceData.length > 0 && (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 8 }} />
              )}
            </View>

            {/* Compliance List */}
            {filteredComplianceData.length === 0 ? (
              <View style={[styles.emptyContainer, {
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
              }]}>
                <ShieldCheck size={48} color="#cbd5e1" />
                <Text style={[styles.emptyTitle, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
                  No employees found
                </Text>
                <Text style={styles.emptyText}>Try adjusting your search or week</Text>
              </View>
            ) : (
              <>
                {filteredComplianceData.map((item, idx) => (
                  <ComplianceCard
                    key={item.user._id || idx}
                    item={item}
                    onFill={() => handleOpenModal(item)}
                    theme={theme}
                  />
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                      onPress={() => { if (page > 1) { setPage(page - 1); } }}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={16} color="#3b82f6" />
                      <Text style={styles.pageButtonText}>Previous</Text>
                    </TouchableOpacity>

                    <Text style={[styles.pageInfo, { color: theme === 'dark' ? '#cbd5e1' : '#64748b' }]}>
                      {page} / {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                      onPress={() => { if (page < totalPages) { setPage(page + 1); } }}
                      disabled={page === totalPages}
                    >
                      <Text style={styles.pageButtonText}>Next</Text>
                      <ChevronRight size={16} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Fill Modal */}
        <FillModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          user={selectedUser}
          weekStart={weekStart}
          weekDays={weekDays}
          projects={userProjects.length > 0 ? userProjects : projects}
          tasks={userTasks.length > 0 ? userTasks : tasks}
          taskCategories={taskCategories}
          onSave={handleSaveAdminFill}
          isSaving={isSaving}
          theme={theme}
        />

        {/* Success Modal */}
        <SuccessModal
          visible={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          theme={theme}
        />
      </Layout>
    </ProGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: verticalScale(16),
    borderWidth: 1,
  },
  navButton: {
    padding: scale(8),
    borderRadius: scale(8),
    backgroundColor: '#f1f5f9',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  weekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  weekDate: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(12),
    borderWidth: 1,
    paddingHorizontal: scale(12),
    height: verticalScale(44),
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(8),
    fontSize: moderateScale(14),
  },
  exportButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  resultsText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  card: {
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  userInfo: {
    flexDirection: 'row',
    gap: scale(12),
    flex: 1,
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#ffffff',
  },
  employeeName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  employeeId: {
    fontSize: moderateScale(11),
    color: '#64748b',
    marginTop: verticalScale(2),
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  department: {
    fontSize: moderateScale(12),
    color: '#475569',
    marginTop: verticalScale(2),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(12),
  },
  statusText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  hoursText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  fillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#eff6ff',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
  },
  fillButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#3b82f6',
  },
  resolvedText: {
    fontSize: moderateScale(11),
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(48),
    borderRadius: scale(24),
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    marginTop: verticalScale(16),
  },
  emptyText: {
    fontSize: moderateScale(13),
    color: '#64748b',
    marginTop: verticalScale(8),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(16),
    paddingVertical: verticalScale(20),
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    backgroundColor: '#ffffff',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#3b82f6',
  },
  pageInfo: {
    fontSize: moderateScale(13),
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  subtitle: {
    fontSize: moderateScale(12),
    color: '#64748b',
    marginTop: verticalScale(4),
  },
  content: {
    padding: scale(16),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    marginBottom: verticalScale(8),
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCell: {
    width: scale(100),
  },
  taskCell: {
    width: scale(90),
  },
  dayCell: {
    width: scale(45),
    alignItems: 'center',
  },
  actionCell: {
    width: scale(60),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowActionBtn: {
    padding: scale(4),
  },
  dayName: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#64748b',
  },
  dayNumber: {
    fontSize: moderateScale(8),
    color: '#94a3b8',
    marginTop: verticalScale(2),
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  cell: {
    paddingHorizontal: scale(4),
  },
  selectWrapper: {
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  selectInput: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(12),
    height: verticalScale(40),
  },
  hourInput: {
    width: scale(40),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(12),
    textAlign: 'center',
    height: verticalScale(40),
  },
  hourInputDisabled: {
    opacity: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(12),
  },
  addButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#3b82f6',
  },
  footer: {
    flexDirection: 'row',
    gap: scale(12),
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: '#3b82f6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: 'white',
  },
  selectInputText: {
    paddingHorizontal: scale(8),
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  pickerContent: {
    borderRadius: scale(24),
    width: '90%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
  },
  pickerHeaderTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  pickerListContent: {
    paddingVertical: verticalScale(8),
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
  },
  pickerSelectedOption: {
    backgroundColor: '#f5f7ff',
  },
  pickerOptionText: {
    fontSize: moderateScale(15),
  },
  pickerSelectedOptionText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

const successModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  container: {
    width: '85%',
    borderRadius: scale(24),
    padding: scale(24),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(10) },
    shadowOpacity: 0.1,
    shadowRadius: scale(20),
    elevation: 10,
  },
  iconWrapper: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    marginBottom: verticalScale(10),
  },
  message: {
    fontSize: moderateScale(13),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: verticalScale(18),
    marginBottom: verticalScale(24),
  },
  doneButton: {
    backgroundColor: '#10b981',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(36),
    borderRadius: scale(12),
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
});