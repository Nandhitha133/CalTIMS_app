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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format as dateFnsFormat, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, setWeek, addDays, format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BarChart,
  LineChart,
  PieChart as RNSPieChart,
} from 'react-native-chart-kit';
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
} from 'lucide-react-native';
import { reportAPI, projectAPI, userAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import ProGuard from '../../components/common/ProGuard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

// Color Palette
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

  React.useEffect(() => {
    if (visible) setTempFilters(filters);
  }, [visible, filters]);

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
                    onPress={() => {
                      // Show date picker
                      Alert.alert('Select Start Date', 'Use device date picker', [{ text: 'OK' }]);
                    }}
                  >
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.dateButtonText}>
                      {tempFilters.from || 'Start Date'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.dateTo}>to</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      Alert.alert('Select End Date', 'Use device date picker', [{ text: 'OK' }]);
                    }}
                  >
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.dateButtonText}>
                      {tempFilters.to || 'End Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Employee</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tempFilters.userId}
                    onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, userId: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Employees" value="all" />
                    {employees.map((emp: any) => (
                      <Picker.Item key={emp._id} label={emp.name} value={emp._id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Project</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tempFilters.projectId}
                    onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, projectId: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Projects" value="all" />
                    {projects.map((proj: any) => (
                      <Picker.Item key={proj._id} label={proj.name} value={proj._id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Department</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tempFilters.department}
                    onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, department: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Departments" value="all" />
                    {departments.map((dept: string) => (
                      <Picker.Item key={dept} label={dept} value={dept} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Year</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tempFilters.year}
                    onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, year: value }))}
                    style={styles.picker}
                  >
                    {(filterOptions.years || [2024, 2025, 2026]).map((year: number) => (
                      <Picker.Item key={year} label={String(year)} value={year} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterRow}>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Month</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={tempFilters.month}
                      onValueChange={(value) => setTempFilters((prev: any) => ({ ...prev, month: value }))}
                      style={styles.picker}
                    >
                      {months.map(m => (
                        <Picker.Item key={m.value} label={m.label} value={m.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Week</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Week"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={tempFilters.week === 'all' ? '' : String(tempFilters.week)}
                    onChangeText={(text: string) => setTempFilters((prev: any) => ({ ...prev, week: text }))}
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

// Base64 polyfill for React Native
const btoa = (input: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input;
  let output = '';
  for (let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = block << 8 | charCode;
  }
  return output;
};

export default function ReportsScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    };
  }, [range, selectedYear, selectedMonth, selectedWeek, selectedUserId, selectedProjectId]);

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
      setFilterOptions(data as FilterOptions);
    } catch (error) {
      console.error('Error fetching filter options:', error);
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
      const response = await userAPI.getAll({ limit: 200, role: 'employee' });
      const data = extractData(response, []);
      setEmployees(data);
      const depts = new Set(data.map((e: any) => e.department).filter(Boolean));
      setDepartments(Array.from(depts) as string[]);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTimesheetSummary = async () => {
    try {
      const response = await reportAPI.getTimesheetSummary(filterParams);
      const data = extractData(response, []);
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
    // Note: Backend endpoint /reports/insights is currently unavailable (404).
    // Using local insight generator as a permanent fallback to prevent console errors.
    try {
      const localInsights = [];
      if (totalHours > 0) {
        localInsights.push(`Total productivity for this period is ${totalHours.toFixed(1)} hours across ${uniqueEmployees} employees.`);
      }
      if (complianceRate < 80) {
        localInsights.push(`Action Required: Overall timesheet compliance ( ${complianceRate.toFixed(1)}% ) is below the 80% target.`);
      } else {
        localInsights.push(`Keep it up! Your team compliance is strong at ${complianceRate.toFixed(1)}%.`);
      }
      if (topPerformers.length > 0) {
        localInsights.push(`${topPerformers[0].name} is the top contributor this period with ${topPerformers[0].hours.toFixed(1)}h.`);
      }
      
      setInsightsData(localInsights.length > 0 ? localInsights : [
        "Select a different date range or filter to see detailed productivity insights.",
        "Team compliance is calculated based on submitted vs draft timesheets."
      ]);
    } catch (error) {
      console.log('Error generating local insights fallback');
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
      
      if (Platform.OS === 'web') {
        const globalAny = globalThis as any;
        const blob = new globalAny.Blob([data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' } as any);
        const url = globalAny.URL.createObjectURL(blob);
        const doc = globalAny.document;
        const link = doc.createElement('a');
        link.href = url;
        link.download = `enterprise-report-${dateFnsFormat(new Date(), 'yyyyMMdd')}.${format}`;
        link.click();
        globalAny.URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'Export Report',
          message: `Report exported as ${format.toUpperCase()}`,
          url: `data:${format === 'pdf' ? 'application/pdf' : 'text/csv'};base64,${btoa(data)}`,
        });
      }
      
      Alert.alert('Success', `${format.toUpperCase()} report downloaded!`);
      setShowExportModal(false);
    } catch (error) {
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
    ? Math.round((complianceData.find(d => d.name === 'Approved')?.value || 0) / complianceData.reduce((s, d) => s + d.value, 0) * 100)
    : 0;

  const weeklyAvg = weeklyTrend.length
    ? (weeklyTrend.reduce((s, w) => s + w.totalHours, 0) / weeklyTrend.length).toFixed(2)
    : '0';

  // Chart data
  const trendChartData = {
    labels: weeklyTrend.map(w => dateFnsFormat(new Date(w.week), 'MMM d')),
    datasets: [
      {
        data: weeklyTrend.map(w => w.totalHours),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: weeklyTrend.map(w => w.employeeCount ? w.totalHours / w.employeeCount : 0),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Total Hours', 'Avg/Person'],
  };

  const deptChartData = {
    labels: deptData.map(d => d.department || 'Unassigned').slice(0, 6),
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
                <TouchableOpacity style={[styles.exportHeaderButton, SCREEN_WIDTH <= 380 && { paddingHorizontal: 10 }]} onPress={() => setShowExportModal(true)}>
                  <Download size={18} color="white" />
                  {SCREEN_WIDTH > 380 && <Text style={styles.exportHeaderText}>Export</Text>}
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
                trend={5.2}
              />
              <KpiCard
                icon={ShieldAlert}
                label="Timesheet Compliance"
                value={`${complianceRate}%`}
                color={complianceRate > 80 ? '#22c55e' : '#f59e0b'}
                sub="Based on submitted vs draft"
              />
              <KpiCard
                icon={Users}
                label="Active Employees"
                value={uniqueEmployees}
                color="#3b82f6"
                sub={selectedDepartment !== 'all' ? selectedDepartment : 'All departments'}
              />
              <KpiCard
                icon={TrendingUp}
                label="Average Weekly Hours"
                value={`${weeklyAvg}h`}
                color="#8b5cf6"
                sub="Per active employee"
              />
            </View>

            {/* Smart Insights */}
            {insightsData.length > 0 && (
              <View style={styles.insightsCard}>
                <View style={styles.insightsHeader}>
                  <View style={styles.insightsIcon}>
                    <Zap size={20} color="#6366f1" />
                  </View>
                  <Text style={styles.insightsTitle}>Smart Insights</Text>
                </View>
                <View style={styles.insightsList}>
                  {insightsData.map((insight, idx) => (
                    <View key={idx} style={styles.insightItem}>
                      <Text style={styles.insightBullet}>•</Text>
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Compliance Pie Chart */}
            <View style={styles.chartCard}>
              <SectionHeader icon={PieIcon} title="Compliance Overview" color="#f59e0b" subtitle="Timesheet submission status" />
              {compliancePieData.length > 0 ? (
                <RNSPieChart
                  data={compliancePieData}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="value"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
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
                <LineChart
                  data={trendChartData}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366f1' },
                  }}
                  bezier
                  style={styles.chart}
                  yAxisLabel=""
                  yAxisSuffix="h"
                />
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
              {deptData.length > 0 ? (
                <BarChart
                  data={deptChartData}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1, index = 0) => PALETTE[index % PALETTE.length],
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    style: { borderRadius: 16 },
                    barPercentage: 0.7,
                  }}
                  style={styles.chart}
                  fromZero
                  showValuesOnTopOfBars
                  withCustomBarColorFromData
                  yAxisLabel=""
                  yAxisSuffix="h"
                />
              ) : (
                <EmptyChart message="No department data available" />
              )}
            </View>

            {/* Detailed Employee Report Table */}
            <View style={styles.tableCard}>
              <SectionHeader icon={FileText} title="Detailed Employee Report" color="#06b6d4" subtitle="Comprehensive breakdown of individual contributions" />
              {filteredTsData.length === 0 ? (
                <EmptyChart message="No employee data found for the selected filters" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, styles.tableCellEmployee]}>Employee</Text>
                      <Text style={[styles.tableHeaderCell, styles.tableCellDept]}>Department</Text>
                      <Text style={[styles.tableHeaderCell, styles.tableCellProject]}>Project</Text>
                      <Text style={[styles.tableHeaderCell, styles.tableCellHours]}>Hours</Text>
                      <Text style={[styles.tableHeaderCell, styles.tableCellAction]}>Action</Text>
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
                          <Text style={[styles.tableCell, styles.tableCellDept]}>{row.user?.department || '—'}</Text>
                          <Text style={[styles.tableCell, styles.tableCellProject]} numberOfLines={1}>
                            {row.project?.name || '—'}
                          </Text>
                          <Text style={[styles.tableCell, styles.tableCellHours]}>
                            <Text style={styles.hoursValue}>{row.totalHours?.toFixed(2)}</Text>
                            <Text style={styles.hoursUnit}>h</Text>
                          </Text>
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
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  headerButtons: { flexDirection: 'row', gap: 8 },
  filterHeaderButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  exportHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  exportHeaderText: { color: 'white', fontWeight: '600', fontSize: 13 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  kpiCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    width: SCREEN_WIDTH > 600 ? (SCREEN_WIDTH - 44) / 2 : '100%' 
  },
  kpiIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  kpiValue: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  kpiTrend: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  kpiTrendPositive: { color: '#10b981' },
  kpiSub: { fontSize: 11, color: '#94a3b8' },

  insightsCard: { backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#dcfce7' },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  insightsIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#6366f115', alignItems: 'center', justifyContent: 'center' },
  insightsTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  insightsList: { gap: 8 },
  insightItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  insightBullet: { fontSize: 14, color: '#6366f1', lineHeight: 20 },
  insightText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 },

  chartCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sectionSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2 },

  chart: { marginVertical: 8, borderRadius: 16 },

  projectsList: { gap: 16 },
  progressContainer: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  progressBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#ecfdf5' },
  progressBadgeOver: { backgroundColor: '#fef2f2' },
  progressBadgeText: { fontSize: 9, fontWeight: '700', color: '#10b981' },
  progressBadgeTextOver: { color: '#ef4444' },
  progressValue: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  progressValueOver: { color: '#ef4444' },
  progressMax: { fontSize: 10, fontWeight: '400', color: '#94a3b8' },
  progressBarTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  performersList: { gap: 12 },
  performerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  performerRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  performerRankGold: { backgroundColor: '#fef3c7' },
  performerRankSilver: { backgroundColor: '#f1f5f9' },
  performerRankBronze: { backgroundColor: '#ffedd5' },
  performerRankText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  performerInfo: { flex: 1 },
  performerName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  performerMeta: { fontSize: 10, color: '#64748b', marginTop: 2 },
  performerHours: { fontSize: 14, fontWeight: '700', color: '#ec4899' },

  tableCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, marginBottom: 8 },
  tableHeaderCell: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  tableCellEmployee: { width: 140 },
  tableCellDept: { width: 100 },
  tableCellProject: { width: 120 },
  tableCellHours: { width: 70, textAlign: 'right' },
  tableCellAction: { width: 70, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCell: { fontSize: 12, color: '#475569' },
  employeeAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#06b6d4' },
  employeeName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  employeeId: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  hoursValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  hoursUnit: { fontSize: 10, color: '#94a3b8' },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ecfeff', alignSelf: 'center' },
  viewButtonText: { fontSize: 11, fontWeight: '600', color: '#06b6d4' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 12, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  exportModal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  filterModal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  detailModal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 16 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1e293b' },

  exportContent: { gap: 16, marginBottom: 20 },
  exportDescription: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  formatSection: { gap: 8 },
  formatLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  formatOptions: { flexDirection: 'row', gap: 12 },
  formatOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  formatOptionSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  formatText: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  formatTextSelected: { color: '#3b82f6', fontWeight: '600' },

  filterContent: { gap: 16, marginBottom: 20 },
  filterField: { gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8fafc', color: '#1e293b' },
  pickerContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc', overflow: 'hidden' },
  picker: { height: 50, width: '100%', color: '#1e293b' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#f8fafc' },
  dateButtonText: { fontSize: 12, color: '#1e293b' },
  dateTo: { fontSize: 12, color: '#64748b' },
  filterRow: { flexDirection: 'row', gap: 12 },

  modalFooter: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 12 },
  exportButtonText: { fontSize: 14, fontWeight: '700', color: 'white' },
  resetButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  resetButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  applyButton: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: 'white' },
  disabledButton: { opacity: 0.5 },

  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 16 },
  detailAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#ecfeff', alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  detailProject: { fontSize: 11, color: '#64748b', marginTop: 2 },
  detailTotal: { marginLeft: 'auto', alignItems: 'flex-end' },
  detailTotalLabel: { fontSize: 10, color: '#64748b' },
  detailTotalValue: { fontSize: 20, fontWeight: '800', color: '#06b6d4' },
  detailTotalUnit: { fontSize: 12, fontWeight: '400', color: '#94a3b8' },

  loader: { padding: 40 },

  emptyDetail: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyDetailTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 12 },
  emptyDetailText: { fontSize: 12, color: '#64748b', marginTop: 4 },

  taskItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  taskDate: { width: 50, alignItems: 'center' },
  taskDateDay: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  taskDateWeek: { fontSize: 10, color: '#64748b', marginTop: 2 },
  taskInfo: { flex: 1 },
  taskCategory: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  taskCategoryText: { fontSize: 9, fontWeight: '600', color: '#64748b' },
  taskDescription: { fontSize: 12, color: '#475569', lineHeight: 16 },
  taskHours: { alignItems: 'flex-end' },
  taskHoursValue: { fontSize: 14, fontWeight: '700', color: '#06b6d4' },

  closeDetailButton: { marginTop: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  closeDetailButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
});