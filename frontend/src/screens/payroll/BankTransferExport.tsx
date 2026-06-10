import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import {
  Download,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Building,
  Clock,
  Landmark,
  ShieldAlert,
  ChevronDown
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { payrollAPI, userAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { exportFile, convertToCSV } from '../../utils/exportHelper';

const { width } = Dimensions.get('window');

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function BankTransferExport() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [history, setHistory] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterBank, setFilterBank] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    fetchData(history.length === 0);
  }, [month, year]);

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setIsRefetching(true);
      const [hRes, uRes, sRes]: any[] = await Promise.all([
        payrollAPI.getHistory({ month, year }),
        userAPI.getAll({ decryptPII: true }),
        settingsAPI.getSettings()
      ]);
      
      if (hRes?.success) setHistory(hRes.data);
      if (uRes?.success) setUsersData(uRes.data);
      if (sRes?.success) setSettings(sRes.data);
    } catch (err) {
      console.error('Failed to load bank transfer data', err);
    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  };

  const validatePayout = (h: any) => {
    const bankName = h.employee?.user?.bankName || h.bankDetails?.bankName;
    const accountNumber = h.employee?.user?.accountNumber || h.bankDetails?.accountNumber;
    const ifsc = h.employee?.user?.ifscCode || h.bankDetails?.ifscCode;

    let score = 0;
    if (bankName) score++;
    if (accountNumber) score++;
    if (ifsc) score++;

    if (score === 3) {
      return { type: 'Ready', label: 'READY', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 };
    } else if (score > 0) {
      return { type: 'Pending', label: 'PENDING', color: '#f59e0b', bg: '#fffbeb', icon: Clock };
    } else {
      return { type: 'Failed', label: 'FAILED', color: '#ef4444', bg: '#fef2f2', icon: ShieldAlert };
    }
  };

  const allNodes = useMemo(() => {
    let data = history.filter((h: any) => h.month === month && h.year === year);
    return data.map(h => ({
      ...h,
      id: h._id || h.id,
      status: validatePayout(h),
      bankName: h.employee?.user?.bankName || h.bankDetails?.bankName || 'Unassigned',
      accountNumber: h.employee?.user?.accountNumber || h.bankDetails?.accountNumber || '-',
      ifsc: h.employee?.user?.ifscCode || h.bankDetails?.ifscCode || '-',
      netPayCalc: Math.round(h.netPay || h.breakdown?.netPay || 0)
    }));
  }, [history, month, year, usersData]);

  // Initial selection
  useEffect(() => {
    if (allNodes.length > 0) {
      const readyIds = allNodes.filter(n => n.status.type === 'Ready').map(n => n.id);
      setSelectedIds(readyIds);
    }
  }, [allNodes]);

  const uniqueBanks = useMemo(() => {
    const banks = new Set(allNodes.map(n => n.bankName));
    return ['All', ...Array.from(banks)];
  }, [allNodes]);

  const filteredNodes = useMemo(() => {
    return allNodes.filter(n => {
      if (filterBank !== 'All' && n.bankName !== filterBank) return false;
      if (filterStatus !== 'All' && n.status.label !== filterStatus) return false;
      return true;
    });
  }, [allNodes, filterBank, filterStatus]);

  const stats = useMemo(() => {
    const ready = allNodes.filter(n => n.status.type === 'Ready').length;
    const pending = allNodes.filter(n => n.status.type === 'Pending').length;
    const failed = allNodes.filter(n => n.status.type === 'Failed').length;
    const totalAmount = allNodes.reduce((acc, n) => acc + n.netPayCalc, 0);
    return { total: allNodes.length, ready, pending, failed, totalAmount };
  }, [allNodes]);

  const selectionStats = useMemo(() => {
    const selectedNodes = filteredNodes.filter(n => selectedIds.includes(n.id));
    const amount = selectedNodes.reduce((acc, n) => acc + n.netPayCalc, 0);
    return { count: selectedNodes.length, amount };
  }, [filteredNodes, selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredNodes.length && filteredNodes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNodes.map(n => n.id));
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const handleExport = async () => {
    try {
      if (selectedIds.length === 0) {
        Alert.alert('No Selection', 'Please select at least one record to export.');
        return;
      }
      setExporting(true);
      
      const selectedNodes = filteredNodes.filter(n => selectedIds.includes(n.id));
      
      const headers = ['Employee Name', 'Employee ID', 'Bank Name', 'Account Number', 'IFSC Code', 'Net Pay', 'Status'];
      const rows = selectedNodes.map(node => [
        node.employee?.user?.name || node.user?.name || 'Unknown',
        node.employee?.employeeId || node.employee?.user?.employeeId || node.employeeInfo?.employeeId || node.user?.employeeId || '-',
        node.bankName,
        `'${node.accountNumber}`, // Quote to prevent excel scientific notation
        node.ifsc,
        node.netPayCalc,
        node.status.label
      ]);

      const csvString = convertToCSV(headers, rows);
      await exportFile(csvString, `Bank_Export_${months[month-1]}_${year}.csv`, 'text/csv', false);

    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to export bank file');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout title="Bank Clearing Export" user={user} refreshing={loading || isRefetching} onRefresh={() => fetchData(true)} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Landmark size={20} color="#4f46e5" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Bank Clearing Export</Text>
            </View>
            <Text style={styles.headerSubtitle}>Generate and validate bank transfer files for salary payouts</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={handleExport} disabled={exporting || selectedIds.length === 0}>
            {exporting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.headerBtnText}>Generate File ({selectedIds.length})</Text>}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* KPI Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
              <View style={[styles.kpiCard, { borderColor: '#818cf8', borderWidth: 1 }]}>
                <View style={styles.kpiHeader}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#eef2ff' }]}><CreditCard size={18} color="#4f46e5" /></View>
                  <Text style={styles.kpiBadge}>REAL-TIME</Text>
                </View>
                <Text style={styles.kpiLabel}>TOTAL PAYOUT AMOUNT</Text>
                <Text style={styles.kpiValue}>{currencySymbol}{stats.totalAmount.toLocaleString()}</Text>
                <Text style={styles.kpiSub}>Calculated Net Pay</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#ecfdf5' }]}><CheckCircle2 size={18} color="#10b981" /></View>
                  <Text style={styles.kpiBadge}>REAL-TIME</Text>
                </View>
                <Text style={styles.kpiLabel}>EMPLOYEES READY</Text>
                <Text style={styles.kpiValue}>{stats.ready}</Text>
                <Text style={styles.kpiSub}>Complete Bank Details</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#fffbeb' }]}><Clock size={18} color="#f59e0b" /></View>
                  <Text style={styles.kpiBadge}>REAL-TIME</Text>
                </View>
                <Text style={styles.kpiLabel}>PENDING BANK INFO</Text>
                <Text style={styles.kpiValue}>{stats.pending}</Text>
                <Text style={styles.kpiSub}>Incomplete Records</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={styles.kpiHeader}>
                  <View style={[styles.kpiIcon, { backgroundColor: '#fef2f2' }]}><ShieldAlert size={18} color="#ef4444" /></View>
                  <Text style={styles.kpiBadge}>REAL-TIME</Text>
                </View>
                <Text style={styles.kpiLabel}>FAILED VALIDATIONS</Text>
                <Text style={styles.kpiValue}>{stats.failed}</Text>
                <Text style={styles.kpiSub}>Missing All Details</Text>
              </View>
            </ScrollView>

            {/* Filters */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.totalRecordsText}>TOTAL {filteredNodes.length} RECORDS FOUND</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity style={styles.filterChip} onPress={() => setShowMonthPicker(true)}>
                  <Calendar size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.filterChipText}>{months[month-1].slice(0,3)}</Text>
                  <ChevronDown size={14} color="#94a3b8" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.filterChip} onPress={() => setShowYearPicker(true)}>
                  <Text style={styles.filterChipText}>{year}</Text>
                  <ChevronDown size={14} color="#94a3b8" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.filterChip} 
                  onPress={() => setShowBankPicker(true)}
                >
                  <Building size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.filterChipText}>{filterBank === 'All' ? 'All Banks' : filterBank}</Text>
                  <ChevronDown size={14} color="#94a3b8" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.filterChip} 
                  onPress={() => setShowStatusPicker(true)}
                >
                  <Filter size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.filterChipText}>{filterStatus === 'All' ? 'All Statuses' : filterStatus}</Text>
                  <ChevronDown size={14} color="#94a3b8" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Table/List */}
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <TouchableOpacity onPress={toggleAll} style={styles.checkboxContainer}>
                  {selectedIds.length === filteredNodes.length && filteredNodes.length > 0 ? (
                    <CheckSquare size={20} color="#4f46e5" />
                  ) : (
                    <Square size={20} color="#cbd5e1" />
                  )}
                </TouchableOpacity>
                <Text style={[styles.columnHeader, { flex: 2 }]}>EMPLOYEE NAME</Text>
                <Text style={[styles.columnHeader, { flex: 1.5 }]}>BANK DETAILS</Text>
                <Text style={[styles.columnHeader, { width: 80, textAlign: 'right' }]}>NET PAY</Text>
              </View>

              {filteredNodes.length > 0 ? filteredNodes.map((node, i) => {
                const StatusIcon = node.status.icon;
                const isSelected = selectedIds.includes(node.id);
                const empName = node.employee?.user?.name || node.user?.name || 'Unknown';
                const avatarInitials = empName.slice(0, 1).toUpperCase();

                return (
                  <View key={node.id} style={styles.nodeRow}>
                    <TouchableOpacity onPress={() => toggleSelection(node.id)} style={styles.checkboxContainer}>
                      {isSelected ? <CheckSquare size={20} color="#4f46e5" /> : <Square size={20} color="#cbd5e1" />}
                    </TouchableOpacity>
                    
                    <View style={[styles.cell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.empName}>{empName}</Text>
                        <Text style={styles.empId}>{node.employee?.employeeId || node.employee?.user?.employeeId || node.employeeInfo?.employeeId || node.user?.employeeId}</Text>
                      </View>
                    </View>

                    <View style={[styles.cell, { flex: 1.5, paddingRight: 8 }]}>
                      <Text style={styles.bankName}>{node.bankName}</Text>
                      <Text style={styles.bankSub} numberOfLines={1} ellipsizeMode="tail">ACC: {node.accountNumber}</Text>
                      <Text style={styles.bankSub} numberOfLines={1} ellipsizeMode="tail">IFSC: {node.ifsc}</Text>
                    </View>

                    <View style={[styles.cell, { width: 80, alignItems: 'flex-end' }]}>
                      <Text style={styles.netPay}>{currencySymbol}{node.netPayCalc.toLocaleString()}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: node.status.bg }]}>
                        <Text style={[styles.statusText, { color: node.status.color }]}>{node.status.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              }) : (
                <View style={styles.emptyState}>
                  <CreditCard size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No records found matching filters.</Text>
                </View>
              )}
            </View>

            {/* Bottom spacer for floating bar */}
            <View style={{ height: Platform.OS === 'ios' ? 120 : 100 }} />
          </>
        )}
      </View>

      {/* Floating Bottom Bar */}
      {!loading && (
        <View style={styles.floatingBar}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 16 }}>
              <Text style={styles.floatLabel}>SELECTED FOR EXPORT</Text>
              <Text style={styles.floatValue}>{selectionStats.count} / {filteredNodes.length} Employees</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.floatLabel}>SELECTED PAYOUT</Text>
              <Text style={styles.floatValue} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{selectionStats.amount.toLocaleString()}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.floatBtn, selectedIds.length === 0 && { opacity: 0.5 }]} 
            onPress={handleExport}
            disabled={selectedIds.length === 0 || exporting}
          >
            {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.floatBtnText}>PREVIEW & EXPORT ({selectionStats.count})</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, width: '80%', maxHeight: '60%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>Select Month</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {months.map((mName, i) => {
                const m = i + 1;
                const isSelected = m === month;
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => { setMonth(m); setShowMonthPicker(false); }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#4f46e5' : '#334155' }}>
                      {mName}
                    </Text>
                    {isSelected && <CheckCircle2 size={18} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{ marginTop: 20, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => setShowMonthPicker(false)}>
              <Text style={{ fontWeight: '800', color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Year Picker Modal */}
      {showYearPicker && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, width: '80%', maxHeight: '60%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>Select Year</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = new Date().getFullYear() - i;
                const isSelected = y === year;
                return (
                  <TouchableOpacity 
                    key={y} 
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => { setYear(y); setShowYearPicker(false); }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#4f46e5' : '#334155' }}>
                      {y}
                    </Text>
                    {isSelected && <CheckCircle2 size={18} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{ marginTop: 20, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => setShowYearPicker(false)}>
              <Text style={{ fontWeight: '800', color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bank Picker Modal */}
      {showBankPicker && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, width: '80%', maxHeight: '60%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>Select Bank</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {uniqueBanks.map((b, i) => {
                const isSelected = filterBank === b;
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => { setFilterBank(b); setShowBankPicker(false); }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#4f46e5' : '#334155' }}>
                      {b === 'All' ? 'All Banks' : b}
                    </Text>
                    {isSelected && <CheckCircle2 size={18} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{ marginTop: 20, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => setShowBankPicker(false)}>
              <Text style={{ fontWeight: '800', color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status Picker Modal */}
      {showStatusPicker && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, width: '80%', maxHeight: '60%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>Select Status</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {['All', 'READY', 'PENDING', 'FAILED'].map((s, i) => {
                const isSelected = filterStatus === s;
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => { setFilterStatus(s); setShowStatusPicker(false); }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#4f46e5' : '#334155' }}>
                      {s === 'All' ? 'All Statuses' : s}
                    </Text>
                    {isSelected && <CheckCircle2 size={18} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{ marginTop: 20, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => setShowStatusPicker(false)}>
              <Text style={{ fontWeight: '800', color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  headerBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  headerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  
  kpiScroll: { paddingBottom: 20, gap: 16, flexDirection: 'row' },
  kpiCard: { width: 220, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  kpiBadge: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  kpiSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#4f46e5' },
  totalRecordsText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },

  listContainer: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  listHeader: { flexDirection: 'row', padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  columnHeader: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  
  nodeRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  checkboxContainer: { width: 32, justifyContent: 'center' },
  cell: { justifyContent: 'center' },
  
  empName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  empId: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2 },
  
  bankName: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 2 },
  bankSub: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  
  netPay: { fontSize: 13, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '800' },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '600', marginTop: 12 },

  floatingBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0f172a', flexDirection: 'row', padding: 16, alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  floatLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 },
  floatValue: { fontSize: 13, fontWeight: '800', color: '#fff' },
  floatBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  floatBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' }
});
