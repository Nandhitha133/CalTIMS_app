// screens/payroll/PayrollHistory.tsx
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
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Archive,
  Users,
  DollarSign,
  ChevronRight,
  AlertCircle,
  Filter,
  Search,
  Download,
  TrendingUp,
  FileText,
  CreditCard,
  X,
  History,
  Eye,
  Send,
  MoreVertical,
  Plus,
  BarChart3,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import SafeSelector from '../../components/common/SafeSelector';
import { formatCurrency } from './payrollFormatters';
import { exportFile } from '../../utils/exportHelper';

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
};

// Helper to extract data from API response
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

interface PayrollRun {
  _id: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  isPaid: boolean;
  failedCount: number;
  processedAt: string;
  status: string;
}

interface PayrollDetail {
  _id: string;
  user: {
    _id: string;
    name: string;
    employeeId: string;
    department: string;
  };
  breakdown: {
    netPay: number;
    grossEarnings: number;
    totalDeductions: number;
  };
  isPaid: boolean;
}

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle, badge }: any) => (
  <View style={styles.statCard}>
    {badge && (
      <View style={styles.statBadge}>
        <Text style={styles.statBadgeText}>{badge}</Text>
      </View>
    )}
    <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
      <Icon size={20} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color: COLORS.dark }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  </View>
);

// Run Card Component
const RunCard = ({ run, onPress, currencySymbol }: { run: PayrollRun; onPress: () => void; currencySymbol: string }) => {
  const monthName = new Date(run.year, run.month - 1).toLocaleString('default', { month: 'long' });

  return (
    <TouchableOpacity style={styles.runCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.runCardMain}>
        <View style={styles.runPeriodInfo}>
          <Text style={styles.runPeriodCode}>{run.year}-{String(run.month).padStart(2, '0')}</Text>
          <View style={styles.runMonthYear}>
            <View style={styles.monthBadge}>
              <Text style={styles.monthBadgeText}>{monthName.slice(0, 3)}</Text>
            </View>
            <View>
              <Text style={styles.runMonthName}>{monthName}</Text>
              <Text style={styles.runYearText}>{run.year}</Text>
            </View>
          </View>
        </View>

        <View style={styles.runEmployeeCount}>
          <Users size={14} color={COLORS.gray} />
          <Text style={styles.runEmployeeText}>{run.totalEmployees}</Text>
        </View>

        <View style={styles.runAmounts}>
          <Text style={styles.runGrossAmount}>{currencySymbol}{formatCurrency(run.totalGross || 0)}</Text>
          <Text style={styles.runNetAmount}>{currencySymbol}{formatCurrency(run.totalNet || 0)}</Text>
        </View>

        <View style={[styles.runStatusBadge, run.isPaid ? styles.statusPaid : styles.statusUnpaid]}>
          <Text style={[styles.runStatusText, run.isPaid ? styles.statusPaidText : styles.statusUnpaidText]}>
            {run.isPaid ? 'PAID' : 'UNPAID'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Employee Row Component for Drawer
const EmployeeRow = ({ employee, onPress, currencySymbol }: {
  employee: PayrollDetail;
  onPress: () => void;
  currencySymbol: string;
}) => (
  <TouchableOpacity style={styles.employeeRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.employeeAvatar}>
      <Text style={styles.employeeInitial}>{employee.user?.name?.charAt(0) || 'E'}</Text>
    </View>
    <View style={styles.employeeInfo}>
      <Text style={styles.employeeName}>{employee.user?.name || 'Unknown'}</Text>
      <Text style={styles.employeeMeta}>
        {employee.user?.employeeId} • {employee.user?.department || 'Unassigned'}
      </Text>
    </View>
    <View style={styles.employeeRight}>
      <Text style={styles.employeeAmount}>{currencySymbol}{formatCurrency(employee.breakdown?.netPay || 0)}</Text>
      <View style={[styles.employeeStatusBadge, employee.isPaid ? styles.statusPaid : styles.statusUnpaid]}>
        <Text style={styles.employeeStatusText}>{employee.isPaid ? 'Paid' : 'Unpaid'}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export const PayrollHistory = ({ navigation }: { navigation: any }) => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [activeSelector, setActiveSelector] = useState(false);
  const [detailRecords, setDetailRecords] = useState<PayrollDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [runs, setRuns] = useState<PayrollRun[]>([]);

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

  const fetchBatches = async () => {
    try {
      const response: any = await payrollAPI.getBatches();
      // Handle all possible response structures from live backend
      const rawData = response?.data?.data || response?.data || response?.batches || response || [];
      return Array.isArray(rawData) ? rawData : (rawData.data && Array.isArray(rawData.data) ? rawData.data : []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      return [];
    }
  };

  const fetchDetailRecords = async (month: number, year: number) => {
    setDetailLoading(true);
    try {
      const response: any = await payrollAPI.getHistory({ month, year });
      // Handle all possible response structures
      const rawData = response?.data?.data || response?.data || response?.history || response || [];
      const data = Array.isArray(rawData) ? rawData : (rawData.data && Array.isArray(rawData.data) ? rawData.data : []);
      setDetailRecords(data);
    } catch (error) {
      console.error('Error fetching details:', error);
      Alert.alert('Error', 'Failed to load employee details');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchBatches().then(setRuns)]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    if (selectedRun) {
      await fetchDetailRecords(selectedRun.month, selectedRun.year);
    }
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchAllData();
    }, [])
  );

  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      const monthName = new Date(run.year, run.month - 1).toLocaleString('default', { month: 'long' });
      const label = `${monthName} ${run.year}`.toLowerCase();
      const matchesSearch = label.includes(searchTerm.toLowerCase()) ||
        `${run.year}-${String(run.month).padStart(2, '0')}`.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'Paid' ? run.isPaid : !run.isPaid);
      return matchesSearch && matchesStatus;
    });
  }, [runs, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const totalDisbursed = runs.reduce((acc, r) => acc + (r.totalNet || 0), 0);
    const avgCost = totalRuns > 0 ? totalDisbursed / totalRuns : 0;
    const failedRuns = runs.filter(r => r.failedCount > 0).length;
    const errorRate = totalRuns > 0 ? (failedRuns / totalRuns) * 100 : 0;
    return { totalRuns, totalDisbursed, avgCost, errorRate };
  }, [runs]);

  const handleRunSelect = async (run: PayrollRun) => {
    setSelectedRun(run);
    await fetchDetailRecords(run.month, run.year);
  };

  const handleDownloadRunCSV = async () => {
    if (!selectedRun || detailRecords.length === 0) {
      Alert.alert('No Data', 'No employee records found to export.');
      return;
    }

    try {
      const fileName = `Payroll_Details_${selectedRun.year}_${String(selectedRun.month).padStart(2, '0')}.csv`;
      const headers = ['Employee ID', 'Name', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'];
      
      const rows = detailRecords.map(record => [
        `"${record.user?.employeeId || 'N/A'}"`,
        `"${record.user?.name || 'Unknown'}"`,
        record.breakdown?.grossEarnings || 0,
        record.breakdown?.totalDeductions || 0,
        record.breakdown?.netPay || 0,
        record.isPaid ? '"Paid"' : '"Pending"'
      ]);

      const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      await exportFile(content, fileName, 'text/csv', false);
    } catch (error) {
      console.error('CSV Export failed:', error);
      Alert.alert('Error', 'Failed to export CSV. Please try again.');
    }
  };

  const handleDownloadRunPDF = async () => {
    if (!selectedRun) return;
    
    try {
      // In a real app, we might call an API that returns a PDF blob/base64
      // For now, let's try to get a summary report from the API
      setLoading(true);
      const response = await payrollAPI.getSummaryReport({ 
        month: selectedRun.month, 
        year: selectedRun.year,
        format: 'pdf'
      });
      
      const data = extractData(response);
      if (data) {
        const fileName = `Payroll_Summary_${selectedRun.year}_${String(selectedRun.month).padStart(2, '0')}.pdf`;
        await exportFile(data, fileName, 'application/pdf', true);
      } else {
        Alert.alert('Info', 'PDF generation is currently being processed on the server. Please try again in a few minutes.');
      }
    } catch (error) {
      console.error('PDF Export failed:', error);
      Alert.alert('Error', 'Failed to generate PDF report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    setShowExportMenu(false);
    if (type === 'Bank') {
      // Navigate to Bank Transfer Export screen instead of showing "Coming Soon"
      navigation.navigate('BankTransferExport', { month: selectedRun?.month, year: selectedRun?.year });
      return;
    }

    try {
      setLoading(true);
      // Fetch all records from the API to ensure we have ALL data for the export
      const response = await payrollAPI.getHistory({ limit: 1000 });
      const allRuns = extractData(response, []);

      if (!allRuns || allRuns.length === 0) {
        Alert.alert('No Data', 'No payroll records found to export.');
        return;
      }

      const isExcel = type === 'Excel';
      const extension = isExcel ? 'xls' : 'csv';
      const fileName = `Payroll_History_${new Date().getFullYear()}.${extension}`;
      
      // Define CSV headers
      const headers = [
        'Run ID', 'Month', 'Year', 'Total Employees', 
        'Total Gross Earnings', 'Total Deductions', 'Total Net Payout', 
        'Status', 'Processed Date'
      ];

      // Format records for CSV
      const rows = allRuns.map((run: any) => [
        `"${run.runId || 'N/A'}"`,
        run.month || '-',
        run.year || '-',
        run.totalEmployees || 0,
        run.totalGross || 0,
        run.totalDeductions || 0,
        run.totalNet || 0,
        `"${run.status || 'Processed'}"`,
        `"${run.processedAt ? new Date(run.processedAt).toLocaleDateString() : 'N/A'}"`
      ]);

      const content = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
      
      const fileType = isExcel ? 'application/vnd.ms-excel' : 'text/csv';
      await exportFile(content, fileName, fileType, false);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to fetch and export all records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '₹';

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Layout
      title="Payroll History"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <Archive size={24} color={COLORS.white} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Run Archive & Ledger</Text>
              <Text style={styles.headerSubtitle}>Enterprise payroll history and financial audit trail</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <StatCard 
              title="Total Payroll Runs" 
              value={stats.totalRuns} 
              icon={Archive} 
              color={COLORS.primary} 
              badge="LAST 12MO"
            />
            <StatCard 
              title="Total Disbursed" 
              value={`${currencySymbol}${formatCurrency(stats.totalDisbursed)}`} 
              icon={DollarSign} 
              color={COLORS.success} 
              badge="LIFETIME"
            />
            <StatCard 
              title="Average Payroll Cost" 
              value={`${currencySymbol}${formatCurrency(Math.round(stats.avgCost))}`} 
              icon={TrendingUp} 
              color={COLORS.info} 
              badge="PER CYCLE"
            />
            <StatCard 
              title="Runs with Errors" 
              value={`${stats.errorRate.toFixed(1)}%`} 
              icon={AlertCircle} 
              color={stats.errorRate > 0 ? COLORS.error : COLORS.gray} 
              badge="PROCESS INTEGRITY"
            />
          </View>

          {/* Trend Analysis Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <TrendingUp size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>TREND ANALYSIS</Text>
              </View>
              <View style={styles.trendSelector}>
                <Text style={styles.trendSelectorText}>NET PAYOUT</Text>
                <ChevronRight size={14} color={COLORS.gray} style={{ transform: [{ rotate: '90deg' }] }} />
              </View>
            </View>
            
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: runs.slice(0, 6).reverse().map(r => new Date(r.year, r.month - 1).toLocaleString('default', { month: 'short' })),
                  datasets: [{
                    data: runs.slice(0, 6).reverse().map(r => (r.totalNet || 0) / 1000)
                  }]
                }}
                width={SCREEN_WIDTH - 64}
                height={180}
                chartConfig={{
                  backgroundColor: COLORS.white,
                  backgroundGradientFrom: COLORS.white,
                  backgroundGradientTo: COLORS.white,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: COLORS.primary
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchSection}>
            <View style={styles.ledgerHeader}>
              <Text style={styles.ledgerTitle}>HISTORICAL RUN LEDGER</Text>
            </View>
            <View style={styles.searchBox}>
              <Search size={16} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by month or year..."
                placeholderTextColor={COLORS.gray}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterChip}>
              <Filter size={14} color={COLORS.gray} />
              <SafeSelector
                options={[
                  { label: 'All Cycles', value: 'all' },
                  { label: 'Paid', value: 'Paid' },
                  { label: 'Unpaid', value: 'Unpaid' },
                ]}
                selectedValue={statusFilter}
                onValueChange={(v) => setStatusFilter(v)}
                visible={activeSelector}
                onOpen={() => setActiveSelector(true)}
                onClose={() => setActiveSelector(false)}
                style={styles.filterSafeSelector}
              />
            </View>

              <TouchableOpacity style={styles.exportButton} onPress={() => setShowExportMenu(true)}>
                <Download size={16} color={COLORS.white} />
                <Text style={styles.exportButtonText}>Export </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Runs List */}
          {filteredRuns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <History size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No payroll runs found</Text>
              <Text style={styles.emptyText}>Run payroll to see data here</Text>
            </View>
          ) : (
            filteredRuns.map((run, index) => (
              <RunCard
                key={run._id || `run-${index}`}
                run={run}
                onPress={() => handleRunSelect(run)}
                currencySymbol={currencySymbol}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Export Menu Modal */}
      <Modal visible={showExportMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowExportMenu(false)}>
          <View style={styles.exportMenu}>
            <TouchableOpacity style={styles.exportMenuItem} onPress={() => handleExport('CSV')}>
              <FileText size={16} color={COLORS.gray} />
              <Text style={styles.exportMenuItemText}>CSV Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportMenuItem} onPress={() => handleExport('Excel')}>
              <FileText size={16} color={COLORS.gray} />
              <Text style={styles.exportMenuItemText}>Excel Spreadsheet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportMenuItem} onPress={() => handleExport('Bank')}>
              <CreditCard size={16} color={COLORS.gray} />
              <Text style={styles.exportMenuItemText}>Bank Transfer File</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detail Drawer Modal */}
      <Modal visible={!!selectedRun} animationType="slide" transparent>
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>
                  Run Details: {selectedRun?.year}-{String(selectedRun?.month).padStart(2, '0')}
                </Text>
                <Text style={styles.drawerSubtitle}>Payroll Cycle Financial Snapshot</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRun(null)} style={styles.drawerClose}>
                <X size={20} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.drawerContent}>
                {/* Summary Cards */}
                <View style={styles.drawerStats}>
                  <View style={styles.drawerStat}>
                    <Text style={styles.drawerStatLabel}>Gross Pay</Text>
                    <Text style={styles.drawerStatValue}>
                      {currencySymbol}{formatCurrency(selectedRun?.totalGross || 0)}
                    </Text>
                  </View>
                  <View style={styles.drawerStat}>
                    <Text style={styles.drawerStatLabel}>Total Net</Text>
                    <Text style={[styles.drawerStatValue, { color: COLORS.primary }]}>
                      {currencySymbol}{formatCurrency(selectedRun?.totalNet || 0)}
                    </Text>
                  </View>
                  <View style={styles.drawerStat}>
                    <Text style={styles.drawerStatLabel}>Employees</Text>
                    <Text style={styles.drawerStatValue}>{selectedRun?.totalEmployees || 0}</Text>
                  </View>
                </View>

                {/* Employee Breakdown */}
                <Text style={styles.drawerSectionTitle}>Employee Breakdown</Text>
                {detailLoading ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loaderText}>Loading employees...</Text>
                  </View>
                ) : detailRecords.length === 0 ? (
                  <View style={styles.emptyDetailContainer}>
                    <Text style={styles.emptyDetailText}>No individual records found</Text>
                  </View>
                ) : (
                  detailRecords.map(record => (
                    <EmployeeRow
                      key={record._id}
                      employee={record}
                      onPress={() => navigation.navigate('PayslipGeneration', { payslipId: record._id })}
                      currencySymbol={currencySymbol}
                    />
                  ))
                )}
              </View>
            </ScrollView>

            <View style={styles.drawerFooter}>
              <TouchableOpacity style={styles.drawerButton} onPress={handleDownloadRunCSV}>
                <Download size={16} color={COLORS.white} />
                <Text style={styles.drawerButtonText}>Download CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.drawerButton, styles.drawerButtonSecondary]} onPress={handleDownloadRunPDF}>
                <FileText size={16} color={COLORS.primary} />
                <Text style={[styles.drawerButtonText, { color: COLORS.primary }]}>PDF Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800', 
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  statBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.gray,
    textTransform: 'uppercase', 
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  statTitle: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: 0.5,
  },
  trendSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  trendSelectorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  searchSection: {
    marginBottom: 20,
  },
  ledgerHeader: {
    marginBottom: 16,
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: 0.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterChip: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  filterSafeSelector: {
    width: 130,
    height: 36,
    backgroundColor: 'transparent',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 52,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  runCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  runCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runPeriodInfo: {
    flex: 1.5,
  },
  runPeriodCode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  runMonthYear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthBadge: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.light,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  runMonthName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  runYearText: {
    fontSize: 11,
    color: COLORS.gray,
  },
  runEmployeeCount: {
    flex: 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runEmployeeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  runAmounts: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  runGrossAmount: {
    fontSize: 11,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  runNetAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.success,
  },
  runStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusPaid: {
    backgroundColor: COLORS.success + '15',
  },
  statusUnpaid: {
    backgroundColor: COLORS.warning + '15',
  },
  runStatusText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPaidText: {
    color: COLORS.success,
  },
  statusUnpaidText: {
    color: COLORS.warning,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: '100%',
    overflow: 'hidden',
    padding: 8,
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
  },
  exportMenuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  drawerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  drawerClose: {
    padding: 8,
    backgroundColor: COLORS.light,
    borderRadius: 12,
  },
  drawerContent: {
    padding: 24,
  },
  drawerStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  drawerStat: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  drawerStatLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  drawerStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  drawerSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 16,
  },
  loaderContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 12,
  },
  emptyDetailContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyDetailText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  employeeMeta: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  employeeRight: {
    alignItems: 'flex-end',
  },
  employeeAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
  },
  employeeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  employeeStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  drawerFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  drawerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 52,
  },
  drawerButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  drawerButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});