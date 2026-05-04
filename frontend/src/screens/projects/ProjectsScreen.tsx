import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  Switch,
  Share,
  KeyboardTypeOptions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  FolderOpen,
  Users,
  Calendar,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  UserPlus,
  Save,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
} from 'lucide-react-native';
import { projectAPI, userAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface User {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  role?: string;
}

interface AllocatedEmployee {
  userId: User | string;
  role: string;
  allocationPercent: number;
  budgetHours: number;
}

interface Project {
  _id: string;
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'on-hold' | 'completed';
  managerId?: User | string;
  allocatedEmployees: AllocatedEmployee[];
  onlyProjectTasks: boolean;
  budgetHours: number;
  createdAt?: string;
  updatedAt?: string;
}

const statusColors = {
  active: { bg: '#ecfdf5', text: '#10b981', label: 'Active' },
  'on-hold': { bg: '#fffbeb', text: '#f59e0b', label: 'On Hold' },
  completed: { bg: '#eff6ff', text: '#3b82f6', label: 'Completed' },
};

// Dropdown Modal Component
const DropdownModal = memo(({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  title
}: {
  visible: boolean;
  onClose: () => void;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={dropdownStyles.overlay}>
        <View style={dropdownStyles.container}>
          <View style={dropdownStyles.header}>
            <Text style={dropdownStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={dropdownStyles.closeButton}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  dropdownStyles.option,
                  selectedValue === option.value && dropdownStyles.optionSelected
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
              >
                <Text style={[
                  dropdownStyles.optionText,
                  selectedValue === option.value && dropdownStyles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <View style={dropdownStyles.checkmark} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// Form Field Component
const FormField = memo(({
  label,
  value,
  onPress,
  placeholder,
  required,
  displayValue
}: {
  label: string;
  value: string;
  onPress: () => void;
  placeholder: string;
  required?: boolean;
  displayValue?: string;
}) => (
  <View style={modalStyles.field}>
    <Text style={modalStyles.label}>{label} {required && '*'}</Text>
    <TouchableOpacity style={modalStyles.selectButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={[modalStyles.selectButtonText, !value && modalStyles.placeholderText]}>
        {displayValue || placeholder}
      </Text>
      <ChevronDown size={16} color="#64748b" />
    </TouchableOpacity>
  </View>
));

// Text Input Field Component - FIXED
const TextInputField = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'none'
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}) => (
  <View style={modalStyles.field}>
    <Text style={modalStyles.label}>{label} {required && '*'}</Text>
    <TextInput
      style={[modalStyles.input, multiline && modalStyles.textArea]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      placeholderTextColor="#94a3b8"
    />
  </View>
));

// Team Member Row Component
const TeamMemberRow = memo(({
  member,
  index,
  onUpdate,
  onRemove,
  employees,
  onSelectEmployee
}: {
  member: AllocatedEmployee;
  index: number;
  onUpdate: (index: number, field: keyof AllocatedEmployee, value: any) => void;
  onRemove: (index: number) => void;
  employees: User[];
  onSelectEmployee: (index: number) => void;
}) => {
  const employeeName = typeof member.userId === 'object'
    ? (member.userId as User)?.name
    : employees.find(e => e._id === member.userId)?.name || 'Select Employee';

  return (
    <View style={modalStyles.memberRow}>
      <View style={modalStyles.memberField}>
        <TouchableOpacity
          style={modalStyles.memberSelectButton}
          onPress={() => onSelectEmployee(index)}
        >
          <Text style={[modalStyles.memberSelectText, !member.userId && modalStyles.placeholderText]}>
            {employeeName}
          </Text>
          <ChevronDown size={14} color="#64748b" />
        </TouchableOpacity>
      </View>
      <View style={modalStyles.memberFieldSmall}>
        <TextInput
          style={modalStyles.memberInput}
          placeholder="Role"
          value={member.role}
          onChangeText={(text) => onUpdate(index, 'role', text)}
          placeholderTextColor="#94a3b8"
        />
      </View>
      <View style={modalStyles.memberFieldSmall}>
        <TextInput
          style={modalStyles.memberInput}
          placeholder="%"
          keyboardType="numeric"
          value={String(member.allocationPercent)}
          onChangeText={(text) => onUpdate(index, 'allocationPercent', Number(text) || 0)}
          placeholderTextColor="#94a3b8"
        />
      </View>
      <TouchableOpacity onPress={() => onRemove(index)}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
});

// Stat Card Component
const StatCard = memo(({ title, value, icon: Icon, color, bgColor }: any) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <Icon size={20} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </View>
));

// Project Card Component
const ProjectCard = memo(({ project, onView, onEdit, onDelete, getStatusStyle, formatDate }: any) => {
  const statusStyle = getStatusStyle(project.status);
  const managerName = typeof project.managerId === 'object' ? project.managerId?.name : '—';
  const teamCount = project.allocatedEmployees?.length || 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.projectInfo}>
          <View style={styles.projectIcon}>
            <FolderOpen size={20} color="#3b82f6" />
          </View>
          <View>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectCode}>{project.code}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Building2 size={14} color="#64748b" />
          <Text style={styles.cardText}>Manager: {managerName}</Text>
        </View>
        {project.clientName && (
          <View style={styles.cardRow}>
            <Briefcase size={14} color="#64748b" />
            <Text style={styles.cardText}>Client: {project.clientName}</Text>
          </View>
        )}
        <View style={styles.cardRow}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.cardText}>
            {formatDate(project.startDate)} {project.endDate ? `→ ${formatDate(project.endDate)}` : ''}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Users size={14} color="#64748b" />
          <Text style={styles.cardText}>Team: {teamCount} members</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onView(project)}
        >
          <Eye size={16} color="#64748b" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit(project)}
        >
          <Pencil size={16} color="#f59e0b" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(project)}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Export Modal Component
const ExportModal = memo(({
  visible,
  onClose,
  onExport,
  isExporting
}: {
  visible: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'excel') => void;
  isExporting: boolean;
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel'>('csv');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={exportModalStyles.overlay}>
        <View style={exportModalStyles.container}>
          <View style={exportModalStyles.header}>
            <Download size={24} color="#3b82f6" />
            <Text style={exportModalStyles.title}>Export Projects</Text>
            <TouchableOpacity onPress={onClose} style={exportModalStyles.closeButton}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={exportModalStyles.content}>
            <Text style={exportModalStyles.description}>
              Export all projects data to your device. The file will include all projects with their details, team members, and status information.
            </Text>

            <View style={exportModalStyles.formatSection}>
              <Text style={exportModalStyles.sectionTitle}>Select Format</Text>
              <View style={exportModalStyles.formatOptions}>
                <TouchableOpacity
                  style={[
                    exportModalStyles.formatOption,
                    selectedFormat === 'csv' && exportModalStyles.formatOptionSelected
                  ]}
                  onPress={() => setSelectedFormat('csv')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'csv' ? '#3b82f6' : '#64748b'} />
                  <Text style={[
                    exportModalStyles.formatText,
                    selectedFormat === 'csv' && exportModalStyles.formatTextSelected
                  ]}>CSV Format</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    exportModalStyles.formatOption,
                    selectedFormat === 'excel' && exportModalStyles.formatOptionSelected
                  ]}
                  onPress={() => setSelectedFormat('excel')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'excel' ? '#3b82f6' : '#64748b'} />
                  <Text style={[
                    exportModalStyles.formatText,
                    selectedFormat === 'excel' && exportModalStyles.formatTextSelected
                  ]}>Excel Format (.xlsx)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={exportModalStyles.infoBox}>
              <AlertCircle size={14} color="#64748b" />
              <Text style={exportModalStyles.infoText}>
                Export will include all projects data including team members, dates, and status.
              </Text>
            </View>
          </View>

          <View style={exportModalStyles.footer}>
            <TouchableOpacity style={exportModalStyles.cancelButton} onPress={onClose}>
              <Text style={exportModalStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[exportModalStyles.exportButton, isExporting && exportModalStyles.disabledButton]}
              onPress={() => onExport(selectedFormat)}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Download size={16} color="white" />
                  <Text style={exportModalStyles.exportButtonText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default function ProjectsScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [projectCodeFilter, setProjectCodeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({ status: '', managerId: '', projectCode: '' });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Dropdown visibility states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [dropdownContext, setDropdownContext] = useState<'create' | 'edit' | 'filter'>('create');
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState<number>(-1);

  // Date Picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [datePickerContext, setDatePickerContext] = useState<'start' | 'end'>('start');
  const [tempDate, setTempDate] = useState(new Date());

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    clientName: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    status: 'active' as 'active' | 'on-hold' | 'completed',
    managerId: '',
    budgetHours: 0,
    onlyProjectTasks: false,
    allocatedEmployees: [] as AllocatedEmployee[],
  });

  // Dropdown data
  const [managers, setManagers] = useState<User[]>([]);
  const [allEmployees, setAllEmployees] = useState<User[]>([]);
  const [allProjectsList, setAllProjectsList] = useState<Project[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const limit = 10;

  // Options for dropdowns - memoized
  const statusOptions = useMemo(() => [
    { value: 'active', label: 'Active' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ], []);

  const managerOptions = useMemo(() => managers.map(m => ({ value: m._id, label: m.name })), [managers]);
  const employeeOptions = useMemo(() => allEmployees.map(e => ({ value: e._id, label: e.name })), [allEmployees]);

  const fetchAllProjects = async () => {
    try {
      const response = await projectAPI.getAll({ limit: 1000 });
      const data = (response as any)?.data?.data || (response as any).data || [];
      setAllProjectsList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching all projects:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchManagers();
      fetchEmployees();
      fetchProjects();
      fetchAllProjects();
    }, [page, searchQuery, statusFilter, managerFilter, projectCodeFilter])
  );

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

  const fetchManagers = async () => {
    try {
      const response = await userAPI.getAll({ role: 'manager' });
      const data = (response as any)?.data?.data || (response as any).data || [];
      setManagers(data);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await userAPI.getAll({ limit: 1000 });
      const data = (response as any)?.data?.data || (response as any).data || [];
      setAllEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (searchQuery.length >= 2) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (managerFilter) params.managerId = managerFilter;
      if (projectCodeFilter) params.code = projectCodeFilter;

      const response = await projectAPI.getAll(params);
      const projectsData = (response as any)?.data?.data || (response as any).data || [];
      const pagination = (response as any)?.data?.pagination || {};

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setTotalPages(pagination.totalPages || 1);
      setTotalResults(pagination.total || 0);
    } catch (error) {
      console.error('Error fetching projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }
    if (!formData.code.trim()) {
      Alert.alert('Error', 'Project code is required');
      return;
    }
    if (!formData.managerId) {
      Alert.alert('Error', 'Project manager is required');
      return;
    }
    if (!formData.startDate) {
      Alert.alert('Error', 'Start date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        allocatedEmployees: formData.allocatedEmployees.filter(emp => emp.userId),
        endDate: formData.endDate || null,
      };
      await projectAPI.create(payload);
      Alert.alert('Success', 'Project created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        allocatedEmployees: formData.allocatedEmployees.filter(emp => emp.userId),
        endDate: formData.endDate || null,
      };
      await projectAPI.update(selectedProject._id, payload);
      Alert.alert('Success', 'Project updated successfully!');
      setShowEditModal(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      await projectAPI.delete(selectedProject._id);
      Alert.alert('Success', 'Project deleted successfully!');
      setShowDeleteModal(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete project');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params: any = {};
      if (searchQuery.length >= 2) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (managerFilter) params.managerId = managerFilter;
      if (projectCodeFilter) params.code = projectCodeFilter;

      const csvData = await projectAPI.export(params);
      
      if (Platform.OS === 'web') {
        const globalAny = globalThis as any;
        const blob = new globalAny.Blob([csvData as any], { type: 'text/csv' });
        const url = globalAny.URL.createObjectURL(blob);
        const a = globalAny.document.createElement('a');
        a.href = url;
        a.download = `projects_${format(new Date(), 'yyyyMMdd')}.csv`;
        a.click();
        globalAny.URL.revokeObjectURL(url);
      } else {
        const downloadPath = Platform.OS === 'android'
          ? RNFS.DownloadDirectoryPath
          : RNFS.DocumentDirectoryPath;
        const fileName = `projects_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const filePath = `${downloadPath}/${fileName}`;
        
        await RNFS.writeFile(filePath, csvData as string, 'utf8');
        
        const shareOptions: any = {
          title: 'Export Projects',
          message: `Projects exported to ${fileName}`,
        };
        
        if (Platform.OS === 'ios') {
          shareOptions.url = `file://${filePath}`;
        }
        
        await Share.share(shareOptions);
      }
      Alert.alert('Success', 'Projects exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export CSV. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      clientName: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      status: 'active',
      managerId: '',
      budgetHours: 0,
      onlyProjectTasks: false,
      allocatedEmployees: [],
    });
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      clientName: project.clientName || '',
      startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
      endDate: project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '',
      status: project.status,
      managerId: typeof project.managerId === 'object' ? project.managerId._id : project.managerId || '',
      budgetHours: project.budgetHours || 0,
      onlyProjectTasks: project.onlyProjectTasks || false,
      allocatedEmployees: project.allocatedEmployees || [],
    });
    setShowEditModal(true);
  };

  const addTeamMember = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      allocatedEmployees: [
        ...prev.allocatedEmployees,
        { userId: '', role: 'Developer', allocationPercent: 100, budgetHours: 0 },
      ],
    }));
  }, []);

  const removeTeamMember = useCallback((index: number) => {
    setFormData(prev => {
      const newMembers = [...prev.allocatedEmployees];
      newMembers.splice(index, 1);
      return { ...prev, allocatedEmployees: newMembers };
    });
  }, []);

  const updateTeamMember = useCallback((index: number, field: keyof AllocatedEmployee, value: any) => {
    setFormData(prev => {
      const newMembers = [...prev.allocatedEmployees];
      newMembers[index] = { ...newMembers[index], [field]: value };
      return { ...prev, allocatedEmployees: newMembers };
    });
  }, []);

  const getStatusStyle = useCallback((status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.active;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  }, []);

  const openDropdown = useCallback((context: 'create' | 'edit' | 'filter', type: 'status' | 'manager') => {
    setDropdownContext(context);
    if (type === 'status') setShowStatusDropdown(true);
    else if (type === 'manager') setShowManagerDropdown(true);
  }, []);

  const openEmployeeDropdown = useCallback((context: 'create' | 'edit', index: number) => {
    setDropdownContext(context);
    setSelectedEmployeeIndex(index);
    setShowEmployeeDropdown(true);
  }, []);

  const openDatePicker = useCallback((type: 'start' | 'end') => {
    setDatePickerContext(type);
    const currentDate = type === 'start' ? formData.startDate : formData.endDate;
    setTempDate(currentDate ? new Date(currentDate) : new Date());
    if (type === 'start') {
      setShowStartDatePicker(true);
    } else {
      setShowEndDatePicker(true);
    }
  }, [formData.startDate, formData.endDate]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      if (datePickerContext === 'start') {
        setFormData(prev => ({ ...prev, startDate: formattedDate }));
      } else {
        setFormData(prev => ({ ...prev, endDate: formattedDate }));
      }
    }
  }, [datePickerContext]);

  const handleStatusSelect = useCallback((status: string) => {
    if (dropdownContext === 'create' || dropdownContext === 'edit') {
      setFormData(prev => ({ ...prev, status: status as any }));
    } else if (dropdownContext === 'filter') {
      setTempFilters(prev => ({ ...prev, status }));
    }
  }, [dropdownContext]);

  const handleManagerSelect = useCallback((managerId: string) => {
    if (dropdownContext === 'create' || dropdownContext === 'edit') {
      setFormData(prev => ({ ...prev, managerId }));
    } else if (dropdownContext === 'filter') {
      setTempFilters(prev => ({ ...prev, managerId }));
    }
  }, [dropdownContext]);

  const handleEmployeeSelect = useCallback((employeeId: string) => {
    if (selectedEmployeeIndex >= 0) {
      updateTeamMember(selectedEmployeeIndex, 'userId', employeeId);
    }
    setShowEmployeeDropdown(false);
    setSelectedEmployeeIndex(-1);
  }, [selectedEmployeeIndex, updateTeamMember]);

  const handleViewProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowViewModal(true);
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    openEditModal(project);
  }, []);

  const handleDeleteProjectConfirm = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  }, []);

  // Export Functions
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const permission = Platform.Version >= 33
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE;

        const result = await request(permission);
        return result === RESULTS.GRANTED;
      } catch (error) {
        console.error('Permission error:', error);
        return false;
      }
    }
    return true;
  };

  const convertToCSV = (projectsList: Project[]): string => {
    const headers = [
      'Project Name',
      'Project Code',
      'Status',
      'Client Name',
      'Manager',
      'Start Date',
      'End Date',
      'Budget Hours',
      'Only Project Tasks',
      'Team Members',
      'Team Roles',
      'Allocation Percentages',
      'Created At',
      'Updated At'
    ];

    const rows = projectsList.map(project => {
      const managerName = typeof project.managerId === 'object'
        ? (project.managerId as User)?.name
        : managers.find(m => m._id === project.managerId)?.name || '—';

      const teamMembers = project.allocatedEmployees.map(m =>
        typeof m.userId === 'object' ? (m.userId as User)?.name : allEmployees.find(e => e._id === m.userId)?.name || '—'
      ).join('; ');

      const teamRoles = project.allocatedEmployees.map(m => m.role).join('; ');
      const teamAllocations = project.allocatedEmployees.map(m => `${m.allocationPercent}%`).join('; ');

      return [
        `"${project.name.replace(/"/g, '""')}"`,
        project.code,
        project.status,
        `"${(project.clientName || '').replace(/"/g, '""')}"`,
        `"${managerName}"`,
        formatDateForCSV(project.startDate),
        formatDateForCSV(project.endDate || ''),
        project.budgetHours || 0,
        project.onlyProjectTasks ? 'Yes' : 'No',
        `"${teamMembers}"`,
        `"${teamRoles}"`,
        `"${teamAllocations}"`,
        formatDateForCSV(project.createdAt || ''),
        formatDateForCSV(project.updatedAt || '')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  const formatDateForCSV = (dateString: string): string => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const generateExcelHTML = (projectsList: Project[]): string => {
    const headers = [
      'Project Name', 'Project Code', 'Status', 'Client Name', 'Manager',
      'Start Date', 'End Date', 'Budget Hours', 'Only Project Tasks',
      'Team Members', 'Team Roles', 'Allocation %', 'Created At', 'Updated At'
    ];

    const rows = projectsList.map(project => {
      const managerName = typeof project.managerId === 'object'
        ? (project.managerId as User)?.name
        : managers.find(m => m._id === project.managerId)?.name || '—';

      const teamMembers = project.allocatedEmployees.map(m =>
        typeof m.userId === 'object' ? (m.userId as User)?.name : allEmployees.find(e => e._id === m.userId)?.name || '—'
      ).join(', ');

      const teamRoles = project.allocatedEmployees.map(m => m.role).join(', ');
      const teamAllocations = project.allocatedEmployees.map(m => `${m.allocationPercent}%`).join(', ');

      return `
        <tr>
          <td>${escapeHtml(project.name)}</td>
          <td>${project.code}</td>
          <td>${project.status}</td>
          <td>${escapeHtml(project.clientName || '')}</td>
          <td>${escapeHtml(managerName)}</td>
          <td>${formatDateForCSV(project.startDate)}</td>
          <td>${formatDateForCSV(project.endDate || '')}</td>
          <td>${project.budgetHours || 0}</td>
          <td>${project.onlyProjectTasks ? 'Yes' : 'No'}</td>
          <td>${escapeHtml(teamMembers)}</td>
          <td>${escapeHtml(teamRoles)}</td>
          <td>${teamAllocations}</td>
          <td>${formatDateForCSV(project.createdAt || '')}</td>
          <td>${formatDateForCSV(project.updatedAt || '')}</td>
        </tr>
      `;
    }).join('');

    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Projects Export - ${format(new Date(), 'yyyy-MM-dd')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              color: #1e293b;
              margin-bottom: 10px;
            }
            .info {
              color: #64748b;
              margin-bottom: 20px;
              font-size: 12px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-top: 20px;
            }
            th {
              background-color: #3b82f6;
              color: white;
              padding: 10px;
              text-align: left;
              font-size: 12px;
              border: 1px solid #e2e8f0;
            }
            td {
              padding: 8px;
              border: 1px solid #e2e8f0;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
          </style>
        </head>
        <body>
          <h1>Projects Export Report</h1>
          <div class="info">
            Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}<br/>
            Total Projects: ${projectsList.length}
          </div>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const saveFileToDevice = async (content: string, fileName: string): Promise<string> => {
    const downloadPath = Platform.OS === 'android'
      ? RNFS.DownloadDirectoryPath
      : RNFS.DocumentDirectoryPath;

    const filePath = `${downloadPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  };

  const shareFile = async (filePath: string, fileName: string) => {
    try {
      await Share.share({
        title: 'Export Projects',
        message: `Projects exported as ${fileName}`,
        url: `file://${filePath}`,
      });
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  };

  const handleExport = async (formatType: 'csv' | 'excel') => {
    try {
      setIsExporting(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Storage permission is needed to save exported files. Please grant permission in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const response = await projectAPI.getAll({ limit: 10000 });
      const allProjectsData = (response as any)?.data?.data || (response as any).data || [];

      if (!allProjectsData.length) {
        Alert.alert('No Data', 'No projects available to export.');
        return;
      }

      let content: string;
      let fileName: string;

      if (formatType === 'csv') {
        content = convertToCSV(allProjectsData);
        fileName = `projects_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      } else {
        content = generateExcelHTML(allProjectsData);
        fileName = `projects_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      }

      const filePath = await saveFileToDevice(content, fileName);

      Alert.alert(
        'Export Successful',
        `File saved to:\n${filePath}\n\nWould you like to share it?`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Share',
            onPress: () => shareFile(filePath, fileName)
          },
        ]
      );

      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export projects. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const stats = useMemo(() => ({
    total: allProjectsList.length,
    active: allProjectsList.filter(p => p.status === 'active').length,
    onHold: allProjectsList.filter(p => p.status === 'on-hold').length,
    completed: allProjectsList.filter(p => p.status === 'completed').length,
  }), [allProjectsList]);

  const getManagerDisplayValue = useCallback((managerId: string) => {
    if (!managerId) return 'Select Manager';
    return managers.find(m => m._id === managerId)?.name || 'Select Manager';
  }, [managers]);

  const getStatusDisplayValue = useCallback((status: string) => {
    if (!status) return 'Select Status';
    return statusOptions.find(s => s.value === status)?.label || 'Select Status';
  }, [statusOptions]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const activeFilterCount = (statusFilter ? 1 : 0) + (managerFilter ? 1 : 0) + (projectCodeFilter ? 1 : 0);

  return (
    <Layout
      title="Projects"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <PageHeader
        title="Projects"
        subtitle="Manage your active and past projects"
        icon={FolderOpen}
        iconColor="#ec4899"
        iconBgColor="#fdf2f8"
      />

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <StatCard title="Total" value={stats.total} icon={Briefcase} color="#3b82f6" bgColor="#eff6ff" />
        <StatCard title="Active" value={stats.active} icon={TrendingUp} color="#10b981" bgColor="#ecfdf5" />
        <StatCard title="On Hold" value={stats.onHold} icon={AlertCircle} color="#f59e0b" bgColor="#fffbeb" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="#3b82f6" bgColor="#eff6ff" />
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search (min. 2 characters)..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchProjects}
          />
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setShowExportModal(true)}
        >
          <Download size={16} color="#10b981" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, (showFilters || activeFilterCount > 0) && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} color={showFilters || activeFilterCount > 0 ? '#3b82f6' : '#64748b'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
          <Plus size={16} color="white" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>Filter By</Text>

          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Status</Text>
            <TouchableOpacity
              style={styles.filterSelectButton}
              onPress={() => openDropdown('filter', 'status')}
            >
              <Text style={[styles.filterSelectText, !tempFilters.status && styles.placeholderText]}>
                {tempFilters.status ? statusOptions.find(s => s.value === tempFilters.status)?.label || 'All Status' : 'All Status'}
              </Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Manager</Text>
            <TouchableOpacity
              style={styles.filterSelectButton}
              onPress={() => openDropdown('filter', 'manager')}
            >
              <Text style={[styles.filterSelectText, !tempFilters.managerId && styles.placeholderText]}>
                {tempFilters.managerId ? managers.find(m => m._id === tempFilters.managerId)?.name || 'All Managers' : 'All Managers'}
              </Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterClear} onPress={() => setTempFilters({ status: '', managerId: '', projectCode: '' })}>
              <Text style={styles.filterClearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterApply} onPress={() => {
              setStatusFilter(tempFilters.status);
              setManagerFilter(tempFilters.managerId);
              setProjectCodeFilter(tempFilters.projectCode);
              setShowFilters(false);
              setPage(1);
            }}>
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FolderOpen size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No projects found</Text>
          <Text style={styles.emptyText}>Try adjusting your filters or create a new project</Text>
        </View>
      ) : (
        <>
          {projects.map(project => (
            <ProjectCard
              key={project._id}
              project={project}
              onView={handleViewProject}
              onEdit={handleEditProject}
              onDelete={handleDeleteProjectConfirm}
              getStatusStyle={getStatusStyle}
              formatDate={formatDate}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                onPress={() => { if (page > 1) setPage(page - 1); }}
                disabled={page === 1}
              >
                <ChevronLeft size={16} color="#3b82f6" />
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                onPress={() => { if (page < totalPages) setPage(page + 1); }}
                disabled={page === totalPages}
              >
                <Text style={styles.pageButtonText}>Next</Text>
                <ChevronRight size={16} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showStatusDropdown}
        onClose={() => setShowStatusDropdown(false)}
        options={statusOptions}
        selectedValue={
          dropdownContext === 'create' || dropdownContext === 'edit' ? formData.status :
            dropdownContext === 'filter' ? tempFilters.status : ''
        }
        onSelect={handleStatusSelect}
        title="Select Status"
      />

      <DropdownModal
        visible={showManagerDropdown}
        onClose={() => setShowManagerDropdown(false)}
        options={managerOptions}
        selectedValue={
          dropdownContext === 'create' || dropdownContext === 'edit' ? formData.managerId :
            dropdownContext === 'filter' ? tempFilters.managerId : ''
        }
        onSelect={handleManagerSelect}
        title="Select Manager"
      />

      <DropdownModal
        visible={showEmployeeDropdown}
        onClose={() => setShowEmployeeDropdown(false)}
        options={employeeOptions}
        selectedValue={
          selectedEmployeeIndex >= 0 && formData.allocatedEmployees[selectedEmployeeIndex]
            ? (typeof formData.allocatedEmployees[selectedEmployeeIndex].userId === 'object'
              ? (formData.allocatedEmployees[selectedEmployeeIndex].userId as User)._id
              : formData.allocatedEmployees[selectedEmployeeIndex].userId as string)
            : ''
        }
        onSelect={handleEmployeeSelect}
        title="Select Employee"
      />

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* Export Modal */}
      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Create Project Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>New Project</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.form}>
                <TextInputField
                  label="Project Name"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g. Website Redesign"
                  required
                />

                <TextInputField
                  label="Project Code"
                  value={formData.code}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, code: text.toUpperCase() }))}
                  placeholder="PRJ-001"
                  required
                  autoCapitalize="characters"
                />

                <View style={modalStyles.row}>
                  <View style={{ flex: 1 }}>
                    <View style={modalStyles.field}>
                      <Text style={modalStyles.label}>Start Date *</Text>
                      <TouchableOpacity
                        style={modalStyles.selectButton}
                        onPress={() => openDatePicker('start')}
                        activeOpacity={0.7}
                      >
                        <Text style={[modalStyles.selectButtonText, !formData.startDate && modalStyles.placeholderText]}>
                          {formData.startDate ? formatDate(formData.startDate) : 'Select Start Date'}
                        </Text>
                        <Calendar size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={modalStyles.field}>
                      <Text style={modalStyles.label}>End Date</Text>
                      <TouchableOpacity
                        style={modalStyles.selectButton}
                        onPress={() => openDatePicker('end')}
                        activeOpacity={0.7}
                      >
                        <Text style={[modalStyles.selectButtonText, !formData.endDate && modalStyles.placeholderText]}>
                          {formData.endDate ? formatDate(formData.endDate) : 'Select End Date'}
                        </Text>
                        <Calendar size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={modalStyles.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Status"
                      value={formData.status}
                      onPress={() => openDropdown('create', 'status')}
                      placeholder="Select Status"
                      displayValue={getStatusDisplayValue(formData.status)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={modalStyles.field}>
                      <Text style={modalStyles.label}>Budget Hours</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={String(formData.budgetHours)}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, budgetHours: Number(text) || 0 }))}
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                </View>

                <FormField
                  label="Project Manager"
                  value={formData.managerId}
                  onPress={() => openDropdown('create', 'manager')}
                  placeholder="Select Manager"
                  required
                  displayValue={getManagerDisplayValue(formData.managerId)}
                />

                <TextInputField
                  label="Client Name"
                  value={formData.clientName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, clientName: text }))}
                  placeholder="Optional"
                />

                <TextInputField
                  label="Description"
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Optional project details..."
                  multiline
                  numberOfLines={3}
                />

                <View style={modalStyles.switchRow}>
                  <View>
                    <Text style={modalStyles.switchLabel}>Only Project Tasks</Text>
                    <Text style={modalStyles.switchSub}>Only show project-specific tasks in timesheet</Text>
                  </View>
                  <Switch
                    value={formData.onlyProjectTasks}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, onlyProjectTasks: value }))}
                    trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                    thumbColor="white"
                  />
                </View>

                <View style={modalStyles.section}>
                  <View style={modalStyles.sectionHeader}>
                    <Text style={modalStyles.sectionTitle}>Team Assignment</Text>
                    <TouchableOpacity onPress={addTeamMember} style={modalStyles.addButton}>
                      <UserPlus size={16} color="#3b82f6" />
                      <Text style={modalStyles.addButtonText}>Add Member</Text>
                    </TouchableOpacity>
                  </View>
                  {formData.allocatedEmployees.map((member, idx) => (
                    <TeamMemberRow
                      key={idx}
                      member={member}
                      index={idx}
                      onUpdate={updateTeamMember}
                      onRemove={removeTeamMember}
                      employees={allEmployees}
                      onSelectEmployee={(index) => openEmployeeDropdown('create', index)}
                    />
                  ))}
                  {formData.allocatedEmployees.length === 0 && (
                    <Text style={modalStyles.emptyText}>No team members assigned yet</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]}
                  onPress={handleCreateProject}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Save size={16} color="white" />
                      <Text style={modalStyles.submitText}>Create Project</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Project Modal */}
      <Modal visible={showViewModal} animationType="slide" transparent={true}>
        <View style={detailModalStyles.overlay}>
          <View style={detailModalStyles.container}>
            <View style={detailModalStyles.header}>
              <Text style={detailModalStyles.title}>Project Details</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {selectedProject && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={detailModalStyles.content}>
                  <View style={detailModalStyles.iconHeader}>
                    <FolderOpen size={32} color="#3b82f6" />
                    <Text style={detailModalStyles.projectName}>{selectedProject.name}</Text>
                    <Text style={detailModalStyles.projectCode}>{selectedProject.code}</Text>
                  </View>

                  <View style={detailModalStyles.infoGrid}>
                    <View style={detailModalStyles.infoItem}>
                      <Text style={detailModalStyles.infoLabel}>Manager</Text>
                      <Text style={detailModalStyles.infoValue}>
                        {typeof selectedProject.managerId === 'object' ? selectedProject.managerId?.name : '—'}
                      </Text>
                    </View>
                    <View style={detailModalStyles.infoItem}>
                      <Text style={detailModalStyles.infoLabel}>Client</Text>
                      <Text style={detailModalStyles.infoValue}>{selectedProject.clientName || '—'}</Text>
                    </View>
                    <View style={detailModalStyles.infoItem}>
                      <Text style={detailModalStyles.infoLabel}>Start Date</Text>
                      <Text style={detailModalStyles.infoValue}>{formatDate(selectedProject.startDate)}</Text>
                    </View>
                    <View style={detailModalStyles.infoItem}>
                      <Text style={detailModalStyles.infoLabel}>End Date</Text>
                      <Text style={detailModalStyles.infoValue}>{formatDate(selectedProject.endDate || '')}</Text>
                    </View>
                    <View style={detailModalStyles.infoItem}>
                      <Text style={detailModalStyles.infoLabel}>Budget Hours</Text>
                      <Text style={detailModalStyles.infoValue}>{selectedProject.budgetHours || 0}h</Text>
                    </View>
                    <View style={detailModalStyles.infoItem}>
                      <Text style={detailModalStyles.infoLabel}>Status</Text>
                      <View style={[detailModalStyles.statusBadge, { backgroundColor: getStatusStyle(selectedProject.status).bg }]}>
                        <Text style={[detailModalStyles.statusText, { color: getStatusStyle(selectedProject.status).text }]}>
                          {getStatusStyle(selectedProject.status).label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedProject.description && (
                    <View style={detailModalStyles.descriptionBox}>
                      <Text style={detailModalStyles.descriptionLabel}>Description</Text>
                      <Text style={detailModalStyles.descriptionText}>{selectedProject.description}</Text>
                    </View>
                  )}

                  {selectedProject.allocatedEmployees.length > 0 && (
                    <View style={detailModalStyles.teamSection}>
                      <Text style={detailModalStyles.teamTitle}>Team Members ({selectedProject.allocatedEmployees.length})</Text>
                      {selectedProject.allocatedEmployees.map((member, idx) => (
                        <View key={idx} style={detailModalStyles.teamItem}>
                          <View>
                            <Text style={detailModalStyles.teamName}>
                              {typeof member.userId === 'object' ? (member.userId as User)?.name : '—'}
                            </Text>
                            <Text style={detailModalStyles.teamRole}>{member.role}</Text>
                          </View>
                          <View style={detailModalStyles.teamStats}>
                            <Text style={detailModalStyles.teamPercent}>{member.allocationPercent}%</Text>
                            <Text style={detailModalStyles.teamHours}>{member.budgetHours}h</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
            <View style={detailModalStyles.footer}>
              <TouchableOpacity
                style={detailModalStyles.editButton}
                onPress={() => {
                  if (selectedProject) {
                    setShowViewModal(false);
                    openEditModal(selectedProject);
                  }
                }}
              >
                <Pencil size={16} color="#3b82f6" />
                <Text style={detailModalStyles.editButtonText}>Edit Project</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={detailModalStyles.closeButton}
                onPress={() => setShowViewModal(false)}
              >
                <Text style={detailModalStyles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={deleteModalStyles.overlay}>
          <View style={deleteModalStyles.container}>
            <View style={deleteModalStyles.iconContainer}>
              <Trash2 size={32} color="#ef4444" />
            </View>
            <Text style={deleteModalStyles.title}>Delete Project?</Text>
            <Text style={deleteModalStyles.message}>
              Are you sure you want to delete "{selectedProject?.name}"? This action cannot be undone.
            </Text>
            <View style={deleteModalStyles.buttonRow}>
              <TouchableOpacity style={deleteModalStyles.cancelButton} onPress={() => setShowDeleteModal(false)}>
                <Text style={deleteModalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={deleteModalStyles.deleteButton} onPress={handleDeleteProject}>
                <Trash2 size={16} color="white" />
                <Text style={deleteModalStyles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Project Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Edit Project</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.form}>
                <TextInputField
                  label="Project Name"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g. Website Redesign"
                  required
                />

                <TextInputField
                  label="Project Code"
                  value={formData.code}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, code: text.toUpperCase() }))}
                  placeholder="PRJ-001"
                  required
                  autoCapitalize="characters"
                />

                <View style={modalStyles.row}>
                  <View style={{ flex: 1 }}>
                    <View style={modalStyles.field}>
                      <Text style={modalStyles.label}>Start Date *</Text>
                      <TouchableOpacity
                        style={modalStyles.selectButton}
                        onPress={() => openDatePicker('start')}
                        activeOpacity={0.7}
                      >
                        <Text style={[modalStyles.selectButtonText, !formData.startDate && modalStyles.placeholderText]}>
                          {formData.startDate ? formatDate(formData.startDate) : 'Select Start Date'}
                        </Text>
                        <Calendar size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={modalStyles.field}>
                      <Text style={modalStyles.label}>End Date</Text>
                      <TouchableOpacity
                        style={modalStyles.selectButton}
                        onPress={() => openDatePicker('end')}
                        activeOpacity={0.7}
                      >
                        <Text style={[modalStyles.selectButtonText, !formData.endDate && modalStyles.placeholderText]}>
                          {formData.endDate ? formatDate(formData.endDate) : 'Select End Date'}
                        </Text>
                        <Calendar size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={modalStyles.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Status"
                      value={formData.status}
                      onPress={() => openDropdown('edit', 'status')}
                      placeholder="Select Status"
                      displayValue={getStatusDisplayValue(formData.status)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={modalStyles.field}>
                      <Text style={modalStyles.label}>Budget Hours</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={String(formData.budgetHours)}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, budgetHours: Number(text) || 0 }))}
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                </View>

                <FormField
                  label="Project Manager"
                  value={formData.managerId}
                  onPress={() => openDropdown('edit', 'manager')}
                  placeholder="Select Manager"
                  required
                  displayValue={getManagerDisplayValue(formData.managerId)}
                />

                <TextInputField
                  label="Client Name"
                  value={formData.clientName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, clientName: text }))}
                  placeholder="Optional"
                />

                <TextInputField
                  label="Description"
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Optional project details..."
                  multiline
                  numberOfLines={3}
                />

                <View style={modalStyles.switchRow}>
                  <View>
                    <Text style={modalStyles.switchLabel}>Only Project Tasks</Text>
                    <Text style={modalStyles.switchSub}>Only show project-specific tasks in timesheet</Text>
                  </View>
                  <Switch
                    value={formData.onlyProjectTasks}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, onlyProjectTasks: value }))}
                    trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                    thumbColor="white"
                  />
                </View>

                <View style={modalStyles.section}>
                  <View style={modalStyles.sectionHeader}>
                    <Text style={modalStyles.sectionTitle}>Team Assignment</Text>
                    <TouchableOpacity onPress={addTeamMember} style={modalStyles.addButton}>
                      <UserPlus size={16} color="#3b82f6" />
                      <Text style={modalStyles.addButtonText}>Add Member</Text>
                    </TouchableOpacity>
                  </View>
                  {formData.allocatedEmployees.map((member, idx) => (
                    <TeamMemberRow
                      key={idx}
                      member={member}
                      index={idx}
                      onUpdate={updateTeamMember}
                      onRemove={removeTeamMember}
                      employees={allEmployees}
                      onSelectEmployee={(index) => openEmployeeDropdown('edit', index)}
                    />
                  ))}
                  {formData.allocatedEmployees.length === 0 && (
                    <Text style={modalStyles.emptyText}>No team members assigned yet</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]}
                  onPress={handleUpdateProject}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Save size={16} color="white" />
                      <Text style={modalStyles.submitText}>Update Project</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 130, paddingBottom: 100 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '22%', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 4 },

  searchContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },

  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  exportButtonText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 13,
  },

  filterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterButtonActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#3b82f6', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },

  filterPanel: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  filterTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  filterField: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  filterSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10 },
  filterSelectText: { fontSize: 14, color: '#1e293b', flex: 1 },
  placeholderText: { color: '#94a3b8' },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  filterClear: { flex: 1, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  filterClearText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterApply: { flex: 2, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center' },
  filterApplyText: { fontSize: 13, fontWeight: '600', color: 'white' },

  card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  projectInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  projectIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  projectName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  projectCode: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  cardBody: { padding: 16, gap: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardText: { fontSize: 13, color: '#475569', flex: 1 },
  cardFooter: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f8fafc' },
  actionButtonText: { fontSize: 12, fontWeight: '500', color: '#64748b' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 20 },
  pageButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  pageInfo: { fontSize: 13, color: '#64748b' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  form: { padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8fafc' },
  selectButtonText: { fontSize: 14, color: '#1e293b', flex: 1 },
  placeholderText: { color: '#94a3b8' },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  switchSub: { fontSize: 10, color: '#64748b', marginTop: 2 },
  section: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  memberField: { flex: 2 },
  memberFieldSmall: { flex: 1 },
  memberSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f8fafc' },
  memberSelectText: { fontSize: 12, color: '#1e293b', flex: 1 },
  memberInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, backgroundColor: '#f8fafc' },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 20 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  disabledButton: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: '700', color: 'white' },
});

const dropdownStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  closeButton: { padding: 4 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionSelected: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: 15, color: '#1e293b' },
  optionTextSelected: { color: '#3b82f6', fontWeight: '600' },
  checkmark: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
});

const detailModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', borderRadius: 24, width: '90%', maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  content: { padding: 20 },
  iconHeader: { alignItems: 'center', marginBottom: 20 },
  projectName: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 12 },
  projectCode: { fontSize: 12, color: '#64748b', marginTop: 4 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  infoItem: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '500', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  descriptionBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20 },
  descriptionLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  descriptionText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  teamSection: { marginTop: 8 },
  teamTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  teamItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
  teamName: { fontSize: 13, fontWeight: '500', color: '#1e293b' },
  teamRole: { fontSize: 11, color: '#64748b', marginTop: 2 },
  teamStats: { alignItems: 'flex-end' },
  teamPercent: { fontSize: 13, fontWeight: '700', color: '#3b82f6' },
  teamHours: { fontSize: 11, color: '#64748b', marginTop: 2 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', paddingVertical: 12, borderRadius: 12 },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  closeButton: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { fontSize: 14, fontWeight: '600', color: 'white' },
});

const deleteModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '80%', alignItems: 'center' },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  message: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  deleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#ef4444' },
  deleteButtonText: { fontSize: 14, fontWeight: '600', color: 'white' },
});

const exportModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 20,
  },
  formatSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  formatOptions: {
    gap: 8,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  formatOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  formatText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  formatTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
});