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
import Header from '../../../components/common/Header';
import LinearGradient from 'react-native-linear-gradient';

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
    Toast.show({
      type: 'warning',
      text1: 'Warning',
      text2: 'Backdated entries are now allowed. Please use with caution.',
      visibilityTime: 4000,
    });
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
      Toast.show({ type: 'success', text1: 'Success', text2: 'Compliance policy updated!' });
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'Save failed' });
    },
  });

  const handleSave = () => {
    if (JSON.stringify(compliance) === initialState) {
      Toast.show({ type: 'info', text1: 'Info', text2: 'There is nothing to change' });
      return;
    }

    // Validate before saving
    if (compliance.timesheetFreezeDay < 1 || compliance.timesheetFreezeDay > 31) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Freeze day must be between 1 and 31' });
      return;
    }

    if (compliance.auditLogRetentionDays < 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Retention days cannot be negative' });
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title="Compliance & Data Integrity"
        showBackButton={true}
        showSidebarButton={false}
        onBackPress={() => navigation.navigate('Settings' as never)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Sticky Header */}
        <View style={styles.stickyHeader}>
          <View>
            <Text style={styles.title}>Compliance & Data Integrity</Text>
            <Text style={styles.description}>Enforce regulatory boundaries and historical data preservation</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            <LinearGradient
              colors={['#1e293b', '#0f172a']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.gridContainer}>
          {/* Temporal Constraints Section */}
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
      </ScrollView>
    </KeyboardAvoidingView>
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
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 14,
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
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  sectionContent: {
    padding: 16,
    gap: 20,
  },
  freezeDayContainer: {
    gap: 12,
  },
  freezeDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freezeDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freezeDayBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  freezeDayBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  sliderWrapper: {
    gap: 8,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderMark: {
    fontSize: 9,
    color: '#94a3b8',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  infoBoxWarning: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 10,
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
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconActive: {
    backgroundColor: '#f59e0b',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  toggleStatus: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  toggleStatusActive: {
    color: '#f59e0b',
  },
  toggleStatusInactive: {
    color: '#94a3b8',
  },
  retentionContainer: {
    gap: 12,
  },
  retentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retentionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  retentionBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  retentionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  summaryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c7d2fe',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  summaryStatValueWarning: {
    color: '#fbbf24',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  summaryFooterText: {
    fontSize: 10,
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
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
  },
  valueModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  valueModalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
  },
  valueModalUnit: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 20,
  },
  valueModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  valueModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  valueModalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  valueModalButtonConfirm: {
    backgroundColor: '#6366f1',
  },
  valueModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  valueModalButtonConfirmText: {
    color: '#fff',
  },
  warningModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 48,
  },
  warningModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  warningModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  warningModalMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 20,
  },
  warningModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  warningModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  warningModalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  warningModalButtonConfirm: {
    backgroundColor: '#f59e0b',
  },
  warningModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  warningModalButtonConfirmText: {
    color: '#fff',
  },
});