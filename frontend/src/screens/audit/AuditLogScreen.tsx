// src/screens/audit/AuditLogScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  FlatList,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, formatDistanceToNow } from 'date-fns';
import RNFS from 'react-native-fs';
import {
  Shield,
  Search,
  Download,
  ChevronRight,
  User,
  Layout as LayoutIcon,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  Filter,
  ChevronDown,
} from 'lucide-react-native';
import { auditAPI } from '../../services/endpoints';
import { exportFile } from '../../utils/exportHelper';
import { BASE_URL } from '../../services/api';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';

// ---------- Types ----------
interface AuditLog {
  _id: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  entity: string;
  role: string;
  ipAddress?: string;
  performedBy?: {
    _id: string;
    name: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
}

// ---------- Sub‑components ----------
const DropdownModal = memo(({ visible, onClose, options, selectedValue, onSelect, title }: any) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={dropdownStyles.overlay}>
      <View style={dropdownStyles.container}>
        <View style={dropdownStyles.header}>
          <Text style={dropdownStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}><X size={20} color="#64748b" /></TouchableOpacity>
        </View>
        <ScrollView>
          {options.map((opt: any) => (
            <TouchableOpacity
              key={opt.value}
              style={[dropdownStyles.option, selectedValue === opt.value && dropdownStyles.optionSelected]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <Text style={[dropdownStyles.optionText, selectedValue === opt.value && dropdownStyles.optionTextSelected]}>
                {opt.label}
              </Text>
              {selectedValue === opt.value && <View style={dropdownStyles.checkmark} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

const StatusBadge = memo(({ status }: { status: string }) => {
  const config = {
    SUCCESS: { bg: '#ecfdf5', text: '#10b981', Icon: CheckCircle2 },
    FAILED: { bg: '#fef2f2', text: '#ef4444', Icon: XCircle },
    WARNING: { bg: '#fffbeb', text: '#f59e0b', Icon: AlertCircle },
    default: { bg: '#eff6ff', text: '#3b82f6', Icon: Info },
  }[status] || { bg: '#f1f5f9', text: '#64748b', Icon: Info };
  const { bg, text, Icon } = config;
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Icon size={12} color={text} />
      <Text style={[styles.statusText, { color: text }]}>{status}</Text>
    </View>
  );
});

const ActionBadge = memo(({ action }: { action: string }) => {
  const config = !action ? { bg: '#f1f5f9', text: '#64748b' } :
    action.includes('DELETE') || action.includes('DEACTIVATE') ? { bg: '#fef2f2', text: '#ef4444' } :
      action.includes('CREATE') || action.includes('ACTIVATE') ? { bg: '#ecfdf5', text: '#10b981' } :
        action.includes('LOGIN') || action.includes('LOGOUT') ? { bg: '#eff6ff', text: '#3b82f6' } :
          action.includes('PAYROLL') ? { bg: '#eef2ff', text: '#6366f1' } :
            action.includes('UPDATE') || action.includes('CHANGE') ? { bg: '#fffbeb', text: '#f59e0b' } :
              { bg: '#f1f5f9', text: '#64748b' };
  return (
    <View style={[styles.actionBadge, { backgroundColor: config.bg }]}>
      <FileText size={10} color={config.text} />
      <Text style={[styles.actionText, { color: config.text }]}>{(action || '').replace(/_/g, ' ')}</Text>
    </View>
  );
});

const AuditLogCard = memo(({ log, onPress }: { log: AuditLog; onPress: () => void }) => {
  const initial = (log.performedBy?.name || 'System').charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.logCard} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeAvatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.employeeName}>{log.performedBy?.name || 'System'}</Text>
            <Text style={styles.employeeId}>{log.role}</Text>
          </View>
        </View>
        <StatusBadge status={log.status} />
      </View>

      {/* Details */}
      <View style={styles.cardContent}>
        <View style={styles.actionContainer}>
          <ActionBadge action={log.action} />
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <LayoutIcon size={14} color="#64748b" />
            <Text style={styles.detailText}>{log.entity || '—'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={14} color="#64748b" />
            <Text style={styles.detailText}>{log.createdAt ? format(new Date(log.createdAt), 'MMM d, h:mm a') : '—'}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft} />
        <View style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]}>
          <ChevronRight size={16} color="#64748b" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const DetailModal = memo(({ visible, log, onClose, onExport, onExportUser }: any) => {
  if (!log) return null;
  const statusColors: Record<string, string> = { SUCCESS: '#6366f1', FAILED: '#e11d48', WARNING: '#f59e0b' };
  const bannerColor = statusColors[log.status] || '#3b82f6';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.container}>
          <View style={detailStyles.header}>
            <View style={detailStyles.headerLeft}>
              <Shield size={20} color="#6366f1" />
              <Text style={detailStyles.title}>Audit Detail</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X size={20} color="#64748b" /></TouchableOpacity>
          </View>
          <ScrollView>
            {/* Banner */}
            <View style={[detailStyles.banner, { backgroundColor: bannerColor }]}>
              <View style={detailStyles.bannerHeader}>
                <View>
                  <Text style={detailStyles.bannerLabel}>ACTIVITY</Text>
                  <Text style={detailStyles.bannerTitle}>{(log.action || '').replace(/_/g, ' ')}</Text>
                </View>
                <View style={detailStyles.bannerIcon}><FileText size={24} color="white" /></View>
              </View>
              <View style={detailStyles.bannerFooter}>
                <View style={detailStyles.bannerInfo}><Clock size={12} color="rgba(255,255,255,0.6)" /><Text style={detailStyles.bannerInfoText}>{log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy h:mm:ss a') : '—'}</Text></View>
                {log.entity && <>
                  <View style={detailStyles.divider} />
                  <View style={detailStyles.bannerInfo}><LayoutIcon size={12} color="rgba(255,255,255,0.6)" /><Text style={detailStyles.bannerInfoText}>{log.entity}</Text></View>
                </>}
              </View>
            </View>
            {/* Identity */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.sectionTitle}>IDENTITY</Text>
              <View style={detailStyles.identityGrid}>
                <View style={detailStyles.identityCard}>
                  <Text style={detailStyles.identityLabel}>Performed By</Text>
                  <Text style={detailStyles.identityValue}>{log.performedBy?.name || 'System'}</Text>
                  <Text style={detailStyles.identityRole}>{log.role}</Text>
                </View>
                <View style={detailStyles.identityCard}>
                  <Text style={detailStyles.identityLabel}>IP Address</Text>
                  <Text style={detailStyles.identityValue}>{log.ipAddress || '—'}</Text>
                  <View style={detailStyles.ipBadge}><Shield size={8} color="#10b981" /><Text style={detailStyles.ipText}>Logged</Text></View>
                </View>
              </View>
            </View>
            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <View style={detailStyles.section}>
                <Text style={detailStyles.sectionTitle}>ACTION PAYLOAD</Text>
                <View style={detailStyles.jsonContainer}>
                  <View style={detailStyles.jsonHeader}><Text style={detailStyles.jsonLabel}>JSON</Text></View>
                  <ScrollView horizontal>
                    <Text style={detailStyles.jsonContent}>{JSON.stringify(log.metadata, null, 2)}</Text>
                  </ScrollView>
                </View>
              </View>
            )}
          </ScrollView>
          <View style={detailStyles.footer}>
            
            <TouchableOpacity style={detailStyles.exportButton} onPress={onExport}>
              <Download size={16} color="#1e293b" /><Text style={detailStyles.exportButtonText}>Export All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ---------- Main Screen ----------
export default function AuditLogScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({ action: '', status: '' });
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'RUN_PAYROLL', label: 'Run Payroll' },
    { value: 'CREATE_EMPLOYEE', label: 'Create Employee' },
    { value: 'UPDATE_EMPLOYEE', label: 'Update Employee' },
    { value: 'DELETE_EMPLOYEE', label: 'Delete Employee' },
    { value: 'DEACTIVATE_EMPLOYEE', label: 'Deactivate Employee' },
    { value: 'ACTIVATE_EMPLOYEE', label: 'Activate Employee' },
    { value: 'CHANGE_EMPLOYEE_ROLE', label: 'Change Role' },
    { value: 'STRUCTURE_CREATE', label: 'Structure Create' },
    { value: 'STRUCTURE_UPDATE', label: 'Structure Update' },
    { value: 'POLICY_UPDATE', label: 'Policy Update' },
    { value: 'CHANGE_PASSWORD', label: 'Change Password' },
  ];
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'SUCCESS', label: 'Success' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'WARNING', label: 'Warning' },
  ];

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await auditAPI.getAll(params);
      const data = response as any;

      // The backend returns { success, count, total, data: logs }
      // So response.data is the actual array of logs
      setLogs(data?.data || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, statusFilter]);

  useFocusEffect(useCallback(() => { fetchLogs(); loadUser(); }, [fetchLogs]));

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  };

  const onRefresh = async () => { setRefreshing(true); await fetchLogs(); setRefreshing(false); };

  // Client-side search
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      l.action?.toLowerCase().includes(q) ||
      l.performedBy?.name?.toLowerCase().includes(q) ||
      l.entity?.toLowerCase().includes(q) ||
      l.role?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const handleExportCSV = async () => {
    const headers = ['Action', 'User', 'Role', 'Entity', 'Status', 'IP', 'Timestamp'];
    const rows = filteredLogs.map(l => [
      l.action, l.performedBy?.name || 'System', l.role, l.entity, l.status, l.ipAddress, l.createdAt ? `[${format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss')}]` : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    await exportFile(csv, `audit_logs_${format(new Date(), 'yyyyMMdd')}.csv`, 'text/csv');
  };

  const handleExportUserCSV = async (targetLog: AuditLog) => {
    if (!targetLog.performedBy?.name) {
      Alert.alert('Error', 'No user associated with this log.');
      return;
    }

    const userName = targetLog.performedBy.name;
    const userId = targetLog.performedBy._id;

    // Filter logs for this specific user from the full logs set
    const userLogs = logs.filter(l => 
      (userId && l.performedBy?._id === userId) || 
      (l.performedBy?.name === userName)
    );

    if (userLogs.length === 0) {
      Alert.alert('Info', 'No additional activity found for this user.');
      return;
    }

    const headers = ['Action', 'User', 'Role', 'Entity', 'Status', 'IP', 'Timestamp'];
    const rows = userLogs.map(l => [
      l.action, l.performedBy?.name || 'System', l.role, l.entity, l.status, l.ipAddress, l.createdAt ? `[${format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss')}]` : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    await exportFile(csv, `audit_activity_${userName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`, 'text/csv');
  };

  const applyFilters = () => { setActionFilter(tempFilters.action); setStatusFilter(tempFilters.status); setShowFilters(false); };
  const resetFilters = () => { setTempFilters({ action: '', status: '' }); setActionFilter(''); setStatusFilter(''); setSearchQuery(''); };

  const activeFilterCount = (actionFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  return (
    <>
      <Layout
        title="Audit Logs"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
        onRefresh={onRefresh}
        scrollable={false}
      >
        {/* Search and Filter Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by action, user, entity..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} color={activeFilterCount > 0 ? '#6366f1' : '#64748b'} />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportCSV}
            >
              <Download size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>



        {/* Logs list */}
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Shield size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No audit logs found</Text>
            <Text style={styles.emptyText}>Actions you perform will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
            renderItem={({ item }) => <AuditLogCard log={item} onPress={() => setSelectedLog(item)} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            ListHeaderComponent={
              showFilters ? (
                <View style={styles.filterPanel}>
                  <View style={styles.filterField}>
                    <Text style={styles.filterLabel}>Action</Text>
                    <TouchableOpacity style={styles.filterSelectButton} onPress={() => { setShowActionDropdown(true); }}>
                      <Text style={[styles.filterSelectText, !tempFilters.action && { color: '#94a3b8' }]}>{actionOptions.find(a => a.value === tempFilters.action)?.label || 'All Actions'}</Text>
                      <ChevronDown size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.filterField}>
                    <Text style={styles.filterLabel}>Status</Text>
                    <TouchableOpacity style={styles.filterSelectButton} onPress={() => { setShowStatusDropdown(true); }}>
                      <Text style={[styles.filterSelectText, !tempFilters.status && { color: '#94a3b8' }]}>{statusOptions.find(s => s.value === tempFilters.status)?.label || 'All Statuses'}</Text>
                      <ChevronDown size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity style={styles.filterClear} onPress={resetFilters}>
                      <Text style={styles.filterClearText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterApply} onPress={applyFilters}>
                      <Text style={styles.filterApplyText}>Apply Filters</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
            }
          />
        )}
      </Layout>

      {/* Modals */}
      <DropdownModal
        visible={showActionDropdown}
        onClose={() => setShowActionDropdown(false)}
        options={actionOptions}
        selectedValue={tempFilters.action}
        onSelect={(val: string) => setTempFilters(prev => ({ ...prev, action: val }))}
        title="Select Action"
      />
      <DropdownModal
        visible={showStatusDropdown}
        onClose={() => setShowStatusDropdown(false)}
        options={statusOptions}
        selectedValue={tempFilters.status}
        onSelect={(val: string) => setTempFilters(prev => ({ ...prev, status: val }))}
        title="Select Status"
      />
      <DetailModal 
        visible={!!selectedLog} 
        log={selectedLog} 
        onClose={() => setSelectedLog(null)} 
        onExport={handleExportCSV} 
        onExportUser={handleExportUserCSV}
      />
    </>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  searchContainer: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  filterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterButtonActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#6366f1', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  exportButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  filterPanel: { backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterField: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  filterSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10 },
  filterSelectText: { fontSize: 14, color: '#1e293b', flex: 1 },
  filterClear: { flex: 1, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  filterClearText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterApply: { flex: 2, paddingVertical: 10, backgroundColor: '#6366f1', borderRadius: 10, alignItems: 'center' },
  filterApplyText: { fontSize: 13, fontWeight: '600', color: 'white' },
  logCard: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  employeeName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  employeeId: { fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  actionContainer: {
    flexDirection: 'row',
  },
  cardDetails: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#475569' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  footerLeft: {
    flex: 1,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  actionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  actionText: { fontSize: 10, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#64748b', marginTop: 8 },
});

const dropdownStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  optionSelected: { backgroundColor: '#eef2ff' },
  optionText: { fontSize: 15, color: '#1e293b' },
  optionTextSelected: { color: '#6366f1', fontWeight: '600' },
  checkmark: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' },
});

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  banner: { margin: 20, padding: 20, borderRadius: 20 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  bannerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  bannerIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 16 },
  bannerFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  bannerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerInfoText: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 1, marginBottom: 12 },
  identityGrid: { flexDirection: 'row', gap: 12 },
  identityCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  identityLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  identityValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  identityRole: { fontSize: 10, color: '#6366f1', fontWeight: '600', marginTop: 4 },
  ipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ipText: { fontSize: 9, color: '#10b981', fontWeight: '600' },
  jsonContainer: { backgroundColor: '#0f172a', borderRadius: 16, overflow: 'hidden' },
  jsonHeader: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 8 },
  jsonLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
  jsonContent: { padding: 16, fontSize: 11, color: '#4ade80', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  exportUserButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 12,
  },
  exportUserButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
});