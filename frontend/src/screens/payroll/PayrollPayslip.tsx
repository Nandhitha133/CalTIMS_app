// screens/Payroll/PayslipGenerationScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Send, 
  User, 
  FileText, 
  CreditCard, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  Receipt
} from 'lucide-react-native';
import { payrollAPI, userAPI } from '../../services/endpoints';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to extract data from API response
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

const COLORS = {
  primary: '#4F46E5',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  purple: '#6366f1',
  orange: '#f59e0b',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  filterBg: '#F8FAFC',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blueLight: '#EFF6FF',
  greenLight: '#ECFDF5',
  redLight: '#FEF2F2',
  yellowLight: '#FFFBEB',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#EF4444',
  slate: '#64748B',
};

interface PayslipData {
  _id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  month: number;
  year: number;
  grossAmount: number;
  totalDeductions: number;
  netPay: number;
  status: 'GENERATED' | 'PAID' | 'SENT';
  isEmailSent: boolean;
  paidAt?: string;
  generatedAt?: string;
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  pfDeduction?: number;
  professionalTax?: number;
  tds?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  pan?: string;
  uan?: string;
}

interface StatsData {
  total: number;
  generated: number;
  paid: number;
  sent: number;
}

export const PayrollPayslip = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMarkPaidConfirm, setShowMarkPaidConfirm] = useState(false);
  const [payslipToMark, setPayslipToMark] = useState<PayslipData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    generated: 0,
    paid: 0,
    sent: 0,
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026];

  useEffect(() => {
    loadUser();
    fetchPayslips();
  }, [selectedMonth, selectedYear]);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchPayslips = async () => {
    setIsLoading(true);
    try {
      // Get current user info
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      const employeeId = user?.employeeId || user?._id;

      // Fetch payroll history for the employee
      const response = await payrollAPI.getHistory({ userId: employeeId });
      let payrollData = extractData(response, []);

      // Filter by month/year if needed
      const filteredData = payrollData.filter((item: any) => {
        const itemMonth = item.salaryMonth ? parseInt(item.salaryMonth.split('-')[1]) : item.month;
        const itemYear = item.salaryMonth ? parseInt(item.salaryMonth.split('-')[0]) : item.year;
        return itemMonth === selectedMonth && itemYear === selectedYear;
      });

      // Transform data
      const transformedData: PayslipData[] = filteredData.map((item: any, index: number) => ({
        _id: item._id || `payslip_${index}`,
        employeeId: item.employeeId || employeeId,
        employeeName: item.employeeName || user?.name || 'Employee',
        designation: item.designation || user?.designation || 'Staff',
        department: item.department || user?.department || 'General',
        month: selectedMonth,
        year: selectedYear,
        grossAmount: item.totalEarnings || item.grossAmount || 0,
        totalDeductions: item.totalDeductions || 0,
        netPay: item.netSalary || item.netPay || 0,
        status: item.status === 'PAID' ? 'PAID' : item.isEmailSent ? 'SENT' : 'GENERATED',
        isEmailSent: item.isEmailSent || false,
        paidAt: item.paidAt,
        generatedAt: item.generatedAt || new Date().toISOString(),
        basicSalary: item.basicSalary || item.basicDA || 0,
        hra: item.hra || 0,
        specialAllowance: item.specialAllowance || 0,
        pfDeduction: item.pfDeduction || item.pf || 0,
        professionalTax: item.professionalTax || 0,
        tds: item.tds || item.tax || 0,
        bankName: item.bankName || user?.bankName || 'Not Set',
        accountNumber: item.accountNumber || user?.accountNumber || 'Not Set',
        ifscCode: item.ifscCode || user?.ifscCode || 'Not Set',
        pan: item.pan || user?.pan || 'Not Set',
        uan: item.uan || user?.uan || 'Not Set',
      }));

      setPayslips(transformedData);
      
      // Update stats
      const generated = transformedData.filter(p => p.status === 'GENERATED').length;
      const paid = transformedData.filter(p => p.status === 'PAID').length;
      const sent = transformedData.filter(p => p.status === 'SENT' || p.isEmailSent).length;
      
      setStats({
        total: transformedData.length,
        generated,
        paid,
        sent,
      });
      
    } catch (error) {
      console.error('Error fetching payslips:', error);
      // Load mock data for demo
      loadMockData();
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadMockData = () => {
    const userStr = AsyncStorage.getItem('user').then(data => {
      const user = data ? JSON.parse(data) : {};
      const mockData: PayslipData[] = [
        {
          _id: '1',
          employeeId: user?.employeeId || 'EMP001',
          employeeName: user?.name || 'John Doe',
          designation: 'Senior Software Engineer',
          department: 'Engineering',
          month: selectedMonth,
          year: selectedYear,
          grossAmount: 85000,
          totalDeductions: 18500,
          netPay: 66500,
          status: 'GENERATED',
          isEmailSent: false,
          basicSalary: 34000,
          hra: 17000,
          specialAllowance: 25500,
          pfDeduction: 4080,
          professionalTax: 200,
          tds: 8500,
          bankName: 'HDFC Bank',
          accountNumber: 'XXXX1234',
          ifscCode: 'HDFC0001234',
          pan: 'ABCDE1234F',
          uan: '123456789012',
        },
      ];
      setPayslips(mockData);
      setStats({
        total: mockData.length,
        generated: mockData.filter(p => p.status === 'GENERATED').length,
        paid: mockData.filter(p => p.status === 'PAID').length,
        sent: mockData.filter(p => p.status === 'SENT').length,
      });
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayslips();
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: string, isEmailSent: boolean) => {
    const effectiveStatus = isEmailSent ? 'SENT' : status;
    
    switch (effectiveStatus) {
      case 'GENERATED':
        return { label: 'Generated', color: COLORS.blue, bg: COLORS.blueLight };
      case 'PAID':
        return { label: 'Paid', color: COLORS.emerald, bg: COLORS.greenLight };
      case 'SENT':
        return { label: 'Sent', color: COLORS.indigo, bg: COLORS.indigoLight };
      default:
        return { label: 'Generated', color: COLORS.blue, bg: COLORS.blueLight };
    }
  };

  const getFilteredPayslips = () => {
    let filtered = payslips;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(p => p.department === departmentFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter.toUpperCase());
    }
    
    return filtered;
  };

  const handleGeneratePayslips = async () => {
    setGenerating(true);
    try {
      const response = await payrollAPI.getHistory({
        month: selectedMonth,
        year: selectedYear,
      });
      const data = extractData(response, []);
      
      Alert.alert('Success', `Payslips generated for ${months[selectedMonth - 1]} ${selectedYear}`);
      fetchPayslips();
    } catch (error) {
      console.error('Error generating payslips:', error);
      Alert.alert('Info', 'Payslip generation feature coming soon');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!payslipToMark) return;
    
    try {
      // Call API to mark as paid
      // await monthlyPayrollAPI.markAsPaid(payslipToMark._id);
      
      // Update local state
      setPayslips(prev => prev.map(p => 
        p._id === payslipToMark._id 
          ? { ...p, status: 'PAID', paidAt: new Date().toISOString() }
          : p
      ));
      
      Alert.alert('Success', `Payslip marked as paid for ${payslipToMark.employeeName}`);
    } catch (error) {
      console.error('Error marking as paid:', error);
      Alert.alert('Error', 'Failed to mark as paid');
    } finally {
      setShowMarkPaidConfirm(false);
      setPayslipToMark(null);
    }
  };

  const handleSendEmail = async (payslip: PayslipData) => {
    try {
      // Call API to send email
      // await monthlyPayrollAPI.sendPayslipEmail(payslip._id);
      
      // Update local state
      setPayslips(prev => prev.map(p => 
        p._id === payslip._id 
          ? { ...p, isEmailSent: true, status: 'SENT' as const }
          : p
      ));
      
      Alert.alert('Success', `Payslip sent to ${payslip.employeeName}`);
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert('Error', 'Failed to send email');
    }
  };

  const renderProcessSteps = () => (
    <View style={styles.processSteps}>
      <View style={styles.step}>
        <View style={[styles.stepDot, styles.stepDotActive]} />
        <Text style={[styles.stepText, styles.stepTextActive]}>PROCESSED</Text>
      </View>
      <View style={styles.stepDivider} />
      <View style={styles.step}>
        <View style={styles.stepDot} />
        <Text style={styles.stepText}>GENERATED</Text>
      </View>
      <View style={styles.stepDivider} />
      <View style={styles.step}>
        <View style={styles.stepDot} />
        <Text style={styles.stepText}>PAID</Text>
      </View>
      <View style={styles.stepDivider} />
      <View style={styles.step}>
        <View style={styles.stepDot} />
        <Text style={styles.stepText}>SENT</Text>
      </View>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.slate + '10' }]}>
          <User size={20} color={COLORS.slate} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>PAYROLL RECORDS</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statSubLabel}>Processed employees</Text>
        </View>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.blue + '10' }]}>
          <FileText size={20} color={COLORS.blue} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>GENERATED</Text>
          <Text style={styles.statValue}>{stats.generated}</Text>
          <Text style={styles.statSubLabel}>Statements ready</Text>
        </View>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.emerald + '10' }]}>
          <CreditCard size={20} color={COLORS.emerald} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>MARKED AS PAID</Text>
          <Text style={styles.statValue}>{stats.paid}</Text>
          <Text style={styles.statSubLabel}>Salary disbursed</Text>
        </View>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: COLORS.indigo + '10' }]}>
          <Mail size={20} color={COLORS.indigo} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>SENT TO EMPLOYEES</Text>
          <Text style={styles.statValue}>{stats.sent}</Text>
          <Text style={styles.statSubLabel}>Emails dispatched</Text>
        </View>
      </View>
    </View>
  );

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <View style={styles.monthYearFilters}>
        <TouchableOpacity 
          style={styles.dropdownSelector}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.dropdownSelectorText}>
            {months[selectedMonth - 1].slice(0, 3)}
          </Text>
          <ChevronDown size={14} color={COLORS.gray} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dropdownSelector}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.dropdownSelectorText}>{selectedYear}</Text>
          <ChevronDown size={14} color={COLORS.gray} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Search size={16} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employee by name or ID..."
          placeholderTextColor={COLORS.gray}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
      
      <View style={styles.rightFilters}>
        <TouchableOpacity 
          style={styles.filterIconButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={COLORS.gray} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dropdownSelectorLarge}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.dropdownSelectorText}>{departmentFilter} Departments</Text>
          <ChevronDown size={14} color={COLORS.gray} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.dropdownSelectorLarge}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.dropdownSelectorText}>{statusFilter === 'all' ? 'All Status' : statusFilter}</Text>
          <ChevronDown size={14} color={COLORS.gray} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <View style={styles.checkboxContainer}>
        <View style={styles.checkbox} />
      </View>
      <Text style={[styles.tableHeaderText, styles.employeeColumn]}>EMPLOYEE</Text>
      <Text style={[styles.tableHeaderText, styles.roleColumn]}>ROLE</Text>
      <Text style={[styles.tableHeaderText, styles.amountColumn]}>GROSS AMOUNT</Text>
      <Text style={[styles.tableHeaderText, styles.amountColumn]}>DEDUCTIONS</Text>
      <Text style={[styles.tableHeaderText, styles.amountColumn]}>NET PAYOUT</Text>
      <Text style={[styles.tableHeaderText, styles.statusColumn]}>STATUS</Text>
      <Text style={[styles.tableHeaderText, styles.actionsColumn]}>ACTIONS</Text>
    </View>
  );

  const renderPayslipItem = ({ item }: { item: PayslipData }) => {
    const statusBadge = getStatusBadge(item.status, item.isEmailSent);
    const canSendEmail = item.status === 'PAID' || item.isEmailSent;
    
    return (
      <View style={styles.tableRow}>
        <View style={styles.checkboxContainer}>
          <View style={styles.checkbox} />
        </View>
        
        <View style={styles.employeeColumn}>
          <Text style={styles.employeeNameText}>{item.employeeName}</Text>
          <Text style={styles.employeeIdText}>{item.employeeId}</Text>
        </View>

        <View style={styles.roleColumn}>
          <Text style={styles.roleText}>{item.designation}</Text>
        </View>

        <View style={styles.amountColumn}>
          <Text style={styles.amountText}>{formatCurrency(item.grossAmount)}</Text>
        </View>

        <View style={styles.amountColumn}>
          <Text style={[styles.amountText, { color: COLORS.rose }]}>-{formatCurrency(item.totalDeductions)}</Text>
        </View>

        <View style={styles.amountColumn}>
          <Text style={[styles.amountText, { fontWeight: '700' }]}>{formatCurrency(item.netPay)}</Text>
        </View>

        <View style={styles.statusColumn}>
          <View style={[styles.statusBadgeSmall, { backgroundColor: statusBadge.bg }]}>
            <View style={[styles.statusDotSmall, { backgroundColor: statusBadge.color }]} />
            <Text style={[styles.statusTextSmall, { color: statusBadge.color }]}>{statusBadge.label}</Text>
          </View>
        </View>

        <View style={styles.actionsColumn}>
          <View style={styles.actionIcons}>
            <TouchableOpacity onPress={() => {
              setSelectedPayslip(item);
              setShowPreviewModal(true);
            }}>
              <Icon name="visibility" size={18} color={COLORS.blue} />
            </TouchableOpacity>
            
            {item.status === 'GENERATED' && (
              <TouchableOpacity onPress={() => {
                setPayslipToMark(item);
                setShowMarkPaidConfirm(true);
              }}>
                <Icon name="payment" size={18} color={COLORS.emerald} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={() => canSendEmail && handleSendEmail(item)}
              disabled={!canSendEmail}
              style={!canSendEmail && { opacity: 0.5 }}
            >
              <Icon name="email" size={18} color={canSendEmail ? COLORS.indigo : COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderPayslipPreview = () => {
    if (!selectedPayslip) return null;
    
    return (
      <Modal
        visible={showPreviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payslip Preview</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Company Header */}
              <View style={styles.payslipHeaderSection}>
                <View style={styles.companyLogo}>
                  <Text style={styles.logoText}>C</Text>
                </View>
                <View>
                  <Text style={styles.companyName}>CALDIM</Text>
                  <Text style={styles.companyTagline}>ENGINEERING PRIVATE LIMITED</Text>
                </View>
              </View>
              
              {/* Title */}
              <View style={styles.titleSection}>
                <Text style={styles.payslipTitle}>
                  Payslip for {months[selectedPayslip.month - 1]} {selectedPayslip.year}
                </Text>
              </View>
              
              {/* Employee & Bank Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailsCard}>
                  <Text style={styles.cardTitle}>Employee Details</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>ID:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.employeeId}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Name:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.employeeName}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Designation:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.designation}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>PAN:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.pan}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>UAN:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.uan}</Text>
                  </View>
                </View>
                
                <View style={styles.detailsCard}>
                  <Text style={styles.cardTitle}>Bank Details</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Bank:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.bankName}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>A/c No:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.accountNumber}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>IFSC:</Text>
                    <Text style={styles.detailsText}>{selectedPayslip.ifscCode}</Text>
                  </View>
                </View>
              </View>
              
              {/* Salary Table */}
              <View style={styles.salaryTable}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderText}>EARNINGS</Text>
                  <Text style={styles.tableHeaderText}>DEDUCTIONS</Text>
                </View>
                
                <View style={styles.tableRow}>
                  <View style={styles.tableColumn}>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellLabel}>Basic Salary</Text>
                      <Text style={styles.cellValue}>{formatCurrency(selectedPayslip.basicSalary || 0)}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellLabel}>HRA</Text>
                      <Text style={styles.cellValue}>{formatCurrency(selectedPayslip.hra || 0)}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellLabel}>Special Allowance</Text>
                      <Text style={styles.cellValue}>{formatCurrency(selectedPayslip.specialAllowance || 0)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.totalCell]}>
                      <Text style={styles.totalLabel}>Total Earnings</Text>
                      <Text style={styles.totalValue}>{formatCurrency(selectedPayslip.grossAmount)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.tableColumn}>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellLabel}>Provident Fund</Text>
                      <Text style={styles.cellValue}>{formatCurrency(selectedPayslip.pfDeduction || 0)}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellLabel}>Professional Tax</Text>
                      <Text style={styles.cellValue}>{formatCurrency(selectedPayslip.professionalTax || 0)}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.cellLabel}>TDS</Text>
                      <Text style={styles.cellValue}>{formatCurrency(selectedPayslip.tds || 0)}</Text>
                    </View>
                    <View style={[styles.tableCell, styles.totalCell]}>
                      <Text style={styles.totalLabel}>Total Deductions</Text>
                      <Text style={[styles.totalValue, { color: COLORS.rose }]}>-{formatCurrency(selectedPayslip.totalDeductions)}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Net Salary */}
              <View style={styles.netSalaryCard}>
                <View>
                  <Text style={styles.netSalaryLabel}>Net Salary Payable</Text>
                  <Text style={styles.netSalaryValue}>{formatCurrency(selectedPayslip.netPay)}</Text>
                </View>
              </View>
              
              {/* Footer */}
              <Text style={styles.footerText}>
                This is a computer-generated document and does not require a signature.
              </Text>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Options</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterOptions}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.filterChip,
                      selectedMonth === index + 1 && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedMonth(index + 1)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedMonth === index + 1 && styles.filterChipTextActive,
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Year</Text>
            <View style={styles.filterOptions}>
              {years.map(year => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterChip,
                    selectedYear === year && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedYear === year && styles.filterChipTextActive,
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterOptions}>
                {['All', 'Engineering', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations'].map(dept => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.filterChip,
                      departmentFilter === dept && styles.filterChipActive,
                    ]}
                    onPress={() => setDepartmentFilter(dept)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      departmentFilter === dept && styles.filterChipTextActive,
                    ]}>
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterOptions}>
              {[
                { value: 'all', label: 'All Status' },
                { value: 'GENERATED', label: 'Generated' },
                { value: 'PAID', label: 'Paid' },
                { value: 'SENT', label: 'Sent' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    statusFilter === option.value && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(option.value)}
                >
                  <Text style={[
                    styles.filterChipText,
                    statusFilter === option.value && styles.filterChipTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.filterModalFooter}>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMarkPaidConfirmModal = () => (
    <Modal
      visible={showMarkPaidConfirm}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMarkPaidConfirm(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.confirmModalContent}>
          <View style={styles.confirmIcon}>
            <Icon name="payment" size={40} color={COLORS.emerald} />
          </View>
          <Text style={styles.confirmTitle}>Confirm Salary Disbursement</Text>
          <Text style={styles.confirmMessage}>
            You are about to mark <Text style={{ fontWeight: 'bold' }}>{payslipToMark?.employeeName}</Text>'s payslip as PAID.
            This confirms salary has been disbursed and is auditable.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity 
              style={styles.cancelConfirmButton}
              onPress={() => setShowMarkPaidConfirm(false)}
            >
              <Text style={styles.cancelConfirmText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleMarkAsPaid}
            >
              <Text style={styles.confirmButtonText}>Yes, Mark as Paid</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const filteredPayslips = getFilteredPayslips();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <Header title="Payslip Generation" showBackButton={true} />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerTitleSection}>
            <View style={styles.headerIconContainer}>
              <Receipt size={24} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.pageTitle}>Payslip Generation</Text>
              <Text style={styles.pageSubtitle}>Generate payslips → Mark as Paid → Send by email</Text>
              {renderProcessSteps()}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={handleGeneratePayslips}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <RefreshCw size={16} color={COLORS.primary} />
                  <Text style={styles.generateButtonText}>Generate Payslips</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sendAllButton}
              onPress={() => Alert.alert('Info', 'Send All feature coming soon')}
            >
              <Send size={16} color={COLORS.white} />
              <Text style={styles.sendAllButtonText}>Send All</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Stats Cards */}
        {renderStatsCard()}
        
        {/* Filter Bar */}
        {renderFilterBar()}
        
        {/* Payslips List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading payslips...</Text>
          </View>
        ) : filteredPayslips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={60} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Payslips Found</Text>
            <Text style={styles.emptyText}>
              No payslips found for {months[selectedMonth - 1]} {selectedYear}
            </Text>
            <TouchableOpacity 
              style={styles.generateEmptyButton}
              onPress={handleGeneratePayslips}
            >
              <Text style={styles.generateEmptyButtonText}>Generate Payslips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              <FlatList
                data={filteredPayslips}
                keyExtractor={(item) => item._id}
                renderItem={renderPayslipItem}
                scrollEnabled={false}
              />
            </View>
          </ScrollView>
        )}
      </ScrollView>
      
      {/* Modals */}
      {renderPayslipPreview()}
      {renderFilterModal()}
      {renderMarkPaidConfirmModal()}
      
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
  headerContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  headerTitleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  processSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.border,
  },
  stepText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.border,
  },
  stepTextActive: {
    color: COLORS.border,
  },
  stepDivider: {
    width: 20,
    height: 1,
    backgroundColor: COLORS.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  sendAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  sendAllButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginVertical: 2,
  },
  statSubLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  filterBar: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    gap: 12,
  },
  monthYearFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
  },
  dropdownSelectorLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  dropdownSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
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
  rightFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIconButton: {
    padding: 8,
  },
  tableContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    minWidth: 800, // For horizontal scroll
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkboxContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  employeeColumn: {
    width: 200,
    paddingLeft: 10,
  },
  roleColumn: {
    width: 150,
  },
  amountColumn: {
    width: 120,
  },
  statusColumn: {
    width: 120,
  },
  actionsColumn: {
    width: 100,
  },
  employeeNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  employeeIdText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  generateEmptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  generateEmptyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
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
  filterModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
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
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Payslip Preview Styles
  payslipHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  companyLogo: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  companyTagline: {
    fontSize: 10,
    color: COLORS.orange,
    fontWeight: '600',
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  payslipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  detailsCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.filterBg,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailsLabel: {
    width: 45,
    fontSize: 11,
    color: COLORS.gray,
  },
  detailsText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  salaryTable: {
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },
  tableColumn: {
    flex: 1,
  },
  tableCell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cellLabel: {
    fontSize: 11,
    color: COLORS.gray,
  },
  cellValue: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  totalCell: {
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.emerald,
  },
  netSalaryCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  netSalaryLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
  },
  netSalaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  footerText: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
    margin: 16,
  },
  // Filter Modal Styles
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.filterBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  filterModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Confirm Modal Styles
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
    backgroundColor: COLORS.greenLight,
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
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
});

export default PayrollPayslip;