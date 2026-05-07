// screens/payroll/PayrollDashboard.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Wallet,
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  Users,
  CreditCard,
  X,
  FileSpreadsheet,
  Cpu,
  History,
  FileText,
  Percent,
  BarChart3,
  Download,
  LayoutGrid,
  Landmark,
} from 'lucide-react-native';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import SafeSelector from '../../components/common/SafeSelector';
import { formatCurrency } from './payrollFormatters';

// Color palette
const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  dark: '#1e293b',
  light: '#f8fafc',
  gray: '#64748b',
  white: '#ffffff',
  border: '#e2e8f0',
};

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
  onPress: () => void;
  isActive?: boolean;
}

const KPICard = ({ label, value, icon: Icon, color, bgColor, onPress, isActive }: KPICardProps) => (
  <TouchableOpacity
    style={[styles.kpiCard, isActive && styles.kpiCardActive]}
    onPress={onPress}
  >
    <View style={[styles.kpiIconContainer, { backgroundColor: bgColor }]}>
      <Icon size={22} color={color} />
    </View>
    <View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  </TouchableOpacity>
);

// Insight Card Component
interface InsightCardProps {
  title: string;
  message: string;
  icon: any;
  color: string;
  bgColor: string;
}

const InsightCard = ({ title, message, icon: Icon, color, bgColor }: InsightCardProps) => (
  <View style={[styles.insightCard, { backgroundColor: bgColor }]}>
    <View style={[styles.insightIcon, { backgroundColor: color + '20' }]}>
      <Icon size={16} color={color} />
    </View>
    <View style={styles.insightContent}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightMessage}>{message}</Text>
    </View>
  </View>
);

// Department Item Component
interface DepartmentItemProps {
  name: string;
  percentage: string | number;
  color: string;
  isActive?: boolean;
  onPress?: () => void;
}

const DepartmentItem = ({ name, percentage, color, isActive, onPress }: DepartmentItemProps) => (
  <TouchableOpacity
    style={[styles.deptItem, isActive && styles.deptItemActive]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.deptLeft}>
      <View style={[styles.deptDot, { backgroundColor: color }]} />
      <Text style={styles.deptName}>{name}</Text>
    </View>
    <Text style={styles.deptPercentage}>{percentage}%</Text>
  </TouchableOpacity>
);



// Recent Batch Row Component
interface RecentBatchRowProps {
  batch: any;
  onPress: () => void;
  currencySymbol: string;
}

const RecentBatchRow = ({ batch, onPress, currencySymbol }: RecentBatchRowProps) => (
  <TouchableOpacity style={styles.batchRow} onPress={onPress}>
    <View>
      <Text style={styles.batchPeriod}>
        {new Date(0, batch.month - 1).toLocaleString('default', { month: 'long' })} {batch.year}
      </Text>
      <Text style={styles.batchEmployees}>{batch.totalEmployees} employees</Text>
    </View>
    <View style={styles.batchRight}>
      <Text style={styles.batchAmount}>
        {currencySymbol}{formatCurrency(batch.totalNet || 0)}
      </Text>
      <View style={[
        styles.batchStatus,
        batch.status === 'Completed' || batch.status === 'Paid' ? styles.statusCompleted :
          batch.status === 'Processed' ? styles.statusProcessed : styles.statusDraft
      ]}>
        <Text style={styles.batchStatusText}>{batch.status}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export const PayrollDashboard = ({ navigation }: { navigation: any }) => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeSelector, setActiveSelector] = useState<string | null>(null);

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
      const response: any = await settingsAPI.getSettings();
      setSettings(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response: any = await payrollAPI.getDashboard({ month: selectedMonth, year: selectedYear });
      setDashboardData(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response: any = await payrollAPI.getBatches();
      const data = response.data?.data || response.data || [];
      setHistoryData(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response: any = await payrollAPI.getAnalytics({ month: selectedMonth, year: selectedYear, department: 'All' });
      setAnalyticsData(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboard(),
      fetchHistory(),
      fetchAnalytics(),
      fetchSettings(),
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
    }, [selectedMonth, selectedYear])
  );

  const currencySymbol = settings?.payroll?.currencySymbol || '₹';
  const kpis = dashboardData?.summary || {};
  const deptData: any[] = dashboardData?.trends?.deptDistribution || analyticsData?.departmentDistribution || [];
  const breakdownData: any[] = (analyticsData?.breakdown || []).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

  const stats = {
    totalPayout: kpis.totalGross || 0,
    netPay: kpis.totalPayroll || 0,
    totalDeductions: kpis.totalDeductions || 0,
    activeEmployees: kpis.activeEmployees || 0,
  };

  const alerts = [
    { label: 'Missing Bank Details', count: dashboardData?.compliance?.missingBankDetails || 0, route: 'Employees' },
    { label: 'Pending Structures', count: dashboardData?.compliance?.missingSalaryStructure || 0, route: 'PayrollProfiles' },
    { label: 'Formula Errors', count: dashboardData?.summary?.failedEmployees || 0, route: 'PayrollProcessing' },
  ];

  const insights = [
    {
      title: 'Efficiency',
      message: `Net vs Gross ratio is ${stats.totalPayout > 0 ? ((stats.netPay / stats.totalPayout) * 100).toFixed(1) : 0}%`,
      icon: Activity,
      color: COLORS.primary,
    },
    {
      title: 'Growth',
      message: `Payroll ${kpis.growthPercentage >= 0 ? 'increased' : 'decreased'} by ${Math.abs(kpis.growthPercentage || 0)}%`,
      icon: kpis.growthPercentage >= 0 ? TrendingUp : TrendingDown,
      color: kpis.growthPercentage >= 0 ? COLORS.success : COLORS.error,
    },
  ];

  const totalDeptValue = deptData.reduce((sum: number, d: any) => sum + d.value, 0);
  const COLORS_PIE = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.error, '#8b5cf6', '#ec4899'];

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Layout
      title="Payroll Dashboard"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <PageHeader
        title="Payroll Dashboard"
        subtitle="Manage company-wide salary disbursements"
        icon={Wallet}
        iconColor={COLORS.primary}
        iconBgColor={`${COLORS.primary}15`}
        rightComponent={
          <TouchableOpacity
            style={styles.runButton}
            onPress={() => navigation.navigate('PayrollProcessing')}
          >
            <Play size={16} color={COLORS.white} />
            <Text style={styles.runButtonText}>Run Payroll</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        {/* Month/Year Selectors */}
        <View style={styles.dateSelectorsRow}>
          <View style={styles.dateSelectorWrapper}>
            <SafeSelector
              options={[
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ].map((m, i) => ({ label: m, value: i + 1 }))}
              selectedValue={selectedMonth}
              onValueChange={(v) => setSelectedMonth(v)}
              visible={activeSelector === 'month'}
              onOpen={() => setActiveSelector('month')}
              onClose={() => setActiveSelector(null)}
              style={styles.dateSafeSelector}
            />
          </View>
          <View style={styles.dateSelectorWrapper}>
            <SafeSelector
              options={[2024, 2025, 2026].map(y => ({ label: String(y), value: y }))}
              selectedValue={selectedYear}
              onValueChange={(v) => setSelectedYear(v)}
              visible={activeSelector === 'year'}
              onOpen={() => setActiveSelector('year')}
              onClose={() => setActiveSelector(null)}
              style={styles.dateSafeSelector}
            />
          </View>
        </View>




        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <KPICard
            label="Total Payout"
            value={`${currencySymbol}${formatCurrency(stats.totalPayout)}`}
            icon={Wallet}
            color={COLORS.primary}
            bgColor={COLORS.primary + '10'}
            onPress={() => { }}
            isActive={false}
          />
          <KPICard
            label="Net Pay Disbursed"
            value={`${currencySymbol}${formatCurrency(stats.netPay)}`}
            icon={CreditCard}
            color={COLORS.success}
            bgColor={COLORS.success + '10'}
            onPress={() => { }}
            isActive={false}
          />
          <KPICard
            label="Total Deductions"
            value={`${currencySymbol}${formatCurrency(stats.totalDeductions)}`}
            icon={TrendingDown}
            color={COLORS.error}
            bgColor={COLORS.error + '10'}
            onPress={() => { }}
            isActive={false}
          />
          <KPICard
            label="Active Employees"
            value={stats.activeEmployees}
            icon={Users}
            color={COLORS.info}
            bgColor={COLORS.info + '10'}
            onPress={() => navigation.navigate('Employees')}
            isActive={false}
          />
        </View>

        {/* Status & Alerts Section */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.sectionTitle}>Payroll Cycle Status</Text>
            <View style={[
              styles.statusBadge,
              kpis.status === 'Completed' ? styles.statusBadgeCompleted :
                kpis.status === 'Processed' ? styles.statusBadgeProcessed :
                  styles.statusBadgeDraft
            ]}>
              <Text style={styles.statusBadgeText}>{kpis.status || 'Draft'}</Text>
            </View>
          </View>

          <View style={styles.statusStats}>
            <View style={styles.statusStat}>
              <Text style={styles.statusStatLabel}>Processed</Text>
              <Text style={styles.statusStatValue}>{kpis.totalProcessed || 0}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusStat}>
              <Text style={styles.statusStatLabel}>Paid</Text>
              <Text style={styles.statusStatValue}>{kpis.totalPaid || 0}</Text>
            </View>
          </View>

          <View style={styles.alertsSection}>
            <Text style={styles.alertsTitle}>Critical Alerts</Text>
            {alerts.map((alert, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.alertRow}
                onPress={() => alert.count > 0 && navigation.navigate(alert.route)}
              >
                <Text style={styles.alertLabel}>{alert.label}</Text>
                <View style={[
                  styles.alertBadge,
                  alert.count > 0 ? styles.alertBadgeError : styles.alertBadgeSuccess
                ]}>
                  <Text style={styles.alertBadgeText}>{alert.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Department Distribution */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cost by Department</Text>
          <Text style={styles.sectionSubtitle}>Organizational Payroll Weight</Text>

          <View style={styles.deptList}>
            {deptData.map((dept, idx) => (
              <DepartmentItem
                key={idx}
                name={dept.name}
                percentage={((dept.value / totalDeptValue) * 100).toFixed(1)}
                color={COLORS_PIE[idx % COLORS_PIE.length]}
              />
            ))}
          </View>
        </View>

        {/* Component Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payroll Component Breakdown</Text>
          <Text style={styles.sectionSubtitle}>Top Components</Text>

          {breakdownData.map((item, idx) => (
            <View key={idx} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View style={[
                  styles.breakdownDot,
                  { backgroundColor: item.type === 'Earning' ? COLORS.primary : COLORS.error }
                ]} />
                <Text style={styles.breakdownName}>{item.name}</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {currencySymbol}{formatCurrency(item.value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Insights */}
        <View style={styles.insightsContainer}>
          {insights.map((insight, idx) => (
            <InsightCard
              key={idx}
              title={insight.title}
              message={insight.message}
              icon={insight.icon}
              color={insight.color}
              bgColor={COLORS.dark}
            />
          ))}
        </View>

        {/* Recent Payroll Runs */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payroll Batches</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PayrollHistory')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {historyData.map((batch, idx) => (
            <RecentBatchRow
              key={idx}
              batch={batch}
              currencySymbol={currencySymbol}
              onPress={() => navigation.navigate('PayrollHistory', { batchId: batch._id })}
            />
          ))}

          {historyData.length === 0 && (
            <Text style={styles.emptyText}>No recent payroll history found</Text>
          )}
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  runButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  dateSelectorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateSelectorWrapper: {
    flex: 1,
  },
  dateSafeSelector: {
    backgroundColor: COLORS.white,
    height: 48,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kpiCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },

  kpiIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeDraft: {
    backgroundColor: COLORS.warning + '20',
  },
  statusBadgeProcessed: {
    backgroundColor: COLORS.primary + '20',
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  statusStat: {
    flex: 1,
    backgroundColor: COLORS.light,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  statusStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 4,
  },
  statusDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  alertsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  alertsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  alertLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  alertBadgeError: {
    backgroundColor: COLORS.error + '20',
  },
  alertBadgeSuccess: {
    backgroundColor: COLORS.success + '20',
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deptList: {
    gap: 12,
  },
  deptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deptItemActive: {
    backgroundColor: COLORS.light,
    paddingHorizontal: 12,
    marginHorizontal: -12,
    borderRadius: 8,
  },
  deptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deptName: {
    fontSize: 13,
    color: COLORS.dark,
  },
  deptPercentage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownName: {
    fontSize: 13,
    color: COLORS.dark,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  insightsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  insightMessage: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 4,
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  batchPeriod: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  batchEmployees: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  batchRight: {
    alignItems: 'flex-end',
  },
  batchAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  batchStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusProcessed: {
    backgroundColor: COLORS.primary + '20',
  },
  statusDraft: {
    backgroundColor: COLORS.warning + '20',
  },
  batchStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  picker: {
    flex: 1,
    height: 150,
  },
  pickerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  pickerButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 2,
  },
});