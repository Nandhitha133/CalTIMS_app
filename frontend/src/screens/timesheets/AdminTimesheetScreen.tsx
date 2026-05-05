// screens/timesheets/AdminTimesheetScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
  Platform,
  FlatList,
  Share,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, getISOWeek } from 'date-fns';
import RNFS from 'react-native-fs';
import {
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Clock,
  Users,
  FileText,
  SlidersHorizontal,
  AlertCircle,
  Send,
  RotateCcw,
  Calendar,
  Briefcase,
} from 'lucide-react-native';
import { timesheetService } from '../../services/timesheet.service';
import { projectAPI, userAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import SafeSelector from '../../components/common/SafeSelector';
import StatusBadge from '../../components/common/StatusBadge';
import { formatHours } from '../../utils/formatters';
import { exportFile } from '../../utils/exportHelper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STATUSES = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

interface TimesheetAdminItem {
  id: string;
  _id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  status: string;
  submittedAt?: string;
  approvedBy?: { name: string };
  userId: {
    id: string;
    _id: string;
    name: string;
    employeeId: string;
  };
  rows: Array<{
    projectId: {
      id: string;
      _id: string;
      name: string;
      code: string;
    };
    totalHours: number;
    entries: Array<{
      date: string;
      hoursWorked: number;
      description?: string;
    }>;
  }>;
}

interface StatsData {
  totalTimesheets: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  submittedUsersCount: number;
  totalHours: number;
  totalEmployees: number;
  drafts?: number;
}

interface FilterOptions {
  years: string[];
  weeks: string[];
  employees: Array<{ id: string; name: string; employeeId: string }>;
  projects: Array<{ id: string; name: string; code: string }>;
  locations?: string[];
  divisions?: string[];
}

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color, theme }: any) => (
  <View style={[styles.statsCard, {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0'
  }]}>
    <View style={[styles.statsIcon, { backgroundColor: `${color}15` }]}>
      <Icon size={24} color={color} />
    </View>
    <Text style={[styles.statsValue, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>{value}</Text>
    <Text style={[styles.statsTitle, { color: theme === 'dark' ? '#94a3b8' : '#64748b' }]}>{title}</Text>
  </View>
);

// Timesheet Row Component for Table View
const TimesheetRow = ({
  item,
  index,
  onView,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  theme
}: {
  item: TimesheetAdminItem;
  index: number;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  theme: 'light' | 'dark';
}) => {
  const projectsText = item.rows?.map(r => r.projectId?.name).filter(Boolean).join(', ') || '—';
  const weekNumber = formatWeek(item.weekStartDate);
  const isPending = item.status?.toLowerCase() === 'submitted';

  return (
    <View style={[styles.tableRow, {
      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
      borderBottomColor: theme === 'dark' ? '#334155' : '#e2e8f0',
    }]}>
      <View style={styles.rowEmployee}>
        <View style={styles.employeeAvatar}>
          <Text style={styles.avatarText}>{(item.userId?.name || '?').charAt(0)}</Text>
        </View>
        <View>
          <Text style={[styles.employeeName, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
            {item.userId?.name || '—'}
          </Text>
          <Text style={styles.employeeId}>{item.userId?.employeeId || '—'}</Text>
        </View>
      </View>

      <View style={styles.rowWeek}>
        <Text style={[styles.weekText, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
          {weekNumber}
        </Text>
        {item.submittedAt && (
          <Text style={styles.submittedDate}>
            Submitted {format(new Date(item.submittedAt), 'MMM d')}
          </Text>
        )}
      </View>

      <View style={styles.rowProjects}>
        <Text style={[styles.projectsText, { color: theme === 'dark' ? '#cbd5e1' : '#475569' }]} numberOfLines={2}>
          {projectsText}
        </Text>
      </View>

      <View style={styles.rowHours}>
        <Text style={[styles.hoursText, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
          {formatHours(item.totalHours)}h
        </Text>
      </View>

      <View style={styles.rowStatus}>
        <StatusBadge status={item.status === 'submitted' ? 'pending' : item.status} />
        {item.approvedBy?.name && (
          <Text style={styles.approvedBy}>by {item.approvedBy.name.split(' ')[0]}</Text>
        )}
      </View>

      <View style={styles.rowActions}>
        <TouchableOpacity onPress={onView} style={styles.actionBtn}>
          <Eye size={16} color="#6366f1" />
        </TouchableOpacity>

        {isPending && (
          <>
            <TouchableOpacity
              onPress={onReject}
              style={styles.actionBtn}
              disabled={isApproving || isRejecting}
            >
              <XCircle size={16} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onApprove}
              style={styles.actionBtn}
              disabled={isApproving || isRejecting}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <CheckCircle size={16} color="#10b981" />
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// Filter Modal Component
const FilterModal = ({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
  filterOptions,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  filters: any;
  onApply: (filters: any) => void;
  onClear: () => void;
  filterOptions: FilterOptions | null;
  theme: 'light' | 'dark';
}) => {
  const [tempFilters, setTempFilters] = useState(filters);
  const [activeSelector, setActiveSelector] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTempFilters(filters);
      setActiveSelector(null);
    }
  }, [visible, filters]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.filterModal, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
              Filter Timesheets
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Employee Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Employee</Text>
              <SafeSelector
                options={[
                  { label: 'All Employees', value: '' },
                  ...(filterOptions?.employees?.map(emp => ({
                    label: `${emp.employeeId} — ${emp.name}`,
                    value: emp.id
                  })) || [])
                ]}
                selectedValue={tempFilters.userId}
                onValueChange={(value) => setTempFilters({ ...tempFilters, userId: value })}
                visible={activeSelector === 'employee'}
                onOpen={() => setActiveSelector('employee')}
                onClose={() => setActiveSelector(null)}
                style={styles.filterSafeSelector}
              />
            </View>

            {/* Project Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Project</Text>
              <SafeSelector
                options={[
                  { label: 'All Projects', value: '' },
                  ...(filterOptions?.projects?.map(proj => ({
                    label: proj.name,
                    value: proj.id
                  })) || [])
                ]}
                selectedValue={tempFilters.projectId}
                onValueChange={(value) => setTempFilters({ ...tempFilters, projectId: value })}
                visible={activeSelector === 'project'}
                onOpen={() => setActiveSelector('project')}
                onClose={() => setActiveSelector(null)}
                style={styles.filterSafeSelector}
              />
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <SafeSelector
                options={STATUSES}
                selectedValue={tempFilters.status}
                onValueChange={(value) => setTempFilters({ ...tempFilters, status: value })}
                visible={activeSelector === 'status'}
                onOpen={() => setActiveSelector('status')}
                onClose={() => setActiveSelector(null)}
                style={styles.filterSafeSelector}
              />
            </View>

            {/* Year Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Year</Text>
              <SafeSelector
                options={[
                  { label: 'All Years', value: '' },
                  ...(filterOptions?.years?.map(year => ({ label: year, value: year })) || [])
                ]}
                selectedValue={tempFilters.year}
                onValueChange={(value) => setTempFilters({ ...tempFilters, year: value })}
                visible={activeSelector === 'year'}
                onOpen={() => setActiveSelector('year')}
                onClose={() => setActiveSelector(null)}
                style={styles.filterSafeSelector}
              />
            </View>

            {/* Week Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Week</Text>
              <SafeSelector
                options={[
                  { label: 'All Weeks', value: '' },
                  ...(filterOptions?.weeks?.map(week => ({ label: formatWeek(week), value: week })) || [])
                ]}
                selectedValue={tempFilters.week}
                onValueChange={(value) => setTempFilters({ ...tempFilters, week: value })}
                visible={activeSelector === 'week'}
                onOpen={() => setActiveSelector('week')}
                onClose={() => setActiveSelector(null)}
                style={styles.filterSafeSelector}
              />
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearFilterButton} onPress={onClear}>
              <Text style={styles.clearFilterText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFilterButton} onPress={() => onApply(tempFilters)}>
              <Text style={styles.applyFilterText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Reject Modal Component
const RejectModal = ({
  visible,
  onClose,
  timesheet,
  onReject,
  loading,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  timesheet: TimesheetAdminItem | null;
  onReject: (reason: string) => void;
  loading: boolean;
  theme: 'light' | 'dark';
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (visible) {
      setReason('');
    }
  }, [visible]);

  const projectsText = timesheet?.rows?.map(r => r.projectId?.name).filter(Boolean).join(', ') || '—';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.rejectModal, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
          <View style={styles.modalHeader}>
            <View style={styles.rejectHeaderLeft}>
              <View style={styles.rejectIcon}>
                <XCircle size={20} color="#ef4444" />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
                  Reject Timesheet
                </Text>
                <Text style={styles.rejectSubtitle}>{timesheet?.userId?.name || 'Employee'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.rejectContent}>
            <View style={styles.projectsPreview}>
              <Text style={styles.projectsPreviewLabel}>Projects</Text>
              <Text style={[styles.projectsPreviewText, { color: theme === 'dark' ? '#cbd5e1' : '#475569' }]}>
                {projectsText}
              </Text>
            </View>

            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason for rejection *</Text>
              <TextInput
                style={[styles.reasonInput, {
                  color: theme === 'dark' ? '#ffffff' : '#1e293b',
                  backgroundColor: theme === 'dark' ? '#334155' : '#f8fafc',
                  borderColor: theme === 'dark' ? '#475569' : '#e2e8f0',
                }]}
                placeholder="Explain why the timesheet is being rejected…"
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                value={reason}
                onChangeText={setReason}
                autoFocus
              />
            </View>
          </View>

          <View style={styles.rejectActions}>
            <TouchableOpacity style={styles.cancelRejectButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelRejectText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmRejectButton, (!reason.trim() || loading) && styles.confirmRejectDisabled]}
              onPress={() => {
                if (!reason.trim()) {
                  Alert.alert('Error', 'Please provide a reason');
                  return;
                }
                onReject(reason);
              }}
              disabled={!reason.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <XCircle size={16} color="#ffffff" />
                  <Text style={styles.confirmRejectText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Timesheet Details Modal
const TimesheetDetailsModal = ({
  visible,
  onClose,
  weekStartDate,
  userId,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  weekStartDate: string;
  userId: string;
  theme: 'light' | 'dark';
}) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && weekStartDate && userId) {
      fetchDetails();
    }
  }, [visible, weekStartDate, userId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await timesheetService.getDetails(weekStartDate, userId);
      setDetails(data);
    } catch (error) {
      console.error('Error fetching details:', error);
      Alert.alert('Error', 'Failed to load timesheet details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.detailsModal, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
              Timesheet Details
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366f1" style={styles.detailsLoader} />
          ) : details ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsWeek}>
                  {format(new Date(details.weekStartDate), 'MMM d')} - {format(new Date(new Date(details.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')}
                </Text>
                <StatusBadge status={details.status} />
              </View>

              {details.projects?.map((project: any, index: number) => (
                <View key={index} style={styles.detailsProjectCard}>
                  <View style={styles.detailsProjectHeader}>
                    <View style={[styles.detailsProjectDot, { backgroundColor: COLORS[index % COLORS.length] }]} />
                    <Text style={[styles.detailsProjectName, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
                      {project.name}
                    </Text>
                    <Text style={styles.detailsProjectHours}>{formatHours(project.totalHours)}</Text>
                  </View>

                  <View style={styles.dailyEntries}>
                    {project.entries?.map((entry: any, idx: number) => (
                      <View key={idx} style={styles.dailyEntry}>
                        <Text style={styles.dailyEntryDay}>
                          {format(new Date(entry.date), 'EEE, MMM d')}
                        </Text>
                        <Text style={styles.dailyEntryHours}>{formatHours(entry.hoursWorked)}</Text>
                        {entry.description && (
                          <Text style={styles.dailyEntryDesc} numberOfLines={1}>
                            {entry.description}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.detailsFooter}>
                <Text style={styles.detailsTotalLabel}>Total Hours</Text>
                <Text style={styles.detailsTotalValue}>{formatHours(details.totalHours)}</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.detailsEmpty}>
              <Text style={styles.detailsEmptyText}>No details available</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const formatWeek = (weekStartDate: string) => {
  try {
    if (!weekStartDate) return '—';
    let d = new Date(weekStartDate);
    if (typeof weekStartDate === 'string' && weekStartDate.includes('T00:00:00')) {
      const [y, m, day] = weekStartDate.split('T')[0].split('-').map(Number);
      d = new Date(y, m - 1, day);
    }
    return `${format(d, 'yyyy')}-W${String(getISOWeek(d)).padStart(2, '0')}`;
  } catch {
    return '—';
  }
};

export default function AdminTimesheetScreen({ navigation }: { navigation: any }) {
  const route = useRoute();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<TimesheetAdminItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({
    userId: '',
    projectId: '',
    status: '',
    year: '',
    week: '',
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [search, setSearch] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetAdminItem | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showFilters, setShowFilters] = useState(false);

  // Get URL params if any (for deep linking)
  useEffect(() => {
    const params = route.params as any;
    if (params) {
      const newFilters = { ...filters };
      if (params.status) newFilters.status = params.status;
      if (params.userId) newFilters.userId = params.userId;
      if (params.projectId) newFilters.projectId = params.projectId;
      if (params.week) newFilters.week = params.week;
      setFilters(newFilters);
    }
  }, [route.params]);

  useEffect(() => {
    loadUserData();
    loadPreferences();
    fetchFilterOptions();
  }, []);

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

  const fetchFilterOptions = async () => {
    try {
      const options = await timesheetService.getAdminFilters();
      setFilterOptions(options);
    } catch (error) {
      console.log('Admin filters endpoint not available, generating fallbacks...', error);
      try {
        const [projectsRes, usersRes] = await Promise.all([
          projectAPI.getAll(),
          userAPI.getAll()
        ]);
        
        const projects = (projectsRes as any)?.data || projectsRes || [];
        const users = (usersRes as any)?.data || usersRes || [];
        
        const currentYear = new Date().getFullYear();
        setFilterOptions({
          projects: Array.isArray(projects) ? projects : [],
          employees: Array.isArray(users) ? users : [],
          locations: [],
          divisions: [],
          years: [currentYear.toString(), (currentYear - 1).toString()],
          weeks: []
        });
      } catch (fallbackError) {
        console.log('Fallback also failed, resetting filter options', fallbackError);
        setFilterOptions({ projects: [], employees: [], locations: [], divisions: [], years: [], weeks: [] });
      }
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await timesheetService.getAdminStats();
      setStats(statsData);
    } catch (error) {
      console.log('Admin stats endpoint not available, falling back to empty stats', error);
      setStats({
        totalTimesheets: 0,
        pendingReview: 0,
        approved: 0,
        rejected: 0,
        totalHours: 0,
        totalEmployees: 0,
        submittedUsersCount: 0
      });
    }
  };

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const response = await timesheetService.getAdminList({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
        search: search.length >= 2 ? search : '',
      });
      setTimesheets((response.data as any) || []);
      setPagination((response.pagination as any) || { page: 1, totalPages: 1, total: 0, limit: 10 });
    } catch (error: any) {
      console.log('Admin list endpoint not available, falling back to empty list', error);
      setTimesheets([]);
      setPagination(prev => ({ ...prev, totalPages: 1, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchTimesheets();
    }, [pagination.page, pagination.limit, filters, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchTimesheets(), fetchFilterOptions()]);
    setRefreshing(false);
  };

  const handleFilterApply = (newFilters: any) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    setFilterModalVisible(false);
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      projectId: '',
      status: '',
      year: '',
      week: '',
    });
    setSearch('');
    setPagination(prev => ({ ...prev, page: 1 }));
    setFilterModalVisible(false);
  };

  const handleViewDetails = (weekStartDate: string, userId: string) => {
    setSelectedWeek(weekStartDate);
    setSelectedUserId(userId);
    setDetailsModalVisible(true);
  };

  const handleApprove = async (timesheetId: string) => {
    Alert.alert(
      'Approve Timesheet',
      'Are you sure you want to approve this timesheet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setIsApproving(true);
            try {
              await timesheetService.approve(timesheetId);
              Alert.alert('Success', 'Timesheet approved successfully!');
              fetchStats();
              fetchTimesheets();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve timesheet');
            } finally {
              setIsApproving(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (timesheetId: string, reason: string) => {
    setIsRejecting(true);
    try {
      await timesheetService.reject(timesheetId, reason);
      Alert.alert('Success', 'Timesheet rejected');
      setRejectModalVisible(false);
      setSelectedTimesheet(null);
      fetchStats();
      fetchTimesheets();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject timesheet');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvData = await timesheetService.exportAdminList({
        ...filters,
        search: search.length >= 2 ? search : '',
      });

      if (Platform.OS === 'web') {
        const globalAny = globalThis as any;
        const blob = new globalAny.Blob([csvData], { type: 'text/csv' } as any);
        const url = globalAny.URL.createObjectURL(blob);
        const link = globalAny.document.createElement('a');
        link.href = url;
        link.download = `admin_timesheets_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        link.click();
        globalAny.URL.revokeObjectURL(url);
      } else {
        const fileName = `admin_timesheets_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        await exportFile(csvData as string, fileName, 'text/csv');
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const activeFilterCount = [filters.userId, filters.projectId, filters.status, filters.year, filters.week].filter(Boolean).length;

  return (
    <Layout
      title="Manage Timesheets"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }]}
        showsVerticalScrollIndicator={false}
      >


        {/* Stats Row */}
        <View style={styles.statsGrid}>
          <StatsCard title="TOTAL" value={stats?.totalTimesheets || 0} icon={FileText} color="#3b82f6" theme={theme} />
          <StatsCard title="PENDING" value={stats?.pendingReview || 0} icon={Clock} color="#f59e0b" theme={theme} />
          <StatsCard title="APPROVED" value={stats?.approved || 0} icon={CheckCircle} color="#10b981" theme={theme} />
          <StatsCard title="REJECTED" value={stats?.rejected || 0} icon={XCircle} color="#ef4444" theme={theme} />
          <StatsCard title="USERS" value={stats?.submittedUsersCount || 0} icon={Users} color="#8b5cf6" theme={theme} />
          <StatsCard title="HOURS" value={formatHours(stats?.totalHours || 0) + 'h'} icon={Clock} color="#ec4899" theme={theme} />
        </View>

        {/* Search and Filter Bar */}
        <View style={styles.searchBar}>
          <View style={[styles.searchContainer, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0' }]}>
            <Search size={18} color="#64748b" />
            <TextInput
              style={[styles.searchInput, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}
              placeholder="Search (min. 2 characters)..."
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.filterActionsRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0' }]}
              onPress={() => setFilterModalVisible(true)}
            >
              <SlidersHorizontal size={18} color="#6366f1" />
              <Text style={styles.filterButtonText}>Filters</Text>
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={handleClearFilters} style={styles.clearFiltersBtn}>
                <RotateCcw size={16} color="#ef4444" />
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: '#6366f1' }]}
              onPress={handleExportCSV}
            >
              <Download size={18} color="#ffffff" />
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersLabel}>Active Filters:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filters.userId && filterOptions?.employees?.find(e => e.id === filters.userId) && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>
                    Emp: {filterOptions.employees.find(e => e.id === filters.userId)?.employeeId}
                  </Text>
                </View>
              )}
              {filters.projectId && filterOptions?.projects?.find(p => p.id === filters.projectId) && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>
                    Proj: {filterOptions.projects.find(p => p.id === filters.projectId)?.name}
                  </Text>
                </View>
              )}
              {filters.status && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>
                    Status: {STATUSES.find(s => s.value === filters.status)?.label}
                  </Text>
                </View>
              )}
              {filters.year && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>Year: {filters.year}</Text>
                </View>
              )}
              {filters.week && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>Week: {formatWeek(filters.week)}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Table Header */}
        <View style={[styles.tableHeader, { backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
          <Text style={[styles.headerText, styles.headerEmployee]}>Employee</Text>
          <Text style={[styles.headerText, styles.headerWeek]}>Week</Text>
          <Text style={[styles.headerText, styles.headerProjects]}>Projects</Text>
          <Text style={[styles.headerText, styles.headerHours]}>Hours</Text>
          <Text style={[styles.headerText, styles.headerStatus]}>Status</Text>
          <Text style={[styles.headerText, styles.headerActions]}>Actions</Text>
        </View>

        {/* Timesheets List */}
        {loading && timesheets.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : timesheets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No timesheets found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search criteria</Text>
            <TouchableOpacity style={styles.resetButton} onPress={handleClearFilters}>
              <Text style={styles.resetButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tableBody}>
            {timesheets.map((item, index) => (
              <TimesheetRow
                key={item.id || item._id}
                item={item}
                index={index}
                onView={() => handleViewDetails(item.weekStartDate, item.userId?.id || item.userId?._id)}
                onApprove={() => handleApprove(item.id || item._id)}
                onReject={() => {
                  setSelectedTimesheet(item);
                  setRejectModalVisible(true);
                }}
                isApproving={isApproving}
                isRejecting={isRejecting}
                theme={theme}
              />
            ))}
          </View>
        )}

        {/* Pagination */}
        {!loading && timesheets.length > 0 && pagination.totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.paginationButton, pagination.page === 1 && styles.paginationButtonDisabled]}
              onPress={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft size={18} color={pagination.page === 1 ? '#94a3b8' : '#6366f1'} />
              <Text style={[styles.paginationText, pagination.page === 1 && styles.paginationTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <Text style={[styles.paginationInfo, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
              Page {pagination.page} of {pagination.totalPages}
            </Text>

            <TouchableOpacity
              style={[styles.paginationButton, pagination.page === pagination.totalPages && styles.paginationButtonDisabled]}
              onPress={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              <Text style={[styles.paginationText, pagination.page === pagination.totalPages && styles.paginationTextDisabled]}>
                Next
              </Text>
              <ChevronRight size={18} color={pagination.page === pagination.totalPages ? '#94a3b8' : '#6366f1'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Modals */}
        <FilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          filters={filters}
          onApply={handleFilterApply}
          onClear={handleClearFilters}
          filterOptions={filterOptions}
          theme={theme}
        />

        <TimesheetDetailsModal
          visible={detailsModalVisible}
          onClose={() => setDetailsModalVisible(false)}
          weekStartDate={selectedWeek || ''}
          userId={selectedUserId || ''}
          theme={theme}
        />

        <RejectModal
          visible={rejectModalVisible}
          onClose={() => {
            setRejectModalVisible(false);
            setSelectedTimesheet(null);
          }}
          timesheet={selectedTimesheet}
          onReject={(reason) => handleReject(selectedTimesheet?.id || selectedTimesheet?._id || '', reason)}
          loading={isRejecting}
          theme={theme}
        />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statsTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 14,
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChip: {
    backgroundColor: '#6366f115',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6366f1',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  headerEmployee: { width: '22%' },
  headerWeek: { width: '15%' },
  headerProjects: { width: '25%' },
  headerHours: { width: '10%', textAlign: 'center' },
  headerStatus: { width: '15%', textAlign: 'center' },
  headerActions: { width: '13%', textAlign: 'center' },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowEmployee: { width: '22%', flexDirection: 'row', alignItems: 'center', gap: 10 },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  employeeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  employeeId: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  rowWeek: { width: '15%' },
  weekText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submittedDate: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  rowProjects: { width: '25%' },
  projectsText: {
    fontSize: 12,
  },
  rowHours: { width: '10%', alignItems: 'center' },
  hoursText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowStatus: { width: '15%', alignItems: 'center', gap: 2 },
  approvedBy: {
    fontSize: 9,
    color: '#64748b',
  },
  rowActions: { width: '13%', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  paginationTextDisabled: {
    color: '#94a3b8',
  },
  paginationInfo: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  filterSafeSelector: {
    height: 44,
    backgroundColor: 'transparent',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  clearFilterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  applyFilterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  applyFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  rejectModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  rejectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rejectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ef444415',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rejectContent: {
    marginBottom: 20,
  },
  projectsPreview: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  projectsPreviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  projectsPreviewText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reasonSection: {
    gap: 8,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
  },
  rejectActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelRejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
  },
  confirmRejectDisabled: {
    opacity: 0.5,
  },
  confirmRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  detailsModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  detailsLoader: {
    padding: 40,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsWeek: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  detailsProjectCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  detailsProjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailsProjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailsProjectName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  detailsProjectHours: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  dailyEntries: {
    gap: 8,
  },
  dailyEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dailyEntryDay: {
    width: 80,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  dailyEntryHours: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  dailyEntryDesc: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
  },
  detailsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailsTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  detailsTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6366f1',
  },
  detailsEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  detailsEmptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});