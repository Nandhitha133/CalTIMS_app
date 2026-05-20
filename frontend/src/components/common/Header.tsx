import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Menu, Bell, X, User, LayoutDashboard, Calendar, ClipboardList, Briefcase, Users, FileText, Settings, LogOut, ChevronRight, ReceiptText, ShieldAlert, History } from 'lucide-react-native';
import { notificationAPI } from '../../services/endpoints';
import TrialBanner from './TrialBanner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

interface SidebarItem {
  id: string;
  title: string;
  icon: any;
  screen: string;
  role?: string[];
}

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showNotification?: boolean;
  showSidebarButton?: boolean;
  showTrialBanner?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  user?: any;
}

export default function Header({ 
  title, 
  showBackButton = false, 
  showNotification = true,
  showSidebarButton = true,
  showTrialBanner = true,
  onMenuPress,
  onBackPress,
  user: initialUser,
}: HeaderProps) {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(initialUser || null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, screen: 'Dashboard' },
    { id: 'timesheets', title: 'Timesheets', icon: ClipboardList, screen: 'TimesheetEntry' },
    { id: 'projects', title: 'Projects', icon: Briefcase, screen: 'Projects' },
    { id: 'leaves', title: 'Leave Tracker', icon: Calendar, screen: 'LeaveTracker' },
    { id: 'payslips', title: 'My Payslips', icon: FileText, screen: 'MyPayslips' },
    { id: 'incidents', title: 'Incidents', icon: ShieldAlert, screen: 'Incidents' },
    { id: 'announcements', title: 'Announcements', icon: Bell, screen: 'Announcements' },
    { id: 'employees', title: 'Employees', icon: Users, screen: 'Employees', role: ['admin', 'hr'] },
    { id: 'payroll', title: 'Payroll Management', icon: ReceiptText, screen: 'PayrollDashboard', role: ['admin', 'hr'] },
    { id: 'reports', title: 'Reports', icon: History, screen: 'Reports', role: ['admin', 'hr'] },
  ];

  useEffect(() => {
    loadUserData();
    loadNotifications();

    return () => {};
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData && !initialUser) {
        setUser(JSON.parse(userData));
      }
    } catch (error) { 
      console.error('Error loading user data:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      if (!notificationAPI?.getAll) {
        console.warn('notificationAPI.getAll is not defined');
        return;
      }
      const response: any = await notificationAPI.getAll({ limit: 20 });
      
      // Robust data extraction
      let rawData = [];
      if (response) {
        if (Array.isArray(response.data?.notifications)) {
          rawData = response.data.notifications;
        } else if (Array.isArray(response.data?.data)) {
          rawData = response.data.data;
        } else if (Array.isArray(response.data)) {
          rawData = response.data;
        } else if (Array.isArray(response.notifications)) {
          rawData = response.notifications;
        } else if (Array.isArray(response)) {
          rawData = response;
        }
      }
      
      const formattedNotifications: Notification[] = rawData.map((n: any) => ({
        id: n._id || n.id || String(Math.random()),
        title: n.title || 'Notification',
        message: n.message || n.content || '',
        type: n.type || 'info',
        read: n.read || n.isRead || false,
        createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else {
      setShowSidebar(true);
    }
  };

  const handleSidebarNavigation = (screen: string) => {
    setShowSidebar(false);
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      if (notificationAPI?.markRead) {
        await notificationAPI.markRead(notificationId);
      }
      const updatedNotifications = notifications.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // 1. Mark as read in background
      await markAsRead(notification.id);
      
      // 2. Close notification modal
      setShowNotifications(false);
      
      // 3. Robust routing based on type/title/message keywords
      const typeLower = (notification.type || '').toLowerCase();
      const titleLower = (notification.title || '').toLowerCase();
      const msgLower = (notification.message || '').toLowerCase();
      
      if (
        typeLower.includes('announcement') || 
        titleLower.includes('announcement') || 
        msgLower.includes('announcement')
      ) {
        navigation.navigate('Announcements');
      } else if (
        typeLower.includes('leave') || 
        titleLower.includes('leave') || 
        msgLower.includes('leave')
      ) {
        navigation.navigate('LeaveTracker');
      } else if (
        typeLower.includes('timesheet') || 
        titleLower.includes('timesheet') || 
        msgLower.includes('timesheet')
      ) {
        navigation.navigate('TimesheetEntry');
      } else if (
        typeLower.includes('incident') || 
        typeLower.includes('ticket') || 
        titleLower.includes('incident') || 
        titleLower.includes('ticket') || 
        msgLower.includes('incident') || 
        msgLower.includes('ticket')
      ) {
        navigation.navigate('Incidents');
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (notificationAPI?.markAllRead) {
        await notificationAPI.markAllRead();
      }
      const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
      setNotifications(updatedNotifications);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationColor = (type: string) => {
    const typeLower = (type || '').toLowerCase();
    if (
      typeLower.includes('success') || 
      typeLower.includes('approve') || 
      typeLower.includes('resolve')
    ) {
      return '#10b981'; // Green for successes/approvals/resolutions
    }
    if (
      typeLower.includes('warning') || 
      typeLower.includes('reject') || 
      typeLower.includes('pending')
    ) {
      return '#f59e0b'; // Yellow/Orange for warnings/rejections/pending states
    }
    if (
      typeLower.includes('error') || 
      typeLower.includes('fail') || 
      typeLower.includes('cancel')
    ) {
      return '#ef4444'; // Red for errors/cancellations
    }
    if (typeLower.includes('announcement')) {
      return '#8b5cf6'; // Beautiful Purple for announcements
    }
    return '#3b82f6'; // Premium Blue for standard info
  };


  const NotificationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showNotifications}
      onRequestClose={() => setShowNotifications(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={styles.modalHeaderButtons}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.notificationItem, !item.read && styles.unreadItem]}
                onPress={() => handleNotificationPress(item)}
              >
                <View style={[styles.notificationTypeIndicator, { backgroundColor: getNotificationColor(item.type) }]} />
                <View style={styles.notificationTextContent}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyNotifications}>
                <Text style={styles.emptyText}>No notifications</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  const SidebarModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSidebar}
      onRequestClose={() => setShowSidebar(false)}
    >
      <TouchableOpacity 
        style={styles.sidebarOverlay} 
        activeOpacity={1} 
        onPress={() => setShowSidebar(false)}
      >
        <View style={styles.sidebarContent}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
            <View style={styles.sidebarHeader}>
              <View style={styles.userProfileSection}>
                <View style={styles.avatarContainer}>
                  <User size={30} color="#6366f1" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user?.name || 'User'}</Text>
                  <Text style={styles.userRole}>{user?.role || 'Employee'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowSidebar(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarScroll}>
              {sidebarItems.map((item) => {
                if (item.role && !item.role.includes(user?.role?.toLowerCase())) {
                  return null;
                }
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.sidebarItem}
                    onPress={() => handleSidebarNavigation(item.screen)}
                  >
                    <View style={styles.sidebarItemLeft}>
                      <IconComponent size={20} color="#64748b" />
                      <Text style={styles.sidebarItemText}>{item.title}</Text>
                    </View>
                    <ChevronRight size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                );
              })}
              
              <View style={styles.sidebarDivider} />
              
              <TouchableOpacity 
                style={styles.sidebarItem}
                onPress={() => handleSidebarNavigation('Settings')}
              >
                <View style={styles.sidebarItemLeft}>
                  <Settings size={20} color="#64748b" />
                  <Text style={styles.sidebarItemText}>Settings</Text>
                </View>
                <ChevronRight size={16} color="#cbd5e1" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.sidebarItem, styles.logoutItem]}
                onPress={handleLogout}
              >
                <View style={styles.sidebarItemLeft}>
                  <LogOut size={20} color="#ef4444" />
                  <Text style={[styles.sidebarItemText, styles.logoutText]}>Logout</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
            
            <View style={styles.sidebarFooter}>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ProfileModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showProfile}
      onRequestClose={() => setShowProfile(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowProfile(false)}
      >
        <View style={styles.profileModalContainer}>
          <TouchableOpacity activeOpacity={1} style={styles.profileModalCard}>
            {/* Close Button */}
            <TouchableOpacity 
              onPress={() => setShowProfile(false)}
              style={styles.profileCloseButton}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Avatar Section */}
            <View style={styles.profileHeader}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarInitial}>
                  {(user?.name || 'U').split(' ').map((n: any) => n[0]).join('').toUpperCase().substring(0, 2)}
                </Text>
              </View>
              
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
              
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user?.role || 'Employee'}</Text>
              </View>
            </View>

            <View style={styles.profileDivider} />

            {/* Actions Section */}
            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.profileActionItem}
                onPress={() => {
                  setShowProfile(false);
                  navigation.navigate('Profile');
                }}
              >
                <User size={18} color="#64748b" />
                <Text style={styles.profileActionText}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.profileActionItem}
                onPress={() => {
                  setShowProfile(false);
                  navigation.navigate('Settings');
                }}
              >
                <Settings size={18} color="#64748b" />
                <Text style={styles.profileActionText}>Account Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.profileActionItem, styles.signOutAction]}
                onPress={() => {
                  setShowProfile(false);
                  handleLogout();
                }}
              >
                <LogOut size={18} color="#ef4444" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {showTrialBanner && bannerVisible && (
        <TrialBanner onClose={() => setBannerVisible(false)} />
      )}
      
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity onPress={onBackPress || (() => navigation.goBack())} style={styles.iconButton}>
              <ChevronRight size={24} color="#1e293b" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          ) : showSidebarButton ? (
            <TouchableOpacity onPress={handleMenuPress} style={styles.iconButton}>
              <Menu size={24} color="#1e293b" />
            </TouchableOpacity>
          ) : null}
          
          <Text style={styles.title} numberOfLines={1}>
            {title || 'CALTIMS'}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {showNotification && (
            <TouchableOpacity 
              onPress={() => setShowNotifications(true)} 
              style={styles.iconButton}
            >
              <Bell size={24} color="#1e293b" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            onPress={() => setShowProfile(true)}
            style={styles.profileButton}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <NotificationModal />
      <SidebarModal />
      <ProfileModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    zIndex: 1000,
  },
  headerContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 4,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  profileButton: {
    marginLeft: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllButton: {
    marginRight: 16,
  },
  markAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  unreadItem: {
    backgroundColor: '#f8fafc',
  },
  notificationTypeIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  notificationTextContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyNotifications: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarContent: {
    width: '80%',
    height: '100%',
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  userRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sidebarScroll: {
    flex: 1,
    padding: 12,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  sidebarItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarItemText: {
    fontSize: 15,
    fontWeight: '500', 
    color: '#475569',
    marginLeft: 12,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12, 
    marginHorizontal: 16,
  },
  logoutItem: {
    marginTop: 12,
  },
  logoutText: {
    color: '#ef4444',
  },
  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Profile Modal Styles
  profileModalContainer: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  profileModalCard: {
    alignItems: 'center',
  },
  profileCloseButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    padding: 8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  largeAvatarInitial: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'capitalize',
  },
  profileDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  profileActions: {
    width: '100%',
  },
  profileActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  profileActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  signOutAction: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});
