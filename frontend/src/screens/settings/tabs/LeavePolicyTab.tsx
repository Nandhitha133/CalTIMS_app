// screens/settings/tabs/LeavePolicyTab.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { 
  Briefcase, 
  Stethoscope, 
  Coffee, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  ChevronRight, 
  Plus, 
  Save, 
  Trash2, 
  AlertCircle,
  X,
  LineChart
} from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import { useSocketEvent } from '../../../services/socket';
import { useAuthStore } from '../../../store/authStore';
import Layout from '../../../components/common/Layout';
import PageHeader from '../../../components/common/PageHeader';
import { scale, verticalScale, moderateScale } from '../../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface LeaveType {
  id: string;
  name: string;
  category: 'Paid' | 'Medical' | 'General';
  days: number;
  description: string;
}

// Default leave types
const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { id: 'lt-1', name: 'Annual Leave', category: 'Paid', days: 20, description: 'Statutory vacation time' },
  { id: 'lt-2', name: 'Sick Leave', category: 'Medical', days: 10, description: 'Medical recovery and health' },
  { id: 'lt-3', name: 'Casual Leave', category: 'General', days: 6, description: 'Personal matters and emergency' },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Paid: { bg: '#e0e7ff', text: '#4f46e5', border: '#c7d2fe' },
  Medical: { bg: '#ffe4e6', text: '#e11d48', border: '#fecdd3' },
  General: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
};

const CATEGORY_ICONS: Record<string, any> = {
  Paid: Briefcase,
  Medical: Stethoscope,
  General: Coffee,
};

// Section Card Component
const SectionCard = ({ 
  title, 
  subtitle, 
  icon: IconComponent, 
  children 
}: { 
  title: string; 
  subtitle: string; 
  icon: any; 
  children: React.ReactNode;
}) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={styles.sectionIconContainer}>
            <IconComponent size={20} color="#6366f1" />
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

// Leave Type Card Component
const LeaveTypeCard = ({ 
  leave, 
  onUpdate, 
  onDelete 
}: { 
  leave: LeaveType; 
  onUpdate: (updates: Partial<LeaveType>) => void;
  onDelete: () => void;
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const IconComponent = CATEGORY_ICONS[leave.category] || Briefcase;
  const categoryStyle = CATEGORY_STYLES[leave.category];

  return (
    <>
      <View style={styles.leaveTypeCard}>
        <View style={styles.leaveTypeHeader}>
          <View style={[styles.leaveTypeIcon, { backgroundColor: categoryStyle.bg }]}>
            <IconComponent size={20} color={categoryStyle.text} />
          </View>
          
          <View style={styles.leaveTypeInfo}>
            <TextInput
              style={styles.leaveTypeName}
              value={leave.name}
              onChangeText={(text) => onUpdate({ name: text })}
              placeholder="Leave name"
              placeholderTextColor="#94a3b8"
            />
            
            <View style={styles.leaveTypeMeta}>
              <TouchableOpacity
                style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg, borderColor: categoryStyle.border }]}
                onPress={() => {
                  const categories: ('Paid' | 'Medical' | 'General')[] = ['Paid', 'Medical', 'General'];
                  const currentIndex = categories.indexOf(leave.category);
                  const nextCategory = categories[(currentIndex + 1) % categories.length];
                  onUpdate({ category: nextCategory });
                }}
              >
                <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
                  {leave.category}
                </Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.leaveDescription}
                value={leave.description}
                onChangeText={(text) => onUpdate({ description: text })}
                placeholder="Brief purpose of this leave..."
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
          
          <View style={styles.leaveTypeActions}>
            <View style={styles.daysContainer}>
              <Text style={styles.daysLabel}>Days</Text>
              <TextInput
                style={styles.daysInput}
                value={String(leave.days)}
                onChangeText={(text) => {
                  const days = parseInt(text, 10) || 0;
                  if (days >= 0) onUpdate({ days });
                }}
                keyboardType="numeric"
              />
            </View>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setShowDeleteModal(true)}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Delete Leave Type</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete "{leave.name}"? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonDelete]}
                onPress={() => {
                  onDelete();
                  setShowDeleteModal(false);
                }}
              >
                <Text style={[styles.confirmButtonText, styles.confirmButtonDeleteText]}>
                  Delete
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
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (leaveType: Omit<LeaveType, 'id'>) => void;
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Paid' | 'Medical' | 'General'>('General');
  const [days, setDays] = useState('5');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Leave name is required');
      return;
    }
    onAdd({
      name: name.trim(),
      category,
      days: parseInt(days, 10) || 0,
      description: description.trim() || 'Custom leave category',
    });
    setName('');
    setCategory('General');
    setDays('5');
    setDescription('');
    onClose();
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
              placeholder="Leave name (e.g., Bereavement)"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
            
            <View style={styles.categorySelector}>
              {(['Paid', 'Medical', 'General'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionActive,
                    { backgroundColor: CATEGORY_STYLES[cat].bg },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryOptionText, { color: CATEGORY_STYLES[cat].text }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.addModalInput}
              placeholder="Days per year"
              placeholderTextColor="#94a3b8"
              value={days}
              onChangeText={setDays}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.addModalInput, styles.addModalTextArea]}
              placeholder="Description"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity style={styles.addModalButton} onPress={handleAdd}>
              <View style={styles.addModalButtonGradient}>
                <Plus size={18} color="#fff" />
                <Text style={styles.addModalButtonText}>Add Leave Type</Text>
              </View>
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
  onChange,
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
    const numValue = parseInt(tempValue, 10) || 0;
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

      <View style={styles.sliderWrapper}>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
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

// Main Component
export default function LeavePolicyTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [initialState, setInitialState] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch settings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings().then((r: any) => r?.data?.data ?? r?.data ?? r ?? null),
  });

  useSocketEvent('settings_updated', (payload) => {
    console.log('[Socket] Settings updated event received in LeavePolicyTab:', payload);
    refetch();
  });

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (data?.leavePolicy?.config) {
      setLeaveTypes(data.leavePolicy.config);
      setInitialState(JSON.stringify(data.leavePolicy.config));
    } else {
      setLeaveTypes(DEFAULT_LEAVE_TYPES);
      setInitialState(JSON.stringify(DEFAULT_LEAVE_TYPES));
    }
  }, [data]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateLeave = (id: string, updates: Partial<LeaveType>) => {
    setLeaveTypes(prev => prev.map(leave => 
      leave.id === id ? { ...leave, ...updates } : leave
    ));
  };

  const removeLeave = (id: string) => {
    setLeaveTypes(prev => prev.filter(leave => leave.id !== id));
  };

  const addLeave = (newLeave: Omit<LeaveType, 'id'>) => {
    const id = `lt-${Date.now()}`;
    setLeaveTypes(prev => [...prev, { id, ...newLeave }]);
  };

  // Validation
  const validation = useMemo(() => {
    const hasZero = leaveTypes.some(t => t.days <= 0);
    const hasEmptyName = leaveTypes.some(t => !t.name.trim());
    const names = leaveTypes.map(t => t.name.toLowerCase().trim());
    const hasDuplicates = new Set(names).size !== names.length;
    
    return {
      isValid: !hasZero && !hasEmptyName && !hasDuplicates,
      error: hasZero ? 'All leave types must have at least 1 day' :
             hasEmptyName ? 'Leave names cannot be empty' :
             hasDuplicates ? 'Leave names must be unique' : null,
      count: leaveTypes.length,
    };
  }, [leaveTypes]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.updateSettings({
      leavePolicy: {
        config: leaveTypes,
        updatedAt: new Date().toISOString(),
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setInitialState(JSON.stringify(leaveTypes));
      Alert.alert('Success', 'Leave Policy saved successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Save failed');
    },
  });

  const handleSave = () => {
    if (JSON.stringify(leaveTypes) === initialState) {
      Alert.alert('Info', 'There is nothing to change');
      return;
    }
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error || 'Invalid configuration');
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
    <Layout
      title="Leave Policy"
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
            title="Leave Management"
            subtitle="Configure leave types, accruals, and approval workflows"
            icon={Calendar}
            iconColor="#6366f1"
            iconBgColor="#eef2ff"
          />

          {/* Sticky Header with Save Button - Moved content out */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.title}>Global Leave Settings</Text>
              <Text style={styles.description}>Manage institutional leave entitlements</Text>
            </View>
          </View>

          {/* Leave Library Section */}
        <SectionCard title="Leave Library" subtitle="Define your standard time-off categories" icon={Briefcase}>
          <View style={styles.leaveLibraryContent}>
            {leaveTypes.map((leave) => (
              <LeaveTypeCard
                key={leave.id}
                leave={leave}
                onUpdate={(updates) => updateLeave(leave.id, updates)}
                onDelete={() => removeLeave(leave.id)}
              />
            ))}
            
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Plus size={18} color="#6366f1" />
              <Text style={styles.addButtonText}>Add Custom Type</Text>
            </TouchableOpacity>

            {/* Pro Tip Box */}
            <View style={styles.proTipBox}>
              <ShieldCheck size={18} color="#6366f1" />
              <Text style={styles.proTipText}>
                <Text style={styles.proTipBold}>Pro-tip:</Text> All adjusted values will apply to the next fiscal year balance calculation. Existing approved leaves will not be retroactively impacted by pool changes.
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Allowance Visualizer Section */}
        <SectionCard title="Allowance Visualizer" subtitle="Manage balance pools and day limits" icon={LineChart}>
          <View style={styles.allowancesContent}>
            {leaveTypes.map((leave) => (
              <View key={leave.id} style={styles.allowanceItem}>
                <View style={styles.allowanceItemHeader}>
                  <View>
                    <Text style={styles.allowanceItemName}>{leave.name}</Text>
                    <Text style={styles.allowanceItemSubtitle}>Standard Yearly Pool</Text>
                  </View>
                  <View style={[styles.allowanceItemBadge, { backgroundColor: CATEGORY_STYLES[leave.category].bg }]}>
                    <Text style={[styles.allowanceItemBadgeText, { color: CATEGORY_STYLES[leave.category].text }]}>
                      {leave.days} DAYS
                    </Text>
                  </View>
                </View>
                
                <View style={styles.sliderWrapper}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill, 
                        { 
                          width: `${(leave.days / 60) * 100}%`, 
                          backgroundColor: CATEGORY_STYLES[leave.category].text 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Compliance Lock Box */}
          <View style={styles.complianceBox}>
            <ShieldCheck size={14} color="#d97706" />
            <Text style={styles.complianceText}>
              <Text style={styles.complianceBold}>Compliance Lock:</Text> All adjusted values will apply to the next fiscal year balance calculation. Existing approved leaves will not be retroactively impacted by pool changes.
            </Text>
          </View>
        </SectionCard>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.bottomSaveButton}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={styles.saveButtonContent}>
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>Save Leave Policies</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Add Leave Type Modal */}
      <AddLeaveTypeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addLeave}
      />
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
    marginBottom: 20,
    gap: 16,
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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },
  statStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statStatusValid: {
    color: '#10b981',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  bottomSaveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeaderRow: {
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#e0e7ff',
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
  },
  leaveLibraryContent: {
    gap: 16,
  },
  leaveTypeCard: {
    backgroundColor: '#fafafa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
  },
  leaveTypeHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  leaveTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveTypeInfo: {
    flex: 1,
    gap: 8,
  },
  leaveTypeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    padding: 0,
  },
  leaveTypeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  leaveDescription: {
    flex: 1,
    fontSize: 10,
    color: '#64748b',
    padding: 0,
  },
  leaveTypeActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  daysContainer: {
    alignItems: 'center',
    gap: 2,
  },
  daysLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  daysInput: {
    width: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1e293b',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
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
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  proTipText: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
    lineHeight: 16,
  },
  proTipBold: {
    fontWeight: '700',
    color: '#4f46e5',
  },
  allowancesContent: {
    gap: 24,
  },
  allowanceItem: {
    gap: 12,
  },
  allowanceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allowanceItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  allowanceItemSubtitle: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  allowanceItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  allowanceItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
  complianceBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 20,
  },
  complianceText: {
    flex: 1,
    fontSize: 10,
    color: '#92400e',
    lineHeight: 16,
  },
  complianceBold: {
    fontWeight: '700',
  },
  allowanceContainer: {
    gap: 12,
    marginBottom: 20,
  },
  allowanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allowanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
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
    fontWeight: '700',
    color: '#1e293b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 48,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonCancel: {
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#fff',
    borderRadius: 24,
    width: SCREEN_WIDTH - 32,
    maxHeight: '80%',
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  addModalContent: {
    padding: 20,
    gap: 16,
  },
  addModalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
  },
  addModalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryOptionActive: {
    borderColor: '#6366f1',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  addModalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#6366f1',
  },
  addModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  valueModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 48,
  },
  valueModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
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
    marginBottom: 20,
  },
  valueModalButtons: {
    flexDirection: 'row',
    gap: 12,
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
});