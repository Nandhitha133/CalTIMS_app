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
import TrialBanner from './TrialBanner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
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
    // Mock notifications - replace with API call
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Timesheet Reminder',
        message: 'Please submit your timesheet for this week',
        type: 'warning',
        read: false,
        createdAt: new Date(),
      },
      {
        id: '2',
        title: 'Leave Approved',
        message: 'Your leave request has been approved',
        type: 'success',
        read: false,
        createdAt: new Date(),
      },
    ];
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
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
    const updatedNotifications = notifications.map(notif =>
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(n => !n.read).length);
  };

  const markAllAsRead = async () => {
    const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
    setNotifications(updatedNotifications);
    setUnreadCount(0);
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
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
                onPress={() => markAsRead(item.id)}
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
              <X size={24} color="#1e293b" />
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
            onPress={() => navigation.navigate('Profile')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
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
});
