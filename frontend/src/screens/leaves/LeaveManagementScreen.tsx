// screens/leaves/LeaveManagementScreen.tsx
import React, { useState, useCallback } from 'react';
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
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import RNFS from 'react-native-fs';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Users,
  ClipboardList,
  SlidersHorizontal,
  Ban,
  Check,
} from 'lucide-react-native';
import { leaveAPI, userAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ProGuard from '../../components/common/ProGuard';

// Helper function to safely extract data from API response
const extractData = (response: any, defaultValue: any = null) => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

// Types
interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  department?: string;
  leaveBalance?: Record<string, number>;
}

interface LeaveRequest {
  id: string;
  leaveId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  userId: User;
  approvedBy?: { name: string };
  rejectionReason?: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, bgColor, onPress }: any) => (
  <TouchableOpacity style={[styles.statCard, { backgroundColor: bgColor }]} onPress={onPress} activeOpacity={0.7}>
    <Icon size={20} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </TouchableOpacity>
);

// Leave Request Card
const LeaveRequestCard = ({
  leave,
  onView,
  onApprove,
  onReject,
  isApproving,
  isRejecting
}: {
  leave: LeaveRequest;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) => {
  const isPending = leave.status === 'pending';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View>
          <Text style={styles.employeeName}>{leave.userId?.name}</Text>
          <Text style={styles.employeeId}>ID: {leave.userId?.employeeId || '—'}</Text>
        </View>
        <StatusBadge status={leave.status} />
      </View>

      <View style={styles.requestInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Leave Type</Text>
          <Text style={[styles.infoValue, styles.capitalize]}>{leave.leaveType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Leave ID</Text>
          <Text style={[styles.infoValue, styles.mono]}>{leave.leaveId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration</Text>
          <Text style={styles.infoValue}>{leave.totalDays} day(s)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>From</Text>
          <Text style={styles.infoValue}>{format(new Date(leave.startDate), 'MMM dd, yyyy')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>To</Text>
          <Text style={styles.infoValue}>{format(new Date(leave.endDate), 'MMM dd, yyyy')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Applied On</Text>
          <Text style={styles.infoValue}>{format(new Date(leave.createdAt), 'MMM dd, yyyy')}</Text>
        </View>
      </View>

      {leave.reason && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <Text style={styles.reasonText}>{leave.reason}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.viewButton} onPress={onView}>
          <Eye size={16} color="#64748b" />
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>

        {isPending && (
          <>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={onReject}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <XCircle size={16} color="#ef4444" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={onApprove}
              disabled={isApproving}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="white" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// Eligibility Row Component
const EligibilityRow = ({
  employee,
  leaveTypes,
  onEdit
}: {
  employee: User;
  leaveTypes: string[];
  onEdit: (employee: User) => void;
}) => (
  <View style={styles.eligibilityRow}>
    <View style={styles.employeeInfo}>
      <View style={styles.employeeAvatar}>
        <Text style={styles.avatarText}>{employee.name?.charAt(0) || '?'}</Text>
      </View>
      <View>
        <Text style={styles.employeeName}>{employee.name}</Text>
        <Text style={styles.employeeMeta}>{employee.employeeId} • {employee.department || '—'}</Text>
      </View>
    </View>
    <View style={styles.balancesContainer}>
      {leaveTypes.map(type => (
        <View key={type} style={styles.balanceItem}>
          <Text style={styles.balanceValue}>{employee.leaveBalance?.[type] || 0}</Text>
          <Text style={styles.balanceType}>{type.slice(0, 3)}</Text>
        </View>
      ))}
    </View>
    <TouchableOpacity style={styles.editButton} onPress={() => onEdit(employee)}>
      <Text style={styles.editButtonText}>Edit</Text>
    </TouchableOpacity>
  </View>
);

// Edit Eligibility Modal
const EditEligibilityModal = ({
  visible,
  employee,
  leaveTypes,
  onClose,
  onSave,
  isSaving
}: {
  visible: boolean;
  employee: User | null;
  leaveTypes: string[];
  onClose: () => void;
  onSave: (balances: Record<string, number>) => void;
  isSaving: boolean;
}) => {
  const [balances, setBalances] = useState<Record<string, number>>({});

  React.useEffect(() => {
    if (employee?.leaveBalance) {
      setBalances(employee.leaveBalance);
    }
  }, [employee]);

  if (!employee) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Leave Eligibility</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <Text style={styles.employeeName}>{employee.name}</Text>
              <Text style={styles.employeeId}>{employee.employeeId}</Text>

              {leaveTypes.map(type => (
                <View key={type} style={styles.balanceField}>
                  <Text style={styles.balanceFieldLabel}>{type.toUpperCase()} (Days)</Text>
                  <TextInput
                    style={styles.balanceInput}
                    keyboardType="numeric"
                    value={String(balances[type] || 0)}
                    onChangeText={(text) => setBalances(prev => ({ ...prev, [type]: Number(text) || 0 }))}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={() => onSave(balances)}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Check size={16} color="white" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Reject Modal
const RejectModal = ({
  visible,
  leave,
  onClose,
  onConfirm,
  isRejecting
}: {
  visible: boolean;
  leave: LeaveRequest | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isRejecting: boolean;
}) => {
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (visible) setReason('');
  }, [visible]);

  if (!leave) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reject Leave Request</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.leaveInfoBox}>
              <Text style={styles.leaveInfoName}>{leave.userId?.name}</Text>
              <Text style={styles.leaveInfoType}>{leave.leaveType} • {leave.totalDays} day(s)</Text>
            </View>
            <TextInput
              style={styles.reasonInput}
              placeholder="Rejection reason (optional)"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Keep Leave</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, isRejecting && styles.disabledButton]}
              onPress={() => onConfirm(reason)}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ban size={16} color="white" />
                  <Text style={styles.rejectButtonText}>Reject Leave</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Filter Panel Component
const FilterPanel = ({
  visible,
  filters,
  onApply,
  onClear,
  onClose,
  employees,
  leaveTypes
}: {
  visible: boolean;
  filters: any;
  onApply: (filters: any) => void;
  onClear: () => void;
  onClose: () => void;
  employees: User[];
  leaveTypes: string[];
}) => {
  const [tempFilters, setTempFilters] = useState(filters);

  React.useEffect(() => {
    if (visible) setTempFilters(filters);
  }, [visible, filters]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Applications</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Leave ID</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search by leave ID"
                  value={tempFilters.leaveId}
                  onChangeText={(text) => setTempFilters((prev: any) => ({ ...prev, leaveId: text }))}
                />
              </View>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Employee</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search employee"
                  value={tempFilters.userId}
                  onChangeText={(text) => setTempFilters((prev: any) => ({ ...prev, userId: text }))}
                />
              </View>
              <View style={styles.filterRow}>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Status</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Status"
                    value={tempFilters.status}
                    onChangeText={(text) => setTempFilters((prev: any) => ({ ...prev, status: text }))}
                  />
                </View>
                <View style={[styles.filterField, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>Leave Type</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Type"
                    value={tempFilters.leaveType}
                    onChangeText={(text) => setTempFilters((prev: any) => ({ ...prev, leaveType: text }))}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={onClear}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => onApply(tempFilters)}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Eligibility Filter Panel
const EligibilityFilterPanel = ({
  visible,
  filters,
  onApply,
  onClear,
  onClose,
  departments
}: {
  visible: boolean;
  filters: any;
  onApply: (filters: any) => void;
  onClear: () => void;
  onClose: () => void;
  departments: string[];
}) => {
  const [tempFilters, setTempFilters] = useState(filters);

  React.useEffect(() => {
    if (visible) setTempFilters(filters);
  }, [visible, filters]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Employees</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Department</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="All Departments"
                value={tempFilters.department}
                onChangeText={(text) => setTempFilters((prev: any) => ({ ...prev, department: text }))}
              />
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={onClear}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => onApply(tempFilters)}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Leave Detail Modal
const LeaveDetailModal = ({
  leave,
  visible,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting
}: {
  leave: LeaveRequest | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (leave: LeaveRequest) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) => {
  if (!leave) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, styles.detailModal]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leave Details</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Leave ID</Text>
                <Text style={styles.detailValue}>{leave.leaveId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Employee</Text>
                <Text style={styles.detailValue}>{leave.userId?.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Employee ID</Text>
                <Text style={styles.detailValue}>{leave.userId?.employeeId || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Leave Type</Text>
                <Text style={[styles.detailValue, styles.capitalize]}>{leave.leaveType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>From</Text>
                <Text style={styles.detailValue}>{format(new Date(leave.startDate), 'MMM dd, yyyy')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>To</Text>
                <Text style={styles.detailValue}>{format(new Date(leave.endDate), 'MMM dd, yyyy')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{leave.totalDays} day(s)</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Applied On</Text>
                <Text style={styles.detailValue}>{format(new Date(leave.createdAt), 'MMM dd, yyyy')}</Text>
              </View>
              {leave.reason && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Reason</Text>
                  <Text style={styles.detailText}>{leave.reason}</Text>
                </View>
              )}
              {leave.rejectionReason && (
                <View style={[styles.detailSection, styles.rejectionSection]}>
                  <Text style={[styles.detailLabel, styles.rejectionLabel]}>Rejection Reason</Text>
                  <Text style={styles.rejectionText}>{leave.rejectionReason}</Text>
                </View>
              )}
              {leave.approvedBy && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Processed By</Text>
                  <Text style={styles.detailValue}>{leave.approvedBy.name}</Text>
                </View>
              )}
            </View>
          </ScrollView>
          {leave.status === 'pending' && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => onReject(leave)}
              >
                <XCircle size={16} color="#ef4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => onApprove(leave.id)}
              >
                <CheckCircle2 size={16} color="white" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default function LeaveManagementScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'applications' | 'eligibility'>('applications');
  const [searchType, setSearchType] = useState<'employee' | 'leave'>('leave');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<string[]>(['annual', 'casual', 'sick']);
  const [departments, setDepartments] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [filters, setFilters] = useState({ status: '', leaveType: '', userId: '', leaveId: '' });
  const [eligibilityFilters, setEligibilityFilters] = useState({ department: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showEligibilityFilters, setShowEligibilityFilters] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eligibilityPage, setEligibilityPage] = useState(1);
  const [eligibilityTotalPages, setEligibilityTotalPages] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const fetchLeaveTypes = async () => {
    try {
      const response = await settingsAPI.getTimesheetSettings();
      const settings = extractData(response);
      const types = settings?.eligibleLeaveTypes;
      if (types && types.length > 0) {
        setLeaveTypes(types);
      }
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await userAPI.getDepartments();
      const depts = extractData(response, []);
      setDepartments(depts);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 10, isAdminView: true };
      if (searchQuery.length >= 2 && searchType === 'leave') params.search = searchQuery;
      if (filters.status) params.status = filters.status;
      if (filters.leaveType) params.leaveType = filters.leaveType;
      if (filters.userId) params.userId = filters.userId;
      if (filters.leaveId) params.leaveId = filters.leaveId;

      const response = await leaveAPI.getAll(params);

      // Handle paginated structure
      let leavesData = [];
      let paginationData = null;

      if (response && (response as any).data && !Array.isArray((response as any).data)) {
        leavesData = (response as any).data.data || [];
        paginationData = (response as any).data.pagination;
      } else {
        leavesData = extractData(response, []);
        paginationData = (response as any).pagination;
      }

      // Map IDs and ensure valid user objects
      const mappedLeaves = leavesData.map((l: any) => ({
        ...l,
        id: l.id || l._id,
        userId: l.userId || { name: 'Unknown User', employeeId: 'N/A' }
      }));

      setLeaves(mappedLeaves);
      setPagination(paginationData);
      setTotalPages(paginationData?.totalPages || 1);

      // Calculate stats based on current view or all (approximated here)
      setStats({
        total: mappedLeaves.length,
        pending: mappedLeaves.filter((l: LeaveRequest) => l.status === 'pending').length,
        approved: mappedLeaves.filter((l: LeaveRequest) => l.status === 'approved').length,
        rejected: mappedLeaves.filter((l: LeaveRequest) => l.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error fetching leaves:', error);
      Alert.alert('Error', 'Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Build parameters
      const params: any = {
        page: eligibilityPage,
        limit: 10
      };

      if (searchQuery.length >= 2 && searchType === 'employee') {
        params.search = searchQuery;
      }

      if (eligibilityFilters.department && eligibilityFilters.department !== 'all') {
        params.department = eligibilityFilters.department;
      }

      // If no specific search, we might want to default to employees role to avoid getting everyone
      if (!params.search && !params.department) {
        params.role = 'employee';
      }

      console.log('Fetching employees with params:', params);
      const response = await userAPI.getAll(params);
      const data = extractData(response);

      let users = [];
      let totalPages = 1;

      if (data && data.data) {
        users = data.data;
        totalPages = data.pagination?.totalPages || 1;
      } else if (Array.isArray(data)) {
        users = data;
      } else if (data && data.users) {
        users = data.users;
        totalPages = data.total_pages || data.totalPages || 1;
      } else if (data && typeof data === 'object') {
        // Fallback for any other objects that might contain the list
        const possibleKeys = ['data', 'users', 'results', 'employees'];
        for (const key of possibleKeys) {
          if (Array.isArray(data[key])) {
            users = data[key];
            break;
          }
        }
      }

      console.log(`Found ${users.length} employees`);
      setEmployees(users.map((u: any) => ({
        ...u,
        id: u.id || u._id || Math.random().toString(36).substr(2, 9)
      })));
      setEligibilityTotalPages(totalPages);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

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

  const fetchAllData = async () => {
    await loadUserData();
    await Promise.all([
      fetchLeaveTypes(),
      fetchDepartments(),
      activeTab === 'applications' ? fetchLeaves() : fetchEmployees(),
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [page, eligibilityPage, searchQuery, filters, eligibilityFilters, activeTab])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    setIsApproving(true);
    try {
      await leaveAPI.approve(id);
      Alert.alert('Success', 'Leave approved!');
      fetchLeaves();
      setShowDetailModal(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to approve');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setIsRejecting(true);
    try {
      await leaveAPI.reject(id, reason);
      Alert.alert('Success', 'Leave rejected');
      setShowRejectModal(false);
      setSelectedLeave(null);
      fetchLeaves();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to reject');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleUpdateEligibility = async (balances: Record<string, number>) => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    try {
      await userAPI.update(selectedEmployee._id, { leaveBalance: balances });
      Alert.alert('Success', 'Leave eligibility updated!');
      setShowEligibilityModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update eligibility');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params: any = { isAdminView: true, limit: 1000 };
      if (filters.status) params.status = filters.status;
      if (filters.leaveType) params.leaveType = filters.leaveType;

      const csvData = await leaveAPI.export(params);
      
      if (Platform.OS === 'web') {
        const globalAny = globalThis as any;
        const blob = new globalAny.Blob([csvData as any], { type: 'text/csv' });
        const url = globalAny.URL.createObjectURL(blob);
        const a = globalAny.document.createElement('a');
        a.href = url;
        a.download = `leave_applications_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        a.click();
        globalAny.URL.revokeObjectURL(url);
      } else {
        const downloadPath = Platform.OS === 'android'
          ? RNFS.DownloadDirectoryPath
          : RNFS.DocumentDirectoryPath;
        const fileName = `leave_applications_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const filePath = `${downloadPath}/${fileName}`;
        
        await RNFS.writeFile(filePath, csvData as string, 'utf8');
        
        const shareOptions: any = {
          title: 'Export Leaves',
          message: `Leaves exported to ${fileName}`,
        };
        
        if (Platform.OS === 'ios') {
          shareOptions.url = `file://${filePath}`;
        }
        
        await Share.share(shareOptions);
      }
      Alert.alert('Success', 'Leaves exported successfully!');
    } catch (error: any) {
      console.error('Export failed:', error);
      Alert.alert('Error', error?.message || 'Failed to export CSV. Please try again.');
    }
  };

  const handleExportEligibilityCSV = async () => {
    try {
      const params: any = { limit: 1000 };
      if (eligibilityFilters.department) params.department = eligibilityFilters.department;

      const csvData = await userAPI.export(params);
      
      if (Platform.OS === 'web') {
        const globalAny = globalThis as any;
        const blob = new globalAny.Blob([csvData as any], { type: 'text/csv' });
        const url = globalAny.URL.createObjectURL(blob);
        const a = globalAny.document.createElement('a');
        a.href = url;
        a.download = `leave_eligibility_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        a.click();
        globalAny.URL.revokeObjectURL(url);
      } else {
        const downloadPath = Platform.OS === 'android'
          ? RNFS.DownloadDirectoryPath
          : RNFS.DocumentDirectoryPath;
        const fileName = `leave_eligibility_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const filePath = `${downloadPath}/${fileName}`;
        
        await RNFS.writeFile(filePath, csvData as string, 'utf8');
        
        const shareOptions: any = {
          title: 'Export Leave Eligibility',
          message: `Leave eligibility exported to ${fileName}`,
        };
        
        if (Platform.OS === 'ios') {
          shareOptions.url = `file://${filePath}`;
        }
        
        await Share.share(shareOptions);
      }
      Alert.alert('Success', 'Eligibility exported successfully!');
    } catch (error: any) {
      console.error('Export failed:', error);
      Alert.alert('Error', error?.message || 'Failed to export CSV. Please try again.');
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;
  const activeEligibilityFilterCount = Object.values(eligibilityFilters).filter(v => v !== '').length;

  return (
    <ProGuard
      title="Leave Management"
      subtitle="Centralized leave management, policy enforcement, and eligibility tracking are Enterprise Pro features."
      icon={ClipboardList}
    >
      <Layout
        title="Leave Management"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <PageHeader
            title="Leave Management"
            subtitle="Review and manage employee leave requests"
            icon={Calendar}
            iconColor="#3b82f6"
            iconBgColor="#eff6ff"
          />

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'applications' && styles.tabActive]}
              onPress={() => {
                setActiveTab('applications');
                setSearchType('leave');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'applications' && styles.tabTextActive]}>
                Applications
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'eligibility' && styles.tabActive]}
              onPress={() => {
                setActiveTab('eligibility');
                setSearchType('employee');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'eligibility' && styles.tabTextActive]}>
                Leave Eligibility
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {activeTab === 'applications' ? (
              <>
                {/* Stats Row */}
                <View style={styles.statsContainer}>
                  <StatCard title="Total" value={stats.total} icon={ClipboardList} color="#3b82f6" bgColor="#eff6ff" />
                  <StatCard title="Pending" value={stats.pending} icon={AlertCircle} color="#f59e0b" bgColor="#fffbeb" />
                  <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} color="#10b981" bgColor="#ecfdf5" />
                  <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="#ef4444" bgColor="#fef2f2" />
                </View>

                {/* Search and Filter Bar */}
                <View style={styles.searchBar}>
                  <View style={styles.searchBox}>
                    <Search size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search (min. 2 characters)..."
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
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
                  <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
                    <Download size={16} color="#10b981" />
                    <Text style={styles.exportButtonText}>Export</Text>
                  </TouchableOpacity>
                </View>

                {/* Filter Panel */}
                <FilterPanel
                  visible={showFilters}
                  filters={filters}
                  onApply={(newFilters) => {
                    setFilters(newFilters);
                    setShowFilters(false);
                    setPage(1);
                  }}
                  onClear={() => {
                    setFilters({ status: '', leaveType: '', userId: '', leaveId: '' });
                    setShowFilters(false);
                  }}
                  onClose={() => setShowFilters(false)}
                  employees={employees}
                  leaveTypes={leaveTypes}
                />

                {/* Leave Requests List */}
                {loading && leaves.length === 0 ? (
                  <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
                ) : leaves.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Calendar size={48} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No leave applications</Text>
                    <Text style={styles.emptyText}>No requests to review at this time</Text>
                  </View>
                ) : (
                  <>
                    {leaves.map(leave => (
                      <LeaveRequestCard
                        key={leave.id}
                        leave={leave}
                        onView={() => {
                          setSelectedLeave(leave);
                          setShowDetailModal(true);
                        }}
                        onApprove={() => handleApprove(leave.id)}
                        onReject={() => {
                          setSelectedLeave(leave);
                          setShowRejectModal(true);
                        }}
                        isApproving={isApproving}
                        isRejecting={isRejecting}
                      />
                    ))}

                    {totalPages > 1 && (
                      <View style={styles.pagination}>
                        <TouchableOpacity
                          style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                          onPress={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <Text style={styles.pageButtonText}>Previous</Text>
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                        <TouchableOpacity
                          style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                          onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          <Text style={styles.pageButtonText}>Next</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {/* Eligibility Search and Filter */}
                <View style={styles.searchBar}>
                  <View style={styles.searchBox}>
                    <Search size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search employees..."
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.filterButton, (showEligibilityFilters || activeEligibilityFilterCount > 0) && styles.filterButtonActive]}
                    onPress={() => setShowEligibilityFilters(!showEligibilityFilters)}
                  >
                    <Filter size={16} color={showEligibilityFilters || activeEligibilityFilterCount > 0 ? '#3b82f6' : '#64748b'} />
                    {activeEligibilityFilterCount > 0 && (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>{activeEligibilityFilterCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.exportButton} onPress={handleExportEligibilityCSV}>
                    <Download size={16} color="#10b981" />
                    <Text style={styles.exportButtonText}>Export</Text>
                  </TouchableOpacity>
                </View>

                {/* Eligibility Filter Panel */}
                <EligibilityFilterPanel
                  visible={showEligibilityFilters}
                  filters={eligibilityFilters}
                  onApply={(newFilters) => {
                    setEligibilityFilters(newFilters);
                    setShowEligibilityFilters(false);
                    setEligibilityPage(1);
                  }}
                  onClear={() => {
                    setEligibilityFilters({ department: '' });
                    setShowEligibilityFilters(false);
                  }}
                  onClose={() => setShowEligibilityFilters(false)}
                  departments={departments}
                />

                {/* Eligibility Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, styles.headerEmployee]}>Employee</Text>
                  {leaveTypes.map(type => (
                    <Text key={type} style={[styles.headerText, styles.headerBalance]}>{type}</Text>
                  ))}
                  <Text style={[styles.headerText, styles.headerAction]}>Action</Text>
                </View>

                {/* Employees List */}
                {employees.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Users size={48} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No employees found</Text>
                    <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
                  </View>
                ) : (
                  <>
                    {employees.map(employee => (
                      <EligibilityRow
                        key={employee._id}
                        employee={employee}
                        leaveTypes={leaveTypes}
                        onEdit={(emp) => {
                          setSelectedEmployee(emp);
                          setShowEligibilityModal(true);
                        }}
                      />
                    ))}

                    {eligibilityTotalPages > 1 && (
                      <View style={styles.pagination}>
                        <TouchableOpacity
                          style={[styles.pageButton, eligibilityPage === 1 && styles.pageButtonDisabled]}
                          onPress={() => setEligibilityPage(p => Math.max(1, p - 1))}
                          disabled={eligibilityPage === 1}
                        >
                          <Text style={styles.pageButtonText}>Previous</Text>
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>{eligibilityPage} / {eligibilityTotalPages}</Text>
                        <TouchableOpacity
                          style={[styles.pageButton, eligibilityPage === eligibilityTotalPages && styles.pageButtonDisabled]}
                          onPress={() => setEligibilityPage(p => Math.min(eligibilityTotalPages, p + 1))}
                          disabled={eligibilityPage === eligibilityTotalPages}
                        >
                          <Text style={styles.pageButtonText}>Next</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* Modals */}
        <LeaveDetailModal
          leave={selectedLeave}
          visible={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLeave(null);
          }}
          onApprove={handleApprove}
          onReject={(leave) => {
            setShowDetailModal(false);
            setSelectedLeave(leave);
            setShowRejectModal(true);
          }}
          isApproving={isApproving}
          isRejecting={isRejecting}
        />

        <RejectModal
          visible={showRejectModal}
          leave={selectedLeave}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedLeave(null);
          }}
          onConfirm={(reason) => selectedLeave && handleReject(selectedLeave.id, reason)}
          isRejecting={isRejecting}
        />

        <EditEligibilityModal
          visible={showEligibilityModal}
          employee={selectedEmployee}
          leaveTypes={leaveTypes}
          onClose={() => {
            setShowEligibilityModal(false);
            setSelectedEmployee(null);
          }}
          onSave={handleUpdateEligibility}
          isSaving={isSaving}
        />
      </Layout>
    </ProGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingBottom: 100 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#3b82f6' },

  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 4 },

  searchBar: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },

  filterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterButtonActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#3b82f6', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },

  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#10b981' },
  exportButtonText: { color: '#10b981', fontWeight: '600', fontSize: 13 },

  requestCard: { backgroundColor: 'white', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  employeeName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  employeeId: { fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  employeeMeta: { fontSize: 10, color: '#64748b', marginTop: 2 },
  requestInfo: { gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#64748b' },
  infoValue: { fontSize: 12, fontWeight: '500', color: '#1e293b' },
  reasonBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 12 },
  reasonLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  reasonText: { fontSize: 12, color: '#475569', lineHeight: 16 },
  cardFooter: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  viewButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f8fafc' },
  viewButtonText: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fef2f2' },
  rejectButtonText: { fontSize: 12, fontWeight: '500', color: '#ef4444' },
  approveButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3b82f6' },
  approveButtonText: { fontSize: 12, fontWeight: '500', color: 'white' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  headerText: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  headerEmployee: { flex: 3 },
  headerBalance: { flex: 1, textAlign: 'center' },
  headerAction: { width: 60, textAlign: 'center' },

  eligibilityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  employeeInfo: { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 12 },
  employeeAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
  balancesContainer: { flexDirection: 'row', flex: 2, justifyContent: 'space-around' },
  balanceItem: { alignItems: 'center' },
  balanceValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  balanceType: { fontSize: 9, color: '#64748b', marginTop: 2 },
  editButton: { width: 60, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center' },
  editButtonText: { fontSize: 11, fontWeight: '600', color: '#3b82f6' },

  loader: { padding: 40 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 20 },
  pageButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  pageInfo: { fontSize: 13, color: '#64748b' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  filterModal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  detailModal: { maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalContent: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },

  filterField: { marginBottom: 16 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  filterInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8fafc' },
  filterRow: { flexDirection: 'row', gap: 12 },

  clearButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  clearButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  applyButton: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: 'white' },

  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 12 },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: 'white' },

  disabledButton: { opacity: 0.5 },

  leaveInfoBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 },
  leaveInfoName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  leaveInfoType: { fontSize: 11, color: '#64748b', marginTop: 2 },

  reasonInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc', minHeight: 80, textAlignVertical: 'top' },

  balanceField: { marginBottom: 16 },
  balanceFieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  balanceInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, backgroundColor: '#f8fafc' },

  detailContent: { padding: 20, gap: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { fontSize: 12, color: '#64748b' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#1e293b' },
  detailSection: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 12 },
  detailText: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  rejectionSection: { backgroundColor: '#fef2f2' },
  rejectionLabel: { color: '#ef4444' },
  rejectionText: { fontSize: 13, color: '#ef4444', marginTop: 4 },

  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  capitalize: { textTransform: 'capitalize' },
});