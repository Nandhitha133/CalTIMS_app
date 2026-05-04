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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
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
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';

// Types
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

interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
  };
}

// Dropdown Modal Component
const DropdownModal = memo(({ 
  visible, 
  onClose, 
  options, 
  selectedValue, 
  onSelect,
  title 
}: { 
  visible: boolean; 
  onClose: () => void; 
  options: { value: string; label: string }[]; 
  selectedValue: string; 
  onSelect: (value: string) => void;
  title: string;
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={dropdownStyles.overlay}>
      <View style={dropdownStyles.container}>
        <View style={dropdownStyles.header}>
          <Text style={dropdownStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={dropdownStyles.closeButton}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                dropdownStyles.option,
                selectedValue === option.value && dropdownStyles.optionSelected
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={[
                dropdownStyles.optionText,
                selectedValue === option.value && dropdownStyles.optionTextSelected
              ]}>
                {option.label}
              </Text>
              {selectedValue === option.value && (
                <View style={dropdownStyles.checkmark} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
));

// Status Badge Component
const StatusBadge = memo(({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'SUCCESS':
        return { bg: '#ecfdf5', text: '#10b981', icon: CheckCircle2, label: 'SUCCESS' };
      case 'FAILED':
        return { bg: '#fef2f2', text: '#ef4444', icon: XCircle, label: 'FAILED' };
      case 'WARNING':
        return { bg: '#fffbeb', text: '#f59e0b', icon: AlertCircle, label: 'WARNING' };
      default:
        return { bg: '#eff6ff', text: '#3b82f6', icon: Info, label: 'INFO' };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Icon size={12} color={config.text} />
      <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
});

// Action Badge Component
const ActionBadge = memo(({ action }: { action: string }) => {
  const getActionConfig = () => {
    if (!action) return { bg: '#f1f5f9', text: '#64748b' };
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) 
      return { bg: '#fef2f2', text: '#ef4444' };
    if (action.includes('CREATE') || action.includes('ACTIVATE')) 
      return { bg: '#ecfdf5', text: '#10b981' };
    if (action.includes('LOGIN') || action.includes('LOGOUT')) 
      return { bg: '#eff6ff', text: '#3b82f6' };
    if (action.includes('PAYROLL')) 
      return { bg: '#eef2ff', text: '#6366f1' };
    if (action.includes('UPDATE') || action.includes('CHANGE')) 
      return { bg: '#fffbeb', text: '#f59e0b' };
    return { bg: '#f1f5f9', text: '#64748b' };
  };

  const config = getActionConfig();
  const displayAction = (action || '').replace(/_/g, ' ');

  return (
    <View style={[styles.actionBadge, { backgroundColor: config.bg }]}>
      <FileText size={10} color={config.text} />
      <Text style={[styles.actionText, { color: config.text }]}>{displayAction}</Text>
    </View>
  );
});

// Audit Log Card Component for mobile
const AuditLogCard = memo(({ log, onPress }: { log: AuditLog; onPress: () => void }) => (
  <TouchableOpacity style={styles.logCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardHeader}>
      <ActionBadge action={log.action} />
      <StatusBadge status={log.status} />
    </View>
    
    <View style={styles.cardBody}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(log.performedBy?.name || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.userName}>{log.performedBy?.name || 'System'}</Text>
          <Text style={styles.userRole}>{log.role}</Text>
        </View>
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <LayoutIcon size={14} color="#64748b" />
          <Text style={styles.detailText}>{log.entity || '—'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={14} color="#64748b" />
          <Text style={styles.detailText}>
            {log.createdAt ? format(new Date(log.createdAt), 'MMM d, h:mm a') : '—'}
          </Text>
        </View>
      </View>
    </View>
    
    <View style={styles.cardFooter}>
      <ChevronRight size={16} color="#94a3b8" />
    </View>
  </TouchableOpacity>
));

// Detail Modal Component
const DetailModal = memo(({ 
  visible, 
  log, 
  onClose, 
  onExport,
  onNavigateToForm
}: { 
  visible: boolean; 
  log: AuditLog | null; 
  onClose: () => void; 
  onExport: () => void;
  onNavigateToForm: (log: AuditLog) => void;
}) => {
  if (!log) return null;

  // Helper to check if a navigation link should be rendered
  const canNavigateToForm = useMemo(() => {
    if (!log.entity) return false;
    const action = log.action || '';
    // Don't show links for delete actions as the form won't exist
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) return false;
    
    return ['EMPLOYEE', 'USER', 'PROJECT', 'TASK', 'TIMESHEET'].includes(log.entity.toUpperCase());
  }, [log]);

  const getBannerColor = () => {
    switch (log.status) {
      case 'SUCCESS': return '#6366f1';
      case 'FAILED': return '#e11d48';
      case 'WARNING': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getBannerShadow = () => {
    switch (log.status) {
      case 'SUCCESS': return '#6366f120';
      case 'FAILED': return '#e11d4820';
      case 'WARNING': return '#f59e0b20';
      default: return '#3b82f620';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={detailStyles.overlay}>
        <View style={detailStyles.container}>
          <View style={detailStyles.header}>
            <View style={detailStyles.headerLeft}>
              <Shield size={20} color="#6366f1" />
              <Text style={detailStyles.title}>Audit Detail</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={detailStyles.closeButton}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Banner */}
            <View style={[detailStyles.banner, { backgroundColor: getBannerColor(), shadowColor: getBannerShadow() }]}>
              <View style={detailStyles.bannerHeader}>
                <View>
                  <Text style={detailStyles.bannerLabel}>ACTIVITY</Text>
                  <Text style={detailStyles.bannerTitle}>
                    {(log.action || '').replace(/_/g, ' ')}
                  </Text>
                </View>
                <View style={detailStyles.bannerIcon}>
                  <FileText size={24} color="white" />
                </View>
              </View>
              <View style={detailStyles.bannerFooter}>
                <View style={detailStyles.bannerInfo}>
                  <Clock size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={detailStyles.bannerInfoText}>
                    {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy h:mm:ss a') : '—'}
                  </Text>
                </View>
                {log.entity && (
                  <>
                    <View style={detailStyles.divider} />
                    <View style={detailStyles.bannerInfo}>
                      <LayoutIcon size={12} color="rgba(255,255,255,0.6)" />
                      <Text style={detailStyles.bannerInfoText}>{log.entity}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Identity Section */}
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
                  <View style={detailStyles.ipBadge}>
                    <Shield size={8} color="#10b981" />
                    <Text style={detailStyles.ipText}>Logged</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Metadata Section */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <View style={detailStyles.section}>
                <Text style={detailStyles.sectionTitle}>ACTION PAYLOAD</Text>
                <View style={detailStyles.jsonContainer}>
                  <View style={detailStyles.jsonHeader}>
                    <Text style={detailStyles.jsonLabel}>JSON</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <Text style={detailStyles.jsonContent}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={detailStyles.footer}>
            {canNavigateToForm && (
              <TouchableOpacity 
                style={[detailStyles.exportButton, { backgroundColor: '#eef2ff', borderColor: '#6366f1' }]} 
                onPress={() => onNavigateToForm(log)}
              >
                <ArrowRight size={16} color="#6366f1" />
                <Text style={[detailStyles.exportButtonText, { color: '#6366f1' }]}>View Related Record</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={detailStyles.exportButton} onPress={onExport}>
              <Download size={16} color="#1e293b" />
              <Text style={detailStyles.exportButtonText}>Export All Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Main Component
export default function AuditLogScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({ action: '', status: '' });
  
  // Dropdown states
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [dropdownContext, setDropdownContext] = useState<'action' | 'status'>('action');

  // Action options
  const actionOptions = useMemo(() => [
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
  ], []);

  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    { value: 'SUCCESS', label: 'Success' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'WARNING', label: 'Warning' },
  ], []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchLogs();
    }, [actionFilter, statusFilter])
  );

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

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (statusFilter) params.status = statusFilter;
      
      const response = await auditAPI.getAll(params);
      const data = (response as any)?.data as AuditLogResponse;
      setLogs(data?.data || []);
      setTotal(data?.total || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      Alert.alert('Error', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  // Client-side search filter
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.action?.toLowerCase().includes(query) ||
      log.performedBy?.name?.toLowerCase().includes(query) ||
      log.entity?.toLowerCase().includes(query) ||
      log.role?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  const handleExportCSV = async () => {
    try {
      const headers = ['Action', 'User', 'Role', 'Entity', 'Status', 'IP Address', 'Timestamp'];
      const rows = filteredLogs.map(log => [
        log.action || '',
        log.performedBy?.name || 'System',
        log.role || '',
        log.entity || '',
        log.status || '',
        log.ipAddress || '',
        log.createdAt ? new Date(log.createdAt).toISOString() : '',
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      if (Platform.OS === 'web') {
        const globalAny = globalThis as any;
        const blob = new globalAny.Blob([csvContent], { type: 'text/csv' });
        const url = globalAny.URL.createObjectURL(blob);
        const a = globalAny.document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        a.click();
        globalAny.URL.revokeObjectURL(url);
      } else {
        const downloadPath = Platform.OS === 'android'
          ? RNFS.DownloadDirectoryPath
          : RNFS.DocumentDirectoryPath;
        const fileName = `audit_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
        const filePath = `${downloadPath}/${fileName}`;
        
        await RNFS.writeFile(filePath, csvContent, 'utf8');
        
        const shareOptions: any = {
          title: 'Export Audit Logs',
          message: `Audit logs exported to ${fileName}`,
        };
        
        if (Platform.OS === 'ios') {
          shareOptions.url = `file://${filePath}`;
        }
        
        await Share.share(shareOptions);
      }
      Alert.alert('Success', 'Audit logs exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const openDropdown = (type: 'action' | 'status') => {
    setDropdownContext(type);
    if (type === 'action') setShowActionDropdown(true);
    else setShowStatusDropdown(true);
  };

  const handleActionSelect = (action: string) => {
    setTempFilters(prev => ({ ...prev, action }));
  };

  const handleStatusSelect = (status: string) => {
    setTempFilters(prev => ({ ...prev, status }));
  };

  const applyFilters = () => {
    setActionFilter(tempFilters.action);
    setStatusFilter(tempFilters.status);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setTempFilters({ action: '', status: '' });
    setActionFilter('');
    setStatusFilter('');
    setSearchQuery('');
  };

  const getActionDisplayValue = (action: string) => {
    return actionOptions.find(a => a.value === action)?.label || 'All Actions';
  };

  const getStatusDisplayValue = (status: string) => {
    return statusOptions.find(s => s.value === status)?.label || 'All Statuses';
  };

  const handleNavigateToForm = (log: AuditLog) => {
    const entity = log.entity?.toUpperCase();
    setSelectedLog(null); // Close modal first
    
    switch (entity) {
      case 'EMPLOYEE':
      case 'USER':
        navigation.navigate('Employees');
        break;
      case 'PROJECT':
        navigation.navigate('Projects');
        break;
      case 'TASK':
        navigation.navigate('Tasks');
        break;
      case 'TIMESHEET':
        navigation.navigate('ManageTimesheets');
        break;
      default:
        Alert.alert('Info', `Navigation to ${entity} screens is not yet configured.`);
    }
  };

  const activeFilterCount = (actionFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <Layout
        title="Audit Logs"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Header Stats */}
      <PageHeader 
        title="Audit Logs"
        subtitle={`Real-time system activity — ${total} total events`}
        icon={Shield}
        iconColor="#6366f1"
        iconBgColor="#eef2ff"
        subtitleIcon={Clock}
      />

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
            
            <TouchableOpacity
              style={[styles.filterButton, (showFilters || activeFilterCount > 0) && styles.filterButtonActive]}
              onPress={() => {
                if (!showFilters) {
                  setTempFilters({ action: actionFilter, status: statusFilter });
                }
                setShowFilters(!showFilters);
              }}
            >
              <Filter size={16} color={showFilters || activeFilterCount > 0 ? '#6366f1' : '#64748b'} />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
              <Download size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Filter Panel */}
          {showFilters && (
            <View style={styles.filterPanel}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filter By</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={resetFilters}>
                    <Text style={styles.filterResetText}>Reset All</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Action</Text>
                <TouchableOpacity 
                  style={styles.filterSelectButton}
                  onPress={() => openDropdown('action')}
                >
                  <Text style={[styles.filterSelectText, !tempFilters.action && styles.placeholderText]}>
                    {getActionDisplayValue(tempFilters.action)}
                  </Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Status</Text>
                <TouchableOpacity 
                  style={styles.filterSelectButton}
                  onPress={() => openDropdown('status')}
                >
                  <Text style={[styles.filterSelectText, !tempFilters.status && styles.placeholderText]}>
                    {getStatusDisplayValue(tempFilters.status)}
                  </Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.filterClear} onPress={() => setTempFilters({ action: '', status: '' })}>
                  <Text style={styles.filterClearText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterApply} onPress={applyFilters}>
                  <Text style={styles.filterApplyText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Logs List */}
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Shield size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No audit logs found</Text>
              <Text style={styles.emptyText}>Actions you perform will appear here</Text>
            </View>
          ) : (
            <>
              {filteredLogs.map(log => (
                <AuditLogCard
                  key={log._id}
                  log={log}
                  onPress={() => setSelectedLog(log)}
                />
              ))}
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>
                  Showing {filteredLogs.length} of {total} logs
                </Text>
              </View>
          </>
        )}
    </Layout>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showActionDropdown}
        onClose={() => setShowActionDropdown(false)}
        options={actionOptions}
        selectedValue={tempFilters.action}
        onSelect={handleActionSelect}
        title="Select Action"
      />

      <DropdownModal
        visible={showStatusDropdown}
        onClose={() => setShowStatusDropdown(false)}
        options={statusOptions}
        selectedValue={tempFilters.status}
        onSelect={handleStatusSelect}
        title="Select Status"
      />

      {/* Detail Modal */}
      <DetailModal
        visible={!!selectedLog}
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onExport={handleExportCSV}
        onNavigateToForm={handleNavigateToForm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingTop: 130, paddingBottom: 100 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  
  searchContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  filterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterButtonActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#6366f1', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  exportButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  
  filterPanel: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filterTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  filterResetText: { fontSize: 11, fontWeight: '600', color: '#6366f1' },
  filterField: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  filterSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 10 },
  filterSelectText: { fontSize: 14, color: '#1e293b', flex: 1 },
  placeholderText: { color: '#94a3b8' },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  filterClear: { flex: 1, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  filterClearText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterApply: { flex: 2, paddingVertical: 10, backgroundColor: '#6366f1', borderRadius: 10, alignItems: 'center' },
  filterApplyText: { fontSize: 13, fontWeight: '600', color: 'white' },
  
  logCard: { backgroundColor: 'white', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardBody: { gap: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  userName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  userRole: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cardDetails: { flexDirection: 'row', gap: 16, paddingTop: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#475569' },
  cardFooter: { alignItems: 'flex-end', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  actionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  actionText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' },
  
  totalContainer: { paddingVertical: 16, alignItems: 'center' },
  totalText: { fontSize: 12, color: '#64748b' },
});

const dropdownStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  closeButton: { padding: 4 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
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
  closeButton: { padding: 4 },
  
  banner: { margin: 20, padding: 20, borderRadius: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
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
  
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  exportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12 },
  exportButtonText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
});