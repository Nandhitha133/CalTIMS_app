// screens/settings/tabs/ComplianceLocksTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {
  Lock,
  FileWarning,
  ShieldCheck,
  CalendarCheck,
  AlertTriangle,
  Info,
  Clock,
  Save,
  AlertCircle
} from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import { useSocketEvent } from '../../../services/socket';
import { useAuthStore } from '../../../store/authStore';
import Layout from '../../../components/common/Layout';
import PageHeader from '../../../components/common/PageHeader';
import LinearGradient from 'react-native-linear-gradient';
import { scale, verticalScale, moderateScale } from '../../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface ComplianceConfig {
  timesheetFreezeDay: number;
  allowBackdatedEntries: boolean;
  auditLogRetentionDays: number;
}

// Section Card Component
const SectionCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  subtitle: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={styles.sectionIconContainer}>
            <Icon size={20} color="#6366f1" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
      <View style={styles.sectionDivider} />
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

// Freeze Day Slider Component
const FreezeDaySlider = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const [showValueModal, setShowValueModal] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  const handleValueChange = () => {
    const numValue = parseInt(tempValue) || 1;
    onChange(Math.min(31, Math.max(1, numValue)));
    setShowValueModal(false);
  };

  return (
    <View style={styles.freezeDayContainer}>
      <View style={styles.freezeDayHeader}>
        <Text style={styles.freezeDayLabel}>Freeze Day of Month</Text>
        <TouchableOpacity
          style={styles.freezeDayBadge}
          onPress={() => {
            setTempValue(String(value));
            setShowValueModal(true);
          }}
        >
          <Text style={styles.freezeDayBadgeText}>{value}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderWrapper}>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${(value / 31) * 100}%`, backgroundColor: '#6366f1' }]} />
        </View>
        <View style={styles.sliderMarks}>
          <Text style={styles.sliderMark}>1</Text>
          <Text style={styles.sliderMark}>15</Text>
          <Text style={styles.sliderMark}>31</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Info size={14} color="#6366f1" />
        <Text style={styles.infoBoxText}>
          Entries from the previous month will be frozen on this day of the current month.
        </Text>
      </View>

      {/* Value Edit Modal */}
      <Modal visible={showValueModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.valueModal}>
            <Text style={styles.valueModalTitle}>Set Freeze Day</Text>
            <TextInput
              style={styles.valueModalInput}
              value={tempValue}
              onChangeText={setTempValue}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.valueModalButtons}>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonCancel]}
                onPress={() => setShowValueModal(false)}
              >
                <Text style={styles.valueModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonConfirm]}
                onPress={handleValueChange}
              >
                <Text style={[styles.valueModalButtonText, styles.valueModalButtonConfirmText]}>
                  Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Backdated Entries Toggle Component
const BackdatedEntriesToggle = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleToggle = () => {
    if (value === false) {
      // When enabling, show warning
      setShowConfirmModal(true);
    } else {
      onChange(false);
    }
  };

  const confirmEnable = () => {
    onChange(true);
    setShowConfirmModal(false);
    Alert.alert(
      'Warning',
      'Backdated entries are now allowed. Please use with caution.'
    );
  };

  return (
    <>
      <View style={styles.toggleCard}>
        <View style={styles.toggleLeft}>
          <View style={[styles.toggleIcon, value && styles.toggleIconActive]}>
            <CalendarCheck size={18} color={value ? '#fff' : '#64748b'} />
          </View>
          <View>
            <Text style={styles.toggleTitle}>Backdated Entries</Text>
            <Text style={[styles.toggleStatus, value ? styles.toggleStatusActive : styles.toggleStatusInactive]}>
              {value ? 'UNRESTRICTED' : 'FORBIDDEN'}
            </Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={handleToggle}
          trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
          thumbColor="#ffffff"
        />
      </View>

      {/* Warning Modal for enabling backdated entries */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.warningModal}>
            <View style={styles.warningModalHeader}>
              <AlertTriangle size={24} color="#f59e0b" />
              <Text style={styles.warningModalTitle}>Enable Backdated Entries?</Text>
            </View>
            <Text style={styles.warningModalMessage}>
              Allowing backdated entries can affect payroll accuracy and audit trails. 
              Please ensure this is compliant with your organization's policies.
            </Text>
            <View style={styles.warningModalButtons}>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.warningModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningModalButton, styles.warningModalButtonConfirm]}
                onPress={confirmEnable}
              >
                <Text style={[styles.warningModalButtonText, styles.warningModalButtonConfirmText]}>
                  Yes, Enable
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Retention Days Slider Component
const RetentionDaysSlider = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const [showValueModal, setShowValueModal] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  const handleValueChange = () => {
    const numValue = parseInt(tempValue) || 0;
    onChange(Math.max(0, Math.min(730, numValue)));
    setShowValueModal(false);
  };

  // Convert days to slider position (0-730 days -> 0-100%)
  const getSliderPosition = (days: number) => {
    return Math.min(100, (days / 730) * 100);
  };

  return (
    <View style={styles.retentionContainer}>
      <View style={styles.retentionHeader}>
        <Text style={styles.retentionLabel}>Audit Log Retention (Days)</Text>
        <TouchableOpacity
          style={styles.retentionBadge}
          onPress={() => {
            setTempValue(String(value));
            setShowValueModal(true);
          }}
        >
          <Text style={styles.retentionBadgeText}>{value} DAYS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderWrapper}>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${getSliderPosition(value)}%`, backgroundColor: '#6366f1' }]} />
        </View>
        <View style={styles.sliderMarks}>
          <Text style={styles.sliderMark}>0</Text>
          <Text style={styles.sliderMark}>1Y</Text>
          <Text style={styles.sliderMark}>2Y</Text>
        </View>
      </View>

      <View style={[styles.infoBox, styles.infoBoxWarning]}>
        <AlertCircle size={14} color="#dc2626" />
        <Text style={[styles.infoBoxText, styles.infoBoxTextWarning]}>
          System logs older than this will be permanently deleted for optimization.
        </Text>
      </View>

      {/* Value Edit Modal */}
      <Modal visible={showValueModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.valueModal}>
            <Text style={styles.valueModalTitle}>Set Retention Period</Text>
            <TextInput
              style={styles.valueModalInput}
              value={tempValue}
              onChangeText={setTempValue}
              keyboardType="numeric"
              autoFocus
            />
            <Text style={styles.valueModalUnit}>Days</Text>
            <View style={styles.valueModalButtons}>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonCancel]}
                onPress={() => setShowValueModal(false)}
              >
                <Text style={styles.valueModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.valueModalButton, styles.valueModalButtonConfirm]}
                onPress={handleValueChange}
              >
                <Text style={[styles.valueModalButtonText, styles.valueModalButtonConfirmText]}>
                  Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Main Component
export default function ComplianceLocksTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [compliance, setCompliance] = useState<ComplianceConfig>({
    timesheetFreezeDay: 28,
    allowBackdatedEntries: false,
    auditLogRetentionDays: 365,
  });
  const [initialState, setInitialState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings().then((r: any) => r?.data?.data ?? r?.data ?? r ?? null),
  });

  useFocusEffect(
      useCallback(() => {
        refetch();
      }, [refetch])
    );
  
    useSocketEvent('settings_updated', (payload) => {
      console.log('[Socket] Settings updated event received in ComplianceLocksTab:', payload);
      refetch();
    });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refetch();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refetch]);

  useEffect(() => {
    if (data?.compliance) {
      const loaded = {
        timesheetFreezeDay: data.compliance.timesheetFreezeDay || 28,
        allowBackdatedEntries: !!data.compliance.allowBackdatedEntries,
        auditLogRetentionDays: data.compliance.auditLogRetentionDays || 365,
      };
      setCompliance(loaded);
      setInitialState(JSON.stringify(loaded));
    }
  }, [data]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateCompliance = <K extends keyof ComplianceConfig>(key: K, value: ComplianceConfig[K]) => {
    setCompliance(prev => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.updateSettings({ compliance }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setInitialState(JSON.stringify(compliance));
      Alert.alert('Success', 'Compliance policy updated!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Save failed');
    },
  });

  const handleSave = () => {
    if (JSON.stringify(compliance) === initialState) {
      Alert.alert('Info', 'There is nothing to change');
      return;
    }

    // Validate before saving
    if (compliance.timesheetFreezeDay < 1 || compliance.timesheetFreezeDay > 31) {
      Alert.alert('Validation Error', 'Freeze day must be between 1 and 31');
      return;
    }

    if (compliance.auditLogRetentionDays < 0) {
      Alert.alert('Validation Error', 'Retention days cannot be negative');
      return;
    }

    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading compliance settings...</Text>
      </View>
    );
  }

  return (
    <Layout
      title="Compliance & Locks"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={isLoading}
      onRefresh={handleRefresh}
      scrollable={false}
      backgroundColor="#f8fafc"
      showBackButton={true}
      onBackPress={() => navigation.navigate('Settings' as never)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader
            title="Institutional Integrity"
            subtitle="Configure governance rules, data locks, and audit retention standards"
            icon={ShieldCheck}
            iconColor="#6366f1"
            iconBgColor="#eef2ff"
          />

          {/* Sticky Header - Moved content out */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.title}>System Compliance</Text>
              <Text style={styles.description}>Manage organizational guardrails and transparency</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            {/* Timesheet Rules Section */}
          <SectionCard 
            title="Temporal Constraints" 
            subtitle="Locking mechanisms for previous cycles" 
            icon={Lock}
          >
            <FreezeDaySlider 
              value={compliance.timesheetFreezeDay} 
              onChange={(value) => updateCompliance('timesheetFreezeDay', value)} 
            />

            <BackdatedEntriesToggle 
              value={compliance.allowBackdatedEntries} 
              onChange={(value) => updateCompliance('allowBackdatedEntries', value)} 
            />
          </SectionCard>

          {/* Traceability Section */}
          <SectionCard 
            title="Traceability" 
            subtitle="System logging and data retention" 
            icon={FileWarning}
          >
            <RetentionDaysSlider 
              value={compliance.auditLogRetentionDays} 
              onChange={(value) => updateCompliance('auditLogRetentionDays', value)} 
            />
          </SectionCard>
        </View>

        {/* Compliance Summary Card */}
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.summaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryHeader}>
              <ShieldCheck size={24} color="#fff" />
              <Text style={styles.summaryTitle}>Compliance Status</Text>
            </View>

            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Freeze Day</Text>
                <Text style={styles.summaryStatValue}>{compliance.timesheetFreezeDay}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Backdated Entries</Text>
                <Text style={[styles.summaryStatValue, compliance.allowBackdatedEntries && styles.summaryStatValueWarning]}>
                  {compliance.allowBackdatedEntries ? 'Allowed' : 'Blocked'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Retention</Text>
                <Text style={styles.summaryStatValue}>{compliance.auditLogRetentionDays}d</Text>
              </View>
            </View>

            <View style={styles.summaryFooter}>
              <Clock size={12} color="#c7d2fe" />
              <Text style={styles.summaryFooterText}>
                Changes will be applied immediately to all future transactions
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Bottom Save Button */}
          <TouchableOpacity
            style={styles.bottomSaveButton}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
              style={styles.bottomSaveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Save size={20} color="white" />
                  <Text style={styles.bottomSaveButtonText}>Enforce Policy</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: moderateScale(16),
    paddingBottom: verticalScale(32),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(14),
    color: '#64748b',
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    flexWrap: 'wrap',
    gap: moderateScale(12),
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#1e293b',
  },
  description: {
    fontSize: moderateScale(13),
    color: '#64748b',
    marginTop: verticalScale(4),
  },
  saveButton: {
    borderRadius: moderateScale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  bottomSaveButton: {
    marginTop: verticalScale(24),
    marginBottom: verticalScale(40),
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSaveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', 
    paddingVertical: verticalScale(16),
    gap: moderateScale(10),
  },
  bottomSaveButtonText: {
    color: '#ffffff', 
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  sectionHeaderRow: {
    marginBottom: verticalScale(20),
  },
  gridContainer: {
    gap: moderateScale(16),
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(24),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: verticalScale(16),
  },
  sectionHeader: {
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  sectionIconContainer: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(12),
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: moderateScale(11),
    color: '#64748b',
    marginTop: verticalScale(2),
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  sectionContent: {
    padding: moderateScale(16),
    gap: moderateScale(20),
  },
  freezeDayContainer: {
    gap: moderateScale(12),
  },
  freezeDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freezeDayLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freezeDayBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  freezeDayBadgeText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#6366f1',
  },
  sliderWrapper: {
    gap: moderateScale(8),
  },
  sliderTrack: {
    height: verticalScale(4),
    backgroundColor: '#e2e8f0',
    borderRadius: moderateScale(2),
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: moderateScale(2),
  },
  sliderMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(4),
  },
  sliderMark: {
    fontSize: moderateScale(9),
    color: '#94a3b8',
  },
  infoBox: {
    flexDirection: 'row',
    gap: moderateScale(10),
    padding: moderateScale(12),
    backgroundColor: '#eef2ff',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  infoBoxWarning: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  infoBoxText: {
    flex: 1,
    fontSize: moderateScale(10),
    color: '#4f46e5',
    lineHeight: 14,
  },
  infoBoxTextWarning: {
    color: '#dc2626',
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(12),
    backgroundColor: '#fafafa',
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  toggleIcon: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(10),
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconActive: {
    backgroundColor: '#f59e0b',
  },
  toggleTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1e293b',
  },
  toggleStatus: {
    fontSize: moderateScale(9),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  toggleStatusActive: {
    color: '#f59e0b',
  },
  toggleStatusInactive: {
    color: '#94a3b8',
  },
  retentionContainer: {
    gap: moderateScale(12),
  },
  retentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retentionLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  retentionBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  retentionBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#dc2626',
  },
  summaryCard: {
    borderRadius: moderateScale(24),
    overflow: 'hidden',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(32),
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryGradient: {
    padding: moderateScale(20),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    marginBottom: verticalScale(20),
  },
  summaryTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#fff',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: verticalScale(16),
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#c7d2fe',
    textTransform: 'uppercase',
    marginBottom: verticalScale(4),
  },
  summaryStatValue: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#fff',
  },
  summaryStatValueWarning: {
    color: '#fbbf24',
  },
  summaryDivider: {
    width: 1,
    height: verticalScale(30),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    justifyContent: 'center',
  },
  summaryFooterText: {
    fontSize: moderateScale(10),
    color: '#c7d2fe',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueModal: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(20),
    padding: moderateScale(20),
    width: SCREEN_WIDTH - scale(48),
    alignItems: 'center',
  },
  valueModalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: verticalScale(16),
  },
  valueModalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    width: '100%',
    marginBottom: verticalScale(8),
  },
  valueModalUnit: {
    fontSize: moderateScale(12),
    color: '#64748b',
    marginBottom: verticalScale(20),
  },
  valueModalButtons: {
    flexDirection: 'row',
    gap: moderateScale(12),
    width: '100%',
  },
  valueModalButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
  valueModalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  valueModalButtonConfirm: {
    backgroundColor: '#6366f1',
  },
  valueModalButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
  },
  valueModalButtonConfirmText: {
    color: '#fff',
  },
  warningModal: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(20),
    padding: moderateScale(20),
    width: SCREEN_WIDTH - scale(48),
  },
  warningModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    marginBottom: verticalScale(16),
  },
  warningModalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#1e293b',
  },
  warningModalMessage: {
    fontSize: moderateScale(14),
    color: '#64748b',
    lineHeight: 20,
    marginBottom: verticalScale(20),
  },
  warningModalButtons: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  warningModalButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
  warningModalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  warningModalButtonConfirm: {
    backgroundColor: '#f59e0b',
  },
  warningModalButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
  },
  warningModalButtonConfirmText: {
    color: '#fff',
  },
});