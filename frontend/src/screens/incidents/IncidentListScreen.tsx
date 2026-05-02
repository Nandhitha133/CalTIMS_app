// screens/incidents/IncidentListScreen.tsx
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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import {
  AlertCircle,
  Filter,
  XCircle,
  Plus,
  Search,
  LifeBuoy,
  ShieldAlert,
  Trash2,
  MoreVertical,
  X,
  ChevronDown,
  Eye,
  Send,
} from 'lucide-react-native';
import { incidentService, supportService } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';

// Types
interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Incident {
  _id: string;
  incidentId: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed' | 'Withdrawn';
  employee?: { user?: User; name?: string };
  createdAt: string;
}

interface SupportTicket {
  _id: string;
  ticketId: string;
  name: string;
  email: string;
  issueType: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  message: string;
  createdAt: string;
}

type TabType = 'incidents' | 'support';

const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Urgent'];
const SUPPORT_STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];
const INCIDENT_STATUSES = ['All', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Withdrawn'];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Urgent': return { bg: '#fef2f2', text: '#ef4444' };
    case 'High': return { bg: '#fff7ed', text: '#ea580c' };
    case 'Medium': return { bg: '#fffbeb', text: '#d97706' };
    case 'Low': return { bg: '#ecfdf5', text: '#10b981' };
    default: return { bg: '#f1f5f9', text: '#64748b' };
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Open': return { bg: '#eff6ff', text: '#2563eb' };
    case 'In Progress': return { bg: '#fef3c7', text: '#d97706' };
    case 'Pending': return { bg: '#fffbeb', text: '#f59e0b' };
    case 'Resolved': return { bg: '#ecfdf5', text: '#10b981' };
    case 'Closed': return { bg: '#f1f5f9', text: '#64748b' };
    case 'Withdrawn': return { bg: '#fef2f2', text: '#ef4444' };
    default: return { bg: '#f1f5f9', text: '#64748b' };
  }
};

// Helper to extract data from API response
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

export default function IncidentListScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const limit = 10;

  // Form state for creating incident
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState('All');
  const [tempPriorityFilter, setTempPriorityFilter] = useState('All');

  const isAdmin = user?.role === 'admin';

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchData();
    }, [activeTab, page, searchQuery, statusFilter, priorityFilter])
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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const filters: Record<string, any> = { page, limit };
      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'All') filters.status = statusFilter;
      if (activeTab === 'incidents' && priorityFilter !== 'All') filters.priority = priorityFilter;
      
      if (activeTab === 'incidents') {
        const response = await incidentService.getIncidents(filters);
        const data = extractData(response, { data: [], pagination: { totalPages: 1, total: 0 } });
        setIncidents(data?.data || []);
        setTotalPages(data?.pagination?.totalPages || 1);
        setTotalResults(data?.pagination?.total || 0);
      } else if (isAdmin) {
        const response = await supportService.getTickets(filters);
        const data = extractData(response, { data: [], pagination: { totalPages: 1, total: 0 } });
        setSupportTickets(data?.data || []);
        setTotalPages(data?.pagination?.totalPages || 1);
        setTotalResults(data?.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreateIncident = async () => {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await incidentService.createIncident(form);
      Alert.alert('Success', 'Incident reported successfully');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSupportStatus = async (id: string, status: string) => {
    try {
      await supportService.updateTicketStatus(id, status);
      Alert.alert('Success', 'Ticket status updated');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update status');
    }
  };

  const handleDeleteSupportTicket = async (id: string) => {
    Alert.alert(
      'Delete Ticket',
      'Are you sure you want to delete this support ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supportService.deleteTicket(id);
              Alert.alert('Success', 'Ticket deleted');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete ticket');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      category: 'General',
      priority: 'Medium',
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setPage(1);
  };

  const applyFilters = () => {
    setStatusFilter(tempStatusFilter);
    setPriorityFilter(tempPriorityFilter);
    setShowFilterModal(false);
    setPage(1);
  };

  const activeFilterCount = (searchQuery ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0) + (activeTab === 'incidents' && priorityFilter !== 'All' ? 1 : 0);

  const IncidentCard = ({ incident }: { incident: Incident }) => {
    const priorityColors = getPriorityColor(incident.priority);
    const statusColors = getStatusColor(incident.status);
    const employeeName = incident.employee?.user?.name || incident.employee?.name || 'Unknown';
    
    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => navigation.navigate('IncidentDetails', { id: incident._id })}
      >
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketId}>{incident.incidentId || incident._id.slice(-8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>{incident.status}</Text>
          </View>
        </View>
        <Text style={styles.ticketTitle}>{incident.title}</Text>
        <Text style={styles.ticketDescription} numberOfLines={2}>{incident.description}</Text>
        <View style={styles.ticketFooter}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColors.bg }]}>
            <Text style={[styles.priorityText, { color: priorityColors.text }]}>{incident.priority}</Text>
          </View>
          {isAdmin && (
            <Text style={styles.ticketEmployee}>{employeeName}</Text>
          )}
          <Text style={styles.ticketDate}>{format(new Date(incident.createdAt), 'MMM d, yyyy')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const SupportTicketCard = ({ ticket }: { ticket: SupportTicket }) => {
    const statusColors = getStatusColor(ticket.status);
    const [showMenu, setShowMenu] = useState(false);

    return (
      <View style={styles.ticketCard}>
        <TouchableOpacity
          style={styles.ticketContent}
          onPress={() => navigation.navigate('IncidentDetails', { id: ticket._id, type: 'support' })}
        >
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketId}>{ticket.ticketId || ticket._id.slice(-8)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>{ticket.status}</Text>
            </View>
          </View>
          <Text style={styles.ticketTitle}>{ticket.name}</Text>
          <Text style={styles.ticketSubtitle}>{ticket.email}</Text>
          <Text style={styles.ticketDescription} numberOfLines={2}>{ticket.message}</Text>
          <View style={styles.ticketFooter}>
            <Text style={styles.ticketCategory}>{ticket.issueType}</Text>
            <Text style={styles.ticketDate}>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</Text>
          </View>
        </TouchableOpacity>
        
        {isAdmin && (
          <View style={styles.menuContainer}>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
              <MoreVertical size={18} color="#64748b" />
            </TouchableOpacity>
            {showMenu && (
              <View style={styles.menuDropdown}>
                <Text style={styles.menuTitle}>Update Status</Text>
                {SUPPORT_STATUSES.filter(s => s !== 'All').map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.menuItem, ticket.status === status && styles.menuItemActive]}
                    onPress={() => {
                      handleUpdateSupportStatus(ticket._id, status as any);
                      setShowMenu(false);
                    }}
                  >
                    <View style={[styles.menuDot, { backgroundColor: getStatusColor(status).text }]} />
                    <Text style={[styles.menuItemText, ticket.status === status && styles.menuItemTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={() => {
                    setShowMenu(false);
                    handleDeleteSupportTicket(ticket._id);
                  }}
                >
                  <Trash2 size={14} color="#ef4444" />
                  <Text style={styles.menuItemDangerText}>Delete Ticket</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const handleUpdateSupportTicketStatus = async (id: string, status: string) => {
    try {
      await supportService.updateTicketStatus(id, status);
      Alert.alert('Success', 'Ticket status updated');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update status');
    }
  };

  const FilterModal = () => (
    <Modal visible={showFilterModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Tickets</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterContent}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.statusOptions}>
                {(activeTab === 'incidents' ? INCIDENT_STATUSES : SUPPORT_STATUSES).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusChip, tempStatusFilter === status && styles.statusChipActive]}
                    onPress={() => setTempStatusFilter(status)}
                  >
                    <Text style={[styles.statusChipText, tempStatusFilter === status && styles.statusChipTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {activeTab === 'incidents' && (
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Priority</Text>
                <View style={styles.priorityOptions}>
                  {PRIORITIES.map(priority => (
                    <TouchableOpacity
                      key={priority}
                      style={[styles.priorityChip, tempPriorityFilter === priority && styles.priorityChipActive]}
                      onPress={() => setTempPriorityFilter(priority)}
                    >
                      <Text style={[styles.priorityChipText, tempPriorityFilter === priority && styles.priorityChipTextActive]}>
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={() => {
              setTempStatusFilter('All');
              setTempPriorityFilter('All');
            }}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const CreateIncidentModal = () => (
    <Modal visible={showCreateModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report an Issue</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Title <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Brief summary of the issue"
                  placeholderTextColor="#94a3b8"
                  value={form.title}
                  onChangeText={(text) => setForm({ ...form, title: text })}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Description <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Please provide detailed information..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={5}
                  value={form.description}
                  onChangeText={(text) => setForm({ ...form, description: text })}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.categoryRow}>
                  {['General', 'Technical', 'Billing', 'Feature Request'].map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryButton, form.category === cat && styles.categoryButtonActive]}
                      onPress={() => setForm({ ...form, category: cat })}
                    >
                      <Text style={[styles.categoryText, form.category === cat && styles.categoryTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.filter(p => p !== 'All').map(pri => {
                    const colors = getPriorityColor(pri);
                    return (
                      <TouchableOpacity
                        key={pri}
                        style={[
                          styles.priorityButton,
                          form.priority === pri && { backgroundColor: colors.bg },
                        ]}
                        onPress={() => setForm({ ...form, priority: pri as any })}
                      >
                        <Text style={[
                          styles.modalPriorityText,
                          form.priority === pri && { color: colors.text },
                        ]}>
                          {pri}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={handleCreateIncident}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Send size={16} color="white" />
                    <Text style={styles.submitText}>Submit Incident</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing && !showCreateModal) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const currentItems = activeTab === 'incidents' ? incidents : supportTickets;

  return (
    <Layout
      title="Help & Support"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <PageHeader 
          title="Help & Support Center"
          subtitle="Track and manage support requests"
          icon={LifeBuoy}
          iconColor="#3b82f6"
          iconBgColor="#eff6ff"
          rightComponent={
            !isAdmin && (
              <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
                <Plus size={16} color="white" />
                <Text style={styles.createButtonText}>Report Issue</Text>
              </TouchableOpacity>
            )
          }
        />

        <View style={styles.content}>
          {/* Admin Tabs */}
          {isAdmin && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'incidents' && styles.tabActive]}
                onPress={() => { setActiveTab('incidents'); resetFilters(); setPage(1); }}
              >
                <ShieldAlert size={16} color={activeTab === 'incidents' ? '#3b82f6' : '#64748b'} />
                <Text style={[styles.tabText, activeTab === 'incidents' && styles.tabTextActive]}>Internal Incidents</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'support' && styles.tabActive]}
                onPress={() => { setActiveTab('support'); resetFilters(); setPage(1); }}
              >
                <LifeBuoy size={16} color={activeTab === 'support' ? '#3b82f6' : '#64748b'} />
                <Text style={[styles.tabText, activeTab === 'support' && styles.tabTextActive]}>Support Requests</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search and Filter Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder={activeTab === 'incidents' ? "Search INC-XXXX..." : "Search SUP-XXXX, Name..."}
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={fetchData}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <XCircle size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              onPress={() => {
                setTempStatusFilter(statusFilter);
                setTempPriorityFilter(priorityFilter);
                setShowFilterModal(true);
              }}
            >
              <Filter size={16} color={activeFilterCount > 0 ? '#3b82f6' : '#64748b'} />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Results Count */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>{totalResults} TOTAL RECORDS</Text>
          </View>

          {/* List */}
          {currentItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters</Text>
            </View>
          ) : (
            currentItems.map(item => (
              activeTab === 'incidents' 
                ? <IncidentCard key={item._id} incident={item as Incident} />
                : <SupportTicketCard key={item._id} ticket={item as SupportTicket} />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                onPress={() => { if (page > 1) { setPage(page - 1); } }}
                disabled={page === 1}
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                onPress={() => { if (page < totalPages) { setPage(page + 1); } }}
                disabled={page === totalPages}
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <FilterModal />
      <CreateIncidentModal />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  createButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, marginBottom: 16, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#3b82f6' },
  
  searchContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  filterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterButtonActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#3b82f6', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  
  resultsHeader: { marginBottom: 12, paddingHorizontal: 4 },
  resultsText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 },
  
  ticketCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row' },
  ticketContent: { flex: 1 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ticketId: { fontSize: 11, fontWeight: '700', color: '#3b82f6', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  ticketTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  ticketSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  ticketDescription: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 10 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontSize: 10, fontWeight: '600' },
  ticketCategory: { fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ticketEmployee: { fontSize: 11, color: '#64748b' },
  ticketDate: { fontSize: 11, color: '#94a3b8' },
  
  menuContainer: { position: 'relative' },
  menuButton: { padding: 6 },
  menuDropdown: { position: 'absolute', right: 0, top: 30, width: 160, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 100 },
  menuTitle: { fontSize: 10, fontWeight: '700', color: '#94a3b8', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  menuItemActive: { backgroundColor: '#eff6ff' },
  menuDot: { width: 6, height: 6, borderRadius: 3 },
  menuItemText: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  menuItemTextActive: { color: '#3b82f6', fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  menuItemDanger: { gap: 8 },
  menuItemDangerText: { fontSize: 12, fontWeight: '500', color: '#ef4444' },
  
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
  filterModal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalContent: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  
  filterContent: { gap: 20, marginBottom: 20 },
  filterField: { gap: 8 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  statusChipActive: { backgroundColor: '#3b82f6' },
  statusChipText: { fontSize: 12, color: '#64748b' },
  statusChipTextActive: { color: 'white' },
  
  priorityOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priorityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  priorityChipActive: { backgroundColor: '#3b82f6' },
  priorityChipText: { fontSize: 12, color: '#64748b' },
  priorityChipTextActive: { color: 'white' },
  
  resetButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  resetButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  applyButton: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  applyButtonText: { fontSize: 14, fontWeight: '600', color: 'white' },
  
  formField: { marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  required: { color: '#ef4444' },
  formInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },
  textArea: { height: 120, textAlignVertical: 'top' },
  
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  categoryButtonActive: { backgroundColor: '#3b82f6' },
  categoryText: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  categoryTextActive: { color: 'white' },
  
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalPriorityText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  disabledButton: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: '700', color: 'white' },
});