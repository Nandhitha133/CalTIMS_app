import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import {
  Wallet,
  Calculator,
  TrendingUp,
  TrendingDown,
  Building2,
  Activity,
  Download,
  FileSpreadsheet,
  Printer,
  CalendarDays,
  BarChart3,
  AlertCircle,
  CheckCircle2
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { exportFile, convertToCSV } from '../../utils/exportHelper';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function PayrollReports() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [timeRange, setTimeRange] = useState(6);
  const [selectedMetric, setSelectedMetric] = useState<'grossPay' | 'netPay' | 'employees'>('netPay');
  const [tableFilter, setTableFilter] = useState('All');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [histRes, settRes]: any[] = await Promise.all([
        payrollAPI.getHistory(),
        settingsAPI.getSettings()
      ]);

      if (histRes?.success) setHistory(histRes.data);
      if (settRes?.success) setSettings(settRes.data);
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  const safe = (val: any) => Number(val || 0);

  const processedData = useMemo(() => {
    if (!history || history.length === 0) return { trends: [], depts: [], summary: {} as any };

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

    history.forEach((p: any) => {
      const key = `${p.year}-${p.month}`;
      if (!monthMap[key]) monthMap[key] = { grossPay: 0, netPay: 0, deductions: 0, employees: new Set() };
      monthMap[key].grossPay += safe(p.grossYield || p.breakdown?.grossPay || p.breakdown?.earnings?.grossEarnings);
      monthMap[key].netPay += safe(p.netPay || p.breakdown?.netPay);
      monthMap[key].deductions += safe(p.liability || p.breakdown?.totalDeductions || p.breakdown?.deductions?.totalDeductions);
      monthMap[key].employees.add(p.employeeId || p.userId || p.user?._id || p.user);
    });

    const trends = allMonths.map(m => {
      const data = monthMap[m.key] || { grossPay: 0, netPay: 0, deductions: 0, employees: new Set() };
      return {
        name: m.label,
        grossPay: data.grossPay,
        netPay: data.netPay,
        deductions: data.deductions,
        employees: data.employees.size,
        value: selectedMetric === 'employees' ? data.employees.size : data[selectedMetric] || 0
      };
    });

    const depts: any = history.reduce((acc: any, p: any) => {
      const d = p.employeeInfo?.department || p.employee?.department?.name || p.user?.department || 'Operations';
      acc[d] = (acc[d] || 0) + safe(p.grossYield || p.breakdown?.grossPay || p.breakdown?.earnings?.grossEarnings);
      return acc;
    }, {});

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const deptList = Object.entries(depts).map(([name, value], i) => ({
      name,
      value: value as number,
      color: colors[i % colors.length]
    }));

    const sortedMonths = Object.keys(monthMap).sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y2 - y1 || m2 - m1;
    });

    const latestMonthKey = sortedMonths[0];
    const prevMonthKey = sortedMonths[1];

    const curr = monthMap[latestMonthKey] || { grossPay: 0, netPay: 0, deductions: 0, employees: new Set() };
    const prev = monthMap[prevMonthKey] || { grossPay: 0, netPay: 0 };

    const growth = prev.grossPay > 0 ? ((curr.grossPay - prev.grossPay) / prev.grossPay) * 100 : 0;
    const highDept = deptList.sort((a, b) => b.value - a.value)[0]?.name || 'N/A';
    const netGrossRatio = curr.grossPay > 0 ? (curr.netPay / curr.grossPay) * 100 : 0;

    const [lYear, lMonth] = (latestMonthKey || "").split('-').map(Number);
    const anomalies = history.filter((h: any) =>
      h.month === lMonth &&
      h.year === lYear &&
      ((safe(h.breakdown?.deductions?.totalDeductions) > safe(h.breakdown?.earnings?.grossEarnings) * 0.3) || safe(h.breakdown?.netPay) === 0)
    );

    const insights = [
      { title: "Efficiency", icon: Activity, color: "#6366f1", bg: "#eef2ff", message: `Net vs Gross ratio is ${netGrossRatio.toFixed(2)}%` },
      { title: "Growth", icon: growth >= 0 ? TrendingUp : TrendingDown, color: growth >= 0 ? "#10b981" : "#f43f5e", bg: growth >= 0 ? "#ecfdf5" : "#fff1f2", message: `Payroll ${growth >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growth).toFixed(2)}%` },
      { title: "Anomalies", icon: anomalies.length > 0 ? AlertCircle : CheckCircle2, color: anomalies.length > 0 ? "#f43f5e" : "#10b981", bg: anomalies.length > 0 ? "#fff1f2" : "#ecfdf5", message: anomalies.length > 0 ? `${anomalies.length} employees flagged` : "No anomalies detected" }
    ];

    let ytdCost = 0;
    Object.keys(monthMap).forEach(k => {
      if (k.startsWith(String(lYear))) {
        ytdCost += monthMap[k].grossPay;
      }
    });

    return {
      trends,
      depts: deptList,
      insights,
      summary: {
        totalCost: curr.grossPay,
        ytdCost,
        avgCost: curr.employees.size > 0 ? curr.grossPay / curr.employees.size : 0,
        growth,
        highDept,
        netGrossRatio,
        employeeCount: curr.employees.size
      }
    };
  }, [history, timeRange, selectedMetric]);

  const filteredTableData = useMemo(() => {
    if (!history) return [];
    let data = history.filter(h => h.month === (new Date().getMonth() + 1) && h.year === new Date().getFullYear());
    if (tableFilter !== 'All') {
      data = data.filter(h => (h.employeeInfo?.department || h.user?.department) === tableFilter);
    }
    return data;
  }, [history, tableFilter]);

  const downloadReport = async (type: string) => {
    try {
      setExporting(true);
      const d = new Date();
      if (type === 'Summary') {
        const response: any = await payrollAPI.getSummaryReport({ month: d.getMonth() + 1, year: d.getFullYear() });
        const summary = response?.data || response || {};

        const headers = ['Total Employees', 'Total Gross', 'Total Deductions', 'Total Net Pay', 'Total LOP Days'];
        const rows = [[
          summary.totalEmployees || 0,
          summary.totalGross || 0,
          summary.totalDeductions || 0,
          summary.totalNetPay || 0,
          summary.totalLopDays || 0
        ]];

        const csvString = convertToCSV(headers, rows);
        await exportFile(csvString, `Executive_Summary_${d.getFullYear()}_${d.getMonth() + 1}.csv`, 'text/csv', false);

      } else if (type === 'DeptAnalysis') {
        const response: any = await payrollAPI.getDepartmentAnalysis({ month: d.getMonth() + 1, year: d.getFullYear() });
        const data = response?.data || response || [];

        const headers = ['Department', 'Employee Count', 'Total Gross', 'Total Deductions', 'Total Net'];
        const rows = data.map((row: any) => [
          row.department || 'Unassigned',
          row.employeeCount || 0,
          row.totalGross || 0,
          row.totalDeductions || 0,
          row.totalNet || 0
        ]);

        const csvString = convertToCSV(headers, rows);
        await exportFile(csvString, `Department_Analysis_${d.getFullYear()}_${d.getMonth() + 1}.csv`, 'text/csv', false);

      } else if (type === 'Export') {
        const response: any = await payrollAPI.getHistory({ month: d.getMonth() + 1, year: d.getFullYear() });
        const records = response?.data || response || [];

        const headers = ['Employee Name', 'Employee ID', 'Department', 'Gross Earnings', 'Deductions', 'Net Payout'];
        const rows = records.map((row: any) => [
          row.user?.name || row.employeeInfo?.name || 'Unknown',
          row.user?.employeeId || row.employeeInfo?.employeeId || '-',
          row.user?.department || row.employeeInfo?.department || 'Unassigned',
          safe(row.grossYield || row.breakdown?.grossPay || row.breakdown?.earnings?.grossEarnings),
          safe(row.liability || row.breakdown?.totalDeductions || row.breakdown?.deductions?.totalDeductions),
          safe(row.netPay || row.breakdown?.netPay)
        ]);

        const csvString = convertToCSV(headers, rows);
        await exportFile(csvString, `Payroll_Ledger_${d.getFullYear()}_${d.getMonth() + 1}.csv`, 'text/csv', false);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download report');
    } finally {
      setExporting(false);
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const renderKPIs = () => {
    const kpis = [
      { label: 'Total Payroll Cost', value: `${currencySymbol}${Math.round(processedData.summary.totalCost || 0).toLocaleString()}`, sub: 'Current Month Gross', icon: Wallet, color: '#4f46e5', bg: '#eef2ff' },
      { label: 'YTD Cost (Yield)', value: `${currencySymbol}${Math.round(processedData.summary.ytdCost || 0).toLocaleString()}`, sub: 'Annual Expenditure', icon: Calculator, color: '#2563eb', bg: '#eff6ff' },
      { label: 'Growth rate', value: `${(processedData.summary.growth || 0).toFixed(1)}%`, sub: (processedData.summary.growth || 0) >= 0 ? 'Increase vs Prev Month' : 'Decrease vs Prev Month', icon: (processedData.summary.growth || 0) >= 0 ? TrendingUp : TrendingDown, color: (processedData.summary.growth || 0) >= 0 ? '#059669' : '#e11d48', bg: (processedData.summary.growth || 0) >= 0 ? '#ecfdf5' : '#fff1f2' },
      { label: 'Top Department', value: processedData.summary.highDept || 'N/A', sub: 'Highest Expenditure', icon: Building2, color: '#d97706', bg: '#fffbeb' },
      { label: 'Net/Gross Ratio', value: `${(processedData.summary.netGrossRatio || 0).toFixed(1)}%`, sub: 'Efficiency Index', icon: Activity, color: '#7c3aed', bg: '#f5f3ff' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
        {kpis.map((kpi, i) => (
          <View key={i} style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: kpi.bg }]}>
              <kpi.icon size={20} color={kpi.color} />
            </View>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={styles.kpiSub}>{kpi.sub}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderTrendChart = () => {
    if (!processedData.trends.length) return null;

    const labels = processedData.trends.map((t: any) => t.name.split(' ')[0]);
    const data = processedData.trends.map((t: any) => t.value || 0);

    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
      style: { borderRadius: 16 },
      propsForDots: { r: '4', strokeWidth: '2', stroke: '#4f46e5' },
      propsForBackgroundLines: { strokeDasharray: '', stroke: '#f1f5f9' },
    };

    return (
      <View style={styles.card}>
        <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }]}>
          <View style={{ flexShrink: 1, paddingRight: 8, minWidth: 200 }}>
            <Text style={styles.cardTitle}>Financial Performance Trend</Text>
            <Text style={styles.cardSubtitle}>Historical analysis of {selectedMetric} over {timeRange} months</Text>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2, flexShrink: 0 }}>
            {['line', 'area', 'bar'].map(type => (
              <TouchableOpacity
                key={type}
                style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: chartType === type ? '#fff' : 'transparent' }}
                onPress={() => setChartType(type as any)}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: chartType === type ? '#4f46e5' : '#64748b', textTransform: 'uppercase' }}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          {chartType === 'bar' ? (
            <BarChart
              data={{ labels, datasets: [{ data: data.length ? data : [0] }] }}
              width={width - 80}
              height={220}
              yAxisLabel={currencySymbol}
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={{ borderRadius: 16 }}
              showValuesOnTopOfBars={false}
            />
          ) : (
            <LineChart
              data={{ labels, datasets: [{ data: data.length ? data : [0] }] }}
              width={width - 80}
              height={220}
              chartConfig={chartConfig}
              bezier={chartType === 'area'}
              withShadow={chartType === 'area'}
              style={{ borderRadius: 16 }}
            />
          )}
        </View>
      </View>
    );
  };

  const renderDeptCost = () => {
    if (!processedData.depts.length) return null;

    const chartData = processedData.depts.map((d: any) => ({
      name: d.name,
      population: d.value,
      color: d.color,
      legendFontColor: '#334155',
      legendFontSize: 11
    }));

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Cost by Department</Text>
            <Text style={styles.cardSubtitle}>Organization-wide distribution</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <PieChart
            data={chartData}
            width={width - 72}
            height={200}
            chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
          />
        </View>
      </View>
    );
  };

  const renderInsightsAndLedger = () => {
    return (
      <>
        {/* Monthly Insights */}
        <View style={[styles.card, { backgroundColor: '#0f172a' }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: '#6366f1' }]}>Advanced Analytics</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff', marginTop: 4 }}>Monthly Insights</Text>
            </View>
          </View>
          <View style={{ gap: 12 }}>
            {(processedData.insights || []).map((insight: any, idx: number) => (
              <View key={idx} style={{ padding: 16, backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ padding: 6, backgroundColor: insight.bg, borderRadius: 8, marginRight: 8, opacity: 0.9 }}>
                    <insight.icon size={16} color={insight.color} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{insight.title}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#f8fafc' }}>{insight.message}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Detailed Transactional Ledger */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View>
              <Text style={styles.cardTitle}>Detail Transactional Ledger</Text>
              <Text style={styles.cardSubtitle}>Filtering: {tableFilter === 'All' ? 'Complete Organization' : tableFilter}</Text>
            </View>
            {tableFilter !== 'All' && (
              <TouchableOpacity onPress={() => setTableFilter('All')}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 12 }}>
            {filteredTableData.length > 0 ? filteredTableData.slice(0, 10).map((h: any, i: number) => (
              <View key={i} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>{h.user?.name || h.employeeInfo?.name || 'Unknown'}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{h.user?.employeeId || h.employeeInfo?.employeeId}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f1f5f9', borderRadius: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>{h.user?.department || h.employeeInfo?.department || 'Unassigned'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Gross</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{currencySymbol}{Math.round(safe(h.grossYield || h.breakdown?.grossPay || h.breakdown?.earnings?.grossEarnings)).toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Deductions</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#f43f5e' }}>-{currencySymbol}{Math.round(safe(h.liability || h.breakdown?.totalDeductions || h.breakdown?.deductions?.totalDeductions)).toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>Net Payout</Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>{currencySymbol}{Math.round(safe(h.netPay || h.breakdown?.netPay)).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8' }}>No data records found</Text>
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  return (
    <Layout title="Payroll Analytics" user={user} refreshing={loading} onRefresh={fetchData} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <View style={styles.container}>

        {/* Controls Section */}
        <View style={styles.controlsRow}>
          <View style={styles.metricTabs}>
            {[
              { id: 'grossPay', label: 'Gross' },
              { id: 'netPay', label: 'Net' },
              { id: 'employees', label: 'Staff' }
            ].map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.metricTab, selectedMetric === m.id && styles.metricTabActive]}
                onPress={() => setSelectedMetric(m.id as any)}
              >
                <Text style={[styles.metricTabText, selectedMetric === m.id && styles.metricTabTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionsBox}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => downloadReport('Summary')}
              disabled={exporting}
            >
              <Printer size={16} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => downloadReport('Export')}
              disabled={exporting}
            >
              <FileSpreadsheet size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {loading && !history.length ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 100 }} />
        ) : (
          <>
            {renderKPIs()}
            {renderTrendChart()}
            {renderDeptCost()}
            {renderInsightsAndLedger()}

            {/* Report Archive Extraction */}
            <View style={[styles.card, { marginTop: 8 }]}>
              <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                    <Printer size={20} color="#475569" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>Report Archive Extraction</Text>
                    <Text style={styles.cardSubtitle}>Generate point-in-time compliance artifacts</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}
                  onPress={() => downloadReport('DeptAnalysis')}
                >
                  <BarChart3 size={20} color="#64748b" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Department Spend Analysis</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}
                  onPress={() => downloadReport('Export')}
                >
                  <FileSpreadsheet size={20} color="#64748b" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Detailed Payroll Ledger (CSV, PDF)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  metricTabs: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4 },
  metricTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  metricTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  metricTabText: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  metricTabTextActive: { color: '#4f46e5' },
  actionsBox: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  actionBtnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },

  kpiScroll: { paddingBottom: 24, gap: 16 },
  kpiCard: { width: 160, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  kpiIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  kpiSub: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { marginBottom: 24 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSubtitle: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 4, textTransform: 'uppercase' },

  chartContainer: { height: 200, width: '100%', marginTop: 8 },
  barsWrapper: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20 },
  barColumn: { alignItems: 'center', width: `${100 / 6}%` },
  barTrack: { height: 140, width: 24, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 12 },
  barLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 12, textTransform: 'uppercase' },

  deptList: { gap: 16 },
  deptRow: { marginBottom: 4 },
  deptInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  deptName: { fontSize: 12, fontWeight: '700', color: '#334155' },
  deptValue: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  deptProgressTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  deptProgressFill: { height: '100%', borderRadius: 4 },
});
