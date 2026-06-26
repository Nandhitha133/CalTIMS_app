import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import {
  Wallet,
  CreditCard,
  TrendingDown,
  Users,
  Play,
  AlertCircle,
  ExternalLink,
  Calendar,
  ChevronDown,
  CheckCircle2,
  X
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const [fullHistory, setFullHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState(6);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [trendTooltip, setTrendTooltip] = useState<{ visible: boolean, x: number, y: number, index: number } | null>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchData();
    }, [selectedMonth, selectedYear, timeRange])
  );

  useEffect(() => {
    setTrendTooltip(null);
  }, [timeRange, chartType]);

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

      const [dashRes, histRes, analyticsRes, fullHistRes]: any[] = await Promise.all([
        payrollAPI.getDashboard({ month: selectedMonth, year: selectedYear }),
        payrollAPI.getBatches(),
        payrollAPI.getAnalytics({ month: selectedMonth, year: selectedYear, department: 'All' }),
        payrollAPI.getHistory()
      ]);

      if (dashRes?.success) setDash(dashRes.data);
      if (histRes?.success) setHistory(histRes.data.slice(0, 5));
      if (analyticsRes?.success) setAnalytics(analyticsRes.data);
      if (fullHistRes?.success) setFullHistory(fullHistRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const safe = (val: any) => Number(val || 0);

  const processedTrends = useMemo(() => {
    if (!fullHistory || fullHistory.length === 0) return [];

    const monthMap: any = {};
    const allMonths = [];
    const now = new Date();
    for (let i = 0; i < timeRange; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      allMonths.push({
        key,
        label: `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`,
        month: d.getMonth() + 1,
        year: d.getFullYear()
      });
    }
    allMonths.reverse();

    fullHistory.forEach((p: any) => {
      const key = `${p.year}-${p.month}`;
      if (!monthMap[key]) monthMap[key] = { grossPay: 0, netPay: 0 };
      monthMap[key].grossPay += safe(p.grossYield || p.breakdown?.grossPay || p.breakdown?.earnings?.grossEarnings);
      monthMap[key].netPay += safe(p.netPay || p.breakdown?.netPay);
    });

    return allMonths.map(m => {
      const data = monthMap[m.key] || { grossPay: 0, netPay: 0 };
      return {
        name: m.label,
        grossPay: data.grossPay,
        netPay: data.netPay,
      };
    });
  }, [fullHistory, timeRange]);

  const renderKpiCard = (label: string, value: number, Icon: any, color: string, bg: string, isStatic = false) => (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconBox, { backgroundColor: bg }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.kpiContent}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowMonthPicker(true)}>
              <Calendar size={18} color="#4f46e5" style={{ marginRight: 8 }} />
              <Text style={styles.dateText}>{months[selectedMonth - 1].slice(0, 3)}</Text>
              <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowYearPicker(true)}>
              <Text style={styles.dateText}>{selectedYear}</Text>
              <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
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
                  <Text style={[styles.statValue, { color: '#4f46e5' }]} numberOfLines={1} adjustsFontSizeToFit>{dash?.summary?.totalProcessed || 0}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}>
                  <Text style={[styles.statLabel, { color: '#10b981' }]}>Paid</Text>
                  <Text style={[styles.statValue, { color: '#10b981' }]} numberOfLines={1} adjustsFontSizeToFit>{dash?.summary?.totalPaid || 0}</Text>
                </View>
              </View>
            </View>

            {/* Critical Alerts */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <AlertCircle size={18} color="#ef4444" />
                <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Critical Alerts</Text>
              </View>
              <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('PayrollProfiles')}>
                <Text style={styles.alertLabel}>Missing Bank Details</Text>
                <View style={[styles.alertCount, dash?.compliance?.missingBankDetails > 0 && styles.alertCountDanger]}>
                  <Text style={[styles.alertCountText, dash?.compliance?.missingBankDetails > 0 && styles.alertCountTextDanger]}>
                    {dash?.compliance?.missingBankDetails || 0}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('PayrollProfiles')}>
                <Text style={styles.alertLabel}>Pending Structures</Text>
                <View style={[styles.alertCount, dash?.compliance?.missingSalaryStructure > 0 && styles.alertCountDanger]}>
                  <Text style={[styles.alertCountText, dash?.compliance?.missingSalaryStructure > 0 && styles.alertCountTextDanger]}>
                    {dash?.compliance?.missingSalaryStructure || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Financial Disbursement */}
            <View style={styles.card}>
              <View style={[styles.cardHeader, { marginBottom: verticalScale(12) }]}>
                <Text style={styles.cardTitle}>Financial Disbursement</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={styles.chartTypeGroup}>
                  {(['line', 'bar', 'pie'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chartTypeTab,
                        chartType === type && styles.chartTypeTabActive
                      ]}
                      onPress={() => setChartType(type)}
                    >
                      <Text
                        style={[
                          styles.chartTypeTabText,
                          chartType === type && styles.chartTypeTabTextActive
                        ]}
                      >
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.timeRangeDropdown}
                  onPress={() => setShowRangeModal(true)}
                >
                  <Text style={styles.timeRangeText}>{timeRange} MONTHS</Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', position: 'relative', width: '100%' }}>
                {chartType === 'bar' ? (
                  <View style={styles.chartContainer}>
                    <View style={styles.barsWrapper}>
                      {processedTrends.map((t: any, index: number) => {
                        const val = t.netPay || 0;
                        const maxVal = Math.max(...processedTrends.map((item: any) => item.netPay || 0), 1);
                        const fillHeight = `${(val / maxVal) * 100}%` as any;
                        return (
                          <TouchableOpacity
                            key={index}
                            style={styles.barColumn}
                            activeOpacity={0.7}
                            onPress={() => {
                              setTrendTooltip({
                                visible: true,
                                x: (Dimensions.get('window').width - 80) * (index + 0.5) / processedTrends.length,
                                y: 100,
                                index: index,
                              });
                            }}
                          >
                            <View style={styles.barTrack}>
                              <View style={[styles.barFill, { height: fillHeight, backgroundColor: '#4f46e5' }]} />
                            </View>
                            <Text style={styles.barLabel}>{t.name.split(' ')[0]}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : chartType === 'pie' ? (
                  <PieChart
                    data={[
                      {
                        name: 'Gross',
                        population: processedTrends.reduce((sum, t) => sum + t.grossPay, 0),
                        color: '#6366f1',
                        legendFontColor: '#334155',
                        legendFontSize: 11
                      },
                      {
                        name: 'Net Pay',
                        population: processedTrends.reduce((sum, t) => sum + t.netPay, 0),
                        color: '#10b981',
                        legendFontColor: '#334155',
                        legendFontSize: 11
                      }
                    ]}
                    width={Dimensions.get('window').width - 72}
                    height={200}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    hasLegend={true}
                    absolute={true}
                  />
                ) : (
                  <LineChart
                    data={{
                      labels: processedTrends.map((t: any) => t.name.split(' ')[0]),
                      datasets: [{ data: processedTrends.length ? processedTrends.map((t: any) => t.netPay || 0) : [0] }]
                    }}
                    width={Dimensions.get('window').width - 72}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                      style: { borderRadius: 16 },
                      propsForDots: { r: '4', strokeWidth: '2', stroke: '#4f46e5' },
                      propsForBackgroundLines: { strokeDasharray: '', stroke: '#f1f5f9' },
                    }}
                    bezier={false}
                    style={{ borderRadius: 16 }}
                    withHorizontalLabels={false}
                    onDataPointClick={(clickData) => {
                      setTrendTooltip({
                        visible: true,
                        x: clickData.x,
                        y: clickData.y,
                        index: clickData.index,
                      });
                    }}
                  />
                )}
                {trendTooltip?.visible && processedTrends[trendTooltip.index] && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setTrendTooltip(null)}
                    style={{
                      position: 'absolute',
                      left: Math.max(10, Math.min(trendTooltip.x - 60, Dimensions.get('window').width - 80 - 130)),
                      top: Math.max(10, trendTooltip.y - 80),
                      backgroundColor: 'white',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 24,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 5,
                      borderWidth: 1,
                      borderColor: '#f1f5f9',
                      zIndex: 100,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 4 }}>
                      {processedTrends[trendTooltip.index].name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#4f46e5', fontWeight: '800' }}>
                      Net Pay: {currencySymbol}{processedTrends[trendTooltip.index].netPay.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Analytics Section */}
            {analytics && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Cost by Department</Text>
                </View>
                {analytics.departmentDistribution?.length > 0 ? (
                  <View style={{ position: 'relative', height: 200, width: '100%', justifyContent: 'center' }}>
                    <PieChart
                      data={analytics.departmentDistribution.map((dept: any, idx: number) => {
                        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                        return {
                          name: dept.name,
                          population: dept.value,
                          color: colors[idx % colors.length],
                          legendFontColor: '#334155',
                          legendFontSize: 11
                        };
                      })}
                      width={Dimensions.get('window').width - 72}
                      height={200}
                      chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"10"}
                      hasLegend={true}
                    />
                    <View style={{
                      position: 'absolute',
                      left: ((Dimensions.get('window').width - 72) / 4) + 10 - 35,
                      top: 100 - 35,
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3
                    }}>
                      <Text style={{ fontSize: 8, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>TOTAL</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', marginTop: 1 }}>
                        {currencySymbol}{Math.round(dash?.summary?.totalPayroll || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No department data</Text>
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
                    <Text style={[
                      styles.batchTotal,
                      run.status?.toLowerCase() === 'paid' ? { color: '#10b981' } :
                        run.status?.toLowerCase() === 'completed' ? { color: '#3b82f6' } : {}
                    ]}>
                      {currencySymbol}{run.totalNet?.toLocaleString()}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { marginTop: 4 },
                      run.status?.toLowerCase() === 'paid' ? { backgroundColor: '#ecfdf5' } :
                        run.status?.toLowerCase() === 'completed' ? { backgroundColor: '#eff6ff' } :
                          run.status?.toLowerCase() === 'processing' ? { backgroundColor: '#eef2ff' } :
                            { backgroundColor: '#fef2f2' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        run.status?.toLowerCase() === 'paid' ? { color: '#10b981' } :
                          run.status?.toLowerCase() === 'completed' ? { color: '#3b82f6' } :
                            run.status?.toLowerCase() === 'processing' ? { color: '#4f46e5' } :
                              { color: '#ef4444' }
                      ]}>{run.status}</Text>
                    </View>
                  </View>
                </View>
              )) : (
                <Text style={styles.emptyText}>No recent payroll history found</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="fade">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, width: '80%', maxHeight: '60%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>Select Month</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {months.map((mName, i) => {
                const m = i + 1;
                const isSelected = m === selectedMonth;
                return (
                  <TouchableOpacity
                    key={i}
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
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
      </Modal>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} transparent animationType="fade">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, width: '80%', maxHeight: '60%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' }}>Select Year</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = new Date().getFullYear() - i;
                const isSelected = y === selectedYear;
                return (
                  <TouchableOpacity
                    key={y}
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    onPress={() => { setSelectedYear(y); setShowYearPicker(false); }}
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
      </Modal>
      {/* Range Picker Modal */}
      <Modal visible={showRangeModal} transparent animationType="fade" onRequestClose={() => setShowRangeModal(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowRangeModal(false)}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitleText}>Select Time Range</Text>
              <TouchableOpacity onPress={() => setShowRangeModal(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            {[
              { label: '3 Months', value: 3 },
              { label: '6 Months', value: 6 },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  timeRange === option.value && styles.pickerOptionActive
                ]}
                onPress={() => {
                  setTimeRange(option.value);
                  setShowRangeModal(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    timeRange === option.value && styles.pickerOptionTextActive
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: scale(16) },
  headerControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: scale(10), borderRadius: scale(12), borderWidth: 1, borderColor: '#e2e8f0' },
  dateText: { fontSize: moderateScale(14), fontWeight: '600', color: '#1e293b' },
  runBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingVertical: verticalScale(10), paddingHorizontal: scale(16), borderRadius: scale(12), gap: scale(6) },
  runBtnText: { color: '#fff', fontSize: moderateScale(14), fontWeight: '700' },
  content: { gap: scale(16), paddingBottom: verticalScale(40) },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12) },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: scale(16), borderRadius: scale(16), borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  kpiIconBox: { width: scale(40), height: verticalScale(40), borderRadius: scale(10), justifyContent: 'center', alignItems: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: moderateScale(10), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  kpiValue: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a', marginTop: verticalScale(2) },
  card: { backgroundColor: '#fff', borderRadius: scale(20), padding: scale(20), borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  cardTitle: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a' },
  statusBadge: { backgroundColor: '#eef2ff', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(6) },
  statusBadgeText: { fontSize: moderateScale(10), fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase' },
  statusBox: { backgroundColor: '#f8fafc', padding: scale(12), borderRadius: scale(12), marginBottom: verticalScale(12), borderWidth: 1, borderColor: '#f1f5f9' },
  statusLabel: { fontSize: moderateScale(11), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  statusValue: { fontSize: moderateScale(14), fontWeight: '700', color: '#334155', marginTop: verticalScale(4) },
  statsRow: { flexDirection: 'row', gap: scale(12) },
  statBox: { flex: 1, backgroundColor: '#eef2ff', padding: scale(12), borderRadius: scale(12), borderWidth: 1, borderColor: '#e0e7ff', alignItems: 'center' },
  statLabel: { fontSize: moderateScale(10), fontWeight: '800', color: '#6366f1', textTransform: 'uppercase' },
  statValue: { fontSize: moderateScale(20), fontWeight: '800', marginTop: verticalScale(4) },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  alertLabel: { fontSize: moderateScale(13), fontWeight: '600', color: '#475569' },
  alertCount: { backgroundColor: '#ecfdf5', paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(4) },
  alertCountText: { fontSize: moderateScale(11), fontWeight: '800', color: '#10b981' },
  alertCountDanger: { backgroundColor: '#fef2f2' },
  alertCountTextDanger: { color: '#ef4444' },
  batchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  batchMonth: { fontSize: moderateScale(14), fontWeight: '700', color: '#0f172a' },
  batchCount: { fontSize: moderateScale(12), color: '#64748b', marginTop: verticalScale(2) },
  batchTotal: { fontSize: moderateScale(14), fontWeight: '700', color: '#0f172a' },
  batchStatus: { fontSize: moderateScale(11), fontWeight: '600', color: '#64748b', marginTop: verticalScale(2) },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: verticalScale(20) },

  chartTypeGroup: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: scale(20), padding: scale(3) },
  chartTypeTab: { paddingHorizontal: scale(16), paddingVertical: verticalScale(6), borderRadius: scale(18) },
  chartTypeTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(1) }, shadowOpacity: 0.1, shadowRadius: scale(2), elevation: 2 },
  chartTypeTabText: { fontSize: moderateScale(11), fontWeight: '700', color: '#64748b' },
  chartTypeTabTextActive: { color: '#0f172a' },
  timeRangeDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(20), borderWidth: 1, borderColor: '#e2e8f0', gap: scale(6) },
  timeRangeText: { fontSize: moderateScale(11), fontWeight: '800', color: '#64748b' },
  chartContainer: { height: verticalScale(200), width: '100%', marginTop: verticalScale(8) },
  barsWrapper: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: verticalScale(20) },
  barColumn: { alignItems: 'center', width: `${100 / 6}%` },
  barTrack: { height: verticalScale(140), width: scale(24), backgroundColor: '#f1f5f9', borderRadius: scale(12), justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: scale(12) },
  barLabel: { fontSize: moderateScale(10), fontWeight: '700', color: '#64748b', marginTop: verticalScale(12), textTransform: 'uppercase' },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: '#fff', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(20), paddingBottom: verticalScale(30) },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(20), borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: verticalScale(12) },
  pickerTitleText: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a' },
  pickerOption: { paddingVertical: verticalScale(14), paddingHorizontal: scale(16), borderRadius: scale(12), marginBottom: verticalScale(8), flexDirection: 'row', alignItems: 'center' },
  pickerOptionActive: { backgroundColor: '#f1f5f9' },
  pickerOptionText: { fontSize: moderateScale(14), fontWeight: '700', color: '#475569' },
  pickerOptionTextActive: { color: '#4f46e5', fontWeight: '800' }
});
