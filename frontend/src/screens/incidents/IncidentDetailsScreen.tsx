// screens/incidents/IncidentDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  User,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
} from 'lucide-react-native';
import { incidentService, supportService } from '../../services/endpoints';
import Layout from '../../components/common/Layout';

// Helper to extract data from various response formats
const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  // If the response is wrapped in { success: true, data: ... }
  if (response.data !== undefined && response.data !== null) {
    return response.data;
  }
  return response;
};

const statusColors: Record<string, { bg: string, text: string }> = {
  'Open': { bg: '#eff6ff', text: '#2563eb' },
  'In Progress': { bg: '#fef3c7', text: '#d97706' },
  'Pending': { bg: '#fffbeb', text: '#f59e0b' },
  'Resolved': { bg: '#ecfdf5', text: '#10b981' },
  'Closed': { bg: '#f1f5f9', text: '#64748b' },
  'Withdrawn': { bg: '#fef2f2', text: '#ef4444' },
};

interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Response {
  _id: string;
  message: string;
  user: User;
  createdAt: string;
}

interface Ticket {
  _id: string;
  incidentId: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed' | 'Withdrawn';
  employee: User;
  responses: Response[];
  createdAt: string;
  updatedAt: string;
}

const priorityColors: Record<string, any> = {
  Low: { bg: '#ecfdf5', text: '#10b981' },
  Medium: { bg: '#eff6ff', text: '#2563eb' },
  High: { bg: '#fef3c7', text: '#d97706' },
  Urgent: { bg: '#fef2f2', text: '#ef4444' },
};

export default function IncidentDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as { id: string, type?: 'incident' | 'support' } | undefined;
  const id = params?.id;
  const type = params?.type || 'incident';
  const [user, setUser] = useState<User | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isOwner = ticket?.employee?.id === user?.id || ticket?.employee?._id === user?._id;

  useEffect(() => {
    if (id) {
      loadUserData();
      fetchTicket();
    } else {
      setLoading(false);
    }
  }, [id]);

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

  const fetchTicket = async () => {
    try {
      setLoading(true);
      
      // Check for mock data first
      if (id === 'mock-1') {
        setTicket({
          _id: 'mock-1',
          incidentId: 'INC-0001',
          title: 'missing timesheet',
          description: 'i forgot to fill timesheet .',
          category: 'INCORRECT HOURS',
          priority: 'Low',
          status: 'Open',
          employee: { id: 'm1', _id: 'm1', name: 'Current User', email: 'user@example.com', role: 'employee' },
          responses: [],
          createdAt: '2026-05-04T10:00:00.000Z',
          updatedAt: '2026-05-04T10:00:00.000Z',
        });
        setLoading(false);
        return;
      }

      let response;
      if (type === 'support') {
        response = await supportService.getTicket(id!);
      } else {
        response = await incidentService.getById(id!);
      }
      
      const data = extractData(response);
      
      // Map support ticket to ticket interface if necessary
      if (type === 'support' && data) {
        setTicket({
          ...data,
          title: data.name || 'Support Ticket',
          description: data.message || '',
          category: data.issueType || 'Support',
          incidentId: data.ticketId || data._id?.slice(-8),
          priority: 'Medium', // Default for support tickets as they lack it
          employee: data.employee || data.user || data.createdBy,
        });
      } else {
        setTicket(data);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      Alert.alert('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await incidentService.addResponse(id!, replyText);
      setReplyText('');
      fetchTicket();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    setShowStatusMenu(false);
    try {
      if (type === 'support') {
        await supportService.updateTicketStatus(id!, newStatus);
      } else {
        await incidentService.updateIncident(id!, { status: newStatus });
      }
      fetchTicket();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Ticket',
      'Are you sure you want to withdraw this support ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: () => handleStatusChange('Withdrawn') },
      ]
    );
  };

  const handleReopen = () => {
    Alert.alert(
      'Reopen Ticket',
      'Do you want to reopen this support ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reopen', onPress: () => handleStatusChange('Open') },
      ]
    );
  };

  const formatDate = (dateString: string, formatStr: string) => {
    try {
      if (!dateString) return 'N/A';
      return format(new Date(dateString), formatStr);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };



  const canReply = ticket?.status !== 'Closed' && ticket?.status !== 'Withdrawn';
  const showWithdraw = !isAdmin && isOwner && ticket && ['Open', 'In Progress'].includes(ticket.status);
  const showReopen = !isAdmin && isOwner && ticket && ['Resolved', 'Closed', 'Withdrawn'].includes(ticket.status);

  return (
    <Layout
      title="Ticket Details"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={false}
      onRefresh={() => {}}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loaderText}>Loading ticket details...</Text>
        </View>
      ) : !id || !ticket ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>{!id ? 'Invalid Ticket ID' : 'Ticket not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={16} color="#3b82f6" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.mainContent}>
              <View style={styles.leftColumn}>
                {/* Main Ticket Info */}
                <View style={styles.ticketCard}>
                  <View style={styles.ticketHeaderRow}>
                    <Text style={styles.ticketTitleMain}>{ticket?.title || 'No Title'}</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: statusColors[ticket?.status || 'Open']?.bg }]}>
                      <View style={[styles.statusDotSmall, { backgroundColor: statusColors[ticket?.status || 'Open']?.text }]} />
                      <Text style={[styles.statusTextSmall, { color: statusColors[ticket?.status || 'Open']?.text }]}>{ticket?.status || 'Open'}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRowMain}>
                    <View style={styles.metaItemMain}>
                      <User size={14} color="#64748b" />
                      <Text style={styles.metaTextMain}>
                        {ticket?.employee?.user?.name || ticket?.employee?.name || (ticket as any)?.user?.name || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.metaItemMain}>
                      <Calendar size={14} color="#64748b" />
                      <Text style={styles.metaTextMain}>{formatDate(ticket?.createdAt || '', 'MMM d, yyyy h:mm a')}</Text>
                    </View>
                  </View>

                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionTextMain}>{ticket?.description || 'No Description'}</Text>
                  </View>
                </View>

                {/* Conversation Thread */}
                <View style={styles.conversationCardMain}>
                  <View style={styles.conversationHeaderMain}>
                    <MessageSquare size={18} color="#3b82f6" />
                    <Text style={styles.conversationTitleMain}>Conversation</Text>
                  </View>

                  <View style={styles.repliesContainer}>
                    {ticket?.responses?.length === 0 ? (
                      <Text style={styles.noRepliesMain}>No replies yet.</Text>
                    ) : (
                      ticket?.responses?.map((response, idx) => {
                        const isMe = response?.user?._id === user?._id || response?.user?.id === user?.id;
                        return (
                          <View key={idx} style={[styles.messageRow, isMe && styles.messageRowRight]}>
                            <View style={[styles.messageBubble, isMe ? styles.messageBubbleRight : styles.messageBubbleLeft]}>
                              <View style={styles.messageHeader}>
                                <Text style={styles.messageName}>{response?.user?.name || 'Unknown'}</Text>
                                <Text style={styles.messageTime}>
                                  {formatDate(response?.createdAt || '', 'MMM d, h:mm a')}
                                </Text>
                              </View>
                              <Text style={styles.messageText}>{response?.message || ''}</Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Reply Form */}
                  {canReply && (
                    <View style={styles.replyBoxContainer}>
                      <TextInput
                        style={styles.replyInputMain}
                        placeholder="Type your reply..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        value={replyText}
                        onChangeText={setReplyText}
                      />
                      <TouchableOpacity
                        style={[styles.sendButtonMain, (!replyText.trim() || isSubmitting) && styles.sendButtonDisabled]}
                        onPress={handleReply}
                        disabled={!replyText.trim() || isSubmitting}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#6366f1" />
                        ) : (
                          <Send size={18} color="#6366f1" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Sidebar Info (Ticket Info) */}
              <View style={styles.sidebarColumn}>
                <View style={styles.ticketInfoCard}>
                  <Text style={styles.sidebarTitle}>Ticket Info</Text>
                  
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>CATEGORY</Text>
                    <View style={styles.infoItemRow}>
                      <Tag size={16} color="#64748b" />
                      <Text style={styles.infoValue}>{ticket?.category || 'General Help'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>PRIORITY</Text>
                    <View style={styles.infoItemRow}>
                      <AlertCircle size={16} color="#64748b" />
                      <Text style={styles.infoValue}>{ticket?.priority || 'Medium'}</Text>
                    </View>
                  </View>

                  {showWithdraw && (
                    <TouchableOpacity style={styles.withdrawButtonSidebar} onPress={handleWithdraw}>
                      <Text style={styles.withdrawButtonTextSidebar}>Withdraw Ticket</Text>
                    </TouchableOpacity>
                  )}

                  {showReopen && (
                    <TouchableOpacity style={styles.reopenButtonSidebar} onPress={handleReopen}>
                      <Text style={styles.reopenButtonTextSidebar}>Reopen Ticket</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Admin Status Controls */}
                {isAdmin && (
                  <View style={styles.adminActionCard}>
                    <Text style={styles.sidebarTitle}>Admin Actions</Text>
                    <View style={styles.adminStatusOptions}>
                      {['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'].map(status => (
                        <TouchableOpacity
                          key={status}
                          style={[styles.statusOption, ticket?.status === status && styles.statusOptionActive]}
                          onPress={() => handleStatusChange(status)}
                        >
                          <Text style={[styles.statusOptionText, ticket?.status === status && styles.statusOptionTextActive]}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  errorText: { fontSize: 16, color: '#64748b', marginTop: 12, marginBottom: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe' },
  backButtonText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },

  mainContent: {
    padding: 16,
    flexDirection: 'column',
    gap: 20,
  },
  leftColumn: {
    flex: 1,
    gap: 20,
  },
  sidebarColumn: {
    width: '100%',
    gap: 20,
  },

  // Ticket Card
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTitleMain: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRowMain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaTextMain: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  descriptionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  descriptionTextMain: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },

  // Conversation
  conversationCardMain: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conversationHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  conversationTitleMain: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  repliesContainer: {
    marginBottom: 20,
  },
  noRepliesMain: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 15,
    paddingVertical: 30,
  },
  messageRow: { flexDirection: 'row', marginBottom: 16, width: '100%' },
  messageRowRight: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  messageBubbleLeft: { backgroundColor: '#f1f5f9', borderTopLeftRadius: 4 },
  messageBubbleRight: { backgroundColor: '#6366f1', borderTopRightRadius: 4 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 12 },
  messageName: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  messageTime: { fontSize: 10, color: '#94a3b8' },
  messageText: { fontSize: 14, color: '#1e293b', lineHeight: 20 },
  adminBadge: { fontSize: 10, fontWeight: '700', color: '#6366f1', backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  // Reply Box
  replyBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    paddingRight: 12,
    minHeight: 50,
  },
  replyInputMain: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    maxHeight: 120,
  },
  sendButtonMain: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Ticket Info Card
  ticketInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  withdrawButtonSidebar: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  withdrawButtonTextSidebar: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  reopenButtonSidebar: {
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  reopenButtonTextSidebar: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Admin Action Card
  adminActionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adminStatusOptions: {
    gap: 8,
  },
  statusOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
});