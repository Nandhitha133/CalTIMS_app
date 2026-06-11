// screens/dashboard/DashboardScreen.tsx (Fixed Version)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  StyleSheet,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addDays } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  Award,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Users,
  Megaphone,
  Settings2,
  X,
  Save,
  Clock,
  ClipboardList,
  BarChart3,
  FolderOpen,
  Bell,
  Briefcase,
  UserCheck,
  FileText,
  Calendar,
  Home,
  Plus,
  Send,
  ChevronDown,
  Activity,
} from 'lucide-react-native';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import { timesheetAPI, projectAPI, announcementAPI, calendarAPI, leaveAPI, userAPI, settingsAPI } from '../../services/endpoints';
import { appEventBus } from '../../utils/eventBus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Color constants
const COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  dark: '#1e293b',
  light: '#f8fafc',
  gray: '#64748b',
  white: '#ffffff',
  border: '#e2e8f0',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  rose: '#f43f5e',
  orange: '#f97316',
};

interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
  isOwner?: boolean;
  department?: string;
  employeeId?: string;
}

interface DashboardPreferences {
  showStats: boolean;
  showChart: boolean;
  showProjects: boolean;
  showAnnouncements: boolean;
  showInsights: boolean;
  showCalendar: boolean;
  theme: 'light' | 'dark';
}

type LeaveBalance = Record<string, number>;

interface DashboardSummary {
  hoursThisWeek: number;
  targetHours: number;
  approvedTimesheets?: number;
  pendingTimesheets?: number;
  rejectedTimesheets?: number;
  notSubmittedCount?: number;
  totalEmployees?: number;
  submissionDeadline?: string;
  dailyHours: Array<{ day: string; hours: number }>;
  projectTotals: Array<{ projectId: string; totalHours: number; cumulativeHours?: number; projectName?: string }>;
}

interface Project {
  _id: string;
  id: string;
  name: string;
  code?: string;
  budgetHours?: number;
  type?: string;
  isSystemType?: boolean;
}

interface Announcement {
  _id: string;
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author?: { name: string };
}

interface CalendarEvent {
  _id: string;
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  eventType: 'holiday' | 'company_event' | 'leave' | 'personal_event' | 'meeting' | 'deadline';
  description?: string;
}

// Helper function to safely extract data from API response
const extractData = (response: any, defaultValue: any = null) => {
  if (!response) return defaultValue;
  // Handle different response structures
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

// Calendar Widget Component
const CalendarWidget = ({ events, isLoading, onDatePress, theme }: any) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getBarColor = (type: string) => {
    const colors: Record<string, string> = {
      holiday: COLORS.orange,
      company_event: COLORS.info,
      leave: COLORS.success,
      personal_event: COLORS.purple,
      meeting: COLORS.cyan,
      deadline: COLORS.rose,
    };
    return colors[type] || COLORS.gray;
  };

  const getEventsOnDay = (day: Date): CalendarEvent[] => {
    return events.filter((e: CalendarEvent) => {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      s.setHours(0, 0, 0, 0);
      en.setHours(23, 59, 59, 999);
      return day >= s && day <= en;
    });
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  return (
    <View style={[styles.calendarContainer, { backgroundColor: theme === 'dark' ? COLORS.dark : COLORS.white }]}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.calendarNav}>
          <ChevronLeft size={20} color={theme === 'dark' ? COLORS.white : COLORS.dark} />
        </TouchableOpacity>
        <Text style={[styles.calendarMonth, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.calendarNav}>
          <ChevronRight size={20} color={theme === 'dark' ? COLORS.white : COLORS.dark} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDaysRow}>
        {weekDays.map((day, idx) => (
          <Text key={idx} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={styles.calendarLoader} />
      ) : (
        <View style={styles.calendarGrid}>
          {days.map((day: Date, idx: number) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const dayEvents = getEventsOnDay(day);
            const primaryEvent = dayEvents[0];

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.calendarDay,
                  !inMonth && styles.calendarDayOutside,
                  today && styles.calendarDayToday,
                ]}
                onPress={() => onDatePress(day, dayEvents)}
              >
                {primaryEvent && (
                  <View style={[styles.calendarEventBar, { backgroundColor: getBarColor(primaryEvent.eventType) }]} />
                )}
                <Text style={[
                  styles.calendarDayText,
                  !inMonth && styles.calendarDayTextOutside,
                  today && styles.calendarDayTextToday,
                  { color: theme === 'dark' ? COLORS.white : COLORS.dark }
                ]}>
                  {format(day, 'd')}
                </Text>
                {dayEvents.length > 1 && (
                  <View style={styles.calendarEventCount}>
                    <Text style={styles.calendarEventCountText}>+{dayEvents.length - 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// Timesheet Log Modal
const TimesheetModal = ({ visible, onClose, onSave, projects, selectedDate, theme, isSaving }: any) => {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const handleSave = () => {
    if (!selectedProject) {
      Alert.alert('Error', 'Please select a project');
      return;
    }
    if (!hours || parseFloat(hours) <= 0) {
      Alert.alert('Error', 'Please enter valid hours');
      return;
    }
    if (parseFloat(hours) > 24) {
      Alert.alert('Error', 'Hours cannot exceed 24 per day');
      return;
    }

    onSave({
      projectId: selectedProject._id || selectedProject.id,
      projectName: selectedProject.name,
      date: format(selectedDate, 'yyyy-MM-dd'),
      hours: parseFloat(hours),
      description,
    });

    setSelectedProject(null);
    setHours('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.timesheetModal, { backgroundColor: theme === 'dark' ? COLORS.dark : COLORS.white }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}>
              Log Time - {format(selectedDate, 'MMM dd, yyyy')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.projectSelector} onPress={() => setShowProjectPicker(true)}>
            <Text style={[styles.projectSelectorLabel, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}>
              {selectedProject ? selectedProject.name : 'Select Project'}
            </Text>
            <ChevronDown size={20} color={COLORS.gray} />
          </TouchableOpacity>

          {showProjectPicker && (
            <View style={styles.projectPicker}>
              <ScrollView style={{ maxHeight: 200 }}>
                {projects.map((project: any) => (
                  <TouchableOpacity
                    key={project._id || project.id}
                    style={styles.projectPickerItem}
                    onPress={() => {
                      setSelectedProject(project);
                      setShowProjectPicker(false);
                    }}
                  >
                    <Text style={styles.projectPickerText}>{project.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TextInput
            style={[styles.input, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}
            placeholder="Hours"
            placeholderTextColor={COLORS.gray}
            keyboardType="numeric"
            value={hours}
            onChangeText={setHours}
          />

          <TextInput
            style={[styles.input, styles.textArea, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}
            placeholder="Description (optional)"
            placeholderTextColor={COLORS.gray}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color={COLORS.white} /> : <><Save size={18} color={COLORS.white} /><Text style={styles.saveButtonText}>Save Entry</Text></>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, onPress, subtitle, loading, theme }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.statCard, { backgroundColor: theme === 'dark' ? COLORS.dark : COLORS.white }]} disabled={!onPress}>
    <View style={styles.statCardHeader}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}><Icon size={20} color={color} /></View>
      {loading ? <ActivityIndicator size="small" color={color} /> : <Text style={[styles.statValue, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}>{value !== undefined && value !== null ? value : 0}</Text>}
    </View>
    <View style={styles.statCardFooter}>
      <Text style={[styles.statTitle, { color: theme === 'dark' ? COLORS.gray : COLORS.dark }]}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  </TouchableOpacity>
);

// Project Card Component
const ProjectCard = ({ project, isSelected, onPress, theme }: any) => {
  const pct = project.budgetHours > 0 ? Math.min(100, (project.hours / project.budgetHours) * 100) : (project.hours / 50) * 100;
  const isOverBudget = project.budgetHours > 0 && project.hours > project.budgetHours;

  return (
    <TouchableOpacity onPress={onPress} style={[styles.projectCard, { backgroundColor: isSelected ? `${COLORS.primary}10` : (theme === 'dark' ? COLORS.dark : COLORS.white), borderColor: isSelected ? COLORS.primary : (theme === 'dark' ? '#334155' : COLORS.border) }]}>
      <View style={styles.projectCardHeader}>
        <Text style={[styles.projectName, { color: isSelected ? COLORS.primary : (theme === 'dark' ? '#cbd5e1' : '#334155') }]}>{project.name}</Text>
        <Text style={[styles.projectHours, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}>{project.hours.toFixed(1)}h</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${Math.min(pct, 100)}%`, backgroundColor: isOverBudget ? COLORS.error : (isSelected ? COLORS.primary : COLORS.success) }]} />
      </View>
      {project.budgetHours > 0 && <Text style={styles.projectBudget}>{Math.round(pct)}% of {project.budgetHours}h budget</Text>}
    </TouchableOpacity>
  );
};

// Announcement Card Component
const AnnouncementCard = ({ announcement, theme, onPress }: { announcement: Announcement; theme: 'light' | 'dark'; onPress?: () => void }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
    <View style={[styles.announcementCard, { borderBottomColor: theme === 'dark' ? '#334155' : COLORS.border }]}> 
      <Text style={[styles.announcementTitle, { color: theme === 'dark' ? COLORS.white : COLORS.dark }]}>{announcement.title}</Text>
      <Text style={styles.announcementContent} numberOfLines={2}>{announcement.content}</Text>
      <Text style={styles.announcementDate}>{format(new Date(announcement.createdAt), 'MMM dd, yyyy')}</Text>
    </View>
  </TouchableOpacity>
);

// Customization Modal
const CustomizationModal = ({ visible, onClose, preferences, setPreferences, onSave }: any) => (
  <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContainer, { backgroundColor: preferences.theme === 'dark' ? COLORS.dark : COLORS.white }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark }]}>Customize Dashboard</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={COLORS.gray} /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Theme</Text>
            <View style={styles.optionsRow}>
              {['light', 'dark'].map((theme) => (
                <TouchableOpacity key={theme} style={[styles.optionButton, preferences.theme === theme && styles.optionButtonActive]} onPress={() => setPreferences({ ...preferences, theme: theme as any })}>
                  <Text style={[styles.optionText, preferences.theme === theme && styles.optionTextActive]}>{theme.charAt(0).toUpperCase() + theme.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Widgets Visibility</Text>
            {[
              { key: 'showStats', label: 'Statistics Cards', icon: BarChart3, color: COLORS.primary },
              { key: 'showChart', label: 'Productivity Chart', icon: Clock, color: COLORS.success },
              { key: 'showProjects', label: 'Projects', icon: FolderOpen, color: COLORS.warning },
              { key: 'showAnnouncements', label: 'Announcements', icon: Bell, color: COLORS.error },
              { key: 'showInsights', label: 'Insights', icon: HelpCircle, color: COLORS.info },
              { key: 'showCalendar', label: 'Calendar', icon: Calendar, color: COLORS.purple },
            ].map(widget => (
              <View key={widget.key} style={styles.switchItem}>
                <View style={styles.switchItemLeft}><widget.icon size={18} color={widget.color} /><Text style={[styles.switchLabel, { color: preferences.theme === 'dark' ? '#cbd5e1' : '#334155' }]}>{widget.label}</Text></View>
                <Switch value={preferences[widget.key as keyof DashboardPreferences]} onValueChange={(value) => setPreferences({ ...preferences, [widget.key]: value })} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.white} />
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={onSave}><Save size={18} color={COLORS.white} /><Text style={styles.saveButtonText}>Save Preferences</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState<number>(0);
  const [inactiveEmployeeCount, setInactiveEmployeeCount] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ annual: 0, casual: 0, sick: 0 });
  const [leaveTypes, setLeaveTypes] = useState<string[]>(['annual', 'casual', 'sick']);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [timesheetModalVisible, setTimesheetModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSavingTimesheet, setIsSavingTimesheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    showStats: true, showChart: true, showProjects: true, showAnnouncements: true, showInsights: true, showCalendar: true, theme: 'light',
  });

  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = user?.isOwner || userRole === 'admin' || userRole === 'super_admin' || userRole === 'owner';
  const isHR = userRole === 'hr';

  useEffect(() => { loadPreferences(); }, []);

  const loadPreferences = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem('dashboard_preferences');
      if (savedPrefs) setPreferences(JSON.parse(savedPrefs));
    } catch (error) { console.error('Error loading preferences:', error); }
  };

  const savePreferences = async () => {
    try {
      await AsyncStorage.setItem('dashboard_preferences', JSON.stringify(preferences));
      Alert.alert('Success', 'Dashboard preferences saved successfully!');
      setSettingsVisible(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const getUserListTotal = (response: any) => {
    if (!response) return 0;
    if (typeof response.total === 'number') return response.total;
    if (response.pagination?.total != null) return response.pagination.total;
    if (response.data?.pagination?.total != null) return response.data.pagination.total;
    if (response.data?.data?.pagination?.total != null) return response.data.data.pagination.total;
    if (response.data?.users && response.data.pagination?.total != null) return response.data.pagination.total;
    if (response.data?.users && typeof response.data.users.length === 'number' && response.data.pagination == null) return response.data.users.length;
    if (Array.isArray(response.users) && response.pagination?.total != null) return response.pagination.total;
    if (Array.isArray(response.data)) return response.data.length;
    if (Array.isArray(response.data?.data)) return response.data.data.length;
    if (Array.isArray(response.users)) return response.users.length;
    if (Array.isArray(response)) return response.length;
    return 0;
  };

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        return parsedUser;
      }
      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await loadUserData();

      // Fetch dashboard summary - FIXED: Use correct endpoint and handle response
      try {
        const summaryResponse = await timesheetAPI.getDashboardSummary({
          projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
          weekStartDate: format(currentWeekStart, 'yyyy-MM-dd'),
        });

        // Extract data properly
        const summary = extractData(summaryResponse, {});
        console.log('Dashboard Summary Response:', summary);

        setSummaryData({
          hoursThisWeek: summary?.hoursThisWeek || 0,
          targetHours: summary?.targetHours || 40,
          approvedTimesheets: summary?.approvedTimesheets || 0,
          pendingTimesheets: summary?.pendingTimesheets || 0,
          rejectedTimesheets: summary?.rejectedTimesheets || 0,
          notSubmittedCount: summary?.notSubmittedCount || 0,
          totalEmployees: summary?.totalEmployees || 0,
          submissionDeadline: summary?.submissionDeadline || 'Friday 18:00',
          dailyHours: summary?.dailyHours || [
            { day: 'Mon', hours: 0 }, { day: 'Tue', hours: 0 }, { day: 'Wed', hours: 0 },
            { day: 'Thu', hours: 0 }, { day: 'Fri', hours: 0 }, { day: 'Sat', hours: 0 }, { day: 'Sun', hours: 0 }
          ],
          projectTotals: summary?.projectTotals || [],
        });
      } catch (err: any) {
        console.error('Summary fetch error:', err?.message);
        setSummaryData({
          hoursThisWeek: 0, targetHours: 40, approvedTimesheets: 0, pendingTimesheets: 0,
          rejectedTimesheets: 0, notSubmittedCount: 0, totalEmployees: 0, submissionDeadline: 'Friday 18:00',
          dailyHours: [
            { day: 'Mon', hours: 0 }, { day: 'Tue', hours: 0 }, { day: 'Wed', hours: 0 },
            { day: 'Thu', hours: 0 }, { day: 'Fri', hours: 0 }, { day: 'Sat', hours: 0 }, { day: 'Sun', hours: 0 }
          ],
          projectTotals: [],
        });
      }

      try {
        const [activeResponse, inactiveResponse] = await Promise.all([
          userAPI.getAll({ status: 'active', limit: 1 }),
          userAPI.getAll({ status: 'inactive', limit: 1 }),
        ]);
        const activeTotal = getUserListTotal(activeResponse);
        const inactiveTotal = getUserListTotal(inactiveResponse);
        setActiveEmployeeCount(activeTotal);
        setInactiveEmployeeCount(inactiveTotal);
      } catch (err: any) {
        console.error('Employee count fetch error:', err?.message || err);
        setActiveEmployeeCount(0);
        setInactiveEmployeeCount(0);
      }

      // Fetch projects
      try {
        const projectsResponse = await projectAPI.getAll({ limit: 5000 });
        const projectsData = extractData(projectsResponse, []);
        const filteredProjects = projectsData.filter((p: any) => (p.type === 'project' || !p.type) && !p.isSystemType);
        setProjects(filteredProjects);
      } catch (err: any) {
        console.error('Projects fetch error:', err?.message);
        setProjects([]);
      }

      // Fetch leave types
      try {
        const settingsResponse = await settingsAPI.getTimesheetSettings();
        const settings = extractData(settingsResponse);
        if (settings?.eligibleLeaveTypes) {
          setLeaveTypes(settings.eligibleLeaveTypes);
        }
      } catch (err: any) {
        console.error('Leave types fetch error:', err?.message);
      }

      // Fetch announcements
      try {
        const isAdminUser = currentUser?.isOwner || ['admin', 'super_admin', 'owner'].includes(currentUser?.role?.toLowerCase() || '');
        let announcementsResponse: any;
        if (isAdminUser) {
          try {
            announcementsResponse = await announcementAPI.getAllAdmin({ limit: 10 });
          } catch (err: any) {
            if (err?.status === 403) {
              console.warn('Admin dashboard announcements forbidden; falling back to public announcements.', err?.message);
              announcementsResponse = await announcementAPI.getAll({ limit: 10 });
            } else {
              throw err;
            }
          }
        } else {
          announcementsResponse = await announcementAPI.getAll({ limit: 10 });
        }

        const announcementsData = extractData(announcementsResponse, []);
        setAnnouncements(announcementsData);
      } catch (err: any) {
        console.error('Announcements fetch error:', err?.message);
        setAnnouncements([]);
      }

      // Fetch calendar events
      try {
        const eventsResponse = await calendarAPI.getAll({ month: format(currentWeekStart, 'yyyy-MM') });
        const eventsData = extractData(eventsResponse, []);
        setCalendarEvents(eventsData);
      } catch (err: any) {
        console.error('Calendar events fetch error:', err?.message);
        setCalendarEvents([]);
      }

      // Fetch leave balance for non-admin users
      if (currentUser && !isAdmin && !isHR) {
        try {
          const balanceResponse = await leaveAPI.getBalance(currentUser._id || currentUser.id);
          const balance = extractData(balanceResponse, {});
          setLeaveBalance(balance);
        } catch (err: any) {
          console.error('Leave balance fetch error:', err?.message);
          setLeaveBalance({ annual: 0, casual: 0, sick: 0 });
        }
      }
    } catch (error: any) {
      console.error('Dashboard fetch error:', error?.message);
      setError(error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => { await fetchDashboardData(); };

  useEffect(() => {
    const handleEmployeeStatusUpdated = () => {
      fetchDashboardData();
    };

    appEventBus.on('employee-status-updated', handleEmployeeStatusUpdated);
    return () => {
      appEventBus.off('employee-status-updated', handleEmployeeStatusUpdated);
    };
  }, [currentWeekStart, selectedProjectId]);

  useFocusEffect(useCallback(() => { fetchAllData(); }, [currentWeekStart, selectedProjectId]));

  const onRefresh = async () => { setRefreshing(true); await fetchAllData(); setRefreshing(false); };

  const handleSaveTimesheet = async (entry: any) => {
    setIsSavingTimesheet(true);
    try {
      const bulkData = {
        entries: [{
          projectId: entry.projectId,
          date: entry.date,
          hoursWorked: entry.hours,
          description: entry.description,
        }]
      };
      const response = await timesheetAPI.bulkUpsert(bulkData);
      const result = extractData(response, {});
      if (result?.success !== false) {
        Alert.alert('Success', 'Timesheet entry saved!');
        fetchDashboardData();
      } else {
        Alert.alert('Error', result?.message || 'Failed to save timesheet entry');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save timesheet entry');
    } finally {
      setIsSavingTimesheet(false);
    }
  };


  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name?.split(' ')[0] || 'User';
    if (hour < 12) return `Good Morning, ${name}`;
    if (hour < 17) return `Good Afternoon, ${name}`;
    if (hour < 21) return `Good Evening, ${name}`;
    return `Good Night, ${name}`;
  };

  const loggedHoursThisWeek = summaryData?.hoursThisWeek || 0;
  const targetHours = summaryData?.targetHours || 40;
  const progressPct = Math.min(100, Math.round((loggedHoursThisWeek / targetHours) * 100)) || 0;
  const isComplete = progressPct === 100;
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const handleDatePress = (date: Date, dayEvents: CalendarEvent[]) => {
    setSelectedDate(date);
    if (dayEvents.length > 0) {
      Alert.alert(format(date, 'MMMM dd, yyyy'), dayEvents.map(e => `• ${e.title} (${e.eventType})`).join('\n'), [{ text: 'OK' }]);
    }
  };

  const chartData = summaryData?.dailyHours || [
    { day: 'Mon', hours: 0 }, { day: 'Tue', hours: 0 }, { day: 'Wed', hours: 0 },
    { day: 'Thu', hours: 0 }, { day: 'Fri', hours: 0 }, { day: 'Sat', hours: 0 }, { day: 'Sun', hours: 0 }
  ];

  // Merge projects with hours from summary data
  const hourMap: { [key: string]: number } = {};
  summaryData?.projectTotals?.forEach((p: { projectId: string; totalHours: number }) => {
    if (p.projectId) hourMap[p.projectId] = p.totalHours || 0;
  });

  const projectsWithHours = projects.map((p: Project) => ({
    ...p,
    hours: hourMap[p._id || p.id] || 0,
  })).sort((a, b) => (b.hours || 0) - (a.hours || 0));

  // Show loading state
  if (loading && !summaryData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Show error state
  if (error && !summaryData) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAllData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Layout title="Dashboard" user={user} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible} refreshing={refreshing} onRefresh={onRefresh}>
      <ScrollView style={[styles.container, { backgroundColor: preferences.theme === 'dark' ? '#0f172a' : COLORS.light }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Hero Section */}
          <LinearGradient colors={['#1e293b', '#0f172a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroSection}>
            <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.settingsButton}>
              <Settings2 size={14} color="#94a3b8" />
              <Text style={styles.settingsButtonText}>Customize</Text>
            </TouchableOpacity>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.weekText}>Week: {format(currentWeekStart, 'MMM d')} – {format(currentWeekEnd, 'MMM d, yyyy')}</Text>

            {!isAdmin && !isHR && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Timesheet Progress</Text>
                  <Text style={[styles.progressPercent, { color: isComplete ? COLORS.success : COLORS.primary }]}>{progressPct}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${progressPct}%`, backgroundColor: isComplete ? COLORS.success : COLORS.primary }]} />
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => navigation.navigate('TimesheetEntry')} style={[styles.actionButton, styles.primaryButton]}>
                    <Text style={styles.actionButtonText}>{isComplete ? 'Review Timesheet' : 'Continue Timesheet'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('TimesheetHistory')} style={[styles.actionButton, styles.secondaryButton]}>
                    <Text style={[styles.actionButtonText, { color: COLORS.white }]}>View History</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {(isAdmin || isHR) && (
              <>
                <View style={styles.adminStats}>
                  <View style={styles.adminStatItem}><Text style={styles.adminStatValue}>{summaryData?.totalEmployees || 0}</Text><Text style={styles.adminStatLabel}>Employees</Text></View>
                  <View style={styles.adminStatDivider} />
                  <View style={styles.adminStatItem}><Text style={styles.adminStatValue}>{summaryData?.pendingTimesheets || 0}</Text><Text style={styles.adminStatLabel}>Pending Timesheets</Text></View>
                </View>
                <View style={styles.employeeStatusRow}>
                  <View style={styles.employeeStatusBadgeActive}>
                    <Text style={styles.employeeStatusLabel}>Active</Text>
                    <Text style={styles.employeeStatusValue}>{activeEmployeeCount}</Text>
                  </View>
                  <View style={styles.employeeStatusBadgeInactive}>
                    <Text style={styles.employeeStatusLabel}>Inactive</Text>
                    <Text style={styles.employeeStatusValue}>{inactiveEmployeeCount}</Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: preferences.theme === 'dark' ? COLORS.dark : COLORS.white }]} onPress={() => navigation.navigate('TimesheetEntry')}>
              <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.primary}15` }]}><Clock size={20} color={COLORS.primary} /></View>
              <Text style={[styles.quickActionText, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark }]}>Log Time</Text>
            </TouchableOpacity>

            {isAdmin || isHR ? (
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: preferences.theme === 'dark' ? COLORS.dark : COLORS.white }]} onPress={() => navigation.navigate('LeaveManagement')}>
                <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.warning}15` }]}><ClipboardList size={20} color={COLORS.warning} /></View>
                <Text style={[styles.quickActionText, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark }]}>Manage Leaves</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: preferences.theme === 'dark' ? COLORS.dark : COLORS.white }]} onPress={() => navigation.navigate('LeaveTracker')}>
                <View style={[styles.quickActionIcon, { backgroundColor: `${COLORS.success}15` }]}><CalendarDays size={20} color={COLORS.success} /></View>
                <Text style={[styles.quickActionText, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark }]}>Apply Leave</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Grid */}
          {preferences.showStats && (
            <View style={styles.statsGrid}>
              {(isAdmin || isHR) ? (
                <>
                  <View style={styles.statRow}>
                    <StatCard title="Approved" value={summaryData?.approvedTimesheets || 0} icon={CheckCircle} color={COLORS.success} onPress={() => navigation.navigate('ManageTimesheets', { status: 'Approved' })} subtitle="Finalized timesheets" loading={loading} theme={preferences.theme} />
                    <StatCard title="Pending" value={summaryData?.pendingTimesheets || 0} icon={AlertCircle} color={COLORS.warning} onPress={() => navigation.navigate('ManageTimesheets', { status: 'Submitted' })} subtitle="Waiting for review" loading={loading} theme={preferences.theme} />
                  </View>
                  <View style={styles.statRow}>
                    <StatCard title="Not Submitted" value={summaryData?.notSubmittedCount || 0} icon={XCircle} color={COLORS.error} onPress={() => navigation.navigate('TimesheetCompliance')} subtitle="Missing from staff" loading={loading} theme={preferences.theme} />
                    <StatCard title="Total Staff" value={summaryData?.totalEmployees || 0} icon={Users} color={COLORS.info} onPress={() => navigation.navigate('Employees')} subtitle="System users" loading={loading} theme={preferences.theme} />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.statRow}>
                    {leaveTypes.slice(0, 2).map((type) => {
                      const label = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                      const val = leaveBalance[type] || leaveBalance[type.toLowerCase()] || 0;
                      return (
                        <StatCard
                          key={type}
                          title={label.includes('Leave') ? label : `${label} Leave`}
                          value={val}
                          icon={type.toLowerCase().includes('sick') ? AlertCircle : (type.toLowerCase().includes('annual') ? CalendarDays : UserCheck)}
                          color={type.toLowerCase().includes('annual') ? COLORS.success : (type.toLowerCase().includes('sick') ? COLORS.warning : COLORS.info)}
                          onPress={() => navigation.navigate('LeaveTracker')}
                          subtitle="Available balance"
                          loading={loading}
                          theme={preferences.theme}
                        />
                      );
                    })}
                  </View>
                  <View style={styles.statRow}>
                    {/* Keep This Week and one more leave type (e.g. LOP or Sick) */}
                    {leaveTypes.length > 2 ? (
                      (() => {
                        const type = leaveTypes[2];
                        const label = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        const val = leaveBalance[type] || leaveBalance[type.toLowerCase()] || 0;
                        return (
                          <StatCard
                            title={label.includes('Leave') ? label : `${label} Leave`}
                            value={val}
                            icon={AlertCircle}
                            color={COLORS.warning}
                            onPress={() => navigation.navigate('LeaveTracker')}
                            subtitle="Available balance"
                            loading={loading}
                            theme={preferences.theme}
                          />
                        );
                      })()
                    ) : (
                      <StatCard title="Sick Leave" value={leaveBalance.sick || 0} icon={AlertCircle} color={COLORS.warning} onPress={() => navigation.navigate('LeaveTracker')} subtitle="Available balance" loading={loading} theme={preferences.theme} />
                    )}
                    <StatCard title="This Week" value={`${loggedHoursThisWeek.toFixed(1)}h`} icon={Clock} color={COLORS.primary} onPress={() => navigation.navigate('TimesheetEntry')} subtitle={`of ${targetHours}h target`} loading={loading} theme={preferences.theme} />
                  </View>
                </>
              )}
            </View>
          )}

          {/* Weekly Chart */}
          {preferences.showChart && (
            <View style={[styles.chartCard, { backgroundColor: preferences.theme === 'dark' ? COLORS.dark : COLORS.white }]}>
              <View style={styles.chartHeader}>
                <View style={styles.chartHeaderTop}>
                  <View style={[styles.chartTitleRow, { flexShrink: 1, paddingRight: scale(8) }]}>
                    <View style={styles.chartIconContainer}>
                      <Activity size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[styles.chartTitle, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark }]} numberOfLines={1} adjustsFontSizeToFit>Hourly Productivity</Text>
                      <Text style={styles.chartSubtitle} numberOfLines={1} adjustsFontSizeToFit>ORGANIZATION PERFORMANCE</Text>
                    </View>
                  </View>

                  <View style={styles.chartTotalContainer}>
                    <Text style={[styles.chartTotalValue, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark }]}>
                      {loggedHoursThisWeek.toFixed(2)} <Text style={styles.chartTotalUnit}>H</Text>
                    </Text>
                    <Text style={styles.chartTotalLabel}>ORGANIZATION TOTAL</Text>
                  </View>
                </View>

                <View style={styles.weekNavigationWrapper}>
                  <View style={styles.weekNavigation}>
                    <TouchableOpacity onPress={() => setCurrentWeekStart(prev => subWeeks(prev, 1))} style={styles.navBtn}>
                      <ChevronLeft size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                    <View style={styles.weekDateRange}>
                      <Calendar size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.weekDate}>
                        {format(currentWeekStart, 'MMM d').toUpperCase()} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy').toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setCurrentWeekStart(prev => addWeeks(prev, 1))} style={styles.navBtn}>
                      <ChevronRight size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.chartMainContent}>
                {/* Y-Axis Labels */}
                <View style={styles.yAxis}>
                  {[32, 24, 16, 8, 0].map((val) => (
                    <Text key={val} style={styles.yAxisLabel}>{val}</Text>
                  ))}
                </View>

                {/* Chart Area */}
                <View style={styles.chartArea}>
                  {/* Grid Lines */}
                  <View style={styles.gridLines}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View key={i} style={[styles.gridLine, i === 4 && { borderBottomWidth: 0 }]} />
                    ))}
                  </View>

                  {/* Bars */}
                  <View style={styles.barsContainer}>
                    {chartData.map((day: { day: string; hours: number }, index: number) => {
                      const maxVal = 32;
                      const maxHeight = 160;
                      const barHeight = (day.hours / maxVal) * maxHeight;
                      return (
                        <View key={index} style={styles.barWrapper}>
                          <View style={styles.barStack}>
                            <View 
                              style={[
                                styles.bar, 
                                { 
                                  height: Math.min(barHeight, maxHeight),
                                  backgroundColor: COLORS.primary,
                                  borderTopLeftRadius: 6,
                                  borderTopRightRadius: 6,
                                  borderBottomLeftRadius: 6,
                                  borderBottomRightRadius: 6,
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.barDayLabel}>{day.day}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Projects Section */}
          {preferences.showProjects && (
            <View style={[styles.projectsCard, { backgroundColor: preferences.theme === 'dark' ? COLORS.dark : COLORS.white }]}>
              <View style={styles.projectsHeader}>
                <View style={styles.projectsTitleContainer}><Award size={18} color={COLORS.warning} /><Text style={[styles.projectsTitle, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark }]}>Active Projects</Text></View>
                <TouchableOpacity onPress={() => navigation.navigate('Projects')}><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
              </View>
              {projectsWithHours.slice(0, 5).map(project => (
                <ProjectCard key={project._id || project.id} project={project} isSelected={selectedProjectId === (project._id || project.id)} onPress={() => setSelectedProjectId(selectedProjectId === (project._id || project.id) ? 'all' : (project._id || project.id))} theme={preferences.theme} />
              ))}
              {projectsWithHours.length === 0 && <Text style={styles.emptyText}>No projects found</Text>}
            </View>
          )}

          {/* Calendar Widget */}
          {preferences.showCalendar && (
            <CalendarWidget events={calendarEvents} isLoading={loading} onDatePress={handleDatePress} theme={preferences.theme} />
          )}

          {/* Announcements */}
          {preferences.showAnnouncements && (
            <View style={[styles.announcementsCard, { backgroundColor: preferences.theme === 'dark' ? COLORS.dark : COLORS.white }]}>
              <View style={styles.announcementsHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Megaphone size={18} color={COLORS.error} />
                  <Text style={[styles.announcementsTitle, { color: preferences.theme === 'dark' ? COLORS.white : COLORS.dark, marginLeft: 8 }]}>Announcements</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {announcements.slice(0, 5).map(announcement => (
                <AnnouncementCard
                  key={announcement._id || announcement.id}
                  announcement={announcement}
                  theme={preferences.theme}
                  onPress={() => navigation.navigate('Announcements')}
                />
              ))}
              {announcements.length === 0 && <Text style={styles.emptyText}>No announcements</Text>}
            </View>
          )}

          {/* Quick Insight */}
          {preferences.showInsights && !isAdmin && !isHR && (
            <View style={styles.insightCard}>
              <HelpCircle size={20} color={COLORS.primary} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Insight</Text>
                <Text style={styles.insightText}>You've logged {loggedHoursThisWeek.toFixed(1)} hours this week. {targetHours - loggedHoursThisWeek > 0 ? `${(targetHours - loggedHoursThisWeek).toFixed(1)} hours remaining` : 'Great job meeting your target!'}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('TimesheetEntry')}><Text style={styles.insightLink}>Review Entries →</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <TimesheetModal visible={timesheetModalVisible} onClose={() => setTimesheetModalVisible(false)} onSave={handleSaveTimesheet} projects={projects} selectedDate={selectedDate} theme={preferences.theme} isSaving={isSavingTimesheet} />
      <CustomizationModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} preferences={preferences} setPreferences={setPreferences} onSave={savePreferences} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: scale(16), paddingBottom: verticalScale(100) },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.light },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.light, padding: scale(20) },
  errorText: { fontSize: moderateScale(14), color: COLORS.error, textAlign: 'center', marginTop: verticalScale(12), marginBottom: verticalScale(16) },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: scale(24), paddingVertical: verticalScale(10), borderRadius: scale(12) },
  retryButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: COLORS.white },
  heroSection: { borderRadius: scale(24), padding: scale(20), marginBottom: verticalScale(20), position: 'relative' },
  settingsButton: { position: 'absolute', top: verticalScale(16), right: scale(16), flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: scale(10), paddingVertical: verticalScale(6), borderRadius: scale(20), zIndex: 10 },
  settingsButtonText: { fontSize: moderateScale(10), color: '#94a3b8', fontWeight: '600' },
  dateText: { fontSize: moderateScale(12), color: '#94a3b8', fontWeight: '600', marginBottom: verticalScale(8) },
  greetingText: { fontSize: moderateScale(28), fontWeight: '800', color: COLORS.white, marginBottom: verticalScale(4) },
  weekText: { fontSize: moderateScale(13), color: '#cbd5e1', marginTop: verticalScale(4) },
  progressSection: { marginTop: verticalScale(16) },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(8) },
  progressLabel: { fontSize: moderateScale(11), fontWeight: '600', color: '#94a3b8' },
  progressPercent: { fontSize: moderateScale(13), fontWeight: '700' },
  progressBarContainer: { height: verticalScale(8), backgroundColor: '#334155', borderRadius: scale(4), overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: scale(4) },
  actionButtons: { flexDirection: 'row', gap: scale(12), marginTop: verticalScale(16) },
  actionButton: { flex: 1, paddingVertical: verticalScale(10), borderRadius: scale(12), alignItems: 'center' },
  primaryButton: { backgroundColor: COLORS.primary },
  secondaryButton: { backgroundColor: '#334155' },
  actionButtonText: { color: COLORS.white, fontWeight: '700', fontSize: moderateScale(12) },
  adminStats: { marginTop: verticalScale(16), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: scale(16), padding: scale(16), flexDirection: 'row', justifyContent: 'space-around' },
  adminStatItem: { alignItems: 'center' },
  adminStatValue: { fontSize: moderateScale(32), fontWeight: '800', color: COLORS.white },
  adminStatLabel: { fontSize: moderateScale(11), color: '#94a3b8', marginTop: verticalScale(4) },
  adminStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  employeeStatusRow: { flexDirection: 'row', gap: scale(12), marginTop: verticalScale(12), justifyContent: 'center' },
  employeeStatusBadgeActive: { flex: 1, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: scale(14), padding: scale(12), alignItems: 'center' },
  employeeStatusBadgeInactive: { flex: 1, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: scale(14), padding: scale(12), alignItems: 'center' },
  employeeStatusLabel: { fontSize: moderateScale(12), color: '#94a3b8', marginBottom: verticalScale(4), textTransform: 'uppercase', letterSpacing: 0.4 },
  employeeStatusValue: { fontSize: moderateScale(18), fontWeight: '800', color: COLORS.white },
  quickActions: { flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(20) },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(12), padding: scale(14), borderRadius: scale(16), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: scale(8), elevation: 2 },
  quickActionIcon: { width: scale(40), height: verticalScale(40), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  quickActionText: { fontSize: moderateScale(14), fontWeight: '600' },
  statsGrid: { marginBottom: verticalScale(20) },
  statRow: { flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(12) },
  statCard: { flex: 1, borderRadius: scale(16), padding: scale(16), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: scale(8), elevation: 2 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statIcon: { width: scale(40), height: verticalScale(40), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: moderateScale(24), fontWeight: '800' },
  statCardFooter: { marginTop: verticalScale(12) },
  statTitle: { fontSize: moderateScale(14), fontWeight: '700' },
  statSubtitle: { fontSize: moderateScale(11), color: COLORS.gray, marginTop: verticalScale(4) },
  chartCard: { borderRadius: scale(24), padding: scale(20), marginBottom: verticalScale(20), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.05, shadowRadius: scale(12), elevation: 3 },
  chartHeader: { marginBottom: verticalScale(20) },
  chartHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(16), flexWrap: 'wrap', gap: scale(8) },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  chartIconContainer: { width: scale(36), height: verticalScale(36), borderRadius: scale(10), backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  chartTitle: { fontSize: moderateScale(18), fontWeight: '800', letterSpacing: -0.5 },
  chartSubtitle: { fontSize: moderateScale(10), fontWeight: '700', color: '#94a3b8', marginTop: verticalScale(2), letterSpacing: 0.5 },
  weekNavigationWrapper: { flexDirection: 'row', justifyContent: 'flex-start' },
  weekNavigation: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: scale(4), borderRadius: scale(12), borderWidth: 1, borderColor: '#f1f5f9' },
  navBtn: { width: scale(28), height: verticalScale(28), alignItems: 'center', justifyContent: 'center' },
  weekDateRange: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' },
  weekDate: { fontSize: moderateScale(11), fontWeight: '800', color: '#1e293b' },
  chartTotalContainer: { alignItems: 'flex-end' },
  chartTotalValue: { fontSize: moderateScale(24), fontWeight: '800', letterSpacing: -1 },
  chartTotalUnit: { fontSize: moderateScale(14), color: '#94a3b8', fontWeight: '600' },
  chartTotalLabel: { fontSize: moderateScale(9), fontWeight: '700', color: '#94a3b8', marginTop: verticalScale(2) },
  chartMainContent: { flexDirection: 'row', height: verticalScale(200) },
  yAxis: { width: scale(30), justifyContent: 'space-between', paddingBottom: verticalScale(25), paddingTop: verticalScale(5) },
  yAxisLabel: { fontSize: moderateScale(12), fontWeight: '700', color: '#94a3b8', textAlign: 'right', paddingRight: scale(8) },
  chartArea: { flex: 1, position: 'relative' },
  gridLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: verticalScale(25), justifyContent: 'space-between' },
  gridLine: { height: 1, backgroundColor: '#f1f5f9', width: '100%' },
  barsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: verticalScale(25), zIndex: 1 },
  barWrapper: { flex: 1, alignItems: 'center' },
  barStack: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: scale(20) },
  barDayLabel: { fontSize: moderateScale(12), fontWeight: '700', color: '#94a3b8', marginTop: verticalScale(12) },
  projectsCard: { borderRadius: scale(20), padding: scale(16), marginBottom: verticalScale(20), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: scale(8), elevation: 2 },
  projectsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  projectsTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  projectsTitle: { fontSize: moderateScale(16), fontWeight: '700' },
  viewAllText: { fontSize: moderateScale(11), fontWeight: '600', color: COLORS.primary },
  projectCard: { padding: scale(12), borderRadius: scale(12), marginBottom: verticalScale(8), borderWidth: 1 },
  projectCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(8) },
  projectName: { fontSize: moderateScale(14), fontWeight: '600' },
  projectHours: { fontSize: moderateScale(14), fontWeight: '700' },
  projectBudget: { fontSize: moderateScale(10), color: COLORS.gray, marginTop: verticalScale(6) },
  announcementsCard: { borderRadius: scale(20), padding: scale(16), marginBottom: verticalScale(20), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: scale(8), elevation: 2 },
  announcementsHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(16) },
  announcementsTitle: { fontSize: moderateScale(16), fontWeight: '700' },
  announcementCard: { paddingVertical: verticalScale(12), borderBottomWidth: 1 },
  announcementTitle: { fontSize: moderateScale(13), fontWeight: '600', marginBottom: verticalScale(4) },
  announcementContent: { fontSize: moderateScale(11), color: COLORS.gray, marginBottom: verticalScale(4) },
  announcementDate: { fontSize: moderateScale(10), color: COLORS.gray },
  insightCard: { backgroundColor: '#eff6ff', borderRadius: scale(16), padding: scale(16), flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(20) },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: moderateScale(13), fontWeight: '700', color: COLORS.dark, marginBottom: verticalScale(4) },
  insightText: { fontSize: moderateScale(12), color: '#475569', marginBottom: verticalScale(8) },
  insightLink: { fontSize: moderateScale(11), fontWeight: '600', color: COLORS.primary },
  emptyText: { textAlign: 'center', color: COLORS.gray, padding: scale(20) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: '80%', padding: scale(20) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(20), paddingBottom: verticalScale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: moderateScale(20), fontWeight: '700' },
  modalSection: { marginBottom: verticalScale(24) },
  modalSectionTitle: { fontSize: moderateScale(14), fontWeight: '700', color: COLORS.dark, marginBottom: verticalScale(12) },
  optionsRow: { flexDirection: 'row', gap: scale(12) },
  optionButton: { flex: 1, paddingVertical: verticalScale(10), paddingHorizontal: scale(16), borderRadius: scale(12), backgroundColor: COLORS.light, alignItems: 'center' },
  optionButtonActive: { backgroundColor: COLORS.primary },
  optionText: { fontSize: moderateScale(13), fontWeight: '600', color: COLORS.gray },
  optionTextActive: { color: COLORS.white },
  switchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  switchItemLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  switchLabel: { fontSize: moderateScale(14), fontWeight: '500' },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), backgroundColor: COLORS.primary, paddingVertical: verticalScale(14), borderRadius: scale(12), marginTop: verticalScale(16), marginBottom: verticalScale(8) },
  saveButtonText: { fontSize: moderateScale(14), fontWeight: '700', color: COLORS.white },
  disabledButton: { opacity: 0.6 },
  timesheetModal: { borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(20) },
  projectSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(14), borderWidth: 1, borderColor: COLORS.border, borderRadius: scale(12), marginBottom: verticalScale(12) },
  projectSelectorLabel: { fontSize: moderateScale(14), fontWeight: '500' },
  projectPicker: { borderWidth: 1, borderColor: COLORS.border, borderRadius: scale(12), marginBottom: verticalScale(12) },
  projectPickerItem: { padding: scale(14), borderBottomWidth: 1, borderBottomColor: COLORS.border },
  projectPickerText: { fontSize: moderateScale(14) },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: scale(12), padding: scale(14), fontSize: moderateScale(14), marginBottom: verticalScale(12) },
  textArea: { height: verticalScale(80), textAlignVertical: 'top' },
  leaveModal: { borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(20) },
  leaveTypeSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(14), borderWidth: 1, borderColor: COLORS.border, borderRadius: scale(12), marginBottom: verticalScale(12) },
  leaveTypeText: { fontSize: moderateScale(14), fontWeight: '500' },
  leaveTypePicker: { borderWidth: 1, borderColor: COLORS.border, borderRadius: scale(12), marginBottom: verticalScale(12) },
  leaveTypePickerItem: { padding: scale(14), borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  leaveTypePickerText: { fontSize: moderateScale(14), fontWeight: '600' },
  dateRangeRow: { flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(12) },
  datePickerButton: { flex: 1, padding: scale(14), borderWidth: 1, borderColor: COLORS.border, borderRadius: scale(12), alignItems: 'center' },
  datePickerLabel: { fontSize: moderateScale(10), color: COLORS.gray, marginBottom: verticalScale(4) },
  datePickerValue: { fontSize: moderateScale(12), fontWeight: '500' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), backgroundColor: COLORS.primary, paddingVertical: verticalScale(14), borderRadius: scale(12), marginTop: verticalScale(8) },
  submitButtonText: { fontSize: moderateScale(14), fontWeight: '700', color: COLORS.white },
  calendarContainer: { borderRadius: scale(20), padding: scale(16), marginBottom: verticalScale(20), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: scale(8), elevation: 2 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  calendarNav: { padding: scale(8) },
  calendarMonth: { fontSize: moderateScale(16), fontWeight: '700' },
  weekDaysRow: { flexDirection: 'row', marginBottom: verticalScale(8) },
  weekDayText: { flex: 1, textAlign: 'center', fontSize: moderateScale(11), fontWeight: '600', color: COLORS.gray },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: `${100 / 7}%`, aspectRatio: 1, padding: scale(4), position: 'relative' },
  calendarDayOutside: { opacity: 0.3 },
  calendarDayToday: { backgroundColor: `${COLORS.primary}15`, borderRadius: scale(8) },
  calendarEventBar: { position: 'absolute', top: 0, left: scale(4), right: scale(4), height: verticalScale(3), borderRadius: scale(2) },
  calendarDayText: { textAlign: 'center', fontSize: moderateScale(14), fontWeight: '600', marginTop: verticalScale(6) },
  calendarDayTextOutside: { opacity: 0.5 },
  calendarDayTextToday: { color: COLORS.primary },
  calendarEventCount: { position: 'absolute', bottom: verticalScale(4), right: scale(4), backgroundColor: COLORS.primary, borderRadius: scale(10), paddingHorizontal: scale(4), paddingVertical: verticalScale(1) },
  calendarEventCountText: { fontSize: moderateScale(8), color: COLORS.white, fontWeight: '600' },
  calendarLoader: { height: verticalScale(200) },
});