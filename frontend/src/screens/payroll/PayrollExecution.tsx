import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronDown,
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Info,
  X
} from 'lucide-react-native';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useAuthStore } from '../../store/authStore';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

export default function PayrollExecution() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  
  const initialMonth = route.params?.month ? parseInt(route.params.month) : (new Date().getMonth() + 1);
  const initialYear = route.params?.year ? parseInt(route.params.year) : new Date().getFullYear();

  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [bulkConfirmVisible, setBulkConfirmVisible] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, paid, blocked, draft
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, pRes]: any[] = await Promise.all([
        settingsAPI.getSettings(),
        payrollAPI.getHistory({ month, year })
      ]);
      if (sRes?.success) setSettings(sRes.data);
      if (pRes?.success) setRecords(pRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const processedData = useMemo(() => {
    if (!records) return [];
    return records.filter(rec => {
      const name = rec.employeeInfo?.name || '';
      const empId = rec.employeeInfo?.employeeId || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            empId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const bankMissing = !rec.bankDetails?.accountNumber || !rec.bankDetails?.ifscCode;
      const payslipGenerated = !!rec.payslip;
      
      let status = 'draft';
      if (rec.isPaid || rec.payslip?.status === 'PAID') status = 'paid';
      else if (bankMissing) status = 'blocked';
      else if (payslipGenerated) status = 'pending';
      
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    if (!records) return { total: 0, payable: 0, paidCount: 0, pendingCount: 0, blockedCount: 0 };
    const total = records.length;
    const payable = records.reduce((acc, r) => acc + (r.netPay || 0), 0);
    const paidCount = records.filter(r => r.isPaid || r.payslip?.status === 'PAID').length;
    const pendingCount = total - paidCount;
    const blockedCount = records.filter(r => !r.isPaid && (!r.bankDetails?.accountNumber || !r.bankDetails?.ifscCode)).length;
    return { total, payable, paidCount, pendingCount, blockedCount };
  }, [records]);

  const handleMarkAllPaid = () => {
    const eligibleRecords = processedData.filter(r => !r.isPaid && r.payslip && r.payslip.status !== 'PAID' && r.bankDetails?.accountNumber);
    if (eligibleRecords.length === 0) {
      Alert.alert('Info', 'No eligible pending records found to mark as paid.');
      return;
    }
    setBulkConfirmVisible(true);
  };

  const confirmBulkDisbursement = async () => {
    try {
      setBulkProcessing(true);
      const eligibleRecords = processedData.filter(r => !r.isPaid && r.payslip && r.payslip.status !== 'PAID' && r.bankDetails?.accountNumber);
      const ids = eligibleRecords.map(r => r.payslip._id || r.payslip.id).filter(Boolean);
      
      if (ids.length === 0) return;

      const res: any = await payrollAPI.bulkMarkPayslipsAsPaid(ids);
      if (res?.success) {
        Alert.alert('Success', `Successfully marked ${ids.length} records as paid.`);
        await fetchData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to process bulk payment');
    } finally {
      setBulkProcessing(false);
      setBulkConfirmVisible(false);
    }
  };

  const handleMarkIndividualPaid = async (row: any) => {
    if (!row.payslip?._id && !row.payslip?.id) {
      Alert.alert('Error', 'Payslip not found for this record.');
      return;
    }
    
    try {
      setLoading(true);
      await payrollAPI.markPayslipAsPaid(row.payslip._id || row.payslip.id);
      await fetchData();
      Alert.alert('Success', `Successfully marked ${row.employeeInfo?.name || 'employee'} as paid`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark as paid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Payroll Execution" user={user} refreshing={loading} onRefresh={fetchData} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header & Date Pickers */}
        <View style={styles.headerArea}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={20} color="#6366f1" />
            <Text style={styles.backBtnText}>Back to History</Text>
          </TouchableOpacity>
          
          <View style={styles.titleRow}>
            <View style={{ flexShrink: 1, paddingRight: scale(12), minWidth: '50%', marginBottom: verticalScale(8) }}>
              <Text style={styles.pageTitle} adjustsFontSizeToFit numberOfLines={1}>Execution Review</Text>
              <Text style={styles.pageSubtitle} numberOfLines={2}>Review and complete disbursement</Text>
            </View>
            <TouchableOpacity style={styles.bulkBtn} onPress={handleMarkAllPaid}>
              <CreditCard size={16} color="#fff" />
              <Text style={styles.bulkBtnText}>Mark All Paid</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickersRow}>
            <TouchableOpacity style={styles.pickerBox} onPress={() => setMonthPickerVisible(true)}>
              <Text style={styles.pickerLabel}>MONTH</Text>
              <View style={styles.pickerValueRow}>
                <Text style={styles.pickerValueText}>{months[month - 1]}</Text>
                <ChevronDown size={14} color="#6366f1" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerBox} onPress={() => setYearPickerVisible(true)}>
              <Text style={styles.pickerLabel}>YEAR</Text>
              <View style={styles.pickerValueRow}>
                <Text style={styles.pickerValueText}>{year}</Text>
                <ChevronDown size={14} color="#6366f1" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* KPI Cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
              <View style={[styles.kpiCard, { backgroundColor: '#eef2ff' }]}>
                <Users size={20} color="#4f46e5" style={styles.kpiIcon} />
                <Text style={styles.kpiLabel}>Total Employees</Text>
                <Text style={[styles.kpiValue, { color: '#0f172a' }]} numberOfLines={1} adjustsFontSizeToFit>{kpis.total}</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: '#f8fafc' }]}>
                <Wallet size={20} color="#64748b" style={styles.kpiIcon} />
                <Text style={styles.kpiLabel}>Total Payable</Text>
                <Text style={[styles.kpiValue, { color: '#0f172a' }]} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{kpis.payable.toLocaleString()}</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: '#ecfdf5' }]}>
                <CheckCircle2 size={20} color="#10b981" style={styles.kpiIcon} />
                <Text style={styles.kpiLabel}>Paid Count</Text>
                <Text style={[styles.kpiValue, { color: '#059669' }]} numberOfLines={1} adjustsFontSizeToFit>{kpis.paidCount}</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: '#fffbeb' }]}>
                <Clock size={20} color="#d97706" style={styles.kpiIcon} />
                <Text style={styles.kpiLabel}>Pending Count</Text>
                <Text style={[styles.kpiValue, { color: '#d97706' }]} numberOfLines={1} adjustsFontSizeToFit>{kpis.pendingCount}</Text>
              </View>
            </ScrollView>

            {/* Readiness Insight */}
            <View style={styles.readinessCard}>
              <View style={styles.readinessHeader}>
                <View style={styles.readinessIconWrap}>
                  <Info size={16} color="#6366f1" />
                </View>
                <Text style={styles.readinessTitle}>Execution Readiness</Text>
              </View>
              
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Disbursement Progress</Text>
                <Text style={styles.progressValue}>{Math.round((kpis.paidCount / (kpis.total || 1)) * 100)}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(kpis.paidCount / (kpis.total || 1)) * 100}%` }]} />
              </View>

              <View style={styles.blocksRow}>
                <View style={[styles.blockBox, { backgroundColor: kpis.blockedCount > 0 ? '#fef3c7' : '#f8fafc' }]}>
                  <View style={styles.blockBoxHeader}>
                    <ShieldAlert size={14} color={kpis.blockedCount > 0 ? '#d97706' : '#94a3b8'} />
                    <Text style={styles.blockBoxLabel}>Blocked</Text>
                  </View>
                  <Text style={[styles.blockBoxValue, { color: kpis.blockedCount > 0 ? '#b45309' : '#94a3b8' }]}>{kpis.blockedCount}</Text>
                </View>
                <View style={[styles.blockBox, { backgroundColor: '#ecfdf5' }]}>
                  <View style={styles.blockBoxHeader}>
                    <ShieldCheck size={14} color="#10b981" />
                    <Text style={styles.blockBoxLabel}>Ready</Text>
                  </View>
                  <Text style={[styles.blockBoxValue, { color: '#059669' }]}>{kpis.total - kpis.blockedCount}</Text>
                </View>
              </View>
            </View>

            {/* Search and Filters */}
            <View style={styles.controlsArea}>
              <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
                <Search size={18} color={isFocused ? "#6366f1" : "#94a3b8"} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or ID..."
                  placeholderTextColor="#94a3b8"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {['all', 'pending', 'paid', 'blocked', 'draft'].map((f) => (
                  <TouchableOpacity 
                    key={f} 
                    style={[styles.filterPill, statusFilter === f && styles.filterPillActive]}
                    onPress={() => setStatusFilter(f)}
                  >
                    <Text style={[styles.filterPillText, statusFilter === f && styles.filterPillTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Employee List */}
            <View style={styles.listContainer}>
              {processedData.length > 0 ? processedData.map((row) => {
                const bankMissing = !row.bankDetails?.accountNumber || !row.bankDetails?.ifscCode;
                const payslipGenerated = !!row.payslip;
                const isPaid = row.isPaid || row.payslip?.status === 'PAID';
                
                return (
                  <View key={row.id} style={styles.empCard}>
                    <View style={styles.empHeaderRow}>
                      <View style={styles.empInfoGroup}>
                        <View style={styles.empAvatar}>
                          <Text style={styles.empAvatarText}>{row.employeeInfo?.name?.[0]}</Text>
                        </View>
                        <View>
                          <Text style={styles.empName}>{row.employeeInfo?.name}</Text>
                          <Text style={styles.empId}>{row.employeeInfo?.employeeId}</Text>
                        </View>
                      </View>
                      
                      {isPaid ? (
                        <TouchableOpacity 
                          style={styles.empActionBtn}
                          onPress={() => {
                            const correctUserId = row.payslip?.user?._id || row.payslip?.user || row.user?._id || row.user || row.employee?.userId || row.employee?._id || row.userId || (typeof row.employee === 'string' ? row.employee : null) || row.employeeInfo?.userId || row.employeeInfo?._id;
                            navigation.navigate('EmployeeDetail', { 
                              userId: correctUserId,
                              employeeInfo: row.employeeInfo
                            });
                          }}
                        >
                          <ExternalLink size={18} color="#94a3b8" />
                        </TouchableOpacity>
                      ) : !bankMissing ? (
                        <TouchableOpacity 
                          style={[styles.empActionBtn, { backgroundColor: '#ecfdf5', borderColor: '#10b981', borderWidth: 1 }]}
                          onPress={() => handleMarkIndividualPaid(row)}
                        >
                          <CheckCircle2 size={18} color="#10b981" />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.empActionBtn, { opacity: 0.5 }]}>
                          <CheckCircle2 size={18} color="#94a3b8" />
                        </View>
                      )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={[styles.empMetricsGrid, { minWidth: scale(300) }]}>
                        <View style={styles.empMetricCol}>
                          <Text style={styles.empMetricLabel}>BANK STATUS</Text>
                          {bankMissing ? (
                            <View style={styles.statusGroup}>
                              <ShieldAlert size={14} color="#d97706" />
                              <Text style={[styles.statusText, { color: '#d97706' }]}>MISSING</Text>
                            </View>
                          ) : (
                            <View style={styles.statusGroup}>
                              <ShieldCheck size={14} color="#10b981" />
                              <Text style={[styles.statusText, { color: '#10b981' }]}>VERIFIED</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.empMetricCol}>
                          <Text style={styles.empMetricLabel}>NET SALARY</Text>
                          <Text style={styles.empMetricValueDark}>{currencySymbol}{row.netPay?.toLocaleString()}</Text>
                        </View>

                        <View style={styles.empMetricCol}>
                          <Text style={styles.empMetricLabel}>PAYMENT</Text>
                          {isPaid ? (
                            <View style={[styles.payBadge, { backgroundColor: '#ecfdf5' }]}>
                              <Text style={[styles.payBadgeText, { color: '#059669' }]}>PAID</Text>
                            </View>
                          ) : bankMissing ? (
                            <View style={[styles.payBadge, { backgroundColor: '#fef2f2' }]}>
                              <Text style={[styles.payBadgeText, { color: '#dc2626' }]}>BLOCKED</Text>
                            </View>
                          ) : payslipGenerated ? (
                            <View style={[styles.payBadge, { backgroundColor: '#fffbeb' }]}>
                              <Text style={[styles.payBadgeText, { color: '#d97706' }]}>PENDING</Text>
                            </View>
                          ) : (
                            <View style={[styles.payBadge, { backgroundColor: '#f1f5f9' }]}>
                              <Text style={[styles.payBadgeText, { color: '#64748b' }]}>DRAFT</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                );
              }) : (
                <View style={styles.emptyState}>
                  <Search size={32} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No Records Found</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal visible={monthPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMonthPickerVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {months.map((m, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.modalItem, month === index + 1 && styles.modalItemActive]}
                  onPress={() => { setMonth(index + 1); setMonthPickerVisible(false); }}
                >
                  <Text style={[styles.modalItemText, month === index + 1 && styles.modalItemTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Year Picker Modal */}
      <Modal visible={yearPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setYearPickerVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Year</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {years.map((y, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.modalItem, year === y && styles.modalItemActive]}
                  onPress={() => { setYear(y); setYearPickerVisible(false); }}
                >
                  <Text style={[styles.modalItemText, year === y && styles.modalItemTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bulk Disbursement Confirmation Modal */}
      <Modal visible={bulkConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.bulkConfirmModal}>
            <View style={styles.bulkConfirmHeader}>
              <Text style={styles.bulkConfirmTitleText}>Confirm Bulk Disbursement?</Text>
              <TouchableOpacity onPress={() => !bulkProcessing && setBulkConfirmVisible(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.bulkConfirmBody}>
              <View style={styles.alertIconWrap}>
                <ShieldAlert size={28} color="#ef4444" />
              </View>
              
              <Text style={styles.bulkConfirmHeading}>CONFIRM BULK DISBURSEMENT?</Text>
              <Text style={styles.bulkConfirmDesc}>
                Are you sure you want to mark all eligible generated payslips as PAID? This will process multiple records at once.
              </Text>
            </View>

            <View style={styles.bulkConfirmActions}>
              <TouchableOpacity 
                style={styles.bulkCancelBtn} 
                onPress={() => !bulkProcessing && setBulkConfirmVisible(false)}
                disabled={bulkProcessing}
              >
                <Text style={styles.bulkCancelText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.bulkConfirmBtn} 
                onPress={confirmBulkDisbursement}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.bulkConfirmBtnText}>YES, CONFIRM BULK ACTION</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerArea: { paddingHorizontal: scale(16), paddingTop: verticalScale(16), paddingBottom: verticalScale(24), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(16) },
  backBtnText: { fontSize: moderateScale(13), fontWeight: '700', color: '#6366f1', marginLeft: scale(4) },
  
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: verticalScale(12) },
  pageTitle: { fontSize: moderateScale(24), fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: moderateScale(12), fontWeight: '600', color: '#64748b', marginTop: verticalScale(4) },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(12), gap: scale(6) },
  bulkBtnText: { color: '#fff', fontSize: moderateScale(12), fontWeight: '800' },

  pickersRow: { flexDirection: 'row', gap: scale(12) },
  pickerBox: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: scale(12), padding: scale(12) },
  pickerLabel: { fontSize: moderateScale(9), fontWeight: '800', color: '#94a3b8', marginBottom: verticalScale(4) },
  pickerValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValueText: { fontSize: moderateScale(14), fontWeight: '800', color: '#4f46e5' },

  kpiScroll: { paddingHorizontal: scale(16), gap: scale(12), marginTop: verticalScale(24), marginBottom: verticalScale(16) },
  kpiCard: { padding: scale(16), borderRadius: scale(20), minWidth: scale(140) },
  kpiIcon: { marginBottom: verticalScale(12) },
  kpiLabel: { fontSize: moderateScale(10), fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: verticalScale(4) },
  kpiValue: { fontSize: moderateScale(20), fontWeight: '800' },

  readinessCard: { marginHorizontal: scale(16), marginBottom: verticalScale(24), backgroundColor: '#0f172a', borderRadius: scale(24), padding: scale(20) },
  readinessHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(20) },
  readinessIconWrap: { width: scale(32), height: verticalScale(32), borderRadius: scale(10), backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  readinessTitle: { fontSize: moderateScale(12), fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(8) },
  progressLabel: { fontSize: moderateScale(10), fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' },
  progressValue: { fontSize: moderateScale(12), fontWeight: '800', color: '#10b981' },
  progressBarBg: { height: verticalScale(6), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: scale(3), overflow: 'hidden', marginBottom: verticalScale(20) },
  progressBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: scale(3) },
  
  blocksRow: { flexDirection: 'row', gap: scale(12) },
  blockBox: { flex: 1, padding: scale(12), borderRadius: scale(12) },
  blockBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: verticalScale(4) },
  blockBoxLabel: { fontSize: moderateScale(9), fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  blockBoxValue: { fontSize: moderateScale(16), fontWeight: '800' },

  controlsArea: { paddingHorizontal: scale(16), marginBottom: verticalScale(16) },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: scale(16), borderRadius: scale(16), borderWidth: 1, borderColor: '#e2e8f0', height: verticalScale(50), marginBottom: verticalScale(12), width: '100%' },
  searchBarFocused: { borderColor: '#6366f1' },
  searchInput: { flex: 1, marginLeft: scale(12), fontSize: moderateScale(14), color: '#1e293b', fontWeight: '500', padding: 0, paddingVertical: 0 },
  
  filterScroll: { gap: scale(8), paddingBottom: verticalScale(8) },
  filterPill: { paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(20), backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterPillActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  filterPillText: { fontSize: moderateScale(10), fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  filterPillTextActive: { color: '#fff' },

  listContainer: { paddingHorizontal: scale(16), gap: scale(12) },
  empCard: { backgroundColor: '#fff', borderRadius: scale(20), padding: scale(16), borderWidth: 1, borderColor: '#f1f5f9' },
  empHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  empInfoGroup: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  empAvatar: { width: scale(40), height: verticalScale(40), borderRadius: scale(12), backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  empAvatarText: { fontSize: moderateScale(14), fontWeight: '800', color: '#4f46e5' },
  empName: { fontSize: moderateScale(14), fontWeight: '800', color: '#0f172a' },
  empId: { fontSize: moderateScale(10), fontWeight: '700', color: '#94a3b8' },
  empActionBtn: { padding: scale(8), backgroundColor: '#f8fafc', borderRadius: scale(10) },

  empMetricsGrid: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: scale(12), padding: scale(12) },
  empMetricCol: { flex: 1 },
  empMetricLabel: { fontSize: moderateScale(9), fontWeight: '800', color: '#94a3b8', marginBottom: verticalScale(6) },
  empMetricValueDark: { fontSize: moderateScale(13), fontWeight: '800', color: '#0f172a' },
  
  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  statusText: { fontSize: moderateScale(10), fontWeight: '800' },
  
  payBadge: { paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: scale(8), alignSelf: 'flex-start' },
  payBadgeText: { fontSize: moderateScale(9), fontWeight: '800' },

  emptyState: { padding: scale(40), alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: moderateScale(16), fontWeight: '800', color: '#64748b', marginTop: verticalScale(12) },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(24), paddingBottom: verticalScale(40) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#0f172a', marginBottom: verticalScale(16), textAlign: 'center' },
  modalItem: { paddingVertical: verticalScale(16), paddingHorizontal: scale(24), borderRadius: scale(16), marginBottom: verticalScale(8), backgroundColor: '#f8fafc' },
  modalItemActive: { backgroundColor: '#eef2ff' },
  modalItemText: { fontSize: moderateScale(16), fontWeight: '700', color: '#475569', textAlign: 'center' },
  modalItemTextActive: { color: '#4f46e5', fontWeight: '800' },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  bulkConfirmModal: { backgroundColor: '#fff', borderRadius: scale(16), width: '100%', overflow: 'hidden' },
  bulkConfirmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(16), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  bulkConfirmTitleText: { fontSize: moderateScale(14), fontWeight: '700', color: '#1e293b' },
  bulkConfirmBody: { alignItems: 'center', padding: scale(24) },
  alertIconWrap: { width: scale(64), height: scale(64), borderRadius: scale(16), backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(20) },
  bulkConfirmHeading: { fontSize: moderateScale(16), fontWeight: '900', color: '#0f172a', marginBottom: verticalScale(12), textAlign: 'center' },
  bulkConfirmDesc: { fontSize: moderateScale(13), color: '#64748b', textAlign: 'center', lineHeight: moderateScale(20) },
  bulkConfirmActions: { flexDirection: 'row', gap: scale(12), padding: scale(24), paddingTop: 0 },
  bulkCancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: verticalScale(14), borderRadius: scale(12), alignItems: 'center' },
  bulkCancelText: { fontSize: moderateScale(12), fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  bulkConfirmBtn: { flex: 1, backgroundColor: '#f43f5e', paddingVertical: verticalScale(14), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  bulkConfirmBtnText: { fontSize: moderateScale(11), fontWeight: '800', color: '#fff', textTransform: 'uppercase', textAlign: 'center' }
});
