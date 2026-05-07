// screens/payroll/SalaryStructures.tsx
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
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
  Archive,
  Play,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { payrollAPI } from '../../services/endpoints';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import CollapsibleSidebar from '../../components/common/CollapsibleSidebar';
import SafeSelector from '../../components/common/SafeSelector';
import { formatCurrency } from './payrollFormatters';

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
};

interface Component {
  name: string;
  value: number;
  calculationType: string;
  formula: string;
}

interface SalaryStructure {
  _id: string;
  name: string;
  description?: string;
  type: string;
  role?: string;
  earnings: Component[];
  deductions: Component[];
  isActive: boolean;
}

interface StructureCardProps {
  structure: SalaryStructure;
  assignedCount: number;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

const StructureCard = ({ structure, assignedCount, onEdit, onToggleStatus, onDelete }: StructureCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={[styles.structureCard, !structure.isActive && styles.structureCardInactive]}>
      <View style={styles.structureHeader}>
        <View style={[styles.structureIcon, { backgroundColor: structure.isActive ? COLORS.primary + '20' : COLORS.gray + '20' }]}>
          <Layers size={20} color={structure.isActive ? COLORS.primary : COLORS.gray} />
        </View>
        <View style={styles.structureInfo}>
          <Text style={styles.structureName}>{structure.name}</Text>
          <Text style={styles.structureType}>
            {structure.type === 'Employee-Based' ? 'Individual' : structure.role || 'General'}
          </Text>
        </View>
        <View style={styles.structureActions}>
          <TouchableOpacity onPress={() => setShowDetails(!showDetails)} style={styles.actionButton}>
            {showDetails ? <EyeOff size={16} color={COLORS.primary} /> : <Eye size={16} color={COLORS.gray} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Edit3 size={16} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggleStatus} style={styles.actionButton}>
            {structure.isActive ? (
              <Archive size={16} color={COLORS.warning} />
            ) : (
              <Play size={16} color={COLORS.success} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.structureBody}>
        {showDetails ? (
          <View style={styles.fullDetails}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Breakdown</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <ChevronUp size={16} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Earnings</Text>
              {structure.earnings?.map((e, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <Text style={styles.detailName}>{e.name}</Text>
                  <Text style={styles.detailValue}>
                    {e.calculationType === 'Fixed' ? `₹${formatCurrency(e.value)}` : `${e.value}%`}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.detailsSection, { marginTop: 12 }]}>
              <Text style={styles.detailsLabel}>Deductions</Text>
              {structure.deductions?.map((d, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <Text style={styles.detailName}>{d.name}</Text>
                  <Text style={[styles.detailValue, { color: COLORS.error }]}>
                    {d.calculationType === 'Fixed' ? `₹${formatCurrency(d.value)}` : `${d.value}%`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.componentPreview}>
            <View style={styles.earningPreview}>
              <Text style={styles.previewLabel}>Earnings:</Text>
              <View style={styles.previewTags}>
                {structure.earnings?.slice(0, 2).map((e, idx) => (
                  <View key={idx} style={[styles.previewTag, styles.earningTag]}>
                    <Text style={styles.previewTagText}>{e.name}</Text>
                  </View>
                ))}
                {structure.earnings?.length > 2 && (
                  <Text style={styles.previewMore}>+{structure.earnings.length - 2}</Text>
                )}
              </View>
            </View>
            <View style={styles.earningPreview}>
              <Text style={styles.previewLabel}>Deductions:</Text>
              <View style={styles.previewTags}>
                {structure.deductions?.slice(0, 2).map((d, idx) => (
                  <View key={idx} style={[styles.previewTag, styles.deductionTag]}>
                    <Text style={styles.previewTagText}>{d.name}</Text>
                  </View>
                ))}
                {structure.deductions?.length > 2 && (
                  <Text style={styles.previewMore}>+{structure.deductions.length - 2}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.structureFooter}>
          <View style={styles.assignedBadge}>
            <Text style={styles.assignedText}>{assignedCount} assigned</Text>
          </View>
          <TouchableOpacity
            style={styles.toggleLink}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.toggleLinkText}>{showDetails ? 'Hide Details' : 'View Details'}</Text>
            {showDetails ? <ChevronUp size={14} color={COLORS.primary} /> : <ChevronDown size={14} color={COLORS.primary} />}
          </TouchableOpacity>
          <Text style={styles.statusText}>{structure.isActive ? 'Active' : 'Archived'}</Text>
        </View>
      </View>
    </View>
  );
};

interface ComponentRowProps {
  component: Component;
  index: number;
  type: 'earnings' | 'deductions';
  onUpdate: (type: 'earnings' | 'deductions', index: number, field: string, value: any) => void;
  onRemove: (type: 'earnings' | 'deductions', index: number) => void;
  activeSelector: { type: string, index?: number } | null;
  onOpenSelector: (type: string, index: number) => void;
  onCloseSelector: () => void;
}

const ComponentRow = ({ 
  component, 
  index, 
  type, 
  onUpdate, 
  onRemove,
  activeSelector,
  onOpenSelector,
  onCloseSelector
}: ComponentRowProps) => (
  <View style={styles.componentRow}>
    <TextInput
      style={styles.componentName}
      placeholder="Name"
      value={component.name}
      onChangeText={(text) => onUpdate(type, index, 'name', text)}
      placeholderTextColor={COLORS.gray}
    />
    <SafeSelector
      style={styles.componentSelector}
      options={[
        { label: 'Fixed', value: 'Fixed' },
        { label: 'Percentage', value: 'Percentage' },
      ]}
      selectedValue={component.calculationType}
      onValueChange={(v) => onUpdate(type, index, 'calculationType', v)}
      visible={activeSelector?.type === type && activeSelector?.index === index}
      onOpen={() => onOpenSelector(type, index)}
      onClose={onCloseSelector}
    />
    <TextInput
      style={styles.componentValue}
      placeholder="Value"
      value={String(component.value)}
      onChangeText={(text) => onUpdate(type, index, 'value', text)}
      keyboardType="numeric"
      placeholderTextColor={COLORS.gray}
      editable={component.calculationType !== 'Formula'}
    />
    <TouchableOpacity onPress={() => onRemove(type, index)} style={styles.removeComponent}>
      <Trash2 size={14} color={COLORS.error} />
    </TouchableOpacity>
  </View>
);

export const SalaryStructures = () => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState<SalaryStructure | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [activeSelector, setActiveSelector] = useState<{ type: string, index?: number } | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: string;
    userId: string | null;
    earnings: Component[];
    deductions: Component[];
    isActive: boolean;
  }>({
    name: '',
    description: '',
    type: 'Role-Based',
    userId: null,
    earnings: [],
    deductions: [],
    isActive: true,
  });
  const [simulationCTC, setSimulationCTC] = useState('');
  const [selectedRole, setSelectedRole] = useState('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchStructures = async () => {
    try {
      const response: any = await payrollAPI.getRoleStructures();
      setStructures(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching structures:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response: any = await payrollAPI.getProfiles({ limit: 1000 });
      setProfiles(response.data?.data || response.data || []);
    } catch (error: any) {
      console.warn('Error fetching profiles:', error.message);
      setProfiles([]);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStructures(), fetchProfiles()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchAllData();
    }, [])
  );

  const defaultEarnings: Component[] = [
    { name: 'Basic Salary', value: 40, calculationType: 'Percentage', formula: 'Basic = 40% of CTC' },
    { name: 'House Rent Allowance (HRA)', value: 20, calculationType: 'Percentage', formula: 'HRA = 20% of Basic' },
  ];

  const defaultDeductions: Component[] = [
    { name: 'Provident Fund (PF)', value: 12, calculationType: 'Percentage', formula: 'PF = 12% of Basic' },
    { name: 'Professional Tax', value: 200, calculationType: 'Fixed', formula: '' },
  ];

  const roleTemplates: Record<string, { earnings: Component[], deductions: Component[] }> = {
    intern: {
      earnings: [{ name: 'Stipend', value: 15000, calculationType: 'Fixed', formula: '' }],
      deductions: [],
    },
    employee: {
      earnings: [
        { name: 'Basic Salary', value: 40, calculationType: 'Percentage', formula: 'Basic = 40% of CTC' },
        { name: 'House Rent Allowance (HRA)', value: 40, calculationType: 'Percentage', formula: 'HRA = 40% of Basic' },
        { name: 'Conveyance', value: 2000, calculationType: 'Fixed', formula: '' },
      ],
      deductions: [
        { name: 'Provident Fund (PF)', value: 12, calculationType: 'Percentage', formula: 'PF = 12% of Basic' },
        { name: 'ESI', value: 0.75, calculationType: 'Percentage', formula: 'Gross <= 21000' },
      ],
    },
    manager: {
      earnings: [
        { name: 'Basic Salary', value: 50, calculationType: 'Percentage', formula: 'Basic = 50% of CTC' },
        { name: 'House Rent Allowance (HRA)', value: 50, calculationType: 'Percentage', formula: 'HRA = 50% of Basic' },
        { name: 'Special Allowance', value: 15000, calculationType: 'Fixed', formula: '' },
      ],
      deductions: [
        { name: 'Provident Fund (PF)', value: 12, calculationType: 'Percentage', formula: 'PF = 12% of Basic' },
        { name: 'Professional Tax', value: 200, calculationType: 'Fixed', formula: '' },
      ],
    },
  };

  const preview = useMemo(() => {
    const ctc = parseFloat(simulationCTC) || 0;
    const context: Record<string, number> = {};
    let gross = 0;

    formData.earnings.forEach(e => {
      let val = parseFloat(String(e.value)) || 0;
      if (e.calculationType === 'Percentage') {
        const formula = (e.formula || '').toLowerCase();
        let base = formula.includes('ctc') ? ctc : (context['Basic Salary'] || 0);
        if (e.name.toLowerCase().includes('basic')) base = ctc;
        val = (base * val) / 100;
      }
      context[e.name] = val;
      gross += val;
    });

    let totalDeds = 0;
    formData.deductions.forEach(d => {
      let val = parseFloat(String(d.value)) || 0;
      if (d.calculationType === 'Percentage') {
        const formula = (d.formula || '').toLowerCase();
        let base = formula.includes('ctc') ? ctc : (context['Basic Salary'] || 0);
        if (formula.includes('gross')) base = gross;
        val = (base * val) / 100;
      }
      totalDeds += val;
    });

    return { gross, totalDeds, net: gross - totalDeds };
  }, [formData, simulationCTC]);

  const handleAddStructure = () => {
    setEditingStructure(null);
    setFormData({
      name: '',
      description: '',
      type: 'Role-Based',
      userId: null,
      earnings: [...defaultEarnings],
      deductions: [...defaultDeductions],
      isActive: true,
    });
    setSelectedRole('employee');
    setSimulationCTC('');
    setShowEditModal(true);
  };

  const handleEditStructure = (structure: SalaryStructure) => {
    setEditingStructure(structure);
    setFormData({
      name: structure.name,
      description: structure.description || '',
      type: structure.type,
      userId: null,
      earnings: structure.earnings || [],
      deductions: structure.deductions || [],
      isActive: structure.isActive,
    });
    setSelectedRole(structure.role || 'employee');
    setShowEditModal(true);
  };

  const handleLoadTemplate = (role: string) => {
    const template = roleTemplates[role];
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: role.charAt(0).toUpperCase() + role.slice(1),
        earnings: [...template.earnings],
        deductions: [...template.deductions],
      }));
    }
  };

  const addComponent = (type: 'earnings' | 'deductions') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { name: '', value: 0, calculationType: 'Fixed', formula: '' }],
    }));
  };

  const updateComponent = (type: 'earnings' | 'deductions', index: number, field: string, value: any) => {
    const updated = [...formData[type]];
    (updated[index] as any)[field] = value;
    setFormData(prev => ({ ...prev, [type]: updated }));
  };

  const removeComponent = (type: 'earnings' | 'deductions', index: number) => {
    const updated = [...formData[type]];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, [type]: updated }));
  };

  const handleSaveStructure = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Structure name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStructure) {
        await payrollAPI.updateRoleStructure({ ...formData, _id: editingStructure._id });
        Alert.alert('Success', 'Structure updated successfully');
      } else {
        await payrollAPI.updateRoleStructure(formData);
        Alert.alert('Success', 'Structure created successfully');
      }
      setShowEditModal(false);
      fetchStructures();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save structure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (structure: SalaryStructure) => {
    try {
      await payrollAPI.toggleStructureStatus(structure._id);
      Alert.alert('Success', `Structure ${structure.isActive ? 'archived' : 'activated'} successfully`);
      fetchStructures();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const handleDeleteStructure = async (structureId: string) => {
    try {
      await payrollAPI.deleteStructure(structureId);
      Alert.alert('Success', 'Structure deleted successfully');
      fetchStructures();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete structure');
    }
  };

  const stats = {
    total: structures.length,
    active: structures.filter(s => s.isActive).length,
    assigned: profiles.length,
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Salary Structures" showSidebarButton onMenuPress={() => setSidebarVisible(true)} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Structures</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.assigned}</Text>
              <Text style={styles.statLabel}>Assigned</Text>
            </View>
          </View>

          {/* Action Header */}
          <View style={styles.actionHeader}>
            <Text style={styles.sectionTitle}>All Structures</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddStructure}>
              <Plus size={16} color={COLORS.white} />
              <Text style={styles.addButtonText}>New Structure</Text>
            </TouchableOpacity>
          </View>

          {/* Structures List */}
          {structures.map(s => (
            <StructureCard
              key={s._id}
              structure={s}
              assignedCount={profiles.filter(p => p.salaryStructureId === s._id).length}
              onEdit={() => handleEditStructure(s)}
              onToggleStatus={() => setShowStatusConfirm(s)}
              onDelete={() => setShowDeleteConfirm(s._id)}
            />
          ))}

          {structures.length === 0 && (
            <View style={styles.emptyContainer}>
              <Layers size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No structures yet</Text>
              <Text style={styles.emptyText}>Create your first salary template to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Footer showCopyright />
      <CollapsibleSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} user={user} />

      {/* Edit/Create Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingStructure ? 'Edit Structure' : 'New Structure'}</Text>
                <Text style={styles.modalSubtitle}>Configure components and calculations</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Structure Name</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Standard Employee Structure"
                    value={formData.name}
                    onChangeText={v => setFormData({ ...formData, name: v })}
                  />
                </View>

                {!editingStructure && (
                  <View style={styles.templateSection}>
                    <Text style={styles.formLabel}>Load Template</Text>
                    <View style={styles.templateButtons}>
                      {Object.keys(roleTemplates).map(role => (
                        <TouchableOpacity
                          key={role}
                          style={[styles.templateButton, selectedRole === role && styles.templateButtonActive]}
                          onPress={() => {
                            setSelectedRole(role);
                            handleLoadTemplate(role);
                          }}
                        >
                          <Text style={[styles.templateButtonText, selectedRole === role && styles.templateButtonTextActive]}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Earnings Section */}
                <View style={styles.componentsSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.componentsTitle}>Earnings</Text>
                    <TouchableOpacity onPress={() => addComponent('earnings')}>
                      <Plus size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  {formData.earnings.map((e, idx) => (
                    <ComponentRow
                      key={idx}
                      index={idx}
                      type="earnings"
                      component={e}
                      onUpdate={updateComponent}
                      onRemove={removeComponent}
                      activeSelector={activeSelector}
                      onOpenSelector={(type, index) => setActiveSelector({ type, index })}
                      onCloseSelector={() => setActiveSelector(null)}
                    />
                  ))}
                </View>

                {/* Deductions Section */}
                <View style={styles.componentsSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.componentsTitle}>Deductions</Text>
                    <TouchableOpacity onPress={() => addComponent('deductions')}>
                      <Plus size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                  {formData.deductions.map((d, idx) => (
                    <ComponentRow
                      key={idx}
                      index={idx}
                      type="deductions"
                      component={d}
                      onUpdate={updateComponent}
                      onRemove={removeComponent}
                      activeSelector={activeSelector}
                      onOpenSelector={(type, index) => setActiveSelector({ type, index })}
                      onCloseSelector={() => setActiveSelector(null)}
                    />
                  ))}
                </View>

                {/* Simulation Preview */}
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Simulation Preview</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Test CTC (Monthly)</Text>
                    <TextInput
                      style={styles.previewInput}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={simulationCTC}
                      onChangeText={setSimulationCTC}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                  <View style={styles.previewDivider} />
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Gross Pay</Text>
                    <Text style={styles.previewValue}>₹{formatCurrency(preview.gross)}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total Deductions</Text>
                    <Text style={[styles.previewValue, { color: COLORS.error }]}>-₹{formatCurrency(preview.totalDeds)}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { fontWeight: 'bold', color: COLORS.white }]}>Net Payout</Text>
                    <Text style={[styles.previewValue, { color: COLORS.success, fontSize: 18 }]}>₹{formatCurrency(preview.net)}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                onPress={handleSaveStructure}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Save size={16} color={COLORS.white} />
                    <Text style={styles.saveButtonText}>Save Structure</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Generic Confirm Modals */}
      <Modal visible={!!showStatusConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <View style={styles.confirmIcon}>
              <Archive size={32} color={COLORS.warning} />
            </View>
            <Text style={styles.confirmTitle}>
              {showStatusConfirm?.isActive ? 'Archive Structure?' : 'Activate Structure?'}
            </Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to {showStatusConfirm?.isActive ? 'archive' : 'activate'} "{showStatusConfirm?.name}"?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowStatusConfirm(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDelete, { backgroundColor: showStatusConfirm?.isActive ? COLORS.warning : COLORS.success }]}
                onPress={() => {
                  if (showStatusConfirm) handleToggleStatus(showStatusConfirm);
                  setShowStatusConfirm(null);
                }}
              >
                <Text style={styles.confirmDeleteText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!showDeleteConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <View style={styles.confirmIcon}>
              <Trash2 size={32} color={COLORS.error} />
            </View>
            <Text style={styles.confirmTitle}>Delete Structure?</Text>
            <Text style={styles.confirmMessage}>This action cannot be undone. All assigned profiles will be affected.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowDeleteConfirm(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={() => {
                  if (showDeleteConfirm) handleDeleteStructure(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  structureCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  structureCardInactive: {
    opacity: 0.6,
    backgroundColor: COLORS.light,
  },
  structureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  structureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  structureInfo: {
    flex: 1,
  },
  structureName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  structureType: {
    fontSize: 11,
    color: COLORS.gray,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  structureActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  structureBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  componentPreview: {
    gap: 8,
    marginBottom: 12,
  },
  earningPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewLabel: {
    fontSize: 11,
    color: COLORS.gray,
    width: 70,
  },
  previewTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earningTag: {
    backgroundColor: COLORS.primary + '10',
  },
  deductionTag: {
    backgroundColor: COLORS.error + '10',
  },
  previewTagText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.dark,
  },
  previewMore: {
    fontSize: 10,
    color: COLORS.gray,
  },
  structureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  assignedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.info + '10',
  },
  assignedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.info,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  toggleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  fullDetails: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  detailsSection: {
    gap: 6,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailName: {
    fontSize: 13,
    color: COLORS.dark,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
  },
  modalContent: {
    padding: 20,
  },
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateSection: {
    marginBottom: 24,
  },
  templateButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  templateButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateButtonActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  templateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  templateButtonTextActive: {
    color: COLORS.primary,
  },
  componentsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  componentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  componentName: {
    flex: 2,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.dark,
  },
  componentSelector: {
    flex: 1.5,
  },
  componentPicker: {
    flex: 1.5,
    backgroundColor: COLORS.light,
  },
  componentValue: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.dark,
    textAlign: 'right',
  },
  removeComponent: {
    padding: 4,
  },
  previewCard: {
    backgroundColor: COLORS.dark,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  previewInput: {
    backgroundColor: COLORS.white + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    color: COLORS.white,
    width: 120,
    textAlign: 'right',
  },
  previewDivider: {
    height: 1,
    backgroundColor: COLORS.white + '20',
    marginVertical: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.light,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.light,
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.error,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
