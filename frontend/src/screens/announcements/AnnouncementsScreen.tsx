import React, { useState, useEffect } from 'react';
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
  Switch,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import {
  Megaphone,
  Plus,
  X,
  Pencil,
  Trash2,
  Bell,
  AlertTriangle,
  Info,
  Users,
  Calendar,
  CheckCircle,
  ChevronRight,
} from 'lucide-react-native';
import { announcementAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  targetRoles: string[];
  isActive: boolean;
  expiresAt?: string;
  publishedBy?: { name: string };
  createdAt: string;
}

interface AnnouncementData {
  data: Announcement[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

const { width } = Dimensions.get('window');

const TYPE_CONFIG: Record<string, any> = {
  info: {
    label: 'Info',
    icon: Info,
    bg: '#eff6ff',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
    dot: '#3b82f6',
    gradient: ['#3b82f6', '#2563eb']
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    bg: '#fffbeb',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    dot: '#f59e0b',
    gradient: ['#f59e0b', '#d97706']
  },
  urgent: {
    label: 'Urgent',
    icon: Bell,
    bg: '#fef2f2',
    badgeBg: '#fee2e2',
    badgeText: '#991b1b',
    dot: '#ef4444',
    gradient: ['#ef4444', '#dc2626']
  },
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admins',
  manager: 'Managers',
  employee: 'Employees',
};

// --- Sub-components moved outside to prevent re-rendering/focus issues ---

const AnnouncementCard = ({ 
  announcement, 
  onEdit, 
  onDelete, 
  isExpired 
}: { 
  announcement: Announcement; 
  onEdit: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
  isExpired: (date?: string) => boolean;
}) => {
  const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const cfg = getTypeConfig(announcement.type);
  const TypeIcon = cfg.icon;
  const expired = isExpired(announcement.expiresAt);
  const isInactive = !announcement.isActive;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onEdit(announcement)}
      style={[
        styles.announcementCard,
        { borderLeftColor: cfg.dot },
        (isInactive || expired) && styles.inactiveCard
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: cfg.badgeBg }]}>
          <TypeIcon size={18} color={cfg.badgeText} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{announcement.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[styles.typeBadgeText, { color: cfg.badgeText }]}>{announcement.type}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            {!announcement.isActive && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Draft</Text>
              </View>
            )}
            {expired && (
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredBadgeText}>Expired</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardDescription} numberOfLines={3}>{announcement.content}</Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooter}>
            <View style={styles.metaInfo}>
              <View style={styles.authorAvatar}>
                <Text style={styles.authorInitial}>
                  {announcement.publishedBy?.name?.charAt(0) || 'S'}
                </Text>
              </View>
              <View>
                <Text style={styles.authorName}>{announcement.publishedBy?.name || 'System'}</Text>
                <Text style={styles.metaText}>{format(new Date(announcement.createdAt), 'MMM d, yyyy')}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => onEdit(announcement)} style={styles.actionBtn}>
                <Pencil size={14} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(announcement)} style={styles.actionBtn}>
                <Trash2 size={14} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.targetAudience}>
            <Users size={10} color="#94a3b8" />
            <Text style={styles.targetText}>
              {announcement.targetRoles && announcement.targetRoles.length > 0
                ? announcement.targetRoles.map(r => ROLE_LABELS[r]).join(', ')
                : 'Everyone'}
            </Text>
            {announcement.expiresAt && (
              <View style={styles.expiryInfo}>
                <Calendar size={10} color={expired ? '#ef4444' : '#94a3b8'} />
                <Text style={[styles.targetText, expired && styles.expiredText]}>
                  {format(new Date(announcement.expiresAt), 'MMM d')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const AnnouncementModal = ({
  visible,
  onClose,
  editTarget,
  form,
  setForm,
  onSubmit,
  isSubmitting,
  toggleRole,
}: {
  visible: boolean;
  onClose: () => void;
  editTarget: Announcement | null;
  form: any;
  setForm: (f: any) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  toggleRole: (role: string) => void;
}) => {
  const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.info;
  
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={[modalStyles.header, { borderTopColor: getTypeConfig(form.type).dot }]}>
            <View style={modalStyles.headerLeft}>
              <View style={[modalStyles.headerIcon, { backgroundColor: getTypeConfig(form.type).badgeBg }]}>
                <Megaphone size={16} color={getTypeConfig(form.type).badgeText} />
              </View>
              <Text style={modalStyles.title}>{editTarget ? 'Edit Announcement' : 'New Announcement'}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={modalStyles.form}>
              <View style={modalStyles.field}>
                <Text style={modalStyles.label}>Title <Text style={modalStyles.required}>*</Text></Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="e.g. Office Closure on Public Holiday"
                  placeholderTextColor="#94a3b8"
                  value={form.title}
                  onChangeText={(text) => setForm({ ...form, title: text })}
                />
              </View>

              <View style={modalStyles.field}>
                <Text style={modalStyles.label}>Content <Text style={modalStyles.required}>*</Text></Text>
                <TextInput
                  style={[modalStyles.input, modalStyles.textArea]}
                  placeholder="Write your announcement details here..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  value={form.content}
                  onChangeText={(text) => setForm({ ...form, content: text })}
                />
                <Text style={modalStyles.charCount}>{form.content.length}/5000</Text>
              </View>

              <View style={modalStyles.field}>
                <Text style={modalStyles.label}>Type</Text>
                <View style={modalStyles.typeRow}>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          modalStyles.typeButton,
                          form.type === key && { backgroundColor: cfg.badgeBg, borderColor: cfg.dot },
                        ]}
                        onPress={() => setForm({ ...form, type: key as any })}
                      >
                        <Icon size={14} color={form.type === key ? cfg.badgeText : '#64748b'} />
                        <Text style={[modalStyles.typeButtonText, form.type === key && { color: cfg.badgeText }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={modalStyles.field}>
                <Text style={modalStyles.label}>Target Audience</Text>
                <View style={modalStyles.rolesRow}>
                  {['admin', 'manager', 'employee'].map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        modalStyles.roleButton,
                        form.targetRoles.includes(role) && modalStyles.roleButtonActive,
                      ]}
                      onPress={() => toggleRole(role)}
                    >
                      <Text style={[
                        modalStyles.roleButtonText,
                        form.targetRoles.includes(role) && modalStyles.roleButtonTextActive,
                      ]}>
                        {ROLE_LABELS[role]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={modalStyles.helperText}>Empty = everyone</Text>
              </View>

              <View style={modalStyles.field}>
                <Text style={modalStyles.label}>Expires On (Optional)</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={form.expiresAt}
                  onChangeText={(text) => setForm({ ...form, expiresAt: text })}
                />
              </View>

              <View style={modalStyles.switchRow}>
                <View>
                  <Text style={modalStyles.switchLabel}>Active</Text>
                  <Text style={modalStyles.switchSub}>Inactive announcements are hidden from all users</Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={(value) => setForm({ ...form, isActive: value })}
                  trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                  thumbColor="white"
                />
              </View>

              <View style={modalStyles.buttonRow}>
                <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
                  <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.submitButton}
                  onPress={onSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      {editTarget ? <CheckCircle size={16} color="white" /> : <Megaphone size={16} color="white" />}
                      <Text style={modalStyles.submitButtonText}>
                        {editTarget ? 'Update' : 'Publish & Notify'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const DeleteModal = ({
  visible,
  onClose,
  title,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  onConfirm: () => void;
}) => (
  <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
    <View style={deleteModalStyles.overlay}>
      <View style={deleteModalStyles.container}>
        <View style={deleteModalStyles.iconContainer}>
          <Trash2 size={24} color="#ef4444" />
        </View>
        <Text style={deleteModalStyles.title}>Delete Announcement</Text>
        <Text style={deleteModalStyles.message}>
          "{title}" will be permanently removed.
        </Text>
        <View style={deleteModalStyles.buttonRow}>
          <TouchableOpacity style={deleteModalStyles.cancelButton} onPress={onClose}>
            <Text style={deleteModalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={deleteModalStyles.deleteButton} onPress={onConfirm}>
            <Trash2 size={14} color="white" />
            <Text style={deleteModalStyles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function AnnouncementsScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'urgent',
    targetRoles: [] as string[],
    isActive: true,
    expiresAt: '',
  });

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      fetchAnnouncements();
    }, [page])
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

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementAPI.getAllAdmin({ page, limit });
      const data = (response as any).data;
      setAnnouncements(data?.data || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      Alert.alert('Error', 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      type: 'info',
      targetRoles: [],
      isActive: true,
      expiresAt: '',
    });
  };

  const handleCreate = () => {
    setEditTarget(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditTarget(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      targetRoles: announcement.targetRoles || [],
      isActive: announcement.isActive,
      expiresAt: announcement.expiresAt ? announcement.expiresAt.slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const handleDelete = (announcement: Announcement) => {
    setDeleteTarget(announcement);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await announcementAPI.delete(deleteTarget._id);
      Alert.alert('Success', 'Announcement deleted');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete announcement');
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!form.content.trim()) {
      Alert.alert('Error', 'Content is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        expiresAt: form.expiresAt || null,
      };

      if (editTarget) {
        await announcementAPI.update(editTarget._id, payload);
        Alert.alert('Success', 'Announcement updated!');
      } else {
        await announcementAPI.create(payload);
        Alert.alert('Success', 'Announcement published & notifications sent!');
      }
      setShowModal(false);
      resetForm();
      setEditTarget(null);
      fetchAnnouncements();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type] || TYPE_CONFIG.info;
  };



  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <Layout
        title="Announcements"
        user={user}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <View style={styles.headerActionRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerSubtitle}>
              Create announcements & notify your employees automatically
            </Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Plus size={16} color="white" />
            <Text style={styles.createButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Announcements List */}
        {announcements.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <LinearGradient
              colors={['#ffffff', '#f1f5f9']}
              style={styles.emptyContainer}
            >
              <View style={styles.emptyIconWrapper}>
                <LinearGradient
                  colors={['#eff6ff', '#dbeafe']}
                  style={styles.emptyIconCircle}
                >
                  <Megaphone size={40} color="#3b82f6" />
                </LinearGradient>
                <View style={styles.emptyIconBadge}>
                  <Plus size={12} color="white" />
                </View>
              </View>

              <Text style={styles.emptyTitle}>No announcements yet</Text>
              <Text style={styles.emptyText}>
                Keep your team informed by creating your first announcement. They'll be notified instantly.
              </Text>

              <TouchableOpacity activeOpacity={0.8} onPress={handleCreate}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyButton}
                >
                  <Plus size={18} color="white" />
                  <Text style={styles.emptyButtonText}>Create First Announcement</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <>
            {announcements.map((ann) => (
              <AnnouncementCard 
                key={ann._id} 
                announcement={ann} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                isExpired={isExpired}
              />
            ))}

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
          </>
        )}
      </Layout>

      <AnnouncementModal 
        visible={showModal}
        onClose={() => setShowModal(false)}
        editTarget={editTarget}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        toggleRole={toggleRole}
      />
      <DeleteModal 
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={deleteTarget?.title}
        onConfirm={confirmDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
  announcementCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  expiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#e11d48',
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authorInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  targetAudience: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  targetText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  expiredText: {
    color: '#ef4444',
  },
  emptyWrapper: {
    paddingTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  emptyIconWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  emptyIconBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 240,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 30,
  },
  pageButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  pageInfo: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderTopWidth: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  roleButtonTextActive: {
    color: 'white',
  },
  helperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  switchSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
  },
});

const deleteModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});