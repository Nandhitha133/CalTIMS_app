// screens/payroll/MyPayslipsScreen.tsx
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
  StyleSheet,
  Platform,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Calendar,
  Download,
  Eye,
  FileText,
  AlertCircle,
  ChevronRight,
  Wallet,
  TrendingDown,
  Mail,
  Receipt,
  History,
  ArrowUpRight,
  CheckCircle2,
  X,
  Clock,
} from 'lucide-react-native';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import { formatCurrency } from '../../utils/formatters';
import RNFS from 'react-native-fs';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Types
interface PayslipComponent {
  name: string;
  value: number;
}

interface Payslip {
  _id: string;
  id: string;
  month: number;
  year: number;
  isPaid: boolean;
  status: string;
  netPay: number;
  gross: number;
  totalDeductions: number;
  earnings?: PayslipComponent[];
  deductions?: PayslipComponent[];
  breakdown?: {
    netPay: number;
    earnings?: { grossEarnings: number; components: PayslipComponent[] };
    deductions?: { totalDeductions: number; components: PayslipComponent[] };
  };
  employeeInfo?: {
    name: string;
    employeeId: string;
    department?: string;
    designation?: string;
  };
  isEmailSent?: boolean;
  paidAt?: string;
}

interface Settings {
  organization?: { currency: string };
  payroll?: { currencySymbol: string };
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = [2024, 2025, 2026];

// Helper to extract data from API response
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, color, bgColor }: any) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
    <Icon size={22} color={color} />
  </View>
);

// Breakdown Section Component
const BreakdownSection = ({ title, components, isEarning = true, currencySymbol }: any) => (
  <View style={styles.breakdownSection}>
    <Text style={styles.breakdownTitle}>{title}</Text>
    <View style={styles.breakdownList}>
      {components?.map((comp: any, idx: number) => (
        <View key={idx} style={styles.breakdownItem}>
          <Text style={styles.breakdownItemName}>{comp.name}</Text>
          <Text style={[styles.breakdownItemValue, !isEarning && { color: '#ef4444' }]}>
            {isEarning ? `${currencySymbol}${comp.value?.toLocaleString()}` : `-${currencySymbol}${comp.value?.toLocaleString()}`}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

// History Item Component
const HistoryItem = ({ item, onView, onDownload, onEmail, currencySymbol }: any) => {
  const isPaid = item.isPaid || item.status === 'PAID';

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyItemLeft}>
        <View style={styles.historyMonthBox}>
          <Text style={styles.historyMonthNumber}>{item.month.toString().padStart(2, '0')}</Text>
        </View>
        <View>
          <Text style={styles.historyMonthName}>{months[item.month - 1]}</Text>
          <Text style={styles.historyYear}>{item.year}</Text>
        </View>
      </View>
      <Text style={styles.historyNetPay}>
        {currencySymbol}{(item.netPay || item.breakdown?.netPay || 0).toLocaleString()}
      </Text>
      <View style={[styles.historyStatus, isPaid ? styles.statusPaid : styles.statusPending]}>
        <Text style={[styles.historyStatusText, isPaid ? styles.statusPaidText : styles.statusPendingText]}>
          {isPaid ? 'Paid' : 'Pending'}
        </Text>
      </View>
      <View style={styles.historyActions}>
        <TouchableOpacity onPress={() => onView(item)} style={styles.historyActionBtn}>
          <Eye size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDownload(item)} style={styles.historyActionBtn}>
          <Download size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEmail(item)} style={styles.historyActionBtn}>
          <Mail size={16} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Preview Modal Component
const PreviewModal = ({ visible, payslip, onClose, onDownload, onEmail, currencySymbol, isDownloading, isEmailing }: any) => {
  if (!payslip) return null;

  const netPay = payslip.netPay || payslip.breakdown?.netPay || 0;
  const earnings = payslip.earnings || payslip.breakdown?.earnings?.components || [];
  const deductions = payslip.deductions || payslip.breakdown?.deductions?.components || [];
  const isPaid = payslip.isPaid || payslip.status === 'PAID';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Salary Statement</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <View style={styles.modalPeriodBadge}>
                <Calendar size={14} color="#3b82f6" />
                <Text style={styles.modalPeriodText}>
                  {months[payslip.month - 1]} {payslip.year}
                </Text>
              </View>
              <Text style={styles.modalNetLabel}>Net Take-Home Salary</Text>
              <Text style={styles.modalNetValue}>{currencySymbol}{netPay.toLocaleString()}</Text>

              {earnings.length > 0 && (
                <BreakdownSection
                  title="Earnings"
                  components={earnings}
                  isEarning={true}
                  currencySymbol={currencySymbol}
                />
              )}

              {deductions.length > 0 && (
                <BreakdownSection
                  title="Deductions"
                  components={deductions}
                  isEarning={false}
                  currencySymbol={currencySymbol}
                />
              )}

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalDownloadBtn}
                  onPress={() => onDownload(payslip)}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <>
                      <Download size={18} color="#3b82f6" />
                      <Text style={styles.modalDownloadBtnText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalEmailBtn}
                  onPress={() => onEmail(payslip)}
                  disabled={isEmailing}
                >
                  {isEmailing ? (
                    <ActivityIndicator size="small" color="#64748b" />
                  ) : (
                    <>
                      <Mail size={18} color="#64748b" />
                      <Text style={styles.modalEmailBtnText}>Email</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function MyPayslipsScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [history, setHistory] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [emailing, setEmailing] = useState<string | null>(null);

  const currencySymbol = settings?.payroll?.currencySymbol ||
    (settings?.organization?.currency === 'INR' ? '₹' : settings?.organization?.currency === 'USD' ? '$' : '₹');

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

  const fetchPayslips = async () => {
    try {
      const response = await payrollAPI.getMyPayslips();
      const data = extractData(response, []);
      setHistory(data);

      const current = data.find((p: Payslip) => p.month === selectedMonth && p.year === selectedYear);
      setPayslip(current || null);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      Alert.alert('Error', 'Failed to load payslip data');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchPayslips()]);
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

  const handleDownload = async (payslipItem: Payslip) => {
    const targetId = payslipItem._id || payslipItem.id;
    if (!targetId) return;

    setDownloading(targetId);
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is needed to save files.');
        return;
      }

      const response = await payrollAPI.downloadPayslip(targetId);
      const data = extractData(response);

      // Create filename
      const empCode = payslipItem.employeeInfo?.employeeId || user?.employeeId || 'EMP';
      const filename = `Payslip_${empCode}_${months[payslipItem.month - 1]}_${payslipItem.year}.pdf`;

      // Save to device
      const downloadPath = Platform.OS === 'android'
        ? RNFS.DownloadDirectoryPath
        : RNFS.DocumentDirectoryPath;
      const filePath = `${downloadPath}/${filename}`;

      // Convert base64 to file if needed
      if (typeof data === 'string' && data.startsWith('data:application/pdf')) {
        const base64Data = data.split(',')[1];
        await RNFS.writeFile(filePath, base64Data, 'base64');
      } else if (data instanceof Blob) {
        // Handle blob data
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          await RNFS.writeFile(filePath, base64, 'base64');
        };
        reader.readAsDataURL(data);
      }

      Alert.alert(
        'Download Successful',
        `File saved to:\n${filePath}\n\nWould you like to share it?`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              await Share.share({
                title: filename,
                message: `Payslip for ${months[payslipItem.month - 1]} ${payslipItem.year}`,
                url: `file://${filePath}`,
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download payslip');
    } finally {
      setDownloading(null);
    }
  };

  const handleEmail = async (payslipItem: Payslip) => {
    const targetId = payslipItem._id || payslipItem.id;
    if (!targetId) return;

    setEmailing(targetId);
    try {
      await payrollAPI.sendPayslipEmail(targetId);
      Alert.alert('Success', 'Payslip sent to your registered email!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send email. Please try again.');
    } finally {
      setEmailing(null);
    }
  };

  const handleView = (payslipItem: Payslip) => {
    setSelectedPayslip(payslipItem);
    setPreviewVisible(true);
  };

  const currentPayslip = payslip;
  const isPaid = currentPayslip?.isPaid || currentPayslip?.status === 'PAID';
  const netPay = currentPayslip?.netPay || currentPayslip?.breakdown?.netPay || 0;
  const grossPay = currentPayslip?.gross || currentPayslip?.breakdown?.earnings?.grossEarnings || 0;
  const totalDeductions = currentPayslip?.totalDeductions || currentPayslip?.breakdown?.deductions?.totalDeductions || 0;

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Layout
      title="My Payslips"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="My Payslips"
          subtitle="View and download your salary statements"
          icon={FileText}
          iconColor="#8b5cf6"
          iconBgColor="#f3e8ff"
        />

        <View style={styles.content}>
          {/* Month/Year Selector */}
          <View style={styles.selectorContainer}>
            <Calendar size={18} color="#3b82f6" />
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(v: number) => setSelectedMonth(v)}
                style={styles.picker}
                dropdownIconColor="#64748b"
              >
                {months.map((m, i) => (
                  <Picker.Item key={m} label={m} value={i + 1} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(v: number) => setSelectedYear(v)}
                style={styles.picker}
                dropdownIconColor="#64748b"
              >
                {years.map((y) => (
                  <Picker.Item key={y} label={String(y)} value={y} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <StatCard
              label="Net Pay"
              value={`${currencySymbol}${netPay.toLocaleString()}`}
              icon={Wallet}
              color="#3b82f6"
              bgColor="#eff6ff"
            />
            <StatCard
              label="Gross Pay"
              value={`${currencySymbol}${grossPay.toLocaleString()}`}
              icon={FileText}
              color="#10b981"
              bgColor="#ecfdf5"
            />
            <StatCard
              label="Total Deductions"
              value={`${currencySymbol}${totalDeductions.toLocaleString()}`}
              icon={TrendingDown}
              color="#ef4444"
              bgColor="#fef2f2"
            />
            <StatCard
              label="Status"
              value={isPaid ? 'Paid' : 'Pending'}
              icon={CheckCircle2}
              color={isPaid ? '#10b981' : '#f59e0b'}
              bgColor={isPaid ? '#ecfdf5' : '#fffbeb'}
            />
          </View>

          {/* Main Content */}
          {currentPayslip ? (
            <View style={styles.mainCard}>
              <View style={styles.netSalaryCard}>
                <View style={styles.periodBadge}>
                  <Calendar size={14} color="#3b82f6" />
                  <Text style={styles.periodText}>{months[selectedMonth - 1]} {selectedYear}</Text>
                </View>
                <Text style={styles.netLabel}>Net Take-Home Salary</Text>
                <Text style={styles.netValue}>{currencySymbol}{netPay.toLocaleString()}</Text>

                <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(currentPayslip)}>
                  <Eye size={18} color="white" />
                  <Text style={styles.viewBtnText}>View Statement</Text>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtnOutline}
                    onPress={() => handleDownload(currentPayslip)}
                    disabled={downloading === currentPayslip._id}
                  >
                    {downloading === currentPayslip._id ? (
                      <ActivityIndicator size="small" color="#1e293b" />
                    ) : (
                      <>
                        <Download size={18} color="#1e293b" />
                        <Text style={styles.actionBtnOutlineText}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnOutline}
                    onPress={() => handleEmail(currentPayslip)}
                    disabled={emailing === currentPayslip._id}
                  >
                    {emailing === currentPayslip._id ? (
                      <ActivityIndicator size="small" color="#1e293b" />
                    ) : (
                      <>
                        <Mail size={18} color="#1e293b" />
                        <Text style={styles.actionBtnOutlineText}>Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Earnings Breakdown */}
              {(currentPayslip.earnings || currentPayslip.breakdown?.earnings?.components) && (
                <BreakdownSection
                  title="Earnings"
                  components={currentPayslip.earnings || currentPayslip.breakdown?.earnings?.components}
                  isEarning={true}
                  currencySymbol={currencySymbol}
                />
              )}

              {/* Deductions Breakdown */}
              {(currentPayslip.deductions || currentPayslip.breakdown?.deductions?.components) && (
                <BreakdownSection
                  title="Deductions"
                  components={currentPayslip.deductions || currentPayslip.breakdown?.deductions?.components}
                  isEarning={false}
                  currencySymbol={currencySymbol}
                />
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Clock size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Statement Not Found</Text>
              <Text style={styles.emptyText}>
                Payslip has not been generated for {months[selectedMonth - 1]} {selectedYear} yet.
              </Text>
            </View>
          )}

          {/* Payment History */}
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <History size={18} color="#3b82f6" />
              <Text style={styles.historyTitle}>Payment History</Text>
            </View>
            {history.length > 0 ? (
              history.map((item) => (
                <HistoryItem
                  key={item._id || item.id}
                  item={item}
                  onView={handleView}
                  onDownload={handleDownload}
                  onEmail={handleEmail}
                  currencySymbol={currencySymbol}
                />
              ))
            ) : (
              <Text style={styles.historyEmpty}>No payment history found</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <PreviewModal
        visible={previewVisible}
        payslip={selectedPayslip}
        onClose={() => {
          setPreviewVisible(false);
          setSelectedPayslip(null);
        }}
        onDownload={handleDownload}
        onEmail={handleEmail}
        currencySymbol={currencySymbol}
        isDownloading={downloading === selectedPayslip?._id}
        isEmailing={emailing === selectedPayslip?._id}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerWrapper: { flex: 1, height: 50 },
  picker: { height: 50, width: '100%' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },

  mainCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  netSalaryCard: { alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 20 },
  periodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  periodText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  netLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  netValue: { fontSize: 32, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1e293b', paddingVertical: 14, borderRadius: 16, width: '100%', marginBottom: 16 },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: 'white' },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnOutlineText: { fontSize: 13, fontWeight: '600', color: '#1e293b' },

  breakdownSection: { marginBottom: 20 },
  breakdownTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  breakdownList: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16 },
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  breakdownItemName: { fontSize: 13, fontWeight: '500', color: '#475569' },
  breakdownItemValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, backgroundColor: 'white', borderRadius: 24, marginBottom: 20, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },

  historyCard: { backgroundColor: 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  historyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  historyItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyMonthBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  historyMonthNumber: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  historyMonthName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  historyYear: { fontSize: 11, color: '#94a3b8' },
  historyNetPay: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  historyStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusPaid: { backgroundColor: '#ecfdf5' },
  statusPending: { backgroundColor: '#fffbeb' },
  historyStatusText: { fontSize: 10, fontWeight: '600' },
  statusPaidText: { color: '#10b981' },
  statusPendingText: { color: '#f59e0b' },
  historyActions: { flexDirection: 'row', gap: 8 },
  historyActionBtn: { padding: 6 },
  historyEmpty: { textAlign: 'center', color: '#94a3b8', paddingVertical: 32 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalContent: { padding: 20 },
  modalPeriodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16 },
  modalPeriodText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  modalNetLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  modalNetValue: { fontSize: 36, fontWeight: '800', color: '#1e293b', marginBottom: 24 },
  modalActionButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalDownloadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', paddingVertical: 12, borderRadius: 16 },
  modalDownloadBtnText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  modalEmailBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f8fafc', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  modalEmailBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
});