import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Modal
} from 'react-native';
import {
  Calendar,
  Download,
  FileText,
  Wallet,
  TrendingDown,
  CheckCircle2,
  Receipt,
  History,
  ChevronDown
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import StatementPreviewModal from './StatementPreviewModal';

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = [2024, 2025, 2026];

export default function MyPayslipsScreen() {
  const [user, setUser] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payslip, setPayslip] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const settRes: any = await settingsAPI.getSettings();
      if (settRes?.success) {
        setSettings(settRes.data);
      }

      const histRes: any = await payrollAPI.getMyPayslips();
      if (histRes?.success) {
        setHistory(histRes.data);
        const current = histRes.data.find((p: any) => p.month === selectedMonth && p.year === selectedYear);
        setPayslip(current || null);
      }
    } catch (err) {
      console.error('Failed to load payslip data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id?: string) => {
    const targetId = id || payslip?.id;
    if (!targetId) return;
    Alert.alert('Download', 'Downloading payslip on mobile is not fully implemented yet.');
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const renderSummaryCard = (label: string, value: number | string, Icon: any, color: string, bg: string, isStatus = false) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={[styles.cardValue, isStatus ? { color } : {}]}>
          {isStatus ? value : `${currencySymbol}${Number(value)?.toLocaleString() || '0'}`}
        </Text>
      </View>
      <View style={[styles.iconContainer, { backgroundColor: bg }]}>
        <Icon size={24} color={color} />
      </View>
    </View>
  );

  return (
    <Layout title="My Payslips" user={user} refreshing={loading} onRefresh={fetchData} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Options */}
        <View style={styles.headerControls}>
          <TouchableOpacity style={styles.dateSelector} onPress={() => setMonthPickerVisible(true)}>
            <Calendar size={18} color="#3b82f6" style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>{months[selectedMonth - 1]}</Text>
            <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateSelector} onPress={() => setYearPickerVisible(true)}>
            <Text style={styles.dateText}>{selectedYear}</Text>
            <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.content}>
            {/* Summary Cards */}
            <View style={styles.grid}>
              {renderSummaryCard('Net Pay', payslip?.netPay || 0, Wallet, '#3b82f6', '#eff6ff')}
              {renderSummaryCard('Gross Pay', payslip?.gross || 0, FileText, '#10b981', '#ecfdf5')}
              {renderSummaryCard('Deductions', payslip?.totalDeductions || 0, TrendingDown, '#ef4444', '#fef2f2')}
              {renderSummaryCard('Status', (payslip?.isPaid || payslip?.status === 'PAID') ? 'Paid' : 'Pending', CheckCircle2, (payslip?.isPaid || payslip?.status === 'PAID') ? '#10b981' : '#f59e0b', (payslip?.isPaid || payslip?.status === 'PAID') ? '#ecfdf5' : '#fffbeb', true)}
            </View>

            {payslip ? (
              <View style={styles.breakdownSection}>
                <View style={styles.breakdownHeader}>
                  <Receipt size={20} color="#3b82f6" />
                  <Text style={styles.breakdownTitle}>Detailed Breakdown</Text>
                </View>

                {/* Earnings */}
                <Text style={styles.sectionSubtitle}>Earnings</Text>
                {(Array.isArray(payslip.earnings) ? payslip.earnings : (payslip.earnings?.components || [])).map((comp: any, idx: number) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.rowLabel}>{comp.name}</Text>
                    <Text style={styles.rowValue}>{currencySymbol}{comp.value?.toLocaleString()}</Text>
                  </View>
                ))}

                {/* Deductions */}
                <Text style={[styles.sectionSubtitle, { marginTop: 16 }]}>Deductions</Text>
                {(Array.isArray(payslip.deductions) ? payslip.deductions : (payslip.deductions?.components || [])).map((comp: any, idx: number) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.rowLabel}>{comp.name}</Text>
                    <Text style={[styles.rowValue, { color: '#ef4444' }]}>{currencySymbol}{comp.value?.toLocaleString()}</Text>
                  </View>
                ))}

                {/* Actions */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => setPreviewVisible(true)}>
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Statement Processing</Text>
                <Text style={styles.emptyDesc}>The payroll for {months[selectedMonth - 1]} {selectedYear} is currently being finalized.</Text>
              </View>
            )}

            {/* History */}
            <View style={styles.historySection}>
              <View style={styles.breakdownHeader}>
                <History size={20} color="#3b82f6" />
                <Text style={styles.breakdownTitle}>Payment History</Text>
              </View>
              {history.map((h, i) => (
                <View key={i} style={styles.historyCard}>
                  <View>
                    <Text style={styles.historyMonth}>{months[h.month - 1]} {h.year}</Text>
                    <Text style={styles.historyNet}>{currencySymbol}{(h.netPay || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDownload(h.id)}>
                      <Download size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

          </View>
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
                  style={[styles.modalItem, selectedMonth === index + 1 && styles.modalItemActive]}
                  onPress={() => { setSelectedMonth(index + 1); setMonthPickerVisible(false); }}
                >
                  <Text style={[styles.modalItemText, selectedMonth === index + 1 && styles.modalItemTextActive]}>{m}</Text>
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
                  style={[styles.modalItem, selectedYear === y && styles.modalItemActive]}
                  onPress={() => { setSelectedYear(y); setYearPickerVisible(false); }}
                >
                  <Text style={[styles.modalItemText, selectedYear === y && styles.modalItemTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      <StatementPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        onDownload={() => handleDownload()}
        payslip={payslip}
        currencySymbol={currencySymbol}
        settings={settings}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  headerControls: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16, gap: 8 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  dateText: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  content: { gap: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  breakdownSection: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 16 },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  breakdownTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
  viewBtn: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  viewBtnText: { color: '#4f46e5', fontSize: 14, fontWeight: '800' },
  
  emptyState: { backgroundColor: '#fff', padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0', marginTop: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  historySection: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 16 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  historyMonth: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  historyNet: { fontSize: 14, fontWeight: '600', color: '#3b82f6', marginTop: 2 },
  historyActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, marginBottom: 8, backgroundColor: '#f8fafc' },
  modalItemActive: { backgroundColor: '#eef2ff' },
  modalItemText: { fontSize: 16, fontWeight: '700', color: '#475569', textAlign: 'center' },
  modalItemTextActive: { color: '#3b82f6', fontWeight: '800' }
});
