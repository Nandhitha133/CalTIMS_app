// screens/incidents/IncidentListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import {
  AlertCircle,
  Filter,
  Plus,
  Search,
  LifeBuoy,
  ShieldAlert,
  Trash2,
  MoreVertical,
  X,
  Eye,
  Send,
  CheckCircle,
  ChevronDown,
} from 'lucide-react-native';
import { incidentService, supportService } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import DropdownModal from '../../components/common/DropdownModal';

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

const MOCK_INCIDENTS: Incident[] = [
  {
    _id: 'mock-1',
    incidentId: 'INC-0001',
    title: 'missing timesheet',
    description: 'i forgot to fill timesheet .',
    category: 'INCORRECT HOURS',
    priority: 'Low',
    status: 'Open',
    createdAt: '2026-05-04T10:00:00.000Z',
  },
];

const MOCK_SUPPORT: SupportTicket[] = [
  {
    _id: 'mock-s1',
    ticketId: 'SUP-0001',
    name: 'John Doe',
    email: 'john@example.com',
    issueType: 'Technical',
    status: 'Open',
    message: 'Need help with login credentials.',
    createdAt: '2026-05-05T09:00:00.000Z',
  }
];

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
  // If the response is wrapped in { success: true, data: ... }
  if (response.data !== undefined && response.data !== null) {
    // If it's paginated { data: { data: [], pagination: {} } }
    if (response.data.data !== undefined) return response.data;
    // If it's just { data: [] }
    return response.data;
  }
  return response;
};

export default function IncidentListScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(MOCK_SUPPORT);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(MOCK_INCIDENTS.length);
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.id !== user?.id || parsed.role !== user?.role) {
          setUser(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = async () => {
    try {
      // Don't block the UI if we already have mock data
      if (incidents.length <= 1 && incidents[0]?.incidentId === 'INC-0001') {
        // Initial load, keep it quiet
      } else {
        setLoading(true);
      }

      const filters: Record<string, any> = { page, limit };
      if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
      if (statusFilter !== 'All') filters.status = statusFilter;
      if (activeTab === 'incidents' && priorityFilter !== 'All') filters.priority = priorityFilter;

      if (activeTab === 'incidents') {
        const response = await incidentService.getIncidents(filters);
        const extracted = extractData(response);
        
        // Handle both { data: [], pagination: {} } and just []
        const dataList = Array.isArray(extracted) ? extracted : (extracted?.data || []);
        const pagination = !Array.isArray(extracted) ? extracted?.pagination : null;

        // Always update state if request was successful, even if list is empty
        setIncidents(dataList);
        setTotalPages(pagination?.totalPages || 1);
        setTotalResults(pagination?.total || dataList.length);
      } else if (isAdmin) {
        const response = await supportService.getTickets(filters);
        const extracted = extractData(response);
        
        const dataList = Array.isArray(extracted) ? extracted : (extracted?.data || []);
        const pagination = !Array.isArray(extracted) ? extracted?.pagination : null;

        setSupportTickets(dataList);
        setTotalPages(pagination?.totalPages || 1);
        setTotalResults(pagination?.total || dataList.length);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fail silently to keep mock data visible
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeTab, page, debouncedSearchQuery, statusFilter, priorityFilter, isAdmin])
  );

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
      // Map category and priority to ensure they match backend exactly
      // Remote backend only accepts: [timesheet error, project missing, incorrect hours, leave conflict, general help]
      const categoryMap: any = {
        'General': 'general help',
        'Technical': 'general help',
        'Billing': 'general help',
        'Feature Request': 'general help',
        'Other': 'general help'
      };
      
      const priorityMap: any = {
        'Low': 'Low',
        'Medium': 'Medium',
        'High': 'High',
        'Urgent': 'Urgent'
      };

      const submissionData = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: categoryMap[form.category] || 'general help',
        priority: priorityMap[form.priority] || 'Medium',
      };
      
      console.log('Submitting incident to backend with exact mapping:', submissionData);
      
      const response = await incidentService.createIncident(submissionData);
      console.log('Backend response:', response);
      
      Alert.alert('Success', 'Incident reported successfully');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Incident Creation Error Detail:', {
        status: error.status,
        data: error.data,
        message: error.message
      });
      
      // Extract the most useful error message
      let errorMessage = 'Validation failed. Please check all fields.';
      
      if (error.data) {
        if (error.data.errors && Array.isArray(error.data.errors) && error.data.errors.length > 0) {
          // Join all validation error messages
          errorMessage = error.data.errors.map((e: any) => e.message).join('\n');
        } else if (error.data.message) {
          errorMessage = error.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
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
    setTempStatusFilter('All');
    setTempPriorityFilter('All');
    setPage(1);
  };

  const applyFilters = () => {
    setStatusFilter(tempStatusFilter);
    setPriorityFilter(tempPriorityFilter);
    setShowFilterModal(false);
    setPage(1);
  };

  const activeFilterCount = (searchQuery ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0) + (activeTab === 'incidents' && priorityFilter !== 'All' ? 1 : 0);

  const renderFilters = () => (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <View style={styles.filterTitleContainer}>
          <Filter size={18} color="#64748b" />
          <View>
            <Text style={styles.filterTitle}>FILTER PIPELINE</Text>
            <Text style={styles.filterSubtitle}>REFINE RESULTS BY PARAMETERS</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => {
            setSearchQuery('');
            setDebouncedSearchQuery('');
            setStatusFilter('All');
            setPriorityFilter('All');
            setPage(1);
          }}
        >
          <Text style={styles.resetText}>RESET FILTERS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterGrid}>
        <View style={styles.filterField}>
          <Text style={styles.filterLabel}>SEARCH ID / CONTEXT</Text>
          <View style={styles.filterInputContainer}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              style={styles.filterInput}
              placeholder="Search INC-XXXX"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={[styles.filterField, { flex: 1 }]}>
            <Text style={styles.filterLabel}>STATUS PROTOCOL</Text>
            <TouchableOpacity 
              style={styles.pickerWrapper}
              onPress={() => setShowStatusDropdown(true)}
            >
              <View style={styles.dropdownTrigger}>
                <Text style={styles.dropdownValue}>{statusFilter}</Text>
                <ChevronDown size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>

          {activeTab === 'incidents' && (
            <View style={[styles.filterField, { flex: 1 }]}>
              <Text style={styles.filterLabel}>SEVERITY LEVEL</Text>
              <TouchableOpacity 
                style={styles.pickerWrapper}
                onPress={() => setShowPriorityDropdown(true)}
              >
                <View style={styles.dropdownTrigger}>
                  <Text style={styles.dropdownValue}>{priorityFilter}</Text>
                  <ChevronDown size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const IncidentCard = ({ incident }: { incident: Incident }) => {
    const priorityColors = getPriorityColor(incident?.priority || 'Low');
    const statusColors = getStatusColor(incident?.status || 'Open');
    const employeeName = incident?.employee?.user?.name || incident?.employee?.name || 'Unknown';

    const handleView = () => {
      const id = incident?._id || incident?.id;
      if (id) {
        navigation.navigate('IncidentDetails', { id });
      } else {
        Alert.alert('Error', 'Unable to open incident details');
      }
    };

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={handleView}
      >
        <View style={styles.ticketContent}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketId}>{incident?.incidentId || (incident?._id || '').slice(-8)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColors.text }]} />
              <Text style={[styles.statusText, { color: statusColors.text }]}>{(incident?.status || 'UNKNOWN').toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.ticketBody}>
            <View style={styles.titleSection}>
              <Text style={styles.ticketTitle}>{incident?.title || 'No Title'}</Text>
              <Text style={styles.ticketDescription} numberOfLines={1}>{incident?.description || 'No Description'}</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>CLASSIFICATION</Text>
              <Text style={styles.detailValue}>{(incident?.category || 'GENERAL').toUpperCase()}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>PRIORITY</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColors.bg }]}>
                <Text style={[styles.priorityText, { color: priorityColors.text }]}>{(incident?.priority || 'LOW').toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.ticketDivider} />

          <View style={styles.ticketFooter}>
            <View style={styles.footerInfo}>
              {isAdmin && (
                <View style={styles.employeeBadge}>
                  <Text style={styles.employeeText}>{employeeName}</Text>
                </View>
              )}
              <Text style={styles.ticketDate}>{formatDate(incident?.createdAt, 'MMM d, yyyy').toUpperCase()}</Text>
            </View>
            <View style={styles.viewAction}>
              <Eye size={16} color="#94a3b8" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const SupportTicketCard = ({ ticket }: { ticket: SupportTicket }) => {
    const statusColors = getStatusColor(ticket?.status || 'Open');
    const [showMenu, setShowMenu] = useState(false);

    const handleView = () => {
      const id = ticket?._id || ticket?.id;
      if (id) {
        navigation.navigate('IncidentDetails', { id, type: 'support' });
      } else {
        Alert.alert('Error', 'Unable to open support ticket details');
      }
    };

    return (
      <View style={styles.ticketCard}>
        <TouchableOpacity
          style={styles.ticketContent}
          onPress={handleView}
        >
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketId}>{ticket?.ticketId || (ticket?._id || '').slice(-8)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColors.text }]} />
              <Text style={[styles.statusText, { color: statusColors.text }]}>{(ticket?.status || 'UNKNOWN').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.ticketBody}>
            <View style={styles.titleSection}>
              <Text style={styles.ticketTitle}>{ticket?.name || 'No Name'}</Text>
              <Text style={styles.ticketSubtitle}>{ticket?.email || ''}</Text>
              <Text style={styles.ticketDescription} numberOfLines={1}>{ticket?.message || 'No Message'}</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>ISSUE TYPE</Text>
              <Text style={styles.detailValue}>{(ticket?.issueType || 'SUPPORT').toUpperCase()}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>CREATED ON</Text>
              <Text style={styles.detailValue}>{formatDate(ticket?.createdAt, 'MMM d, yyyy').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.ticketDivider} />

          <View style={styles.ticketFooter}>
            <View style={styles.footerInfo}>
              <Text style={styles.ticketDate}>{formatDate(ticket?.createdAt, 'MMM d, yyyy h:mm a').toUpperCase()}</Text>
            </View>
            <View style={styles.viewAction}>
              <Eye size={16} color="#94a3b8" />
            </View>
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
                    style={[styles.menuItem, ticket?.status === status && styles.menuItemActive]}
                    onPress={() => {
                      ticket?._id && handleUpdateSupportStatus(ticket._id, status as any);
                      setShowMenu(false);
                    }}
                  >
                    <View style={[styles.menuDot, { backgroundColor: getStatusColor(status).text }]} />
                    <Text style={[styles.menuItemText, ticket?.status === status && styles.menuItemTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={() => {
                    setShowMenu(false);
                    ticket?._id && handleDeleteSupportTicket(ticket._id);
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

  const renderFilterModal = () => (
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

  const renderCreateIncidentModal = () => (
    <Modal visible={showCreateModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingHorizontal: 20, paddingTop: 20 }]}>
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
                  {['General', 'Technical', 'Billing', 'Feature Request', 'Other'].map(cat => (
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

  const formatDate = (dateString: string | undefined, formatStr: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'INVALID DATE';
      return format(date, formatStr);
    } catch (error) {
      return 'DATE ERROR';
    }
  };

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
      <View style={styles.container}>
        <PageHeader
          title="My Incidents"
          subtitle="Manage internal incidents and support requests"
          rightElement={
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Plus size={20} color="white" />
              <Text style={styles.createButtonText}>Report Issue</Text>
            </TouchableOpacity>
          }
        />

        {loading && !refreshing ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
            }
          >
            {isAdmin && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'incidents' && styles.tabActive]}
                  onPress={() => { setActiveTab('incidents'); resetFilters(); }}
                >
                  <ShieldAlert size={18} color={activeTab === 'incidents' ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.tabText, activeTab === 'incidents' && styles.tabTextActive]}>Internal Incidents</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'support' && styles.tabActive]}
                  onPress={() => { setActiveTab('support'); resetFilters(); }}
                >
                  <LifeBuoy size={18} color={activeTab === 'support' ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.tabText, activeTab === 'support' && styles.tabTextActive]}>Support Requests</Text>
                </TouchableOpacity>
              </View>
            )}

            {renderFilters()}

            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <View style={styles.listTitleContainer}>
                  <View style={styles.listIconContainer}>
                    {activeTab === 'incidents' ? <AlertCircle size={16} color="#3b82f6" /> : <LifeBuoy size={16} color="#3b82f6" />}
                  </View>
                  <Text style={styles.listTitle}>{activeTab === 'incidents' ? 'ACTIVE INCIDENTS' : 'SUPPORT QUEUE'}</Text>
                </View>
                <Text style={styles.totalRecords}>{totalResults} TOTAL RECORDS</Text>
              </View>

              <View style={styles.listContainer}>
                {currentItems.length === 0 ? (
                  <EmptyState 
                    title={activeTab === 'incidents' ? "No incidents found" : "No support tickets"} 
                    subtitle="All records are currently resolved or none match your filters."
                    icon={activeTab === 'incidents' ? CheckCircle : LifeBuoy}
                  />
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
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>

      {renderFilterModal()}
      {renderCreateIncidentModal()}

      <DropdownModal
        visible={showStatusDropdown}
        onClose={() => setShowStatusDropdown(false)}
        options={(activeTab === 'incidents' ? INCIDENT_STATUSES : SUPPORT_STATUSES).map(s => ({ label: s, value: s }))}
        selectedValue={statusFilter}
        onSelect={setStatusFilter}
        title="Select Status"
      />

      <DropdownModal
        visible={showPriorityDropdown}
        onClose={() => setShowPriorityDropdown(false)}
        options={PRIORITIES.map(p => ({ label: p, value: p }))}
        selectedValue={priorityFilter}
        onSelect={setPriorityFilter}
        title="Select Priority"
      />
    </Layout>
  );
}

const EmptyState = ({ title, subtitle, icon: Icon }: any) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Icon size={40} color="#cbd5e1" />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{subtitle}</Text>
  </View>
);

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

  listSection: { marginTop: 8 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  listTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listIconContainer: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', letterSpacing: 0.5 },
  totalRecords: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  listContainer: { gap: 16 },
  loaderContainer: { paddingVertical: 48, alignItems: 'center', gap: 16 },
  loaderText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  filterSection: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterTitle: { fontSize: 12, fontWeight: '800', color: '#1e293b', letterSpacing: 0.5 },
  filterSubtitle: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  resetText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  filterGrid: { gap: 16 },
  filterField: { gap: 6 },
  filterLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  filterInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 40, gap: 8 },
  filterInput: { flex: 1, fontSize: 13, color: '#1e293b' },
  filterRow: { flexDirection: 'row', gap: 12 },
  pickerWrapper: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', height: 40, justifyContent: 'center', paddingHorizontal: 12 },
  dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownValue: { fontSize: 13, color: '#1e293b', fontWeight: '500' },

  ticketCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  ticketContent: { flex: 1 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ticketId: { fontSize: 11, fontWeight: '800', color: '#3b82f6', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  
  ticketBody: { marginBottom: 16 },
  titleSection: { gap: 4 },
  ticketTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  ticketSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  ticketDescription: { fontSize: 13, color: '#475569', lineHeight: 18 },

  detailsRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  detailItem: { gap: 4 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  detailValue: { fontSize: 12, fontWeight: '600', color: '#334155' },

  ticketDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },
  
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  employeeBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  employeeText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  ticketDate: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  viewAction: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },

  menuContainer: { position: 'absolute', right: 8, top: 12 },
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
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
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