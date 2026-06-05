// screens/payroll/RunPayrollScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
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
  Platform,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Calculator,
  Check,
  X,
  Users,
  DollarSign,
  ShieldAlert,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Clock,
  Activity,
  Send,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  Lock,
  Receipt,
  TrendingUp,
  UserCheck,
  ShieldCheck,
} from 'lucide-react-native';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import { formatCurrency, getCurrencySymbol } from './payrollFormatters';
import { useSocketEvent } from '../../services/socket';
import { useSettingsStore } from '../../store/settingsStore';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import SafeSelector from '../../components/common/SafeSelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#ef4444',
};

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

// Progress Stepper Component
const ProgressStepper = ({ step, setStep }: { step: number; setStep: (step: number) => void }) => (
  <View style={styles.stepperContainer}>
    <View style={styles.stepperTrack}>
      <View style={[styles.stepperProgress, { width: `${((step - 1) / 3) * 100}%` }]} />
    </View>
    <View style={styles.stepperSteps}>
      {[1, 2, 3, 4].map((s) => (
        <TouchableOpacity
          key={s}
          style={styles.stepperStep}
          onPress={() => step >= s && setStep(s)}
          disabled={step < s}
        >
          <View style={[styles.stepperDot, step >= s && styles.stepperDotActive]}>
            {step > s ? (
              <Check size={16} color={COLORS.white} />
            ) : (
              <Text style={[styles.stepperDotText, step >= s && styles.stepperDotTextActive]}>{s}</Text>
            )}
          </View>
          <Text style={[styles.stepperLabel, step >= s && styles.stepperLabelActive]}>
            {s === 1 && 'Period'}
            {s === 2 && 'Readiness'}
            {s === 3 && 'Preview'}
            {s === 4 && 'Execute'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// KPI Card Component
const KPICard = ({ title, value, icon: Icon, color, bgColor }: any) => (
  <View style={[styles.kpiCard, { borderBottomColor: color }]}>
    <View style={[styles.kpiIcon, { backgroundColor: bgColor || `${color}15` }]}>
      <Icon size={20} color={color} />
    </View>
    <View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
    </View>
  </View>
);

// Readiness Card Component
const ReadinessCard = ({ title, value, icon: Icon, color, bgColor, description }: any) => (
  <View style={[styles.readinessCard, { borderBottomColor: color }]}>
    <View style={[styles.readinessIcon, { backgroundColor: bgColor || `${color}15` }]}>
      <Icon size={24} color={color} />
    </View>
    <View>
      <Text style={[styles.readinessValue, { color }]}>{value}</Text>
      <Text style={styles.readinessTitle}>{title}</Text>
      <Text style={styles.readinessDesc}>{description}</Text>
    </View>
  </View>
);

// Employee Row Component
const EmployeeRow = ({ employee, currencySymbol, index, onPress }: any) => {
  const isError = employee.status === 'ERROR';
  return (
    <TouchableOpacity 
      style={[styles.employeeRow, isError && styles.employeeRowError]}
      onPress={onPress}
      disabled={isError}
    >
      <View style={styles.employeeInfo}>
        <View style={[styles.employeeAvatar, isError && styles.employeeAvatarError]}>
          <Text style={[styles.employeeInitial, isError && styles.employeeInitialError]}>
            {employee.name?.charAt(0) || '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeId}>{employee.employeeId}</Text>
        </View>
      </View>

      {isError ? (
        <View style={styles.errorBadge}>
          <AlertCircle size={12} color={COLORS.error} />
          <Text style={styles.errorText}>{employee.error || 'Calculation Failed'}</Text>
        </View>
      ) : (
        <View style={styles.employeeStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Net Pay</Text>
            <Text style={[styles.statValue, { color: COLORS.primary, fontWeight: 'bold' }]}>
              {currencySymbol}{formatCurrency(employee.net || 0)}
            </Text>
          </View>
          <ChevronRight size={16} color={COLORS.gray} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export function PayrollRun({ navigation }: { navigation: any }) {
  const { organization: orgSettings } = useSettingsStore();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeSelector, setActiveSelector] = useState<string | null>(null);
  const [overtimeEnabled, setOvertimeEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPayslips, setIsGeneratingPayslips] = useState(false);
  const [readinessData, setReadinessData] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  const currencySymbol = getCurrencySymbol(orgSettings?.currency || settings?.organization?.currency || 'INR');

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getSettings();
      const data = extractData(response);
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchReadiness = async () => {
    setLoading(true);
    try {
      const response = await payrollAPI.getReadiness({ month, year });
      const dashboardData = extractData(response);
      
      // Map dashboard compliance data to readiness state
      // Use readyEmployees if available from backend, otherwise calculate locally
      const activeCount = dashboardData.summary?.activeEmployees || 0;
      const readyCount = dashboardData.summary?.readyEmployees !== undefined 
        ? dashboardData.summary.readyEmployees 
        : Math.max(0, activeCount - (dashboardData.compliance?.missingSalaryStructure || 0));

      setReadinessData({
        summary: {
          readyCount: readyCount,
          missingProfileCount: dashboardData.compliance?.missingSalaryStructure || 0,
          missingBankCount: dashboardData.compliance?.missingBankDetails || 0
        }
      });
    } catch (error) {
      console.error('Error fetching readiness:', error);
      Alert.alert('Error', 'Failed to fetch readiness data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    setLoading(true);
    try {
      console.log('[PayrollRun] Fetching preview for:', { month, year, overtimeEnabled });
      const response: any = await payrollAPI.getPreview({ month, year, overtimeEnabled });
      
      // Flexible extraction to handle different backend response shapes
      let simulations = [];
      if (Array.isArray(response)) {
        simulations = response;
      } else if (response?.data && Array.isArray(response.data)) {
        simulations = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        simulations = response.data.data;
      } else if (response?.simulations && Array.isArray(response.simulations)) {
        simulations = response.simulations;
      }

      if (simulations.length > 0) {
        // Aggregate simulation results with safety checks for numeric values
        const totalGross = simulations.reduce((acc: number, s: any) => {
          const val = 
            s.breakdown?.summary?.gross || 
            s.breakdown?.grossEarnings || 
            s.breakdown?.totalEarnings || 
            s.breakdown?.grossPay || 
            s.grossYield || 
            s.totalEarnings || 
            s.breakdown?.earnings?.grossEarnings ||
            0;
          return acc + (Number(val) || 0);
        }, 0);

        const totalDeductions = simulations.reduce((acc: number, s: any) => {
          const val = 
            s.breakdown?.summary?.deductions || 
            s.breakdown?.totalDeductions || 
            s.breakdown?.deductions?.totalDeductions || 
            s.liability || 
            s.totalDeductions || 
            0;
          return acc + (Number(val) || 0);
        }, 0);

        const totalNetPay = simulations.reduce((acc: number, s: any) => {
          const val = s.breakdown?.summary?.net || s.breakdown?.netPay || s.breakdown?.netPayout || s.netPay || 0;
          return acc + (Number(val) || 0);
        }, 0);
        
        const aggregatedData = {
          summary: {
            totalEmployees: simulations.length,
            totalGross,
            totalDeductions,
            totalNetPay
          },
          breakdown: simulations.map((s: any) => ({
            name: s.user?.name || 'Unknown Employee',
            employeeId: s.user?.employeeId || 'N/A',
            present: s.attendance?.workedDays || 0,
            totalOrgWorkingDays: s.attendance?.workingDays || s.attendance?.payableDays || 0,
            adjustedGross: s.breakdown?.summary?.gross || s.breakdown?.grossEarnings || s.breakdown?.grossPay || s.grossYield || 0,
            net: s.breakdown?.summary?.net || s.breakdown?.netPay || s.breakdown?.netPayout || s.netPay || 0,
            status: s.error ? 'ERROR' : 'SUCCESS',
            error: s.error,
            // Keep full breakdown for detail view
            earnings: s.breakdown?.earnings?.components || [],
            deductions: s.breakdown?.deductions?.components || [],
            attendance: s.attendance || {}
          }))
        };
        console.log('[PayrollRun] Aggregated Preview:', aggregatedData.summary);
        setPreviewData(aggregatedData);
      } else {
        console.warn('[PayrollRun] No simulations returned from backend');
        setPreviewData({
          summary: { totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNetPay: 0 },
          breakdown: []
        });
      }
    } catch (error: any) {
      console.error('Error fetching preview:', error);
      Alert.alert('Calculation Error', error?.message || 'Failed to aggregate payroll preview data. Please check employee profiles.');
    } finally {
      setLoading(false);
    }
  };

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

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchSettings();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSettings();
    if (step === 2) await fetchReadiness();
    if (step === 3) await fetchPreview();
    setRefreshing(false);
  };

  // Real-time synchronization
  useSocketEvent('PAYROLL_UPDATED', (data) => {
    console.log('[PayrollRun] Real-time update received:', data);
    if (data.organizationId === user?.organizationId) {
      onRefresh();
    }
  });

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
      fetchReadiness();
    } else if (step === 2) {
      if (readinessData?.summary?.readyCount === 0) {
        Alert.alert('Warning', 'No employees are ready for payroll processing');
        return;
      }
      setStep(3);
      fetchPreview();
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleRunPayroll = async () => {
    setIsProcessing(true);
    setSimProgress(0);

    const interval = setInterval(() => {
      setSimProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await payrollAPI.run({ month, year, overtimeEnabled });
      setShowSuccess(true);
      setStep(4);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to process payroll');
    } finally {
      clearInterval(interval);
      setIsProcessing(false);
    }
  };

  const handleGeneratePayslips = async () => {
    setIsGeneratingPayslips(true);
    
    // Simulate generation process as requested by workflow
    setTimeout(() => {
      setIsGeneratingPayslips(false);
      navigation.navigate('PayrollPayslip');
    }, 2000);
  };

  const formatCurrencyValue = (value: number) => {
    return formatCurrency(value);
  };

  if (step === 4 && showSuccess) {
    return (
      <Layout
        title="Payroll Engine"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View style={styles.container}>
          <PageHeader
            title="Payroll Engine"
            subtitle="Guided workforce compensation processing"
            icon={Calculator}
            iconColor={COLORS.primary}
            iconBgColor={`${COLORS.primary}15`}
          />

          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <View style={styles.successCircle}>
                <Check size={48} color={COLORS.white} strokeWidth={3} />
              </View>
              <View style={styles.successBadge}>
                <DollarSign size={20} color={COLORS.white} />
              </View>
            </View>

            <Text style={styles.successTitle}>Payroll Processed!</Text>
            <Text style={styles.successMessage}>
              The payroll for {months[month - 1]} {year} has been calculated and processed successfully. You can now generate payslips for your employees.
            </Text>

            <View style={styles.successButtons}>
              <TouchableOpacity
                style={styles.successButtonSecondary}
                onPress={() => navigation.navigate('PayrollDashboard')}
                disabled={isGeneratingPayslips}
              >
                <Text style={styles.successButtonSecondaryText}>Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.successButtonPrimary, isGeneratingPayslips && { opacity: 0.8 }]}
                onPress={handleGeneratePayslips}
                disabled={isGeneratingPayslips}
              >
                {isGeneratingPayslips ? (
                  <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 8 }} />
                ) : (
                  <Receipt size={16} color={COLORS.white} />
                )}
                <Text style={styles.successButtonPrimaryText}>
                  {isGeneratingPayslips ? 'Generating...' : 'Generate Payslips'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerInfo}>
              <View style={styles.footerItem}>
                <ShieldCheck size={12} color={COLORS.gray} />
                <Text style={styles.footerText}>Secure Trace</Text>
              </View>
              <View style={styles.footerItem}>
                <Lock size={12} color={COLORS.gray} />
                <Text style={styles.footerText}>Encrypted Snapshot</Text>
              </View>
              <View style={styles.footerItem}>
                <BarChart3 size={12} color={COLORS.gray} />
                <Text style={styles.footerText}>Audit Compliant</Text>
              </View>
            </View>
          </View>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title="Payroll Engine"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.container}>
        <PageHeader
          title="Payroll Engine"
          subtitle="Guided workforce compensation processing"
          icon={Calculator}
          iconColor={COLORS.primary}
          iconBgColor={`${COLORS.primary}15`}
        />

        <View style={styles.content}>
          {/* Progress Stepper */}
          <ProgressStepper step={step} setStep={setStep} />

          {/* Step 1: Period Selection */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.periodCard}>
                <View style={styles.periodIcon}>
                  <Calendar size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.periodTitle}>Select Payroll Period</Text>
                <Text style={styles.periodSubtitle}>
                  Choose the month and year you wish to process payroll for.
                </Text>

                <View style={styles.periodSelectors}>
                  <View style={styles.periodSelector}>
                    <Text style={styles.selectorLabel}>Salary Month</Text>
                    <View style={styles.pickerWrapper}>
                      <SafeSelector
                        options={months.map((m, i) => ({ label: m, value: i + 1 }))}
                        selectedValue={month}
                        onValueChange={(v) => setMonth(v)}
                        visible={activeSelector === 'month'}
                        onOpen={() => setActiveSelector('month')}
                        onClose={() => setActiveSelector(null)}
                        style={styles.safeSelector}
                      />
                    </View>
                  </View>
                  <View style={styles.periodSelector}>
                    <Text style={styles.selectorLabel}>Salary Year</Text>
                    <View style={styles.pickerWrapper}>
                      <SafeSelector
                        options={years.map((y) => ({ label: String(y), value: y }))}
                        selectedValue={year}
                        onValueChange={(v) => setYear(v)}
                        visible={activeSelector === 'year'}
                        onOpen={() => setActiveSelector('year')}
                        onClose={() => setActiveSelector(null)}
                        style={styles.safeSelector}
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.continueButton} onPress={handleNextStep}>
                  <Text style={styles.continueButtonText}>Continue to Readiness</Text>
                  <ArrowRight size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 2: Readiness Check */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.readinessHeader}>
                <Text style={styles.readinessHeaderTitle}>System Readiness Check</Text>
                <Text style={styles.readinessSubtitle}>
                  Auto-verifying employee profiles and bank details...
                </Text>
                <TouchableOpacity onPress={fetchReadiness} style={styles.refreshButton}>
                  <RefreshCw size={16} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Simulating Lifecycle Nodes...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.readinessGrid}>
                    <ReadinessCard
                      title="Ready Employees"
                      value={readinessData?.summary?.readyCount || 0}
                      icon={UserCheck}
                      color={COLORS.success}
                      description="Fully configured and validated for processing."
                    />
                    <ReadinessCard
                      title="Missing Profiles"
                      value={readinessData?.summary?.missingProfileCount || 0}
                      icon={Users}
                      color={COLORS.warning}
                      description="These employees will be automatically skipped."
                    />
                    <ReadinessCard
                      title="Missing Bank Details"
                      value={readinessData?.summary?.missingBankCount || 0}
                      icon={ShieldAlert}
                      color={COLORS.error}
                      description="Critical for disbursement. Will be skipped."
                    />
                  </View>

                  <View style={styles.readinessFooter}>
                    <View style={styles.readinessInfo}>
                      <Info size={16} color={COLORS.primary} />
                      <Text style={styles.readinessInfoText}>
                        Only {readinessData?.summary?.readyCount} employees meet the criteria for selection.
                      </Text>
                    </View>
                    <View style={styles.readinessButtons}>
                      <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
                        <Text style={styles.backButtonText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.nextButton, readinessData?.summary?.readyCount === 0 && styles.nextButtonDisabled]}
                        onPress={handleNextStep}
                        disabled={readinessData?.summary?.readyCount === 0}
                      >
                        <Text style={styles.nextButtonText}>Generate Preview</Text>
                        <ArrowRight size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Preview Payroll</Text>
                <Text style={styles.previewSubtitle}>Aggregated calculation for valid employees.</Text>
              </View>

              {/* Overtime Toggle */}
              <View style={styles.overtimeCard}>
                <View>
                  <Text style={styles.overtimeLabel}>Overtime</Text>
                  <Text style={[styles.overtimeStatus, overtimeEnabled && styles.overtimeStatusEnabled]}>
                    {overtimeEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, overtimeEnabled && styles.toggleActive]}
                  onPress={() => setOvertimeEnabled(!overtimeEnabled)}
                >
                  <View style={[styles.toggleKnob, overtimeEnabled && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingCard}>
                  <Activity size={40} color={COLORS.primary} />
                  <Text style={styles.loadingTitle}>Aggregating Financial Metrics</Text>
                  <Text style={styles.loadingSubtext}>Calculating gross, deductions, and net tax implications...</Text>
                </View>
              ) : (
                <>
                  {/* Summary Cards */}
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Employees</Text>
                      <Text style={styles.summaryValue}>{previewData?.summary?.totalEmployees || 0}</Text>
                    </View>
                    <View style={[styles.summaryCard, styles.summaryCardIndigo]}>
                      <Text style={styles.summaryLabel}>Total Earnings</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                        {currencySymbol}{formatCurrencyValue(previewData?.summary?.totalGross || 0)}
                      </Text>
                    </View>
                    <View style={[styles.summaryCard, styles.summaryCardRose]}>
                      <Text style={styles.summaryLabel}>Total Deductions</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                        -{currencySymbol}{formatCurrencyValue(previewData?.summary?.totalDeductions || 0)}
                      </Text>
                    </View>
                    <View style={[styles.summaryCard, styles.summaryCardEmerald]}>
                      <Text style={styles.summaryLabel}>Net Payout</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                        {currencySymbol}{formatCurrencyValue(previewData?.summary?.totalNetPay || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Employee Breakdown */}
                  <View style={styles.breakdownCard}>
                    <Text style={styles.breakdownTitle}>Employee Breakdown</Text>
                    <ScrollView style={styles.breakdownList}>
                      {(previewData?.breakdown || []).map((emp: any, idx: number) => (
                        <EmployeeRow
                          key={idx}
                          employee={emp}
                          currencySymbol={currencySymbol}
                          index={idx}
                          onPress={() => {
                            setSelectedEmployee(emp);
                            setShowDetailModal(true);
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.previewButtons}>
                    <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
                      <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.runButton, isProcessing && styles.runButtonDisabled]}
                      onPress={handleRunPayroll}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <ActivityIndicator size="small" color={COLORS.white} />
                          <Text style={styles.runButtonText}>Processing {simProgress}%</Text>
                        </>
                      ) : (
                        <>
                          <Play size={16} color={COLORS.white} fill={COLORS.white} />
                          <Text style={styles.runButtonText}>Run Payroll</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Processing Progress */}
                  {isProcessing && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${simProgress}%` }]} />
                      </View>
                      <Text style={styles.progressText}>Processing payroll transactions...</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Footer Info */}
          {step < 4 && (
            <View style={styles.footerInfo}>
              <View style={styles.footerItem}>
                <ShieldCheck size={12} color={COLORS.gray} />
                <Text style={styles.footerText}>Secure Trace</Text>
              </View>
              <View style={styles.footerItem}>
                <Lock size={12} color={COLORS.gray} />
                <Text style={styles.footerText}>Encrypted Snapshot</Text>
              </View>
              <View style={styles.footerItem}>
                <BarChart3 size={12} color={COLORS.gray} />
                <Text style={styles.footerText}>Audit Compliant</Text>
              </View>
            </View>
          )}

          {/* Employee Detail Modal */}
          <Modal
            visible={showDetailModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowDetailModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedEmployee?.name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedEmployee?.employeeId}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <X size={24} color={COLORS.dark} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Attendance Section */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Attendance & Period</Text>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Working Days</Text>
                        <Text style={styles.detailValue}>{selectedEmployee?.totalOrgWorkingDays || 0}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Payable Days</Text>
                        <Text style={styles.detailValue}>{selectedEmployee?.present || 0}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>LOP Days</Text>
                        <Text style={[styles.detailValue, { color: COLORS.error }]}>
                          {selectedEmployee?.attendance?.lopDays || 0}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Overtime</Text>
                        <Text style={styles.detailValue}>{selectedEmployee?.attendance?.overtimeHours || 0} hrs</Text>
                      </View>
                    </View>
                  </View>

                  {/* Earnings Section */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Text style={styles.detailSectionTitle}>Earnings</Text>
                      <Text style={[styles.detailTotal, { color: COLORS.success }]}>
                        {currencySymbol}{formatCurrency(selectedEmployee?.adjustedGross || 0)}
                      </Text>
                    </View>
                    {(selectedEmployee?.earnings || []).map((comp: any, idx: number) => (
                      <View key={idx} style={styles.compRow}>
                        <Text style={styles.compName}>{comp.name}</Text>
                        <Text style={styles.compValue}>{currencySymbol}{formatCurrency(comp.value)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Deductions Section */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionHeader}>
                      <Text style={styles.detailSectionTitle}>Deductions</Text>
                      <Text style={[styles.detailTotal, { color: COLORS.error }]}>
                        -{currencySymbol}{formatCurrency((selectedEmployee?.adjustedGross || 0) - (selectedEmployee?.net || 0))}
                      </Text>
                    </View>
                    {(selectedEmployee?.deductions || []).map((comp: any, idx: number) => (
                      <View key={idx} style={styles.compRow}>
                        <Text style={styles.compName}>{comp.name}</Text>
                        <Text style={[styles.compValue, { color: COLORS.error }]}>
                          -{currencySymbol}{formatCurrency(comp.value)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Net Pay */}
                  <View style={[styles.detailSection, styles.netPaySection]}>
                    <Text style={styles.netPayLabel}>Net Payout</Text>
                    <Text style={styles.netPayValue}>
                      {currencySymbol}{formatCurrency(selectedEmployee?.net || 0)}
                    </Text>
                  </View>
                </ScrollView>

                <TouchableOpacity 
                  style={styles.closeModalButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  // Stepper Styles
  stepperContainer: { marginBottom: 32, marginTop: 8 },
  stepperTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 16 },
  stepperProgress: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  stepperSteps: { flexDirection: 'row', justifyContent: 'space-between' },
  stepperStep: { alignItems: 'center', flex: 1 },
  stepperDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepperDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepperDotText: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray },
  stepperDotTextActive: { color: COLORS.white },
  stepperLabel: { fontSize: 9, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  stepperLabelActive: { color: COLORS.primary },

  // Step Container
  stepContainer: { flex: 1 },

  // Step 1 - Period Card
  periodCard: { backgroundColor: COLORS.white, borderRadius: 32, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  periodIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  periodTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark, marginBottom: 8, textAlign: 'center' },
  periodSubtitle: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 24 },
  periodSelectors: { flexDirection: 'row', gap: 16, marginBottom: 32, width: '100%' },
  periodSelector: { flex: 1 },
  selectorLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, marginBottom: 8, textTransform: 'uppercase' },
  pickerWrapper: { backgroundColor: COLORS.light, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  safeSelector: { height: 44, width: '100%', backgroundColor: 'transparent' },
  continueButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 24 },
  continueButtonText: { fontSize: 16, fontWeight: 'bold', color: COLORS.white },

  // Step 2 - Readiness
  readinessHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  readinessHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  readinessSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 4, flex: 1 },
  refreshButton: { padding: 8, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  readinessGrid: { gap: 16, marginBottom: 24 },
  readinessCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: COLORS.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 4 },
  readinessIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  readinessValue: { fontSize: 24, fontWeight: 'bold' },
  readinessTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray, marginTop: 2 },
  readinessDesc: { fontSize: 10, color: COLORS.gray, marginTop: 4 },
  readinessFooter: { gap: 16 },
  readinessInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${COLORS.primary}10`, padding: 12, borderRadius: 16 },
  readinessInfoText: { fontSize: 12, color: COLORS.primary, flex: 1 },
  readinessButtons: { flexDirection: 'row', gap: 12 },
  backButton: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  backButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.gray },
  nextButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 16 },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },

  // Loading Card
  loadingCard: { backgroundColor: COLORS.white, borderRadius: 32, padding: 40, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: COLORS.border },
  loadingText: { fontSize: 12, color: COLORS.gray, fontWeight: 'bold', textTransform: 'uppercase' },
  loadingTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark, marginTop: 16 },
  loadingSubtext: { fontSize: 12, color: COLORS.gray, textAlign: 'center' },

  // Step 3 - Preview
  previewHeader: { marginBottom: 20 },
  previewTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  previewSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  overtimeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  overtimeLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.dark },
  overtimeStatus: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  overtimeStatusEnabled: { color: COLORS.primary },
  toggle: { width: 44, height: 24, backgroundColor: COLORS.border, borderRadius: 12, padding: 2 },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white },
  toggleKnobActive: { transform: [{ translateX: 20 }] },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.white, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  summaryCardIndigo: { backgroundColor: `${COLORS.primary}10` },
  summaryCardRose: { backgroundColor: `${COLORS.error}10` },
  summaryCardEmerald: { backgroundColor: `${COLORS.success}10` },
  summaryLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase', marginBottom: 8 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },

  breakdownCard: { backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 20 },
  breakdownTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  breakdownList: { maxHeight: 400 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexWrap: 'wrap' },
  employeeRowError: { backgroundColor: `${COLORS.error}10` },
  employeeInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  employeeAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center' },
  employeeAvatarError: { backgroundColor: `${COLORS.error}15` },
  employeeInitial: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  employeeInitialError: { color: COLORS.error },
  employeeName: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  employeeId: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  employeeStats: { flexDirection: 'row', gap: 16 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 9, color: COLORS.gray },
  statValue: { fontSize: 11, fontWeight: 'bold', color: COLORS.dark, marginTop: 2 },
  errorBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${COLORS.error}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  errorText: { fontSize: 10, color: COLORS.error, fontWeight: 'bold' },

  previewButtons: { flexDirection: 'row', gap: 12 },
  runButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.success, paddingVertical: 14, borderRadius: 16 },
  runButtonDisabled: { opacity: 0.5 },
  runButtonText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },

  progressContainer: { marginTop: 16, gap: 8 },
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 11, color: COLORS.gray, textAlign: 'center' },

  // Success Screen
  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successIcon: { position: 'relative', marginBottom: 24 },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  successBadge: { position: 'absolute', bottom: -8, right: -8, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.dark, marginBottom: 8, textAlign: 'center' },
  successMessage: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 32 },
  successButtons: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  successButtonSecondary: { flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  successButtonSecondaryText: { fontSize: 14, fontWeight: 'bold', color: COLORS.gray },
  successButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 16 },
  successButtonPrimaryText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },

  // Footer Info
  footerInfo: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 24, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },

  // KPI Card
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 3 },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 16, fontWeight: 'bold' },
  kpiTitle: { fontSize: 10, color: COLORS.gray, marginTop: 2 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  modalSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  modalBody: { flex: 1 },
  detailSection: { marginBottom: 24, backgroundColor: COLORS.light, padding: 16, borderRadius: 20 },
  detailSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailSectionTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  detailTotal: { fontSize: 16, fontWeight: 'bold' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { flex: 1, minWidth: '45%' },
  detailLabel: { fontSize: 10, color: COLORS.gray, marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  compName: { fontSize: 13, color: COLORS.dark },
  compValue: { fontSize: 13, fontWeight: 'bold', color: COLORS.dark },
  netPaySection: { backgroundColor: `${COLORS.primary}10`, borderBottomWidth: 0 },
  netPayLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  netPayValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  closeModalButton: { backgroundColor: COLORS.dark, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  closeModalButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
});

// Helper component for ShieldAlert icon
const ShieldAlertIcon = ({ size, color }: any) => (
  <View style={{ width: size, height: size }}>
    <ShieldAlert size={size} color={color} />
  </View>
);