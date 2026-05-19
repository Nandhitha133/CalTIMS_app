// src/screens/settings/tabs/LeavePolicyTab.tsx
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
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CalendarOff,
  Settings2,
  Save,
  Plus,
  X,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { settingsAPI } from '../../../services/endpoints';
import { useAuthStore } from '../../../store/authStore';
import Header from '../../../components/common/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface LeavePolicy {
  annualLeaveDays: number;
  sickLeaveDays: number;
  casualLeaveDays: number;
  maxCarryForward: number;
  approvalWorkflow: string;
}

// Section Card Component
const SectionCard = ({ title, subtitle, icon: Icon, children }: any) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <View style={styles.cardIconContainer}>
          <Icon size={20} color="#6366f1" />
        </View>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
    <View style={styles.cardDivider} />
    <View style={styles.cardContent}>
      {children}
    </View>
  </View>
);

// Leave Type Card Component
const LeaveTypeCard = ({
  leaveType,
  isEligible,
  onToggleEligibility,
  onRemove,
  index
}: {
  leaveType: string;
  isEligible: boolean;
  onToggleEligibility: () => void;
  onRemove: () => void;
  index: number;
}) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  return (
    <>
      <View style={[styles.leaveTypeCard, isEligible && styles.leaveTypeCardEligible]}>
        <View style={styles.leaveTypeHeader}>
          <Text style={styles.leaveTypeName} numberOfLines={1}>
            {leaveType}
          </Text>
          <TouchableOpacity
            onPress={() => setShowRemoveConfirm(true)}
            style={styles.leaveTypeRemove}
          >
            <X size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.eligibilityButton, isEligible && styles.eligibilityButtonActive]}
          onPress={onToggleEligibility}
        >
          <View style={[styles.eligibilityDot, isEligible && styles.eligibilityDotActive]} />
          <Text style={[styles.eligibilityText, isEligible && styles.eligibilityTextActive]}>
            {isEligible ? 'Deductible' : 'Unpaid/Static'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Remove Confirmation Modal */}
      <Modal visible={showRemoveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Remove Leave Type</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to remove "{leaveType}"?
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
                  onRemove();
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
    </>
  );
};

// Add Leave Type Modal
const AddLeaveTypeModal = ({
  visible,
  onClose,
  onAdd
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (value: string) => void;
}) => {
  const [newLeaveType, setNewLeaveType] = useState('');

  const handleAdd = () => {
    if (newLeaveType.trim()) {
      onAdd(newLeaveType.trim());
      setNewLeaveType('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.addModal}>
          <View style={styles.addModalHeader}>
            <Text style={styles.addModalTitle}>Add Leave Type</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.addModalContent}>
            <TextInput
              style={styles.addModalInput}
              placeholder="e.g., Bereavement, Comp Off..."
              placeholderTextColor="#9ca3af"
              value={newLeaveType}
              onChangeText={setNewLeaveType}
              autoFocus
            />
            <TouchableOpacity
              style={styles.addModalButton}
              onPress={handleAdd}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.addModalButtonGradient}
              >
                <Plus size={18} color="#ffffff" />
                <Text style={styles.addModalButtonText}>Add Leave Type</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Allowance Slider Component
const AllowanceSlider = ({
  label,
  value,
  max,
  color,
  onChange
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  onChange: (value: number) => void;
}) => {
  const [showValueModal, setShowValueModal] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  const handleValueChange = () => {
    const numValue = parseInt(tempValue) || 0;
    onChange(Math.min(max, Math.max(0, numValue)));
    setShowValueModal(false);
  };

  return (
    <View style={styles.allowanceContainer}>
      <View style={styles.allowanceHeader}>
        <Text style={styles.allowanceLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.allowanceValueBadge}
          onPress={() => {
            setTempValue(String(value));
            setShowValueModal(true);
          }}
        >
          <Text style={styles.allowanceValueText}>{value} DAYS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderFill,
              { width: `${(value / max) * 100}%`, backgroundColor: color }
            ]}
          />
        </View>
        <View style={styles.sliderMarks}>
          {[0, max / 2, max].map((mark, idx) => (
            <Text key={idx} style={styles.sliderMark}>{mark}</Text>
          ))}
        </View>
      </View>

      {/* Value Edit Modal */}
      <Modal visible={showValueModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.valueModal}>
            <Text style={styles.valueModalTitle}>Set {label}</Text>
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

export default function LeavePolicyTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { isPro } = useAuthStore();

  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  const [eligibleLeaveTypes, setEligibleLeaveTypes] = useState<string[]>([]);
  const [policy, setPolicy] = useState<LeavePolicy>({
    annualLeaveDays: 20,
    sickLeaveDays: 10,
    casualLeaveDays: 6,
    maxCarryForward: 5,
    approvalWorkflow: 'Employee -> Manager'
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch settings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response: any = await settingsAPI.getSettings();
      return response.data?.data || response.data || response;
    },
  });

  useEffect(() => {
    if (data?.leavePolicy) {
      setLeaveTypes(data.leavePolicy.leaveTypes || []);
      setEligibleLeaveTypes(data.leavePolicy.eligibleLeaveTypes || []);
      setPolicy({
        annualLeaveDays: data.leavePolicy.annualLeaveDays || 20,
        sickLeaveDays: data.leavePolicy.sickLeaveDays || 10,
        casualLeaveDays: data.leavePolicy.casualLeaveDays || 6,
        maxCarryForward: data.leavePolicy.maxCarryForward || 5,
        approvalWorkflow: data.leavePolicy.approvalWorkflow || 'Employee -> Manager'
      });
    }
  }, [data]);

  const updatePolicy = (key: keyof LeavePolicy, value: number) => {
    setPolicy(prev => ({ ...prev, [key]: value }));
  };

  const toggleEligibility = (leaveType: string) => {
    const lowerType = leaveType.toLowerCase();
    if (eligibleLeaveTypes.includes(lowerType)) {
      setEligibleLeaveTypes(eligibleLeaveTypes.filter(t => t !== lowerType));
    } else {
      setEligibleLeaveTypes([...eligibleLeaveTypes, lowerType]);
    }
  };

  const addLeaveType = (newType: string) => {
    const exists = leaveTypes.some(t => t.toLowerCase() === newType.toLowerCase());
    if (exists) {
      Alert.alert('Error', 'Leave type already exists');
      return;
    }
    setLeaveTypes([...leaveTypes, newType]);
  };

  const removeLeaveType = (index: number) => {
    const typeToRemove = leaveTypes[index];
    setLeaveTypes(leaveTypes.filter((_, i) => i !== index));
    // Also remove from eligible if present
    const lowerType = typeToRemove.toLowerCase();
    if (eligibleLeaveTypes.includes(lowerType)) {
      setEligibleLeaveTypes(eligibleLeaveTypes.filter(t => t !== lowerType));
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        leavePolicy: {
          leaveTypes,
          eligibleLeaveTypes,
          ...policy
        }
      };
      const response: any = await settingsAPI.updateSettings(payload);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Success', 'Leave Policy updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save policy');
    },
  });

  const handleSave = () => {
    if (!isPro()) {
      Alert.alert(
        'Upgrade Required',
        'Leave policy settings are available on PRO plan only. Please upgrade to continue.',
        [{ text: 'OK' }]
      );
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading leave policy...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title="Leave Policy"
        showBackButton={true}
        showSidebarButton={false}
        onBackPress={() => navigation.navigate('Settings' as never)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leave Policy</Text>
          <Text style={styles.headerSubtitle}>
            Configure global rules for employee time-off and entitlements
          </Text>
        </View>

        <View style={styles.mainContent}>
          {/* Left Column */}
          <View style={styles.leftColumn}>
            <SectionCard
              title="Leave Library"
              subtitle="Define the range of time-off categories available"
              icon={Briefcase}
            >
              <View style={styles.leaveLibraryContent}>
                {/* Leave Types Grid */}
                <View>
                  <Text style={styles.sectionLabel}>Defined Categories & Eligibility</Text>
                  <View style={styles.leaveTypesGrid}>
                    {leaveTypes.map((leaveType, index) => (
                      <LeaveTypeCard
                        key={index}
                        leaveType={leaveType}
                        isEligible={eligibleLeaveTypes.includes(leaveType.toLowerCase())}
                        onToggleEligibility={() => toggleEligibility(leaveType)}
                        onRemove={() => removeLeaveType(index)}
                        index={index}
                      />
                    ))}
                  </View>
                </View>

                {/* Add New Leave Type Button */}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Plus size={18} color="#6366f1" />
                  <Text style={styles.addButtonText}>Add custom type</Text>
                </TouchableOpacity>

                {/* Pro Tip Box */}
                <View style={styles.proTipBox}>
                  <Settings2 size={18} color="#6366f1" />
                  <Text style={styles.proTipText}>
                    <Text style={styles.proTipBold}>Pro-tip:</Text> Marking a category as{' '}
                    <Text style={styles.proTipHighlight}>Deductible</Text> ensures it tracks
                    against an employee's annual, sick, or casual allowance pool.
                  </Text>
                </View>
              </View>
            </SectionCard>
          </View>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* Standard Allowances */}
            <SectionCard
              title="Standard Allowances"
              subtitle="Yearly entitlement pools"
              icon={TrendingUp}
            >
              <View style={styles.allowancesContent}>
                <AllowanceSlider
                  label="Paid Vacation"
                  value={policy.annualLeaveDays}
                  max={40}
                  color="#6366f1"
                  onChange={(value) => updatePolicy('annualLeaveDays', value)}
                />
                <AllowanceSlider
                  label="Medical / Sick"
                  value={policy.sickLeaveDays}
                  max={30}
                  color="#ec4899"
                  onChange={(value) => updatePolicy('sickLeaveDays', value)}
                />
                <AllowanceSlider
                  label="Personal / Casual"
                  value={policy.casualLeaveDays}
                  max={15}
                  color="#f59e0b"
                  onChange={(value) => updatePolicy('casualLeaveDays', value)}
                />
              </View>
            </SectionCard>

            {/* Carry Forward */}
            <SectionCard
              title="Carry Forward"
              subtitle="Year-end balance rollover"
              icon={CalendarOff}
            >
              <View style={styles.carryForwardContent}>
                <View>
                  <Text style={styles.sectionLabel}>Rollover Capacity</Text>
                  <View style={styles.carryForwardInput}>
                    <TextInput
                      style={styles.carryForwardField}
                      value={String(policy.maxCarryForward)}
                      onChangeText={(text) => updatePolicy('maxCarryForward', parseInt(text) || 0)}
                      keyboardType="numeric"
                    />
                    <Text style={styles.carryForwardUnit}>Days / Year</Text>
                  </View>
                </View>

                <View style={styles.fiscalYearBox}>
                  <Text style={styles.fiscalYearTitle}>Fiscal Year Rule</Text>
                  <Text style={styles.fiscalYearText}>
                    Eligible leave types allow balance transfers up to this limit.
                    Overages are purged on April 1st.
                  </Text>
                </View>
              </View>
            </SectionCard>

            {/* Approval Workflow (Optional - add if needed) */}
            <SectionCard
              title="Approval Workflow"
              subtitle="Leave request approval hierarchy"
              icon={Clock}
            >
              <View style={styles.workflowContent}>
                <View style={styles.workflowBadge}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.workflowText}>{policy.approvalWorkflow}</Text>
                </View>
                <Text style={styles.workflowHint}>
                  This workflow applies to all leave requests by default.
                </Text>
              </View>
            </SectionCard>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={20} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Authorize Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Leave Type Modal */}
      <AddLeaveTypeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addLeaveType}
      />
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
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  mainContent: {
    flexDirection: 'column',
    gap: 20,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  cardContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  leaveLibraryContent: {
    gap: 16,
  },
  leaveTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  leaveTypeCard: {
    width: (SCREEN_WIDTH - 64) / 2 - 6,
    backgroundColor: '#fafafa',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 12,
    gap: 10,
  },
  leaveTypeCardEligible: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  leaveTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveTypeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  leaveTypeRemove: {
    padding: 4,
  },
  eligibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  eligibilityButtonActive: {
    backgroundColor: '#6366f1',
  },
  eligibilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
  },
  eligibilityDotActive: {
    backgroundColor: '#ffffff',
  },
  eligibilityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  eligibilityTextActive: {
    color: '#ffffff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  proTipBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  proTipText: {
    flex: 1,
    fontSize: 11,
    color: '#374151',
    lineHeight: 16,
  },
  proTipBold: {
    fontWeight: '700',
    color: '#6366f1',
  },
  proTipHighlight: {
    fontWeight: '700',
    color: '#6366f1',
  },
  allowancesContent: {
    gap: 24,
    paddingVertical: 8,
  },
  allowanceContainer: {
    gap: 12,
  },
  allowanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allowanceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  allowanceValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  allowanceValueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  sliderContainer: {
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
  carryForwardContent: {
    gap: 16,
  },
  carryForwardInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  carryForwardField: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  carryForwardUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fiscalYearBox: {
    padding: 14,
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  fiscalYearTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fiscalYearText: {
    fontSize: 10,
    color: '#92400e',
    lineHeight: 14,
  },
  workflowContent: {
    gap: 12,
  },
  workflowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  workflowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  workflowHint: {
    fontSize: 10,
    color: '#6b7280',
  },
  saveButtonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  addModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: SCREEN_WIDTH,
    position: 'absolute',
    bottom: 0,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addModalContent: {
    padding: 20,
    gap: 16,
  },
  addModalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  addModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addModalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  valueModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 48,
    maxWidth: 320,
  },
  valueModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  valueModalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  valueModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  valueModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  valueModalButtonCancel: {
    backgroundColor: '#f3f4f6',
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
    color: '#ffffff',
  },
} as const;