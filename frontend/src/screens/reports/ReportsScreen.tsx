// screens/reports/ReportsScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Dimensions,
  TextInput,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format as dateFnsFormat, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, setWeek, addDays, format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BarChart,
  LineChart,
  PieChart as RNSPieChart,
} from 'react-native-chart-kit';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import {
  X,
  Eye,
  FileText,
  Calendar,
  Clock,
  Download,
  TrendingUp,
  Users,
  Briefcase,
  BarChart2,
  PieChart as PieIcon,
  Activity,
  Filter,
  RefreshCw,
  AlertCircle,
  Award,
  Zap,
  ShieldAlert,
  ChevronDown,
  FileSpreadsheet,
  CheckCircle,
  Lock,
} from 'lucide-react-native';
import { reportAPI, projectAPI, userAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import SafeSelector from '../../components/common/SafeSelector';
import ProGuard from '../../components/common/ProGuard';
import { exportFile } from '../../utils/exportHelper';

const PALETTE = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#06b6d4', '#a855f7', '#84cc16'
];

// Types
interface FilterOptions {
  years: number[];
}

interface TimesheetSummary {
  _id?: { userId: string; projectId: string };
  user?: { name: string; employeeId: string; department: string; role: string };
  project?: { name: string };
  totalHours: number;
  timesheetCount: number;
}

interface ProjectUtilization {
  _id: string;
  project: { name: string; budgetHours?: number };
  totalHours: number;
  capacity?: number;
  employeeDetails?: Array<{
    userId: { name: string };
    loggedHours: number;
    budgetHours: number;
  }>;
}

interface LeaveSummary {
  name: string;
  value: number;
  fill: string;
}

interface WeeklyTrend {
  week: string;
  totalHours: number;
  employeeCount: number;
}

interface DepartmentSummary {
  department: string;
  totalHours: number;
}

interface ComplianceSummary {
  name: string;
  value: number;
  fill: string;
}

interface TaskDetail {
  date: string;
  hoursWorked: number;
  category: string;
  taskDescription: string;
}

// KPI Card Component
const KpiCard = ({ icon: Icon, label, value, color, sub, trend }: any) => (
  <View style={styles.kpiCard}>
    <View style={[styles.kpiIcon, { backgroundColor: `${color}15` }]}>
      <Icon size={24} color={color} />
    </View>
    <View style={styles.kpiContent}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <View style={styles.kpiValueRow}>
        <Text style={styles.kpiValue}>{value}</Text>
        {trend && (
          <Text style={[styles.kpiTrend, trend > 0 && styles.kpiTrendPositive]}>
            {trend > 0 ? '+' : ''}{trend}%
          </Text>
        )}
      </View>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  </View>
);

// Section Header Component
const SectionHeader = ({ icon: Icon, title, color = '#6366f1', subtitle }: any) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: `${color}18` }]}>
      <Icon size={16} color={color} />
    </View>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  </View>
);

// Empty Chart Component
const EmptyChart = ({ message = 'No data for selected period' }: { message?: string }) => (
  <View style={styles.emptyContainer}>
    <AlertCircle size={32} color="#94a3b8" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

// Progress Bar Component
const ProgressBar = ({ label, value, max, color, isBudget = false }: any) => {
  const percentage = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
  const isOver = value > max && max > 0;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{label}</Text>
          <View style={[styles.progressBadge, isOver && styles.progressBadgeOver]}>
            <Text style={[styles.progressBadgeText, isOver && styles.progressBadgeTextOver]}>
              {isOver ? 'Over' : 'Healthy'}
            </Text>
          </View>
        </View>
        <Text style={[styles.progressValue, isOver && styles.progressValueOver]}>
          {value.toFixed(1)}h
          <Text style={styles.progressMax}> / {max.toFixed(1)}h {isBudget ? '(Budget)' : '(Cap)'}</Text>
        </Text>
      </View>
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: isOver ? '#ef4444' : color }
          ]}
        />
      </View>
    </View>
  );
};

// Export Modal Component
const ExportModal = ({ visible, onClose, onExport, isExporting }: any) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv'>('pdf');

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.exportModal}>
          <View style={styles.modalHeader}>
            <Download size={24} color="#3b82f6" />
            <Text style={styles.modalTitle}>Export Report</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.exportContent}>
            <Text style={styles.exportDescription}>
              Export comprehensive report with all charts and data.
            </Text>
            <View style={styles.formatSection}>
              <Text style={styles.formatLabel}>Select Format</Text>
              <View style={styles.formatOptions}>
                <TouchableOpacity
                  style={[styles.formatOption, selectedFormat === 'pdf' && styles.formatOptionSelected]}
                  onPress={() => setSelectedFormat('pdf')}
                >
                  <FileText size={20} color={selectedFormat === 'pdf' ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.formatText, selectedFormat === 'pdf' && styles.formatTextSelected]}>
                    PDF Report
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatOption, selectedFormat === 'csv' && styles.formatOptionSelected]}
                  onPress={() => setSelectedFormat('csv')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'csv' ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.formatText, selectedFormat === 'csv' && styles.formatTextSelected]}>
                    CSV Data
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.disabledButton]}
              onPress={() => onExport(selectedFormat)}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Download size={16} color="white" />
                  <Text style={styles.exportButtonText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Filter Modal Component
const FilterModal = ({ visible, onClose, filters, onApply, onReset, filterOptions, employees, projects, departments }: any) => {
  const [tempFilters, setTempFilters] = useState(filters);
  const [activeSelector, setActiveSelector] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');

  React.useEffect(() => {
    if (visible) {
      setTempFilters(filters);
      setActiveSelector(null);
      setShowDatePicker(false);
    }
  }, [visible, filters]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateStr = dateFnsFormat(selectedDate, 'yyyy-MM-dd');
      setTempFilters((prev: any) => ({
        ...prev,
        [datePickerMode]: dateStr
      }));
    }
  };

  const openDatePicker = (mode: 'from' | 'to') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const months = [
    { label: 'All Months', value: 'all' },
    { label: 'January', value: '0' },
    { label: 'February', value: '1' },
    { label: 'March', value: '2' },
    { label: 'April', value: '3' },
    { label: 'May', value: '4' },
    { label: 'June', value: '5' },
    { label: 'July', value: '6' },
    { label: 'August', value: '7' },
    { label: 'September', value: '8' },
    { label: 'October', value: '9' },
    { label: 'November', value: '10' },
    { label: 'December', value: '11' },
  ];

  const weekOptions = [
    { label: 'All Weeks', value: 'all' },
    ...Array.from({ length: 52 }, (_, i) => ({ label: `Week ${i + 1}`, value: String(i + 1) }))
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Filter size={24} color="#3b82f6" />
            <Text style={styles.modalTitle}>Filter Reports</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterContent}>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Date Range</Text>
                <View style={styles.dateRangeRow}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openDatePicker('from')}
                  >
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.dateButtonText}>
                      {tempFilters.from || 'Start Date'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.dateTo}>to</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openDatePicker('to')}
                  >
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.dateButtonText}>
                      {tempFilters.to || 'End Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={tempFilters[datePickerMode] ? new Date(tempFilters[datePickerMode]) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={datePickerMode === 'to' && tempFilters.from ? new Date(tempFilters.from) : undefined}
                    onChange={onDateChange}
                  />
                )}
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Employee</Text>
                <SafeSelector
                  options={[
                    { label: 'All Staff', value: 'all' },
                    ...employees.map((emp: any) => ({ label: emp.name, value: emp._id })),
                  ]}
                  selectedValue={tempFilters.userId}
                  onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, userId: value }))}
                  visible={activeSelector === 'employee'}
                  onOpen={() => setActiveSelector('employee')}
                  onClose={() => setActiveSelector(null)}
                />
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Project</Text>
                <SafeSelector
                  options={[
                    { label: 'All Projects', value: 'all' },
                    ...projects.map((proj: any) => ({ label: proj.name, value: proj._id })),
                  ]}
                  selectedValue={tempFilters.projectId}
                  onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, projectId: value }))}
                  visible={activeSelector === 'project'}
                  onOpen={() => setActiveSelector('project')}
                  onClose={() => setActiveSelector(null)}
                />
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Department</Text>
                <SafeSelector
                  options={[
                    { label: 'All Departments', value: 'all' },
                    ...departments.map((dept: string) => ({ label: dept, value: dept })),
                  ]}
                  selectedValue={tempFilters.department}
                  onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, department: value }))}
                  visible={activeSelector === 'department'}
                  onOpen={() => setActiveSelector('department')}
                  onClose={() => setActiveSelector(null)}
                />
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Year</Text>
                <SafeSelector
                  options={(() => {
                    const currentYear = new Date().getFullYear();
                    const years = (filterOptions.years && filterOptions.years.length > 0
                      ? filterOptions.years
                      : [2024, 2025, 2026]
                    ).filter((year: number) => year <= currentYear);
                    return years.map((year: number) => ({
                      label: String(year),
                      value: year,
                    }));
                  })()}
                  selectedValue={tempFilters.year}
                  onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, year: value }))}
                  visible={activeSelector === 'year'}
                  onOpen={() => setActiveSelector('year')}
                  onClose={() => setActiveSelector(null)}
                />
              </View>

              <View style={styles.filterRow}>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Month</Text>
                  <SafeSelector
                    options={months}
                    selectedValue={tempFilters.month}
                    onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, month: value }))}
                    visible={activeSelector === 'month'}
                    onOpen={() => setActiveSelector('month')}
                    onClose={() => setActiveSelector(null)}
                  />
                </View>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Week</Text>
                  <SafeSelector
                    options={weekOptions}
                    selectedValue={tempFilters.week}
                    onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, week: value }))}
                    visible={activeSelector === 'week'}
                    onOpen={() => setActiveSelector('week')}
                    onClose={() => setActiveSelector(null)}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={onReset}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => onApply(tempFilters)}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Detail Modal Component
const DetailModal = ({ visible, taskDetails, onClose, isLoading, userName, projectName }: any) => {
  const totalHours = taskDetails?.reduce((s: number, t: TaskDetail) => s + t.hoursWorked, 0) || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.detailModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Task Breakdown</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.detailHeader}>
            <View style={styles.detailAvatar}>
              <Activity size={24} color="#06b6d4" />
            </View>
            <View>
              <Text style={styles.detailName}>{userName}</Text>
              <Text style={styles.detailProject}>{projectName || 'All Projects'}</Text>
            </View>
            <View style={styles.detailTotal}>
              <Text style={styles.detailTotalLabel}>Total Effort</Text>
              <Text style={styles.detailTotalValue}>{totalHours.toFixed(2)}<Text style={styles.detailTotalUnit}>h</Text></Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#06b6d4" style={styles.loader} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {taskDetails?.length === 0 ? (
                <View style={styles.emptyDetail}>
                  <FileText size={48} color="#cbd5e1" />
                  <Text style={styles.emptyDetailTitle}>No entries found</Text>
                  <Text style={styles.emptyDetailText}>No verified entries for this period</Text>
                </View>
              ) : (
                taskDetails?.map((task: TaskDetail, idx: number) => (
                  <View key={idx} style={styles.taskItem}>
                    <View style={styles.taskDate}>
                      <Text style={styles.taskDateDay}>
                        {task.date ? format(new Date(task.date), 'MMM d') : '—'}
                      </Text>
                      <Text style={styles.taskDateWeek}>
                        {task.date ? format(new Date(task.date), 'EEE') : ''}
                      </Text>
                    </View>
                    <View style={styles.taskInfo}>
                      <View style={styles.taskCategory}>
                        <Text style={styles.taskCategoryText}>{task.category || 'General'}</Text>
                      </View>
                      <Text style={styles.taskDescription} numberOfLines={2}>
                        {task.taskDescription || 'No description provided'}
                      </Text>
                    </View>
                    <View style={styles.taskHours}>
                      <Text style={styles.taskHoursValue}>{task.hoursWorked.toFixed(2)}h</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.closeDetailButton} onPress={onClose}>
            <Text style={styles.closeDetailButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Helper function to extract data from API response
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

export default function ReportsScreen({ navigation }: { navigation: any }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_INNER_WIDTH = SCREEN_WIDTH - 64;

  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendTooltip, setTrendTooltip] = useState<{ visible: boolean, x: number, y: number, index: number } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [detailParams, setDetailParams] = useState<any>(null);
  const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Filter states
  const [range, setRange] = useState({ from: '', to: '' });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedWeek, setSelectedWeek] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Data states
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [tsData, setTsData] = useState<TimesheetSummary[]>([]);
  const [projData, setProjData] = useState<ProjectUtilization[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveSummary[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [deptData, setDeptData] = useState<DepartmentSummary[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceSummary[]>([]);
  const [insightsData, setInsightsData] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ years: [] });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filterParams = useMemo(() => {
    let from = range.from;
    let to = range.to;

    if (!from && !to) {
      if (selectedWeek !== 'all') {
        const firstDayOfYear = new Date(selectedYear, 0, 1);
        const targetDay = setWeek(firstDayOfYear, parseInt(selectedWeek as string), { weekStartsOn: 1 });
        const start = startOfWeek(targetDay, { weekStartsOn: 1 });
        const end = endOfWeek(targetDay, { weekStartsOn: 1 });
        from = dateFnsFormat(start, 'yyyy-MM-dd');
        to = dateFnsFormat(end, 'yyyy-MM-dd');
      } else if (selectedMonth !== 'all') {
        const start = new Date(selectedYear, parseInt(selectedMonth as string), 1);
        const end = endOfMonth(start);
        from = dateFnsFormat(start, 'yyyy-MM-dd');
        to = dateFnsFormat(end, 'yyyy-MM-dd');
      } else {
        const start = startOfYear(new Date(selectedYear, 0, 1));
        const end = endOfYear(start);
        from = dateFnsFormat(start, 'yyyy-MM-dd');
        to = dateFnsFormat(end, 'yyyy-MM-dd');
      }
    }

    return {
      ...(from && { from }),
      ...(to && { to }),
      ...(selectedUserId !== 'all' && { userId: selectedUserId }),
      ...(selectedProjectId !== 'all' && { projectId: selectedProjectId }),
      ...(selectedDepartment !== 'all' && { department: selectedDepartment }),
    };
  }, [range, selectedYear, selectedMonth, selectedWeek, selectedUserId, selectedProjectId, selectedDepartment]);

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

  const fetchFilterOptions = async () => {
    try {
      const response = await reportAPI.getFilterOptions();
      const data = extractData(response, { years: [] });
      if (data && data.years) {
        setFilterOptions(data as FilterOptions);
      }
    } catch (error) {
      console.log('Using default filter options (Year range)');
      // If the API fails, we still have the default fallback in the UI
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll({ limit: 100 });
      const data = extractData(response, []);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await userAPI.getAll({ limit: 400, status: 'active', isActive: true }); // Fetch all active staff
      const data = extractData(response, []);

      // Filter out inactive employees just in case the API doesn't handle both flags
      const activeData = data.filter((e: any) => e.status === 'Active' || e.status === 'active' || e.isActive === true);

      setEmployees(activeData);
      const depts = new Set(activeData.map((e: any) => e.department).filter(Boolean));
      setDepartments(Array.from(depts) as string[]);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTimesheetSummary = async () => {
    try {
      const response = await reportAPI.getTimesheetSummary(filterParams);
      const data = extractData(response, []);
      console.log('Fetched Timesheet Summary rows:', data.length);
      setTsData(data);
    } catch (error) {
      console.error('Error fetching timesheet summary:', error);
      setTsData([]);
    }
  };

  const fetchProjectUtilization = async () => {
    try {
      const response = await reportAPI.getProjectUtilization(filterParams);
      const data = extractData(response, []);
      setProjData(data);
    } catch (error) {
      console.error('Error fetching project utilization:', error);
      setProjData([]);
    }
  };

  const fetchLeaveSummary = async () => {
    try {
      const response = await reportAPI.getLeaveSummary(filterParams);
      const data = extractData(response, []);
      setLeaveData(data);
    } catch (error) {
      console.error('Error fetching leave summary:', error);
      setLeaveData([]);
    }
  };

  const fetchWeeklyTrend = async () => {
    try {
      const response = await reportAPI.getWeeklyTrend(filterParams);
      const data = extractData(response, []);
      setWeeklyTrend(data);
    } catch (error) {
      console.error('Error fetching weekly trend:', error);
      setWeeklyTrend([]);
    }
  };

  const fetchDepartmentSummary = async () => {
    try {
      const response = await reportAPI.getDepartmentSummary(filterParams);
      const data = extractData(response, []);
      setDeptData(data);
    } catch (error) {
      console.error('Error fetching department summary:', error);
      setDeptData([]);
    }
  };

  const fetchComplianceSummary = async () => {
    try {
      const response = await reportAPI.getComplianceSummary(filterParams);
      const data = extractData(response, []);
      setComplianceData(data);
    } catch (error) {
      console.error('Error fetching compliance summary:', error);
      setComplianceData([]);
    }
  };

  const fetchSmartInsights = async () => {
    try {
      const response = await reportAPI.getSmartInsights(filterParams);
      const data = extractData(response, []);

      if (data && data.length > 0) {
        setInsightsData(data);
      } else {
        setInsightsData([]);
      }
    } catch (error) {
      console.log('Error fetching smart insights');
      setInsightsData([]);
    }
  };

  const fetchTaskDetails = async (params: any) => {
    setIsLoadingDetails(true);
    try {
      const response = await reportAPI.getTimesheetDetails(params);
      const data = extractData(response, []);
      setTaskDetails(data);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setTaskDetails([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchTimesheetSummary(),
      fetchProjectUtilization(),
      fetchLeaveSummary(),
      fetchWeeklyTrend(),
      fetchDepartmentSummary(),
      fetchComplianceSummary(),
      fetchSmartInsights(),
    ]);
    setLoading(false);
  };

  const fetchInitialData = async () => {
    await loadUserData();
    await Promise.all([
      fetchFilterOptions(),
      fetchProjects(),
      fetchEmployees(),
    ]);
    await fetchAllData();
  };

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [filterParams])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    setIsExporting(true);
    try {
      const params = {
        ...(filterParams.from && { from: filterParams.from }),
        ...(filterParams.to && { to: filterParams.to }),
        ...(selectedUserId !== 'all' && { userId: selectedUserId }),
        ...(selectedProjectId !== 'all' && { projectId: selectedProjectId }),
      };

      const response = format === 'pdf' ? await reportAPI.exportPDF(params) : await reportAPI.exportCSV(params);
      const data = extractData(response, '');

      if (!data || data.length === 0) {
        throw new Error('The server returned an empty report. Please try again or check your filters.');
      }

      const fileName = `enterprise-report-${dateFnsFormat(new Date(), 'yyyyMMdd')}.${format}`;
      const fileType = format === 'pdf' ? 'application/pdf' : 'text/csv';

      // Clean up data if it's a base64 string
      let exportData = data;
      if (format === 'pdf' && typeof data === 'string') {
        exportData = data.trim();
      }

      const isBase64 = format === 'pdf' || (typeof exportData === 'string' && exportData.length > 1000 && !exportData.includes(','));
      await exportFile(exportData, fileName, fileType, isBase64);

      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplyFilters = (filters: any) => {
    setRange({ from: filters.from || '', to: filters.to || '' });
    setSelectedUserId(filters.userId || 'all');
    setSelectedProjectId(filters.projectId || 'all');
    setSelectedDepartment(filters.department || 'all');
    setSelectedYear(filters.year || new Date().getFullYear());
    setSelectedMonth(filters.month || 'all');
    setSelectedWeek(filters.week || 'all');
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setRange({ from: '', to: '' });
    setSelectedUserId('all');
    setSelectedProjectId('all');
    setSelectedDepartment('all');
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth('all');
    setSelectedWeek('all');
    setShowFilterModal(false);
  };

  const handleViewDetails = async (userId: string, projectId: string, userName: string, projectName: string) => {
    setDetailParams({ userId, projectId, userName, projectName });
    await fetchTaskDetails({ userId, projectId, ...filterParams });
    setShowDetailModal(true);
  };

  // Calculate derived data
  const filteredTsData = selectedDepartment !== 'all'
    ? tsData.filter(r => r.user?.department === selectedDepartment)
    : tsData;

  const totalHours = filteredTsData.reduce((s, r) => s + (r.totalHours || 0), 0);
  const uniqueEmployees = new Set(filteredTsData.map(r => r._id?.userId)).size;

  const complianceRate = complianceData.length
    ? Math.round(
      (complianceData.filter(d => ['Approved', 'Pending Review', 'Admin Resolved', 'Locked', 'Submitted', 'Draft'].includes(d.name)).reduce((s, d) => s + d.value, 0)) /
      complianceData.reduce((s, d) => s + d.value, 0) * 100
    )
    : 0;

  const filteredUserIds = new Set(filteredTsData.map(r => String(r._id?.userId)));
  const activeEmployeesCount = selectedDepartment !== 'all'
    ? employees.filter(emp => emp.department === selectedDepartment).length
    : employees.length;

  const totalTimesheets = complianceData.reduce((s, d) => s + d.value, 0);

  const adminResolvedCount = complianceData.find(d =>
    d.name === 'Admin Resolved' ||
    d.name === 'Admin Filled' ||
    d.name === 'admin_filled'
  )?.value || 0;

  const submittedCount = complianceData.filter(d =>
    ['Submitted', 'Pending Review'].includes(d.name)
  ).reduce((s, d) => s + d.value, 0);

  const adminResolvedPercentage = totalTimesheets > 0
    ? Math.round((adminResolvedCount / totalTimesheets) * 100)
    : 0;

  const combinedPercentage = totalTimesheets > 0
    ? Math.round(((adminResolvedCount + submittedCount) / totalTimesheets) * 100)
    : 0;

  const weeklyAvg = weeklyTrend.length
    ? (weeklyTrend.reduce((s, w) => s + w.totalHours, 0) / weeklyTrend.length).toFixed(2)
    : '0';

  // Chart data
  const trendChartData = {
    labels: weeklyTrend.map(w => dateFnsFormat(new Date(w.week), 'MMM d')),
    datasets: [
      {
        data: weeklyTrend.map(w => w.employeeCount ? w.totalHours / w.employeeCount : 0),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 2,
        withDots: true,
      },
      {
        data: weeklyTrend.map(w => w.totalHours),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        withDots: true,
      }
    ],
  };

  const deptChartData = {
    labels: deptData.map(d => d.department || 'Unassigned'),
    datasets: [{
      data: deptData.map(d => d.totalHours),
      colors: deptData.map((_, i) => (opacity = 1) => PALETTE[i % PALETTE.length]),
    }],
  };

  const compliancePieData = complianceData.map((item, index) => ({
    name: item.name,
    value: item.value,
    color: item.fill,
    legendFontColor: '#64748b',
    legendFontSize: 11,
  }));

  // Top performers
  const topPerformers = tsData
    .reduce((acc: any[], row) => {
      const uid = row._id?.userId;
      const existing = acc.find(a => a._id === uid);
      if (existing) {
        existing.hours += (row.totalHours || 0);
      } else {
        acc.push({
          _id: uid,
          name: row.user?.name || 'Unknown',
          dept: row.user?.department || '—',
          hours: row.totalHours || 0,
          role: row.user?.role || 'Employee',
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ProGuard
      title="Enterprise Analytics"
      subtitle="Advanced reporting, compliance tracking, AI-powered insights, and department utilization metrics are available in the Enterprise Pro tier."
      icon={Zap}
    >
      <Layout
        title="Reports"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <PageHeader
            title="Enterprise Reports"
            subtitle="Comprehensive organization analytics and insights"
            icon={BarChart2}
            iconColor="#3b82f6"
            iconBgColor="#eff6ff"
            rightComponent={
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.filterHeaderButton} onPress={() => setShowFilterModal(true)}>
                  <Filter size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportHeaderButton} onPress={() => setShowExportModal(true)}>
                  <Download size={18} color="white" />
                  <Text style={styles.exportHeaderText}>Export</Text>
                </TouchableOpacity>
              </View>
            }
          />

          <View style={styles.content}>
            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              <KpiCard
                icon={Clock}
                label="Total Hours Logged"
                value={`${totalHours.toFixed(2)}h`}
                color="#6366f1"
                sub="Approved hours in period"

              />
              <KpiCard
                icon={ShieldAlert}
                label="Timesheet Compliance"
                value={`${complianceRate}%`}
                color={complianceRate > 80 ? '#22c55e' : '#f59e0b'}
                sub={`Admin Resolved + Submitted: ${combinedPercentage}% (Overall)`}
              />
              <KpiCard
                icon={Users}
                label="Active Employees"
                value={activeEmployeesCount}
                color="#3b82f6"
                sub={selectedDepartment !== 'all' ? selectedDepartment : 'All departments'}
              />

            </View>

            {/* Smart Insights */}
            {(() => {
              const displayInsights = insightsData.length > 0 ? insightsData : (() => {
                const localInsights = [];
                if (totalHours > 0) {
                  localInsights.push(`Total productivity for this period is ${totalHours.toFixed(1)} hours across ${uniqueEmployees} employees.`);
                }
                if (complianceRate < 80) {
                  localInsights.push(`Action Required: Overall timesheet compliance ( ${complianceRate.toFixed(1)}% ) is below the 80% target.`);
                } else {
                  localInsights.push(`Keep it up! Your team compliance is strong at ${complianceRate.toFixed(1)}%.`);
                }
                return localInsights;
              })();

              if (displayInsights.length === 0) return null;

              return (
                <View style={styles.insightsCard}>
                  <View style={styles.insightsHeader}>
                    <View style={styles.insightsIcon}>
                      <Zap size={20} color="#6366f1" />
                    </View>
                    <Text style={styles.insightsTitle}>Smart Insights</Text>
                  </View>
                  <View style={styles.insightsList}>
                    {displayInsights.map((insight, idx) => (
                      <View key={idx} style={styles.insightItem}>
                        <Text style={styles.insightBullet}>•</Text>
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* Compliance Pie Chart */}
            <View style={styles.chartCard}>
              <SectionHeader icon={PieIcon} title="Compliance Overview" color="#f59e0b" subtitle="Timesheet submission status" />
              {compliancePieData.length > 0 ? (
                <View style={{ alignItems: 'center' }}>
                  <RNSPieChart
                    data={compliancePieData}
                    width={CARD_INNER_WIDTH}
                    height={220}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="value"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    center={[10, 0]}
                    absolute
                  />
                </View>
              ) : (
                <EmptyChart message="No timesheets to analyze" />
              )}
            </View>

            {/* Project Utilization */}
            <View style={styles.chartCard}>
              <SectionHeader icon={Briefcase} title="Project Utilization" color="#3b82f6" subtitle="Actual hours vs Estimated Capacity" />
              {projData.length > 0 ? (
                <View style={styles.projectsList}>
                  {projData.slice(0, 8).map((proj, idx) => (
                    <ProgressBar
                      key={proj._id}
                      label={proj.project?.name || 'Unknown Project'}
                      value={proj.totalHours}
                      max={proj.capacity || (proj.totalHours + Math.max(10, proj.totalHours * 0.2))}
                      color={PALETTE[idx % PALETTE.length]}
                      isBudget={!!proj.project?.budgetHours}
                    />
                  ))}
                </View>
              ) : (
                <EmptyChart message="No active projects" />
              )}
            </View>

            {/* Productivity Trend Line Chart */}
            <View style={styles.chartCard}>
              <SectionHeader icon={Activity} title="Productivity Trend" color="#22c55e" subtitle="Weekly volume and average per person" />
              {weeklyTrend.length > 0 ? (
                <View style={{ position: 'relative' }}>
                  <LineChart
                    data={trendChartData}
                    width={CARD_INNER_WIDTH}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                      style: { borderRadius: 16 },
                      propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366f1' },
                      propsForBackgroundLines: {
                        strokeDasharray: '5, 5',
                        strokeWidth: 1,
                        stroke: '#e2e8f0',
                      },
                    }}
                    bezier
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    style={{
                      ...styles.chart,
                      paddingRight: 40,
                    }}
                    yAxisLabel=""
                    yAxisSuffix="h"
                    fromZero={true}
                    segments={4}
                    formatYLabel={(yValue) => Math.round(parseFloat(yValue)).toString()}
                    onDataPointClick={(data) => {
                      setTrendTooltip({
                        visible: true,
                        x: data.x,
                        y: data.y,
                        index: data.index,
                      });
                    }}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 16, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#6366f1', marginRight: 6 }} />
                      <Text style={{ fontSize: 12, color: '#64748b' }}>Avg/Person</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', marginRight: 6 }} />
                      <Text style={{ fontSize: 12, color: '#64748b' }}>Total Hours</Text>
                    </View>
                  </View>
                  {trendTooltip?.visible && weeklyTrend[trendTooltip.index] && (
                    <View style={{
                      position: 'absolute',
                      left: Math.max(0, Math.min(trendTooltip.x - 60, CARD_INNER_WIDTH - 120)),
                      top: Math.max(0, trendTooltip.y - 80),
                      backgroundColor: 'white',
                      padding: 10,
                      borderRadius: 8,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 4,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      zIndex: 100,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 4 }}>
                        {dateFnsFormat(new Date(weeklyTrend[trendTooltip.index].week), 'MMM d')}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6366f1', fontWeight: '600' }}>
                        Avg/Person: {(weeklyTrend[trendTooltip.index].totalHours / (weeklyTrend[trendTooltip.index].employeeCount || 1)).toFixed(2)}h
                      </Text>
                      <Text style={{ fontSize: 11, color: '#22c55e', fontWeight: '600' }}>
                        Total Hours: {weeklyTrend[trendTooltip.index].totalHours.toFixed(2)}h
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <EmptyChart message="Not enough weekly data to show trends" />
              )}
            </View>

            {/* Top Performers */}
            <View style={styles.chartCard}>
              <SectionHeader icon={Award} title="Top Performers" color="#ec4899" subtitle="Most hours logged" />
              {topPerformers.length > 0 ? (
                <View style={styles.performersList}>
                  {topPerformers.map((emp, idx) => (
                    <View key={emp._id} style={styles.performerItem}>
                      <View style={[styles.performerRank, idx === 0 && styles.performerRankGold, idx === 1 && styles.performerRankSilver, idx === 2 && styles.performerRankBronze]}>
                        <Text style={styles.performerRankText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.performerInfo}>
                        <Text style={styles.performerName}>{emp.name}</Text>
                        <Text style={styles.performerMeta}>{emp.dept} • {emp.role}</Text>
                      </View>
                      <Text style={styles.performerHours}>{emp.hours.toFixed(2)}h</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyChart message="No performers found" />
              )}
            </View>

            {/* Department Workload Bar Chart */}
            <View style={styles.chartCard}>
              <SectionHeader icon={BarChart2} title="Department Workload" color="#8b5cf6" subtitle="Total productive hours per department" />
              {deptData.length > 0 ? (() => {
                const maxHours = Math.max(...deptData.map(d => d.totalHours), 1);
                return (
                  <View style={styles.deptBarList}>
                    {deptData.map((dept, idx) => {
                      const fillPct = (dept.totalHours / maxHours) * 100;
                      const color = PALETTE[idx % PALETTE.length];
                      return (
                        <View key={idx} style={styles.deptBarRow}>
                          <Text style={styles.deptBarLabel} numberOfLines={2}>
                            {dept.department || 'Unassigned'}
                          </Text>
                          <View style={styles.deptBarTrack}>
                            <View
                              style={[
                                styles.deptBarFill,
                                { width: `${fillPct}%` as any, backgroundColor: color },
                              ]}
                            />
                          </View>
                          <Text style={[styles.deptBarValue, { color }]}>
                            {dept.totalHours.toFixed(1)}h
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })() : (
                <EmptyChart message="No department data available" />
              )}
            </View>

            {/* Detailed Employee Report Table */}
            <View style={styles.tableCard}>
              <SectionHeader icon={FileText} title="Detailed Staff Report" color="#06b6d4" subtitle="Comprehensive breakdown of individual contributions" />
              {filteredTsData.length === 0 ? (
                <EmptyChart message="No data found for the selected filters" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.tableHeader}>
                      <View style={styles.tableCellEmployee}>
                        <Text style={styles.tableHeaderCell}>Staff Member</Text>
                      </View>
                      <View style={styles.tableCellDept}>
                        <Text style={styles.tableHeaderCell}>Department</Text>
                      </View>
                      <View style={styles.tableCellProject}>
                        <Text style={styles.tableHeaderCell}>Project</Text>
                      </View>
                      <View style={styles.tableCellHours}>
                        <Text style={styles.tableHeaderCell}>Hours</Text>
                      </View>
                      <View style={styles.tableCellAction}>
                        <Text style={styles.tableHeaderCell}>Action</Text>
                      </View>
                    </View>
                    {filteredTsData.map((row, i) => {
                      const utilPercentage = Math.min(100, Math.round((row.totalHours / 40) * 100));
                      return (
                        <View key={i} style={styles.tableRow}>
                          <View style={styles.tableCellEmployee}>
                            <View style={styles.employeeAvatar}>
                              <Text style={styles.avatarText}>{(row.user?.name || '?')[0]}</Text>
                            </View>
                            <View>
                              <Text style={styles.employeeName}>{row.user?.name || '—'}</Text>
                              <Text style={styles.employeeId}>#{row.user?.employeeId}</Text>
                            </View>
                          </View>
                          <View style={styles.tableCellDept}>
                            <Text style={styles.tableCell}>{row.user?.department || '—'}</Text>
                          </View>
                          <View style={styles.tableCellProject}>
                            <Text style={styles.tableCell} numberOfLines={1}>
                              {row.project?.name || '—'}
                            </Text>
                          </View>
                          <View style={styles.tableCellHours}>
                            <Text style={styles.tableCell}>
                              <Text style={styles.hoursValue}>{row.totalHours?.toFixed(2)}</Text>
                              <Text style={styles.hoursUnit}>h</Text>
                            </Text>
                          </View>
                          <View style={styles.tableCellAction}>
                            <TouchableOpacity
                              style={styles.viewButton}
                              onPress={() => handleViewDetails(
                                row._id?.userId || '',
                                row._id?.projectId || '',
                                row.user?.name || 'Unknown',
                                row.project?.name || 'All Projects'
                              )}
                            >
                              <Eye size={14} color="#06b6d4" />
                              <Text style={styles.viewButtonText}>View</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Modals */}
        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          isExporting={isExporting}
        />

        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={{
            from: range.from,
            to: range.to,
            userId: selectedUserId,
            projectId: selectedProjectId,
            department: selectedDepartment,
            year: selectedYear,
            month: selectedMonth,
            week: selectedWeek,
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          filterOptions={filterOptions}
          employees={employees}
          projects={projects}
          departments={departments}
        />

        <DetailModal
          visible={showDetailModal}
          taskDetails={taskDetails}
          onClose={() => {
            setShowDetailModal(false);
            setDetailParams(null);
          }}
          isLoading={isLoadingDetails}
          userName={detailParams?.userName}
          projectName={detailParams?.projectName}
        />
      </Layout>
    </ProGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: scale(16), paddingBottom: verticalScale(100) },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  headerButtons: { flexDirection: 'row', gap: scale(8) },
  filterHeaderButton: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  exportHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: '#3b82f6', paddingHorizontal: scale(14), paddingVertical: verticalScale(10), borderRadius: scale(12) },
  exportHeaderText: { color: 'white', fontWeight: '600', fontSize: moderateScale(13) },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: scale(12), marginBottom: verticalScale(20) },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    backgroundColor: 'white',
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: scale(150),
    maxWidth: '100%',
  },
  kpiIcon: { width: scale(52), height: scale(52), borderRadius: scale(16), alignItems: 'center', justifyContent: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: moderateScale(13), color: '#64748b', fontWeight: '600', marginBottom: verticalScale(4) },
  kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: scale(8), marginBottom: verticalScale(4) },
  kpiValue: { fontSize: moderateScale(24), fontWeight: '800', color: '#1e293b' },
  kpiTrend: { fontSize: moderateScale(11), fontWeight: '700', color: '#94a3b8' },
  kpiTrendPositive: { color: '#10b981' },
  kpiSub: { fontSize: moderateScale(11), color: '#94a3b8' },

  insightsCard: { backgroundColor: '#f0fdf4', borderRadius: scale(16), padding: scale(16), marginBottom: verticalScale(20), borderWidth: 1, borderColor: '#dcfce7' },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: verticalScale(12) },
  insightsIcon: { width: scale(32), height: scale(32), borderRadius: scale(10), backgroundColor: '#6366f115', alignItems: 'center', justifyContent: 'center' },
  insightsTitle: { fontSize: moderateScale(15), fontWeight: '700', color: '#1e293b' },
  insightsList: { gap: scale(8) },
  insightItem: { flexDirection: 'row', gap: scale(8), alignItems: 'flex-start' },
  insightBullet: { fontSize: moderateScale(14), color: '#6366f1', lineHeight: moderateScale(20) },
  insightText: { flex: 1, fontSize: moderateScale(13), color: '#475569', lineHeight: moderateScale(20) },

  chartCard: { backgroundColor: 'white', borderRadius: scale(20), padding: scale(16), marginBottom: verticalScale(20), borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: verticalScale(16) },
  sectionIcon: { width: scale(32), height: scale(32), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: moderateScale(15), fontWeight: '700', color: '#1e293b' },
  sectionSubtitle: { fontSize: moderateScale(11), color: '#64748b', marginTop: verticalScale(2) },

  chart: { marginVertical: verticalScale(8), borderRadius: scale(16) },

  projectsList: { gap: scale(16) },
  progressContainer: { marginBottom: verticalScale(16) },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(6) },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  progressLabel: { fontSize: moderateScale(13), fontWeight: '600', color: '#1e293b' },
  progressBadge: { paddingHorizontal: scale(6), paddingVertical: verticalScale(2), borderRadius: scale(8), backgroundColor: '#ecfdf5' },
  progressBadgeOver: { backgroundColor: '#fef2f2' },
  progressBadgeText: { fontSize: moderateScale(9), fontWeight: '700', color: '#10b981' },
  progressBadgeTextOver: { color: '#ef4444' },
  progressValue: { fontSize: moderateScale(12), fontWeight: '600', color: '#1e293b' },
  progressValueOver: { color: '#ef4444' },
  progressMax: { fontSize: moderateScale(10), fontWeight: '400', color: '#94a3b8' },
  progressBarTrack: { height: verticalScale(6), backgroundColor: '#f1f5f9', borderRadius: scale(3), overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: scale(3) },

  performersList: { gap: scale(12) },
  performerItem: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingVertical: verticalScale(8) },
  performerRank: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  performerRankGold: { backgroundColor: '#fef3c7' },
  performerRankSilver: { backgroundColor: '#f1f5f9' },
  performerRankBronze: { backgroundColor: '#ffedd5' },
  performerRankText: { fontSize: moderateScale(14), fontWeight: '700', color: '#64748b' },
  performerInfo: { flex: 1 },
  performerName: { fontSize: moderateScale(14), fontWeight: '600', color: '#1e293b' },
  performerMeta: { fontSize: moderateScale(10), color: '#64748b', marginTop: verticalScale(2) },
  performerHours: { fontSize: moderateScale(14), fontWeight: '700', color: '#ec4899' },

  tableCard: { backgroundColor: 'white', borderRadius: scale(20), padding: scale(16), marginBottom: verticalScale(20), borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeaderCell: { fontSize: moderateScale(10), fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableCellEmployee: { width: scale(110), justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0', paddingHorizontal: scale(8) },
  tableCellDept: { width: scale(110), justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0', paddingHorizontal: scale(8) },
  tableCellProject: { width: scale(110), justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0', paddingHorizontal: scale(8) },
  tableCellHours: { width: scale(110), justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0', paddingHorizontal: scale(8) },
  tableCellAction: { width: scale(110), alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(8) },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: verticalScale(10), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableCell: { fontSize: moderateScale(12), color: '#475569' },
  employeeAvatar: { width: scale(32), height: scale(32), borderRadius: scale(10), backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginRight: scale(8) },
  avatarText: { fontSize: moderateScale(12), fontWeight: '700', color: '#06b6d4' },
  employeeName: { fontSize: moderateScale(13), fontWeight: '600', color: '#1e293b' },
  employeeId: { fontSize: moderateScale(9), color: '#94a3b8', marginTop: verticalScale(1) },
  hoursValue: { fontSize: moderateScale(13), fontWeight: '700', color: '#1e293b' },
  hoursUnit: { fontSize: moderateScale(10), color: '#94a3b8' },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(10), paddingVertical: verticalScale(6), borderRadius: scale(8), backgroundColor: '#ecfeff', alignSelf: 'center' },
  viewButtonText: { fontSize: moderateScale(11), fontWeight: '600', color: '#06b6d4' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: verticalScale(40) },
  emptyText: { fontSize: moderateScale(13), color: '#94a3b8', marginTop: verticalScale(12), textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  exportModal: { backgroundColor: 'white', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(20) },
  filterModal: { backgroundColor: 'white', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: '80%', padding: scale(20) },
  detailModal: { backgroundColor: 'white', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: '85%', padding: scale(20) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingBottom: verticalScale(16), borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: verticalScale(16) },
  modalTitle: { flex: 1, fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b' },

  exportContent: { gap: scale(16), marginBottom: verticalScale(20) },
  exportDescription: { fontSize: moderateScale(13), color: '#64748b', lineHeight: moderateScale(18) },
  formatSection: { gap: scale(8) },
  formatLabel: { fontSize: moderateScale(13), fontWeight: '600', color: '#1e293b' },
  formatOptions: { flexDirection: 'row', gap: scale(12) },
  formatOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), paddingVertical: verticalScale(12), borderRadius: scale(12), borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  formatOptionSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  formatText: { fontSize: moderateScale(13), fontWeight: '500', color: '#64748b' },
  formatTextSelected: { color: '#3b82f6', fontWeight: '600' },

  filterContent: { gap: scale(16), marginBottom: verticalScale(20) },
  filterField: { gap: scale(6) },
  filterLabel: { fontSize: moderateScale(12), fontWeight: '600', color: '#64748b' },
  filterInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: verticalScale(10), fontSize: moderateScale(14), backgroundColor: '#f8fafc', color: '#1e293b' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  dateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: scale(6), borderWidth: 1, borderColor: '#e2e8f0', borderRadius: scale(10), paddingHorizontal: scale(10), paddingVertical: verticalScale(10), backgroundColor: '#f8fafc' },
  dateButtonText: { fontSize: moderateScale(12), color: '#1e293b' },
  dateTo: { fontSize: moderateScale(12), color: '#64748b' },
  filterRow: { flexDirection: 'row', gap: scale(12) },

  modalFooter: { flexDirection: 'row', gap: scale(12), paddingTop: verticalScale(16), borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { flex: 1, paddingVertical: verticalScale(12), borderRadius: scale(12), backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#64748b' },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), backgroundColor: '#3b82f6', paddingVertical: verticalScale(12), borderRadius: scale(12) },
  exportButtonText: { fontSize: moderateScale(14), fontWeight: '700', color: 'white' },
  resetButton: { flex: 1, paddingVertical: verticalScale(12), borderRadius: scale(12), backgroundColor: '#f1f5f9', alignItems: 'center' },
  resetButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#64748b' },
  applyButton: { flex: 2, paddingVertical: verticalScale(12), borderRadius: scale(12), backgroundColor: '#3b82f6', alignItems: 'center' },
  applyButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: 'white' },
  disabledButton: { opacity: 0.5 },

  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingBottom: verticalScale(16), borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: verticalScale(16) },
  detailAvatar: { width: scale(48), height: scale(48), borderRadius: scale(16), backgroundColor: '#ecfeff', alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: moderateScale(15), fontWeight: '700', color: '#1e293b' },
  detailProject: { fontSize: moderateScale(11), color: '#64748b', marginTop: verticalScale(2) },
  detailTotal: { marginLeft: 'auto', alignItems: 'flex-end' },
  detailTotalLabel: { fontSize: moderateScale(10), color: '#64748b' },
  detailTotalValue: { fontSize: moderateScale(20), fontWeight: '800', color: '#06b6d4' },
  detailTotalUnit: { fontSize: moderateScale(12), fontWeight: '400', color: '#94a3b8' },

  loader: { padding: scale(40) },

  emptyDetail: { alignItems: 'center', justifyContent: 'center', paddingVertical: verticalScale(48) },
  emptyDetailTitle: { fontSize: moderateScale(15), fontWeight: '600', color: '#1e293b', marginTop: verticalScale(12) },
  emptyDetailText: { fontSize: moderateScale(12), color: '#64748b', marginTop: verticalScale(4) },

  taskItem: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  taskDate: { width: scale(50), alignItems: 'center' },
  taskDateDay: { fontSize: moderateScale(14), fontWeight: '700', color: '#1e293b' },
  taskDateWeek: { fontSize: moderateScale(10), color: '#64748b', marginTop: verticalScale(2) },
  taskInfo: { flex: 1 },
  taskCategory: { backgroundColor: '#f1f5f9', paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(8), alignSelf: 'flex-start', marginBottom: verticalScale(4) },
  taskCategoryText: { fontSize: moderateScale(9), fontWeight: '600', color: '#64748b' },
  taskDescription: { fontSize: moderateScale(12), color: '#475569', lineHeight: moderateScale(16) },
  taskHours: { alignItems: 'flex-end' },
  taskHoursValue: { fontSize: moderateScale(14), fontWeight: '700', color: '#06b6d4' },

  closeDetailButton: { marginTop: verticalScale(16), paddingVertical: verticalScale(12), borderRadius: scale(12), backgroundColor: '#f1f5f9', alignItems: 'center' },
  closeDetailButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#64748b' },

  // Department horizontal bar chart
  deptBarList: { gap: verticalScale(10), paddingVertical: verticalScale(4) },
  deptBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    minHeight: verticalScale(36),
  },
  deptBarLabel: {
    width: '28%',
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
    flexShrink: 0,
  },
  deptBarTrack: {
    flex: 1,
    height: verticalScale(20),
    backgroundColor: '#f1f5f9',
    borderRadius: scale(10),
    overflow: 'hidden',
  },
  deptBarFill: {
    height: '100%',
    borderRadius: scale(10),
    minWidth: scale(4),
  },
  deptBarValue: {
    width: scale(48),
    fontSize: moderateScale(12),
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 0,
  },
});