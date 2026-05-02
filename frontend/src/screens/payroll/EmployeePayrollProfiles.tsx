// screens/payroll/EmployeePayrollProfiles.tsx
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
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  X,
  Save,
  Building2,
  Banknote,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { payrollAPI, userAPI } from '../../services/endpoints';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import CollapsibleSidebar from '../../components/common/CollapsibleSidebar';
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

interface User {
  _id: string;
  name: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  role?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

interface PayrollProfile {
  _id: string;
  user: {
    _id: string;
    name: string;
  };
  payrollType: string;
  employeeType: string;
  salaryMode: string;
  salaryStructureId?: string;
  monthlyCTC: number;
  isActive: boolean;
}

interface SalaryStructure {
  _id: string;
  name: string;
  type: string;
}

interface EnrichedUser extends User {
  profile?: PayrollProfile;
  hasProfile: boolean;
  payrollStatus: string;
  bankStatus: string;
}

interface ProfileCardProps {
  employee: EnrichedUser;
  onPress: () => void;
  currencySymbol: string;
}

const ProfileCard = ({ employee, onPress, currencySymbol }: ProfileCardProps) => {
  const getStatusColor = () => {
    if (employee.payrollStatus === 'Active') return COLORS.success;
    if (employee.payrollStatus === 'Error') return COLORS.error;
    return COLORS.warning;
  };

  const getBankStatusColor = () => {
    if (employee.bankStatus === 'Verified') return COLORS.success;
    if (employee.bankStatus === 'Missing') return COLORS.error;
    return COLORS.warning;
  };

  return (
    <TouchableOpacity style={styles.profileCard} onPress={onPress}>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitial}>{employee.name?.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{employee.name}</Text>
          <Text style={styles.profileId}>ID: {employee.employeeId}</Text>
        </View>
      </View>
      
      <View style={styles.profileDetails}>
        <View style={styles.profileDetail}>
          <Building2 size={14} color={COLORS.gray} />
          <Text style={styles.profileDetailText}>{employee.department || '—'}</Text>
        </View>
        <View style={styles.profileDetail}>
          <CreditCard size={14} color={COLORS.gray} />
          <Text style={styles.profileDetailText}>
            {employee.profile ? `${currencySymbol}${formatCurrency(employee.profile.monthlyCTC)}` : '—'}
          </Text>
        </View>
      </View>
      
      <View style={styles.profileStatuses}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {employee.payrollStatus === 'Not Configured' ? 'Pending Setup' : employee.payrollStatus}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getBankStatusColor() + '20' }]}>
          <Shield size={10} color={getBankStatusColor()} />
          <Text style={[styles.statusText, { color: getBankStatusColor() }]}>{employee.bankStatus}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const EmployeePayrollProfiles = ({ navigation }: { navigation: any }) => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    payrollType: 'Monthly',
    employeeType: 'Permanent',
    salaryMode: 'Role-Based',
    salaryStructureId: '',
    weeklyRate: '',
    hourlyRate: '',
    dailyRate: '',
    monthlyCTC: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemsPerPage = 10;

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response: any = await userAPI.getAll({ limit: 1000 });
      const data = response.data?.data || response.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response: any = await payrollAPI.getProfiles();
      setProfiles(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
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

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchProfiles(), fetchStructures()]);
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

  const departments = useMemo(() => {
    return ['All', ...new Set(users.map(u => u.department).filter(Boolean))];
  }, [users]);

  const enrichedUsers = useMemo(() => {
    let filtered: EnrichedUser[] = users.map(u => {
      const profile = profiles.find(p => p.user?._id === u._id);
      
      let bankStatus = 'Missing';
      if (u.bankName && u.accountNumber && u.ifscCode) {
        bankStatus = 'Verified';
      } else if (u.bankName || u.accountNumber) {
        bankStatus = 'Pending';
      }
      
      let payrollStatus = 'Not Configured';
      if (profile) {
        const hasExplicitLink = !!profile.salaryStructureId;
        const hasRoleFallback = profile.salaryMode === 'Role-Based' && 
          structures.some(s => s.name?.toLowerCase() === u.role?.toLowerCase() && s.type === 'Role-Based');
        
        if (profile.isActive && !hasExplicitLink && !hasRoleFallback) {
          payrollStatus = 'Error';
        } else {
          payrollStatus = profile.isActive ? 'Active' : 'Inactive';
        }
      }
      
      return { ...u, profile, hasProfile: !!profile, payrollStatus, bankStatus };
    });
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(lowerTerm) ||
        u.employeeId?.toLowerCase().includes(lowerTerm)
      );
    }
    
    if (deptFilter !== 'All') {
      filtered = filtered.filter(u => u.department === deptFilter);
    }
    
    if (statusFilter !== 'All') {
      filtered = filtered.filter(u => u.payrollStatus === statusFilter);
    }
    
    return filtered;
  }, [users, profiles, structures, searchTerm, deptFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return enrichedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [enrichedUsers, currentPage]);

  const totalPages = Math.ceil(enrichedUsers.length / itemsPerPage);

  const stats = {
    total: users.length,
    configured: profiles.length,
    pending: users.length - profiles.length,
    errors: enrichedUsers.filter(u => u.payrollStatus === 'Error' || u.bankStatus === 'Missing').length,
  };

  const handleUserSelect = (userData: EnrichedUser) => {
    const existingProfile = profiles.find(p => p.user?._id === userData._id);
    setSelectedUser(userData);
    
    if (existingProfile) {
      setFormData({
        payrollType: existingProfile.payrollType || 'Monthly',
        employeeType: existingProfile.employeeType || 'Permanent',
        salaryMode: existingProfile.salaryMode || 'Role-Based',
        salaryStructureId: existingProfile.salaryStructureId || '',
        weeklyRate: '',
        hourlyRate: '',
        dailyRate: '',
        monthlyCTC: String(existingProfile.monthlyCTC) || '',
        isActive: existingProfile.isActive ?? true,
      });
    } else {
      setFormData({
        payrollType: 'Monthly',
        employeeType: 'Permanent',
        salaryMode: 'Role-Based',
        salaryStructureId: '',
        weeklyRate: '',
        hourlyRate: '',
        dailyRate: '',
        monthlyCTC: '',
        isActive: true,
      });
    }
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!formData.monthlyCTC) {
      Alert.alert('Error', 'Monthly CTC is required');
      return;
    }
    
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await payrollAPI.updateProfile(selectedUser._id, {
        ...formData,
        monthlyCTC: Number(formData.monthlyCTC),
      });
      Alert.alert('Success', 'Payroll profile updated successfully');
      setShowProfileModal(false);
      fetchProfiles();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedUser) return;
    const profile = profiles.find(p => p.user?._id === selectedUser._id);
    if (!profile) return;
    
    try {
      await payrollAPI.deleteProfile(profile._id);
      Alert.alert('Success', 'Payroll profile removed successfully');
      setShowDeleteConfirm(false);
      setShowProfileModal(false);
      fetchProfiles();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete profile');
    }
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
      <Header title="Payroll Profiles" showSidebarButton onMenuPress={() => setSidebarVisible(true)} />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                <Users size={20} color={COLORS.primary} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Employees</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.success + '15' }]}>
                <CheckCircle2 size={20} color={COLORS.success} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Configured</Text>
                <Text style={styles.statValue}>{stats.configured}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
                <Clock size={20} color={COLORS.warning} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue}>{stats.pending}</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.error + '15' }]}>
                <AlertCircle size={20} color={COLORS.error} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Errors</Text>
                <Text style={[styles.statValue, { color: COLORS.error }]}>{stats.errors}</Text>
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={16} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or ID..."
                placeholderTextColor={COLORS.gray}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersRow}>
            <View style={styles.filterChip}>
              <Filter size={14} color={COLORS.gray} />
              <Picker
                selectedValue={deptFilter}
                onValueChange={(v: any) => setDeptFilter(v)}
                style={styles.filterPicker}
              >
                {departments.map(dept => (
                  <Picker.Item key={dept} label={dept === 'All' ? 'All Depts' : dept} value={dept} />
                ))}
              </Picker>
            </View>
            
            <View style={styles.filterChip}>
              <Filter size={14} color={COLORS.gray} />
              <Picker
                selectedValue={statusFilter}
                onValueChange={(v: any) => setStatusFilter(v)}
                style={styles.filterPicker}
              >
                <Picker.Item label="All Status" value="All" />
                <Picker.Item label="Active" value="Active" />
                <Picker.Item label="Pending Setup" value="Not Configured" />
                <Picker.Item label="Error" value="Error" />
              </Picker>
            </View>
          </View>

          {/* Profiles List */}
          {paginatedUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No employees found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters</Text>
            </View>
          ) : (
            <>
              {paginatedUsers.map(employee => (
                <ProfileCard
                  key={employee._id}
                  employee={employee}
                  onPress={() => handleUserSelect(employee)}
                  currencySymbol="₹"
                />
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>{currentPage} / {totalPages}</Text>
                  <TouchableOpacity
                    style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Footer showSocialLinks showCopyright />
      <CollapsibleSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} user={user} />

      {/* Profile Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Payroll Profile</Text>
                <Text style={styles.modalSubtitle}>{selectedUser?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <X size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* Employee Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Employee Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Employee ID</Text>
                    <Text style={styles.infoValue}>{selectedUser?.employeeId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Department</Text>
                    <Text style={styles.infoValue}>{selectedUser?.department || '—'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Designation</Text>
                    <Text style={styles.infoValue}>{selectedUser?.designation || '—'}</Text>
                  </View>
                </View>

                {/* Bank Details */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Bank Details</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Bank Name</Text>
                    <Text style={styles.infoValue}>{selectedUser?.bankName || 'Not provided'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Account Number</Text>
                    <Text style={styles.infoValue}>
                      {selectedUser?.accountNumber ? `****${selectedUser.accountNumber.slice(-4)}` : 'Not provided'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>IFSC Code</Text>
                    <Text style={styles.infoValue}>{selectedUser?.ifscCode || 'Not provided'}</Text>
                  </View>
                </View>

                {/* Payroll Configuration */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Payroll Configuration</Text>
                  
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Payroll Cycle</Text>
                    <Picker
                      selectedValue={formData.payrollType}
                      onValueChange={(v: any) => setFormData({ ...formData, payrollType: v })}
                      style={styles.formPicker}
                    >
                      <Picker.Item label="Monthly" value="Monthly" />
                      <Picker.Item label="Weekly" value="Weekly" />
                      <Picker.Item label="Hourly" value="Hourly" />
                      <Picker.Item label="Daily" value="Daily" />
                    </Picker>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Employment Type</Text>
                    <Picker
                      selectedValue={formData.employeeType}
                      onValueChange={(v: any) => setFormData({ ...formData, employeeType: v })}
                      style={styles.formPicker}
                    >
                      <Picker.Item label="Permanent" value="Permanent" />
                      <Picker.Item label="Contractor" value="Contractor" />
                      <Picker.Item label="Probation" value="Probation" />
                      <Picker.Item label="Intern" value="Trainee" />
                    </Picker>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Salary Mode</Text>
                    <View style={styles.modeSwitch}>
                      <TouchableOpacity
                        style={[styles.modeButton, formData.salaryMode === 'Role-Based' && styles.modeButtonActive]}
                        onPress={() => setFormData({ ...formData, salaryMode: 'Role-Based' })}
                      >
                        <Text style={[styles.modeButtonText, formData.salaryMode === 'Role-Based' && styles.modeButtonTextActive]}>
                          Role Based
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modeButton, formData.salaryMode === 'Employee-Based' && styles.modeButtonActive]}
                        onPress={() => setFormData({ ...formData, salaryMode: 'Employee-Based' })}
                      >
                        <Text style={[styles.modeButtonText, formData.salaryMode === 'Employee-Based' && styles.modeButtonTextActive]}>
                          Employee Based
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {formData.salaryMode === 'Employee-Based' && (
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Salary Structure</Text>
                      <Picker
                        selectedValue={formData.salaryStructureId}
                        onValueChange={(v: any) => setFormData({ ...formData, salaryStructureId: v })}
                        style={styles.formPicker}
                      >
                        <Picker.Item label="Select a structure..." value="" />
                        {structures.filter(s => s.type === 'Employee-Based').map(s => (
                          <Picker.Item key={s._id} label={s.name} value={s._id} />
                        ))}
                      </Picker>
                    </View>
                  )}

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Monthly CTC</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={formData.monthlyCTC}
                      onChangeText={(v) => setFormData({ ...formData, monthlyCTC: v })}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Active Profile</Text>
                    <Switch
                      value={formData.isActive}
                      onValueChange={(v) => setFormData({ ...formData, isActive: v })}
                      trackColor={{ false: COLORS.border, true: COLORS.primary }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {profiles.find(p => p.user?._id === selectedUser?._id) && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={16} color={COLORS.error} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                onPress={handleSaveProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Save size={16} color={COLORS.white} />
                    <Text style={styles.saveButtonText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <View style={styles.confirmIcon}>
              <Trash2 size={32} color={COLORS.error} />
            </View>
            <Text style={styles.confirmTitle}>Delete Profile?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to remove the salary structure for {selectedUser?.name}?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={handleDeleteProfile}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48.2%', // Take up nearly half the width (accounting for gap)
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  filterPicker: {
    flex: 1,
    height: 44,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  profileId: {
    fontSize: 12,
    color: COLORS.gray,
  },
  profileDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileDetailText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  profileStatuses: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  pageButton: {
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    color: COLORS.gray,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  formPicker: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
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
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  modeButtonTextActive: {
    color: COLORS.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    gap: 8,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: 'bold',
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
    backgroundColor: COLORS.error + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
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
