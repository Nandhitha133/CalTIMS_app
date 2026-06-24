import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import {
  Users,
  Calculator,
  Landmark,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  ChevronDown,
  X,
  Shield,
  Clock
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollAPI, userAPI, policyAPI, settingsAPI } from '../../services/endpoints';
import { ROLE_TEMPLATES, calculateSalaryBreakdown } from './payrollUtils';
import Toast from 'react-native-toast-message';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const steps = [
  { id: 1, name: 'Breakdown', icon: Calculator },
  { id: 2, name: 'Bank Details', icon: Landmark },
  { id: 3, name: 'Review', icon: Eye }
];

export default function PayrollSetupWizard() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preSelectedUser = route.params?.preSelectedUser;
  const queryClient = useQueryClient();

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
    });
  }, [navigation]);

  const scrollViewRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Queries
  const { data: settingsRes } = useQuery<any>({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings()
  });
  const settings = settingsRes?.data;
  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const { data: usersRes, isLoading: usersLoading } = useQuery<any>({
    queryKey: ['usersList'],
    queryFn: () => userAPI.getAll({ limit: 1000 })
  });
  const users = usersRes?.data || [];

  const { data: profilesRes } = useQuery<any>({
    queryKey: ['payrollProfiles'],
    queryFn: () => payrollAPI.getProfiles()
  });
  const profiles = profilesRes?.data || [];

  const { data: globalPolicyRes } = useQuery<any>({
    queryKey: ['payrollPolicy'],
    queryFn: () => policyAPI.getPolicy()
  });
  const globalPolicy = globalPolicyRes?.data;

  // State
  const [selectedUser, setSelectedUser] = useState<any>(preSelectedUser || null);
  const [ctcValue, setCtcValue] = useState('');
  const [ctcType, setCtcType] = useState<'annual' | 'monthly'>('annual');
  const [selectedRole, setSelectedRole] = useState('employee');

  const [structure, setStructure] = useState({
    name: 'Payroll Profile',
    earnings: [...ROLE_TEMPLATES['employee'].earnings],
    deductions: [...ROLE_TEMPLATES['employee'].deductions]
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    pan: '',
    uan: ''
  });

  const [statutoryConfig, setStatutoryConfig] = useState({
    pf: { mode: 'default', enabled: true },
    esi: { mode: 'default', enabled: true },
    pt: { mode: 'default', enabled: true },
    gratuity: { mode: 'default', enabled: true },
    retirement: { mode: 'default', enabled: true }
  });

  const [attendanceConfig, setAttendanceConfig] = useState({
    mode: 'POLICY_DEFAULT',
    workingDays: 26
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialize selected user from profiles
  useEffect(() => {
    if (selectedUser && profiles.length > 0) {
      const uId = selectedUser._id || selectedUser.id;
      setBankDetails({
        bankName: selectedUser.bankName || selectedUser.employee?.bankName || '',
        accountNumber: selectedUser.accountNumber || selectedUser.employee?.accountNumber || '',
        ifscCode: selectedUser.ifscCode || selectedUser.employee?.ifscCode || '',
        pan: selectedUser.pan || selectedUser.employee?.pan || '',
        uan: selectedUser.uan || selectedUser.employee?.uan || ''
      });

      const existing = profiles.find((p: any) => (p.employee?.userId === uId) || (p.user === uId));
      if (existing) {
        setStructure({
          name: 'Payroll Profile',
          earnings: (existing.earnings || ROLE_TEMPLATES['employee'].earnings).filter((e: any) => !e.hidden && !(e.name || '').toLowerCase().includes('metadata')),
          deductions: (existing.deductions || ROLE_TEMPLATES['employee'].deductions).filter((d: any) => !d.hidden && !(d.name || '').toLowerCase().includes('metadata'))
        });
        setCtcValue(existing.annualCTC ? existing.annualCTC.toString() : (existing.monthlyCTC ? (existing.monthlyCTC * 12).toString() : ''));
        setCtcType('annual');
      }
    }
  }, [selectedUser, profiles]);

  const monthlyCTC = useMemo(() => {
    const val = parseFloat(ctcValue) || 0;
    return ctcType === 'annual' ? val / 12 : val;
  }, [ctcValue, ctcType]);

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const breakdown: any = useMemo(() => {
    return calculateSalaryBreakdown(structure.earnings, structure.deductions, monthlyCTC, {
      ...globalPolicy,
      profile: statutoryConfig,
      attendanceOverride: attendanceConfig
    });
  }, [structure, monthlyCTC, globalPolicy, statutoryConfig, attendanceConfig]);

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) =>
      u.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()))
    );
  }, [users, employeeSearch]);

  const setupProfileMutation = useMutation({
    mutationFn: (data: any) => payrollAPI.setupFullProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollProfiles'] });
      Alert.alert(
        'Success',
        'Profile successfully saved!',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save configuration');
      setIsSaving(false);
    }
  });

  const handleApplyTemplate = (role: string) => {
    setSelectedRole(role);
    const template = JSON.parse(JSON.stringify((ROLE_TEMPLATES as any)[role] || (ROLE_TEMPLATES as any)['employee']));
    setStructure({ ...structure, earnings: template.earnings, deductions: template.deductions });
  };

  const updateComponent = (type: 'earnings' | 'deductions', index: number, field: string, value: string) => {
    const updated = [...structure[type]];
    let item: any = { ...updated[index], [field]: value };

    if (item.calculationType === 'Percentage' && item.value !== '') {
      let val = parseFloat(String(item.value));
      if (!isNaN(val)) {
        if (val > 100) val = 100;

        if (type === 'earnings') {
          const itemBasedOn = item.basedOn || 'CTC';
          const otherTotal = structure.earnings.reduce((sum: number, e: any, i: number) => {
            if (i !== index && e.calculationType === 'Percentage' && (e.basedOn || 'CTC') === itemBasedOn) {
              return sum + (parseFloat(String(e.value)) || 0);
            }
            return sum;
          }, 0);

          if (val + otherTotal > 100) {
            val = Math.max(0, 100 - otherTotal);
            if (field === 'value' || field === 'calculationType') {
              Toast.show({ type: 'error', text1: `Total percentage of ${itemBasedOn} cannot exceed 100%` });
            }
          }
        }

        if (val !== parseFloat(String(item.value))) {
          item.value = val.toString();
        }
      }
    }

    updated[index] = item;
    setStructure({ ...structure, [type]: updated });
  };

  const addComponent = (type: 'earnings' | 'deductions') => {
    const newComp = { name: '', value: 0, calculationType: 'Fixed', basedOn: 'CTC' };
    setStructure({ ...structure, [type]: [...structure[type], newComp] });
  };

  const removeComponent = (type: 'earnings' | 'deductions', index: number) => {
    const updated = [...structure[type]];
    updated.splice(index, 1);
    setStructure({ ...structure, [type]: updated });
  };

  const handleFinalSubmit = () => {
    if (!selectedUser) {
      Alert.alert('Error', 'No employee selected');
      return;
    }
    setIsSaving(true);
    const annualCTC = ctcType === 'annual' ? parseFloat(ctcValue) : parseFloat(ctcValue) * 12;

    const cleanedDeductions = structure.deductions.filter(d => {
      const name = (d.name || '').toLowerCase();
      const isPF = name.includes('provident fund') || name === 'pf';
      const isESI = name.includes('esi') || name.includes('state insurance');
      const isPT = name.includes('professional tax') || name === 'pt';
      const isStatutoryCandidate = (isPF && globalPolicy?.statutory?.pf?.enabled) || 
                                   (isESI && globalPolicy?.statutory?.esi?.enabled) || 
                                   (isPT && globalPolicy?.statutory?.pt?.enabled);
      return !isStatutoryCandidate;
    });

    const finalDeductions = [...cleanedDeductions];
    const gratuity = breakdown.statutoryDeductions?.find((d: any) => d.name === 'Gratuity');
    if (gratuity && globalPolicy?.statutory?.gratuity?.includeInCTC) {
      if (!finalDeductions.find(d => d.name === 'Gratuity')) {
        finalDeductions.push({ 
          name: 'Gratuity', 
          value: gratuity.calculatedValue, 
          calculationType: 'Fixed', 
          basedOn: 'Basic Salary', 
          isStatutory: true 
        } as any);
      }
    }

    const earningsWithMeta = [
      ...structure.earnings,
      { 
        _isStatutoryConfig: true, 
        _config: statutoryConfig, 
        _attendance: attendanceConfig,
        name: 'Statutory Metadata', 
        value: 0, 
        hidden: true 
      } as any
    ];

    setupProfileMutation.mutate({
      userId: selectedUser?.id || selectedUser?._id,
      employeeId: selectedUser?.employee?.id,
      annualCTC,
      earnings: earningsWithMeta,
      deductions: finalDeductions,
      bankDetails
    });
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const page = Math.round(scrollPosition / width) + 1;
    setCurrentStep(page);
  };

  if (usersLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payroll Setup Wizard</Text>
        <Text style={styles.headerSub}>Configure compensation & bank details</Text>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {steps.map((s, idx) => (
            <View key={s.id} style={styles.stepDotContainer}>
              <View style={[styles.stepDot, currentStep >= s.id && styles.stepDotActive]}>
                <s.icon size={12} color={currentStep >= s.id ? '#fff' : '#94a3b8'} />
              </View>
              {idx < steps.length - 1 && <View style={[styles.stepLine, currentStep > s.id && styles.stepLineActive]} />}
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
      >
        {/* Step 1: Salary Breakdown */}
        <ScrollView style={[styles.page, { width }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Salary Breakdown</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee</Text>
              <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setShowEmployeeModal(true)}
              >
                <Text style={selectedUser ? styles.selectorText : styles.selectorPlaceholder}>
                  {selectedUser ? selectedUser.name : 'Select an employee'}
                </Text>
                <ChevronDown size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.templateRow}>
              {['intern', 'employee', 'manager'].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[styles.templateBtn, selectedRole === role && styles.templateBtnActive]}
                  onPress={() => handleApplyTemplate(role)}
                >
                  <Text style={[styles.templateBtnText, selectedRole === role && styles.templateBtnTextActive]}>
                    {role.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CTC ({ctcType.toUpperCase()})</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={ctcValue}
                  onChangeText={setCtcValue}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => setCtcType(ctcType === 'annual' ? 'monthly' : 'annual')}
                >
                  <Text style={styles.toggleBtnText}>{ctcType === 'annual' ? 'To Monthly' : 'To Annual'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Earnings */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Earnings</Text>
              <TouchableOpacity onPress={() => addComponent('earnings')}>
                <Plus size={20} color="#4f46e5" />
              </TouchableOpacity>
            </View>
            {structure.earnings.map((e, idx) => {
              const calcVal = breakdown?.breakdown?.[e.name] || 0;
              const isPercentage = e.calculationType === 'Percentage';
              return (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <View style={{ flex: 1.5, marginRight: 12 }}>
                    <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 }}>
                      <TextInput
                        style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', padding: 0 }}
                        value={e.name}
                        onChangeText={(v) => updateComponent('earnings', idx, 'name', v)}
                        placeholder="Component Name"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    {isPercentage && (
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}
                        onPress={() => updateComponent('earnings', idx, 'basedOn', e.basedOn === 'Basic Salary' ? 'CTC' : 'Basic Salary')}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginRight: 4 }}>
                          % OF {e.basedOn === 'Basic Salary' ? 'BASIC' : 'CTC'}
                        </Text>
                        <ChevronDown size={12} color="#64748b" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 20, padding: 2 }}>
                      <TouchableOpacity
                        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: !isPercentage ? '#fff' : 'transparent', shadowColor: !isPercentage ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: !isPercentage ? 0.05 : 0, shadowRadius: 2, elevation: !isPercentage ? 1 : 0 }}
                        onPress={() => updateComponent('earnings', idx, 'calculationType', 'Fixed')}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: !isPercentage ? '#4f46e5' : '#94a3b8' }}>FIX</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: isPercentage ? '#fff' : 'transparent', shadowColor: isPercentage ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isPercentage ? 0.05 : 0, shadowRadius: 2, elevation: isPercentage ? 1 : 0 }}
                        onPress={() => updateComponent('earnings', idx, 'calculationType', 'Percentage')}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isPercentage ? '#4f46e5' : '#94a3b8' }}>%</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 36, minWidth: 60 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#cbd5e1', marginRight: 4 }}>{isPercentage ? '%' : currencySymbol}</Text>
                      <TextInput
                        style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a', padding: 0, textAlign: 'center' }}
                        value={e.value.toString()}
                        onChangeText={(v) => updateComponent('earnings', idx, 'value', v)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 90, gap: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#10b981' }}>
                      {currencySymbol}{Math.round(calcVal).toLocaleString()}
                    </Text>
                    <TouchableOpacity onPress={() => removeComponent('earnings', idx)}>
                      <Trash2 size={16} color="#cbd5e1" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Gross Pay</Text>
              <Text style={styles.summaryValue}>{currencySymbol}{breakdown.grossPay?.toFixed(2) || '0.00'}</Text>
            </View>

            {/* Deductions */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Deductions</Text>
              <TouchableOpacity onPress={() => addComponent('deductions')}>
                <Plus size={20} color="#4f46e5" />
              </TouchableOpacity>
            </View>
            {structure.deductions.map((d, idx) => (
              <View key={idx} style={styles.componentRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={d.name}
                  onChangeText={(v) => updateComponent('deductions', idx, 'name', v)}
                  placeholder="Name"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={d.value.toString()}
                  onChangeText={(v) => updateComponent('deductions', idx, 'value', v)}
                  keyboardType="numeric"
                  placeholder="Value"
                />
                <TouchableOpacity
                  style={styles.typeToggle}
                  onPress={() => updateComponent('deductions', idx, 'calculationType', d.calculationType === 'Fixed' ? 'Percentage' : 'Fixed')}
                >
                  <Text style={styles.typeToggleText}>{d.calculationType === 'Fixed' ? 'FIX' : '%'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeComponent('deductions', idx)}>
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={[styles.summaryBox, styles.summaryBoxRed]}>
              <Text style={[styles.summaryLabel, styles.textRed]}>Total Deductions</Text>
              <Text style={[styles.summaryValue, styles.textRed]}>{currencySymbol}{breakdown.totalDeductions?.toFixed(2) || '0.00'}</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { marginBottom: 40 }]}
              onPress={() => {
                if (!selectedUser) {
                  Alert.alert('Validation Error', 'Please select an employee');
                  return;
                }
                if (!ctcValue || parseFloat(ctcValue) <= 0) {
                  Alert.alert('Validation Error', 'Please enter CTC value');
                  return;
                }
                setCurrentStep(2);
                scrollViewRef.current?.scrollTo({ x: width, animated: true });
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={[styles.submitBtnText, { fontSize: 12 }]}>NEXT STEP</Text>
                <ChevronRight size={16} color="#fff" />
              </View>
            </TouchableOpacity>

          </View>
        </ScrollView>

        {/* Step 2: Bank Details */}
        <ScrollView style={[styles.page, { width }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Landmark size={20} color="#10b981" />
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>Bank & Compliance Details</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 4 }}>Required for official salary disbursement and tax reporting</Text>
            </View>
            <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#d1fae5' }}>
              <Check size={12} color="#10b981" />
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#059669', letterSpacing: 0.5 }}>PROFILE COMPLETE</Text>
            </View>
          </View>

          {/* BENEFICIARY BANKING */}
          <View style={styles.complianceCard}>
            <View style={styles.complianceCardHeader}>
              <View style={styles.complianceIconBox}><Landmark size={14} color="#64748b" /></View>
              <Text style={styles.complianceCardTitle}>BENEFICIARY BANKING</Text>
            </View>

            <View style={styles.complianceInputGroup}>
              <Text style={styles.complianceLabel}>BANK NAME</Text>
              <TextInput style={[styles.complianceInput, { backgroundColor: '#f8fafc', color: '#94a3b8' }]} editable={false} value={bankDetails.bankName} onChangeText={v => setBankDetails({ ...bankDetails, bankName: v })} placeholder="HDFC" placeholderTextColor="#cbd5e1" />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.complianceInputGroup, { flex: 1 }]}>
                <Text style={styles.complianceLabel}>ACCOUNT NUMBER</Text>
                <TextInput style={[styles.complianceInput, { backgroundColor: '#f8fafc', color: '#94a3b8' }]} editable={false} value={bankDetails.accountNumber} onChangeText={v => setBankDetails({ ...bankDetails, accountNumber: v })} keyboardType="numeric" placeholder="38749080939885" placeholderTextColor="#cbd5e1" />
              </View>
              <View style={[styles.complianceInputGroup, { flex: 1 }]}>
                <Text style={styles.complianceLabel}>IFSC CODE</Text>
                <TextInput style={[styles.complianceInput, { backgroundColor: '#f8fafc', color: '#94a3b8' }]} editable={false} value={bankDetails.ifscCode} onChangeText={v => setBankDetails({ ...bankDetails, ifscCode: v })} autoCapitalize="characters" placeholder="HDFC0002333" placeholderTextColor="#cbd5e1" />
              </View>
            </View>

            <View style={styles.complianceInputGroup}>
              <Text style={styles.complianceLabel}>BRANCH NAME</Text>
              <TextInput style={[styles.complianceInput, { backgroundColor: '#f8fafc', color: '#94a3b8' }]} editable={false} value={(bankDetails as any).branchName || ''} onChangeText={v => setBankDetails({ ...bankDetails, branchName: v } as any)} placeholder="Hosur" placeholderTextColor="#cbd5e1" />
            </View>
          </View>

          {/* GOVERNMENT IDENTITY */}
          <View style={styles.complianceCard}>
            <View style={styles.complianceCardHeader}>
              <View style={styles.complianceIconBox}><Eye size={14} color="#64748b" /></View>
              <Text style={styles.complianceCardTitle}>GOVERNMENT IDENTITY</Text>
            </View>

            <View style={styles.complianceInputGroup}>
              <Text style={styles.complianceLabel}>PAN CARD NUMBER</Text>
              <TextInput style={[styles.complianceInput, { backgroundColor: '#f8fafc', color: '#94a3b8' }]} editable={false} value={bankDetails.pan} onChangeText={v => setBankDetails({ ...bankDetails, pan: v })} autoCapitalize="characters" placeholder="ABCDE7282C" placeholderTextColor="#cbd5e1" />
            </View>

            <View style={styles.complianceInputGroup}>
              <Text style={styles.complianceLabel}>UNIVERSAL ACCOUNT NUMBER</Text>
              <TextInput style={[styles.complianceInput, { backgroundColor: '#f8fafc', color: '#94a3b8' }]} editable={false} value={bankDetails.uan} onChangeText={v => setBankDetails({ ...bankDetails, uan: v })} keyboardType="numeric" placeholder="738390474792" placeholderTextColor="#cbd5e1" />
            </View>
          </View>

          {/* COMPLIANCE OVERRIDES */}
          <View style={[styles.complianceCard, { borderColor: '#e0e7ff', backgroundColor: '#f8fafc' }]}>
            <View style={styles.complianceCardHeader}>
              <View style={[styles.complianceIconBox, { backgroundColor: '#eef2ff' }]}><Shield size={14} color="#4f46e5" /></View>
              <Text style={[styles.complianceCardTitle, { color: '#4f46e5' }]}>COMPLIANCE OVERRIDES</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '700', marginBottom: 16, marginTop: -12, letterSpacing: 0.5 }}>DISABLE DEDUCTIONS IF EXEMPT</Text>

            {/* PF */}
            <View style={styles.overrideRow}>
              <View style={styles.overrideIconWrap}><Shield size={16} color="#64748b" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overrideTitle}>PROVIDENT FUND</Text>
                <Text style={styles.overrideSub}>SOURCE: COMPANY POLICY</Text>
              </View>
              <View style={styles.overrideToggleGroup}>
                {['default', 'enabled', 'disabled'].map(mode => (
                  <TouchableOpacity key={mode} style={[styles.overrideToggleBtn, statutoryConfig.pf.mode === mode && styles.overrideToggleBtnActive]} onPress={() => setStatutoryConfig({ ...statutoryConfig, pf: { mode, enabled: mode !== 'disabled' } })}>
                    <Text style={[styles.overrideToggleText, statutoryConfig.pf.mode === mode && styles.overrideToggleTextActive]}>{mode.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ESI */}
            <View style={styles.overrideRow}>
              <View style={styles.overrideIconWrap}><AlertCircle size={16} color="#64748b" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overrideTitle}>ESI COVERAGE</Text>
                <Text style={styles.overrideSub}>SOURCE: COMPANY POLICY</Text>
              </View>
              <View style={styles.overrideToggleGroup}>
                {['default', 'enabled', 'disabled'].map(mode => (
                  <TouchableOpacity key={mode} style={[styles.overrideToggleBtn, statutoryConfig.esi.mode === mode && styles.overrideToggleBtnActive]} onPress={() => setStatutoryConfig({ ...statutoryConfig, esi: { mode, enabled: mode !== 'disabled' } })}>
                    <Text style={[styles.overrideToggleText, statutoryConfig.esi.mode === mode && styles.overrideToggleTextActive]}>{mode.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* PT */}
            <View style={styles.overrideRow}>
              <View style={styles.overrideIconWrap}><Calculator size={16} color="#64748b" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overrideTitle}>PROFESSIONAL TAX</Text>
                <Text style={styles.overrideSub}>SOURCE: COMPANY POLICY</Text>
              </View>
              <View style={styles.overrideToggleGroup}>
                {['default', 'enabled', 'disabled'].map(mode => (
                  <TouchableOpacity key={mode} style={[styles.overrideToggleBtn, statutoryConfig.pt.mode === mode && styles.overrideToggleBtnActive]} onPress={() => setStatutoryConfig({ ...statutoryConfig, pt: { mode, enabled: mode !== 'disabled' } })}>
                    <Text style={[styles.overrideToggleText, statutoryConfig.pt.mode === mode && styles.overrideToggleTextActive]}>{mode.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Gratuity */}
            <View style={styles.overrideRow}>
              <View style={styles.overrideIconWrap}><IndianRupee size={16} color="#64748b" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overrideTitle}>GRATUITY BENEFIT</Text>
                <Text style={styles.overrideSub}>SOURCE: COMPANY POLICY</Text>
              </View>
              <View style={styles.overrideToggleGroup}>
                {['default', 'enabled', 'disabled'].map(mode => (
                  <TouchableOpacity key={mode} style={[styles.overrideToggleBtn, statutoryConfig.gratuity.mode === mode && styles.overrideToggleBtnActive]} onPress={() => setStatutoryConfig({ ...statutoryConfig, gratuity: { mode, enabled: mode !== 'disabled' } })}>
                    <Text style={[styles.overrideToggleText, statutoryConfig.gratuity.mode === mode && styles.overrideToggleTextActive]}>{mode.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Retirement */}
            <View style={styles.overrideRow}>
              <View style={styles.overrideIconWrap}><Shield size={16} color="#64748b" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overrideTitle}>RETIREMENT BENEFIT</Text>
                <Text style={styles.overrideSub}>SOURCE: COMPANY POLICY</Text>
              </View>
              <View style={styles.overrideToggleGroup}>
                {['default', 'enabled', 'disabled'].map(mode => (
                  <TouchableOpacity key={mode} style={[styles.overrideToggleBtn, statutoryConfig.retirement?.mode === mode && styles.overrideToggleBtnActive]} onPress={() => setStatutoryConfig({ ...statutoryConfig, retirement: { mode, enabled: mode !== 'disabled' } })}>
                    <Text style={[styles.overrideToggleText, statutoryConfig.retirement?.mode === mode && styles.overrideToggleTextActive]}>{mode.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ATTENDANCE POLICY */}
          <View style={[styles.complianceCard, { borderColor: '#fef08a', backgroundColor: '#fefce8' }]}>
            <View style={styles.complianceCardHeader}>
              <View style={[styles.complianceIconBox, { backgroundColor: '#fef9c3' }]}><Clock size={14} color="#ca8a04" /></View>
              <Text style={[styles.complianceCardTitle, { color: '#ca8a04' }]}>ATTENDANCE POLICY</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#a16207', fontWeight: '700', marginBottom: 16, marginTop: -12, letterSpacing: 0.5 }}>OVERRIDE STANDARD WORKING DAYS</Text>

            <View style={[styles.overrideRow, { padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#fef08a' }]}>
              <View style={[styles.overrideIconWrap, { backgroundColor: '#fefce8' }]}><Clock size={16} color="#ca8a04" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.overrideTitle, { color: '#0f172a' }]}>CALCULATION MODE</Text>
              </View>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => setAttendanceConfig({ mode: attendanceConfig.mode === 'POLICY_DEFAULT' ? 'CUSTOM' : 'POLICY_DEFAULT', workingDays: 26 })}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#4f46e5' }}>{attendanceConfig.mode.replace('_', ' ')}</Text>
                <ChevronDown size={14} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {attendanceConfig.mode === 'CUSTOM' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.complianceLabel}>WORKING DAYS PER MONTH</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#fef08a', borderRadius: 12, paddingHorizontal: 12 }}>
                  <TextInput
                    style={{ flex: 1, padding: 12, fontSize: 13, color: '#0f172a', fontWeight: '700' }}
                    value={attendanceConfig.workingDays.toString()}
                    onChangeText={(v) => {
                      let val = parseInt(v);
                      if (isNaN(val)) val = 0;
                      if (val > 31) val = 31;
                      setAttendanceConfig({ ...attendanceConfig, workingDays: val });
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8' }}>DAYS</Text>
                </View>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 40 }}>
            <TouchableOpacity
              style={[styles.submitBtn, { flex: 1, backgroundColor: '#f1f5f9' }]}
              onPress={() => {
                setCurrentStep(1);
                scrollViewRef.current?.scrollTo({ x: 0, animated: true });
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ChevronLeft size={16} color="#475569" />
                <Text style={[styles.submitBtnText, { color: '#475569', fontSize: 12 }]}>PREVIOUS</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { flex: 2 }]}
              onPress={() => {
                setCurrentStep(3);
                scrollViewRef.current?.scrollTo({ x: width * 2, animated: true });
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={[styles.submitBtnText, { fontSize: 12 }]}>NEXT STEP</Text>
                <ChevronRight size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Step 3: Final Review */}
        <ScrollView style={[styles.page, { width }]}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a' }}>Final Review</Text>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginTop: 4 }}>OVERALL PROFILE SUMMARY</Text>
          </View>

          {/* Employee Info Card */}
          <View style={styles.reviewCard}>
            <View style={styles.reviewCardHeader}>
              <View style={styles.reviewCardIconBox}><Users size={16} color="#4f46e5" /></View>
              <Text style={styles.reviewCardTitle}>EMPLOYEE INFORMATION</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>NAME</Text>
              <Text style={styles.reviewCardValue}>{selectedUser?.name || '—'}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>EMPLOYEE ID</Text>
              <Text style={styles.reviewCardValue}>{selectedUser?.employeeId || '—'}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>ANNUAL CTC</Text>
              <Text style={[styles.reviewCardValue, { color: '#10b981' }]}>{currencySymbol}{(monthlyCTC * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>WORKING DAYS</Text>
              <Text style={[styles.reviewCardValue, { color: '#4f46e5' }]}>{breakdown.standardMonthlyDays || 30} Days (Policy)</Text>
            </View>
          </View>

          {/* Bank & Identity Card */}
          <View style={styles.reviewCard}>
            <View style={styles.reviewCardHeader}>
              <View style={styles.reviewCardIconBox}><Landmark size={16} color="#4f46e5" /></View>
              <Text style={styles.reviewCardTitle}>BANK & IDENTITY</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>BANK NAME</Text>
              <Text style={styles.reviewCardValue}>{bankDetails.bankName || '—'}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>ACCOUNT NUMBER</Text>
              <Text style={styles.reviewCardValue}>{bankDetails.accountNumber || '—'}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>IFSC CODE</Text>
              <Text style={styles.reviewCardValue}>{bankDetails.ifscCode || '—'}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>PAN CARD NUMBER</Text>
              <Text style={styles.reviewCardValue}>{bankDetails.pan || '—'}</Text>
            </View>
            <View style={styles.reviewCardRow}>
              <Text style={styles.reviewCardLabel}>UAN NUMBER</Text>
              <Text style={styles.reviewCardValue}>{bankDetails.uan || '—'}</Text>
            </View>
          </View>

          {/* Breakdown Estimate Card (Dark) */}
          <View style={styles.darkEstimateCard}>
            <Text style={styles.darkEstimateSubtitle}>MONTHLY TAKE-HOME ESTIMATE</Text>
            <Text style={styles.darkEstimateTotal}>{currencySymbol}{formatCurrency(breakdown.netSalary)}</Text>

            <View style={styles.darkDivider} />
            <Text style={styles.darkSectionTitle}>EARNINGS</Text>
            {breakdown.earnings?.map((e: any, idx: number) => (
              <View key={idx} style={styles.darkRow}>
                <Text style={styles.darkRowLabel}>{e.name}</Text>
                <Text style={styles.darkRowValueEarning}>{currencySymbol}{formatCurrency(e.calculatedValue)}</Text>
              </View>
            ))}

            <View style={styles.darkDivider} />
            <Text style={styles.darkSectionTitle}>DEDUCTIONS</Text>
            {breakdown.deductions?.map((d: any, idx: number) => (
              <View key={idx} style={styles.darkRow}>
                <Text style={[styles.darkRowLabel, { fontStyle: 'italic', opacity: 0.7 }]}>{d.name}</Text>
                <Text style={styles.darkRowValueDeduction}>{currencySymbol}{formatCurrency(d.calculatedValue)}</Text>
              </View>
            ))}
            {breakdown.statutoryDeductions?.map((d: any, idx: number) => (
              <View key={'stat_' + idx} style={styles.darkRow}>
                <Text style={[styles.darkRowLabel, { fontStyle: 'italic', opacity: 0.7 }]}>{d.name} {d.isStatutory ? '(Policy)' : ''}</Text>
                <Text style={styles.darkRowValueDeduction}>{currencySymbol}{formatCurrency(d.calculatedValue)}</Text>
              </View>
            ))}

            <View style={styles.darkDivider} />
            <Text style={styles.darkSectionTitle}>EMPLOYER CONTRIBUTIONS</Text>
            {breakdown.employerContributions?.map((c: any, idx: number) => (
              <View key={'emp_' + idx} style={styles.darkRow}>
                <Text style={[styles.darkRowLabel, { fontStyle: 'italic', opacity: 0.7 }]}>{c.name}</Text>
                <Text style={styles.darkRowValueNeutral}>{currencySymbol}{formatCurrency(c.calculatedValue)}</Text>
              </View>
            ))}

            <View style={styles.darkDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
              <View>
                <Text style={[styles.darkSectionTitle, { marginBottom: 4 }]}>MONTHLY GROSS</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#10b981' }}>{currencySymbol}{formatCurrency(breakdown.grossPay)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.darkSectionTitle, { marginBottom: 4 }]}>MONTHLY DED.</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#ef4444' }}>{currencySymbol}{formatCurrency(breakdown.totalDeductions)}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 40 }}>
            <TouchableOpacity
              style={[styles.submitBtn, { flex: 1, backgroundColor: '#f1f5f9' }]}
              onPress={() => {
                setCurrentStep(2);
                scrollViewRef.current?.scrollTo({ x: width, animated: true });
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ChevronLeft size={16} color="#475569" />
                <Text style={[styles.submitBtnText, { color: '#475569', fontSize: 12 }]}>PREVIOUS</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { flex: 2 }, isSaving && styles.submitBtnDisabled]}
              onPress={handleFinalSubmit}
              disabled={isSaving}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={[styles.submitBtnText, { fontSize: 12 }]}>{isSaving ? 'SAVING...' : 'FINISH: SAVE PROFILE'}</Text>
                <ChevronRight size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Employee Selector Modal */}
      <Modal visible={showEmployeeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Search size={20} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or ID..."
                placeholderTextColor="#94a3b8"
                value={employeeSearch}
                onChangeText={setEmployeeSearch}
              />
            </View>
            <FlatList
              data={filteredUsers}
              keyExtractor={item => item._id || item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.employeeOption, selectedUser && (selectedUser.id === item.id || selectedUser._id === item._id) && styles.employeeOptionSelected]}
                  onPress={() => {
                    setSelectedUser(item);
                    setShowEmployeeModal(false);
                  }}
                >
                  <View style={styles.employeeAvatar}>
                    <Text style={styles.employeeAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.employeeName}>{item.name}</Text>
                    <Text style={styles.employeeMeta}>{item.employeeId || 'No ID'}</Text>
                  </View>
                  {selectedUser && (selectedUser.id === item.id || selectedUser._id === item._id) && (
                    <Check size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: scale(20), paddingTop: verticalScale(40), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: moderateScale(24), fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: moderateScale(14), color: '#64748b', marginTop: verticalScale(4) },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(16) },
  stepDotContainer: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: scale(32), height: verticalScale(32), borderRadius: scale(16), backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#4f46e5' },
  stepLine: { width: scale(40), height: verticalScale(2), backgroundColor: '#f1f5f9', marginHorizontal: scale(8) },
  stepLineActive: { backgroundColor: '#4f46e5' },
  page: { flex: 1, padding: scale(16) },
  card: { backgroundColor: '#fff', borderRadius: scale(24), padding: scale(20), shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: scale(8), elevation: 2, marginBottom: verticalScale(40) },
  cardTitle: { fontSize: moderateScale(20), fontWeight: '800', color: '#1e293b', marginBottom: verticalScale(20) },
  templateRow: { flexDirection: 'row', gap: scale(8), marginBottom: verticalScale(20) },
  templateBtn: { paddingHorizontal: scale(12), paddingVertical: verticalScale(8), borderRadius: scale(8), backgroundColor: '#f1f5f9' },
  templateBtnActive: { backgroundColor: '#eef2ff' },
  templateBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: '#64748b' },
  templateBtnTextActive: { color: '#4f46e5' },
  inputGroup: { marginBottom: verticalScale(16) },
  label: { fontSize: moderateScale(12), fontWeight: '700', color: '#64748b', marginBottom: verticalScale(6) },
  row: { flexDirection: 'row', gap: scale(8) },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: scale(12), padding: scale(12), fontSize: moderateScale(14), color: '#0f172a' },
  toggleBtn: { backgroundColor: '#eef2ff', padding: scale(12), borderRadius: scale(12), justifyContent: 'center' },
  toggleBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: '#4f46e5' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: verticalScale(20), marginBottom: verticalScale(12) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: '#334155' },
  componentRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(12) },
  typeToggle: { backgroundColor: '#f1f5f9', padding: scale(10), borderRadius: scale(8) },
  typeToggleText: { fontSize: moderateScale(10), fontWeight: '800', color: '#475569' },
  summaryBox: { backgroundColor: '#ecfdf5', padding: scale(16), borderRadius: scale(16), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: verticalScale(16) },
  summaryBoxRed: { backgroundColor: '#fef2f2' },
  summaryLabel: { fontSize: moderateScale(14), fontWeight: '700', color: '#065f46' },
  textRed: { color: '#991b1b' },
  summaryValue: { fontSize: moderateScale(18), fontWeight: '800', color: '#065f46' },
  submitBtn: { backgroundColor: '#4f46e5', padding: scale(16), borderRadius: scale(16), alignItems: 'center', marginTop: verticalScale(20) },
  submitBtnDisabled: { opacity: 0.5 },

  reviewCard: { backgroundColor: '#fff', borderRadius: scale(24), padding: scale(20), marginBottom: verticalScale(16), borderWidth: 1, borderColor: '#f1f5f9' },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(20), gap: scale(12) },
  reviewCardIconBox: { width: scale(32), height: verticalScale(32), borderRadius: scale(8), backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  reviewCardTitle: { fontSize: moderateScale(11), fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  reviewCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) },
  reviewCardLabel: { fontSize: moderateScale(9), fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  reviewCardValue: { fontSize: moderateScale(13), fontWeight: '800', color: '#0f172a' },

  darkEstimateCard: { backgroundColor: '#0f172a', borderRadius: scale(24), padding: scale(24), marginBottom: verticalScale(24) },
  darkEstimateSubtitle: { fontSize: moderateScale(9), fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: verticalScale(8) },
  darkEstimateTotal: { fontSize: moderateScale(32), fontWeight: '900', color: '#fff', marginBottom: verticalScale(24) },
  darkDivider: { height: verticalScale(1), backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: verticalScale(16) },
  darkSectionTitle: { fontSize: moderateScale(9), fontWeight: '800', color: '#475569', letterSpacing: 1, marginBottom: verticalScale(12) },
  darkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(12) },
  darkRowLabel: { fontSize: moderateScale(11), fontWeight: '600', color: '#94a3b8' },
  darkRowValueEarning: { fontSize: moderateScale(12), fontWeight: '800', color: '#10b981' },
  darkRowValueDeduction: { fontSize: moderateScale(12), fontWeight: '800', color: '#ef4444' },
  darkRowValueNeutral: { fontSize: moderateScale(12), fontWeight: '800', color: '#94a3b8' },

  submitBtnText: { color: '#fff', fontSize: moderateScale(16), fontWeight: '700' },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: scale(12), padding: scale(12) },
  selectorText: { fontSize: moderateScale(14), color: '#0f172a', fontWeight: '500' },
  selectorPlaceholder: { fontSize: moderateScale(14), color: '#94a3b8', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), height: '80%', padding: scale(20) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(20) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#0f172a' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: scale(12), borderRadius: scale(12), marginBottom: verticalScale(16) },
  searchInput: { flex: 1, padding: scale(12), fontSize: moderateScale(16), color: '#0f172a' },
  employeeOption: { flexDirection: 'row', alignItems: 'center', padding: scale(16), borderRadius: scale(16), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  employeeOptionSelected: { backgroundColor: '#eef2ff', borderColor: '#eef2ff' },
  employeeAvatar: { width: scale(40), height: verticalScale(40), borderRadius: scale(20), backgroundColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginRight: scale(12) },
  employeeAvatarText: { color: '#fff', fontWeight: '700', fontSize: moderateScale(16) },
  employeeName: { fontSize: moderateScale(16), fontWeight: '700', color: '#1e293b' },
  employeeMeta: { fontSize: moderateScale(12), color: '#64748b', marginTop: verticalScale(2) },

  complianceCard: { backgroundColor: '#fff', borderRadius: scale(24), padding: scale(20), marginBottom: verticalScale(16), borderWidth: 1, borderColor: '#f1f5f9' },
  complianceCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(16), gap: scale(12) },
  complianceIconBox: { width: scale(32), height: verticalScale(32), borderRadius: scale(8), backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  complianceCardTitle: { fontSize: moderateScale(11), fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  complianceInputGroup: { marginBottom: verticalScale(12) },
  complianceLabel: { fontSize: moderateScale(9), fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: verticalScale(6) },
  complianceInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: scale(12), padding: scale(12), fontSize: moderateScale(13), color: '#0f172a', fontWeight: '700' },
  overrideRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: scale(12), padding: scale(12), borderWidth: 1, borderColor: '#f1f5f9', marginBottom: verticalScale(8) },
  overrideIconWrap: { width: scale(32), height: verticalScale(32), borderRadius: scale(8), backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: scale(12) },
  overrideTitle: { fontSize: moderateScale(10), fontWeight: '800', color: '#334155', letterSpacing: 0.5 },
  overrideSub: { fontSize: moderateScale(8), fontWeight: '600', color: '#94a3b8', marginTop: verticalScale(2), letterSpacing: 0.5 },
  overrideToggleGroup: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: scale(20), padding: scale(2) },
  overrideToggleBtn: { paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: scale(16) },
  overrideToggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(1) }, shadowOpacity: 0.1, shadowRadius: scale(2), elevation: 1 },
  overrideToggleText: { fontSize: moderateScale(8), fontWeight: '800', color: '#94a3b8' },
  overrideToggleTextActive: { color: '#4f46e5' }
});
