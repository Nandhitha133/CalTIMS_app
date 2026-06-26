import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal
} from 'react-native';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowRight,
  Info,
  DollarSign,
  Receipt,
  ChevronRight,
  Check,
  ShieldCheck
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const { width } = Dimensions.get('window');

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Reusable Animated Button
const AnimatedButton = ({ onPress, style, children, disabled }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function PayrollRun() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [overtimeEnabled, setOvertimeEnabled] = useState(false);
  
  const [readinessData, setReadinessData] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const { data: settingsRes } = useQuery<any>({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings()
  });
  const settings = settingsRes?.data?.data || settingsRes?.data;
  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const [loading, setLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = [currentYear - 2, currentYear - 1, currentYear];

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, [step]);

  const proceedToReadiness = async () => {
    try {
      setLoading(true);
      const res: any = await payrollAPI.getReadiness({ month, year });
      if (res?.success) {
        setReadinessData(res.data);
        setStep(2);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to check readiness');
    } finally {
      setLoading(false);
    }
  };

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      // First check if the payroll for this month has already been generated
      const batchesRes: any = await payrollAPI.getBatches();
      if (batchesRes?.success && batchesRes.data) {
        const existingBatch = batchesRes.data.find((b: any) => b.month === month && b.year === year);
        if (existingBatch) {
          setLoading(false);
          Alert.alert(
            'Payroll Already Generated',
            `This month's payroll is already generated. Do you want to run again on this month?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Run Again', onPress: proceedToReadiness }
            ]
          );
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch existing batches:', err);
    }
    
    await proceedToReadiness();
  };

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const res: any = await payrollAPI.getPreview({ month, year, overtimeEnabled });
      if (res?.success) {
        setPreviewData(res.data);
        setStep(3);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to fetch preview');
    } finally {
      setLoading(false);
    }
  };

  const executePayroll = async () => {
    try {
      setLoading(true);
      const res: any = await payrollAPI.run({ month, year, overtimeEnabled });
      if (res?.success) {
        setStep(4);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to run payroll');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {[1, 2, 3, 4].map(s => {
        const isActive = step >= s;
        const isCurrent = step === s;
        return (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.stepDot, isActive && styles.stepDotActive, isCurrent && styles.stepDotCurrent]}>
              {isActive && !isCurrent ? (
                <Check size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepText, isActive && styles.stepTextActive]}>{s}</Text>
              )}
            </View>
            {s < 4 && (
              <View style={[styles.stepLine, isActive && styles.stepLineActive]} />
            )}
          </View>
        );
      })}
    </View>
  );

  return (
    <Layout title="Payroll Engine" user={user} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderStepIndicator()}

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {step === 1 && (
            <View style={styles.card}>
              <View style={styles.iconWrapper}>
                <Calendar size={32} color="#6366f1" />
              </View>
              <Text style={styles.cardTitle}>Select Payroll Period</Text>
              <Text style={styles.cardSubtitle}>Choose the operational month to begin processing workforce compensation.</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Month</Text>
                <TouchableOpacity style={styles.pickerFake} onPress={() => setMonthPickerVisible(true)}>
                  <Text style={styles.pickerFakeText}>{months[month - 1]}</Text>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year</Text>
                <TouchableOpacity style={styles.pickerFake} onPress={() => setYearPickerVisible(true)}>
                  <Text style={styles.pickerFakeText}>{year}</Text>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              {(() => {
                const isFuture = year > new Date().getFullYear() || (year === new Date().getFullYear() && month > new Date().getMonth() + 1);
                return (
                  <AnimatedButton 
                    style={[styles.primaryBtn, isFuture && { backgroundColor: '#94a3b8' }]} 
                    onPress={() => {
                      if (isFuture) {
                        Alert.alert('Not Supported', 'Cannot run payroll for future months.');
                      } else {
                        fetchReadiness();
                      }
                    }} 
                    disabled={loading || isFuture}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{isFuture ? 'Future Month Not Supported' : 'Initialize Engine'}</Text>}
                  </AnimatedButton>
                );
              })()}
            </View>
          )}

          {step === 2 && readinessData && (
            <View style={styles.card}>
              <View style={[styles.iconWrapper, { backgroundColor: '#f0fdf4' }]}>
                <ShieldCheck size={32} color="#10b981" />
              </View>
              <Text style={styles.cardTitle}>System Readiness</Text>
              <Text style={styles.cardSubtitle}>Verifying employee profiles and banking details before calculation.</Text>
              
              <View style={styles.readinessGrid}>
                <View style={[styles.readinessBox, { borderLeftColor: '#10b981', backgroundColor: '#ecfdf5' }]}>
                  <View style={styles.readinessHeader}>
                    <CheckCircle2 color="#10b981" size={20} />
                    <Text style={[styles.readinessLabel, { color: '#059669' }]}>Ready</Text>
                  </View>
                  <Text style={[styles.readinessValue, { color: '#064e3b' }]}>{readinessData.summary.readyCount}</Text>
                </View>
                <View style={[styles.readinessBox, { borderLeftColor: '#f59e0b', backgroundColor: '#fffbeb' }]}>
                  <View style={styles.readinessHeader}>
                    <AlertCircle color="#f59e0b" size={20} />
                    <Text style={[styles.readinessLabel, { color: '#d97706' }]}>Missing Profiles</Text>
                  </View>
                  <Text style={[styles.readinessValue, { color: '#78350f' }]}>{readinessData.summary.missingProfileCount}</Text>
                </View>
                <View style={[styles.readinessBox, { borderLeftColor: '#ef4444', backgroundColor: '#fef2f2' }]}>
                  <View style={styles.readinessHeader}>
                    <AlertCircle color="#ef4444" size={20} />
                    <Text style={[styles.readinessLabel, { color: '#dc2626' }]}>Missing Bank</Text>
                  </View>
                  <Text style={[styles.readinessValue, { color: '#7f1d1d' }]}>{readinessData.summary.missingBankCount}</Text>
                </View>
              </View>
              
              <View style={styles.actions}>
                <AnimatedButton style={styles.secondaryBtn} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </AnimatedButton>
                <AnimatedButton style={[styles.primaryBtn, { flex: 2 }]} onPress={fetchPreview} disabled={loading || readinessData.summary.readyCount === 0}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Generate Preview</Text>}
                </AnimatedButton>
              </View>
            </View>
          )}

          {step === 3 && previewData && (
            <View style={[styles.card, { paddingHorizontal: 16 }]}>
              <View style={styles.previewHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { textAlign: 'left', marginBottom: 4 }]}>Preview Payroll</Text>
                  <Text style={[styles.cardSubtitle, { textAlign: 'left', paddingHorizontal: 0, marginBottom: 0 }]}>Aggregated calculation for valid employees.</Text>
                </View>

              </View>

              <View style={styles.topActionsRow}>
                 <AnimatedButton style={styles.headerBackBtn} onPress={() => setStep(2)}>
                  <Text style={styles.headerBackBtnText}>Back</Text>
                 </AnimatedButton>
                 <AnimatedButton style={styles.headerRunBtn} onPress={executePayroll} disabled={loading}>
                   {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                       <Play size={14} color="#fff" fill="#fff" />
                       <Text style={styles.headerRunBtnText}>Run Payroll</Text>
                     </View>
                   )}
                 </AnimatedButton>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statCardsScroll}>
                <View style={[styles.statCardInline, { backgroundColor: '#f8fafc' }]}>
                  <Text style={styles.statCardInlineLabel}>EMPLOYEES</Text>
                  <Text style={[styles.statCardInlineValue, { color: '#0f172a' }]}>{previewData.summary.totalEmployees}</Text>
                </View>
                <View style={[styles.statCardInline, { backgroundColor: '#eef2ff' }]}>
                  <Text style={styles.statCardInlineLabel}>TOTAL EARNINGS</Text>
                  <Text style={[styles.statCardInlineValue, { color: '#4f46e5' }]}>{currencySymbol}{previewData.summary.totalGross?.toLocaleString() || '0.00'}</Text>
                </View>
                <View style={[styles.statCardInline, { backgroundColor: '#fef2f2' }]}>
                  <Text style={styles.statCardInlineLabel}>TOTAL DEDUCTIONS</Text>
                  <Text style={[styles.statCardInlineValue, { color: '#e11d48' }]}>-{currencySymbol}{previewData.summary.totalDeductions?.toLocaleString() || '0.00'}</Text>
                </View>
                <View style={[styles.statCardInline, { backgroundColor: '#ecfdf5' }]}>
                  <Text style={styles.statCardInlineLabel}>NET PAYOUT</Text>
                  <Text style={[styles.statCardInlineValue, { color: '#059669' }]}>{currencySymbol}{previewData.summary.totalNetPay?.toLocaleString() || '0.00'}</Text>
                </View>
              </ScrollView>

              <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownHeader}>EMPLOYEE BREAKDOWN</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: scale(680) }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCol, { width: scale(180), flex: 0, textAlign: 'left' }]}>EMPLOYEE NAME</Text>
                      <Text style={[styles.tableCol, { width: scale(110), flex: 0, textAlign: 'right' }]}>GROSS PAY</Text>
                      <Text style={[styles.tableCol, { width: scale(100), flex: 0, textAlign: 'right' }]}>DEDUCTION</Text>
                      <Text style={[styles.tableCol, { width: scale(80), flex: 0 }]}>LOP DAYS</Text>
                      <Text style={[styles.tableCol, { width: scale(110), flex: 0, textAlign: 'right' }]}>LOP DEDUCTION</Text>
                      <Text style={[styles.tableCol, { width: scale(100), flex: 0, textAlign: 'right', color: '#6366f1' }]}>NET SALARY</Text>
                    </View>

                    {previewData.breakdown && previewData.breakdown.map((row: any, idx: number) => (
                      <View key={idx} style={[styles.tableRow, idx % 2 !== 0 && { backgroundColor: '#f8fafc' }]}>
                        <View style={[styles.tableCell, { width: scale(180), flex: 0, flexDirection: 'row', alignItems: 'center', gap: scale(10) }]}>
                          <View style={styles.avatarMini}>
                            <Text style={styles.avatarMiniText}>{row.name ? row.name[0].toUpperCase() : 'U'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.employeeName} numberOfLines={1}>{row.name}</Text>
                            <Text style={styles.employeeId}>{row.employeeId}</Text>
                          </View>
                        </View>
                        
                        {row.status === 'ERROR' ? (
                          <View style={{ width: scale(500), flex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                             <AlertCircle size={14} color="#ef4444" style={{ marginRight: scale(6) }} />
                             <Text style={{ color: '#ef4444', fontSize: moderateScale(12), fontWeight: '700' }}>Calculation Failed: {row.error}</Text>
                          </View>
                        ) : (
                          <>
                            <Text style={[styles.tableCell, { width: scale(110), flex: 0, textAlign: 'right', color: '#475569' }]}>{currencySymbol}{(row.ctc || row.baseGross || ((row.adjustedGross || 0) + (row.lopDeduction || 0))).toLocaleString()}</Text>
                            <Text style={[styles.tableCell, { width: scale(100), flex: 0, textAlign: 'right', color: '#e11d48' }]}>{currencySymbol}{Math.max(0, (row.deductions || row.totalDeductions || 0) - (row.lopDeduction || 0)).toLocaleString()}</Text>
                            <Text style={[styles.tableCell, { width: scale(80), flex: 0, color: '#64748b' }]}>{row.lop || 0}</Text>
                            <Text style={[styles.tableCell, { width: scale(110), flex: 0, textAlign: 'right', color: '#e11d48' }]}>{currencySymbol}{(row.lopDeduction || 0).toLocaleString()}</Text>
                            <Text style={[styles.tableCell, { width: scale(100), flex: 0, textAlign: 'right', color: '#0f172a', fontWeight: '800' }]}>{currencySymbol}{row.net?.toLocaleString() || '0.00'}</Text>
                          </>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>

            </View>
          )}

          {step === 4 && (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 48, backgroundColor: '#f8fafc', borderColor: 'transparent', shadowOpacity: 0 }]}>
              <View style={{ position: 'relative', marginBottom: 32 }}>
                <View style={[styles.successIconWrapper, { backgroundColor: '#10b981', width: 96, height: 96, borderRadius: 48, padding: 0, justifyContent: 'center', alignItems: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }]}>
                  <Check size={48} color="#fff" strokeWidth={4} />
                </View>
                <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#4f46e5', width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 }}>
                  <DollarSign size={20} color="#fff" />
                </View>
              </View>

              <Text style={[styles.cardTitle, { fontSize: 28, color: '#0f172a', marginBottom: 12 }]}>Payroll Executed!</Text>
              <Text style={[styles.successDesc, { paddingHorizontal: 40, marginBottom: 40 }]}>
                Workforce compensation for {months[month - 1]} {year} has been committed to the ledger successfully.
              </Text>

              <View style={styles.successActionsRow}>
                <AnimatedButton style={styles.successGhostBtn} onPress={() => navigation.navigate('PayrollDashboard')}>
                  <Text style={styles.successGhostBtnText}>Dashboard</Text>
                </AnimatedButton>
                
                <AnimatedButton style={styles.successPrimaryBtn} onPress={() => navigation.navigate('PayrollPayslips')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Receipt size={16} color="#fff" />
                    <Text style={styles.successPrimaryBtnText}>Generate Payslips</Text>
                  </View>
                </AnimatedButton>
                
                <AnimatedButton style={styles.successOutlineBtn} onPress={() => navigation.navigate('PayrollHistory')}>
                  <Text style={styles.successOutlineBtnText}>View Ledger</Text>
                </AnimatedButton>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal visible={monthPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMonthPickerVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {months.map((m, index) => {
                const isFutureMonth = year === currentYear && index + 1 > currentMonth;
                if (isFutureMonth) return null;
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.modalItem, month === index + 1 && styles.modalItemActive]}
                    onPress={() => { setMonth(index + 1); setMonthPickerVisible(false); }}
                  >
                    <Text style={[styles.modalItemText, month === index + 1 && styles.modalItemTextActive]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
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
                  onPress={() => { 
                    setYear(y); 
                    if (y === currentYear && month > currentMonth) {
                      setMonth(currentMonth);
                    }
                    setYearPickerVisible(false); 
                  }}
                >
                  <Text style={[styles.modalItemText, year === y && styles.modalItemTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: scale(16) },
  stepContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(32) },
  stepDot: { width: scale(32), height: verticalScale(32), borderRadius: scale(16), backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  stepDotActive: { backgroundColor: '#6366f1' },
  stepDotCurrent: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.3, shadowRadius: scale(8), elevation: 6 },
  stepText: { color: '#64748b', fontWeight: '800', fontSize: moderateScale(14) },
  stepTextActive: { color: '#fff' },
  stepLine: { height: verticalScale(3), width: (width - scale(160)) / 3, backgroundColor: '#e2e8f0', marginHorizontal: scale(-4), zIndex: 1 },
  stepLineActive: { backgroundColor: '#6366f1' },
  
  card: { 
    backgroundColor: '#fff', 
    borderRadius: scale(24), 
    padding: scale(24), 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: verticalScale(10) },
    shadowOpacity: 0.05,
    shadowRadius: scale(20),
    elevation: 4
  },
  iconWrapper: { alignSelf: 'center', backgroundColor: '#eef2ff', padding: scale(20), borderRadius: scale(24), marginBottom: verticalScale(20) },
  cardTitle: { fontSize: moderateScale(22), fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: verticalScale(8) },
  cardSubtitle: { fontSize: moderateScale(13), color: '#64748b', textAlign: 'center', marginBottom: verticalScale(24), lineHeight: verticalScale(20), paddingHorizontal: scale(16) },
  
  inputGroup: { marginBottom: verticalScale(20) },
  label: { fontSize: moderateScale(12), fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: verticalScale(8), letterSpacing: 0.5 },
  pickerFake: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: scale(16), borderRadius: scale(16), borderWidth: 1, borderColor: '#e2e8f0' },
  pickerFakeText: { fontSize: moderateScale(16), color: '#1e293b', fontWeight: '600' },
  
  primaryBtn: { backgroundColor: '#6366f1', padding: scale(16), borderRadius: scale(16), alignItems: 'center', marginTop: verticalScale(8), flex: 1, shadowColor: '#6366f1', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.3, shadowRadius: scale(8), elevation: 4 },
  primaryBtnText: { color: '#fff', fontSize: moderateScale(16), fontWeight: '700', letterSpacing: 0.5 },
  secondaryBtn: { backgroundColor: '#f1f5f9', padding: scale(16), borderRadius: scale(16), alignItems: 'center', marginTop: verticalScale(8), flex: 1 },
  secondaryBtnText: { color: '#475569', fontSize: moderateScale(16), fontWeight: '700' },
  executeBtn: { backgroundColor: '#10b981', padding: scale(16), borderRadius: scale(16), alignItems: 'center', marginTop: verticalScale(8), flex: 1, shadowColor: '#10b981', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.3, shadowRadius: scale(8), elevation: 4 },
  executeBtnText: { color: '#fff', fontSize: moderateScale(16), fontWeight: '700', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', gap: scale(12), marginTop: verticalScale(8) },
  
  readinessGrid: { gap: scale(12), marginBottom: verticalScale(24) },
  readinessBox: { padding: scale(16), borderRadius: scale(16), borderLeftWidth: 4 },
  readinessHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(8) },
  readinessLabel: { fontSize: moderateScale(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  readinessValue: { fontSize: moderateScale(28), fontWeight: '800' },
  
  previewHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: verticalScale(16) },
  overtimeSwitchContainer: { alignItems: 'flex-end', backgroundColor: '#f8fafc', paddingHorizontal: scale(12), paddingVertical: verticalScale(8), borderRadius: scale(12), borderWidth: 1, borderColor: '#e2e8f0' },
  overtimeSwitchLabel: { fontSize: moderateScale(9), fontWeight: '800', color: '#94a3b8', marginBottom: verticalScale(2) },
  overtimeSwitchValue: { fontSize: moderateScale(11), fontWeight: '800', color: '#64748b' },
  
  topActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: scale(12), marginBottom: verticalScale(24) },
  headerBackBtn: { paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(12), borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  headerBackBtnText: { fontSize: moderateScale(13), fontWeight: '700', color: '#64748b' },
  headerRunBtn: { paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(12), backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.3, shadowRadius: scale(4), elevation: 2 },
  headerRunBtnText: { fontSize: moderateScale(13), fontWeight: '700', color: '#fff' },

  statCardsScroll: { gap: scale(12), paddingBottom: verticalScale(16), marginBottom: verticalScale(8) },
  statCardInline: { padding: scale(16), borderRadius: scale(16), minWidth: scale(140) },
  statCardInlineLabel: { fontSize: moderateScale(10), fontWeight: '800', color: '#94a3b8', marginBottom: verticalScale(8) },
  statCardInlineValue: { fontSize: moderateScale(20), fontWeight: '800' },

  breakdownContainer: { marginTop: verticalScale(16), borderWidth: 1, borderColor: '#f1f5f9', borderRadius: scale(16), overflow: 'hidden' },
  breakdownHeader: { fontSize: moderateScale(11), fontWeight: '800', color: '#94a3b8', padding: scale(16), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: verticalScale(12), paddingHorizontal: scale(16), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableCol: { flex: 1, fontSize: moderateScale(9), fontWeight: '800', color: '#94a3b8', textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: verticalScale(12), paddingHorizontal: scale(16), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  tableCell: { flex: 1, fontSize: moderateScale(12), fontWeight: '700', textAlign: 'center' },
  
  avatarMini: { width: scale(32), height: verticalScale(32), borderRadius: scale(10), backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { fontSize: moderateScale(12), fontWeight: '800', color: '#4f46e5' },
  employeeName: { fontSize: moderateScale(11), fontWeight: '800', color: '#0f172a' },
  employeeId: { fontSize: moderateScale(9), fontWeight: '700', color: '#94a3b8' },

  successIconWrapper: { backgroundColor: '#ecfdf5', padding: scale(24), borderRadius: scale(64) },
  successDesc: { textAlign: 'center', color: '#64748b', marginTop: verticalScale(12), fontSize: moderateScale(14), lineHeight: verticalScale(22), paddingHorizontal: scale(20) },
  
  successActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: scale(12) },
  successGhostBtn: { paddingHorizontal: scale(20), paddingVertical: verticalScale(14), borderRadius: scale(16) },
  successGhostBtnText: { fontSize: moderateScale(14), fontWeight: '800', color: '#475569' },
  successPrimaryBtn: { backgroundColor: '#4f46e5', paddingHorizontal: scale(24), paddingVertical: verticalScale(14), borderRadius: scale(16), shadowColor: '#4f46e5', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.3, shadowRadius: scale(8), elevation: 4 },
  successPrimaryBtnText: { fontSize: moderateScale(14), fontWeight: '800', color: '#fff' },
  successOutlineBtn: { backgroundColor: '#fff', paddingHorizontal: scale(24), paddingVertical: verticalScale(14), borderRadius: scale(16), borderWidth: 1, borderColor: '#e2e8f0' },
  successOutlineBtnText: { fontSize: moderateScale(14), fontWeight: '800', color: '#0f172a' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(24), paddingBottom: verticalScale(40) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#0f172a', marginBottom: verticalScale(16), textAlign: 'center' },
  modalItem: { paddingVertical: verticalScale(16), paddingHorizontal: scale(24), borderRadius: scale(16), marginBottom: verticalScale(8), backgroundColor: '#f8fafc' },
  modalItemActive: { backgroundColor: '#eef2ff' },
  modalItemText: { fontSize: moderateScale(16), fontWeight: '700', color: '#475569', textAlign: 'center' },
  modalItemTextActive: { color: '#4f46e5', fontWeight: '800' }
});
