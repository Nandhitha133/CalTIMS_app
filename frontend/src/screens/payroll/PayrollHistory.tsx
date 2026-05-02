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
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
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
  Calendar,
  CheckCircle2,
} from 'lucide-react-native';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import CollapsibleSidebar from '../../components/common/CollapsibleSidebar';
import { formatCurrency } from '../../utils/formatters';

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
const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Icon size={20} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  </View>
);

// Run Card Component
const RunCard = ({ run, onPress, currencySymbol }: { run: PayrollRun; onPress: () => void; currencySymbol: string }) => {
  const monthName = new Date(run.year, run.month - 1).toLocaleString('default', { month: 'long' });

  return (
    <TouchableOpacity style={styles.runCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.runCardHeader}>
        <View style={styles.runDateBadge}>
          <Text style={styles.runYear}>{run.year}</Text>
          <Text style={styles.runMonth}>{monthName.slice(0, 3)}</Text>
        </View>
        <View style={styles.runInfo}>
          <Text style={styles.runPeriod}>{monthName} {run.year}</Text>
          <View style={styles.runStats}>
            <Users size={12} color={COLORS.gray} />
            <Text style={styles.runStatText}>{run.totalEmployees} employees</Text>
          </View>
        </View>
        <View style={styles.runStatusContainer}>
          <View style={[styles.statusBadge, run.isPaid ? styles.statusPaid : styles.statusUnpaid]}>
            <View style={[styles.statusDot, run.isPaid ? styles.dotPaid : styles.dotUnpaid]} />
            <Text style={[styles.statusText, run.isPaid ? styles.statusPaidText : styles.statusUnpaidText]}>
              {run.isPaid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
          {run.failedCount > 0 && (
            <View style={styles.failedBadge}>
              <AlertCircle size={10} color={COLORS.error} />
              <Text style={styles.failedText}>{run.failedCount} failed</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.runCardFooter}>
        <View style={styles.amountColumn}>
          <Text style={styles.amountLabel}>Gross Amount</Text>
          <Text style={styles.grossAmount}>{currencySymbol}{formatCurrency(run.totalGross || 0)}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountColumn}>
          <Text style={styles.amountLabel}>Net Disbursed</Text>
          <Text style={styles.netAmount}>{currencySymbol}{formatCurrency(run.totalNet || 0)}</Text>
        </View>
        <ChevronRight size={18} color={COLORS.gray} />
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
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching batches:', error);
      return [];
    }
  };

  const fetchDetailRecords = async (month: number, year: number) => {
    setDetailLoading(true);
    try {
      const response: any = await payrollAPI.getHistory({ month, year });
      const data = response.data?.data || response.data || [];
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

  const handleExport = (type: string) => {
    setShowExportMenu(false);
    Alert.alert('Export', `${type} export will be available soon`);
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
    <View style={styles.container}>
      <Header title="Payroll History" showSidebarButton onMenuPress={() => setSidebarVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
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
            <StatCard title="Total Runs" value={stats.totalRuns} icon={Archive} color={COLORS.primary} />
            <StatCard title="Total Disbursed" value={`${currencySymbol}${formatCurrency(stats.totalDisbursed)}`} icon={DollarSign} color={COLORS.success} />
            <StatCard title="Avg Cost/Cycle" value={`${currencySymbol}${formatCurrency(Math.round(stats.avgCost))}`} icon={TrendingUp} color={COLORS.info} />
            <StatCard title="Error Rate" value={`${stats.errorRate.toFixed(1)}%`} icon={AlertCircle} color={stats.errorRate > 0 ? COLORS.error : COLORS.gray} />
          </View>

          {/* Search and Filter */}
          <View style={styles.searchSection}>
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
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(v: any) => setStatusFilter(v)}
                  style={styles.filterPicker}
                  dropdownIconColor={COLORS.gray}
                >
                  <Picker.Item label="All Cycles" value="all" />
                  <Picker.Item label="Paid" value="Paid" />
                  <Picker.Item label="Unpaid" value="Unpaid" />
                </Picker>
              </View>

              <TouchableOpacity style={styles.exportButton} onPress={() => setShowExportMenu(true)}>
                <Download size={16} color={COLORS.white} />
                <Text style={styles.exportButtonText}>Export</Text>
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
            filteredRuns.map(run => (
              <RunCard
                key={run._id}
                run={run}
                onPress={() => handleRunSelect(run)}
                currencySymbol={currencySymbol}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Footer showSocialLinks showCopyright />
      <CollapsibleSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} user={user} />

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
              <TouchableOpacity style={styles.drawerButton}>
                <Download size={16} color={COLORS.white} />
                <Text style={styles.drawerButtonText}>Download CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.drawerButton, styles.drawerButtonSecondary]}>
                <FileText size={16} color={COLORS.primary} />
                <Text style={[styles.drawerButtonText, { color: COLORS.primary }]}>PDF Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    borderRadius: 28,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 12,
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
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 44,
    height: 44,
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
    marginTop: 2,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  filterPicker: {
    flex: 1,
    height: 44,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 44,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  runCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  runCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  runDateBadge: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  runYear: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  runMonth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  runInfo: {
    flex: 1,
  },
  runPeriod: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  runStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  runStatText: {
    fontSize: 11,
    color: COLORS.gray,
  },
  runStatusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  runCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  amountColumn: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginBottom: 2,
  },
  grossAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  netAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  amountDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPaid: {
    backgroundColor: COLORS.success + '15',
  },
  statusUnpaid: {
    backgroundColor: COLORS.warning + '15',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotPaid: {
    backgroundColor: COLORS.success,
  },
  dotUnpaid: {
    backgroundColor: COLORS.warning,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusPaidText: {
    color: COLORS.success,
  },
  statusUnpaidText: {
    color: COLORS.warning,
  },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  failedText: {
    fontSize: 9,
    color: COLORS.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '80%',
    overflow: 'hidden',
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exportMenuItemText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  drawerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  drawerClose: {
    padding: 8,
  },
  drawerContent: {
    padding: 20,
  },
  drawerStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  drawerStat: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  drawerStatLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginBottom: 4,
  },
  drawerStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  drawerSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  loaderContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loaderText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
  },
  emptyDetailContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyDetailText: {
    fontSize: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  employeeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  employeeStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  drawerFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
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
    paddingVertical: 14,
    borderRadius: 12,
  },
  drawerButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  drawerButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
});