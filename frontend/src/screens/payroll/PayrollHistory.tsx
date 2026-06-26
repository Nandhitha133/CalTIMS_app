import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Animated
} from 'react-native';
import {
  Archive,
  Search,
  Filter,
  DollarSign,
  Users,
  ChevronRight,
  History,
  AlertCircle,
  CreditCard,
  Banknote,
  TrendingUp,
  Clock
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function PayrollHistory() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, sRes]: any[] = await Promise.all([
        payrollAPI.getBatches(),
        settingsAPI.getSettings()
      ]);
      if (bRes?.success) setRuns(bRes.data);
      if (sRes?.success) setSettings(sRes.data);
    } catch (err) {
      console.error('Failed to load history data', err);
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings?.payroll?.currencySymbol || '$';

  const filteredRuns = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return runs;
    return runs.filter(run => {
      const label = `${run.year}-${String(run.month).padStart(2, '0')}`;
      const monthName = months[run.month - 1]?.toLowerCase() || '';
      return label.includes(term) || run.year.toString().includes(term) || monthName.includes(term);
    });
  }, [runs, searchTerm]);

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const totalDisbursed = runs.reduce((acc, r) => acc + (r.paidAmount || 0), 0);
    const pendingDisbursements = runs.reduce((acc, r) => acc + (r.isPaid ? 0 : Math.max(0, (r.totalNet || 0) - (r.paidAmount || 0))), 0);
    const avgCost = totalRuns > 0 ? (runs.reduce((acc, r) => acc + (r.totalNet || 0), 0) / totalRuns) : 0;
    return { totalRuns, totalDisbursed, pendingDisbursements, avgCost };
  }, [runs]);

  return (
    <Layout title="Execution Ledger" user={user} refreshing={loading} onRefresh={fetchData} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <View style={styles.newStatCard}>
              <View style={styles.newStatHeader}>
                <View style={[styles.newStatIconWrapper, { backgroundColor: '#eef2ff' }]}>
                  <Archive size={20} color="#4f46e5" />
                </View>
                <View style={styles.newStatBadge}>
                  <Text style={styles.newStatBadgeText}>LAST 12MO</Text>
                </View>
              </View>
              <Text style={styles.newStatLabel}>Total Payroll Runs</Text>
              <Text style={styles.newStatValue} numberOfLines={1} adjustsFontSizeToFit>{stats.totalRuns}</Text>
            </View>

            <View style={styles.newStatCard}>
              <View style={styles.newStatHeader}>
                <View style={[styles.newStatIconWrapper, { backgroundColor: '#ecfdf5' }]}>
                  <DollarSign size={20} color="#10b981" />
                </View>
                <View style={styles.newStatBadge}>
                  <Text style={styles.newStatBadgeText}>LIFETIME</Text>
                </View>
              </View>
              <Text style={styles.newStatLabel}>Total Disbursed</Text>
              <Text style={styles.newStatValue} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{stats.totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>

            <View style={styles.newStatCard}>
              <View style={styles.newStatHeader}>
                <View style={[styles.newStatIconWrapper, { backgroundColor: '#fef2f2' }]}>
                  <Clock size={20} color="#ef4444" />
                </View>
                <View style={styles.newStatBadge}>
                  <Text style={styles.newStatBadgeText}>TO BE PAID</Text>
                </View>
              </View>
              <Text style={styles.newStatLabel}>Pending Disbursements</Text>
              <Text style={styles.newStatValue} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{stats.pendingDisbursements.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>

            <View style={styles.newStatCard}>
              <View style={styles.newStatHeader}>
                <View style={[styles.newStatIconWrapper, { backgroundColor: '#eff6ff' }]}>
                  <TrendingUp size={20} color="#3b82f6" />
                </View>
                <View style={styles.newStatBadge}>
                  <Text style={styles.newStatBadgeText}>PER CYCLE</Text>
                </View>
              </View>
              <Text style={styles.newStatLabel}>Average Payroll Cost</Text>
              <Text style={styles.newStatValue} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{stats.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </ScrollView>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
            <Search size={20} color={isFocused ? "#6366f1" : "#94a3b8"} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Year or Month"
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 60 }} />
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Ledger History</Text>
            
            {filteredRuns.length > 0 ? filteredRuns.map((run, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.runCard} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PayrollExecution', { month: run.month, year: run.year })}
              >
                <View style={styles.runHeader}>
                  <View style={styles.runTitleGroup}>
                    <View style={styles.runAvatar}>
                      <Archive size={20} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.runId} numberOfLines={1}>{months[run.month - 1]} {run.year}</Text>
                      <View style={styles.runInfo}>
                        <Users size={14} color="#64748b" />
                        <Text style={styles.runInfoText} numberOfLines={1}>{run.totalEmployees} Employees Processed</Text>
                      </View>
                    </View>
                  </View>
                  {(() => {
                    const isCleared = run.isPaid || (run.paidCount === run.totalEmployees && run.totalEmployees > 0);
                    const isPartiallyPaid = !isCleared && run.paidCount > 0 && run.paidCount < run.totalEmployees;

                    return (
                      <View style={[styles.badge, isCleared ? styles.badgeSuccess : (isPartiallyPaid ? styles.badgeInfo : styles.badgeWarning)]}>
                        <View style={[styles.badgeDot, isCleared ? styles.badgeDotSuccess : (isPartiallyPaid ? styles.badgeDotInfo : styles.badgeDotWarning)]} />
                        <Text style={[styles.badgeText, isCleared ? styles.badgeTextSuccess : (isPartiallyPaid ? styles.badgeTextInfo : styles.badgeTextWarning)]}>
                          {isCleared ? 'Cleared' : (isPartiallyPaid ? `Partially Paid (${run.paidCount}/${run.totalEmployees})` : 'Pending')}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                
                <View style={styles.runAmounts}>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountLabel}>Total Gross</Text>
                    <Text style={styles.amountValue}>{currencySymbol}{run.totalGross?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.amountDivider} />
                  <View style={styles.amountBox}>
                    <Text style={styles.amountLabel}>Net Payout</Text>
                    <Text style={[styles.amountValue, { color: '#059669' }]}>{currencySymbol}{run.totalNet?.toLocaleString()}</Text>
                  </View>
                  {run.failedCount > 0 && (
                    <>
                      <View style={styles.amountDivider} />
                      <View style={styles.amountBox}>
                        <Text style={styles.amountLabel}>Failed</Text>
                        <Text style={[styles.amountValue, { color: '#dc2626' }]}>{run.failedCount}</Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrapper}>
                  <History size={32} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No Records Found</Text>
                <Text style={styles.emptyText}>There are no payroll cycles matching your search.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  statsContainer: { marginTop: verticalScale(16), marginBottom: verticalScale(24) },
  statsScroll: { paddingHorizontal: scale(16), gap: scale(12) },
  newStatCard: { width: scale(150), padding: scale(16), backgroundColor: '#fff', borderRadius: scale(12), borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#64748b', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.04, shadowRadius: scale(8), elevation: 2 },
  newStatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(12) },
  newStatIconWrapper: { width: scale(32), height: verticalScale(32), borderRadius: scale(8), justifyContent: 'center', alignItems: 'center' },
  newStatBadge: { backgroundColor: '#f8fafc', paddingHorizontal: scale(6), paddingVertical: verticalScale(2), borderRadius: scale(4) },
  newStatBadgeText: { fontSize: moderateScale(8), fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  newStatLabel: { fontSize: moderateScale(10), fontWeight: '700', color: '#64748b', marginBottom: verticalScale(4) },
  newStatValue: { fontSize: moderateScale(16), fontWeight: '900', color: '#0f172a' },
  
  searchSection: { paddingHorizontal: scale(16), marginBottom: verticalScale(24) },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: scale(16), borderRadius: scale(16), borderWidth: 1, borderColor: '#e2e8f0', height: verticalScale(56), shadowColor: '#64748b', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.05, shadowRadius: scale(8), elevation: 2 },
  searchBarFocused: { borderColor: '#6366f1', shadowOpacity: 0.1 },
  searchInput: { flex: 1, marginLeft: scale(12), fontSize: moderateScale(15), color: '#1e293b', fontWeight: '500' },
  
  listContainer: { paddingHorizontal: scale(16), gap: scale(16) },
  sectionTitle: { fontSize: moderateScale(14), fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: verticalScale(4) },
  
  runCard: { backgroundColor: '#fff', borderRadius: scale(24), padding: scale(20), borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#64748b', shadowOffset: { width: 0, height: verticalScale(8) }, shadowOpacity: 0.06, shadowRadius: scale(16), elevation: 3 },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: verticalScale(20) },
  runTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingRight: scale(8) },
  runAvatar: { width: scale(48), height: verticalScale(48), borderRadius: scale(16), backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  runId: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a', marginBottom: verticalScale(2) },
  runInfo: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  runInfoText: { fontSize: moderateScale(12), color: '#64748b', fontWeight: '500' },
  
  badge: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(10), paddingVertical: verticalScale(6), borderRadius: scale(12) },
  badgeSuccess: { backgroundColor: '#ecfdf5' },
  badgeWarning: { backgroundColor: '#fffbeb' },
  badgeInfo: { backgroundColor: '#e0f2fe' },
  badgeDot: { width: scale(6), height: verticalScale(6), borderRadius: scale(3) },
  badgeDotSuccess: { backgroundColor: '#10b981' },
  badgeDotWarning: { backgroundColor: '#f59e0b' },
  badgeDotInfo: { backgroundColor: '#0284c7' },
  badgeText: { fontSize: moderateScale(11), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeTextSuccess: { color: '#059669' },
  badgeTextWarning: { color: '#d97706' },
  badgeTextInfo: { color: '#0369a1' },
  
  runAmounts: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: scale(16), borderRadius: scale(16), borderWidth: 1, borderColor: '#f1f5f9' },
  amountBox: { flex: 1 },
  amountDivider: { width: scale(1), height: verticalScale(30), backgroundColor: '#e2e8f0', marginHorizontal: scale(12) },
  amountLabel: { fontSize: moderateScale(11), fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: verticalScale(6), letterSpacing: 0.5 },
  amountValue: { fontSize: moderateScale(16), fontWeight: '800', color: '#0f172a' },
  
  emptyState: { padding: scale(40), alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(20) },
  emptyIconWrapper: { backgroundColor: '#f1f5f9', padding: scale(20), borderRadius: scale(40), marginBottom: verticalScale(16) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#0f172a', marginBottom: verticalScale(8) },
  emptyText: { color: '#64748b', fontSize: moderateScale(14), textAlign: 'center', lineHeight: verticalScale(22) }
});
