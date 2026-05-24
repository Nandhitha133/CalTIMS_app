// screens/timesheets/TimesheetHistoryScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import RNFS from 'react-native-fs';
import {
  Filter,
  Download,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Calendar,
  AlertTriangle,
  Search,
  Lock,
  ChevronDown,
  X,
  Clock,
  Briefcase,
  CheckCircle,
  XCircle as XCircleIcon,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react-native';
import { timesheetService, TimesheetHistoryItem } from '../../services/timesheet.service';
import { timesheetAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import SafeSelector from '../../components/common/SafeSelector';
import StatusBadge from '../../components/common/StatusBadge';
import { exportFile } from '../../utils/exportHelper';
import { formatHours } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const YEARS = ['All Years', '2026', '2025', '2024'];
const MONTHS = [
  'All Months', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const STATUSES = ['All Status', 'draft', 'submitted', 'approved', 'rejected'];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

// Filter Modal Component
const FilterModal = ({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  filters: any;
  onApply: (filters: any) => void;
  onClear: () => void;
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
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Year</Text>
              <SafeSelector
                options={YEARS.map(year => ({ label: year, value: year }))}
                selectedValue={tempFilters.year}
                onValueChange={(value) => setTempFilters({ ...tempFilters, year: value })}
                visible={activeSelector === 'year'}
                onOpen={() => setActiveSelector('year')}
                onClose={() => setActiveSelector(null)}
                style={styles.filterSafeSelector}
              />
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Month</Text>
              <SafeSelector
                options={MONTHS.map(month => ({ label: month, value: month }))}
                selectedValue={tempFilters.month}
                onValueChange={(value) => setTempFilters({ ...tempFilters, month: value })}
                visible={activeSelector === 'month'}
                onOpen={() => setActiveSelector('month')}
                onClose={() => setActiveSelector(null)}
                style={styles.filterSafeSelector}
              />
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <SafeSelector
                options={STATUSES.map(status => ({
                  label: status === 'All Status' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1),
                  value: status
                }))}
                selectedValue={tempFilters.status}
                onValueChange={(value) => setTempFilters({ ...tempFilters, status: value })}
                visible={activeSelector === 'status'}
                onOpen={() => setActiveSelector('status')}
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

// Timesheet Details Modal
const TimesheetDetailsModal = ({
  visible,
  onClose,
  weekStartDate,
  userId,
  timesheetId,
  organizationId,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  weekStartDate: string;
  userId: string;
  timesheetId?: string | null;
  organizationId?: string;
  theme: 'light' | 'dark';
}) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && (timesheetId || (weekStartDate && userId))) {
      fetchDetails();
    }
  }, [visible, weekStartDate, userId, timesheetId]);

  const fetchDetails = async () => {
    setLoading(true);
    let rawData: any = null;
    try {
      // Primary: use getById when timesheetId is available (reliable production endpoint)
      if (timesheetId) {
        try {
          const response: any = await timesheetAPI.getById(timesheetId);
          rawData = response?.data || response;
        } catch (err) {
          console.warn('getById failed, falling back to getDetails:', err);
        }
      }

      // Fallback: use getDetails endpoint
      if (!rawData && weekStartDate && userId) {
        try {
          const formattedDate = weekStartDate.includes('T')
            ? weekStartDate.split('T')[0]
            : weekStartDate;

          const response: any = await timesheetService.getDetails(formattedDate, userId, {
            organizationId,
            id: timesheetId
          });
          rawData = response?.data || response;
        } catch (err) {
          console.warn('getDetails fallback failed:', err);
        }
      }

      if (!rawData) {
        throw new Error('Timesheet details could not be found on the server. Please check your internet connection or try again.');
      }

      // Transform rows into projects format if the modal expects it
      if (rawData && !rawData.projects && rawData.rows) {
        rawData.projects = rawData.rows.map((row: any) => ({
          name: row.projectId?.name || row.category || 'Unknown',
          totalHours: (row.entries || []).reduce(
            (sum: number, e: any) => sum + (e.hoursWorked || 0), 0
          ),
          entries: row.entries || [],
        }));
        rawData.totalHours = rawData.projects.reduce(
          (sum: number, p: any) => sum + (p.totalHours || 0), 0
        );
      }

      setDetails(rawData);
    } catch (error: any) {
      console.error('Error fetching details:', error);
      Alert.alert('Error', error?.message || 'Failed to load timesheet details');
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

// Report Issue Modal
const ReportIssueModal = ({
  visible,
  onClose,
  timesheetId,
  onSubmit,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  timesheetId: string;
  onSubmit: (data: any) => void;
  theme: 'light' | 'dark';
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    // Map priority to match backend validation (Title Case)
    const mappedPriority = priority.charAt(0).toUpperCase() + priority.slice(1);
    
    onSubmit({ 
      title, 
      description, 
      category: 'timesheet error',
      priority: mappedPriority, 
      relatedTimesheet: timesheetId 
    });
    setTitle('');
    setDescription('');
    setPriority('medium');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.issueModal, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
              Report Issue
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}
            placeholder="Issue Title"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, styles.textArea, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}
            placeholder="Describe the issue..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.prioritySection}>
            <Text style={styles.priorityLabel}>Priority</Text>
            <View style={styles.priorityOptions}>
              {['low', 'medium', 'high'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    priority === p && styles.priorityChipActive,
                    p === 'low' && { borderColor: '#10b981' },
                    p === 'medium' && { borderColor: '#f59e0b' },
                    p === 'high' && { borderColor: '#ef4444' },
                    priority === p && p === 'low' && { backgroundColor: '#10b981' },
                    priority === p && p === 'medium' && { backgroundColor: '#f59e0b' },
                    priority === p && p === 'high' && { backgroundColor: '#ef4444' },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[
                    styles.priorityChipText,
                    priority === p && styles.priorityChipTextActive,
                  ]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.submitIssueButton} onPress={handleSubmit}>
            <AlertTriangle size={18} color="#ffffff" />
            <Text style={styles.submitIssueText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Export Modal Component
const ExportModal = memo(({
  visible,
  onClose,
  onExport,
  isExporting,
  theme
}: {
  visible: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'excel') => void;
  isExporting: boolean;
  theme: 'light' | 'dark';
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel'>('csv');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={exportModalStyles.overlay}>
        <View style={[exportModalStyles.container, { backgroundColor: theme === 'dark' ? '#1e293b' : 'white' }]}>
          <View style={[exportModalStyles.header, { borderBottomColor: theme === 'dark' ? '#334155' : '#e2e8f0' }]}>
            <Download size={24} color="#6366f1" />
            <Text style={[exportModalStyles.title, { color: theme === 'dark' ? 'white' : '#1e293b' }]}>Export Timesheets</Text>
            <TouchableOpacity onPress={onClose} style={exportModalStyles.closeButton}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={exportModalStyles.content}>
            <Text style={exportModalStyles.description}>
              Export your timesheet history data to your device. The file will include week dates, total hours, projects worked on, and status information.
            </Text>

            <View style={exportModalStyles.formatSection}>
              <Text style={[exportModalStyles.sectionTitle, { color: theme === 'dark' ? 'white' : '#1e293b' }]}>Select Format</Text>
              <View style={exportModalStyles.formatOptions}>
                <TouchableOpacity
                  style={[
                    exportModalStyles.formatOption,
                    { backgroundColor: theme === 'dark' ? '#334155' : '#f8fafc', borderColor: theme === 'dark' ? '#475569' : '#e2e8f0' },
                    selectedFormat === 'csv' && exportModalStyles.formatOptionSelected
                  ]}
                  onPress={() => setSelectedFormat('csv')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'csv' ? '#6366f1' : '#64748b'} />
                  <Text style={[
                    exportModalStyles.formatText,
                    selectedFormat === 'csv' && exportModalStyles.formatTextSelected
                  ]}>CSV Format</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    exportModalStyles.formatOption,
                    { backgroundColor: theme === 'dark' ? '#334155' : '#f8fafc', borderColor: theme === 'dark' ? '#475569' : '#e2e8f0' },
                    selectedFormat === 'excel' && exportModalStyles.formatOptionSelected
                  ]}
                  onPress={() => setSelectedFormat('excel')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'excel' ? '#6366f1' : '#64748b'} />
                  <Text style={[
                    exportModalStyles.formatText,
                    selectedFormat === 'excel' && exportModalStyles.formatTextSelected
                  ]}>Excel Format (.xls)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[exportModalStyles.infoBox, { backgroundColor: theme === 'dark' ? '#334155' : '#f8fafc', borderColor: theme === 'dark' ? '#475569' : '#e2e8f0' }]}>
              <AlertCircle size={14} color="#64748b" />
              <Text style={exportModalStyles.infoText}>
                Export will include your filtered timesheet history based on current selection.
              </Text>
            </View>
          </View>

          <View style={[exportModalStyles.footer, { borderTopColor: theme === 'dark' ? '#334155' : '#e2e8f0' }]}>
            <TouchableOpacity style={[exportModalStyles.cancelButton, { backgroundColor: theme === 'dark' ? '#334155' : '#f1f5f9' }]} onPress={onClose}>
              <Text style={exportModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[exportModalStyles.exportButton, isExporting && exportModalStyles.disabledButton]}
              onPress={() => onExport(selectedFormat)}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Download size={16} color="white" />
                  <Text style={exportModalStyles.exportButtonText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Timesheet Card Component for List View
const TimesheetCard = ({
  item,
  onView,
  onEdit,
  onDelete,
  onReport,
  theme,
  isPro
}: {
  item: TimesheetHistoryItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  theme: 'light' | 'dark';
  isPro: boolean;
}) => {
  const status = getStatus(item.statuses);
  const isDraft = status === 'draft';

  return (
    <View style={[styles.timesheetCard, { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeAvatar}>
            <Text style={styles.avatarText}>W</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.weekDate, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}>
              {format(new Date(item.weekStartDate), 'MMM d')} - {format(new Date(new Date(item.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')}
            </Text>
            <Text style={styles.lastUpdated}>
              Updated: {format(new Date(item.lastUpdated), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <StatusBadge status={status} />
      </View>

      {/* Details */}
      <View style={styles.cardContent}>
        <View style={styles.cardProjects}>
          {item.projects?.map((project: string, idx: number) => (
            <View key={idx} style={styles.projectTag}>
              <View style={[styles.projectDot, { backgroundColor: COLORS[idx % COLORS.length] }]} />
              <Text style={styles.projectName}>{project}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoRow}>
          <Clock size={14} color="#64748b" />
          <Text style={styles.infoText}>Total Hours: {formatHours(item.totalHours)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft} />
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onView} style={[styles.actionBtn, { backgroundColor: '#f5f3ff' }]}>
            <Eye size={16} color="#8b5cf6" />
          </TouchableOpacity>

          {isDraft && (
            <>
              <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, { backgroundColor: '#fffbeb' }]}>
                <Pencil size={16} color="#f59e0b" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}>
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={onReport}
            style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }, !isPro && styles.actionBtnDisabled]}
            disabled={!isPro}
          >
            {!isPro ? <Lock size={16} color="#94a3b8" /> : <AlertTriangle size={16} color="#64748b" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const getStatus = (statuses: string[]) => {
  if (statuses.includes('rejected')) return 'rejected';
  if (statuses.includes('submitted')) return 'submitted';
  if (statuses.includes('approved')) return 'approved';
  return 'draft';
};

export default function TimesheetHistoryScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [timesheets, setTimesheets] = useState<TimesheetHistoryItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    year: 'All Years',
    month: 'All Months',
    status: 'All Status',
  });
  const [search, setSearch] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    loadUserData();
    loadPreferences();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const role = parsedUser?.role?.toLowerCase() || '';
        const hasPro = role === 'admin' || role === 'super_admin' || role === 'owner';
        setIsPro(hasPro);
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

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: 10,
      };
      
      if (search.length >= 2) params.search = search;
      if (filters.year !== 'All Years') params.year = filters.year;
      if (filters.month !== 'All Months') params.month = filters.month;
      if (filters.status !== 'All Status') params.status = filters.status;
      if (user?.id || user?._id) params.userId = user.id || user._id;

      const response = await timesheetService.getHistory(params);
      setTimesheets(response.data || []);
      setPagination(response.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error: any) {
      console.error('Error fetching timesheets:', error);
      Alert.alert('Error', 'Failed to load timesheet history');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Do not re-fetch unconditionally to avoid endless loops when opening modals
      // But we can trigger a fetch if user object is loaded
      if (user) {
        fetchTimesheets();
      }
    }, [pagination?.page, filters, search, user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTimesheets();
    setRefreshing(false);
  };

  const handleFilterApply = (newFilters: any) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...(prev || { page: 1, totalPages: 1, total: 0 }), page: 1 }));
    setFilterModalVisible(false);
  };

  const handleClearFilters = () => {
    setFilters({
      year: 'All Years',
      month: 'All Months',
      status: 'All Status',
    });
    setSearch('');
    setPagination(prev => ({ ...(prev || { page: 1, totalPages: 1, total: 0 }), page: 1 }));
    setFilterModalVisible(false);
  };

  const handleViewDetails = (weekStartDate: string, userId: string, timesheetId?: string) => {
    setSelectedWeek(weekStartDate);
    setSelectedUserId(user?.id || user?._id || userId);
    setSelectedTimesheetId(timesheetId || null);
    setDetailsModalVisible(true);
  };

  const handleEditDraft = (timesheetId: string, weekStartDate: string) => {
    navigation.navigate('TimesheetEntry', { id: timesheetId, date: weekStartDate });
  };

  const handleDeleteDraft = (timesheetId: string) => {
    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await timesheetService.delete(timesheetId);
              Alert.alert('Success', 'Draft deleted successfully');
              fetchTimesheets();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete draft');
            }
          },
        },
      ]
    );
  };

  const handleReportIssue = (timesheetId: string) => {
    if (!isPro) {
      Alert.alert(
        'Pro Feature',
        'Reporting issues via incidents is an Enterprise Pro feature.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedTimesheetId(timesheetId);
    setIssueModalVisible(true);
  };

  const handleSubmitIssue = async (data: any) => {
    try {
      await timesheetService.reportIssue(data);
      Alert.alert('Success', 'Issue reported successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to report issue');
    }
  };

  const handleExport = async (formatType: 'csv' | 'excel') => {
    try {
      setIsExporting(true);

      // Fetch all historical data without pagination limit for export
      const response = await timesheetService.getHistory({
        limit: 10000,
        year: filters.year,
        month: filters.month,
        status: filters.status === 'All Status' ? '' : filters.status,
        search: search.length >= 2 ? search : '',
      });

      const allData = response.data || [];

      if (!allData.length) {
        Alert.alert('No Data', 'No timesheet history available to export.');
        return;
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const fileName = formatType === 'csv'
        ? `timesheet_history_${timestamp}.csv`
        : `timesheet_history_${timestamp}.xls`;

      const content = formatType === 'csv'
        ? convertToCSV(allData)
        : generateExcelHTML(allData);

      await exportFile(content, fileName, formatType === 'csv' ? 'text/csv' : 'application/vnd.ms-excel');
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Export failed:', error);
      Alert.alert('Error', error.message || 'Failed to export timesheet history');
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCSV = (data: TimesheetHistoryItem[]): string => {
    const headers = [
      'Week Start Date',
      'Week End Date',
      'Total Hours',
      'Status',
      'Projects',
      'Last Updated'
    ];

    const rows = data.map(item => {
      const weekEndDate = new Date(new Date(item.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000);
      const status = item.statuses.join(', ');
      const projects = item.projects.join('; ');

      return [
        format(new Date(item.weekStartDate), 'yyyy-MM-dd'),
        format(weekEndDate, 'yyyy-MM-dd'),
        item.totalHours,
        `"${status}"`,
        `"${projects.replace(/"/g, '""')}"`,
        format(new Date(item.lastUpdated), 'yyyy-MM-dd HH:mm:ss')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const generateExcelHTML = (data: TimesheetHistoryItem[]): string => {
    const headers = [
      'Week Start Date', 'Week End Date', 'Total Hours', 'Status', 'Projects', 'Last Updated'
    ];

    const rows = data.map(item => {
      const weekEndDate = new Date(new Date(item.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000);
      const status = item.statuses.join(', ');
      const projects = item.projects.join(', ');

      return `
        <tr>
          <td>${format(new Date(item.weekStartDate), 'yyyy-MM-dd')}</td>
          <td>${format(weekEndDate, 'yyyy-MM-dd')}</td>
          <td>${item.totalHours}</td>
          <td>${status}</td>
          <td>${escapeHtml(projects)}</td>
          <td>${format(new Date(item.lastUpdated), 'yyyy-MM-dd HH:mm:ss')}</td>
        </tr>
      `;
    }).join('');

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #6366f1; color: white; padding: 10px; text-align: left; border: 1px solid #e2e8f0; }
            td { padding: 8px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>Timesheet History Report</h2>
          <p>Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</p>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'submitted': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <Layout
      title="Timesheet History"
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


        {/* Search and Filter Bar */}
        <View style={styles.searchBar}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#64748b" />
            <TextInput
              style={[styles.searchInput, { color: theme === 'dark' ? '#ffffff' : '#1e293b' }]}
              placeholder="Search timesheets..."
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Filter size={18} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => setShowExportModal(true)}
          >
            <Download size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Active Filters Display */}
        {(filters.year !== 'All Years' || filters.month !== 'All Months' || filters.status !== 'All Status' || search.length > 0) && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersLabel}>Active Filters:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filters.year !== 'All Years' && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>Year: {filters.year}</Text>
                </View>
              )}
              {filters.month !== 'All Months' && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>Month: {filters.month}</Text>
                </View>
              )}
              {filters.status !== 'All Status' && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>Status: {filters.status}</Text>
                </View>
              )}
              {search.length > 0 && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipLabel}>Search: {search}</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timesheets List */}
        {loading && timesheets.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : timesheets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <XCircle size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No timesheets found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search criteria</Text>
            <TouchableOpacity style={styles.resetButton} onPress={handleClearFilters}>
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timesheetList}>
            {timesheets.map((item) => (
              <TimesheetCard
                key={item.id || item._id}
                item={item}
                onView={() => handleViewDetails(item.weekStartDate, (item.userId?.id || item.userId?._id || item.userId || '') as string, (item.id || item._id || '') as string)}
                onEdit={() => handleEditDraft((item.id || item._id || '') as string, item.weekStartDate)}
                onDelete={() => handleDeleteDraft((item.id || item._id || '') as string)}
                onReport={() => handleReportIssue((item.id || item._id || '') as string)}
                theme={theme}
                isPro={isPro}
              />
            ))}
          </View>
        )}

        {/* Pagination */}
        {!loading && timesheets.length > 0 && pagination.totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.paginationButton, pagination.page === 1 && styles.paginationButtonDisabled]}
              onPress={() => setPagination(prev => ({ ...(prev || { page: 1, totalPages: 1, total: 0 }), page: (prev?.page || 1) - 1 }))}
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
              onPress={() => setPagination(prev => ({ ...(prev || { page: 1, totalPages: 1, total: 0 }), page: (prev?.page || 1) + 1 }))}
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
          theme={theme}
        />

        <TimesheetDetailsModal
          visible={detailsModalVisible}
          onClose={() => {
            setDetailsModalVisible(false);
            setSelectedTimesheetId(null);
          }}
          weekStartDate={selectedWeek || ''}
          userId={selectedUserId || ''}
          timesheetId={selectedTimesheetId}
          organizationId={user?.organizationId || user?.organization?._id}
          theme={theme}
        />

        <ReportIssueModal
          visible={issueModalVisible}
          onClose={() => setIssueModalVisible(false)}
          timesheetId={selectedTimesheetId || ''}
          onSubmit={handleSubmitIssue}
          theme={theme}
        />

        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          isExporting={isExporting}
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 14,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
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
  filterSafeSelector: {
    height: 44,
    backgroundColor: 'transparent',
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
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },
  timesheetList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 20,
  },
  timesheetCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  weekDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  lastUpdated: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  cardProjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  projectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  projectName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  footerLeft: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  actionBtnDisabled: {
    opacity: 0.5,
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
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
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
    marginBottom: 24,
  },
  detailsProjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  detailsProjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detailsProjectName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  detailsProjectHours: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366f1',
  },
  dailyEntries: {
    paddingLeft: 22,
  },
  dailyEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dailyEntryDay: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  dailyEntryHours: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  dailyEntryDesc: {
    display: 'none', // Hide description as per image
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
  issueModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySection: {
    marginBottom: 20,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  priorityChipActive: {
    borderWidth: 0,
  },
  priorityChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityChipTextActive: {
    color: '#ffffff',
  },
  submitIssueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitIssueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

const exportModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 20,
  },
  formatSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  formatOptions: {
    gap: 8,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  formatOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  formatText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  formatTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
});