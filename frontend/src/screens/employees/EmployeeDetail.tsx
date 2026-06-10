import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  Mail,
  Building2,
  Briefcase,
  CalendarDays,
  Clock,
  FileText
} from 'lucide-react-native';
import { userAPI, leaveAPI, timesheetAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';

export default function EmployeeDetail() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuthStore();
  
  const userId = route.params?.userId;
  const passedInfo = route.params?.employeeInfo;

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchData();
    } else if (passedInfo?._id) {
      // Fallback: use _id from the passed employee info
      fetchDataWithId(passedInfo._id);
    }
  }, [userId]);

  const extractData = (response: any, defaultValue: any = null): any => {
    if (!response) return defaultValue;
    if (response.data?.data) return response.data.data;
    if (response.data) return response.data;
    return response;
  };

  const fetchDataWithId = (id: string) => {
    fetchDataCore(id);
  };

  const fetchData = () => {
    fetchDataCore(userId);
  };

  const fetchDataCore = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const userRes = await userAPI.getById(id);
      const userData = extractData(userRes);
      if (userData) setEmployee(userData);

      // Fetch leave balance
      try {
        const leaveRes = await leaveAPI.getBalance(id);
        const leaveData = extractData(leaveRes);
        if (leaveData) {
          // Handle Mongoose Map - convert to plain object if needed
          const balance: any = {};
          if (leaveData instanceof Map || typeof leaveData?.get === 'function') {
            leaveData.forEach((val: number, key: string) => { balance[key] = val; });
          } else if (typeof leaveData === 'object') {
            Object.assign(balance, leaveData);
          }
          setLeaveBalance(balance);
        }
      } catch (leaveErr) {
        console.log('Leave balance not available:', leaveErr);
        // Try to use leaveBalance from user profile if available
        if (userData?.leaveBalance) {
          const lb = userData.leaveBalance;
          const balance: any = {};
          if (typeof lb === 'object') Object.assign(balance, lb);
          setLeaveBalance(balance);
        }
      }

      // Fetch recent timesheets
      try {
        const tsRes = await timesheetAPI.getHistory({ userId: id, limit: 5 });
        const tsData = extractData(tsRes, []);
        if (Array.isArray(tsData)) setTimesheets(tsData.slice(0, 5));
      } catch (tsErr) {
        console.log('Timesheets not available:', tsErr);
      }
    } catch (err) {
      console.error('EmployeeDetail fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return '—'; }
  };

  const emp = employee || passedInfo || {};
  const lb = leaveBalance || {};

  return (
    <Layout title="Employee Profile" user={currentUser} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={18} color="#6366f1" />
          <Text style={styles.backBtnText}>Back to Employees</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Profile Header Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileHeaderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{emp.name?.[0]?.toLowerCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{emp.name || 'Unknown'}</Text>
                  <Text style={styles.profileEmail}>{emp.email || ''}</Text>
                  <View style={styles.badgesRow}>
                    <View style={styles.roleBadge}>
                      <View style={[styles.badgeDot, { backgroundColor: '#6366f1' }]} />
                      <Text style={styles.roleBadgeText}>{emp.role || 'employee'}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: '#ecfdf5' }]}>
                      <View style={[styles.badgeDot, { backgroundColor: '#10b981' }]} />
                      <Text style={[styles.roleBadgeText, { color: '#059669' }]}>{emp.isActive !== false ? 'Active' : 'Inactive'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoGrid}>
                <View style={styles.infoGridRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>EMPLOYEE ID</Text>
                    <Text style={styles.infoValue}>{emp.employeeId || '—'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>DEPARTMENT</Text>
                    <Text style={styles.infoValue}>{emp.department || '—'}</Text>
                  </View>
                </View>
                <View style={styles.infoGridRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>DESIGNATION</Text>
                    <Text style={styles.infoValue}>{emp.designation || '—'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>JOINING DATE</Text>
                    <Text style={styles.infoValue}>{formatDate(emp.joinDate)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Leave Balance Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Leave Balance</Text>
              <View style={styles.leaveGrid}>
                {[
                  { label: 'Annual Leave', value: leaveBalance?.annual ?? leaveBalance?.annualLeave ?? 0 },
                  { label: 'Sick Leave', value: leaveBalance?.sick ?? leaveBalance?.sickLeave ?? 0 },
                  { label: 'Casual Leave', value: leaveBalance?.casual ?? leaveBalance?.casualLeave ?? 0 },
                  { label: 'Loss Of Pay', value: leaveBalance?.lop ?? leaveBalance?.lossOfPay ?? 0 },
                ].map((item, idx) => (
                  <View key={idx} style={styles.leaveBox}>
                    <Text style={styles.leaveValue}>{item.value}</Text>
                    <Text style={styles.leaveLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent Timesheets Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recent Timesheets</Text>
              {timesheets.length > 0 ? timesheets.map((ts, idx) => (
                <View key={idx} style={styles.tsRow}>
                  <View style={styles.tsIconWrap}>
                    <Clock size={14} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tsProject}>{ts.project?.name || ts.projectName || 'Project'}</Text>
                    <Text style={styles.tsDate}>{formatDate(ts.weekStartDate || ts.date)}</Text>
                  </View>
                  <Text style={styles.tsHours}>{ts.totalHours || ts.hours || 0}h</Text>
                </View>
              )) : (
                <Text style={styles.emptyText}>No timesheets found</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, marginBottom: 16 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#6366f1', marginLeft: 4 },

  profileCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  profileEmail: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 },
  
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#4f46e5' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },

  infoGrid: { gap: 16 },
  infoGridRow: { flexDirection: 'row', gap: 16 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

  sectionCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  leaveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  leaveBox: { backgroundColor: '#f8fafc', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, minWidth: '28%', flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  leaveValue: { fontSize: 24, fontWeight: '800', color: '#4f46e5', marginBottom: 6 },
  leaveLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textAlign: 'center' },

  tsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  tsIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  tsProject: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  tsDate: { fontSize: 11, fontWeight: '500', color: '#94a3b8', marginTop: 2 },
  tsHours: { fontSize: 14, fontWeight: '800', color: '#4f46e5' },

  emptyText: { fontSize: 13, fontWeight: '500', color: '#94a3b8', fontStyle: 'italic' }
});
