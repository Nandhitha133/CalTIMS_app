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
import PageHeader from '../../components/common/PageHeader';

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

const statusColors: Record<string, any> = {
  Open: { bg: '#eff6ff', text: '#2563eb' },
  'In Progress': { bg: '#fef3c7', text: '#d97706' },
  Pending: { bg: '#fffbeb', text: '#f59e0b' },
  Resolved: { bg: '#ecfdf5', text: '#10b981' },
  Closed: { bg: '#f1f5f9', text: '#64748b' },
  Withdrawn: { bg: '#fef2f2', text: '#ef4444' },
};

const priorityColors: Record<string, any> = {
  Low: { bg: '#ecfdf5', text: '#10b981' },
  Medium: { bg: '#eff6ff', text: '#2563eb' },
  High: { bg: '#fef3c7', text: '#d97706' },
  Urgent: { bg: '#fef2f2', text: '#ef4444' },
};

const extractData = (response: any, defaultValue: any = null): any => {
  if (!response) return defaultValue;
  // If the response is wrapped in { success: true, data: ... }
  if (response.data !== undefined && response.data !== null) {
    // If it's paginated or just a single object in .data
    return response.data;
  }
  return response;
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

  const getStatusBadge = (status: string) => {
    const colors = statusColors[status] || statusColors.Open;
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.text }]} />
        <Text style={[styles.statusText, { color: colors.text }]}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = priorityColors[priority] || priorityColors.Medium;
    return (
      <View style={[styles.priorityBadge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.priorityText, { color: colors.text }]}>{priority.toUpperCase()}</Text>
      </View>
    );
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
        <View style={styles.loaderContainer}>
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
            <PageHeader 
            title={`Ticket ${ticket?.incidentId || (ticket?._id || '').slice(-8)}`}
            subtitle="Incident Details"
            icon={AlertCircle}
            iconColor="#3b82f6"
            iconBgColor="#eff6ff"
          />

          <View style={styles.content}>
            {/* Ticket Header */}
            <View style={styles.ticketHeader}>
              {getStatusBadge(ticket?.status || 'Open')}
              {getPriorityBadge(ticket?.priority || 'Medium')}
            </View>

            <Text style={styles.ticketTitle}>{ticket?.title || 'No Title'}</Text>

            {/* Ticket Meta */}
            <View style={styles.metaContainer}>
              <View style={styles.metaItem}>
                <User size={14} color="#64748b" />
                <Text style={styles.metaText}>{ticket?.employee?.name || 'Unknown'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Calendar size={14} color="#64748b" />
                <Text style={styles.metaText}>{formatDate(ticket?.createdAt || '', 'MMM d, yyyy h:mm a')}</Text>
              </View>
              <View style={styles.metaItem}>
                <Tag size={14} color="#64748b" />
                <Text style={styles.metaText}>{ticket?.category || 'General'}</Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{ticket?.description || 'No Description'}</Text>
            </View>

            {/* Admin Status Controls */}
            {isAdmin && (
              <View style={styles.adminCard}>
                <View style={styles.adminHeader}>
                  <Text style={styles.adminTitle}>Admin Actions</Text>
                  <TouchableOpacity 
                    style={styles.statusMenuButton} 
                    onPress={() => setShowStatusMenu(!showStatusMenu)}
                  >
                    <MoreVertical size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
                {showStatusMenu && (
                  <View style={styles.statusMenu}>
                    {['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'].map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.statusMenuItem, ticket?.status === status && styles.statusMenuItemActive]}
                        onPress={() => handleStatusChange(status)}
                      >
                        <Text style={[styles.statusMenuItemText, ticket?.status === status && styles.statusMenuItemTextActive]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Employee Action Buttons */}
            {showWithdraw && (
              <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
                <XCircle size={16} color="#ef4444" />
                <Text style={styles.withdrawButtonText}>Withdraw Ticket</Text>
              </TouchableOpacity>
            )}
            {showReopen && (
              <TouchableOpacity style={styles.reopenButton} onPress={handleReopen}>
                <CheckCircle size={16} color="#10b981" />
                <Text style={styles.reopenButtonText}>Reopen Ticket</Text>
              </TouchableOpacity>
            )}

            {/* Conversation Thread */}
            <View style={styles.conversationCard}>
              <View style={styles.conversationHeader}>
                <MessageSquare size={18} color="#3b82f6" />
                <Text style={styles.conversationTitle}>Conversation</Text>
              </View>

              {ticket?.responses?.length === 0 ? (
                <Text style={styles.noReplies}>No replies yet.</Text>
              ) : (
                ticket?.responses?.map((response, idx) => {
                  const isMe = response?.user?._id === user?._id || response?.user?.id === user?.id;
                  const isAdminResponse = response?.user?.role === 'admin';
                  return (
                    <View key={idx} style={[styles.messageRow, isMe && styles.messageRowRight]}>
                      <View style={[styles.messageBubble, isMe ? styles.messageBubbleRight : styles.messageBubbleLeft]}>
                        <View style={styles.messageHeader}>
                          <Text style={styles.messageName}>{response?.user?.name || 'Unknown'}</Text>
                          {isAdminResponse && (
                            <Text style={styles.adminBadge}>Admin</Text>
                          )}
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

              {/* Reply Form */}
              {canReply && (
                <View style={styles.replyContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Type your reply..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    value={replyText}
                    onChangeText={setReplyText}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!replyText.trim() || isSubmitting) && styles.sendButtonDisabled]}
                    onPress={handleReply}
                    disabled={!replyText.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Send size={16} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {!canReply && ticket && (
                <View style={styles.closedMessage}>
                  <AlertCircle size={16} color="#f59e0b" />
                  <Text style={styles.closedMessageText}>
                    This ticket is {(ticket?.status || '').toLowerCase()}. You cannot add new replies.
                  </Text>
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
  content: { paddingHorizontal: 16, paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  errorText: { fontSize: 16, color: '#64748b', marginTop: 12, marginBottom: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe' },
  backButtonText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  
  ticketTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  
  metaContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748b' },
  
  descriptionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  descriptionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  descriptionText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  
  adminCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  adminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  adminTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  statusMenuButton: { padding: 4 },
  statusMenu: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8 },
  statusMenuItem: { paddingHorizontal: 16, paddingVertical: 10 },
  statusMenuItemActive: { backgroundColor: '#eff6ff', borderRadius: 8 },
  statusMenuItemText: { fontSize: 13, color: '#64748b' },
  statusMenuItemTextActive: { color: '#3b82f6', fontWeight: '600' },
  
  withdrawButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', paddingVertical: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#fee2e2' },
  withdrawButtonText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  reopenButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ecfdf5', paddingVertical: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#d1fae5' },
  reopenButtonText: { fontSize: 13, fontWeight: '600', color: '#10b981' },
  
  conversationCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  conversationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  conversationTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  noReplies: { textAlign: 'center', color: '#94a3b8', paddingVertical: 24 },
  
  messageRow: { marginBottom: 16 },
  messageRowRight: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  messageBubbleLeft: { backgroundColor: '#f1f5f9', borderTopLeftRadius: 4 },
  messageBubbleRight: { backgroundColor: '#3b82f6', borderTopRightRadius: 4 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  messageName: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  adminBadge: { fontSize: 9, fontWeight: '700', color: '#3b82f6', backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  messageTime: { fontSize: 9, color: '#94a3b8' },
  messageText: { fontSize: 13, lineHeight: 18, color: '#1e293b' },
  
  replyContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  replyInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  closedMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', padding: 12, borderRadius: 12, marginTop: 16 },
  closedMessageText: { fontSize: 12, color: '#d97706', flex: 1 },
});