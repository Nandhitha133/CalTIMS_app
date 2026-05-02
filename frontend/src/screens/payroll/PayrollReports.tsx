// screens/payroll/PayrollReports.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Share,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Wallet,
  Calculator,
  TrendingUp,
  TrendingDown,
  Building2,
  Activity,
  Download,
  FileSpreadsheet,
  RefreshCw,
  BarChart3,
  Users,
  AlertCircle,
  CheckCircle2,
  Archive,
  FileText,
  Percent,
  X,
} from 'lucide-react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/formatters';
import RNFS from 'react-native-fs';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

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
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

// Helper to extract data from API response
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

// KPI Card Component
const KPICard = ({ label, value, subtitle, icon: Icon, color, bgColor, onPress }: any) => (
  <TouchableOpacity style={[styles.kpiCard, { borderBottomColor: color }]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.kpiIcon, { backgroundColor: bgColor || `${color}15` }]}>
      <Icon size={18} color={color} />
    </View>
    <View style={styles.kpiContent}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
    </View>
  </TouchableOpacity>
);

// Department Item Component
const DepartmentItem = ({ name, percentage, color, isActive, onPress }: any) => (
  <TouchableOpacity
    style={[styles.deptItem, isActive && styles.deptItemActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.deptLeft}>
      <View style={[styles.deptDot, { backgroundColor: color }]} />
      <Text style={styles.deptName}>{name}</Text>
    </View>
    <Text style={styles.deptPercentage}>{percentage}%</Text>
  </TouchableOpacity>
);

// Insight Card Component
const InsightCard = ({ title, message, icon: Icon, color }: any) => (
  <View style={[styles.insightCard, { backgroundColor: COLORS.dark }]}>
    <View style={[styles.insightIcon, { backgroundColor: `${color}20` }]}>
      <Icon size={14} color={color} />
    </View>
    <View style={styles.insightContent}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightMessage}>{message}</Text>
    </View>
  </View>
);

// Employee Row Component for Table
const EmployeeRow = ({ employee, currencySymbol }: any) => (
  <View style={styles.tableRow}>
    <View style={styles.tableCellEmployee}>
      <View style={styles.employeeAvatar}>
        <Text style={styles.employeeInitial}>{employee.name?.charAt(0) || '?'}</Text>
      </View>
      <View>
        <Text style={styles.employeeName}>{employee.name}</Text>
        <Text style={styles.employeeId}>{employee.employeeId}</Text>
      </View>
    </View>
    <View style={styles.tableCellDept}>
      <Text style={styles.deptText}>{employee.department || 'Unassigned'}</Text>
    </View>
    <View style={styles.tableCellAmount}>
      <Text style={styles.grossAmount}>{currencySymbol}{formatCurrency(employee.gross)}</Text>
    </View>
    <View style={styles.tableCellAmount}>
      <Text style={styles.deductionAmount}>-{currencySymbol}{formatCurrency(employee.deductions)}</Text>
    </View>
    <View style={styles.tableCellAmount}>
      <Text style={styles.netAmount}>{currencySymbol}{formatCurrency(employee.net)}</Text>
    </View>
  </View>
);

// Export Modal Component
const ExportModal = ({ visible, onClose, onExport, isExporting, reportPeriod }: any) => {
  const [selectedType, setSelectedType] = useState('Summary');

  const exportTypes = [
    { id: 'Summary', label: 'Executive Summary', icon: TrendingUp, color: COLORS.primary },
    { id: 'DeptAnalysis', label: 'Department Analysis', icon: Users, color: COLORS.info },
    { id: 'Tax', label: 'Tax Compliance', icon: Percent, color: COLORS.warning },
    { id: 'Export', label: 'Full Payroll Ledger', icon: FileText, color: COLORS.success },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.exportModal}>
          <View style={styles.modalHeader}>
            <Download size={24} color={COLORS.primary} />
            <Text style={styles.modalTitle}>Export Report</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.exportContent}>
            <Text style={styles.exportDescription}>
              Select report type for {new Date(reportPeriod.year, reportPeriod.month - 1).toLocaleString('default', { month: 'long' })} {reportPeriod.year}
            </Text>
            <View style={styles.exportTypes}>
              {exportTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.exportType, selectedType === type.id && styles.exportTypeSelected]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <type.icon size={20} color={selectedType === type.id ? type.color : COLORS.gray} />
                  <Text style={[styles.exportTypeText, selectedType === type.id && { color: type.color }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.disabledButton]}
              onPress={() => onExport(selectedType)}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Download size={16} color={COLORS.white} />
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

// Trend Chart Component
const TrendChart = ({ data, chartType, metricLabel, currencySymbol }: any) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartPlaceholderText}>No data available for selected period</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map((item: any) => item.name),
    datasets: [
      {
        data: data.map((item: any) => item.value),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: [metricLabel === 'grossPay' ? 'Gross Pay' : metricLabel === 'netPay' ? 'Net Pay' : metricLabel === 'deductions' ? 'Deductions' : 'Employees'],
  };

  const chartConfig = {
    backgroundColor: COLORS.white,
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    decimalPlaces: metricLabel === 'employees' ? 0 : 1,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366f1' },
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      if (metricLabel === 'employees') return Math.round(num).toString();
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return `${currencySymbol}${num.toFixed(0)}`;
    },
  };

  if (chartType === 'bar') {
    return (
      <BarChart
        data={{
          labels: chartData.labels,
          datasets: chartData.datasets
        }}
        width={Math.round(Math.max(CHART_WIDTH, data.length * 60))}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          ...chartConfig,
          fillShadowGradient: COLORS.primary,
          fillShadowGradientOpacity: 1,
        }}
        style={styles.chart}
        fromZero
        withInnerLines={false}
      />
    );
  } else if (chartType === 'line') {
    return (
      <LineChart
        data={chartData}
        width={Math.max(CHART_WIDTH, data.length * 60)}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={chartConfig}
        style={styles.chart}
        bezier
        withDots
        withInnerLines={false}
      />
    );
  } else {
    // Area chart - using LineChart with fill gradient effect
    return (
      <LineChart
        data={chartData}
        width={Math.max(CHART_WIDTH, data.length * 60)}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          ...chartConfig,
          backgroundColor: COLORS.white,
          backgroundGradientFrom: COLORS.white,
          backgroundGradientTo: COLORS.white,
          fillShadowGradient: COLORS.primary,
          fillShadowGradientOpacity: 0.3,
        }}
        style={styles.chart}
        bezier
        withDots
        withInnerLines={false}
      />
    );
  }
};

// Department Pie Chart Component
const DepartmentPieChart = ({ data, onSelectDepartment, selectedDepartment }: any) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartPlaceholderText}>No department data available</Text>
      </View>
    );
  }

  const pieData = data.map((item: any) => ({
    name: item.name,
    value: item.value,
    color: item.color,
    legendFontColor: COLORS.gray,
    legendFontSize: 10,
  }));

  return (
    <PieChart
      data={pieData}
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
  );
};

export function PayrollReports({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [chartType, setChartType] = useState('area');
  const [timeRange, setTimeRange] = useState(6);
  const [selectedMetric, setSelectedMetric] = useState('netPay');
  const [tableFilter, setTableFilter] = useState('All');
  const [reportPeriod, setReportPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getSettings();
      const data = extractData(response);
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await payrollAPI.getHistory({});
      const data = extractData(response, []);
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchHistory()]);
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
    }, [])
  );

  const safe = (val: any) => Number(val || 0);

  const processedData = useMemo(() => {
    if (!history.length) {
      return {
        trends: [],
        depts: [],
        insights: [],
        summary: { totalCost: 0, avgCost: 0, growth: 0, highDept: 'N/A', netGrossRatio: 0, employeeCount: 0 },
      };
    }

    // Trends Calculation
    const monthMap: any = {};
    const allMonths = [];
    const now = new Date();

    for (let i = 0; i < timeRange; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      allMonths.unshift({
        key,
        label: `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      });
    }

    history.forEach((p: any) => {
      const key = `${p.year}-${p.month}`;
      if (!monthMap[key]) {
        monthMap[key] = { grossPay: 0, netPay: 0, deductions: 0, employees: new Set() };
      }
      monthMap[key].grossPay += safe(p.breakdown?.earnings?.grossEarnings);
      monthMap[key].netPay += safe(p.breakdown?.netPay);
      monthMap[key].deductions += safe(p.breakdown?.deductions?.totalDeductions);
      monthMap[key].employees.add(p.user?._id || p.user);
    });

    const trends = allMonths.map((m) => {
      const data = monthMap[m.key] || { grossPay: 0, netPay: 0, deductions: 0, employees: new Set() };
      return {
        name: m.label,
        grossPay: data.grossPay,
        netPay: data.netPay,
        deductions: data.deductions,
        employees: data.employees.size,
        value: selectedMetric === 'employees' ? data.employees.size : data[selectedMetric] || 0,
      };
    });

    // Department Distribution
    const depts: any = {};
    history.forEach((p: any) => {
      const d = p.user?.department || 'Operations';
      depts[d] = (depts[d] || 0) + safe(p.breakdown?.earnings?.grossEarnings);
    });
    const deptColors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.error, COLORS.purple, COLORS.pink];
    const deptList = Object.entries(depts).map(([name, value], i) => ({
      name,
      value: value as number,
      color: deptColors[i % deptColors.length],
    })).sort((a, b) => b.value - a.value);

    // Current Month Stats
    const sortedMonths = Object.keys(monthMap).sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y2 - y1 || m2 - m1;
    });
    const latestMonthKey = sortedMonths[0];
    const prevMonthKey = sortedMonths[1];

    const curr = monthMap[latestMonthKey] || { grossPay: 0, netPay: 0, deductions: 0, employees: new Set() };
    const prev = monthMap[prevMonthKey] || { grossPay: 0, netPay: 0 };
    const growth = prev.grossPay > 0 ? ((curr.grossPay - prev.grossPay) / prev.grossPay) * 100 : 0;
    const highDept = deptList[0]?.name || 'N/A';
    const netGrossRatio = curr.grossPay > 0 ? (curr.netPay / curr.grossPay) * 100 : 0;

    const [lYear, lMonth] = (latestMonthKey || '').split('-').map(Number);
    const anomalies = history.filter(
      (h: any) =>
        h.month === lMonth &&
        h.year === lYear &&
        (safe(h.breakdown?.deductions?.totalDeductions) > safe(h.breakdown?.earnings?.grossEarnings) * 0.3 ||
          safe(h.breakdown?.netPay) === 0)
    );

    const insights = [
      {
        title: 'Efficiency',
        message: `Net vs Gross ratio is ${netGrossRatio.toFixed(2)}%`,
        icon: Activity,
        color: COLORS.primary,
      },
      {
        title: 'Growth',
        message: `Payroll ${growth >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growth).toFixed(2)}%`,
        icon: growth >= 0 ? TrendingUp : TrendingDown,
        color: growth >= 0 ? COLORS.success : COLORS.error,
      },
      {
        title: 'Anomalies',
        message: anomalies.length > 0 ? `${anomalies.length} employees flagged` : 'No anomalies detected',
        icon: anomalies.length > 0 ? AlertCircle : CheckCircle2,
        color: anomalies.length > 0 ? COLORS.error : COLORS.success,
      },
    ];

    const summary = {
      totalCost: curr.grossPay,
      avgCost: curr.employees.size > 0 ? curr.grossPay / curr.employees.size : 0,
      growth,
      highDept,
      netGrossRatio,
      employeeCount: curr.employees.size,
    };

    return { trends, depts: deptList, insights, summary };
  }, [history, timeRange, selectedMetric]);

  const filteredTableData = useMemo(() => {
    if (!history.length) return [];
    let data = history.filter(
      (h: any) => h.month === new Date().getMonth() + 1 && h.year === new Date().getFullYear()
    );
    if (tableFilter !== 'All') {
      data = data.filter((h: any) => h.user?.department === tableFilter);
    }
    return data.map((h: any) => ({
      name: h.user?.name || h.employeeInfo?.name,
      employeeId: h.user?.employeeId || h.employeeInfo?.employeeId,
      department: h.user?.department || h.employeeInfo?.department || 'Unassigned',
      gross: safe(h.breakdown?.earnings?.grossEarnings),
      deductions: safe(h.breakdown?.deductions?.totalDeductions),
      net: safe(h.breakdown?.netPay),
    }));
  }, [history, tableFilter]);

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const permission = Platform.Version >= 33
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;
        const result = await request(permission);
        return result === RESULTS.GRANTED;
      } catch (error) {
        console.error('Permission error:', error);
        return false;
      }
    }
    return true;
  };

  const downloadReport = async (type: string) => {
    setIsExporting(true);
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is needed to save exported files.');
        return;
      }

      const params = { month: reportPeriod.month, year: reportPeriod.year };
      let content = '';
      let fileName = '';

      if (type === 'Summary') {
        const response = await payrollAPI.getSummaryReport(params);
        const data = extractData(response);
        const headers = ['Metric', 'Value'];
        const rows = [
          ['Total Employees', data.totalEmployees],
          ['Total Gross Disbursement', data.totalGrossEarnings],
          ['Total Statutory Deductions', data.totalDeductions],
          ['Total Net Liquidity (Payout)', data.totalNetPay],
        ];
        content = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
        fileName = `Payroll_Summary_${reportPeriod.month}_${reportPeriod.year}.csv`;
      } else if (type === 'DeptAnalysis') {
        const response = await payrollAPI.getDepartmentAnalysis(params);
        const data = extractData(response, []);
        const headers = ['Department', 'Employee Count', 'Total Gross Spending', 'Total Net Payout', 'Total Liability'];
        const rows = data.map((d: any) => [
          d.department || 'Unassigned',
          d.employeeCount || 0,
          d.totalGross || 0,
          d.totalNet || 0,
          d.totalDeductions || 0,
        ]);
        content = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
        fileName = `Department_Analysis_${reportPeriod.month}_${reportPeriod.year}.csv`;
      } else if (type === 'Tax') {
        const relevantHistory = history.filter(
          (h: any) => h.month === reportPeriod.month && h.year === reportPeriod.year
        );
        const headers = ['Employee Name', 'PAN Number', 'Period', 'Total Gross', 'Statutory Deductions', 'Taxable Net'];
        const rows = relevantHistory.map((h: any) => [
          h.user?.name || h.employeeInfo?.name,
          h.user?.pan || 'N/A',
          `${h.month}/${h.year}`,
          safe(h.breakdown?.earnings?.grossEarnings),
          safe(h.breakdown?.deductions?.totalDeductions),
          safe(h.breakdown?.earnings?.grossEarnings) - safe(h.breakdown?.deductions?.totalDeductions),
        ]);
        content = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
        fileName = `Tax_Compliance_${reportPeriod.month}_${reportPeriod.year}.csv`;
      } else {
        // Full Export
        const relevantHistory = history.filter(
          (h: any) => h.month === reportPeriod.month && h.year === reportPeriod.year
        );
        const headers = [
          'Employee Name', 'Employee ID', 'Department', 'Pay Period',
          'Gross Earnings', 'Total Deductions', 'Net Payout',
          'Bank Name', 'Account Number', 'IFSC Code', 'PAN', 'UAN',
        ];
        const rows = relevantHistory.map((h: any) => [
          h.user?.name || h.employeeInfo?.name,
          h.user?.employeeId || h.employeeInfo?.employeeId,
          h.user?.department || 'Unassigned',
          `${h.month}/${h.year}`,
          safe(h.breakdown?.earnings?.grossEarnings),
          safe(h.breakdown?.deductions?.totalDeductions),
          safe(h.breakdown?.netPay),
          h.user?.bankName || 'N/A',
          `'${h.user?.accountNumber || 'N/A'}`,
          h.user?.ifscCode || 'N/A',
          h.user?.pan || 'N/A',
          h.user?.uan || 'N/A',
        ]);
        content = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
        fileName = `Full_Payroll_Ledger_${reportPeriod.month}_${reportPeriod.year}.csv`;
      }

      const downloadPath = Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath;
      const filePath = `${downloadPath}/${fileName}`;
      await RNFS.writeFile(filePath, content, 'utf8');

      Alert.alert(
        'Export Successful',
        `File saved to:\n${filePath}\n\nWould you like to share it?`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              await Share.share({
                title: fileName,
                message: `Payroll report exported`,
                url: `file://${filePath}`,
              });
            },
          },
        ]
      );
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '₹';
  const totalDeptValue = processedData.depts.reduce((sum: number, d: any) => sum + d.value, 0);

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'grossPay': return 'Gross Pay';
      case 'netPay': return 'Net Pay';
      case 'deductions': return 'Deductions';
      case 'employees': return 'Employees';
      default: return 'Value';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Layout
      title="Payroll Reports"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Payroll Reports"
          subtitle="Enterprise payroll analytics dashboard"
          icon={BarChart3}
          iconColor={COLORS.primary}
          iconBgColor={`${COLORS.primary}15`}
          rightComponent={
            <TouchableOpacity style={styles.exportHeaderButton} onPress={() => setShowExportModal(true)}>
              <Download size={18} color={COLORS.white} />
              <Text style={styles.exportHeaderText}>Export</Text>
            </TouchableOpacity>
          }
        />

        <View style={styles.content}>
          {/* Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.chartTypeSelector}>
              {['line', 'bar', 'area'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chartTypeButton, chartType === type && styles.chartTypeButtonActive]}
                  onPress={() => setChartType(type)}
                >
                  <Text style={[styles.chartTypeText, chartType === type && styles.chartTypeTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={timeRange}
                onValueChange={(v: number) => setTimeRange(v)}
                style={styles.picker}
                dropdownIconColor={COLORS.gray}
              >
                <Picker.Item label="3 Months" value={3} />
                <Picker.Item label="6 Months" value={6} />
                <Picker.Item label="12 Months" value={12} />
              </Picker>
            </View>

            <View style={styles.metricSelector}>
              {['grossPay', 'netPay', 'deductions', 'employees'].map((metric) => (
                <TouchableOpacity
                  key={metric}
                  style={[styles.metricButton, selectedMetric === metric && styles.metricButtonActive]}
                  onPress={() => setSelectedMetric(metric)}
                >
                  <Text style={[styles.metricText, selectedMetric === metric && styles.metricTextActive]}>
                    {metric === 'grossPay' ? 'Gross' : metric === 'netPay' ? 'Net' : metric === 'deductions' ? 'Deds' : 'Emps'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KPICard
              label="Total Payroll Cost"
              value={`${currencySymbol}${formatCurrency(processedData.summary.totalCost)}`}
              subtitle="Current Month Gross"
              icon={Wallet}
              color={COLORS.primary}
            />
            <KPICard
              label="Avg Cost / Head"
              value={`${currencySymbol}${formatCurrency(processedData.summary.avgCost)}`}
              subtitle="Across Organization"
              icon={Calculator}
              color={COLORS.info}
            />
            <KPICard
              label="Growth Rate"
              value={`${processedData.summary.growth?.toFixed(1) || 0}%`}
              subtitle={processedData.summary.growth >= 0 ? 'Increase vs Prev Month' : 'Decrease vs Prev Month'}
              icon={processedData.summary.growth >= 0 ? TrendingUp : TrendingDown}
              color={processedData.summary.growth >= 0 ? COLORS.success : COLORS.error}
            />
            <KPICard
              label="Top Department"
              value={processedData.summary.highDept}
              subtitle="Highest Expenditure"
              icon={Building2}
              color={COLORS.warning}
            />
            <KPICard
              label="Net/Gross Ratio"
              value={`${processedData.summary.netGrossRatio?.toFixed(1) || 0}%`}
              subtitle="Efficiency Index"
              icon={Activity}
              color={COLORS.success}
            />
          </View>

          {/* Trend Chart Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Financial Performance Trend</Text>
            <Text style={styles.sectionSubtitle}>
              Historical analysis of {getMetricLabel()} over {timeRange} months
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TrendChart
                data={processedData.trends}
                chartType={chartType}
                metricLabel={selectedMetric}
                currencySymbol={currencySymbol}
              />
            </ScrollView>
          </View>

          {/* Department Distribution */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Cost by Department</Text>
            <Text style={styles.sectionSubtitle}>Organization-wide distribution</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <DepartmentPieChart
                data={processedData.depts}
                onSelectDepartment={(name: string) => setTableFilter(tableFilter === name ? 'All' : name)}
                selectedDepartment={tableFilter}
              />
            </ScrollView>
            <View style={styles.deptList}>
              {processedData.depts.slice(0, 5).map((dept: any, idx: number) => (
                <DepartmentItem
                  key={idx}
                  name={dept.name}
                  percentage={((dept.value / totalDeptValue) * 100).toFixed(1)}
                  color={dept.color}
                  isActive={tableFilter === dept.name}
                  onPress={() => setTableFilter(tableFilter === dept.name ? 'All' : dept.name)}
                />
              ))}
            </View>
          </View>

          {/* Insights Panel */}
          <View style={styles.insightsContainer}>
            {processedData.insights.map((insight: any, idx: number) => (
              <InsightCard
                key={idx}
                title={insight.title}
                message={insight.message}
                icon={insight.icon}
                color={insight.color}
              />
            ))}
          </View>

          {/* Detail Table */}
          <View style={styles.sectionCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.sectionTitle}>Detail Transactional Ledger</Text>
              {tableFilter !== 'All' && (
                <TouchableOpacity onPress={() => setTableFilter('All')}>
                  <Text style={styles.clearFilter}>Clear Filter</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sectionSubtitle}>
              Filtering: {tableFilter === 'All' ? 'Complete Organization' : tableFilter}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.tableCellEmployee]}>Employee</Text>
                  <Text style={[styles.tableHeaderCell, styles.tableCellDept]}>Department</Text>
                  <Text style={[styles.tableHeaderCell, styles.tableCellAmount]}>Gross</Text>
                  <Text style={[styles.tableHeaderCell, styles.tableCellAmount]}>Deductions</Text>
                  <Text style={[styles.tableHeaderCell, styles.tableCellAmount]}>Net</Text>
                </View>

                {/* Table Body */}
                {filteredTableData.length === 0 ? (
                  <View style={styles.emptyTableContainer}>
                    <Text style={styles.emptyTableText}>No data records found</Text>
                  </View>
                ) : (
                  filteredTableData.slice(0, 10).map((item: any, idx: number) => (
                    <EmployeeRow key={idx} employee={item} currencySymbol={currencySymbol} />
                  ))
                )}
              </View>
            </ScrollView>

            {filteredTableData.length > 10 && (
              <Text style={styles.moreRecordsText}>Showing top 10 records</Text>
            )}
          </View>

          {/* Report Archive Section */}
          <View style={styles.archiveCard}>
            <View style={styles.archiveHeader}>
              <Archive size={28} color={COLORS.gray} />
              <View>
                <Text style={styles.archiveTitle}>Report Archive Extraction</Text>
                <Text style={styles.archiveSubtitle}>Generate point-in-time compliance artifacts</Text>
              </View>
            </View>

            <View style={styles.archivePeriod}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={reportPeriod.month}
                  onValueChange={(v: number) => setReportPeriod({ ...reportPeriod, month: v })}
                  style={styles.picker}
                  dropdownIconColor={COLORS.gray}
                >
                  {[...Array(12)].map((_, i) => (
                    <Picker.Item
                      key={i + 1}
                      label={new Date(2024, i).toLocaleString('default', { month: 'long' })}
                      value={i + 1}
                    />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={reportPeriod.year}
                  onValueChange={(v: number) => setReportPeriod({ ...reportPeriod, year: v })}
                  style={styles.picker}
                  dropdownIconColor={COLORS.gray}
                >
                  {[2024, 2025, 2026].map((y) => (
                    <Picker.Item key={y} label={String(y)} value={y} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.archiveButtons}>
              <TouchableOpacity style={styles.archiveButton} onPress={() => downloadReport('Summary')}>
                <TrendingUp size={16} color={COLORS.gray} />
                <Text style={styles.archiveButtonText}>Summary</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.archiveButton} onPress={() => downloadReport('DeptAnalysis')}>
                <Users size={16} color={COLORS.gray} />
                <Text style={styles.archiveButtonText}>Dept Analysis</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.archiveButton} onPress={() => downloadReport('Tax')}>
                <Percent size={16} color={COLORS.gray} />
                <Text style={styles.archiveButtonText}>Tax Compliance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.archiveButton} onPress={() => downloadReport('Export')}>
                <FileText size={16} color={COLORS.gray} />
                <Text style={styles.archiveButtonText}>Full Export</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={downloadReport}
        isExporting={isExporting}
        reportPeriod={reportPeriod}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.light },

  exportHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  exportHeaderText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },

  controlsContainer: { backgroundColor: COLORS.white, borderRadius: 16, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  chartTypeSelector: { flexDirection: 'row', backgroundColor: COLORS.light, borderRadius: 8, padding: 2 },
  chartTypeButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  chartTypeButtonActive: { backgroundColor: COLORS.white, shadowColor: COLORS.dark, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  chartTypeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: COLORS.gray },
  chartTypeTextActive: { color: COLORS.primary },
  pickerWrapper: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden', marginVertical: 4 },
  picker: { height: 40, width: '100%' },
  metricSelector: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metricButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: COLORS.light },
  metricButtonActive: { backgroundColor: `${COLORS.primary}15` },
  metricText: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray },
  metricTextActive: { color: COLORS.primary },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.white, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 3 },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: 9, color: COLORS.gray, textTransform: 'uppercase', fontWeight: 'bold' },
  kpiValue: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  kpiSubtitle: { fontSize: 9, color: COLORS.gray, marginTop: 2 },

  sectionCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark, marginBottom: 4 },
  sectionSubtitle: { fontSize: 10, color: COLORS.gray, marginBottom: 12 },

  chart: { marginVertical: 8, borderRadius: 16, paddingRight: 10 },
  chartPlaceholder: { height: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.light, borderRadius: 16, marginVertical: 8 },
  chartPlaceholderText: { fontSize: 12, color: COLORS.gray },

  deptList: { gap: 12, marginTop: 16 },
  deptItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  deptItemActive: { backgroundColor: COLORS.light },
  deptLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptDot: { width: 8, height: 8, borderRadius: 4 },
  deptName: { fontSize: 13, color: COLORS.dark },
  deptPercentage: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },

  insightsContainer: { gap: 12, marginBottom: 20 },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  insightIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  insightMessage: { fontSize: 12, color: COLORS.white, marginTop: 4 },

  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clearFilter: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: COLORS.light, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 8 },
  tableHeaderCell: { fontSize: 9, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  tableCellEmployee: { width: 150 },
  tableCellDept: { width: 100 },
  tableCellAmount: { width: 90, textAlign: 'right' },

  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  employeeAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  employeeInitial: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  employeeName: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  employeeId: { fontSize: 9, color: COLORS.gray },
  deptText: { fontSize: 12, color: COLORS.gray },
  grossAmount: { fontSize: 12, fontWeight: '500', color: COLORS.dark, textAlign: 'right' },
  deductionAmount: { fontSize: 12, fontWeight: '500', color: COLORS.error, textAlign: 'right' },
  netAmount: { fontSize: 13, fontWeight: 'bold', color: COLORS.success, textAlign: 'right' },

  emptyTableContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyTableText: { fontSize: 12, color: COLORS.gray },
  moreRecordsText: { textAlign: 'center', fontSize: 10, color: COLORS.gray, marginTop: 12 },

  archiveCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  archiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  archiveTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  archiveSubtitle: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  archivePeriod: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  archiveButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  archiveButton: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: COLORS.light, borderRadius: 12 },
  archiveButtonText: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  exportModal: { backgroundColor: COLORS.white, borderRadius: 24, width: '85%', maxWidth: 400, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.dark },
  exportContent: { padding: 20, gap: 16 },
  exportDescription: { fontSize: 13, color: COLORS.gray, textAlign: 'center' },
  exportTypes: { gap: 12 },
  exportType: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  exportTypeSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  exportTypeText: { fontSize: 14, color: COLORS.gray },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.light, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12 },
  exportButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  disabledButton: { opacity: 0.5 },
});