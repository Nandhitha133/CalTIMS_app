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
  Calculator,
  Shield,
  CreditCard,
  Building,
  Plus,
  Save,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Activity,
} from 'lucide-react-native';
import { userAPI as employeeAPI, payrollAPI, policyAPI, settingsAPI } from '../../services/endpoints';
import CommonHeader from '../../components/common/Header';
import CommonFooter from '../../components/common/Footer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropdownModal from '../../components/common/DropdownModal';
import { useAuthStore } from '../../store/authStore';

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

interface EarningComponent {
  name: string;
  value: number;
  calculatedValue?: number;
  calculationType: 'Fixed' | 'Percentage' | 'Formula';
  formula?: string;
  basedOn?: string;
  hidden?: boolean;
}

interface DeductionComponent {
  name: string;
  value: number;
  calculatedValue?: number;
  calculationType: 'Fixed' | 'Percentage' | 'Formula';
  formula?: string;
  basedOn?: string;
  hidden?: boolean;
  isStatutory?: boolean;
  config?: {
    durationType: string;
    amount: number;
  };
}

interface PayrollProfile {
  _id: string;
  id?: string;
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
  user?: any;
  active?: boolean;
  isActive?: boolean;
  payrollStatus?: string;
  ctc?: number;
  salary?: number;
  ctcAmount?: number;
  totalSalary?: number;
  profile?: any;
  payrollProfile?: any;
  payroll?: any;
  salaryDetails?: any;
  salaryInfo?: any;
  payrollData?: any;
  empId?: string;
}

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
  payrollProfile?: any;
  payroll?: any;
  salaryDetails?: any;
  salaryInfo?: any;
  payrollData?: any;
  empId?: string;
  employeeType?: string;
}

interface SalaryBreakdown {
  grossPay: number;
  totalDeductions: number;
  netSalary: number;
  earnings: EarningComponent[];
  deductions: DeductionComponent[];
  statutoryDeductions?: DeductionComponent[];
  employerContributions?: any[];
  workingDays: number;
}

interface StatutoryConfig {
  pf: { mode: string; enabled: boolean };
  esi: { mode: string; enabled: boolean };
  pt: { mode: string; enabled: boolean };
  gratuity: { mode: string; enabled: boolean };
}

interface AttendanceConfig {
  mode: string;
  workingDays: number;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  pan: string;
  uan: string;
}

interface GlobalPolicy {
  statutory?: {
    pf?: { enabled: boolean; employeePercent?: number };
    esi?: { enabled: boolean; employeePercent?: number };
    pt?: { enabled: boolean };
    gratuity?: { enabled: boolean; includeInCTC?: boolean };
  };
}

interface Settings {
  organization?: {
    currency?: string;
    name?: string;
  };
  payroll?: {
    currencySymbol?: string;
  };
}

const ROLE_TEMPLATES: Record<string, any> = {
  intern: {
    earnings: [
      { name: 'Stipend', value: 15000, calculationType: 'Fixed', basedOn: 'CTC' },
    ],
    deductions: [],
  },
  employee: {
    earnings: [
      { name: 'Basic Salary', value: 40, calculationType: 'Percentage', basedOn: 'CTC' },
      { name: 'House Rent Allowance (HRA)', value: 40, calculationType: 'Percentage', basedOn: 'Basic Salary' },
      { name: 'Conveyance', value: 2000, calculationType: 'Fixed', basedOn: 'CTC' },
    ],
    deductions: [
      { name: 'Provident Fund (PF)', value: 12, calculationType: 'Percentage', basedOn: 'Basic Salary' },
      { name: 'ESI', value: 0.75, calculationType: 'Percentage', basedOn: 'Gross' },
    ],
  },
  manager: {
    earnings: [
      { name: 'Basic Salary', value: 50, calculationType: 'Percentage', basedOn: 'CTC' },
      { name: 'House Rent Allowance (HRA)', value: 50, calculationType: 'Percentage', basedOn: 'Basic Salary' },
      { name: 'Special Allowance', value: 15000, calculationType: 'Fixed', basedOn: 'CTC' },
    ],
    deductions: [
      { name: 'Provident Fund (PF)', value: 12, calculationType: 'Percentage', basedOn: 'Basic Salary' },
      { name: 'Professional Tax', value: 200, calculationType: 'Fixed', basedOn: 'CTC' },
    ],
  },
};

const getSafeId = (id: any): string => {
  if (!id) return '';
  let finalId = '';
  
  if (typeof id === 'string') {
    finalId = id;
  } else if (typeof id === 'object') {
    if (id.$oid) finalId = String(id.$oid);
    else if (id._id) return getSafeId(id._id);
    else if (id.id) return getSafeId(id.id);
    else finalId = String(id);
  } else {
    finalId = String(id);
  }

  // BANK-GRADE: Strip virtual prefix if present before sending to backend
  if (finalId.startsWith('v-')) {
    return finalId.substring(2);
  }
  
  return finalId;
};

export const EmployeePayrollProfiles = ({ route }: { route?: any }) => {
  const incomingEmployeeId = route?.params?.employeeId;

  // List View States
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
  const [selectedProfileData, setSelectedProfileData] = useState<{
    user: Employee;
    profile: PayrollProfile;
    breakdown: SalaryBreakdown;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [globalPolicy, setGlobalPolicy] = useState<GlobalPolicy | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [settings, setSettings] = useState<Settings | null>(null);

  // Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('employee');
  const [ctcType, setCtcType] = useState<'annual' | 'monthly'>('annual');
  const [ctcValue, setCtcValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [structure, setStructure] = useState({
    name: 'Payroll Profile',
    earnings: [...ROLE_TEMPLATES.employee.earnings],
    deductions: [...ROLE_TEMPLATES.employee.deductions],
  });
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    pan: '',
    uan: '',
  });
  const [statutoryConfig, setStatutoryConfig] = useState<StatutoryConfig>({
    pf: { mode: 'default', enabled: true },
    esi: { mode: 'default', enabled: true },
    pt: { mode: 'default', enabled: true },
    gratuity: { mode: 'default', enabled: true },
  });
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>({
    mode: 'POLICY_DEFAULT',
    workingDays: 26,
  });

  const [departments, setDepartments] = useState<string[]>(['All']);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, profiles, searchTerm, deptFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, statusFilter, itemsPerPage]);

  // Handle incoming employee ID from navigation
  useEffect(() => {
    if (incomingEmployeeId && employees.length > 0) {
      const targetEmp = employees.find(e => getSafeId(e._id) === incomingEmployeeId || e.employeeId === incomingEmployeeId);
      if (targetEmp) {
        setSearchTerm(targetEmp.employeeId || targetEmp.name);
        // If they have a profile, view it, otherwise edit/setup
        if (targetEmp.hasProfile) {
          handleViewProfile(targetEmp);
        } else {
          handleEditProfile(targetEmp);
        }
      }
    }
  }, [incomingEmployeeId, employees]);

  // When editing employee, load their profile data
  useEffect(() => {
    if (editingEmployee && showWizard) {
      loadEmployeeDataForWizard();
    }
  }, [editingEmployee, showWizard, profiles]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load settings for currency
      const settingsRes = (await settingsAPI.getSettings()) as any;
      const settingsData = settingsRes?.data?.data || settingsRes?.data || settingsRes;
      setSettings(settingsData);
      if (settingsData?.organization?.currency) {
        setCurrencySymbol(getCurrencySymbol(settingsData.organization.currency));
      } else if (settingsData?.payroll?.currencySymbol) {
        setCurrencySymbol(settingsData.payroll.currencySymbol);
      }

      // Load global policy
      try {
        const policyRes = (await policyAPI.getPolicy()) as any;
        setGlobalPolicy(policyRes?.data?.data || policyRes?.data || policyRes);
      } catch (err) {
        console.log('Policy API not available, using default');
        setGlobalPolicy({ statutory: {} });
      }

      // Load employees and profiles in parallel for better performance
      const [employeesRes, profilesRes] = await Promise.all([
        employeeAPI.getAll().catch(err => {
          console.error('Employee API failed:', err);
          return [];
        }),
        payrollAPI.getProfiles({ limit: 1000 }).catch(err => {
          console.warn('Profiles API failed:', err);
          return [];
        })
      ]);

      // Normalize employee list extraction
      let rawEmployees = [];
      const eRes: any = employeesRes;
      if (Array.isArray(eRes)) {
        rawEmployees = eRes;
      } else if (eRes?.data && Array.isArray(eRes.data)) {
        rawEmployees = eRes.data;
      } else if (eRes?.data?.data && Array.isArray(eRes.data.data)) {
        rawEmployees = eRes.data.data;
      } else if (eRes?.employees && Array.isArray(eRes.employees)) {
        rawEmployees = eRes.employees;
      }

      const employeesList = rawEmployees.map((emp: any) => {
        // Deep discovery of name and ID
        const name = emp.name || emp.fullName || (emp.user && (emp.user.name || emp.user.fullName)) || 'Staff';
        const employeeId = emp.employeeId || emp.empId || (emp.user && (emp.user.employeeId || emp.user.empId)) || '';
        const email = emp.email || (emp.user && emp.user.email) || '';
        
        return {
          ...emp,
          name,
          employeeId,
          email,
          _id: getSafeId(emp._id || emp.id || (emp.user && (emp.user._id || emp.user.id)))
        };
      });
      setEmployees(employeesList);

      // Normalize profile list extraction
      let profilesList: any[] = [];
      const pRes: any = profilesRes;
      if (Array.isArray(pRes)) {
        profilesList = pRes;
      } else if (pRes?.data && Array.isArray(pRes.data)) {
        profilesList = pRes.data;
      } else if (pRes?.data?.data && Array.isArray(pRes.data.data)) {
        profilesList = pRes.data.data;
      } else if (pRes?.profiles && Array.isArray(pRes.profiles)) {
        profilesList = pRes.profiles;
      } else if (pRes?.data && typeof pRes.data === 'object') {
        // Handle case where profiles might be an object with IDs as keys
        profilesList = Object.values(pRes.data).filter(v => v && typeof v === 'object');
      }

      // Secondary profile discovery: aggressively merge profiles from employee response if available
      const secondaryProfiles = eRes?.profiles || eRes?.data?.profiles || eRes?.data?.data?.profiles || [];
      if (Array.isArray(secondaryProfiles) && secondaryProfiles.length > 0) {
        // Merge without duplicates based on _id
        const existingIds = new Set(profilesList.map(p => getSafeId(p._id || p.id)));
        secondaryProfiles.forEach(p => {
          const id = getSafeId(p._id || p.id);
          if (id && id !== 'undefined' && !existingIds.has(id)) {
            profilesList.push(p);
            existingIds.add(id);
          }
        });
      }

      // Tertiary discovery: Check if any employee objects themselves contain profile data
      employeesList.forEach((emp: any) => {
        const potentialProfile = emp.profile || emp.payrollProfile || emp.payroll || emp.salaryDetails || emp.payrollData || emp.salaryInfo;
        if (potentialProfile && typeof potentialProfile === 'object') {
          const id = getSafeId(potentialProfile._id || potentialProfile.id || '');
          const existingIds = new Set(profilesList.map(p => getSafeId(p._id || p.id)));
          if (id && id !== 'undefined' && !existingIds.has(id)) {
            profilesList.push(potentialProfile);
          } else if (!id) {
            // If no ID but has CTC data, it's a virtual profile we should keep
            const hasData = potentialProfile.annualCTC || potentialProfile.monthlyCTC || potentialProfile.ctc || potentialProfile.salary || potentialProfile.ctcAmount;
            if (hasData) {
              profilesList.push({ ...potentialProfile, _id: `v-${emp._id}`, userId: emp._id, employeeId: emp.employeeId });
            }
          }
        }
      });
      
      setProfiles(profilesList);

      // Extract unique departments
      const deptSet = new Set(['All']);
      employeesList.forEach((emp: Employee) => {
        if (emp.department) deptSet.add(emp.department);
      });
      setDepartments(Array.from(deptSet));

    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const isAuthError = errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('unauthorized');
      
      if (!isAuthError) {
        console.error('Error loading data:', error);
        Alert.alert('Error', 'Failed to load data. Please check your connection.');
      } else {
        // Auth errors are handled globally by apiService interceptor
        console.warn('Session expired or invalid token in Payroll Profiles');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadEmployeeDataForWizard = () => {
    if (!editingEmployee) return;

    // Load bank details from employee
    setBankDetails({
      bankName: editingEmployee.bankName || '',
      accountNumber: editingEmployee.accountNumber || '',
      ifscCode: editingEmployee.ifscCode || '',
      pan: editingEmployee.pan || '',
      uan: editingEmployee.uan || '',
    });

    // Load existing profile
    const existingProfile = profiles.find(p => {
      const pId = getSafeId(p._id || p.id).toLowerCase();
      const pUserId = getSafeId(p.userId || (typeof p.user === 'object' ? p.user?._id || p.user?.id : p.user)).toLowerCase();
      const pEmpId = String(p.employeeId || (typeof p.user === 'object' ? p.user?.employeeId : '') || '').toLowerCase();

      const eId = getSafeId(editingEmployee._id || editingEmployee.id).toLowerCase();
      const eEmpId = String(editingEmployee.employeeId || '').toLowerCase();

      return (
        (eId && pUserId && eId === pUserId) ||
        (eEmpId && pEmpId && eEmpId === pEmpId) ||
        (eId && pId && eId === pId)
      );
    });
    if (existingProfile) {
      setStructure({
        name: 'Payroll Profile',
        earnings: existingProfile.earnings || ROLE_TEMPLATES.employee.earnings,
        deductions: existingProfile.deductions || ROLE_TEMPLATES.employee.deductions,
      });
      setCtcValue(existingProfile.annualCTC ? existingProfile.annualCTC.toString() : 
                  existingProfile.monthlyCTC ? (existingProfile.monthlyCTC * 12).toString() : '');
      setCtcType('annual');
    } else {
      // Reset to default template
      const template = getAppliedTemplate(selectedRole);
      setStructure({
        name: 'Payroll Profile',
        earnings: template.earnings,
        deductions: template.deductions,
      });
      setCtcValue('');
    }
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CNY: '¥', AUD: 'A$', CAD: 'C$',
    };
    return symbols[currency] || '₹';
  };

  const getAppliedTemplate = (role: string) => {
    const template = JSON.parse(JSON.stringify(ROLE_TEMPLATES[role] || ROLE_TEMPLATES.employee));
    if (globalPolicy?.statutory) {
      const pfComp = template.deductions.find((d: any) => d.name.includes('Provident Fund') || d.name === 'PF');
      if (pfComp && globalPolicy.statutory.pf?.enabled) {
        pfComp.value = globalPolicy.statutory.pf.employeePercent || 12;
      }
      const esiComp = template.deductions.find((d: any) => d.name.includes('ESI'));
      if (esiComp && globalPolicy.statutory.esi?.enabled) {
        esiComp.value = globalPolicy.statutory.esi.employeePercent || 0.75;
      }
    }
    return template;
  };

  const filterEmployees = () => {
    let filtered = employees.map(emp => {
      const eId = getSafeId(emp._id).toLowerCase();
      const eEmpId = String(emp.employeeId || '').toLowerCase();
      const eEmail = String(emp.email || '').toLowerCase();
      const eName = String(emp.name || '').toLowerCase();

      // Normalize ID (extract numbers) for fuzzy matching
      const normalizeId = (id: string) => id.replace(/[^0-9]/g, '');
      const eNormId = normalizeId(eEmpId);

      // Exhaustive search for a matching profile in the profiles list
      let profile = profiles.find(p => {
        // Discovery: check if the profile is nested within the list item
        const pObj = (p.annualCTC || p.monthlyCTC || p.earnings || p.ctc || p.salary || p.ctcAmount) ? p : 
                     (p.profile || p.payrollProfile || p.payroll || p.salaryDetails || p.salaryInfo || p);
        
        const pId = getSafeId(pObj._id || pObj.id).toLowerCase();
        const pUserId = getSafeId(pObj.userId || (typeof pObj.user === 'object' ? pObj.user?._id || pObj.user?.id : pObj.user)).toLowerCase();
        const pEmpId = String(pObj.employeeId || pObj.empId || (typeof pObj.user === 'object' ? pObj.user?.employeeId || pObj.user?.empId : '') || '').toLowerCase();
        const pEmail = String(pObj.email || (typeof pObj.user === 'object' ? pObj.user?.email : '') || '').toLowerCase();
        const pName = String(pObj.employeeName || pObj.fullName || (typeof pObj.user === 'object' ? pObj.user?.name || pObj.user?.fullName : '') || '').toLowerCase();

        return (
          (eId && pUserId && eId === pUserId) ||
          (eEmpId && pEmpId && eEmpId === pEmpId) ||
          (eId && pId && eId === pId) ||
          (eEmail && pEmail && eEmail === pEmail) ||
          (eName && pName && eName === pName) ||
          (eNormId && pEmpId && normalizeId(pEmpId) === eNormId)
        );
      });

      // If not found in standalone list, check if it's already attached to the employee object
      if (!profile) {
        profile = emp.profile || (emp as any).payrollProfile || (emp as any).payroll || (emp as any).salaryDetails || (emp as any).salaryInfo;
      }

      // Check all properties of emp for an object that looks like a profile
      if (!profile) {
        for (const key in emp) {
          const val = (emp as any)[key];
          if (val && typeof val === 'object' && (val.annualCTC || val.monthlyCTC || val.earnings || val.ctc || val.salary || val.ctcAmount)) {
            profile = val;
            break;
          }
        }
      }

      // Normalize the profile object if it's still nested
      let finalProfile = profile ? (profile.annualCTC || profile.monthlyCTC || profile.ctc || profile.salary || profile.ctcAmount ? profile : 
                         (profile.profile || profile.payrollProfile || profile.payroll || profile.salaryDetails || profile.salaryInfo || profile)) : null;

      // Final fallback: check for flat CTC fields on the employee record itself
      if (!finalProfile || (!finalProfile.annualCTC && !finalProfile.monthlyCTC && !finalProfile.ctc && !finalProfile.salary)) {
        const ctc = Number((emp as any).annualCTC || (emp as any).ctc || (emp as any).salary || (emp as any).ctcAmount || 
                    ((emp as any).monthlyCTC ? (emp as any).monthlyCTC * 12 : 
                    (finalProfile && (finalProfile.ctc || finalProfile.salary || finalProfile.ctcAmount)) ? 
                    (finalProfile.ctc || finalProfile.salary || finalProfile.ctcAmount) : 0));
        
        if (ctc > 0) {
          finalProfile = {
            ...(finalProfile || {}),
            _id: (finalProfile && getSafeId(finalProfile._id)) || emp._id,
            userId: (finalProfile && getSafeId(finalProfile.userId)) || emp._id,
            employeeId: (finalProfile && finalProfile.employeeId) || emp.employeeId,
            employeeName: (finalProfile && finalProfile.employeeName) || emp.name,
            annualCTC: ctc,
            monthlyCTC: Number((emp as any).monthlyCTC || ctc / 12),
            payrollType: (emp as any).payrollType || (finalProfile && finalProfile.payrollType) || 'Monthly',
            status: (emp as any).status || (finalProfile && finalProfile.status) || 'Active',
            earnings: (finalProfile && finalProfile.earnings) || (emp as any).earnings || [],
            deductions: (finalProfile && finalProfile.deductions) || (emp as any).deductions || [],
          } as any;
        }
      }

      // If it's a virtual profile from our tertiary discovery, ensure it's matched
      if (!finalProfile && profiles.length > 0) {
        const virtualProfile = profiles.find(p => getSafeId(p._id) === `v-${eId}`);
        if (virtualProfile) finalProfile = virtualProfile;
      }

      const bankDetailsComplete = !!(emp.bankName && emp.accountNumber && emp.ifscCode && emp.pan);
      let bankStatus = bankDetailsComplete ? 'Verified' : (emp.bankName || emp.accountNumber ? 'Pending' : 'Missing');
      
      let payrollStatus = 'Not Configured';
      if (finalProfile) {
        const rawStatus = String(
          finalProfile.status || 
          finalProfile.payrollStatus || 
          (finalProfile.isActive === true || finalProfile.active === true ? 'Active' : '') || 
          (finalProfile.monthlyCTC > 0 || finalProfile.annualCTC > 0 ? 'Active' : '') ||
          'Active'
        ).toUpperCase();
        
        if (rawStatus === 'ACTIVE' || rawStatus === 'CONFIGURED' || rawStatus === 'SET' || rawStatus === 'TRUE' || rawStatus === 'COMPLETED') {
          payrollStatus = 'Active';
        } else if (rawStatus === 'INACTIVE' || rawStatus === 'DISABLED' || rawStatus === 'FALSE') {
          payrollStatus = 'Inactive';
        } else {
          payrollStatus = finalProfile.status || finalProfile.payrollStatus || 'Active';
        }
      }

      return {
        ...emp,
        profile: finalProfile,
        hasProfile: !!finalProfile,
        payrollStatus,
        bankStatus,
      };
    });

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(emp =>
        (emp.name && emp.name.toLowerCase().includes(lowerTerm)) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(lowerTerm))
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

  const formatCurrency = (amount: any): string => {
    if (amount === null || amount === undefined) return `${currencySymbol}0.00`;
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, '')) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateSalaryBreakdown = (profile: PayrollProfile): SalaryBreakdown => {
    const monthlyCTC = profile.monthlyCTC || (profile.annualCTC ? profile.annualCTC / 12 : 0);
    let grossPay = 0;
    const context: Record<string, number> = {};

    const earningsWithValues: EarningComponent[] = (profile.earnings || []).map(e => {
      let calculatedValue = 0;
      if (e.calculationType === 'Percentage') {
        let base = monthlyCTC;
        if (e.basedOn === 'Basic Salary' && context['Basic Salary']) {
          base = context['Basic Salary'];
        } else if (e.basedOn === 'Basic Salary') {
          base = monthlyCTC * 0.4;
        }
        calculatedValue = (base * e.value) / 100;
      } else {
        calculatedValue = e.value;
      }
      context[e.name] = calculatedValue;
      grossPay += calculatedValue;
      return { ...e, calculatedValue };
    });

    let totalDeductions = 0;
    const deductionsWithValues: DeductionComponent[] = (profile.deductions || []).map(d => {
      let calculatedValue = 0;
      if (d.calculationType === 'Percentage') {
        let base = monthlyCTC;
        if (d.basedOn === 'Basic Salary' && context['Basic Salary']) {
          base = context['Basic Salary'];
        } else if (d.basedOn === 'Gross') {
          base = grossPay;
        }
        calculatedValue = (base * d.value) / 100;
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
      workingDays: attendanceConfig.mode === 'CUSTOM' ? attendanceConfig.workingDays : 26,
    };
  };

  const handleViewProfile = (employee: Employee) => {
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

  const handleEditProfile = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowWizard(true);
    setCurrentStep(1);
  };

  const handleAddNewProfile = () => {
    setEditingEmployee(null);
    setShowWizard(true);
    setCurrentStep(1);
    setCtcValue('');
    setBankDetails({
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      pan: '',
      uan: '',
    });
    const template = getAppliedTemplate('employee');
    setStructure({
      name: 'Payroll Profile',
      earnings: template.earnings,
      deductions: template.deductions,
    });
    setSelectedRole('employee');
    setCtcType('annual');
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

  // Wizard Functions
  const monthlyCTC = (() => {
    const val = parseFloat(ctcValue) || 0;
    return ctcType === 'annual' ? val / 12 : val;
  })();

  const breakdown = (() => {
    let grossPay = 0;
    const context: Record<string, number> = {};

    const earningsWithValues = structure.earnings.map(e => {
      let calculatedValue = 0;
      if (e.calculationType === 'Percentage') {
        let base = monthlyCTC;
        if (e.basedOn === 'Basic Salary' && context['Basic Salary']) {
          base = context['Basic Salary'];
        } else if (e.basedOn === 'Basic Salary') {
          base = monthlyCTC * 0.4;
        }
        calculatedValue = (base * e.value) / 100;
      } else {
        calculatedValue = e.value;
      }
      context[e.name] = calculatedValue;
      grossPay += calculatedValue;
      return { ...e, calculatedValue };
    });

    let totalDeductions = 0;
    const deductionsWithValues = structure.deductions.map(d => {
      let calculatedValue = 0;
      if (d.calculationType === 'Percentage') {
        let base = monthlyCTC;
        if (d.basedOn === 'Basic Salary' && context['Basic Salary']) {
          base = context['Basic Salary'];
        } else if (d.basedOn === 'Gross') {
          base = grossPay;
        }
        calculatedValue = (base * d.value) / 100;
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
      workingDays: attendanceConfig.mode === 'CUSTOM' ? attendanceConfig.workingDays : 26,
    };
  })();

  const isBankComplete = (() => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return (
      bankDetails.bankName.length > 2 &&
      bankDetails.accountNumber.length >= 8 &&
      ifscRegex.test(bankDetails.ifscCode) &&
      panRegex.test(bankDetails.pan)
    );
  })();

  const handleApplyTemplate = (role: string) => {
    setSelectedRole(role);
    const synced = getAppliedTemplate(role);
    setStructure({
      ...structure,
      earnings: synced.earnings,
      deductions: synced.deductions,
    });
  };

  const handleToggleCtcType = (newType: 'annual' | 'monthly') => {
    if (newType === ctcType) return;
    const val = parseFloat(ctcValue) || 0;
    if (val > 0) {
      if (newType === 'annual') {
        setCtcValue((val * 12).toFixed(2));
      } else {
        setCtcValue((val / 12).toFixed(2));
      }
    }
    setCtcType(newType);
  };

  const updateComponent = (type: 'earnings' | 'deductions', index: number, field: string, value: any) => {
    const updated = [...structure[type]];
    let newValue = value;

    if (field === 'value') {
      const numVal = parseFloat(value);
      if (numVal < 0) newValue = '0';
      if (updated[index].calculationType === 'Percentage' && numVal > 100) {
        newValue = '100';
      }
    }

    updated[index][field] = newValue;
    setStructure({ ...structure, [type]: updated });
  };

  const addComponent = (type: 'earnings' | 'deductions') => {
    const newComp = { name: '', value: 0, calculationType: 'Fixed', basedOn: 'CTC' };
    setStructure({ ...structure, [type]: [...structure[type], newComp] });
  };

  const removeComponent = (type: 'earnings' | 'deductions', index: number) => {
    const updated = [...structure[type]];
    updated.splice(index, 1);
    setStructure({ ...structure, [type]: updated });
  };

  const handleNext = () => {
    setWizardError(null);
    if (currentStep === 1) {
      if (structure.earnings.length === 0) {
        Alert.alert('Error', 'At least 1 earning component is required');
        return;
      }
      if (!editingEmployee && !ctcValue) {
        Alert.alert('Error', 'Please select an employee and enter CTC');
        return;
      }
      if (!ctcValue || parseFloat(ctcValue) <= 0) {
        Alert.alert('Error', 'Please enter a valid CTC');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (bankDetails.bankName.length <= 2) {
        Alert.alert('Error', 'Bank name must be at least 3 characters');
        return;
      }
      if (bankDetails.accountNumber.length < 8) {
        Alert.alert('Error', 'Account number must be at least 8 digits');
        return;
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(bankDetails.ifscCode)) {
        Alert.alert('Error', 'Invalid IFSC Code format (e.g., HDFC0001234)');
        return;
      }
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(bankDetails.pan)) {
        Alert.alert('Error', 'Invalid PAN Card format (e.g., ABCDE1234F)');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!editingEmployee) {
        Alert.alert('Error', 'Please select an employee first');
        setCurrentStep(1);
        return;
      }
      handleFinalSubmit();
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    setWizardError(null);
    
    // 1. Get Organization Context
    const currentAuth = useAuthStore.getState();
    const orgId = currentAuth.user?.organizationId;
    
    // 2. Parse CTC
    const cleanValue = ctcValue.replace(/[^0-9.]/g, '');
    const annualCTC = ctcType === 'annual' ? parseFloat(cleanValue) : parseFloat(cleanValue) * 12;
    const monthlyCTC = annualCTC / 12;

    // 3. Sanitizer for salary components
    const mapComponent = (comp: any) => ({
      name: String(comp.name || 'Unnamed Component'),
      value: Number(comp.value) || 0,
      calculationType: ['Fixed', 'Percentage', 'Formula'].includes(comp.calculationType) ? comp.calculationType : 'Fixed',
      basedOn: comp.basedOn || 'CTC',
      formula: comp.formula || null,
      organizationId: orgId // Include orgId in each component for backend validation
    });

    const cleanedDeductions = structure.deductions.filter(d => {
      const name = (d.name || '').toLowerCase();
      const isPF = name.includes('provident fund') || name === 'pf';
      const isESI = name.includes('esi') || name.includes('state insurance');
      const isPT = name.includes('professional tax') || name === 'pt';
      const isStatutoryCandidate = (isPF && globalPolicy?.statutory?.pf?.enabled) ||
        (isESI && globalPolicy?.statutory?.esi?.enabled) ||
        (isPT && globalPolicy?.statutory?.pt?.enabled);
      return !isStatutoryCandidate;
    });

    try {
      // 4. Resolve Target User ID
      const rawId = editingEmployee?._id || editingEmployee?.id || (editingEmployee as any).user?._id || (editingEmployee as any).user?.id;
      let targetUserId = getSafeId(rawId);
      
      // Validation: Ensure it's a valid 24-character hex string (standard MongoDB ID)
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(targetUserId);
      if (!isValidObjectId) {
        throw new Error(`The Employee ID (${targetUserId}) is not a valid format. Please contact support or try re-syncing the employee list.`);
      }

      // 5. Construct Payload (Strict Enterprise Schema)
      const payload: any = {
        user: targetUserId,
        userId: targetUserId,
        organizationId: orgId,
        employeeId: editingEmployee?.employeeId,
        employeeName: editingEmployee?.name,
        payrollType: 'Monthly',
        employeeType: (editingEmployee as any).employeeType || 'Permanent',
        salaryMode: 'Employee-Based',
        annualCTC: Number(annualCTC.toFixed(2)),
        monthlyCTC: Number(monthlyCTC.toFixed(2)),
        earnings: (structure.earnings || []).map(mapComponent),
        deductions: (cleanedDeductions || []).map(mapComponent),
        bankDetails: {
          bankName: String(bankDetails.bankName || '').trim(),
          accountNumber: String(bankDetails.accountNumber || '').trim(),
          ifscCode: String(bankDetails.ifscCode || '').trim().toUpperCase(),
          pan: String(bankDetails.pan || '').trim().toUpperCase(),
          uan: String(bankDetails.uan || '').trim()
        },
        status: 'Active',
        isActive: true,
        lastUpdatedAt: new Date().toISOString()
      };

      console.log('--- ENTERPRISE PAYROLL SAVE ---');
      console.log('Target User:', targetUserId);
      console.log('Payload:', JSON.stringify(payload));

      // Use the setup endpoint which handles both creation and updates on the backend
      await payrollAPI.setupFullProfile(payload, { timeout: 45000 } as any);
      
      Alert.alert('Success', 'Payroll profile saved successfully!');
      setShowWizard(false);
      setEditingEmployee(null);
      loadInitialData();
    } catch (err: any) {
      console.error('CRITICAL SAVE ERROR:', err);
      // Detailed diagnostics for the user
      const serverMsg = err.message || 'An unexpected error occurred (500). Please ensure all mandatory fields are filled and try again.';
      Alert.alert('Save Failed', serverMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const getKPIs = () => {
    const totalEmployees = employees.length;
    // Calculate based on the full list of employees if possible
    const sourceList = filteredEmployees.length > 0 ? filteredEmployees : employees;
    const configuredProfiles = sourceList.filter(e => {
      // If we haven't run filterEmployees yet, we check if they have a profile attached or in the standalone list
      if ((e as any).hasProfile) return true;
      if ((e as any).profile) return true;
      
      // Standalone list check
      const eId = getSafeId(e._id).toLowerCase();
      const eEmpId = String((e as any).employeeId || '').toLowerCase();
      return profiles.some(p => {
        const pUserId = getSafeId(p.userId || (p.user && (getSafeId(p.user._id || p.user.id)))).toLowerCase();
        const pEmpId = String(p.employeeId || p.empId || (p.user && p.user.employeeId) || '').toLowerCase();
        return (eId && pUserId && eId === pUserId) || (eEmpId && pEmpId && eEmpId === pEmpId);
      });
    }).length;

    const pendingSetup = totalEmployees - configuredProfiles;
    const criticalErrors = sourceList.filter(e => (e as any).payrollStatus === 'Warning' || (e as any).bankStatus === 'Missing').length;

    return [
      { label: 'Total Employees', value: totalEmployees, icon: Users, color: COLORS.blue, bg: COLORS.blueLight },
      { label: 'Configured Profiles', value: configuredProfiles, icon: CheckCircle, color: COLORS.emerald, bg: COLORS.greenLight },
      { label: 'Pending Setup', value: Math.max(0, pendingSetup), icon: AlertCircle, color: COLORS.amber, bg: COLORS.yellowLight },
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

  // Render List View
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
            <View style={styles.tableHeader}>
              <View style={[styles.tableCell, styles.cellEmployee]}><Text style={styles.headerText}>Employee</Text></View>
              <View style={[styles.tableCell, styles.cellRole]}><Text style={styles.headerText}>Role / Designation</Text></View>
              <View style={[styles.tableCell, styles.cellCTC]}><Text style={[styles.headerText, styles.textRight]}>Defined CTC</Text></View>
              <View style={[styles.tableCell, styles.cellStatus]}><Text style={[styles.headerText, styles.textCenter]}>Payroll Status</Text></View>
              <View style={[styles.tableCell, styles.cellStatus]}><Text style={[styles.headerText, styles.textCenter]}>Bank Status</Text></View>
              <View style={[styles.tableCell, styles.cellActions]}><Text style={[styles.headerText, styles.textRight]}>Actions</Text></View>
            </View>

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
                      {emp.profile 
                        ? formatCurrency(emp.profile.monthlyCTC || (emp.profile.annualCTC ? emp.profile.annualCTC / 12 : 0) || (emp.profile.ctc ? emp.profile.ctc / 12 : 0) || (emp.profile.salary ? emp.profile.salary / 12 : 0) || (emp.profile.ctcAmount ? emp.profile.ctcAmount / 12 : 0) || (emp.profile.totalSalary ? emp.profile.totalSalary / 12 : 0)) 
                        : '—'}
                    </Text>
                    {emp.profile && (
                      <Text style={styles.payrollType}>
                        {emp.profile.annualCTC || emp.profile.ctc || emp.profile.salary || emp.profile.ctcAmount || emp.profile.totalSalary
                          ? `${formatCurrency(emp.profile.annualCTC || emp.profile.ctc || emp.profile.salary || emp.profile.ctcAmount || emp.profile.totalSalary)} /yr` 
                          : emp.profile.payrollType || 'Monthly'}
                      </Text>
                    )}
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

              <View style={styles.ctcCard}>
                <Text style={styles.ctcCardLabel}>Annual Package (CTC)</Text>
                <Text style={styles.ctcCardValue}>
                  {formatCurrency(profile.annualCTC || profile.monthlyCTC * 12)}
                </Text>
              </View>

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

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Landmark size={16} color={COLORS.indigo} />
                  <Text style={styles.sectionTitle}>Compliance Details</Text>
                </View>

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

  // Render Wizard
  const renderWizard = () => (
    <Modal
      visible={showWizard}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowWizard(false)}
    >
      {/* Employee Picker Modal */}
      <DropdownModal
        visible={showEmployeePicker}
        onClose={() => setShowEmployeePicker(false)}
        title="Select Employee"
        options={employees
          .filter(emp => !emp.hasProfile)
          .map(emp => ({ label: `${emp.name} (${emp.employeeId})`, value: emp._id }))}
        selectedValue={editingEmployee?._id || ''}
        onSelect={(val) => {
          const emp = employees.find(e => e._id === val);
          if (emp) {
            setEditingEmployee(emp);
            loadEmployeeDataForWizard();
          }
          setShowEmployeePicker(false);
        }}
      />

      <SafeAreaView style={styles.wizardContainer}>
        <View style={styles.wizardHeader}>
          <TouchableOpacity onPress={() => setShowWizard(false)} style={styles.wizardBackButton}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.wizardTitle}>
            {editingEmployee ? `Edit Profile: ${editingEmployee.name}` : 'Create Payroll Profile'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.wizardSteps}>
          <View style={[styles.wizardStep, currentStep === 1 && styles.wizardStepActive]}>
            <View style={[styles.wizardStepCircle, currentStep === 1 && styles.wizardStepCircleActive]}>
              <Text style={[styles.wizardStepNumber, currentStep === 1 && styles.wizardStepNumberActive]}>1</Text>
            </View>
            <Text style={[styles.wizardStepLabel, currentStep === 1 && styles.wizardStepLabelActive]}>Salary</Text>
          </View>
          <View style={styles.wizardStepLine} />
          <View style={[styles.wizardStep, currentStep === 2 && styles.wizardStepActive]}>
            <View style={[styles.wizardStepCircle, currentStep === 2 && styles.wizardStepCircleActive]}>
              <Text style={[styles.wizardStepNumber, currentStep === 2 && styles.wizardStepNumberActive]}>2</Text>
            </View>
            <Text style={[styles.wizardStepLabel, currentStep === 2 && styles.wizardStepLabelActive]}>Bank</Text>
          </View>
          <View style={styles.wizardStepLine} />
          <View style={[styles.wizardStep, currentStep === 3 && styles.wizardStepActive]}>
            <View style={[styles.wizardStepCircle, currentStep === 3 && styles.wizardStepCircleActive]}>
              <Text style={[styles.wizardStepNumber, currentStep === 3 && styles.wizardStepNumberActive]}>3</Text>
            </View>
            <Text style={[styles.wizardStepLabel, currentStep === 3 && styles.wizardStepLabelActive]}>Review</Text>
          </View>
        </View>

        <ScrollView style={styles.wizardContent} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && (
            <View>
              <Text style={styles.wizardSectionTitle}>Select Employee</Text>
              {!editingEmployee && (
                <TouchableOpacity 
                  style={styles.wizardEmployeeSelector}
                  onPress={() => setShowEmployeePicker(true)}
                >
                  <Text style={styles.wizardEmployeeSelectorText}>Select Employee</Text>
                  <ChevronDown size={20} color={COLORS.gray} />
                </TouchableOpacity>
              )}
              {editingEmployee && (
                <View style={styles.wizardSelectedEmployee}>
                  <View style={styles.wizardEmployeeAvatar}>
                    <Text>{editingEmployee.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.wizardEmployeeName}>{editingEmployee.name}</Text>
                    <Text style={styles.wizardEmployeeId}>ID: {editingEmployee.employeeId}</Text>
                  </View>
                </View>
              )}

              <Text style={styles.wizardSectionTitle}>Role Template</Text>
              <View style={styles.wizardRoleButtons}>
                {['intern', 'employee', 'manager'].map(role => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => handleApplyTemplate(role)}
                    style={[styles.wizardRoleButton, selectedRole === role && styles.wizardRoleButtonActive]}
                  >
                    <Text style={[styles.wizardRoleText, selectedRole === role && styles.wizardRoleTextActive]}>
                      {role.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.wizardSectionTitle}>CTC</Text>
              <View style={styles.wizardCtcHeader}>
                <Text style={styles.wizardCtcLabel}>CTC ({ctcType.toUpperCase()})</Text>
                <View style={styles.wizardCtcTypeButtons}>
                  <TouchableOpacity
                    onPress={() => handleToggleCtcType('annual')}
                    style={[styles.wizardCtcTypeButton, ctcType === 'annual' && styles.wizardCtcTypeButtonActive]}
                  >
                    <Text style={[styles.wizardCtcTypeText, ctcType === 'annual' && styles.wizardCtcTypeTextActive]}>Year</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleToggleCtcType('monthly')}
                    style={[styles.wizardCtcTypeButton, ctcType === 'monthly' && styles.wizardCtcTypeButtonActive]}
                  >
                    <Text style={[styles.wizardCtcTypeText, ctcType === 'monthly' && styles.wizardCtcTypeTextActive]}>Month</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.wizardCurrencyInput}>
                <Text style={styles.wizardCurrencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.wizardCtcInput}
                  value={ctcValue}
                  onChangeText={setCtcValue}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <Text style={styles.wizardSectionTitle}>Earnings</Text>
              <View style={styles.wizardComponentsHeader}>
                <Text style={styles.wizardComponentsTitle}>Earnings (Payable)</Text>
                <TouchableOpacity onPress={() => addComponent('earnings')} style={styles.wizardAddButton}>
                  <Plus size={16} color={COLORS.indigo} />
                </TouchableOpacity>
              </View>
              {structure.earnings.filter(e => !e.hidden).map((e, idx) => (
                <View key={idx} style={styles.wizardComponentRow}>
                  <TextInput
                    style={styles.wizardComponentNameInput}
                    value={e.name}
                    onChangeText={(val) => updateComponent('earnings', idx, 'name', val)}
                    placeholder="Component Name"
                    placeholderTextColor={COLORS.gray}
                  />
                  <View style={styles.wizardComponentTypeButtons}>
                    <TouchableOpacity
                      onPress={() => updateComponent('earnings', idx, 'calculationType', 'Fixed')}
                      style={[styles.wizardCompTypeButton, e.calculationType === 'Fixed' && styles.wizardCompTypeButtonActive]}
                    >
                      <Text style={[styles.wizardCompTypeText, e.calculationType === 'Fixed' && styles.wizardCompTypeTextActive]}>Fix</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateComponent('earnings', idx, 'calculationType', 'Percentage')}
                      style={[styles.wizardCompTypeButton, e.calculationType === 'Percentage' && styles.wizardCompTypeButtonActive]}
                    >
                      <Text style={[styles.wizardCompTypeText, e.calculationType === 'Percentage' && styles.wizardCompTypeTextActive]}>%</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.wizardComponentValueContainer}>
                    <TextInput
                      style={styles.wizardComponentValueInput}
                      value={String(e.value)}
                      onChangeText={(val) => updateComponent('earnings', idx, 'value', val)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Text style={styles.wizardComponentValueSymbol}>
                      {e.calculationType === 'Fixed' ? currencySymbol : '%'}
                    </Text>
                  </View>
                  <Text style={styles.wizardComponentCalculated}>
                    {formatCurrency(breakdown.earnings.find(item => item.name === e.name)?.calculatedValue || 0)}
                  </Text>
                  <TouchableOpacity onPress={() => removeComponent('earnings', idx)} style={styles.wizardRemoveButton}>
                    <Trash2 size={16} color={COLORS.rose} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.wizardTotalCard}>
                <Text style={styles.wizardTotalLabel}>Total Gross Pay</Text>
                <Text style={styles.wizardTotalValue}>{formatCurrency(breakdown.grossPay)}</Text>
              </View>

              <Text style={styles.wizardSectionTitle}>Deductions</Text>
              <View style={styles.wizardComponentsHeader}>
                <Text style={styles.wizardComponentsTitle}>Deductions (Subtractions)</Text>
                <TouchableOpacity onPress={() => addComponent('deductions')} style={styles.wizardAddButton}>
                  <Plus size={16} color={COLORS.indigo} />
                </TouchableOpacity>
              </View>
              {structure.deductions.filter(d => !d.hidden).map((d, idx) => (
                <View key={idx} style={styles.wizardComponentRow}>
                  <TextInput
                    style={styles.wizardComponentNameInput}
                    value={d.name}
                    onChangeText={(val) => updateComponent('deductions', idx, 'name', val)}
                    placeholder="Component Name"
                    placeholderTextColor={COLORS.gray}
                  />
                  <View style={styles.wizardComponentTypeButtons}>
                    <TouchableOpacity
                      onPress={() => updateComponent('deductions', idx, 'calculationType', 'Fixed')}
                      style={[styles.wizardCompTypeButton, d.calculationType === 'Fixed' && styles.wizardCompTypeButtonActive]}
                    >
                      <Text style={[styles.wizardCompTypeText, d.calculationType === 'Fixed' && styles.wizardCompTypeTextActive]}>Fix</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => updateComponent('deductions', idx, 'calculationType', 'Percentage')}
                      style={[styles.wizardCompTypeButton, d.calculationType === 'Percentage' && styles.wizardCompTypeButtonActive]}
                    >
                      <Text style={[styles.wizardCompTypeText, d.calculationType === 'Percentage' && styles.wizardCompTypeTextActive]}>%</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.wizardComponentValueContainer}>
                    <TextInput
                      style={styles.wizardComponentValueInput}
                      value={String(d.value)}
                      onChangeText={(val) => updateComponent('deductions', idx, 'value', val)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <Text style={styles.wizardComponentValueSymbol}>
                      {d.calculationType === 'Fixed' ? currencySymbol : '%'}
                    </Text>
                  </View>
                  <Text style={[styles.wizardComponentCalculated, { color: COLORS.rose }]}>
                    -{formatCurrency(breakdown.deductions.find(item => item.name === d.name)?.calculatedValue || 0)}
                  </Text>
                  <TouchableOpacity onPress={() => removeComponent('deductions', idx)} style={styles.wizardRemoveButton}>
                    <Trash2 size={16} color={COLORS.rose} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={[styles.wizardTotalCard, { backgroundColor: COLORS.redLight }]}>
                <Text style={styles.wizardTotalLabel}>Total Deductions</Text>
                <Text style={[styles.wizardTotalValue, { color: COLORS.rose }]}>-{formatCurrency(breakdown.totalDeductions)}</Text>
              </View>
            </View>
          )}

          {currentStep === 2 && (
            <View>
              <Text style={styles.wizardSectionTitle}>Bank Details</Text>
              <View style={styles.wizardInputGroup}>
                <Text style={styles.wizardInputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.wizardTextInput}
                  value={bankDetails.bankName}
                  onChangeText={(val) => setBankDetails({ ...bankDetails, bankName: val })}
                  placeholder="e.g. HDFC Bank"
                  placeholderTextColor={COLORS.gray}
                />
              </View>
              <View style={styles.wizardRowInputs}>
                <View style={[styles.wizardInputGroup, { flex: 1 }]}>
                  <Text style={styles.wizardInputLabel}>Account Number</Text>
                  <TextInput
                    style={styles.wizardTextInput}
                    value={bankDetails.accountNumber}
                    onChangeText={(val) => setBankDetails({ ...bankDetails, accountNumber: val.replace(/[^0-9]/g, '') })}
                    placeholder="0000 0000 0000"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={[styles.wizardInputGroup, { flex: 1 }]}>
                  <Text style={styles.wizardInputLabel}>IFSC Code</Text>
                  <TextInput
                    style={[styles.wizardTextInput, bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode) && styles.wizardInputError]}
                    value={bankDetails.ifscCode}
                    onChangeText={(val) => setBankDetails({ ...bankDetails, ifscCode: val.toUpperCase().trim() })}
                    placeholder="HDFC0001234"
                    autoCapitalize="characters"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <Text style={styles.wizardSectionTitle}>Tax Identity</Text>
              <View style={styles.wizardInputGroup}>
                <Text style={styles.wizardInputLabel}>PAN Card Number</Text>
                <TextInput
                  style={[styles.wizardTextInput, bankDetails.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(bankDetails.pan) && styles.wizardInputError]}
                  value={bankDetails.pan}
                  onChangeText={(val) => setBankDetails({ ...bankDetails, pan: val.toUpperCase().trim() })}
                  placeholder="ABCDE1234F"
                  autoCapitalize="characters"
                  placeholderTextColor={COLORS.gray}
                />
              </View>
              <View style={styles.wizardInputGroup}>
                <Text style={styles.wizardInputLabel}>Universal Account Number (UAN)</Text>
                <TextInput
                  style={styles.wizardTextInput}
                  value={bankDetails.uan}
                  onChangeText={(val) => setBankDetails({ ...bankDetails, uan: val.replace(/[^0-9]/g, '') })}
                  placeholder="1000 0000 0000"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <Text style={styles.wizardSectionTitle}>Compliance Overrides</Text>
              <View style={styles.wizardComplianceCard}>
                {['pf', 'esi', 'pt'].map(item => {
                  const config = statutoryConfig[item as keyof StatutoryConfig];
                  const label = item === 'pf' ? 'Provident Fund' : item === 'esi' ? 'ESI Coverage' : 'Professional Tax';
                  return (
                    <View key={item} style={styles.wizardComplianceRow}>
                      <View style={styles.wizardComplianceInfo}>
                        <Shield size={16} color={COLORS.indigo} />
                        <Text style={styles.wizardComplianceLabel}>{label}</Text>
                      </View>
                      <View style={styles.wizardComplianceModeButtons}>
                        {['default', 'enabled', 'disabled'].map(mode => (
                          <TouchableOpacity
                            key={mode}
                            onPress={() => setStatutoryConfig(prev => ({
                              ...prev,
                              [item]: { mode, enabled: mode !== 'disabled' }
                            }))}
                            style={[styles.wizardModeButton, config.mode === mode && styles.wizardModeButtonActive]}
                          >
                            <Text style={[styles.wizardModeText, config.mode === mode && styles.wizardModeTextActive]}>
                              {mode === 'default' ? 'Policy' : mode}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.wizardSectionTitle}>Attendance Policy</Text>
              <View style={styles.wizardAttendanceCard}>
                <View style={styles.wizardComplianceRow}>
                  <Text style={styles.wizardComplianceLabel}>Calculation Mode</Text>
                  <View style={styles.wizardComplianceModeButtons}>
                    {['POLICY_DEFAULT', 'CUSTOM'].map(mode => (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => setAttendanceConfig({ ...attendanceConfig, mode })}
                        style={[styles.wizardModeButton, attendanceConfig.mode === mode && styles.wizardModeButtonActive]}
                      >
                        <Text style={[styles.wizardModeText, attendanceConfig.mode === mode && styles.wizardModeTextActive]}>
                          {mode === 'POLICY_DEFAULT' ? 'Policy' : 'Custom'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {attendanceConfig.mode === 'CUSTOM' && (
                  <View style={styles.wizardInputGroup}>
                    <Text style={styles.wizardInputLabel}>Working Days Per Month</Text>
                    <View style={styles.wizardWorkingDaysInput}>
                      <TextInput
                        style={styles.wizardWorkingDaysField}
                        value={String(attendanceConfig.workingDays)}
                        onChangeText={(val) => setAttendanceConfig({ ...attendanceConfig, workingDays: parseInt(val) || 0 })}
                        keyboardType="numeric"
                      />
                      <Text style={styles.wizardWorkingDaysLabel}>Days</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View>
              <View style={styles.wizardReviewHeader}>
                <Text style={styles.wizardReviewTitle}>Final Review</Text>
                <Text style={styles.wizardReviewSubtitle}>Overall Profile Summary</Text>
              </View>

              <View style={styles.wizardReviewCard}>
                <View style={styles.wizardReviewSectionHeader}>
                  <Users size={20} color={COLORS.indigo} />
                  <Text style={styles.wizardReviewSectionTitle}>Employee Information</Text>
                </View>
                <View style={styles.wizardReviewRow}>
                  <Text style={styles.wizardReviewLabel}>Name</Text>
                  <Text style={styles.wizardReviewValue}>{editingEmployee?.name || '—'}</Text>
                </View>
                <View style={styles.wizardReviewRow}>
                  <Text style={styles.wizardReviewLabel}>Employee ID</Text>
                  <Text style={styles.wizardReviewValue}>{editingEmployee?.employeeId || '—'}</Text>
                </View>
                <View style={styles.wizardReviewRow}>
                  <Text style={styles.wizardReviewLabel}>Annual CTC</Text>
                  <Text style={[styles.wizardReviewValue, { color: COLORS.emerald }]}>
                    {formatCurrency(ctcType === 'annual' ? parseFloat(ctcValue) : parseFloat(ctcValue) * 12)}
                  </Text>
                </View>
              </View>

              <View style={styles.wizardReviewCard}>
                <View style={styles.wizardReviewSectionHeader}>
                  <Landmark size={20} color={COLORS.slate} />
                  <Text style={styles.wizardReviewSectionTitle}>Bank & Identity</Text>
                </View>
                <View style={styles.wizardReviewRow}>
                  <Text style={styles.wizardReviewLabel}>Bank</Text>
                  <Text style={styles.wizardReviewValue}>{bankDetails.bankName || '—'}</Text>
                </View>
                <View style={styles.wizardReviewRow}>
                  <Text style={styles.wizardReviewLabel}>IFSC</Text>
                  <Text style={styles.wizardReviewValue}>{bankDetails.ifscCode || '—'}</Text>
                </View>
                <View style={styles.wizardReviewRow}>
                  <Text style={styles.wizardReviewLabel}>PAN</Text>
                  <Text style={styles.wizardReviewValue}>{bankDetails.pan || '—'}</Text>
                </View>
              </View>

              <View style={styles.wizardSalarySummaryCard}>
                <Text style={styles.wizardSalarySummaryTitle}>Monthly Take-Home Estimate</Text>
                <Text style={styles.wizardSalarySummaryValue}>{formatCurrency(breakdown.netSalary)}</Text>

                <View style={styles.wizardSalarySummarySection}>
                  <Text style={styles.wizardSalarySectionTitle}>Earnings</Text>
                  {breakdown.earnings.filter(e => !e.hidden).map((e, idx) => (
                    <View key={idx} style={styles.wizardSalaryRow}>
                      <Text style={styles.wizardSalaryLabel}>{e.name}</Text>
                      <Text style={styles.wizardSalaryAmount}>{formatCurrency(e.calculatedValue || 0)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.wizardSalaryDivider} />

                <View style={styles.wizardSalarySummarySection}>
                  <Text style={styles.wizardSalarySectionTitle}>Deductions</Text>
                  {breakdown.deductions.filter(d => !d.hidden).map((d, idx) => (
                    <View key={idx} style={styles.wizardSalaryRow}>
                      <Text style={styles.wizardSalaryLabel}>{d.name}</Text>
                      <Text style={[styles.wizardSalaryAmount, { color: COLORS.rose }]}>
                        -{formatCurrency(d.calculatedValue || 0)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.wizardSalaryDivider} />

                <View style={styles.wizardSalaryTotalRow}>
                  <View>
                    <Text style={styles.wizardSalaryTotalLabel}>Monthly Gross</Text>
                    <Text style={styles.wizardSalaryTotalValue}>{formatCurrency(breakdown.grossPay)}</Text>
                  </View>
                  <View style={styles.wizardSalaryTotalRight}>
                    <Text style={styles.wizardSalaryTotalLabel}>Monthly Ded.</Text>
                    <Text style={[styles.wizardSalaryTotalValue, { color: COLORS.rose }]}>
                      -{formatCurrency(breakdown.totalDeductions)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.wizardFooter}>
          {currentStep > 1 && (
            <TouchableOpacity onPress={handlePrevious} style={styles.wizardPrevButton}>
              <ArrowLeft size={18} color={COLORS.textSecondary} />
              <Text style={styles.wizardPrevButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={isSaving}
            style={[styles.wizardNextButton, isSaving && styles.wizardNextButtonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.wizardNextButtonText}>
                  {currentStep === 3 ? 'Save Profile' : currentStep === 2 ? 'Review Summary' : 'Bank & Compliance'}
                </Text>
                <ArrowRight size={18} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

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
      
      <CommonHeader title="Payroll Profiles" showBackButton={true} />

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
        {/* Add New Profile Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddNewProfile}>
          <Plus size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Create New Profile</Text>
        </TouchableOpacity>

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
      {renderWizard()}
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

      <CommonFooter />
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.indigo,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
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
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.filterBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  dropdownValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.alternateRow,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: COLORS.alternateRow,
  },
  tableCell: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cellEmployee: { width: 200, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cellRole: { width: 180 },
  cellCTC: { width: 140 },
  cellStatus: { width: 150 },
  cellActions: { width: 120 },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.indigoLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.indigo,
  },
  avatarText: {
    color: COLORS.indigo,
    fontWeight: 'bold',
    fontSize: 14,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  employeeId: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deptText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ctcText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  payrollType: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 2,
    fontStyle: 'italic',
  },
  centerContent: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 20,
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
  pageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },

  // Profile View Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
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
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  profileBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  profileDesignation: {
    fontSize: 12,
    color: COLORS.indigo,
    fontWeight: '600',
  },
  profileDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
  },
  profileDepartment: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  profileId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ctcCard: {
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctcCardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  ctcCardValue: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sectionRowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  sectionTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  sectionTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.indigo,
  },
  complianceCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  complianceDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.indigo,
  },
  complianceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  complianceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  complianceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  netSalaryCard: {
    backgroundColor: COLORS.greenLight,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  netSalaryLabel: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  netSalaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  netSalarySub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  closeModalButton: {
    backgroundColor: COLORS.indigo,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Wizard Styles
  wizardContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wizardBackButton: {
    padding: 8,
  },
  wizardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wizardSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.background,
  },
  wizardStep: {
    alignItems: 'center',
    gap: 4,
  },
  wizardStepActive: {
    opacity: 1,
  },
  wizardStepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStepCircleActive: {
    backgroundColor: COLORS.indigo,
  },
  wizardStepNumber: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  wizardStepNumberActive: {
    color: COLORS.white,
  },
  wizardStepLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  wizardStepLabelActive: {
    color: COLORS.indigo,
  },
  wizardStepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 12,
    marginTop: -14,
  },
  wizardContent: {
    flex: 1,
    padding: 20,
  },
  wizardSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wizardEmployeeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wizardEmployeeSelectorText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  wizardSelectedEmployee: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.indigoLight,
    borderRadius: 12,
    gap: 12,
  },
  wizardEmployeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardEmployeeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.indigo,
  },
  wizardEmployeeId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  wizardRoleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  wizardRoleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  wizardRoleButtonActive: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  wizardRoleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  wizardRoleTextActive: {
    color: COLORS.white,
  },
  wizardCtcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wizardCtcLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  wizardCtcTypeButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 2,
  },
  wizardCtcTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  wizardCtcTypeButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wizardCtcTypeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  wizardCtcTypeTextActive: {
    color: COLORS.indigo,
  },
  wizardCurrencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wizardCurrencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginRight: 12,
  },
  wizardCtcInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wizardComponentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wizardComponentsTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  wizardAddButton: {
    padding: 4,
  },
  wizardComponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 10,
  },
  wizardComponentNameInput: {
    flex: 2,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  wizardComponentTypeButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wizardCompTypeButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wizardCompTypeButtonActive: {
    backgroundColor: COLORS.indigo,
  },
  wizardCompTypeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  wizardCompTypeTextActive: {
    color: COLORS.white,
  },
  wizardComponentValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wizardComponentValueInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
    paddingVertical: 4,
  },
  wizardComponentValueSymbol: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  wizardComponentCalculated: {
    flex: 1.5,
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.indigo,
    textAlign: 'right',
  },
  wizardRemoveButton: {
    padding: 4,
  },
  wizardTotalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.indigoLight,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  wizardTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wizardTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.indigo,
  },
  wizardInputGroup: {
    marginBottom: 16,
  },
  wizardInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  wizardTextInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  wizardInputError: {
    borderColor: COLORS.error,
  },
  wizardRowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  wizardComplianceCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  wizardComplianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wizardComplianceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wizardComplianceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  wizardComplianceModeButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wizardModeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  wizardModeButtonActive: {
    backgroundColor: COLORS.indigo,
  },
  wizardModeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  wizardModeTextActive: {
    color: COLORS.white,
  },
  wizardAttendanceCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
  },
  wizardWorkingDaysInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 100,
  },
  wizardWorkingDaysField: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  wizardWorkingDaysLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  wizardReviewHeader: {
    marginBottom: 20,
  },
  wizardReviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wizardReviewSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  wizardReviewCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  wizardReviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  wizardReviewSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wizardReviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  wizardReviewLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  wizardReviewValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wizardSalarySummaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  wizardSalarySummaryTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  wizardSalarySummaryValue: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  wizardSalarySummarySection: {
    gap: 10,
  },
  wizardSalarySectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  wizardSalaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wizardSalaryLabel: {
    color: COLORS.white,
    fontSize: 13,
  },
  wizardSalaryAmount: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  wizardSalaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  wizardSalaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wizardSalaryTotalLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  wizardSalaryTotalValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  wizardSalaryTotalRight: {
    alignItems: 'flex-end',
  },
  wizardFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  wizardPrevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  wizardPrevButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  wizardNextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.indigo,
    gap: 8,
  },
  wizardNextButtonDisabled: {
    opacity: 0.7,
  },
  wizardNextButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },

  // Confirm Modal Styles
  confirmModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelConfirmText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});
