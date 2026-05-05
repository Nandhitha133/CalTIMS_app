// screens/payroll/EmployeePayrollProfiles.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit2, 
  Trash2, 
  X,
  TrendingDown,
  TrendingUp,
  Landmark,
  ChevronDown,
} from 'lucide-react-native';
import { userAPI, payrollAPI, policyAPI, settingsAPI } from '../../services/endpoints';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import DropdownModal from '../../components/common/DropdownModal';

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  orange: '#f39c12',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blueLight: '#EBF5FF',
  greenLight: '#E8F5E9',
  redLight: '#FEE2E2',
  yellowLight: '#FEF3C7',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  alternateRow: '#F9FAFB',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#EF4444',
  slate: '#64748B',
};

interface Employee {
  _id: string;
  id?: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  role: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  pan?: string;
  uan?: string;
  avatar?: string;
  profile?: PayrollProfile;
  hasProfile?: boolean;
  payrollStatus?: string;
  bankStatus?: string;
}

interface EarningComponent {
  name: string;
  value: number;
  calculatedValue?: number;
  calculationType: 'Fixed' | 'Percentage' | 'Formula';
  formula?: string;
}

interface DeductionComponent {
  name: string;
  value: number;
  calculatedValue?: number;
  calculationType: 'Fixed' | 'Percentage' | 'Formula';
  formula?: string;
  config?: {
    durationType: string;
    amount: number;
  };
}

interface PayrollProfile {
  _id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  annualCTC: number;
  monthlyCTC: number;
  payrollType: 'Monthly' | 'Hourly' | 'Contract';
  earnings: EarningComponent[];
  deductions: DeductionComponent[];
  salaryStructureId?: string;
  hourlyRate?: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

interface SalaryBreakdown {
  grossPay: number;
  totalDeductions: number;
  netSalary: number;
  earnings: EarningComponent[];
  deductions: DeductionComponent[];
  statutoryDeductions?: DeductionComponent[];
}

interface ProfileViewData {
  user: Employee;
  profile: PayrollProfile;
  breakdown: SalaryBreakdown;
}

interface KPI {
  label: string;
  value: number;
  icon: any;
  color: string;
  bg: string;
}

const EmployeePayrollProfiles = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<PayrollProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState<ProfileViewData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [globalPolicy, setGlobalPolicy] = useState<any>(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const [departments, setDepartments] = useState<string[]>(['All']);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, deptFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, statusFilter, itemsPerPage]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load settings for currency
      const settingsRes = await fetchSettings();
      if (settingsRes?.organization?.currency) {
        setCurrencySymbol(getCurrencySymbol(settingsRes.organization.currency));
      }

      // Load global policy
      const policyRes: any = await policyAPI.getPolicy();
      setGlobalPolicy(policyRes?.data?.data);

      // Load employees
      const employeesRes: any = await userAPI.getAll();
      const employeesList = employeesRes?.data?.data || employeesRes?.data || [];
      setEmployees(employeesList);

      // Extract unique departments
      const deptSet = new Set(['All']);
      employeesList.forEach((emp: Employee) => {
        if (emp.department) deptSet.add(emp.department);
      });
      setDepartments(Array.from(deptSet));

      // Load payroll profiles
      const profilesRes: any = await payrollAPI.getProfiles();
      setProfiles(profilesRes?.data?.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Load mock data for demo
      loadMockData();
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response: any = await settingsAPI.getSettings();
      const data = response?.data?.data || response?.data || response;
      return data;
    } catch (error) {
      return null;
    }
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      JPY: '¥',
      CNY: '¥',
      AUD: 'A$',
      CAD: 'C$',
    };
    return symbols[currency] || '₹';
  };

  const loadMockData = () => {
    const mockEmployees: Employee[] = [
      {
        _id: '1',
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john.doe@caldim.com',
        department: 'Engineering',
        designation: 'Senior Software Engineer',
        role: 'Senior Engineer',
        bankName: 'HDFC Bank',
        accountNumber: 'XXXX1234',
        ifscCode: 'HDFC0001234',
        pan: 'ABCDE1234F',
        uan: '123456789012',
      },
      {
        _id: '2',
        employeeId: 'EMP002',
        name: 'Jane Smith',
        email: 'jane.smith@caldim.com',
        department: 'Product',
        designation: 'Product Manager',
        role: 'Manager',
        bankName: 'ICICI Bank',
        accountNumber: 'XXXX5678',
        ifscCode: 'ICIC0005678',
        pan: 'FGHIJ5678K',
        uan: '987654321098',
      },
    ];

    const mockProfiles: PayrollProfile[] = [
      {
        _id: 'profile1',
        userId: '1',
        employeeId: 'EMP001',
        employeeName: 'John Doe',
        annualCTC: 1200000,
        monthlyCTC: 100000,
        payrollType: 'Monthly',
        earnings: [
          { name: 'Basic Salary', value: 40, calculationType: 'Percentage', calculatedValue: 40000 },
          { name: 'HRA', value: 50, calculationType: 'Percentage', calculatedValue: 20000 },
          { name: 'Special Allowance', value: 30000, calculationType: 'Fixed', calculatedValue: 30000 },
        ],
        deductions: [
          { name: 'Provident Fund', value: 12, calculationType: 'Percentage', calculatedValue: 4800 },
          { name: 'Professional Tax', value: 200, calculationType: 'Fixed', calculatedValue: 200 },
          { name: 'TDS', value: 10000, calculationType: 'Fixed', calculatedValue: 10000 },
        ],
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'profile2',
        userId: '2',
        employeeId: 'EMP002',
        employeeName: 'Jane Smith',
        annualCTC: 1800000,
        monthlyCTC: 150000,
        payrollType: 'Monthly',
        earnings: [
          { name: 'Basic Salary', value: 40, calculationType: 'Percentage', calculatedValue: 60000 },
          { name: 'HRA', value: 50, calculationType: 'Percentage', calculatedValue: 30000 },
          { name: 'Special Allowance', value: 50000, calculationType: 'Fixed', calculatedValue: 50000 },
        ],
        deductions: [
          { name: 'Provident Fund', value: 12, calculationType: 'Percentage', calculatedValue: 7200 },
          { name: 'Professional Tax', value: 200, calculationType: 'Fixed', calculatedValue: 200 },
          { name: 'TDS', value: 15000, calculationType: 'Fixed', calculatedValue: 15000 },
        ],
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    setEmployees(mockEmployees);
    setProfiles(mockProfiles);
    setDepartments(['All', 'Engineering', 'Product', 'HR', 'Finance']);
  };

  const filterEmployees = () => {
    let filtered = employees.map(emp => {
      const profile = profiles.find(p => p.userId === emp._id || p.employeeId === emp.employeeId);
      const bankDetailsComplete = !!(emp.bankName && emp.accountNumber && emp.ifscCode && emp.pan);
      let bankStatus = bankDetailsComplete ? 'Verified' : (emp.bankName || emp.accountNumber ? 'Pending' : 'Missing');
      let payrollStatus = 'Not Configured';
      
      if (profile) {
        const isProfileComplete = !!(profile.annualCTC && profile.earnings?.length > 0 && bankDetailsComplete);
        payrollStatus = isProfileComplete ? 'Active' : 'Warning';
      }

      return {
        ...emp,
        profile,
        hasProfile: !!profile,
        payrollStatus,
        bankStatus,
      };
    });

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(lowerTerm) ||
        emp.employeeId.toLowerCase().includes(lowerTerm)
      );
    }

    if (deptFilter !== 'All') {
      filtered = filtered.filter(emp => emp.department === deptFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(emp => emp.payrollStatus === statusFilter);
    }

    setFilteredEmployees(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitialData();
  }, []);

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString('en-IN')}`;
  };

  const calculateSalaryBreakdown = (profile: PayrollProfile): SalaryBreakdown => {
    const monthlyCTC = profile.monthlyCTC;
    let grossPay = 0;
    const earningsWithValues: EarningComponent[] = profile.earnings.map(e => {
      let calculatedValue = 0;
      if (e.calculationType === 'Percentage') {
        calculatedValue = (monthlyCTC * e.value) / 100;
      } else {
        calculatedValue = e.value;
      }
      grossPay += calculatedValue;
      return { ...e, calculatedValue };
    });

    let totalDeductions = 0;
    const deductionsWithValues: DeductionComponent[] = profile.deductions.map(d => {
      let calculatedValue = 0;
      if (d.calculationType === 'Percentage') {
        calculatedValue = (grossPay * d.value) / 100;
      } else {
        calculatedValue = d.value;
      }
      totalDeductions += calculatedValue;
      return { ...d, calculatedValue };
    });

    const netSalary = grossPay - totalDeductions;

    return {
      grossPay,
      totalDeductions,
      netSalary,
      earnings: earningsWithValues,
      deductions: deductionsWithValues,
    };
  };

  const handleViewProfile = (employee: any) => {
    if (!employee.profile) {
      Alert.alert('Info', 'No payroll configuration found for this employee');
      return;
    }

    const breakdown = calculateSalaryBreakdown(employee.profile);
    setSelectedProfileData({
      user: employee,
      profile: employee.profile,
      breakdown,
    });
    setShowViewModal(true);
  };

  const handleEditProfile = (employee: any) => {
    // Navigate to edit profile screen
    Alert.alert('Info', 'Edit profile feature coming soon');
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfileToDelete(profileId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;
    try {
      await payrollAPI.deleteProfile(profileToDelete);
      setProfiles(prev => prev.filter(p => p._id !== profileToDelete));
      Alert.alert('Success', 'Payroll profile deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete profile');
    } finally {
      setShowDeleteConfirm(false);
      setProfileToDelete(null);
    }
  };

  const getKPIs = (): KPI[] => {
    const totalEmployees = employees.length;
    const configuredProfiles = profiles.length;
    const pendingSetup = totalEmployees - configuredProfiles;
    const criticalErrors = filteredEmployees.filter(e => e.payrollStatus === 'Warning' || e.bankStatus === 'Missing').length;

    return [
      { label: 'Total Employees', value: totalEmployees, icon: Users, color: COLORS.blue, bg: COLORS.blueLight },
      { label: 'Configured Profiles', value: configuredProfiles, icon: CheckCircle, color: COLORS.emerald, bg: COLORS.greenLight },
      { label: 'Pending Setup', value: pendingSetup, icon: AlertCircle, color: COLORS.amber, bg: COLORS.yellowLight },
      { label: 'Critical Errors', value: criticalErrors, icon: AlertTriangle, color: COLORS.rose, bg: COLORS.redLight },
    ];
  };

  const paginatedEmployees = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const getStatusBadge = (status: string, bankStatus: string) => {
    if (status === 'Active') {
      return { label: 'Active', color: COLORS.emerald, bg: COLORS.greenLight, icon: CheckCircle };
    }
    if (status === 'Warning') {
      return { label: 'Incomplete Details', color: COLORS.amber, bg: COLORS.yellowLight, icon: AlertCircle };
    }
    return { label: 'Pending Setup', color: COLORS.slate, bg: COLORS.filterBg, icon: AlertCircle };
  };

  const getBankStatusBadge = (status: string) => {
    if (status === 'Verified') {
      return { label: 'Verified', color: COLORS.emerald, bg: COLORS.greenLight, icon: CheckCircle };
    }
    if (status === 'Pending') {
      return { label: 'Pending', color: COLORS.amber, bg: COLORS.yellowLight, icon: AlertCircle };
    }
    return { label: 'Missing', color: COLORS.rose, bg: COLORS.redLight, icon: AlertTriangle };
  };

  const renderKPI = (kpi: any, index: number) => {
    const IconComponent = kpi.icon;
    return (
      <View key={index} style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: kpi.bg }]}>
          <IconComponent size={22} color={kpi.color} />
        </View>
        <View>
          <Text style={styles.kpiLabel}>{kpi.label}</Text>
          <Text style={styles.kpiValue}>{kpi.value}</Text>
        </View>
      </View>
    );
  };

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <View style={styles.searchContainer}>
        <Search size={18} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employee by name or ID..."
          placeholderTextColor={COLORS.gray}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.filterButtons}>
        <TouchableOpacity 
          style={styles.pickerContainer}
          onPress={() => setShowDeptDropdown(true)}
        >
          <View style={styles.dropdownTrigger}>
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {deptFilter === 'All' ? 'All Departments' : deptFilter}
            </Text>
            <ChevronDown size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.pickerContainer}
          onPress={() => setShowStatusDropdown(true)}
        >
          <View style={styles.dropdownTrigger}>
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {statusFilter === 'All' ? 'All Status' : statusFilter === 'Not Configured' ? 'Pending Setup' : statusFilter === 'Warning' ? 'Incomplete Details' : statusFilter}
            </Text>
            <ChevronDown size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmployeeTable = () => {
    const data = paginatedEmployees();
    
    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Users size={60} color={COLORS.gray} />
          <Text style={styles.emptyTitle}>No employees found</Text>
          <Text style={styles.emptyText}>No employees match your current filters</Text>
        </View>
      );
    }

    return (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Header */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, styles.cellEmployee]}><Text style={styles.headerText}>Employee</Text></View>
              <View style={[styles.tableCell, styles.cellRole]}><Text style={styles.headerText}>Role / Designation</Text></View>
              <View style={[styles.tableCell, styles.cellCTC]}><Text style={[styles.headerText, styles.textRight]}>Defined CTC</Text></View>
              <View style={[styles.tableCell, styles.cellStatus]}><Text style={[styles.headerText, styles.textCenter]}>Payroll Status</Text></View>
              <View style={[styles.tableCell, styles.cellStatus]}><Text style={[styles.headerText, styles.textCenter]}>Bank Status</Text></View>
              <View style={[styles.tableCell, styles.cellActions]}><Text style={[styles.headerText, styles.textRight]}>Actions</Text></View>
            </View>

            {/* Rows */}
            {data.map((emp, index) => {
              const statusBadge = getStatusBadge(emp.payrollStatus || '', emp.bankStatus || '');
              const bankBadge = getBankStatusBadge(emp.bankStatus || '');
              const StatusIcon = statusBadge.icon;
              const BankIcon = bankBadge.icon;
              
              return (
                <View key={emp._id} style={[styles.tableRow, index % 2 === 0 && styles.rowEven]}>
                  <View style={[styles.tableCell, styles.cellEmployee]}>
                    <View style={styles.employeeAvatar}>
                      <Text style={styles.avatarText}>{emp.name.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.employeeName}>{emp.name}</Text>
                      <Text style={styles.employeeId}>ID: {emp.employeeId}</Text>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.cellRole]}>
                    <Text style={styles.roleText}>{emp.designation || 'Technical Resource'}</Text>
                    <Text style={styles.deptText}>{emp.department}</Text>
                  </View>

                  <View style={[styles.tableCell, styles.cellCTC]}>
                    <Text style={styles.ctcText}>
                      {emp.profile ? formatCurrency(emp.profile.monthlyCTC) : '—'}
                    </Text>
                    {emp.profile && <Text style={styles.payrollType}>{emp.profile.payrollType}</Text>}
                  </View>

                  <View style={[styles.tableCell, styles.cellStatus, styles.centerContent]}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                      <StatusIcon size={10} color={statusBadge.color} />
                      <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.cellStatus, styles.centerContent]}>
                    <View style={[styles.statusBadge, { backgroundColor: bankBadge.bg }]}>
                      <BankIcon size={10} color={bankBadge.color} />
                      <Text style={[styles.statusText, { color: bankBadge.color }]}>{bankBadge.label}</Text>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.cellActions, styles.rowActions]}>
                    <TouchableOpacity onPress={() => handleViewProfile(emp)} style={styles.actionButton}>
                      <Eye size={18} color={COLORS.blue} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleEditProfile(emp)} style={styles.actionButton}>
                      <Edit2 size={18} color={COLORS.green} />
                    </TouchableOpacity>
                    {emp.hasProfile && emp.profile && (
                      <TouchableOpacity onPress={() => handleDeleteProfile(emp.profile!._id)} style={styles.actionButton}>
                        <Trash2 size={18} color={COLORS.rose} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
            >
              <ChevronLeft size={18} color={currentPage === 1 ? COLORS.gray : COLORS.primary} />
            </TouchableOpacity>
            
            <Text style={styles.pageText}>
              Page {currentPage} of {totalPages}
            </Text>
            
            <TouchableOpacity
              onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
            >
              <ChevronRight size={18} color={currentPage === totalPages ? COLORS.gray : COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  const renderProfileViewModal = () => {
    if (!selectedProfileData) return null;

    const { user, profile, breakdown } = selectedProfileData;

    return (
      <Modal
        visible={showViewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Employee Payroll Profile</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <X size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{user.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <View style={styles.profileBadges}>
                    <Text style={styles.profileDesignation}>{user.designation || 'Staff'}</Text>
                    <View style={styles.profileDot} />
                    <Text style={styles.profileDepartment}>{user.department}</Text>
                    <View style={styles.profileDot} />
                    <Text style={styles.profileId}>ID: {user.employeeId}</Text>
                  </View>
                </View>
              </View>

              {/* CTC Card */}
              <View style={styles.ctcCard}>
                <Text style={styles.ctcCardLabel}>Annual Package (CTC)</Text>
                <Text style={styles.ctcCardValue}>
                  {formatCurrency(profile.annualCTC || profile.monthlyCTC * 12)}
                </Text>
              </View>

              {/* Earnings Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <TrendingUp size={16} color={COLORS.emerald} />
                  <Text style={styles.sectionTitle}>Earnings (Payable)</Text>
                </View>
                <View style={styles.sectionCard}>
                  {breakdown.earnings.map((earning, idx) => (
                    <View key={idx} style={styles.sectionRow}>
                      <Text style={styles.sectionRowLabel}>{earning.name}</Text>
                      <Text style={styles.sectionRowValue}>{formatCurrency(earning.calculatedValue || 0)}</Text>
                    </View>
                  ))}
                  <View style={styles.sectionDivider} />
                  <View style={styles.sectionTotalRow}>
                    <Text style={styles.sectionTotalLabel}>Total Monthly Gross</Text>
                    <Text style={styles.sectionTotalValue}>{formatCurrency(breakdown.grossPay)}</Text>
                  </View>
                </View>
              </View>

              {/* Deductions Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <TrendingDown size={16} color={COLORS.rose} />
                  <Text style={styles.sectionTitle}>Deductions (Subtractions)</Text>
                </View>
                <View style={styles.sectionCard}>
                  {breakdown.deductions.map((deduction, idx) => (
                    <View key={idx} style={styles.sectionRow}>
                      <Text style={styles.sectionRowLabel}>{deduction.name}</Text>
                      <Text style={[styles.sectionRowValue, { color: COLORS.rose }]}>
                        -{formatCurrency(deduction.calculatedValue || 0)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.sectionDivider} />
                  <View style={styles.sectionTotalRow}>
                    <Text style={styles.sectionTotalLabel}>Total Monthly Deductions</Text>
                    <Text style={[styles.sectionTotalValue, { color: COLORS.rose }]}>
                      -{formatCurrency(breakdown.totalDeductions)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Compliance Details */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Landmark size={16} color={COLORS.indigo} />
                  <Text style={styles.sectionTitle}>Compliance Details</Text>
                </View>

                {/* Bank Details */}
                <View style={styles.complianceCard}>
                  <View style={styles.complianceDot} />
                  <Text style={styles.complianceTitle}>Beneficiary Bank</Text>
                  <View style={styles.complianceRow}>
                    <Text style={styles.complianceLabel}>Institution:</Text>
                    <Text style={styles.complianceValue}>{user.bankName || 'Not Set'}</Text>
                  </View>
                  <View style={styles.complianceRow}>
                    <Text style={styles.complianceLabel}>Account Number:</Text>
                    <Text style={styles.complianceValue}>{user.accountNumber || '—'}</Text>
                  </View>
                  <View style={styles.complianceRow}>
                    <Text style={styles.complianceLabel}>IFSC Code:</Text>
                    <Text style={styles.complianceValue}>{user.ifscCode || '—'}</Text>
                  </View>
                </View>

                {/* Tax Identity */}
                <View style={styles.complianceCard}>
                  <View style={[styles.complianceDot, { backgroundColor: COLORS.emerald }]} />
                  <Text style={styles.complianceTitle}>Tax Identity</Text>
                  <View style={styles.complianceRow}>
                    <Text style={styles.complianceLabel}>PAN Number:</Text>
                    <Text style={styles.complianceValue}>{user.pan || '—'}</Text>
                  </View>
                  <View style={styles.complianceRow}>
                    <Text style={styles.complianceLabel}>UAN:</Text>
                    <Text style={styles.complianceValue}>{user.uan || '—'}</Text>
                  </View>
                </View>

                {/* Net Salary Card */}
                <View style={styles.netSalaryCard}>
                  <Text style={styles.netSalaryLabel}>Estimated Monthly Payout</Text>
                  <Text style={styles.netSalaryValue}>{formatCurrency(breakdown.netSalary)}</Text>
                  <Text style={styles.netSalarySub}>Calculated Monthly Take-Home</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowViewModal(false)}
                style={styles.closeModalButton}
              >
                <Text style={styles.closeModalText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDeleteConfirmModal = () => (
    <Modal
      visible={showDeleteConfirm}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDeleteConfirm(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.confirmModalContent}>
          <View style={styles.confirmIcon}>
            <Trash2 size={40} color={COLORS.rose} />
          </View>
          <Text style={styles.confirmTitle}>Confirm Deletion</Text>
          <Text style={styles.confirmMessage}>
            Are you sure you want to delete this payroll profile? This action cannot be undone.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              onPress={() => setShowDeleteConfirm(false)}
              style={styles.cancelConfirmButton}
            >
              <Text style={styles.cancelConfirmText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmDelete}
              style={styles.deleteConfirmButton}
            >
              <Text style={styles.deleteConfirmText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header title="Payroll Profiles" showBackButton={true} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* KPI Section */}
        <View style={styles.kpiContainer}>
          {getKPIs().map((kpi, index) => renderKPI(kpi, index))}
        </View>

        {/* Filter Bar */}
        {renderFilterBar()}

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          Showing {filteredEmployees.length} of {employees.length} employees
        </Text>

        {/* Employee Table */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading payroll profiles...</Text>
          </View>
        ) : (
          renderEmployeeTable()
        )}
      </ScrollView>

      {/* Modals */}
      {renderProfileViewModal()}
      {renderDeleteConfirmModal()}

      <DropdownModal
        visible={showDeptDropdown}
        onClose={() => setShowDeptDropdown(false)}
        options={departments.map(dept => ({ label: dept === 'All' ? 'All Departments' : dept, value: dept }))}
        selectedValue={deptFilter}
        onSelect={setDeptFilter}
        title="Select Department"
      />

      <DropdownModal
        visible={showStatusDropdown}
        onClose={() => setShowStatusDropdown(false)}
        options={[
          { label: 'All Status', value: 'All' },
          { label: 'Active', value: 'Active' },
          { label: 'Pending Setup', value: 'Not Configured' },
          { label: 'Incomplete Details', value: 'Warning' },
        ]}
        selectedValue={statusFilter}
        onSelect={setStatusFilter}
        title="Select Payroll Status"
      />

      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  filterBar: {
    backgroundColor: COLORS.white,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.filterBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerContainer: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.filterBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  resultsCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.filterBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minWidth: 600,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minWidth: 600,
  },
  rowEven: {
    backgroundColor: COLORS.alternateRow,
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cellEmployee: { width: 160 },
  cellRole: { width: 140 },
  cellCTC: { width: 100 },
  cellStatus: { width: 100 },
  cellActions: { width: 100 },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.indigoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.indigo,
  },
  employeeName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  employeeId: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  deptText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ctcText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  payrollType: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  pageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  profileBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  profileDesignation: {
    fontSize: 11,
    color: COLORS.indigo,
    fontWeight: '500',
  },
  profileDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gray,
  },
  profileDepartment: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  profileId: {
    fontSize: 10,
    color: COLORS.gray,
  },
  ctcCard: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.filterBg,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  ctcCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  ctcCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sectionRowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionRowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  sectionTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  sectionTotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.emerald,
  },
  complianceCard: {
    backgroundColor: COLORS.filterBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  complianceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.indigo,
    marginBottom: 8,
  },
  complianceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  complianceRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  complianceLabel: {
    width: 100,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  complianceValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  netSalaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  netSalaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  netSalaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 4,
  },
  netSalarySub: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 8,
  },
  confirmModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelConfirmText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
});

export { EmployeePayrollProfiles };
export default EmployeePayrollProfiles;