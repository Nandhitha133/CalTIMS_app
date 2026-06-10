import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert
} from 'react-native';
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
  RefreshCw,
  X,
  Landmark,
  ShieldCheck,
  DollarSign,
  Calculator,
  Check,
  Shield
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { userAPI, payrollAPI, settingsAPI, policyAPI } from '../../services/endpoints';
import { calculateSalaryBreakdown } from './payrollUtils';
import Layout from '../../components/common/Layout';
import SafeSelector from '../../components/common/SafeSelector';
import { useNavigation } from '@react-navigation/native';

export default function EmployeePayrollProfiles() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [globalPolicy, setGlobalPolicy] = useState<any>(null);
  const [viewModalData, setViewModalData] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeSelector, setActiveSelector] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, pRes, sRes, polRes]: any[] = await Promise.all([
        userAPI.getAll({ limit: 1000 }),
        payrollAPI.getProfiles(),
        settingsAPI.getSettings(),
        policyAPI.getPolicy()
      ]);

      if (uRes?.success) setUsers(uRes.data);
      if (pRes?.success) setProfiles(pRes.data);
      if (sRes?.success) setSettings(sRes.data);
      if (polRes?.success) setGlobalPolicy(polRes.data);
    } catch (err) {
      console.error('Failed to load payroll profiles data', err);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings?.organization?.currency === 'INR' ? '₹' : '$';

  const enrichedUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users.map(u => {
      const profile = profiles?.find(p => (p.employee?.userId === (u._id || u.id)) || (p.user === (u._id || u.id)));
      const bName = u.bankName || u.employee?.bankName || profile?.bankDetails?.bankName || profile?.bankName;
      const bAcc = u.accountNumber || u.employee?.accountNumber || profile?.bankDetails?.accountNumber || profile?.accountNumber;
      const bIfsc = u.ifscCode || u.employee?.ifscCode || profile?.bankDetails?.ifscCode || profile?.ifscCode;
      const bPan = u.pan || u.employee?.pan || profile?.bankDetails?.pan || profile?.pan;
      const bUan = u.uan || u.employee?.uan || profile?.bankDetails?.uan || profile?.uan;
      const bBranch = u.branchName || u.employee?.branchName || profile?.bankDetails?.branchName || profile?.branchName;

      const bankDetailsComplete = !!(bName && bAcc && bIfsc && bPan);
      let bankStatus = bankDetailsComplete ? 'Verified' : (bName || bAcc ? 'Pending' : 'Missing');

      let payrollStatus = 'Not Configured';
      if (profile) {
        const isProfileComplete = !!(profile.annualCTC && profile.earnings?.length > 0 && bankDetailsComplete);
        payrollStatus = isProfileComplete ? 'Active' : 'Warning';
      }

      return {
        ...u,
        profile,
        hasProfile: !!profile,
        payrollStatus,
        bankStatus,
        bankName: bName,
        accountNumber: bAcc,
        ifscCode: bIfsc,
        pan: bPan,
        uan: bUan,
        branchName: bBranch
      };
    });

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(lowerTerm) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(lowerTerm))
      );
    }

    if (deptFilter !== 'All') {
      filtered = filtered.filter(u => u.department === deptFilter);
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(u =>
        statusFilter === 'Active' ? u.payrollStatus === 'Active' :
          statusFilter === 'Pending' ? u.payrollStatus !== 'Active' : true
      );
    }

    return filtered;
  }, [users, profiles, searchTerm, deptFilter]);

  const departments = useMemo(() => {
    return ['All', ...new Set(users.map(u => u.department).filter(Boolean))];
  }, [users]);

  const renderKpiCard = (label: string, value: number, Icon: any, color: string, bg: string) => (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconBox, { backgroundColor: bg }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.kpiContent}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  );

  const handleDeleteProfile = (profileId: string) => {
    Alert.alert(
      "Remove Payroll Configuration?",
      "Are you sure you want to delete this payroll profile? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await payrollAPI.deleteProfile(profileId);
              await fetchData();
            } catch (err) {
              Alert.alert("Error", "Failed to delete profile");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleViewProfile = (emp: any) => {
    if (!emp.profile) {
      Alert.alert("Notice", "No payroll configuration found for this user.");
      return;
    }
    const breakdown = calculateSalaryBreakdown(emp.profile.earnings, emp.profile.deductions, emp.profile.monthlyCTC, globalPolicy);
    setViewModalData({ user: emp, profile: emp.profile, breakdown });
  };

  return (
    <Layout title="Payroll Profiles" user={user} refreshing={loading} onRefresh={fetchData} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* KPIs */}
        <View style={styles.kpiGrid}>
          {renderKpiCard('Total Emp', users.length, Users, '#3b82f6', '#eff6ff')}
          {renderKpiCard('Active', profiles.length, CheckCircle2, '#10b981', '#ecfdf5')}
          {renderKpiCard('Pending', users.length - profiles.length, Clock, '#f59e0b', '#fffbeb')}
          {renderKpiCard('Critical', enrichedUsers.filter(u => u.bankStatus === 'Missing' || u.payrollStatus === 'Warning').length, AlertCircle, '#ef4444', '#fef2f2')}
        </View>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee by name or ID..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <TouchableOpacity
              style={[styles.filterBtn, (statusFilter !== 'All' || deptFilter !== 'All') && styles.filterBtnActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={18} color={(statusFilter !== 'All' || deptFilter !== 'All') ? '#4f46e5' : '#64748b'} />
              {(statusFilter !== 'All' || deptFilter !== 'All') && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.listContainer}>
            {enrichedUsers.map((emp: any, index: number) => (
              <View key={index} style={styles.leaveCard}>
                <View style={styles.leaveCardHeader}>
                  <View style={styles.leaveAvatar}>
                    <Text style={styles.leaveAvatarText}>{emp.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.leaveHeaderInfo}>
                    <Text style={styles.leaveName}>{emp.name}</Text>
                    <Text style={styles.leaveId}>ID: {emp.employeeId}</Text>
                  </View>
                  <View style={[styles.leaveBadge, emp.payrollStatus === 'Active' ? styles.leaveBadgeSuccess : (emp.payrollStatus === 'Warning' ? styles.leaveBadgeWarning : styles.leaveBadgeDefault)]}>
                    <Text style={[styles.leaveBadgeText, emp.payrollStatus === 'Active' ? styles.leaveBadgeTextSuccess : (emp.payrollStatus === 'Warning' ? styles.leaveBadgeTextWarning : styles.leaveBadgeTextDefault)]}>
                      {emp.payrollStatus === 'Active' ? 'ACTIVE' : emp.payrollStatus === 'Warning' ? 'WARNING' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                <View style={styles.leaveDivider} />

                <View style={styles.leaveGrid}>
                  <View style={styles.leaveGridCol}>
                    <Text style={styles.leaveGridLabel}>Role</Text>
                    <Text style={styles.leaveGridValue}>{emp.designation || 'Staff'}</Text>
                  </View>
                  <View style={styles.leaveGridCol}>
                    <Text style={styles.leaveGridLabel}>Department</Text>
                    <Text style={styles.leaveGridValue}>{emp.department || 'General'}</Text>
                  </View>
                  <View style={styles.leaveGridCol}>
                    <Text style={styles.leaveGridLabel}>Monthly CTC</Text>
                    <Text style={styles.leaveGridValue}>
                      {emp.profile ? `${currencySymbol}${Math.round(emp.profile.monthlyCTC || (emp.profile.annualCTC / 12) || 0).toLocaleString()}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.leaveGridCol}>
                    <Text style={styles.leaveGridLabel}>Bank Status</Text>
                    <Text style={styles.leaveGridValue}>{emp.bankStatus}</Text>
                  </View>
                </View>

                <View style={styles.leaveDivider} />

                <View style={styles.leaveFooter}>
                  <View style={{ flex: 1 }} />
                  <View style={styles.leaveActionsBox}>
                    <TouchableOpacity
                      style={styles.leaveActionBtnPrimary}
                      onPress={() => handleViewProfile(emp)}
                    >
                      <Eye size={16} color="#4f46e5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.leaveActionBtnSecondary}
                      onPress={() => navigation.navigate('PayrollSetupWizard', { preSelectedUser: emp })}
                    >
                      <Edit3 size={16} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.leaveActionBtnDanger, !emp.hasProfile && { opacity: 0.3 }]}
                      disabled={!emp.hasProfile}
                      onPress={() => emp.hasProfile && handleDeleteProfile(emp.profile._id || emp.profile.id)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {enrichedUsers.length === 0 && (
              <View style={styles.emptyState}>
                <AlertCircle size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No profiles found matching your filters.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Profiles</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 16 }}>
              <SafeSelector
                label="Payroll Status"
                options={[
                  { label: 'All Statuses', value: 'All' },
                  { label: 'Active', value: 'Active' },
                  { label: 'Pending', value: 'Pending' }
                ]}
                selectedValue={statusFilter}
                onValueChange={(val) => setStatusFilter(val)}
                visible={activeSelector === 'status'}
                onOpen={() => setActiveSelector('status')}
                onClose={() => setActiveSelector(null)}
                placeholder="Select Status"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <SafeSelector
                label="Department"
                options={departments.map(d => ({ label: d === 'All' ? 'All Departments' : d, value: d }))}
                selectedValue={deptFilter}
                onValueChange={(val) => setDeptFilter(val)}
                visible={activeSelector === 'department'}
                onOpen={() => setActiveSelector('department')}
                onClose={() => setActiveSelector(null)}
                placeholder="Select Department"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setStatusFilter('All');
                  setDeptFilter('All');
                }}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* View Profile Modal */}
      <Modal visible={!!viewModalData} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { height: '90%', padding: 0 }]}>
            {viewModalData && (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ padding: 20 }}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Employee Payroll Profile</Text>
                    <TouchableOpacity onPress={() => setViewModalData(null)}>
                      <X size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Header Card */}
                  <View style={styles.viewHeaderCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      <View style={styles.viewAvatar}>
                        <Text style={styles.viewAvatarText}>{viewModalData.user.name.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.viewName}>{viewModalData.user.name}</Text>
                        <Text style={styles.viewMeta}>
                          {viewModalData.user.designation || 'Staff'} • {viewModalData.user.department}
                        </Text>
                        <Text style={styles.viewMetaId}>ID: {viewModalData.user.employeeId}</Text>
                      </View>
                    </View>
                    <View style={styles.ctcBox}>
                      <Text style={styles.ctcBoxLabel}>ANNUAL PACKAGE (CTC)</Text>
                      <Text style={styles.ctcBoxValue}>
                        {currencySymbol}{Math.round(viewModalData.profile.annualCTC || (viewModalData.profile.monthlyCTC * 12)).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Monthly Breakdown */}
                  <View style={styles.sectionHeaderRow}>
                    <Calculator size={16} color="#6366f1" />
                    <Text style={styles.sectionHeaderTitle}>MONTHLY BREAKDOWN</Text>
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={styles.subSectionTitleEarning}>EARNINGS (PAYABLE)</Text>
                    <View style={styles.breakdownCard}>
                      {viewModalData.breakdown.earnings.map((e: any, idx: number) => (
                        <View key={idx} style={styles.breakdownRow}>
                          <Text style={styles.breakdownRowName}>{e.name}</Text>
                          <Text style={styles.breakdownRowValue}>{currencySymbol}{Math.round(e.calculatedValue).toLocaleString()}</Text>
                        </View>
                      ))}
                      <View style={styles.breakdownTotalRow}>
                        <Text style={styles.breakdownTotalLabel}>TOTAL MONTHLY GROSS</Text>
                        <Text style={styles.breakdownTotalValueEarning}>{currencySymbol}{Math.round(viewModalData.breakdown.grossPay).toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ marginBottom: 32 }}>
                    <Text style={styles.subSectionTitleDeduction}>DEDUCTIONS (SUBTRACTIONS)</Text>
                    <View style={styles.breakdownCard}>
                      {viewModalData.breakdown.statutoryDeductions?.map((d: any, idx: number) => (
                        <View key={`stat-${idx}`} style={styles.breakdownRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Shield size={12} color="#818cf8" style={{ marginRight: 6 }} />
                            <Text style={[styles.breakdownRowName, { fontStyle: 'italic', color: '#64748b' }]}>{d.name}</Text>
                          </View>
                          <Text style={styles.breakdownRowValueDeduct}>{currencySymbol}{Math.round(d.calculatedValue).toLocaleString()}</Text>
                        </View>
                      ))}
                      {viewModalData.breakdown.deductions.map((d: any, idx: number) => (
                        <View key={idx} style={styles.breakdownRow}>
                          <Text style={styles.breakdownRowName}>{d.name}</Text>
                          <Text style={styles.breakdownRowValueDeduct}>{currencySymbol}{Math.round(d.calculatedValue).toLocaleString()}</Text>
                        </View>
                      ))}
                      <View style={styles.breakdownTotalRow}>
                        <Text style={styles.breakdownTotalLabel}>TOTAL MONTHLY DEDUCTIONS</Text>
                        <Text style={styles.breakdownTotalValueDeduct}>{currencySymbol}{Math.round(viewModalData.breakdown.totalDeductions).toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Compliance Details */}
                  <View style={styles.sectionHeaderRow}>
                    <Landmark size={16} color="#10b981" />
                    <Text style={styles.sectionHeaderTitle}>COMPLIANCE DETAILS</Text>
                  </View>
                  <View style={styles.complianceCard}>
                    <View style={styles.complianceHeader}>
                      <View style={[styles.dot, { backgroundColor: '#6366f1' }]} />
                      <Text style={styles.complianceTitle}>BENEFICIARY BANK</Text>
                    </View>
                    <Text style={styles.complianceLabel}>INSTITUTION</Text>
                    <Text style={styles.complianceValueMain}>{viewModalData.user.bankName || 'Not Set'}</Text>

                    <View style={{ flexDirection: 'row', marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.complianceLabel}>ACC NUMBER</Text>
                        <Text style={styles.complianceValueSub}>{viewModalData.user.accountNumber || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.complianceLabel}>IFSC CODE</Text>
                        <Text style={[styles.complianceValueSub, { color: '#4f46e5' }]}>{viewModalData.user.ifscCode || '—'}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.complianceLabel}>BRANCH NAME</Text>
                        <Text style={styles.complianceValueSub}>{viewModalData.user.branchName || '—'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.complianceCard, { marginBottom: 24 }]}>
                    <View style={styles.complianceHeader}>
                      <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.complianceTitle}>TAX IDENTITY</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.complianceLabel}>PAN NUMBER</Text>
                        <Text style={styles.complianceValueSub}>{viewModalData.user.pan || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.complianceLabel}>UAN (UNIVERSAL)</Text>
                        <Text style={styles.complianceValueSub}>{viewModalData.user.uan || '—'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Estimate Payout Card */}
                  <View style={styles.payoutCard}>
                    <DollarSign size={100} color="rgba(255,255,255,0.05)" style={{ position: 'absolute', right: -20, top: -20 }} />
                    <Text style={styles.payoutLabel}>ESTIMATE PAYOUT</Text>
                    <Text style={styles.payoutValue}>{currencySymbol}{Math.round(viewModalData.breakdown.netSalary).toLocaleString()}</Text>
                    <View style={styles.payoutDivider} />
                    <Text style={styles.payoutSub}>CALCULATED MONTHLY TAKE-HOME</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modifyBtn}
                    onPress={() => {
                      const emp = viewModalData.user;
                      setViewModalData(null);
                      navigation.navigate('PayrollSetupWizard', { preSelectedUser: emp });
                    }}
                  >
                    <Edit3 size={16} color="#fff" />
                    <Text style={styles.modifyBtnText}>MODIFY CONFIGURATION</Text>
                  </TouchableOpacity>

                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: { width: '48%', backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'column', gap: 8 },
  kpiIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  kpiContent: {},
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  searchSection: { marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', height: 52 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b' },
  filterBtn: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  filterBtnActive: { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  filterDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5' },
  listContainer: { gap: 16, paddingBottom: 40 },
  leaveCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  leaveCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  leaveAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  leaveAvatarText: { fontSize: 18, fontWeight: '800', color: '#4f46e5' },
  leaveHeaderInfo: { flex: 1 },
  leaveName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  leaveId: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  leaveBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#ecfdf5' },
  leaveBadgeText: { fontSize: 10, fontWeight: '800', color: '#10b981', textTransform: 'uppercase' },
  leaveBadgeSuccess: { backgroundColor: '#ecfdf5' },
  leaveBadgeTextSuccess: { color: '#10b981' },
  leaveBadgeWarning: { backgroundColor: '#fffbeb' },
  leaveBadgeTextWarning: { color: '#f59e0b' },
  leaveBadgeDefault: { backgroundColor: '#f1f5f9' },
  leaveBadgeTextDefault: { color: '#64748b' },

  leaveDivider: { height: 1, backgroundColor: '#f8fafc', marginHorizontal: -16, marginBottom: 16 },

  leaveGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, rowGap: 16 },
  leaveGridCol: { width: '50%' },
  leaveGridLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginBottom: 4 },
  leaveGridValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  leaveFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  leaveActionsBox: { flexDirection: 'row', gap: 12 },
  leaveActionBtnPrimary: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#c7d2fe' },
  leaveActionBtnSecondary: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  leaveActionBtnDanger: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },

  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 20 },
  emptyText: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 24 },
  clearBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  clearBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  applyBtn: { flex: 2, paddingVertical: 14, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  viewHeaderCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, marginBottom: 32 },
  viewAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  viewAvatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  viewName: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  viewMeta: { fontSize: 12, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },
  viewMetaId: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  ctcBox: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: '#f1f5f9' },
  ctcBoxLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 4 },
  ctcBoxValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionHeaderTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a', letterSpacing: 1.5, marginLeft: 8 },

  subSectionTitleEarning: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, borderLeftWidth: 2, borderLeftColor: '#10b981', paddingLeft: 8 },
  subSectionTitleDeduction: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, borderLeftWidth: 2, borderLeftColor: '#ef4444', paddingLeft: 8 },

  breakdownCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  breakdownRowName: { fontSize: 13, fontWeight: '600', color: '#475569' },
  breakdownRowValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  breakdownRowValueDeduct: { fontSize: 13, fontWeight: '800', color: '#ef4444' },
  breakdownTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  breakdownTotalLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  breakdownTotalValueEarning: { fontSize: 15, fontWeight: '900', color: '#10b981' },
  breakdownTotalValueDeduct: { fontSize: 15, fontWeight: '900', color: '#ef4444' },

  complianceCard: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, marginBottom: 16 },
  complianceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  complianceTitle: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  complianceLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 4 },
  complianceValueMain: { fontSize: 15, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  complianceValueSub: { fontSize: 14, fontWeight: '700', color: '#334155' },

  payoutCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 24, position: 'relative', overflow: 'hidden', marginBottom: 24 },
  payoutLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 8 },
  payoutValue: { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 16 },
  payoutDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  payoutSub: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },

  modifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5', borderRadius: 16, padding: 16, gap: 8, marginBottom: 40 },
  modifyBtnText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1 }
});
