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
  Banknote
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { payrollAPI, settingsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import { useNavigation } from '@react-navigation/native';

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
    return runs.filter(run => {
      const label = `${run.year}-${String(run.month).padStart(2, '0')}`;
      return label.includes(searchTerm) || (run.year.toString().includes(searchTerm));
    });
  }, [runs, searchTerm]);

  const stats = useMemo(() => {
    const totalRuns = runs.length;
    const totalDisbursed = runs.filter(r => r.isPaid).reduce((acc, r) => acc + (r.totalNet || 0), 0);
    const avgCost = totalRuns > 0 ? (runs.reduce((acc, r) => acc + (r.totalNet || 0), 0) / totalRuns) : 0;
    return { totalRuns, totalDisbursed, avgCost };
  }, [runs]);

  return (
    <Layout title="Execution Ledger" user={user} refreshing={loading} onRefresh={fetchData} sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <View style={[styles.statCard, { backgroundColor: '#4f46e5' }]}>
              <View style={styles.statIconWrapper}>
                <History size={20} color="#4f46e5" />
              </View>
              <Text style={styles.statValueDark}>{stats.totalRuns}</Text>
              <Text style={styles.statLabelDark}>Total Cycles</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
              <View style={styles.statIconWrapper}>
                <CreditCard size={20} color="#10b981" />
              </View>
              <Text style={styles.statValueDark}>{currencySymbol}{(Math.round(stats.totalDisbursed / 1000))}k</Text>
              <Text style={styles.statLabelDark}>Disbursed</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#f59e0b' }]}>
              <View style={styles.statIconWrapper}>
                <Banknote size={20} color="#f59e0b" />
              </View>
              <Text style={styles.statValueDark}>{currencySymbol}{(Math.round(stats.avgCost / 1000))}k</Text>
              <Text style={styles.statLabelDark}>Avg. Cost</Text>
            </View>
          </ScrollView>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
            <Search size={20} color={isFocused ? "#6366f1" : "#94a3b8"} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Year or Month (e.g. 2024-05)"
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
                    <View>
                      <Text style={styles.runId}>{months[run.month - 1]} {run.year}</Text>
                      <View style={styles.runInfo}>
                        <Users size={14} color="#64748b" />
                        <Text style={styles.runInfoText}>{run.totalEmployees} Employees Processed</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.badge, run.isPaid ? styles.badgeSuccess : styles.badgeWarning]}>
                    <View style={[styles.badgeDot, run.isPaid ? styles.badgeDotSuccess : styles.badgeDotWarning]} />
                    <Text style={[styles.badgeText, run.isPaid ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
                      {run.isPaid ? 'Cleared' : 'Pending'}
                    </Text>
                  </View>
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
  
  statsContainer: { marginTop: 16, marginBottom: 24 },
  statsScroll: { paddingHorizontal: 16, gap: 12 },
  statCard: { width: 140, padding: 16, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  statIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValueDark: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabelDark: { fontSize: 11, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  searchSection: { paddingHorizontal: 16, marginBottom: 24 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', height: 56, shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchBarFocused: { borderColor: '#6366f1', shadowOpacity: 0.1 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  
  listContainer: { paddingHorizontal: 16, gap: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  
  runCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  runTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  runAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  runId: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  runInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  runInfoText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#ecfdf5' },
  badgeWarning: { backgroundColor: '#fffbeb' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeDotSuccess: { backgroundColor: '#10b981' },
  badgeDotWarning: { backgroundColor: '#f59e0b' },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeTextSuccess: { color: '#059669' },
  badgeTextWarning: { color: '#d97706' },
  
  runAmounts: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  amountBox: { flex: 1 },
  amountDivider: { width: 1, height: '100%', backgroundColor: '#e2e8f0', marginHorizontal: 16 },
  amountLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  amountValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  emptyIconWrapper: { backgroundColor: '#f1f5f9', padding: 20, borderRadius: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22 }
});
