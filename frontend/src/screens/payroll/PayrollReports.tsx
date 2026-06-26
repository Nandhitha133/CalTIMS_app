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
  Modal
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
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  X
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { exportFile, convertToCSV } from '../../utils/exportHelper';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

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
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>('line');
  const [trendTooltip, setTrendTooltip] = useState<{ visible: boolean, x: number, y: number, index: number } | null>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setTrendTooltip(null);
  }, [selectedMetric, timeRange, chartType]);

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

    // Only include records within the selected time range (same window as trend chart)
    const validMonthKeys = new Set(allMonths.map((m: any) => m.key));
    const rangedHistory = history.filter((p: any) => validMonthKeys.has(`${p.year}-${p.month}`));

    const depts: any = rangedHistory.reduce((acc: any, p: any) => {
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
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{kpi.value}</Text>
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
        <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexShrink: 1, paddingRight: 8 }}>
            <Text style={[styles.cardTitle, { textTransform: 'uppercase' }]}>Financial Performance Trend</Text>
            <Text style={[styles.cardSubtitle, { textTransform: 'uppercase' }]}>
              Historical analysis of {selectedMetric === 'grossPay' ? 'grosspay' : selectedMetric === 'netPay' ? 'netpay' : 'employees'} over {timeRange} months
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 8, position: 'relative', width: '100%' }}>
          {chartType === 'bar' ? (
            <View style={styles.chartContainer}>
              <View style={styles.barsWrapper}>
                {processedData.trends.map((t: any, index: number) => {
                  const val = t.value || 0;
                  const maxVal = Math.max(...processedData.trends.map((item: any) => item.value || 0), 1);
                  const fillHeight = `${(val / maxVal) * 100}%` as any;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.barColumn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setTrendTooltip({
                          visible: true,
                          x: (width - 80) * (index + 0.5) / processedData.trends.length,
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
            <View style={{ justifyContent: 'center', alignItems: 'center', height: 220 }}>
              <PieChart
                data={[
                  {
                    name: 'Gross',
                    population: processedData.trends.reduce((sum: number, t: any) => sum + (t.grossPay || 0), 0),
                    color: '#6366f1',
                    legendFontColor: '#334155',
                    legendFontSize: 11
                  },
                  {
                    name: 'Net Pay',
                    population: processedData.trends.reduce((sum: number, t: any) => sum + (t.netPay || 0), 0),
                    color: '#10b981',
                    legendFontColor: '#334155',
                    legendFontSize: 11
                  }
                ]}
                width={width - 40}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                hasLegend={true}
                absolute={true}
              />
            </View>
          ) : (
            <LineChart
              data={{ labels, datasets: [{ data: data.length ? data : [0] }] }}
              width={width - 80}
              height={220}
              chartConfig={chartConfig}
              bezier={chartType === 'area'}
              withShadow={chartType === 'area'}
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

          {trendTooltip?.visible && processedData.trends[trendTooltip.index] && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setTrendTooltip(null)}
              style={{
                position: 'absolute',
                left: Math.max(10, Math.min(trendTooltip.x - 60, width - 80 - 130)),
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
                {processedData.trends[trendTooltip.index].name}
              </Text>
              <Text style={{ fontSize: 12, color: '#4f46e5', fontWeight: '800' }}>
                {selectedMetric === 'grossPay' ? 'Gross' : selectedMetric === 'netPay' ? 'Net' : 'Staff'} : {selectedMetric !== 'employees' ? currencySymbol : ''}{processedData.trends[trendTooltip.index].value.toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderDeptCost = () => {
    if (!processedData.depts.length) return null;

    const totalDeptCost = processedData.depts.reduce((sum: number, d: any) => sum + d.value, 0);

    const chartData = processedData.depts.map((d: any) => ({
      name: d.name,
      population: d.value,
      color: d.color,
      legendFontColor: '#334155',
      legendFontSize: 9
    }));

    const formatAmount = (num: number) => {
      return `${currencySymbol}${Math.round(num).toLocaleString('en-IN')}`;
    };

    const chartWidth = width - 72;
    const paddingLeftValue = 10;
    const circleSize = 70;
    const overlayLeft = (chartWidth / 4) + paddingLeftValue - (circleSize / 2);
    const overlayTop = 100 - (circleSize / 2);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Cost by Department</Text>
            <Text style={styles.cardSubtitle}>Organization-wide distribution</Text>
          </View>
        </View>

        <View style={{ position: 'relative', height: 200, width: '100%', justifyContent: 'center' }}>
          <PieChart
            data={chartData}
            width={chartWidth}
            height={200}
            chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={paddingLeftValue.toString()}
            hasLegend={true}
          />
          {/* Inner circle overlay centered on the left-aligned pie circle */}
          <View style={{
            position: 'absolute',
            left: overlayLeft,
            top: overlayTop,
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}>
            <Text style={{ fontSize: 8, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>TOTAL</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', marginTop: 1 }}>
              {formatAmount(totalDeptCost)}
            </Text>
          </View>
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
              <Text style={{ fontSize: moderateScale(18), fontWeight: '900', color: '#ffffff', marginTop: verticalScale(4) }}>Monthly Insights</Text>
            </View>
          </View>
          <View style={{ gap: scale(12) }}>
            {(processedData.insights || []).map((insight: any, idx: number) => (
              <View key={idx} style={{ padding: scale(16), backgroundColor: '#1e293b', borderRadius: scale(16), borderWidth: 1, borderColor: '#334155' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(8) }}>
                  <View style={{ padding: scale(6), backgroundColor: insight.bg, borderRadius: scale(8), marginRight: scale(8), opacity: 0.9 }}>
                    <insight.icon size={16} color={insight.color} />
                  </View>
                  <Text style={{ fontSize: moderateScale(10), fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{insight.title}</Text>
                </View>
                <Text style={{ fontSize: moderateScale(13), fontWeight: '700', color: '#f8fafc' }}>{insight.message}</Text>
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
                <Text style={{ fontSize: moderateScale(10), fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: scale(12) }}>
            {filteredTableData.length > 0 ? filteredTableData.slice(0, 10).map((h: any, i: number) => (
              <View key={i} style={{ paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(8) }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: moderateScale(14), fontWeight: '800', color: '#0f172a' }}>{h.user?.name || h.employeeInfo?.name || 'Unknown'}</Text>
                    <Text style={{ fontSize: moderateScale(10), fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{h.user?.employeeId || h.employeeInfo?.employeeId}</Text>
                  </View>
                  <View style={{ paddingHorizontal: scale(8), paddingVertical: verticalScale(4), backgroundColor: '#f1f5f9', borderRadius: scale(6) }}>
                    <Text style={{ fontSize: moderateScale(9), fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>{h.user?.department || h.employeeInfo?.department || 'Unassigned'}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: moderateScale(9), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: verticalScale(2) }}>Gross</Text>
                    <Text style={{ fontSize: moderateScale(12), fontWeight: '700', color: '#475569' }}>{currencySymbol}{Math.round(safe(h.grossYield || h.breakdown?.grossPay || h.breakdown?.earnings?.grossEarnings)).toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: moderateScale(9), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: verticalScale(2) }}>Deductions</Text>
                    <Text style={{ fontSize: moderateScale(12), fontWeight: '700', color: '#f43f5e' }}>-{currencySymbol}{Math.round(safe(h.liability || h.breakdown?.totalDeductions || h.breakdown?.deductions?.totalDeductions)).toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: moderateScale(9), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: verticalScale(2) }}>Net Payout</Text>
                    <Text style={{ fontSize: moderateScale(13), fontWeight: '900', color: '#0f172a' }}>{currencySymbol}{Math.round(safe(h.netPay || h.breakdown?.netPay)).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )) : (
              <View style={{ padding: scale(20), alignItems: 'center' }}>
                <Text style={{ fontSize: moderateScale(12), fontWeight: '600', color: '#94a3b8' }}>No data records found</Text>
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
        <View style={{ gap: scale(12), marginBottom: verticalScale(16) }}>

          {/* Row 1: Chart Type (Left) & Time Range (Right) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.chartTypeGroup}>
              {(['line', 'bar'] as const).map((type) => (
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

          {/* Row 2: Metric Selector (Left) & Summary Export Button (Right) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.metricGroup}>
              {[
                { id: 'grossPay', label: 'GROSS' },
                { id: 'netPay', label: 'NET' },
                { id: 'employees', label: 'STAFF' }
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.metricTabNew,
                    selectedMetric === m.id && styles.metricTabActiveNew
                  ]}
                  onPress={() => setSelectedMetric(m.id as any)}
                >
                  <Text
                    style={[
                      styles.metricTabTextNew,
                      selectedMetric === m.id && styles.metricTabTextActiveNew
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => downloadReport('Summary')}
              disabled={exporting}
            >
              <Printer size={16} color="#475569" />
              <Text style={{ fontSize: moderateScale(11), fontWeight: '700', color: '#475569', marginLeft: scale(6) }}>SUMMARY</Text>
            </TouchableOpacity>
          </View>

          {/* Row 4: Export CSV Button (Right) */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => downloadReport('Export')}
              disabled={exporting}
            >
              <FileSpreadsheet size={16} color="#fff" />
              <Text style={{ fontSize: moderateScale(11), fontWeight: '700', color: '#fff', marginLeft: scale(6) }}>EXPORT</Text>
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
              <View style={[styles.cardHeader, { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 8, marginRight: 12 }}>
                  <Printer size={20} color="#475569" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2} adjustsFontSizeToFit>Report Archive Extraction</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>Generate point-in-time compliance artifacts</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', marginTop: verticalScale(12), justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#f8fafc', padding: scale(16), borderRadius: scale(12), alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginRight: scale(6) }}
                  onPress={() => downloadReport('DeptAnalysis')}
                >
                  <BarChart3 size={20} color="#64748b" style={{ marginBottom: verticalScale(8) }} />
                  <Text style={{ fontSize: moderateScale(10), fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Department Spend Analysis</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#f8fafc', padding: scale(16), borderRadius: scale(12), alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginLeft: scale(6) }}
                  onPress={() => downloadReport('Export')}
                >
                  <FileSpreadsheet size={20} color="#64748b" style={{ marginBottom: verticalScale(8) }} />
                  <Text style={{ fontSize: moderateScale(10), fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Detailed Payroll Ledger CSV</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

      </View>
      <Modal
        visible={showRangeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRangeModal(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowRangeModal(false)}
        >
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
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: scale(10), marginBottom: verticalScale(16) },
  chartTypeGroup: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: scale(20), padding: scale(3) },
  chartTypeTab: { paddingHorizontal: scale(16), paddingVertical: verticalScale(6), borderRadius: scale(18) },
  chartTypeTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(1) }, shadowOpacity: 0.1, shadowRadius: scale(2), elevation: 2 },
  chartTypeTabText: { fontSize: moderateScale(11), fontWeight: '700', color: '#64748b' },
  chartTypeTabTextActive: { color: '#0f172a' },
  timeRangeDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(20), borderWidth: 1, borderColor: '#e2e8f0', gap: scale(6) },
  timeRangeText: { fontSize: moderateScale(11), fontWeight: '800', color: '#64748b' },
  metricGroup: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: scale(20), padding: scale(3) },
  metricTabNew: { paddingHorizontal: scale(16), paddingVertical: verticalScale(6), borderRadius: scale(18) },
  metricTabActiveNew: { backgroundColor: '#4f46e5', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.2, shadowRadius: scale(4), elevation: 3 },
  metricTabTextNew: { fontSize: moderateScale(11), fontWeight: '700', color: '#64748b' },
  metricTabTextActiveNew: { color: '#fff' },
  actionsBox: { flexDirection: 'row', gap: scale(8) },
  actionBtn: { height: verticalScale(40), paddingHorizontal: scale(16), borderRadius: scale(12), backgroundColor: '#0f172a', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  actionBtnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },

  kpiScroll: { paddingBottom: verticalScale(24), gap: scale(16) },
  kpiCard: { width: scale(160), backgroundColor: '#fff', borderRadius: scale(20), padding: scale(16), borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: scale(4), elevation: 2 },
  kpiIconBox: { width: scale(40), height: verticalScale(40), borderRadius: scale(12), justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(12) },
  kpiLabel: { fontSize: moderateScale(10), fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: verticalScale(4) },
  kpiValue: { fontSize: moderateScale(18), fontWeight: '900', color: '#0f172a', marginBottom: verticalScale(4) },
  kpiSub: { fontSize: moderateScale(9), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },

  card: { backgroundColor: '#fff', borderRadius: scale(24), padding: scale(20), borderWidth: 1, borderColor: '#f1f5f9', marginBottom: verticalScale(20), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.03, shadowRadius: scale(8), elevation: 2 },
  cardHeader: { marginBottom: verticalScale(24) },
  cardTitle: { fontSize: moderateScale(14), fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSubtitle: { fontSize: moderateScale(11), fontWeight: '600', color: '#64748b', marginTop: verticalScale(4), textTransform: 'uppercase' },

  chartContainer: { height: verticalScale(200), width: '100%', marginTop: verticalScale(8) },
  barsWrapper: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: verticalScale(20) },
  barColumn: { alignItems: 'center', width: `${100 / 6}%` },
  barTrack: { height: verticalScale(140), width: scale(24), backgroundColor: '#f1f5f9', borderRadius: scale(12), justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: scale(12) },
  barLabel: { fontSize: moderateScale(10), fontWeight: '700', color: '#64748b', marginTop: verticalScale(12), textTransform: 'uppercase' },

  deptList: { gap: scale(16) },
  deptRow: { marginBottom: verticalScale(4) },
  deptInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(8) },
  deptName: { fontSize: moderateScale(12), fontWeight: '700', color: '#334155' },
  deptValue: { fontSize: moderateScale(12), fontWeight: '800', color: '#0f172a' },
  deptProgressTrack: { height: verticalScale(8), backgroundColor: '#f1f5f9', borderRadius: scale(4), overflow: 'hidden' },
  deptProgressFill: { height: '100%', borderRadius: scale(4) },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: '#fff', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(20), paddingBottom: verticalScale(30) },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(20), borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: verticalScale(12) },
  pickerTitleText: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a' },
  pickerOption: { paddingVertical: verticalScale(14), paddingHorizontal: scale(16), borderRadius: scale(12), marginBottom: verticalScale(8), flexDirection: 'row', alignItems: 'center' },
  pickerOptionActive: { backgroundColor: '#f1f5f9' },
  pickerOptionText: { fontSize: moderateScale(14), fontWeight: '700', color: '#475569' },
  pickerOptionTextActive: { color: '#4f46e5', fontWeight: '800' },
});
