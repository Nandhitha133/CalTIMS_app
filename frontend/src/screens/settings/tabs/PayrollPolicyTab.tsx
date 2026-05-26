// src/screens/settings/tabs/PayrollPolicyTab.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Switch,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Save,
  History,
  Calculator,
  ShieldCheck,
  Clock,
  Settings2,
  Trash2,
  ChevronRight,
  AlertCircle,
  RefreshCcw,
  Percent,
  DollarSign,
  Wallet,
  Scaling,
  Briefcase,
  IndianRupee,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { policyAPI } from '../../../services/endpoints';
import { useSocketEvent } from '../../../services/socket';
import { useAuthStore } from '../../../store/authStore';
import Header from '../../../components/common/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface SalaryComponent {
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  calculationType: 'fixed' | 'percentage' | 'formula';
  value: number;
  formula: string;
}

interface StatutoryRule {
  enabled: boolean;
  employeeRate: number;
  employerRate?: number;
  wageLimit: number;
}

interface StatutoryConfig {
  pf: StatutoryRule;
  esi: StatutoryRule & { employeeRate: number; wageLimit: number };
}

interface AttendanceConfig {
  workingDaysPerMonth: number;
  prorateSalary: boolean;
}

interface OvertimeConfig {
  enabled: boolean;
  multiplier: number;
}

interface RoundingConfig {
  rule: 'ROUND_OFF' | 'ROUND_UP' | 'ROUND_DOWN';
  decimals: number;
}

interface PayrollPolicy {
  id?: string;
  version?: number;
  salaryComponents: SalaryComponent[];
  statutory: StatutoryConfig;
  attendance: AttendanceConfig;
  overtime: OvertimeConfig;
  rounding: RoundingConfig;
}

interface PreviewData {
  ctc: number;
  sampleEmployee: string;
  breakdown: {
    earnings: { components: Array<{ name: string; value: number }> };
    deductions: { components: Array<{ name: string; value: number }> };
    netPay: number;
  };
}

// Custom Tabs Component
const PolicyTabs = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => {
  const tabs = [
    { id: 'components', label: 'Salary Components', icon: Wallet },
    { id: 'statutory', label: 'Statutory Rules', icon: ShieldCheck },
    { id: 'attendance', label: 'Attendance & OT', icon: Clock },
    { id: 'rounding', label: 'Engine Config', icon: Settings2 },
  ];

  return (
    <View style={styles.tabsContainer}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <Icon size={16} color={isActive ? '#6366f1' : '#6b7280'} />
            <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Salary Component Item Component
const SalaryComponentItem = ({
  component,
  index,
  onUpdate,
  onRemove,
}: {
  component: SalaryComponent;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  return (
    <View style={styles.componentItem}>
      <TouchableOpacity
        style={styles.componentRemoveButton}
        onPress={() => setShowRemoveConfirm(true)}
      >
        <Trash2 size={16} color="#ef4444" />
      </TouchableOpacity>

      <View style={styles.componentRow}>
        <View style={styles.componentField}>
          <Text style={styles.componentLabel}>Component Name</Text>
          <TextInput
            style={styles.componentInput}
            value={component.name}
            onChangeText={(text) => onUpdate(index, 'name', text)}
            placeholder="Enter name"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.componentRow}>
        <View style={[styles.componentField, styles.flex1]}>
          <Text style={styles.componentLabel}>Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                component.type === 'EARNING' && styles.typeOptionActive,
              ]}
              onPress={() => onUpdate(index, 'type', 'EARNING')}
            >
              <TrendingUp size={14} color={component.type === 'EARNING' ? '#10b981' : '#6b7280'} />
              <Text
                style={[
                  styles.typeOptionText,
                  component.type === 'EARNING' && styles.typeOptionTextActive,
                ]}
              >
                Earning
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeOption,
                component.type === 'DEDUCTION' && styles.typeOptionActive,
              ]}
              onPress={() => onUpdate(index, 'type', 'DEDUCTION')}
            >
              <TrendingDown size={14} color={component.type === 'DEDUCTION' ? '#ef4444' : '#6b7280'} />
              <Text
                style={[
                  styles.typeOptionText,
                  component.type === 'DEDUCTION' && styles.typeOptionTextActive,
                ]}
              >
                Deduction
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.componentField, styles.flex1]}>
          <Text style={styles.componentLabel}>Calculation Basis</Text>
          <View style={styles.calculationSelector}>
            {['fixed', 'percentage', 'formula'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.calcOption,
                  component.calculationType === type && styles.calcOptionActive,
                ]}
                onPress={() => onUpdate(index, 'calculationType', type)}
              >
                <Text
                  style={[
                    styles.calcOptionText,
                    component.calculationType === type && styles.calcOptionTextActive,
                  ]}
                >
                  {type === 'fixed' ? 'Fixed' : type === 'percentage' ? '%' : 'Formula'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.componentRow}>
        <View style={[styles.componentField, styles.flex1]}>
          <Text style={styles.componentLabel}>
            {component.calculationType === 'formula' ? 'Formula' : 'Value'}
          </Text>
          <View style={styles.valueInputContainer}>
            <View style={styles.valueIcon}>
              {component.calculationType === 'formula' ? (
                <Calculator size={16} color="#9ca3af" />
              ) : component.calculationType === 'percentage' ? (
                <Percent size={16} color="#9ca3af" />
              ) : (
                <DollarSign size={16} color="#9ca3af" />
              )}
            </View>
            {component.calculationType === 'formula' ? (
              <TextInput
                style={styles.formulaInput}
                value={component.formula}
                onChangeText={(text) => onUpdate(index, 'formula', text)}
                placeholder="e.g., BASIC * 0.4"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <TextInput
                style={styles.valueInput}
                value={String(component.value)}
                onChangeText={(text) => onUpdate(index, 'value', parseFloat(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            )}
          </View>
        </View>
      </View>

      {/* Remove Confirmation Modal */}
      <Modal visible={showRemoveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Remove Component</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to remove "{component.name}"?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => setShowRemoveConfirm(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonDelete]}
                onPress={() => {
                  onRemove(index);
                  setShowRemoveConfirm(false);
                }}
              >
                <Text style={[styles.confirmButtonText, styles.confirmButtonDeleteText]}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Statutory Card Component
const StatutoryCard = ({
  title,
  icon: Icon,
  color,
  config,
  onToggle,
  onUpdate,
  type,
}: {
  title: string;
  icon: any;
  color: string;
  config: any;
  onToggle: (enabled: boolean) => void;
  onUpdate: (field: string, value: number) => void;
  type: 'pf' | 'esi';
}) => {
  const IconComponent = Icon;
  const isPF = type === 'pf';

  return (
    <View style={styles.statutoryCard}>
      <View style={styles.statutoryHeader}>
        <View style={styles.statutoryHeaderLeft}>
          <View style={[styles.statutoryIcon, { backgroundColor: `${color}15` }]}>
            <IconComponent size={24} color={color} />
          </View>
          <View>
            <Text style={styles.statutoryTitle}>{title}</Text>
            <Text style={styles.statutorySubtitle}>
              {isPF ? 'Statutory Deductions' : 'Employee State Insurance'}
            </Text>
          </View>
        </View>
        <Switch
          value={config.enabled}
          onValueChange={onToggle}
          trackColor={{ false: '#d1d5db', true: color }}
          thumbColor="#ffffff"
        />
      </View>

      {config.enabled && (
        <View style={styles.statutoryContent}>
          <View style={styles.statutoryRow}>
            <View style={[styles.statutoryField, styles.flex1]}>
              <Text style={styles.statutoryFieldLabel}>
                {isPF ? 'Employee Contribution %' : 'Employee Rate %'}
              </Text>
              <TextInput
                style={styles.statutoryInput}
                value={String(config.employeeRate)}
                onChangeText={(text) => onUpdate('employeeRate', parseFloat(text) || 0)}
                keyboardType="numeric"
              />
            </View>
            {isPF && (
              <View style={[styles.statutoryField, styles.flex1]}>
                <Text style={styles.statutoryFieldLabel}>Employer Contribution %</Text>
                <TextInput
                  style={styles.statutoryInput}
                  value={String(config.employerRate)}
                  onChangeText={(text) => onUpdate('employerRate', parseFloat(text) || 0)}
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          <View style={styles.statutoryRow}>
            <View style={[styles.statutoryField, styles.flex1]}>
              <Text style={styles.statutoryFieldLabel}>
                {isPF ? 'Wage Ceiling for PF' : 'Wage Limit Ceiling'}
              </Text>
              <View style={styles.wageLimitInput}>
                <IndianRupee size={16} color="#9ca3af" />
                <TextInput
                  style={styles.wageLimitField}
                  value={String(config.wageLimit)}
                  onChangeText={(text) => onUpdate('wageLimit', parseFloat(text) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {!isPF && (
            <View style={styles.infoBox}>
              <AlertCircle size={16} color="#f59e0b" />
              <Text style={styles.infoBoxText}>
                ESI is only applicable for employees whose Gross Salary is less than or equal to the specified wage limit.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default function PayrollPolicyTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { isPro } = useAuthStore();
  const [policy, setPolicy] = useState<PayrollPolicy | null>(null);
  const [activeTab, setActiveTab] = useState('components');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch policy
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payrollPolicy'],
    queryFn: async () => {
      try {
        const response: any = await policyAPI.getPolicy();
        return response.data?.data || response.data || response;
      } catch (error) {
        console.error('Failed to fetch policy:', error);
        return null;
      }
    },
  });

  useSocketEvent('settings_updated', (payload) => {
    console.log('[Socket] Settings updated event received in PayrollPolicyTab:', payload);
    refetch();
  });

  useEffect(() => {
    if (data) {
      setPolicy(data);
      if (data) fetchPreview(data);
    }
  }, [data]);

  const fetchPreview = async (currentPolicy: PayrollPolicy) => {
    setPreviewLoading(true);
    try {
      const response: any = await policyAPI.preview(currentPolicy);
      setPreview(response.data?.data || response.data || response);
    } catch (err) {
      console.error('Preview failed', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async (isNewVersion = false) => {
    if (!policy) return;

    // Check for PRO plan
    if (!isPro()) {
      Alert.alert(
        'Upgrade Required',
        'Payroll policy settings are available on PRO plan only. Please upgrade to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    try {
      if (isNewVersion) {
        await policyAPI.createVersion(policy);
        Alert.alert('Success', 'New policy version created');
      } else {
        await policyAPI.updatePolicy(policy);
        Alert.alert('Success', 'Policy updated successfully');
      }
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const addComponent = () => {
    if (!policy) return;
    const newComponent: SalaryComponent = {
      name: 'New Component',
      type: 'EARNING',
      calculationType: 'percentage',
      value: 0,
      formula: '',
    };
    setPolicy({
      ...policy,
      salaryComponents: [...(policy.salaryComponents || []), newComponent],
    });
  };

  const removeComponent = (index: number) => {
    if (!policy) return;
    const updated = [...(policy.salaryComponents || [])];
    updated.splice(index, 1);
    setPolicy({ ...policy, salaryComponents: updated });
  };

  const updateComponent = (index: number, field: string, value: any) => {
    if (!policy) return;
    const updated = [...(policy.salaryComponents || [])];
    updated[index] = { ...updated[index], [field]: value };
    setPolicy({ ...policy, salaryComponents: updated });
  };

  const updateStatutory = (type: 'pf' | 'esi', field: string, value: any) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      statutory: {
        ...policy.statutory,
        [type]: { ...policy.statutory[type], [field]: value },
      },
    });
  };

  const toggleStatutory = (type: 'pf' | 'esi', enabled: boolean) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      statutory: {
        ...policy.statutory,
        [type]: { ...policy.statutory[type], enabled },
      },
    });
  };

  const updateAttendance = (field: string, value: any) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      attendance: { ...policy.attendance, [field]: value },
    });
  };

  const updateOvertime = (field: string, value: any) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      overtime: { ...policy.overtime, [field]: value },
    });
  };

  const updateRounding = (field: string, value: any) => {
    if (!policy) return;
    setPolicy({
      ...policy,
      rounding: { ...policy.rounding, [field]: value },
    });
  };

  const triggerPreview = () => {
    if (policy) fetchPreview(policy);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading payroll policy...</Text>
      </View>
    );
  }

  if (!policy) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Header
          title="Payroll Policy"
          showBackButton={true}
          showSidebarButton={false}
          onBackPress={() => navigation.navigate('Settings' as never)}
        />
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.emptyTitle}>No payroll policy found</Text>
          <Text style={styles.emptyMessage}>
            The backend could not return a policy. Please check your connection or seed the database.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title="Payroll Policy"
        showBackButton={true}
        showSidebarButton={false}
        onBackPress={() => navigation.navigate('Settings' as never)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.versionButton}
            onPress={() => handleSave(true)}
            disabled={saving}
          >
            <History size={18} color="#6366f1" />
            <Text style={styles.versionButtonText}>New Version</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => handleSave(false)}
            disabled={saving}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={18} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Synchronize Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Left Column - Forms */}
          <View style={styles.leftColumn}>
            <PolicyTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'components' && (
              <View style={styles.componentsContainer}>
                <View style={styles.componentsHeader}>
                  <View style={styles.componentsHeaderLeft}>
                    <View style={styles.componentsIcon}>
                      <Scaling size={20} color="#6366f1" />
                    </View>
                    <Text style={styles.componentsTitle}>Earning & Deduction Hub</Text>
                  </View>
                  <TouchableOpacity style={styles.addButton} onPress={addComponent}>
                    <Plus size={20} color="#10b981" />
                  </TouchableOpacity>
                </View>

                {policy.salaryComponents?.map((component, idx) => (
                  <SalaryComponentItem
                    key={idx}
                    component={component}
                    index={idx}
                    onUpdate={updateComponent}
                    onRemove={removeComponent}
                  />
                ))}

                {(!policy.salaryComponents || policy.salaryComponents.length === 0) && (
                  <View style={styles.emptyComponents}>
                    <Text style={styles.emptyComponentsText}>No salary components added yet</Text>
                    <TouchableOpacity onPress={addComponent}>
                      <Text style={styles.emptyComponentsLink}>Add your first component</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'statutory' && (
              <View style={styles.statutoryContainer}>
                <StatutoryCard
                  title="Provident Fund (EPF)"
                  icon={IndianRupee}
                  color="#3b82f6"
                  config={policy.statutory?.pf}
                  onToggle={(enabled) => toggleStatutory('pf', enabled)}
                  onUpdate={(field, value) => updateStatutory('pf', field, value)}
                  type="pf"
                />

                <StatutoryCard
                  title="State Insurance (ESI)"
                  icon={Briefcase}
                  color="#ef4444"
                  config={policy.statutory?.esi}
                  onToggle={(enabled) => toggleStatutory('esi', enabled)}
                  onUpdate={(field, value) => updateStatutory('esi', field, value)}
                  type="esi"
                />
              </View>
            )}

            {activeTab === 'attendance' && (
              <View style={styles.attendanceContainer}>
                <View style={styles.attendanceCard}>
                  <View style={styles.attendanceHeader}>
                    <View style={styles.attendanceIcon}>
                      <Clock size={24} color="#6b7280" />
                    </View>
                    <Text style={styles.attendanceTitle}>Attendance Policy</Text>
                  </View>

                  <View style={styles.attendanceField}>
                    <View>
                      <Text style={styles.attendanceFieldLabel}>Standard Working Days</Text>
                      <Text style={styles.attendanceFieldHint}>Used for per-day calculation basis</Text>
                    </View>
                    <TextInput
                      style={styles.attendanceFieldInput}
                      value={String(policy.attendance?.workingDaysPerMonth || 26)}
                      onChangeText={(text) => updateAttendance('workingDaysPerMonth', parseInt(text) || 0)}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.switchField}>
                    <View>
                      <Text style={styles.switchFieldLabel}>Salary Proration</Text>
                      <Text style={styles.switchFieldHint}>Adjust components based on attendance</Text>
                    </View>
                    <Switch
                      value={policy.attendance?.prorateSalary || false}
                      onValueChange={(value) => updateAttendance('prorateSalary', value)}
                      trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>

                <View style={styles.attendanceCard}>
                  <View style={styles.attendanceHeader}>
                    <View style={styles.attendanceIcon}>
                      <TrendingUp size={24} color="#8b5cf6" />
                    </View>
                    <Text style={styles.attendanceTitle}>Overtime Config</Text>
                  </View>

                  <View style={styles.switchField}>
                    <View>
                      <Text style={styles.switchFieldLabel}>Overtime Calculations</Text>
                      <Text style={styles.switchFieldHint}>Enable OT for this policy cycle</Text>
                    </View>
                    <Switch
                      value={policy.overtime?.enabled || false}
                      onValueChange={(value) => updateOvertime('enabled', value)}
                      trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  {policy.overtime?.enabled && (
                    <View style={styles.attendanceField}>
                      <View>
                        <Text style={styles.attendanceFieldLabel}>Overtime Multiplier</Text>
                        <Text style={styles.attendanceFieldHint}>Rate for extratime above standard hours</Text>
                      </View>
                      <TextInput
                        style={styles.attendanceFieldInput}
                        value={String(policy.overtime?.multiplier || 1.5)}
                        onChangeText={(text) => updateOvertime('multiplier', parseFloat(text) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                  )}
                </View>
              </View>
            )}

            {activeTab === 'rounding' && (
              <View style={styles.roundingContainer}>
                <View style={styles.roundingCard}>
                  <View style={styles.roundingHeader}>
                    <View style={styles.roundingIcon}>
                      <Settings2 size={24} color="#6b7280" />
                    </View>
                    <Text style={styles.roundingTitle}>Engine Configuration</Text>
                  </View>

                  <View style={styles.roundingField}>
                    <Text style={styles.roundingLabel}>Rounding Strategy</Text>
                    <View style={styles.roundingOptions}>
                      {[
                        { value: 'ROUND_OFF', label: 'Standard Round Off' },
                        { value: 'ROUND_UP', label: 'Ceiling (Always Up)' },
                        { value: 'ROUND_DOWN', label: 'Floor (Always Down)' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.roundingOption,
                            policy.rounding?.rule === option.value && styles.roundingOptionActive,
                          ]}
                          onPress={() => updateRounding('rule', option.value)}
                        >
                          <Text
                            style={[
                              styles.roundingOptionText,
                              policy.rounding?.rule === option.value && styles.roundingOptionTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.roundingField}>
                    <Text style={styles.roundingLabel}>Decimal Precision</Text>
                    <TextInput
                      style={styles.roundingInput}
                      value={String(policy.rounding?.decimals || 2)}
                      onChangeText={(text) => updateRounding('decimals', parseInt(text) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Right Column - Preview */}
          <View style={styles.rightColumn}>
            <View style={styles.previewCard}>
              <LinearGradient
                colors={['#1f2937', '#111827']}
                style={styles.previewGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.previewHeader}>
                  <View style={styles.previewHeaderLeft}>
                    <View style={styles.previewIcon}>
                      <Calculator size={20} color="#8b5cf6" />
                    </View>
                    <Text style={styles.previewTitle}>Payroll Calculator</Text>
                  </View>
                  <TouchableOpacity onPress={triggerPreview} style={styles.previewRefresh}>
                    <RefreshCcw size={20} color="#8b5cf6" />
                  </TouchableOpacity>
                </View>

                {previewLoading ? (
                  <View style={styles.previewLoading}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.previewLoadingText}>Aggregating Policy Data...</Text>
                  </View>
                ) : preview ? (
                  <View style={styles.previewContent}>
                    <View style={styles.previewStats}>
                      <View style={styles.previewStat}>
                        <Text style={styles.previewStatLabel}>Monthly CTC Base</Text>
                        <Text style={styles.previewStatValue}>
                          ₹{preview.ctc?.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.previewDivider} />
                      <View style={styles.previewStat}>
                        <Text style={styles.previewStatLabel}>Sample Employee</Text>
                        <Text style={styles.previewStatValue}>{preview.sampleEmployee}</Text>
                      </View>
                    </View>

                    <View style={styles.previewBreakdown}>
                      <Text style={styles.previewBreakdownTitle}>Calculated Breakdown</Text>

                      <View style={styles.previewEarnings}>
                        <Text style={styles.previewEarningsTitle}>Earnings</Text>
                        {preview.breakdown?.earnings?.components?.map((comp, idx) => (
                          <View key={idx} style={styles.previewRow}>
                            <Text style={styles.previewRowLabel}>{comp.name}</Text>
                            <Text style={styles.previewRowValueEarning}>+{comp.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.previewDeductions}>
                        <Text style={styles.previewDeductionsTitle}>Deductions</Text>
                        {preview.breakdown?.deductions?.components?.map((comp, idx) => (
                          <View key={idx} style={styles.previewRow}>
                            <Text style={styles.previewRowLabel}>{comp.name}</Text>
                            <Text style={styles.previewRowValueDeduction}>-{comp.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View style={styles.previewNetPay}>
                      <Text style={styles.previewNetPayLabel}>Approx. Net Payout</Text>
                      <View style={styles.previewNetPayValue}>
                        <IndianRupee size={24} color="#10b981" />
                        <Text style={styles.previewNetPayAmount}>
                          {preview.breakdown?.netPay?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.previewEmpty}>
                    <Briefcase size={48} color="#374151" />
                    <Text style={styles.previewEmptyText}>No preview data available</Text>
                    <TouchableOpacity onPress={triggerPreview}>
                      <Text style={styles.previewEmptyLink}>Generate Preview</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </LinearGradient>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 20,
  },
  versionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  versionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  mainContent: {
    flexDirection: 'column',
    gap: 20,
    alignItems: 'stretch',
  },
  leftColumn: {
    width: '100%',
  },
  rightColumn: {
    width: '100%',
    marginTop: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    minWidth: '45%', // Allow 2 tabs per row on very small screens if needed
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  componentsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  componentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fafafa',
  },
  componentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  componentsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  componentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  componentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    position: 'relative',
  },
  componentRemoveButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  componentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  componentField: {
    flex: 1,
    minWidth: 140, // Ensure fields don't get too narrow
    marginBottom: 8,
  },
  componentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  componentInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  flex1: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  typeOptionActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeOptionTextActive: {
    color: '#6366f1',
  },
  calculationSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  calcOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  calcOptionActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  calcOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  calcOptionTextActive: {
    color: '#6366f1',
  },
  valueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  valueIcon: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  valueInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  formulaInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#6366f1',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  emptyComponents: {
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyComponentsText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyComponentsLink: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
  statutoryContainer: {
    gap: 16,
  },
  statutoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  statutoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statutoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statutoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statutoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statutorySubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  statutoryContent: {
    padding: 16,
    gap: 16,
  },
  statutoryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statutoryField: {
    marginBottom: 0,
  },
  statutoryFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statutoryInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  wageLimitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  wageLimitField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  attendanceContainer: {
    gap: 16,
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  attendanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  attendanceField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  attendanceFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  attendanceFieldHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  attendanceFieldInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
    minWidth: 60,
    textAlign: 'right',
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  switchFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  switchFieldHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  roundingContainer: {
    gap: 16,
  },
  roundingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    padding: 16,
  },
  roundingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  roundingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  roundingField: {
    marginBottom: 20,
  },
  roundingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  roundingOptions: {
    gap: 8,
  },
  roundingOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
  },
  roundingOptionActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  roundingOptionText: {
    fontSize: 13,
    color: '#6b7280',
  },
  roundingOptionTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  roundingInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  previewCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  previewGradient: {
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  previewRefresh: {
    padding: 8,
  },
  previewLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  previewLoadingText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  previewContent: {
    gap: 20,
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    marginBottom: 16,
  },
  previewStat: {
    flex: 1,
    alignItems: 'center',
  },
  previewStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  previewDivider: {
    width: 1,
    backgroundColor: '#374151',
    marginHorizontal: 10,
  },
  previewBreakdown: {
    gap: 12,
  },
  previewBreakdownTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewEarnings: {
    gap: 8,
  },
  previewEarningsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  previewDeductions: {
    gap: 8,
  },
  previewDeductionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewRowLabel: {
    fontSize: 12,
    color: '#d1d5db',
  },
  previewRowValueEarning: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  previewRowValueDeduction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  previewNetPay: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    alignItems: 'center',
  },
  previewNetPayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  previewNetPayValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewNetPayAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10b981',
  },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  previewEmptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  previewEmptyLink: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 48,
    maxWidth: 320,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  confirmButtonDelete: {
    backgroundColor: '#fee2e2',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButtonDeleteText: {
    color: '#ef4444',
  },
} as const;