// screens/tasks/TasksScreen.tsx
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { exportFile } from '../../utils/exportHelper';
import RNFS from 'react-native-fs';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Pencil,
  Trash2,
  ListTodo,
  FolderOpen,
  BarChart,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Save,
  Calendar,
} from 'lucide-react-native';
import { taskAPI, projectAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import { convertToCSV } from '../../utils/exportHelper';
import { FileSpreadsheet } from 'lucide-react-native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

// ==================== Styles ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: scale(16), paddingTop: verticalScale(16), paddingBottom: verticalScale(100) },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
    marginBottom: verticalScale(20),
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: verticalScale(110),
  },
  statIconContainer: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  statValue: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#64748b',
    marginTop: verticalScale(4),
    letterSpacing: 0.5,
  },

  searchContainer: { flexDirection: 'row', gap: moderateScale(8), marginBottom: verticalScale(16), flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: scale(200), flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: moderateScale(12), borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: scale(12), minHeight: verticalScale(48), gap: moderateScale(8) },
  searchInput: { flex: 1, fontSize: moderateScale(14), color: '#1e293b', paddingVertical: 0, height: '100%' },
  filterButton: { width: scale(44), height: verticalScale(44), borderRadius: moderateScale(12), backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterButtonActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  filterBadge: { position: 'absolute', top: verticalScale(-4), right: scale(-4), backgroundColor: '#3b82f6', borderRadius: moderateScale(10), minWidth: scale(18), height: verticalScale(18), alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(4) },
  filterBadgeText: { color: 'white', fontSize: moderateScale(10), fontWeight: '700' },
  bulkButton: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4), backgroundColor: '#eff6ff', paddingHorizontal: scale(12), paddingVertical: verticalScale(10), borderRadius: moderateScale(12), borderWidth: 1, borderColor: '#bfdbfe' },
  bulkButtonText: { color: '#3b82f6', fontWeight: '600', fontSize: moderateScale(12) },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(6), backgroundColor: '#3b82f6', paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: moderateScale(12) },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(12),
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  exportButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: moderateScale(13),
  },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: moderateScale(13) },

  filterPanel: { backgroundColor: 'white', borderRadius: moderateScale(16), padding: moderateScale(16), marginBottom: verticalScale(16), borderWidth: 1, borderColor: '#e2e8f0' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(12) },
  filterTitle: { fontSize: moderateScale(14), fontWeight: '600', color: '#1e293b' },
  filterResetText: { fontSize: moderateScale(11), fontWeight: '600', color: '#3b82f6' },
  filterField: { marginBottom: verticalScale(12) },
  filterLabel: { fontSize: moderateScale(12), fontWeight: '600', color: '#64748b', marginBottom: verticalScale(4) },
  filterSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: moderateScale(10), backgroundColor: '#f8fafc', paddingHorizontal: scale(12), paddingVertical: verticalScale(10) },
  filterSelectText: { fontSize: moderateScale(14), color: '#1e293b', flex: 1 },
  filterPlaceholderText: { color: '#94a3b8' },
  filterActions: { flexDirection: 'row', gap: moderateScale(12), marginTop: verticalScale(8) },
  filterClear: { flex: 1, paddingVertical: verticalScale(10), backgroundColor: '#f1f5f9', borderRadius: moderateScale(10), alignItems: 'center' },
  filterClearText: { fontSize: moderateScale(13), fontWeight: '600', color: '#64748b' },
  filterApply: { flex: 2, paddingVertical: verticalScale(10), backgroundColor: '#3b82f6', borderRadius: moderateScale(10), alignItems: 'center' },
  filterApplyText: { fontSize: moderateScale(13), fontWeight: '600', color: 'white' },

  resultsCount: { fontSize: moderateScale(10), fontWeight: '700', color: '#94a3b8', marginBottom: verticalScale(12), letterSpacing: 1 },

  card: {
    backgroundColor: 'white',
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  taskInfo: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12), flex: 1 },
  taskIcon: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe'
  },
  avatarText: { fontSize: moderateScale(16), fontWeight: 'bold', color: '#4f46e5' },
  taskName: { fontSize: moderateScale(15), fontWeight: '700', color: '#1e293b' },
  projectName: { fontSize: moderateScale(12), color: '#64748b', marginTop: verticalScale(2) },
  priorityBadge: { paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: moderateScale(12) },
  priorityText: { fontSize: moderateScale(10), fontWeight: '600' },
  cardContent: { padding: moderateScale(16), gap: moderateScale(8) },
  taskDescription: { fontSize: moderateScale(13), color: '#475569', marginBottom: verticalScale(4), lineHeight: moderateScale(18) },
  dueDateContainer: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(6) },
  dueDateText: { fontSize: moderateScale(12), color: '#64748b' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(12),
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa'
  },
  footerLeft: { flex: 1 },
  statusBadge: { paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: moderateScale(12) },
  statusText: { fontSize: moderateScale(10), fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: moderateScale(8) },
  actionBtn: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: verticalScale(48), backgroundColor: 'white', borderRadius: moderateScale(24), borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: moderateScale(16), fontWeight: '700', color: '#1e293b', marginTop: verticalScale(16) },
  emptyText: { fontSize: moderateScale(13), color: '#64748b', marginTop: verticalScale(8), textAlign: 'center' },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: moderateScale(16), paddingVertical: verticalScale(20) },
  pageButton: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(6), paddingHorizontal: scale(12), paddingVertical: verticalScale(8), backgroundColor: 'white', borderRadius: moderateScale(8), borderWidth: 1, borderColor: '#e2e8f0' },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { fontSize: moderateScale(13), fontWeight: '600', color: '#3b82f6' },
  pageInfo: { fontSize: moderateScale(13), color: '#64748b' },
});

const exportModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', borderRadius: moderateScale(24), width: '90%', maxHeight: '85%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(20), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b' },
  content: { padding: moderateScale(20) },
  description: { fontSize: moderateScale(13), color: '#64748b', marginBottom: verticalScale(20), lineHeight: moderateScale(18) },
  formatSection: { marginBottom: verticalScale(20) },
  sectionTitle: { fontSize: moderateScale(14), fontWeight: '700', color: '#1e293b', marginBottom: verticalScale(12) },
  formatOptions: { gap: moderateScale(12) },
  formatOption: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12), padding: moderateScale(14), borderRadius: moderateScale(12), borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  formatOptionSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  formatText: { fontSize: moderateScale(14), fontWeight: '600', color: '#64748b' },
  formatTextSelected: { color: '#3b82f6' },
  infoBox: { flexDirection: 'row', gap: moderateScale(8), backgroundColor: '#f1f5f9', padding: moderateScale(12), borderRadius: moderateScale(10), alignItems: 'center' },
  infoText: { fontSize: moderateScale(12), color: '#64748b', flex: 1 },
  footer: { flexDirection: 'row', gap: moderateScale(12), padding: moderateScale(20), borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { flex: 1, paddingVertical: verticalScale(12), borderRadius: moderateScale(12), backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#64748b' },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: moderateScale(8), backgroundColor: '#3b82f6', paddingVertical: verticalScale(12), borderRadius: moderateScale(12) },
  exportButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: 'white' },
  disabledButton: { opacity: 0.6 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: moderateScale(24), borderTopRightRadius: moderateScale(24), maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(20), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b' },
  form: { padding: moderateScale(20), gap: moderateScale(16) },
  field: { gap: moderateScale(6) },
  label: { fontSize: moderateScale(13), fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: moderateScale(12), paddingHorizontal: scale(16), paddingVertical: verticalScale(12), fontSize: moderateScale(14), color: '#1e293b', backgroundColor: '#f8fafc' },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: moderateScale(12), paddingHorizontal: scale(16), paddingVertical: verticalScale(12), backgroundColor: '#f8fafc' },
  selectButtonText: { fontSize: moderateScale(14), color: '#1e293b', flex: 1 },
  selectPlaceholderText: { color: '#94a3b8' },
  textArea: { height: verticalScale(80), textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: moderateScale(12) },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: verticalScale(12), backgroundColor: '#f8fafc', borderRadius: moderateScale(12), paddingHorizontal: scale(16) },
  switchLabel: { fontSize: moderateScale(13), fontWeight: '600', color: '#1e293b' },
  switchSub: { fontSize: moderateScale(10), color: '#64748b', marginTop: verticalScale(2) },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: moderateScale(8), backgroundColor: '#3b82f6', paddingVertical: verticalScale(14), borderRadius: moderateScale(12), marginTop: verticalScale(16) },
  disabledButton: { opacity: 0.5 },
  submitText: { fontSize: moderateScale(14), fontWeight: '700', color: 'white' },
});

const dropdownStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: moderateScale(24), borderTopRightRadius: moderateScale(24), maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(20), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b' },
  closeButton: { padding: moderateScale(4) },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingVertical: verticalScale(14), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionSelected: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: moderateScale(15), color: '#1e293b' },
  optionTextSelected: { color: '#3b82f6', fontWeight: '600' },
  checkmark: { width: scale(8), height: verticalScale(8), borderRadius: moderateScale(4), backgroundColor: '#3b82f6' },
});

const detailModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', borderRadius: moderateScale(24), width: '90%', maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(20), borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b' },
  content: { padding: moderateScale(20) },
  iconHeader: { alignItems: 'center', marginBottom: verticalScale(20) },
  taskName: { fontSize: moderateScale(20), fontWeight: '700', color: '#1e293b', marginTop: verticalScale(12), textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: moderateScale(8), marginTop: verticalScale(8) },
  priorityBadge: { paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: moderateScale(12) },
  priorityText: { fontSize: moderateScale(11), fontWeight: '600' },
  statusBadge: { paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: moderateScale(12) },
  statusText: { fontSize: moderateScale(11), fontWeight: '600' },
  infoCard: { backgroundColor: '#f8fafc', borderRadius: moderateScale(12), padding: moderateScale(16), marginBottom: verticalScale(12) },
  infoLabel: { fontSize: moderateScale(11), fontWeight: '600', color: '#64748b', marginBottom: verticalScale(4) },
  infoValue: { fontSize: moderateScale(13), color: '#1e293b' },
  row: { flexDirection: 'row', gap: moderateScale(12) },
  footer: { flexDirection: 'row', gap: moderateScale(12), padding: moderateScale(20), borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: moderateScale(8), backgroundColor: '#eff6ff', paddingVertical: verticalScale(12), borderRadius: moderateScale(12) },
  editButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#3b82f6' },
  closeButton: { flex: 1, backgroundColor: '#1e293b', paddingVertical: verticalScale(12), borderRadius: moderateScale(12), alignItems: 'center' },
  closeButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: 'white' },
});

const deleteModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', borderRadius: moderateScale(24), padding: moderateScale(24), width: '80%', alignItems: 'center' },
  iconContainer: { width: scale(64), height: verticalScale(64), borderRadius: moderateScale(32), backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(16) },
  title: { fontSize: moderateScale(18), fontWeight: '700', color: '#1e293b', marginBottom: verticalScale(8) },
  message: { fontSize: moderateScale(13), color: '#64748b', textAlign: 'center', marginBottom: verticalScale(24) },
  buttonRow: { flexDirection: 'row', gap: moderateScale(12), width: '100%' },
  cancelButton: { flex: 1, paddingVertical: verticalScale(12), borderRadius: moderateScale(12), backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#64748b' },
  deleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: moderateScale(6), paddingVertical: verticalScale(12), borderRadius: moderateScale(12), backgroundColor: '#ef4444' },
  deleteButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: 'white' },
});

// ==================== Types ====================
interface AppUser {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  _id: string;
  id: string;
  name: string;
  code: string;
  onlyProjectTasks?: boolean;
}

type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'on-hold';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  _id: string;
  id: string;
  name: string;
  description?: string;
  projectId: Project | string;
  status: TaskStatus;
  priority: TaskPriority;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
}

interface TasksResponse {
  data: Task[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
}

interface DropdownOption {
  value: string;
  label: string;
}

const statusColors: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fffbeb', text: '#f59e0b', label: 'Pending' },
  'in-progress': { bg: '#eff6ff', text: '#3b82f6', label: 'In Progress' },
  completed: { bg: '#ecfdf5', text: '#10b981', label: 'Completed' },
  'on-hold': { bg: '#fef2f2', text: '#ef4444', label: 'On Hold' },
};

const priorityColors: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  low: { bg: '#ecfdf5', text: '#10b981', label: 'Low' },
  medium: { bg: '#eff6ff', text: '#3b82f6', label: 'Medium' },
  high: { bg: '#fef3c7', text: '#d97706', label: 'High' },
  urgent: { bg: '#fef2f2', text: '#ef4444', label: 'Urgent' },
};

const INITIAL_FORM = {
  name: '',
  description: '',
  projectId: '',
  status: 'pending' as TaskStatus,
  priority: 'medium' as TaskPriority,
  isActive: true,
  onlyProjectTasks: false,
  dueDate: '',
};

// Helper function to safely extract data from API response
const extractResponseData = (response: any) => {
  if (!response) return { data: [], pagination: { page: 1, totalPages: 1, total: 0 } };

  // If the structure is { success: true, data: { data: [], pagination: {} } }
  if (response.data && response.data.data && Array.isArray(response.data.data)) {
    return {
      data: response.data.data,
      pagination: response.pagination || response.data.pagination || { page: 1, totalPages: 1, total: 0 }
    };
  }

  // If the structure is { success: true, data: [], pagination: {} }
  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      pagination: response.pagination || { page: 1, totalPages: 1, total: 0 }
    };
  }

  // Fallback for direct array or other structures
  const data = Array.isArray(response) ? response : (response.data || []);
  return {
    data: Array.isArray(data) ? data : [],
    pagination: response.pagination || { page: 1, totalPages: 1, total: 0 }
  };
};

// ==================== Helper Components ====================
interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
}

const DropdownModal = memo(({ visible, onClose, options, selectedValue, onSelect, title }: DropdownModalProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={dropdownStyles.overlay}>
      <View style={dropdownStyles.container}>
        <View style={dropdownStyles.header}>
          <Text style={dropdownStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={dropdownStyles.closeButton}><X size={20} color="#64748b" /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <TouchableOpacity key={option.value} style={[dropdownStyles.option, selectedValue === option.value && dropdownStyles.optionSelected]} onPress={() => { onSelect(selectedValue === option.value ? '' : option.value); onClose(); }}>
              <Text style={[dropdownStyles.optionText, selectedValue === option.value && dropdownStyles.optionTextSelected]}>{option.label}</Text>
              {selectedValue === option.value && <View style={dropdownStyles.checkmark} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

interface FormFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  placeholder: string;
  required?: boolean;
  showChevron?: boolean;
  displayValue?: string;
}

const FormField = memo(({ label, value, onPress, placeholder, required, showChevron = true, displayValue }: FormFieldProps) => (
  <View style={modalStyles.field}>
    <Text style={modalStyles.label}>{label} {required && '*'}</Text>
    <TouchableOpacity style={modalStyles.selectButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={[modalStyles.selectButtonText, !value && modalStyles.selectPlaceholderText]}>{displayValue || placeholder}</Text>
      {showChevron && <ChevronDown size={16} color="#64748b" />}
    </TouchableOpacity>
  </View>
));

interface TextInputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

const TextInputField = memo(({ label, value, onChangeText, placeholder, required, multiline = false, numberOfLines = 1 }: TextInputFieldProps) => (
  <View style={modalStyles.field}>
    <Text style={modalStyles.label}>{label} {required && '*'}</Text>
    <TextInput
      style={[modalStyles.input, multiline && modalStyles.textArea]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      placeholderTextColor="#94a3b8"
    />
  </View>
));

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const StatCard = memo(({ title, value, icon: Icon, color, bgColor }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
      <Icon size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{title.toUpperCase()}</Text>
  </View>
));

interface TaskCardProps {
  task: Task;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  getStatusStyle: (status: string) => { bg: string; text: string; label: string };
  getPriorityStyle: (priority: string) => { bg: string; text: string; label: string };
  formatDate: (dateString: string) => string;
}

const TaskCard = memo(({ task, onView, onEdit, onDelete, getStatusStyle, getPriorityStyle, formatDate }: TaskCardProps) => {
  const statusStyle = getStatusStyle(task.status);
  const priorityStyle = getPriorityStyle(task.priority);
  const projectName = typeof task.projectId === 'object' ? task.projectId?.name : '—';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.taskInfo}>
          <View style={styles.taskIcon}>
            <Text style={styles.avatarText}>{(task.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskName} numberOfLines={1}>{task.name}</Text>
            <Text style={styles.projectName}>{projectName}</Text>
          </View>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.priorityText, { color: priorityStyle.text }]}>{priorityStyle.label}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.cardContent}>
        {task.description ? (
          <Text style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>
        ) : null}
        {task.dueDate ? (
          <View style={styles.dueDateContainer}>
            <Calendar size={13} color="#64748b" />
            <Text style={styles.dueDateText}>Due: {formatDate(task.dueDate)}</Text>
          </View>
        ) : null}
        <View style={styles.dueDateContainer}>
          <Calendar size={13} color="#64748b" />
          <Text style={styles.dueDateText}>Created: {formatDate(task.createdAt)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => onView(task)} style={[styles.actionBtn, { backgroundColor: '#f5f3ff' }]}>
            <Eye size={16} color="#8b5cf6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(task)} style={[styles.actionBtn, { backgroundColor: '#fffbeb' }]}>
            <Pencil size={16} color="#f59e0b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(task)} style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}>
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// Export Modal Component
const ExportModal = memo(({ visible, onClose, onExport, isExporting }: any) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel'>('csv');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={exportModalStyles.overlay}>
        <View style={exportModalStyles.container}>
          <View style={exportModalStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
              <Download size={24} color="#3b82f6" />
              <Text style={exportModalStyles.title}>Export Tasks</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X size={24} color="#64748b" /></TouchableOpacity>
          </View>

          <View style={exportModalStyles.content}>
            <Text style={exportModalStyles.description}>
              Export your task list to your device. The file will include all task details, project names, status, and priority information.
            </Text>

            <View style={exportModalStyles.formatSection}>
              <Text style={exportModalStyles.sectionTitle}>Select Format</Text>
              <View style={exportModalStyles.formatOptions}>
                <TouchableOpacity
                  style={[exportModalStyles.formatOption, selectedFormat === 'csv' && exportModalStyles.formatOptionSelected]}
                  onPress={() => setSelectedFormat('csv')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'csv' ? '#3b82f6' : '#64748b'} />
                  <Text style={[exportModalStyles.formatText, selectedFormat === 'csv' && exportModalStyles.formatTextSelected]}>CSV Format</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[exportModalStyles.formatOption, selectedFormat === 'excel' && exportModalStyles.formatOptionSelected]}
                  onPress={() => setSelectedFormat('excel')}
                >
                  <FileSpreadsheet size={20} color={selectedFormat === 'excel' ? '#3b82f6' : '#64748b'} />
                  <Text style={[exportModalStyles.formatText, selectedFormat === 'excel' && exportModalStyles.formatTextSelected]}>Excel Format (.xls)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={exportModalStyles.infoBox}>
              <BarChart size={14} color="#64748b" />
              <Text style={exportModalStyles.infoText}>Export will include all tasks based on current filters.</Text>
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

// ==================== Main Component ====================
export default function TasksScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({ projectId: '', status: '' });
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, onHold: 0 });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [dropdownContext, setDropdownContext] = useState<'create' | 'edit' | 'bulk' | 'filter'>('create');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerContext, setDatePickerContext] = useState<'create' | 'edit'>('create');
  const [tempDate, setTempDate] = useState(new Date());

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editFormData, setEditFormData] = useState(INITIAL_FORM);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [bulkIsolate, setBulkIsolate] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const limit = 10;

  const statusOptions: DropdownOption[] = useMemo(() => [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' },
  ], []);

  const priorityOptions: DropdownOption[] = useMemo(() => [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ], []);

  const projectOptions: DropdownOption[] = useMemo(() =>
    projects.map(p => ({ value: p._id || p.id, label: p.name })), [projects]);

  useFocusEffect(useCallback(() => {
    loadUserData();
    fetchProjects();
    if (page === 1) {
      fetchTasks(1);
    }
  }, [user?.id, user?._id]));

  // Use a debounced effect for search and filters to fetch data
  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      // Fetch if search is empty or has at least 2 chars, or if filters are active
      if (searchQuery.trim().length >= 2 || searchQuery.trim().length === 0 || projectFilter || statusFilter) {
        if (page === 1) {
          fetchTasks(1);
        } else {
          setPage(1);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, projectFilter, statusFilter, user?.id, user?._id]);

  // Handle page change separately
  useEffect(() => {
    if (user && page !== 1) {
      fetchTasks(page);
    }
  }, [page]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser({
          id: parsedUser.id || parsedUser._id,
          _id: parsedUser._id || parsedUser.id,
          name: parsedUser.name,
          email: parsedUser.email,
          role: parsedUser.role
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll({ limit: 5000 });
      const extracted = extractResponseData(response);
      setProjects(extracted.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTasks = async (pageNumber?: number) => {
    try {
      setLoading(true);
      const targetPage = pageNumber ?? page;
      const params: any = { page: targetPage, limit };
      if (searchQuery.trim().length >= 2) params.search = searchQuery.trim();
      if (projectFilter) params.projectId = projectFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await taskAPI.getAll(params);
      const extracted = extractResponseData(response);

      setTasks(extracted.data);
      setTotalPages(extracted.pagination.totalPages || 1);
      setTotalResults(extracted.pagination.total || 0);

      // Fetch accurate stats ignoring pagination
      const statsParams: any = { limit: 10000 };
      if (searchQuery.trim().length >= 2) statsParams.search = searchQuery.trim();
      if (projectFilter) statsParams.projectId = projectFilter;
      const statsResponse = await taskAPI.getAll(statsParams);
      const statsData = extractResponseData(statsResponse).data;
      
      setTaskStats({
        total: statsData.length,
        pending: statsData.filter((t: any) => t.status?.toLowerCase() === 'pending').length,
        inProgress: statsData.filter((t: any) => t.status?.toLowerCase() === 'in-progress').length,
        completed: statsData.filter((t: any) => t.status?.toLowerCase() === 'completed').length,
        onHold: statsData.filter((t: any) => t.status?.toLowerCase() === 'on-hold').length,
      });
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', error?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    await fetchProjects();
    setRefreshing(false);
  };

  const handleCreateTask = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Task name is required');
      return;
    }
    if (!formData.projectId) {
      Alert.alert('Error', 'Project is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await taskAPI.create(formData);
      if (formData.onlyProjectTasks && formData.projectId) {
        await projectAPI.update(formData.projectId, { onlyProjectTasks: true });
      }
      Alert.alert('Success', 'Task created successfully!');
      setShowCreateModal(false);
      setFormData(INITIAL_FORM);
      await fetchTasks();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const taskId = selectedTask._id || selectedTask.id;
      await taskAPI.update(taskId, editFormData);
      if (editFormData.onlyProjectTasks && editFormData.projectId) {
        await projectAPI.update(editFormData.projectId, { onlyProjectTasks: true });
      }
      Alert.alert('Success', 'Task updated successfully!');
      setShowEditModal(false);
      setSelectedTask(null);
      await fetchTasks();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const taskId = selectedTask._id || selectedTask.id;
      await taskAPI.delete(taskId);
      Alert.alert('Success', 'Task deleted successfully!');
      setShowDeleteModal(false);
      setSelectedTask(null);
      await fetchTasks();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkProjectId) {
      Alert.alert('Error', 'Please select a project');
      return;
    }
    const names = bulkNames.split('\n').map(n => n.trim()).filter(n => !!n);
    if (names.length === 0) {
      Alert.alert('Error', 'Please enter at least one task name');
      return;
    }
    const tasksToCreate = names.map(name => ({
      name,
      projectId: bulkProjectId,
      status: 'pending' as TaskStatus,
      priority: 'medium' as TaskPriority
    }));
    setIsSubmitting(true);
    try {
      await taskAPI.bulkCreate({ tasks: tasksToCreate });
      if (bulkIsolate && bulkProjectId) {
        await projectAPI.update(bulkProjectId, { onlyProjectTasks: true });
      }
      Alert.alert('Success', `${tasksToCreate.length} tasks created successfully!`);
      setShowBulkModal(false);
      setBulkNames('');
      setBulkProjectId('');
      setBulkIsolate(false);
      await fetchTasks();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async (formatType: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      const params: any = { limit: 10000 };
      if (searchQuery.length >= 2) params.search = searchQuery;
      if (projectFilter) params.projectId = projectFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await taskAPI.getAll(params);
      const extracted = extractResponseData(response);
      const tasksList = extracted.data;

      if (!tasksList.length) {
        Alert.alert('No Data', 'No tasks available to export.');
        return;
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      // Use .csv for both to ensure overall mobile compatibility (Office mobile often rejects fake .xls)
      const fileName = `tasks_export_${timestamp}.csv`;

      const headers = ['Task Name', 'Project', 'Status', 'Priority', 'Description', 'Due Date', 'Created At'];
      const rows = tasksList.map((task: Task) => {
        const projectName = typeof task.projectId === 'object' ? task.projectId?.name : '—';
        return [
          task.name,
          projectName,
          task.status,
          task.priority,
          task.description || '',
          task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '—',
          format(new Date(task.createdAt), 'yyyy-MM-dd')
        ];
      });

      const content = convertToCSV(headers, rows);
      await exportFile(content, fileName, 'text/csv');
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export tasks. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    const projectId = typeof task.projectId === 'object' ? (task.projectId as Project)._id || (task.projectId as Project).id : task.projectId;
    setEditFormData({
      name: task.name,
      description: task.description || '',
      projectId: projectId,
      status: task.status,
      priority: task.priority,
      isActive: task.isActive !== undefined ? task.isActive : true,
      onlyProjectTasks: (typeof task.projectId === 'object' && (task.projectId as Project).onlyProjectTasks) || false,
      dueDate: task.dueDate || '',
    });
    setShowEditModal(true);
  };

  const getStatusStyle = useCallback((status: string) => statusColors[status?.toLowerCase() as TaskStatus] || statusColors.pending, []);
  const getPriorityStyle = useCallback((priority: string) => priorityColors[priority?.toLowerCase() as TaskPriority] || priorityColors.medium, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  }, []);

  const openDropdown = useCallback((context: 'create' | 'edit' | 'bulk' | 'filter', type: 'project' | 'status' | 'priority') => {
    setDropdownContext(context);
    if (type === 'project') setShowProjectDropdown(true);
    else if (type === 'status') setShowStatusDropdown(true);
    else if (type === 'priority') setShowPriorityDropdown(true);
  }, []);

  const openDatePicker = useCallback((context: 'create' | 'edit') => {
    setDatePickerContext(context);
    const currentDate = context === 'create' ? formData.dueDate : editFormData.dueDate;
    setTempDate(currentDate ? new Date(currentDate) : new Date());
    setShowDatePicker(true);
  }, [formData.dueDate, editFormData.dueDate]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      if (datePickerContext === 'create') {
        setFormData(prev => ({ ...prev, dueDate: formattedDate }));
      } else {
        setEditFormData(prev => ({ ...prev, dueDate: formattedDate }));
      }
    }
  }, [datePickerContext]);

  const handleProjectSelect = useCallback((projectId: string) => {
    if (dropdownContext === 'create') setFormData(prev => ({ ...prev, projectId }));
    else if (dropdownContext === 'edit') setEditFormData(prev => ({ ...prev, projectId }));
    else if (dropdownContext === 'bulk') setBulkProjectId(projectId);
    else if (dropdownContext === 'filter') setTempFilters(prev => ({ ...prev, projectId }));
  }, [dropdownContext]);

  const handleStatusSelect = useCallback((status: string) => {
    if (dropdownContext === 'create') setFormData(prev => ({ ...prev, status: status as TaskStatus }));
    else if (dropdownContext === 'edit') setEditFormData(prev => ({ ...prev, status: status as TaskStatus }));
    else if (dropdownContext === 'filter') setTempFilters(prev => ({ ...prev, status }));
  }, [dropdownContext]);

  const handlePrioritySelect = useCallback((priority: string) => {
    if (dropdownContext === 'create') setFormData(prev => ({ ...prev, priority: priority as TaskPriority }));
    else if (dropdownContext === 'edit') setEditFormData(prev => ({ ...prev, priority: priority as TaskPriority }));
  }, [dropdownContext]);



  const activeFilterCount = (projectFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  const getProjectDisplayValue = useCallback((projectId: string) =>
    projects.find(p => (p._id || p.id) === projectId)?.name || 'Select Project', [projects]);
  const getStatusDisplayValue = useCallback((status: string) =>
    statusOptions.find(s => s.value === status?.toLowerCase())?.label || 'Select Status', [statusOptions]);
  const getPriorityDisplayValue = useCallback((priority: string) =>
    priorityOptions.find(p => p.value === priority?.toLowerCase())?.label || 'Select Priority', [priorityOptions]);

  return (
    <>
      <Layout
        title="Tasks"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View style={styles.content}>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <StatCard title="Total" value={taskStats.total} icon={ListTodo} color="#3b82f6" bgColor="#eff6ff" />
            <StatCard title="Pending" value={taskStats.pending} icon={BarChart} color="#f59e0b" bgColor="#fffbeb" />
            <StatCard title="In Progress" value={taskStats.inProgress} icon={BarChart} color="#3b82f6" bgColor="#eff6ff" />
            <StatCard title="Completed" value={taskStats.completed} icon={BarChart} color="#10b981" bgColor="#ecfdf5" />
            <StatCard title="On Hold" value={taskStats.onHold} icon={BarChart} color="#ef4444" bgColor="#fef2f2" />
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tasks..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => fetchTasks(1)}
              />
            </View>
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
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => setShowExportModal(true)}
            >
              <Download size={16} color="#3b82f6" />
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkButton}
              onPress={() => {
                setBulkProjectId('');
                setBulkNames('');
                setShowBulkModal(true);
              }}
            >
              <ListTodo size={16} color="#3b82f6" />
              <Text style={styles.bulkButtonText}>Bulk</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Panel */}
          {showFilters && (
            <View style={styles.filterPanel}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filter By</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={() => {
                    setTempFilters({ projectId: '', status: '' });
                    setProjectFilter('');
                    setStatusFilter('');
                  }}>
                    <Text style={styles.filterResetText}>Reset All</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Project</Text>
                <TouchableOpacity style={styles.filterSelectButton} onPress={() => openDropdown('filter', 'project')}>
                  <Text style={[styles.filterSelectText, !tempFilters.projectId && styles.filterPlaceholderText]}>
                    {tempFilters.projectId ? projects.find(p => (p._id || p.id) === tempFilters.projectId)?.name || 'All Projects' : 'All Projects'}
                  </Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Status</Text>
                <TouchableOpacity style={styles.filterSelectButton} onPress={() => openDropdown('filter', 'status')}>
                  <Text style={[styles.filterSelectText, !tempFilters.status && styles.filterPlaceholderText]}>
                    {tempFilters.status ? statusOptions.find(s => s.value === tempFilters.status)?.label || 'All Statuses' : 'All Statuses'}
                  </Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.filterClear} onPress={() => setTempFilters({ projectId: '', status: '' })}>
                  <Text style={styles.filterClearText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterApply} onPress={() => {
                  setProjectFilter(tempFilters.projectId);
                  setStatusFilter(tempFilters.status);
                  setShowFilters(false);
                  setPage(1);
                }}>
                  <Text style={styles.filterApplyText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Results Count */}
          <Text style={styles.resultsCount}>{totalResults} TASKS</Text>

          {/* Tasks List */}
          {loading && !refreshing ? (
            <View style={[styles.loadingContainer, { backgroundColor: 'transparent', paddingVertical: 48 }]}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={{ marginTop: verticalScale(12), color: '#64748b', fontSize: moderateScale(13) }}>Loading tasks...</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ListTodo size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or create a new task</Text>
            </View>
          ) : (
            <>
              {tasks.map(task => (
                  <TaskCard
                    key={task._id || task.id}
                    task={task}
                    onView={(t: Task) => {
                      setSelectedTask(t);
                      setShowViewModal(true);
                    }}
                    onEdit={openEditModal}
                    onDelete={(t: Task) => {
                      setSelectedTask(t);
                      setShowDeleteModal(true);
                    }}
                    getStatusStyle={getStatusStyle}
                    getPriorityStyle={getPriorityStyle}
                    formatDate={formatDate}
                  />
                ))}
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
          </View>
      </Layout>

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showProjectDropdown}
        onClose={() => setShowProjectDropdown(false)}
        options={dropdownContext === 'filter' ? [{ value: '', label: 'All Projects' }, ...projectOptions] : projectOptions}
        selectedValue={
          dropdownContext === 'create' ? formData.projectId :
            dropdownContext === 'edit' ? editFormData.projectId :
              dropdownContext === 'bulk' ? bulkProjectId :
                dropdownContext === 'filter' ? tempFilters.projectId : ''
        }
        onSelect={handleProjectSelect}
        title="Select Project"
      />
      <DropdownModal
        visible={showStatusDropdown}
        onClose={() => setShowStatusDropdown(false)}
        options={dropdownContext === 'filter' ? [{ value: '', label: 'All Statuses' }, ...statusOptions] : statusOptions}
        selectedValue={
          dropdownContext === 'create' ? formData.status :
            dropdownContext === 'edit' ? editFormData.status :
              dropdownContext === 'filter' ? tempFilters.status : ''
        }
        onSelect={handleStatusSelect}
        title="Select Status"
      />
      <DropdownModal
        visible={showPriorityDropdown}
        onClose={() => setShowPriorityDropdown(false)}
        options={priorityOptions}
        selectedValue={
          dropdownContext === 'create' ? formData.priority :
            dropdownContext === 'edit' ? editFormData.priority : ''
        }
        onSelect={handlePrioritySelect}
        title="Select Priority"
      />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Add New Task</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={modalStyles.form}>
                <TextInputField
                  label="Task Name"
                  value={formData.name}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g. Design System Implementation"
                  required
                />
                <FormField
                  label="Project"
                  value={formData.projectId}
                  onPress={() => openDropdown('create', 'project')}
                  placeholder="Select Project"
                  required
                  displayValue={getProjectDisplayValue(formData.projectId)}
                />
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
                    <FormField
                      label="Priority"
                      value={formData.priority}
                      onPress={() => openDropdown('create', 'priority')}
                      placeholder="Select Priority"
                      displayValue={getPriorityDisplayValue(formData.priority)}
                    />
                  </View>
                </View>
                <FormField
                  label="Due Date"
                  value={formData.dueDate}
                  onPress={() => openDatePicker('create')}
                  placeholder="Select Due Date"
                  showChevron={false}
                  displayValue={formData.dueDate ? formatDate(formData.dueDate) : "Select Due Date"}
                />
                <TextInputField
                  label="Description"
                  value={formData.description}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Detailed task description..."
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]}
                  onPress={handleCreateTask}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <><Save size={16} color="white" /><Text style={modalStyles.submitText}>Create Task</Text></>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Task Modal */}
      <Modal visible={showViewModal} animationType="slide" transparent>
        <View style={detailModalStyles.overlay}>
          <View style={detailModalStyles.container}>
            <View style={detailModalStyles.header}>
              <Text style={detailModalStyles.title}>Task Details</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            {selectedTask && (
              <ScrollView>
                <View style={detailModalStyles.content}>
                  <View style={detailModalStyles.iconHeader}>
                    <ListTodo size={32} color="#3b82f6" />
                    <Text style={detailModalStyles.taskName}>{selectedTask?.name}</Text>
                    <View style={detailModalStyles.badgeRow}>
                      <View style={[detailModalStyles.priorityBadge, { backgroundColor: getPriorityStyle(selectedTask?.priority || 'medium').bg }]}>
                        <Text style={[detailModalStyles.priorityText, { color: getPriorityStyle(selectedTask?.priority || 'medium').text }]}>
                          {getPriorityStyle(selectedTask?.priority || 'medium').label}
                        </Text>
                      </View>
                      <View style={[detailModalStyles.statusBadge, { backgroundColor: getStatusStyle(selectedTask?.status || 'pending').bg }]}>
                        <Text style={[detailModalStyles.statusText, { color: getStatusStyle(selectedTask?.status || 'pending').text }]}>
                          {getStatusStyle(selectedTask?.status || 'pending').label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={detailModalStyles.infoCard}>
                    <Text style={detailModalStyles.infoLabel}>Project</Text>
                    <Text style={detailModalStyles.infoValue}>
                      {getProjectDisplayValue(typeof selectedTask?.projectId === 'object'
                        ? (selectedTask?.projectId as Project)._id || (selectedTask?.projectId as Project).id
                        : (selectedTask?.projectId as string || '')) || '—'}
                    </Text>
                  </View>

                  <View style={detailModalStyles.infoCard}>
                    <Text style={detailModalStyles.infoLabel}>Due Date</Text>
                    <Text style={detailModalStyles.infoValue}>{selectedTask?.dueDate ? formatDate(selectedTask.dueDate) : '—'}</Text>
                  </View>

                  {selectedTask?.description && (
                    <View style={detailModalStyles.infoCard}>
                      <Text style={detailModalStyles.infoLabel}>Description</Text>
                      <Text style={detailModalStyles.infoValue}>{selectedTask?.description}</Text>
                    </View>
                  )}

                  <View style={detailModalStyles.row}>
                    <View style={[detailModalStyles.infoCard, { flex: 1 }]}>
                      <Text style={detailModalStyles.infoLabel}>Created At</Text>
                      <Text style={detailModalStyles.infoValue}>{selectedTask?.createdAt ? formatDate(selectedTask.createdAt) : '—'}</Text>
                    </View>
                    <View style={[detailModalStyles.infoCard, { flex: 1 }]}>
                      <Text style={detailModalStyles.infoLabel}>Last Updated</Text>
                      <Text style={detailModalStyles.infoValue}>{selectedTask?.updatedAt ? formatDate(selectedTask.updatedAt) : '—'}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
            <View style={detailModalStyles.footer}>
              <TouchableOpacity
                style={detailModalStyles.editButton}
                onPress={() => {
                  if (selectedTask) {
                    setShowViewModal(false);
                    openEditModal(selectedTask);
                  }
                }}
              >
                <Pencil size={16} color="#3b82f6" />
                <Text style={detailModalStyles.editButtonText}>Edit Task</Text>
              </TouchableOpacity>
              <TouchableOpacity style={detailModalStyles.closeButton} onPress={() => setShowViewModal(false)}>
                <Text style={detailModalStyles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal visible={showBulkModal} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Bulk Add Tasks</Text>
              <TouchableOpacity onPress={() => setShowBulkModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={modalStyles.form}>
                <FormField
                  label="Project"
                  value={bulkProjectId}
                  onPress={() => openDropdown('bulk', 'project')}
                  placeholder="Select Project"
                  required
                  displayValue={getProjectDisplayValue(bulkProjectId)}
                />
                <TextInputField
                  label="Task Names (one per line)"
                  value={bulkNames}
                  onChangeText={setBulkNames}
                  placeholder="Requirement Analysis\nSystem Design\nFrontend Coding\nAPI Integration"
                  required
                  multiline
                  numberOfLines={6}
                />

                <TouchableOpacity
                  style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]}
                  onPress={handleBulkCreate}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <><Plus size={16} color="white" /><Text style={modalStyles.submitText}>Add Tasks</Text></>}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
            <Text style={deleteModalStyles.title}>Delete Task?</Text>
            <Text style={deleteModalStyles.message}>
              Are you sure you want to delete "{selectedTask?.name}"? This action cannot be undone.
            </Text>
            <View style={deleteModalStyles.buttonRow}>
              <TouchableOpacity style={deleteModalStyles.cancelButton} onPress={() => setShowDeleteModal(false)}>
                <Text style={deleteModalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={deleteModalStyles.deleteButton} onPress={handleDeleteTask}>
                <Trash2 size={16} color="white" />
                <Text style={deleteModalStyles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Edit Task</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={modalStyles.form}>
                <TextInputField
                  label="Task Name"
                  value={editFormData.name}
                  onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Task name"
                  required
                />
                <FormField
                  label="Project"
                  value={editFormData.projectId}
                  onPress={() => openDropdown('edit', 'project')}
                  placeholder="Select Project"
                  required
                  displayValue={getProjectDisplayValue(editFormData.projectId)}
                />
                <View style={modalStyles.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Status"
                      value={editFormData.status}
                      onPress={() => openDropdown('edit', 'status')}
                      placeholder="Select Status"
                      displayValue={getStatusDisplayValue(editFormData.status)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Priority"
                      value={editFormData.priority}
                      onPress={() => openDropdown('edit', 'priority')}
                      placeholder="Select Priority"
                      displayValue={getPriorityDisplayValue(editFormData.priority)}
                    />
                  </View>
                </View>
                <FormField
                  label="Due Date"
                  value={editFormData.dueDate}
                  onPress={() => openDatePicker('edit')}
                  placeholder="Select Due Date"
                  showChevron={false}
                  displayValue={editFormData.dueDate ? formatDate(editFormData.dueDate) : "Select Due Date"}
                />
                <TextInputField
                  label="Description"
                  value={editFormData.description}
                  onChangeText={(text: string) => setEditFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Task description..."
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]}
                  onPress={handleUpdateTask}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <><Save size={16} color="white" /><Text style={modalStyles.submitText}>Update Task</Text></>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}