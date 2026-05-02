// screens/employees/EmployeesScreen.tsx
import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Users,
  Mail,
  Phone,
  Building2,
  Briefcase,
  CalendarDays,
  ShieldCheck,
  History,
  UserX,
  UserCheck,
  Save,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { userAPI, auditAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import DropdownModal from '../../components/common/DropdownModal';
import EmployeeCard from '../../components/employees/EmployeeCard';
import EmployeeHistory from '../../components/employees/EmployeeHistory';

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  loadingContainer: { minHeight: 400, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  filterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterButtonActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#3b82f6', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  
  filterPanel: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  filterResetText: { fontSize: 11, fontWeight: '600', color: '#3b82f6' },
  filterField: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  filterSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10 },
  filterInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  filterSelectText: { fontSize: 14, color: '#1e293b', flex: 1 },
  placeholderText: { color: '#94a3b8' },
  filterRow: { flexDirection: 'row', gap: 12 },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  filterClear: { flex: 1, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  filterClearText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterApply: { flex: 2, paddingVertical: 10, backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center' },
  filterApplyText: { fontSize: 13, fontWeight: '600', color: 'white' },
  
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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8fafc' },
  selectButtonText: { fontSize: 14, color: '#1e293b', flex: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  submitButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12 },
  disabledButton: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: '700', color: 'white' },
});



const detailModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: 'white', borderRadius: 24, width: '90%', maxHeight: '85%' },
  containerWide: { width: '95%', maxWidth: 500 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  content: { padding: 20 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#3b82f6' },
  headerInfo: { flex: 1 },
  employeeNameDetail: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  employeeIdDetail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  infoGrid: { gap: 12, marginBottom: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  infoLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  infoValue: { fontSize: 13, color: '#1e293b', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 12 },
  historySection: { marginTop: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  historyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  historyButtonText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  historyButtonTextActive: { color: '#3b82f6' },
  footerButtons: { flexDirection: 'row', gap: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  editButtonText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  closeButton: { backgroundColor: '#1e293b', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: 'white' },
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





// Types
interface User {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  role: string;
  department?: string;
  designation?: string;
  phone?: string;
  joinDate?: string;
  isActive: boolean;
  bankName?: string;
  accountNumber?: string;
  branchName?: string;
  ifscCode?: string;
  uan?: string;
  pan?: string;
  aadhaar?: string;
  isOwner?: boolean;
}

interface EmployeeForm {
  name: string;
  email: string;
  password?: string;
  newPassword?: string;
  role: string;
  department: string;
  designation: string;
  phone: string;
  employeeId: string;
  joinDate: string;
  bankName: string;
  accountNumber: string;
  branchName: string;
  ifscCode: string;
  uan: string;
  pan: string;
  aadhaar: string;
}

interface AuditLog {
  _id: string;
  action: string;
  createdAt: string;
  userId: { name: string };
  details?: { changes?: Record<string, { old: any; new: any }> };
}

const INITIAL_FORM: EmployeeForm = {
  name: '',
  email: '',
  password: '',
  newPassword: '',
  role: 'employee',
  department: '',
  designation: '',
  phone: '',
  employeeId: '',
  joinDate: new Date().toISOString().split('T')[0],
  bankName: '',
  accountNumber: '',
  branchName: '',
  ifscCode: '',
  uan: '',
  pan: '',
  aadhaar: '',
};







export default function EmployeesScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employeeIdFilter, setEmployeeIdFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({ role: '', status: '', department: '', employeeId: '' });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [limit] = useState(10);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showEmployeeIdDropdown, setShowEmployeeIdDropdown] = useState(false);
  const [dropdownContext, setDropdownContext] = useState<'create' | 'edit' | 'filter'>('create');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState<EmployeeForm>(INITIAL_FORM);
  const [editFormData, setEditFormData] = useState<EmployeeForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, boolean>>({});

  const [employees, setEmployees] = useState<User[]>([]);
  const [allEmployees, setAllEmployees] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const roleOptions = useMemo(() => [
    { value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' },
    { value: 'hr', label: 'HR' }, { value: 'finance', label: 'Finance' },
    { value: 'employee', label: 'Employee' }, { value: 'intern', label: 'Intern' },
  ], []);

  const statusOptions = useMemo(() => [
    { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
  ], []);

  const employeeIdOptions = useMemo(() => allEmployees.filter(e => e.employeeId).map(e => ({ value: e.employeeId!, label: `${e.employeeId} - ${e.name}` })), [allEmployees]);

  useFocusEffect(useCallback(() => {
    loadUserData();
    loadUserData();
    fetchRoles();
    fetchAllEmployees();
    fetchEmployees();
  }, [page, searchQuery, roleFilter, statusFilter, departmentFilter, employeeIdFilter]));

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) { console.error('Error loading user data:', error); }
  };

  const fetchRoles = async () => {
    try {
      const response = await userAPI.getRoles();
      const data = (response as any)?.data;
      setRoles(Array.isArray(data) ? data : data?.data || []);
    } catch (error) { console.error('Error fetching roles:', error); }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await userAPI.getAll({ limit: 5000 });
      const data = (response as any)?.data;
      setAllEmployees(Array.isArray(data) ? data : data?.data || []);
    } catch (error) { console.error('Error fetching all employees:', error); }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const effectiveSearch = searchQuery.trim().length >= 2 ? searchQuery.trim() : '';
      const params: any = { page, limit, search: effectiveSearch, role: roleFilter, status: statusFilter, department: departmentFilter, employeeId: employeeIdFilter };
      const response = await userAPI.getAll(params);
      const data = (response as any)?.data;
      const pagination = (response as any)?.pagination;
      
      setEmployees(Array.isArray(data) ? data : data?.data || []);
      setTotalPages(pagination?.totalPages || 1);
      setTotalResults(pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchEmployees(); setRefreshing(false); };

  const validateFields = (data: any, isEdit = false) => {
    const errors: Record<string, boolean> = {};
    if (!data.name?.trim()) errors.name = true;
    if (!data.email?.trim() || !/\S+@\S+\.\S+/.test(data.email)) errors.email = true;
    if (!isEdit && (!data.password || data.password.length < 8)) errors.password = true;
    if (!data.department?.trim()) errors.department = true;
    if (!data.designation?.trim()) errors.designation = true;
    if (!data.phone?.trim() || !/^\d{10}$/.test(data.phone.replace(/\D/g, ''))) errors.phone = true;
    if (!data.joinDate) errors.joinDate = true;
    if (!data.bankName?.trim()) errors.bankName = true;
    if (!data.accountNumber?.trim() || !/^\d+$/.test(data.accountNumber)) errors.accountNumber = true;
    if (!data.branchName?.trim()) errors.branchName = true;
    if (!data.ifscCode?.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode)) errors.ifscCode = true;
    if (!data.uan?.trim() || !/^\d{12}$/.test(data.uan)) errors.uan = true;
    if (!data.pan?.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan)) errors.pan = true;
    if (!data.aadhaar?.trim() || !/^\d{12}$/.test(data.aadhaar)) errors.aadhaar = true;
    return errors;
  };

  const handleCreateEmployee = async () => {
    const errors = validateFields(formData);
    if (Object.keys(errors).length > 0) { 
      setFormErrors(errors); 
      Alert.alert('Validation Error', 'Please ensure all fields are properly formatted:\n• Phone: 10 digits\n• UAN/Aadhaar: 12 digits\n• PAN: ABCDE1234F\n• IFSC: ABCD0123456'); 
      return; 
    }
    setIsSubmitting(true);
    try {
      await userAPI.create(formData);
      Alert.alert('Success', 'Employee created successfully!');
      setShowCreateModal(false);
      setFormData(INITIAL_FORM);
      setFormErrors({});
      fetchEmployees();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    const errors = validateFields(editFormData, true);
    if (editFormData.newPassword && editFormData.newPassword.length < 8) errors.newPassword = true;
    if (Object.keys(errors).length > 0) { 
      setEditFormErrors(errors); 
      Alert.alert('Validation Error', 'Please ensure all fields are properly formatted:\n• Phone: 10 digits\n• UAN/Aadhaar: 12 digits\n• PAN: ABCDE1234F\n• IFSC: ABCD0123456'); 
      return; 
    }
    setIsSubmitting(true);
    try {
      const updateData: any = { ...editFormData };
      delete updateData.password; delete updateData.newPassword;
      await userAPI.update(selectedEmployee._id, updateData);
      if (editFormData.newPassword) await userAPI.resetPassword(selectedEmployee._id, editFormData.newPassword);
      Alert.alert('Success', 'Employee updated successfully!');
      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      await userAPI.delete(selectedEmployee._id);
      Alert.alert('Success', 'Employee deleted successfully!');
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (employee: User) => {
    setIsToggling(true);
    try {
      await userAPI.update(employee._id, { isActive: !employee.isActive });
      Alert.alert('Success', employee.isActive ? 'Employee deactivated' : 'Employee activated');
      fetchEmployees();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Action failed');
    } finally {
      setIsToggling(false);
    }
  };

  const openEditModal = (employee: User) => {
    setSelectedEmployee(employee);
    setEditFormData({
      name: employee.name || '', email: employee.email || '', password: '', newPassword: '',
      role: employee.role || 'employee', department: employee.department || '', designation: employee.designation || '',
      phone: employee.phone || '', employeeId: employee.employeeId || '',
      joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : new Date().toISOString().split('T')[0],
      bankName: employee.bankName || '', accountNumber: employee.accountNumber || '', branchName: employee.branchName || '',
      ifscCode: employee.ifscCode || '', uan: employee.uan || '', pan: employee.pan || '', aadhaar: employee.aadhaar || '',
    });
    setEditFormErrors({});
    setShowEditModal(true);
  };

  const formatDateString = (dateString: string) => {
    if (!dateString) return '—';
    try { return format(new Date(dateString), 'MMM d, yyyy'); } catch { return '—'; }
  };

  const resetFilters = () => {
    setTempFilters({ role: '', status: '', department: '', employeeId: '' });
    setRoleFilter(''); setStatusFilter(''); setDepartmentFilter(''); setEmployeeIdFilter('');
    setSearchQuery(''); setPage(1);
  };

  const applyFilters = () => {
    setRoleFilter(tempFilters.role);
    setStatusFilter(tempFilters.status);
    setDepartmentFilter(tempFilters.department);
    setEmployeeIdFilter(tempFilters.employeeId);
    setShowFilters(false);
    setPage(1);
  };

  const handleFormChange = (name: string, value: string, isEdit = false) => {
    let processedValue = value;
    if (['phone', 'accountNumber', 'uan', 'aadhaar'].includes(name)) processedValue = value.replace(/\D/g, '');
    if (['pan', 'ifscCode'].includes(name)) processedValue = value.toUpperCase();
    if (isEdit) {
      setEditFormData(prev => ({ ...prev, [name]: processedValue }));
      if (editFormErrors[name]) setEditFormErrors(prev => { const up = { ...prev }; delete up[name]; return up; });
    } else {
      setFormData(prev => ({ ...prev, [name]: processedValue }));
      if (formErrors[name]) setFormErrors(prev => { const up = { ...prev }; delete up[name]; return up; });
    }
  };

  const getRoleDisplayValue = (role: string) => roleOptions.find(r => r.value === role)?.label || 'Select Role';

  const activeFilterCount = (roleFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (departmentFilter ? 1 : 0) + (employeeIdFilter ? 1 : 0);

  const renderEmployeeForm = (isEdit = false) => {
    const data = isEdit ? editFormData : formData;
    const errors = isEdit ? editFormErrors : formErrors;
    const handleChange = (name: string, value: string) => handleFormChange(name, value, isEdit);

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={modalStyles.form}>
          <Text style={modalStyles.sectionTitle}>Basic Information</Text>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Full Name *</Text><TextInput style={[modalStyles.input, errors.name && modalStyles.inputError]} placeholder="Enter full name" value={data.name} onChangeText={(text) => handleChange('name', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Email Address *</Text><TextInput style={[modalStyles.input, errors.email && modalStyles.inputError]} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" value={data.email} onChangeText={(text) => handleChange('email', text)} /></View>
          {!isEdit ? (
            <View style={modalStyles.field}><Text style={modalStyles.label}>Password *</Text><TextInput style={[modalStyles.input, errors.password && modalStyles.inputError]} placeholder="Min 8 characters" secureTextEntry value={data.password} onChangeText={(text) => handleChange('password', text)} /></View>
          ) : (
            <View style={modalStyles.field}><Text style={modalStyles.label}>Reset Password (Optional)</Text><TextInput style={[modalStyles.input, errors.newPassword && modalStyles.inputError]} placeholder="Min 8 characters" secureTextEntry value={data.newPassword} onChangeText={(text) => handleChange('newPassword', text)} /></View>
          )}
          <View style={modalStyles.field}>
            <Text style={modalStyles.label}>Role *</Text>
            <TouchableOpacity style={[modalStyles.selectButton, errors.role && modalStyles.inputError]} onPress={() => { setDropdownContext(isEdit ? 'edit' : 'create'); setShowRoleDropdown(true); }}>
              <Text style={[modalStyles.selectButtonText, !data.role && { color: '#94a3b8' }]}>{getRoleDisplayValue(data.role)}</Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Department *</Text><TextInput style={[modalStyles.input, errors.department && modalStyles.inputError]} placeholder="e.g. Engineering" value={data.department} onChangeText={(text) => handleChange('department', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Designation *</Text><TextInput style={[modalStyles.input, errors.designation && modalStyles.inputError]} placeholder="e.g. Senior Developer" value={data.designation} onChangeText={(text) => handleChange('designation', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Phone Number *</Text><TextInput style={[modalStyles.input, errors.phone && modalStyles.inputError]} placeholder="10 digit number" keyboardType="phone-pad" maxLength={10} value={data.phone} onChangeText={(text) => handleChange('phone', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Employee ID</Text><TextInput style={[modalStyles.input, errors.employeeId && modalStyles.inputError]} placeholder="e.g. EMP001" value={data.employeeId} onChangeText={(text) => handleChange('employeeId', text)} /></View>
          <View style={modalStyles.field}>
            <Text style={modalStyles.label}>Joining Date *</Text>
            <TouchableOpacity style={[modalStyles.selectButton, errors.joinDate && modalStyles.inputError]} onPress={() => { setDropdownContext(isEdit ? 'edit' : 'create'); setShowDatePicker(true); }}>
              <Text style={[modalStyles.selectButtonText, !data.joinDate && { color: '#94a3b8' }]}>{formatDateString(data.joinDate)}</Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={[modalStyles.sectionTitle, { marginTop: 12 }]}>Bank Details</Text>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Bank Name *</Text><TextInput style={[modalStyles.input, errors.bankName && modalStyles.inputError]} placeholder="Enter bank name" value={data.bankName} onChangeText={(text) => handleChange('bankName', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Account Number *</Text><TextInput style={[modalStyles.input, errors.accountNumber && modalStyles.inputError]} placeholder="Enter account number" keyboardType="numeric" value={data.accountNumber} onChangeText={(text) => handleChange('accountNumber', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Branch Name *</Text><TextInput style={[modalStyles.input, errors.branchName && modalStyles.inputError]} placeholder="Enter branch name" value={data.branchName} onChangeText={(text) => handleChange('branchName', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>IFSC Code *</Text><TextInput style={[modalStyles.input, errors.ifscCode && modalStyles.inputError]} placeholder="Enter IFSC code" autoCapitalize="characters" value={data.ifscCode} onChangeText={(text) => handleChange('ifscCode', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>UAN *</Text><TextInput style={[modalStyles.input, errors.uan && modalStyles.inputError]} placeholder="Enter UAN" keyboardType="numeric" value={data.uan} onChangeText={(text) => handleChange('uan', text)} /></View>

          <Text style={[modalStyles.sectionTitle, { marginTop: 12 }]}>Personal IDs</Text>
          <View style={modalStyles.field}><Text style={modalStyles.label}>PAN *</Text><TextInput style={[modalStyles.input, errors.pan && modalStyles.inputError]} placeholder="Enter PAN number" autoCapitalize="characters" value={data.pan} onChangeText={(text) => handleChange('pan', text)} /></View>
          <View style={modalStyles.field}><Text style={modalStyles.label}>Aadhaar *</Text><TextInput style={[modalStyles.input, errors.aadhaar && modalStyles.inputError]} placeholder="12 digit number" keyboardType="numeric" maxLength={12} value={data.aadhaar} onChangeText={(text) => handleChange('aadhaar', text)} /></View>
        </View>
      </ScrollView>
    );
  };

  return (
    <Layout title="Employees" user={user} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible} refreshing={refreshing} onRefresh={onRefresh}>
      {loading && !refreshing && employees.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Loading employees...</Text>
        </View>
      ) : (
        <View style={styles.content}>
        {/* Search and Filter Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <TextInput style={styles.searchInput} placeholder="Search (min. 2 characters)..." placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={fetchEmployees} />
            </View>
            <TouchableOpacity style={[styles.filterButton, (showFilters || activeFilterCount > 0) && styles.filterButtonActive]} onPress={() => { if (!showFilters) setTempFilters({ role: roleFilter, status: statusFilter, department: departmentFilter, employeeId: employeeIdFilter }); setShowFilters(!showFilters); }}>
              <Filter size={16} color={showFilters || activeFilterCount > 0 ? '#3b82f6' : '#64748b'} />
              {activeFilterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => { setFormData(INITIAL_FORM); setFormErrors({}); setShowCreateModal(true); }}>
              <Plus size={16} color="white" /><Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Panel */}
          {showFilters && (
            <View style={styles.filterPanel}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filter By</Text>
                {activeFilterCount > 0 && <TouchableOpacity onPress={resetFilters}><Text style={styles.filterResetText}>Reset All</Text></TouchableOpacity>}
              </View>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Employee ID</Text>
                <TouchableOpacity style={styles.filterSelectButton} onPress={() => { setDropdownContext('filter'); setShowEmployeeIdDropdown(true); }}>
                  <Text style={[styles.filterSelectText, !tempFilters.employeeId && styles.placeholderText]}>
                    {tempFilters.employeeId ? employeeIdOptions.find(e => e.value === tempFilters.employeeId)?.label || 'Select Employee' : 'Select Employee'}
                  </Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Department</Text>
                <TextInput style={styles.filterInput} placeholder="e.g. Engineering" placeholderTextColor="#94a3b8" value={tempFilters.department} onChangeText={(text) => setTempFilters(prev => ({ ...prev, department: text }))} />
              </View>
              <View style={styles.filterRow}>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Role</Text>
                  <TouchableOpacity style={styles.filterSelectButton} onPress={() => { setDropdownContext('filter'); setShowRoleDropdown(true); }}>
                    <Text style={[styles.filterSelectText, !tempFilters.role && styles.placeholderText]}>{tempFilters.role ? roleOptions.find(r => r.value === tempFilters.role)?.label || 'All Roles' : 'All Roles'}</Text>
                    <ChevronDown size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Status</Text>
                  <TouchableOpacity style={styles.filterSelectButton} onPress={() => { setDropdownContext('filter'); setShowStatusDropdown(true); }}>
                    <Text style={[styles.filterSelectText, !tempFilters.status && styles.placeholderText]}>{tempFilters.status ? statusOptions.find(s => s.value === tempFilters.status)?.label || 'All Status' : 'All Status'}</Text>
                    <ChevronDown size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.filterClear} onPress={() => setTempFilters({ role: '', status: '', department: '', employeeId: '' })}><Text style={styles.filterClearText}>Clear</Text></TouchableOpacity>
                <TouchableOpacity style={styles.filterApply} onPress={applyFilters}><Text style={styles.filterApplyText}>Apply Filters</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {/* Results Count */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginBottom: 12, letterSpacing: 1 }}>{totalResults} EMPLOYEES</Text>

          {/* Employees List */}
          {employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No employees found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or add a new employee</Text>
            </View>
          ) : (
            <>
              {employees.map(employee => (
                <EmployeeCard
                  key={employee._id} employee={employee}
                  onView={(emp: User) => { setSelectedEmployee(emp); setShowHistory(false); setShowViewModal(true); }}
                  onEdit={openEditModal}
                  onDelete={(emp: User) => { setSelectedEmployee(emp); setShowDeleteModal(true); }}
                  onToggleStatus={handleToggleStatus} isToggling={isToggling}
                />
              ))}
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]} onPress={() => { if (page > 1) setPage(page - 1); }} disabled={page === 1}>
                    <ChevronLeft size={16} color="#3b82f6" /><Text style={styles.pageButtonText}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                  <TouchableOpacity style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]} onPress={() => { if (page < totalPages) setPage(page + 1); }} disabled={page === totalPages}>
                    <Text style={styles.pageButtonText}>Next</Text><ChevronRight size={16} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      )}
      {/* Dropdown Modals */}
      <DropdownModal visible={showRoleDropdown} onClose={() => setShowRoleDropdown(false)} options={roleOptions} selectedValue={dropdownContext === 'create' ? formData.role : dropdownContext === 'edit' ? editFormData.role : dropdownContext === 'filter' ? tempFilters.role : ''} onSelect={(value) => { if (dropdownContext === 'create' || dropdownContext === 'edit') { const setter = dropdownContext === 'create' ? setFormData : setEditFormData; setter(prev => ({ ...prev, role: value })); } else if (dropdownContext === 'filter') setTempFilters(prev => ({ ...prev, role: value })); }} title="Select Role" />
      <DropdownModal visible={showStatusDropdown} onClose={() => setShowStatusDropdown(false)} options={statusOptions} selectedValue={dropdownContext === 'filter' ? tempFilters.status : ''} onSelect={(value) => { if (dropdownContext === 'filter') setTempFilters(prev => ({ ...prev, status: value })); }} title="Select Status" />
      <DropdownModal visible={showEmployeeIdDropdown} onClose={() => setShowEmployeeIdDropdown(false)} options={employeeIdOptions} selectedValue={dropdownContext === 'filter' ? tempFilters.employeeId : ''} onSelect={(value) => { if (dropdownContext === 'filter') setTempFilters(prev => ({ ...prev, employeeId: value })); }} title="Select Employee" />

      {/* Date Picker */}
      {showDatePicker && <DateTimePicker value={new Date(dropdownContext === 'create' ? formData.joinDate : editFormData.joinDate)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) { const formattedDate = format(selectedDate, 'yyyy-MM-dd'); if (dropdownContext === 'create') setFormData(prev => ({ ...prev, joinDate: formattedDate })); else setEditFormData(prev => ({ ...prev, joinDate: formattedDate })); } }} />}

      {/* Create Employee Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent><View style={modalStyles.overlay}><View style={modalStyles.container}><View style={modalStyles.header}><Text style={modalStyles.title}>Add New Employee</Text><TouchableOpacity onPress={() => setShowCreateModal(false)}><X size={24} color="#64748b" /></TouchableOpacity></View>{renderEmployeeForm(false)}<View style={modalStyles.footer}><TouchableOpacity style={modalStyles.cancelButton} onPress={() => setShowCreateModal(false)}><Text style={modalStyles.cancelButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]} onPress={handleCreateEmployee} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="white" size="small" /> : <><Save size={16} color="white" /><Text style={modalStyles.submitText}>Save Employee</Text></>}</TouchableOpacity></View></View></View></Modal>

      {/* Edit Employee Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent><View style={modalStyles.overlay}><View style={modalStyles.container}><View style={modalStyles.header}><Text style={modalStyles.title}>Edit Employee</Text><TouchableOpacity onPress={() => setShowEditModal(false)}><X size={24} color="#64748b" /></TouchableOpacity></View>{renderEmployeeForm(true)}<View style={modalStyles.footer}><TouchableOpacity style={modalStyles.cancelButton} onPress={() => setShowEditModal(false)}><Text style={modalStyles.cancelButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]} onPress={handleUpdateEmployee} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="white" size="small" /> : <><Save size={16} color="white" /><Text style={modalStyles.submitText}>Update Employee</Text></>}</TouchableOpacity></View></View></View></Modal>

      {/* View Employee Modal */}
      <Modal visible={showViewModal} animationType="slide" transparent>
        <View style={detailModalStyles.overlay}>
          <View style={[detailModalStyles.container, showHistory && detailModalStyles.containerWide]}>
            <View style={detailModalStyles.header}><Text style={detailModalStyles.title}>Employee Details</Text><TouchableOpacity onPress={() => { setShowViewModal(false); setShowHistory(false); }}><X size={24} color="#64748b" /></TouchableOpacity></View>
            {selectedEmployee && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={detailModalStyles.content}>
                    <View style={detailModalStyles.avatarSection}>
                      <View style={detailModalStyles.avatar}><Text style={detailModalStyles.avatarText}>{selectedEmployee?.name?.charAt(0) || '?'}</Text></View>
                      <View style={detailModalStyles.headerInfo}>
                        <Text style={detailModalStyles.employeeNameDetail}>{selectedEmployee?.name || '—'}</Text>
                        <Text style={detailModalStyles.employeeIdDetail}>{selectedEmployee?.employeeId || '—'}</Text>
                        <View style={detailModalStyles.badgeRow}><StatusBadge status={selectedEmployee?.role || 'employee'} /><StatusBadge status={selectedEmployee?.isActive ? 'active' : 'inactive'} /></View>
                      </View>
                    </View>
                    <View style={detailModalStyles.infoGrid}>
                      <View style={detailModalStyles.infoItem}><Mail size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Email</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.email || '—'}</Text></View></View>
                      <View style={detailModalStyles.infoItem}><Phone size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Phone</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.phone || '—'}</Text></View></View>
                      <View style={detailModalStyles.infoItem}><Building2 size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Department</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.department || '—'}</Text></View></View>
                      <View style={detailModalStyles.infoItem}><Briefcase size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Designation</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.designation || '—'}</Text></View></View>
                      <View style={detailModalStyles.infoItem}><CalendarDays size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Joining Date</Text><Text style={detailModalStyles.infoValue}>{formatDateString(selectedEmployee?.joinDate || '')}</Text></View></View>
                    </View>
                    {(selectedEmployee?.bankName || selectedEmployee?.accountNumber) && (<><Text style={detailModalStyles.sectionTitle}>Bank Details</Text><View style={detailModalStyles.infoGrid}><View style={detailModalStyles.infoItem}><ShieldCheck size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Bank Name</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.bankName || '—'}</Text></View></View><View style={detailModalStyles.infoItem}><ShieldCheck size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Account Number</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.accountNumber || '—'}</Text></View></View><View style={detailModalStyles.infoItem}><ShieldCheck size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Branch Name</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.branchName || '—'}</Text></View></View><View style={detailModalStyles.infoItem}><ShieldCheck size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>IFSC Code</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.ifscCode || '—'}</Text></View></View><View style={detailModalStyles.infoItem}><ShieldCheck size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>UAN</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.uan || '—'}</Text></View></View></View></>)}
                    {(selectedEmployee?.pan || selectedEmployee?.aadhaar) && (<><Text style={detailModalStyles.sectionTitle}>Personal Details</Text><View style={detailModalStyles.infoGrid}><View style={detailModalStyles.infoItem}><ShieldCheck size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>PAN</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.pan || '—'}</Text></View></View><View style={detailModalStyles.infoItem}><ShieldCheck size={14} color="#64748b" /><View><Text style={detailModalStyles.infoLabel}>Aadhaar</Text><Text style={detailModalStyles.infoValue}>{selectedEmployee?.aadhaar || '—'}</Text></View></View></View></>)}
                    {showHistory && (<View style={detailModalStyles.historySection}><Text style={detailModalStyles.sectionTitle}>Change History</Text><EmployeeHistory entityId={selectedEmployee?._id || ''} /></View>)}
                </View>
              </ScrollView>
            )}
            <View style={detailModalStyles.footer}>
              <TouchableOpacity style={detailModalStyles.historyButton} onPress={() => setShowHistory(!showHistory)}><History size={16} color={showHistory ? '#3b82f6' : '#64748b'} /><Text style={[detailModalStyles.historyButtonText, showHistory && detailModalStyles.historyButtonTextActive]}>{showHistory ? 'Hide History' : 'Change History'}</Text></TouchableOpacity>
              <View style={detailModalStyles.footerButtons}>
                <TouchableOpacity style={detailModalStyles.editButton} onPress={() => { if (selectedEmployee) { setShowViewModal(false); openEditModal(selectedEmployee); } }}><Pencil size={16} color="#3b82f6" /><Text style={detailModalStyles.editButtonText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={detailModalStyles.closeButton} onPress={() => { setShowViewModal(false); setShowHistory(false); }}><Text style={detailModalStyles.closeButtonText}>Close</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={deleteModalStyles.overlay}>
          <View style={deleteModalStyles.container}>
            <View style={deleteModalStyles.iconContainer}><Trash2 size={32} color="#ef4444" /></View>
            <Text style={deleteModalStyles.title}>Delete Employee?</Text>
            <Text style={deleteModalStyles.message}>Are you sure you want to permanently delete "{selectedEmployee?.name}"? This action cannot be undone.</Text>
            <View style={deleteModalStyles.buttonRow}>
              <TouchableOpacity style={deleteModalStyles.cancelButton} onPress={() => setShowDeleteModal(false)}><Text style={deleteModalStyles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={deleteModalStyles.deleteButton} onPress={handleDeleteEmployee}><Trash2 size={16} color="white" /><Text style={deleteModalStyles.deleteButtonText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}