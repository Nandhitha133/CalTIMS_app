// screens/payroll/BankTransferExport.tsx
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
  Share,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Landmark, Wallet, CheckCircle2, Clock, AlertCircle, ShieldAlert, Filter, Download, Eye, Edit3, X, Search, ChevronDown, ChevronLeft, ChevronRight, Building2, Calendar, Users } from 'lucide-react-native';
import { payrollAPI, settingsAPI, userAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import SafeSelector from '../../components/common/SafeSelector';
import { formatCurrency } from './payrollFormatters';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

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

// KPI Card Component
const KPICard = ({ id, label, value, icon: Icon, color, bgColor, subtitle, isActive, onPress }: any) => (
  <TouchableOpacity
    style={[styles.kpiCard, isActive && styles.kpiCardActive]}
    onPress={() => onPress(id)}
    activeOpacity={0.7}
  >
    <View style={[styles.kpiIcon, { backgroundColor: bgColor || `${color}15` }]}>
      <Icon size={22} color={color} />
    </View>
    <View style={styles.kpiContent}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
    </View>
  </TouchableOpacity>
);

// Employee Row Component
const EmployeeRow = ({ employee, onPress, currencySymbol }: any) => {
  const getValidationStyle = () => {
    switch (employee.validation.type) {
      case 'Ready':
        return { bg: `${COLORS.success}15`, color: COLORS.success, text: 'Ready', icon: CheckCircle2 };
      case 'Pending':
        return { bg: `${COLORS.warning}15`, color: COLORS.warning, text: 'Partial', icon: Clock };
      default:
        return { bg: `${COLORS.error}15`, color: COLORS.error, text: 'Missing', icon: ShieldAlert };
    }
  };

  const validationStyle = getValidationStyle();
  const IconComponent = validationStyle.icon;

  return (
    <TouchableOpacity style={styles.employeeRow} onPress={() => onPress(employee)} activeOpacity={0.7}>
      <View style={styles.employeeAvatar}>
        <Text style={styles.employeeInitial}>{employee.user?.name?.charAt(0) || '?'}</Text>
      </View>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{employee.user?.name}</Text>
        <Text style={styles.employeeMeta}>
          {employee.user?.bankName || 'No Bank'} • {employee.user?.accountNumber ? `****${employee.user.accountNumber.slice(-4)}` : 'No Account'}
        </Text>
      </View>
      <View style={styles.employeeRight}>
        <Text style={styles.employeeAmount}>
          {currencySymbol}{formatCurrency(employee.breakdown?.netPay || 0)}
        </Text>
        <View style={[styles.employeeStatus, { backgroundColor: validationStyle.bg }]}>
          <IconComponent size={10} color={validationStyle.color} />
          <Text style={[styles.employeeStatusText, { color: validationStyle.color }]}>
            {validationStyle.text}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Preview Modal Component
const PreviewModal = ({ visible, onClose, onConfirm, previewRows, headers, currencySymbol, totalLiquidity, nodeCount }: any) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Export File Preview</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            <View style={styles.warningBox}>
              <AlertCircle size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                Please review the payout records below. Once generated, this file will serve as the official bank transfer instruction.
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.previewHeaderRow}>
                  {headers.map((header: string, idx: number) => (
                    <Text key={idx} style={[styles.previewHeaderCell, getPreviewCellStyle(idx)]}>
                      {header}
                    </Text>
                  ))}
                </View>
                {previewRows.map((row: any[], idx: number) => (
                  <View key={idx} style={styles.previewRow}>
                    {row.map((cell, cidx) => (
                      <Text key={cidx} style={[styles.previewCell, getPreviewCellStyle(cidx)]}>
                        {typeof cell === 'number' ? `${currencySymbol}${formatCurrency(cell)}` : cell}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={onConfirm}>
            <Download size={16} color={COLORS.white} />
            <Text style={styles.exportButtonText}>Generate CSV</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// Confirmation Modal Component
const ConfirmModal = ({ visible, onClose, onConfirm, nodeCount, totalLiquidity, currencySymbol }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.confirmOverlay}>
      <View style={styles.confirmContainer}>
        <View style={[styles.confirmIcon, { backgroundColor: `${COLORS.warning}15` }]}>
          <AlertCircle size={32} color={COLORS.warning} />
        </View>
        <Text style={styles.confirmTitle}>Generate Bank Transfer File?</Text>
        <Text style={styles.confirmMessage}>
          You are about to generate a transfer file for {nodeCount} employees totaling{' '}
          {currencySymbol}{formatCurrency(totalLiquidity)}. Ensure all details are verified.
        </Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity style={styles.confirmCancel} onPress={onClose}>
            <Text style={styles.confirmCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmConfirm} onPress={onConfirm}>
            <Text style={styles.confirmConfirmText}>Generate & Download</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const getPreviewCellStyle = (index: number) => {
  if (index === 0) return { width: 120 };
  if (index === 1) return { width: 140 };
  if (index === 2) return { width: 120 };
  if (index === 3) return { width: 100 };
  if (index === 4) return { width: 100, textAlign: 'right' as const };
  return { width: 120 };
};

export function BankTransferExport({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeSelector, setActiveSelector] = useState<string | null>(null);
  const [bankFilter, setBankFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);

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

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAll({ limit: 1000 });
      const data = extractData(response, []);
      setUsersData(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchHistory = async (m: number, y: number) => {
    try {
      const response = await payrollAPI.getHistory({ month: m, year: y });
      const data = extractData(response, []);
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchUsers(), fetchHistory(month, year)]);
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
    }, [month, year])
  );

  const uniqueBanks = useMemo(() => {
    const banks = new Set();
    usersData.forEach((u: any) => {
      if (u.bankName) banks.add(u.bankName);
    });
    return Array.from(banks).sort();
  }, [usersData]);

  const validatePayout = useCallback((payout: any) => {
    const bankName = payout.user?.bankName;
    const accountNumber = payout.user?.accountNumber;
    const ifsc = payout.user?.ifscCode;

    if (bankName && accountNumber && ifsc) {
      return { type: 'Ready', label: 'Ready', color: COLORS.success, bg: `${COLORS.success}15` };
    }
    if (!bankName && !accountNumber && !ifsc) {
      return { type: 'Error', label: 'Missing Info', color: COLORS.error, bg: `${COLORS.error}15` };
    }
    return { type: 'Pending', label: 'Partial Info', color: COLORS.warning, bg: `${COLORS.warning}15` };
  }, []);

  const filteredNodes = useMemo(() => {
    if (!history.length) return [];
    let nodes = history.filter(
      (h: any) => h.month === month && h.year === year && (h.breakdown?.netPay || 0) > 0
    );

    nodes = nodes.map((n: any) => ({
      ...n,
      validation: validatePayout(n),
    }));

    if (bankFilter) {
      nodes = nodes.filter((h: any) => h.user?.bankName === bankFilter);
    }

    if (statusFilter !== 'All') {
      nodes = nodes.filter((h: any) => h.validation.type === statusFilter);
    }

    return nodes;
  }, [history, month, year, bankFilter, statusFilter, validatePayout]);

  const stats = useMemo(() => {
    const totalLiquidity = filteredNodes.reduce((acc, curr) => acc + (curr.breakdown?.netPay || 0), 0);
    return {
      totalLiquidity,
      nodeCount: filteredNodes.length,
      readyCount: filteredNodes.filter((n) => n.validation.type === 'Ready').length,
      pendingCount: filteredNodes.filter((n) => n.validation.type === 'Pending').length,
      errorCount: filteredNodes.filter((n) => n.validation.type === 'Error').length,
    };
  }, [filteredNodes]);

  const headers = ['Account Number', 'Beneficiary Name', 'Bank Name', 'IFSC', 'Amount', 'Description'];
  const previewRows = useMemo(() => {
    return filteredNodes.map((h: any) => [
      h.user?.accountNumber || 'NOT-MAPPED',
      h.user?.name,
      h.user?.bankName || 'NOT-MAPPED',
      h.user?.ifscCode || 'N/A',
      h.breakdown?.netPay,
      `Salary_${month}_${year}`,
    ]);
  }, [filteredNodes, month, year]);

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

  const saveFileToDevice = async (content: string, fileName: string): Promise<string> => {
    const downloadPath = Platform.OS === 'android'
      ? RNFS.DownloadDirectoryPath
      : RNFS.DocumentDirectoryPath;
    const filePath = `${downloadPath}/${fileName}`;
    await RNFS.writeFile(filePath, content, 'utf8');
    return filePath;
  };

  const shareFile = async (filePath: string, fileName: string) => {
    await Share.share({
      title: 'Bank Transfer File',
      message: `Bank transfer file ${fileName} is ready`,
      url: `file://${filePath}`,
    });
  };

  const downloadBankFile = async () => {
    if (!filteredNodes.length) {
      Alert.alert('No Data', 'No validated payouts found for export');
      return;
    }

    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Storage permission is needed to save exported files.',
        [{ text: 'OK' }]
      );
      return;
    }

    const csvContent = [headers.join(','), ...previewRows.map((r) => r.join(','))].join('\n');
    const fileName = `Bank_Transfer_${bankFilter || 'All'}_M${month}_Y${year}.csv`;
    const filePath = await saveFileToDevice(csvContent, fileName);

    Alert.alert(
      'Export Successful',
      `File saved to:\n${filePath}\n\nWould you like to share it?`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Share', onPress: () => shareFile(filePath, fileName) },
      ]
    );

    setIsConfirmOpen(false);
    setIsPreviewOpen(false);
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
      title="Bank Transfer Export"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Bank Transfer Export"
          subtitle="Generate and validate bank transfer files for salary payouts"
          icon={Landmark}
          iconColor={COLORS.primary}
          iconBgColor={`${COLORS.primary}15`}
        />

        <View style={styles.content}>
          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.validateButton} onPress={() => setStatusFilter('All')}>
              <Text style={styles.validateButtonText}>Validate Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.generateButton, !filteredNodes.length && styles.disabledButton]}
              onPress={() => setIsPreviewOpen(true)}
              disabled={!filteredNodes.length}
            >
              <Download size={16} color={COLORS.white} />
              <Text style={styles.generateButtonText}>Generate File</Text>
            </TouchableOpacity>
          </View>

          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KPICard
              id="All"
              label="Total Payout Amount"
              value={`${currencySymbol}${formatCurrency(stats.totalLiquidity)}`}
              icon={Wallet}
              color={COLORS.primary}
              bgColor={`${COLORS.primary}15`}
              subtitle="Calculated Net Pay"
              isActive={statusFilter === 'All'}
              onPress={setStatusFilter}
            />
            <KPICard
              id="Ready"
              label="Employees Ready"
              value={stats.readyCount}
              icon={CheckCircle2}
              color={COLORS.success}
              bgColor={`${COLORS.success}15`}
              subtitle="Complete Bank Details"
              isActive={statusFilter === 'Ready'}
              onPress={setStatusFilter}
            />
            <KPICard
              id="Pending"
              label="Pending Bank Info"
              value={stats.pendingCount}
              icon={Clock}
              color={COLORS.warning}
              bgColor={`${COLORS.warning}15`}
              subtitle="Incomplete Records"
              isActive={statusFilter === 'Pending'}
              onPress={setStatusFilter}
            />
            <KPICard
              id="Error"
              label="Failed Validations"
              value={stats.errorCount}
              icon={ShieldAlert}
              color={COLORS.error}
              bgColor={`${COLORS.error}15`}
              subtitle="Missing All Details"
              isActive={statusFilter === 'Error'}
              onPress={setStatusFilter}
            />
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <View style={styles.filterGroup}>
              <View style={styles.filterChip}>
                <Building2 size={14} color={COLORS.gray} />
                <SafeSelector
                  options={[...Array(12)].map((_, i) => ({
                    label: new Date(2024, i).toLocaleString('default', { month: 'long' }),
                    value: i + 1,
                  }))}
                  selectedValue={month}
                  onValueChange={(v) => setMonth(v)}
                  visible={activeSelector === 'month'}
                  onOpen={() => setActiveSelector('month')}
                  onClose={() => setActiveSelector(null)}
                  style={styles.safeSelector}
                />
              </View>
              <View style={styles.filterChip}>
                <Building2 size={14} color={COLORS.gray} />
                <SafeSelector
                  options={[2024, 2025, 2026].map((y) => ({
                    label: String(y),
                    value: y,
                  }))}
                  selectedValue={year}
                  onValueChange={(v) => setYear(v)}
                  visible={activeSelector === 'year'}
                  onOpen={() => setActiveSelector('year')}
                  onClose={() => setActiveSelector(null)}
                  style={styles.safeSelector}
                />
              </View>
            </View>

            <View style={styles.filterChip}>
              <Landmark size={14} color={COLORS.gray} />
              <SafeSelector
                options={[
                  { label: 'All Banks', value: '' },
                  ...uniqueBanks.map((bank: any) => ({ label: bank, value: bank })),
                ]}
                selectedValue={bankFilter}
                onValueChange={(v) => setBankFilter(v)}
                visible={activeSelector === 'bank'}
                onOpen={() => setActiveSelector('bank')}
                onClose={() => setActiveSelector(null)}
                style={styles.safeSelector}
              />
            </View>
          </View>

          {/* Employee List */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableTitle}>Employee Payout Records</Text>
              <Text style={styles.tableCount}>{filteredNodes.length} Records Found</Text>
            </View>

            {filteredNodes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Search size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>No payout records found</Text>
                <Text style={styles.emptyText}>Try adjusting your filters</Text>
              </View>
            ) : (
              filteredNodes.map((node, idx) => (
                <EmployeeRow
                  key={idx}
                  employee={node}
                  onPress={() => navigation.navigate('PayrollProfiles', { employeeId: node.user?._id })}
                  currencySymbol={currencySymbol}
                />
              ))
            )}
          </View>

          {/* Export Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <View>
                <Text style={styles.statusLabel}>Ready to Disburse</Text>
                <Text style={styles.statusValue}>{stats.readyCount} Employees</Text>
              </View>
              <View style={styles.statusDivider} />
              <View>
                <Text style={[styles.statusLabel, { color: COLORS.error }]}>Issues Found</Text>
                <Text style={[styles.statusValue, { color: COLORS.error }]}>
                  {stats.pendingCount + stats.errorCount} Records
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.fixButton}
              onPress={() => navigation.navigate('PayrollProfiles')}
            >
              <Edit3 size={14} color={COLORS.white} />
              <Text style={styles.fixButtonText}>Fix Issues</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <PreviewModal
        visible={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={() => setIsConfirmOpen(true)}
        previewRows={previewRows}
        headers={headers}
        currencySymbol={currencySymbol}
        totalLiquidity={stats.totalLiquidity}
        nodeCount={stats.nodeCount}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={downloadBankFile}
        nodeCount={stats.nodeCount}
        totalLiquidity={stats.totalLiquidity}
        currencySymbol={currencySymbol}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.light },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  validateButton: { flex: 1, paddingVertical: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, alignItems: 'center' },
  validateButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.gray },
  generateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  generateButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },
  disabledButton: { opacity: 0.5 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.white, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  kpiCardActive: { borderColor: COLORS.primary, borderWidth: 2 },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: 9, color: COLORS.gray, textTransform: 'uppercase', fontWeight: 'bold' },
  kpiValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  kpiSubtitle: { fontSize: 9, color: COLORS.gray, marginTop: 2 },

  filtersContainer: { gap: 12, marginBottom: 20 },
  filterGroup: { flexDirection: 'row', gap: 12 },
  filterChip: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 50, gap: 8 },
  safeSelector: { flex: 1, height: 44, backgroundColor: 'transparent' },
  pickerItem: { fontSize: 14, color: COLORS.dark },

  tableCard: { backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tableTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  tableCount: { fontSize: 11, color: COLORS.gray },

  employeeRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  employeeAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  employeeInitial: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  employeeMeta: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  employeeRight: { alignItems: 'flex-end' },
  employeeAmount: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  employeeStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  employeeStatusText: { fontSize: 9, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 13, color: COLORS.gray, marginTop: 8 },

  statusBar: { backgroundColor: COLORS.dark, borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusLabel: { fontSize: 9, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  statusValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.white, marginTop: 2 },
  statusDivider: { width: 1, height: 30, backgroundColor: `${COLORS.white}20` },
  fixButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: `${COLORS.white}30`, borderRadius: 12 },
  fixButtonText: { fontSize: 11, fontWeight: 'bold', color: COLORS.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  modalContent: { padding: 20 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: `${COLORS.warning}10`, borderRadius: 12, padding: 12, marginBottom: 20 },
  warningText: { flex: 1, fontSize: 11, color: COLORS.warning },
  previewHeaderRow: { flexDirection: 'row', backgroundColor: COLORS.light, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 8 },
  previewHeaderCell: { fontSize: 9, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  previewCell: { fontSize: 11, color: COLORS.dark },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelButton: { flex: 1, paddingVertical: 14, backgroundColor: COLORS.light, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.gray },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  exportButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmContainer: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, width: '80%', alignItems: 'center' },
  confirmIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginBottom: 8 },
  confirmMessage: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 24 },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.light, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  confirmConfirm: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmConfirmText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
});