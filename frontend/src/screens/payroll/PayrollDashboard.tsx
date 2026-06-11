import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  Wallet,
  CreditCard,
  TrendingDown,
  Users,
  Play,
  AlertCircle,
  ExternalLink,
  Calendar
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PayrollDashboard() {
  const [user, setUser] = useState<any>(null);
  const navigation = useNavigation<any>();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    loadUserData();
    fetchData();
  }, [selectedMonth, selectedYear]);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const settRes: any = await settingsAPI.getSettings();
      if (settRes?.success) setSettings(settRes.data);

      const [dashRes, histRes, analyticsRes]: any[] = await Promise.all([
        payrollAPI.getDashboard({ month: selectedMonth, year: selectedYear }),
        payrollAPI.getBatches(),
        payrollAPI.getAnalytics({ month: selectedMonth, year: selectedYear, department: 'All' })
      ]);

      if (dashRes?.success) setDash(dashRes.data);
      if (histRes?.success) setHistory(histRes.data.slice(0, 5));
      if (analyticsRes?.success) setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const renderKpiCard = (label: string, value: number, Icon: any, color: string, bg: string, isStatic = false) => (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconBox, { backgroundColor: bg }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.kpiContent}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>
          {isStatic ? value : `${currencySymbol}${value?.toLocaleString() || '0'}`}
        </Text>
      </View>
    </View>
  );

  return (
    <Layout title="Payroll Dashboard" user={user} refreshing={loading} onRefresh={fetchData} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Options */}
        <View style={styles.headerControls}>
          <View style={styles.dateSelector}>
            <Calendar size={18} color="#4f46e5" style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>{months[selectedMonth - 1]} {selectedYear}</Text>
          </View>
          <TouchableOpacity style={styles.runBtn} onPress={() => navigation.navigate('PayrollRun')}>
            <Play size={16} color="#fff" />
            <Text style={styles.runBtnText}>Run Payroll</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.content}>
            {/* KPIs */}
            <View style={styles.kpiGrid}>
              {renderKpiCard('Total Payout', dash?.summary?.totalGross || 0, Wallet, '#4f46e5', '#eef2ff')}
              {renderKpiCard('Net Disbursed', dash?.summary?.totalPayroll || 0, CreditCard, '#10b981', '#ecfdf5')}
              {renderKpiCard('Deductions', dash?.summary?.totalDeductions || 0, TrendingDown, '#f43f5e', '#fff1f2')}
              {renderKpiCard('Employees', dash?.summary?.activeEmployees || 0, Users, '#3b82f6', '#eff6ff', true)}
            </View>

            {/* Status Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Cycle Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{dash?.summary?.status || 'Draft'}</Text>
                </View>
              </View>
              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Last Execution</Text>
                <Text style={styles.statusValue}>{dash?.summary?.lastRunDate ? new Date(dash.summary.lastRunDate).toLocaleDateString() : 'No recent runs'}</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Processed</Text>
                  <Text style={[styles.statValue, { color: '#4f46e5' }]}>{dash?.summary?.totalProcessed || 0}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
                  <Text style={[styles.statLabel, { color: '#10b981' }]}>Paid</Text>
                  <Text style={[styles.statValue, { color: '#10b981' }]}>{dash?.summary?.totalPaid || 0}</Text>
                </View>
              </View>
            </View>

            {/* Critical Alerts */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <AlertCircle size={18} color="#ef4444" />
                <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Critical Alerts</Text>
              </View>
              <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('EmployeePayrollProfiles')}>
                <Text style={styles.alertLabel}>Missing Bank Details</Text>
                <View style={[styles.alertCount, dash?.compliance?.missingBankDetails > 0 && styles.alertCountDanger]}>
                  <Text style={[styles.alertCountText, dash?.compliance?.missingBankDetails > 0 && styles.alertCountTextDanger]}>
                    {dash?.compliance?.missingBankDetails || 0}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('EmployeePayrollProfiles')}>
                <Text style={styles.alertLabel}>Pending Structures</Text>
                <View style={[styles.alertCount, dash?.compliance?.missingSalaryStructure > 0 && styles.alertCountDanger]}>
                  <Text style={[styles.alertCountText, dash?.compliance?.missingSalaryStructure > 0 && styles.alertCountTextDanger]}>
                    {dash?.compliance?.missingSalaryStructure || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Analytics Section */}
            {analytics && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Cost by Department</Text>
                </View>
                {analytics.departmentDistribution?.length > 0 ? (
                  analytics.departmentDistribution.map((dept: any, idx: number) => {
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                    const color = colors[idx % colors.length];
                    const totalGross = dash?.summary?.totalGross || 1; // Prevent division by zero
                    const percent = Math.min(100, (dept.value / totalGross) * 100);
                    return (
                      <View key={idx} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>{dept.name}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>{currencySymbol}{Math.round(dept.value).toLocaleString()}</Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <View style={{ width: `${percent}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No department data</Text>
                )}
              </View>
            )}

            {/* Payroll Component Breakdown Section */}
            {analytics && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Payroll Component Breakdown</Text>
                </View>
                {analytics.breakdown?.length > 0 ? (
                  analytics.breakdown.sort((a: any, b: any) => b.value - a.value).slice(0, 8).map((comp: any, idx: number) => {
                    const colors = ['#3b82f6', '#14b8a6', '#f97316', '#a855f7', '#ec4899', '#6366f1', '#10b981', '#f43f5e'];
                    const color = colors[idx % colors.length];
                    const isDeduction = comp.type === 'deduction';
                    return (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{comp.name}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>{comp.type}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: isDeduction ? '#ef4444' : '#10b981' }}>
                          {isDeduction ? '-' : '+'}{currencySymbol}{Math.round(comp.value).toLocaleString()}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No component data</Text>
                )}
              </View>
            )}

            {/* Recent Batches */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Batches</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PayrollHistory')}>
                  <ExternalLink size={16} color="#4f46e5" />
                </TouchableOpacity>
              </View>
              {history.length > 0 ? history.map((run, i) => (
                <View key={i} style={styles.batchRow}>
                  <View>
                    <Text style={styles.batchMonth}>{months[run.month - 1]} {run.year}</Text>
                    <Text style={styles.batchCount}>{run.totalEmployees} employees</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.batchTotal}>{currencySymbol}{run.totalNet?.toLocaleString()}</Text>
                    <Text style={styles.batchStatus}>{run.status}</Text>
                  </View>
                </View>
              )) : (
                <Text style={styles.emptyText}>No recent payroll history found</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: moderateScale(16) },
  headerControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: moderateScale(10), borderRadius: moderateScale(12), borderWidth: 1, borderColor: '#e2e8f0' },
  dateText: { fontSize: moderateScale(14), fontWeight: '600', color: '#1e293b' },
  runBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingVertical: verticalScale(10), paddingHorizontal: scale(16), borderRadius: moderateScale(12), gap: moderateScale(6) },
  runBtnText: { color: '#fff', fontSize: moderateScale(14), fontWeight: '700' },
  content: { gap: moderateScale(16), paddingBottom: verticalScale(40) },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(12) },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: moderateScale(16), borderRadius: moderateScale(16), borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: moderateScale(12) },
  kpiIconBox: { width: scale(40), height: verticalScale(40), borderRadius: moderateScale(10), justifyContent: 'center', alignItems: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: moderateScale(10), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  kpiValue: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a', marginTop: verticalScale(2) },
  card: { backgroundColor: '#fff', borderRadius: moderateScale(20), padding: moderateScale(20), borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  cardTitle: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a' },
  statusBadge: { backgroundColor: '#eef2ff', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: moderateScale(6) },
  statusBadgeText: { fontSize: moderateScale(10), fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase' },
  statusBox: { backgroundColor: '#f8fafc', padding: moderateScale(12), borderRadius: moderateScale(12), marginBottom: verticalScale(12), borderWidth: 1, borderColor: '#f1f5f9' },
  statusLabel: { fontSize: moderateScale(11), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  statusValue: { fontSize: moderateScale(14), fontWeight: '700', color: '#334155', marginTop: verticalScale(4) },
  statsRow: { flexDirection: 'row', gap: moderateScale(12) },
  statBox: { flex: 1, backgroundColor: '#eef2ff', padding: moderateScale(12), borderRadius: moderateScale(12), borderWidth: 1, borderColor: '#e0e7ff', alignItems: 'center' },
  statLabel: { fontSize: moderateScale(10), fontWeight: '800', color: '#6366f1', textTransform: 'uppercase' },
  statValue: { fontSize: moderateScale(20), fontWeight: '800', marginTop: verticalScale(4) },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  alertLabel: { fontSize: moderateScale(13), fontWeight: '600', color: '#475569' },
  alertCount: { backgroundColor: '#ecfdf5', paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: moderateScale(4) },
  alertCountText: { fontSize: moderateScale(11), fontWeight: '800', color: '#10b981' },
  alertCountDanger: { backgroundColor: '#fef2f2' },
  alertCountTextDanger: { color: '#ef4444' },
  batchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  batchMonth: { fontSize: moderateScale(14), fontWeight: '700', color: '#0f172a' },
  batchCount: { fontSize: moderateScale(12), color: '#64748b', marginTop: verticalScale(2) },
  batchTotal: { fontSize: moderateScale(14), fontWeight: '700', color: '#0f172a' },
  batchStatus: { fontSize: moderateScale(11), fontWeight: '600', color: '#64748b', marginTop: verticalScale(2) },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: verticalScale(20) }
});
