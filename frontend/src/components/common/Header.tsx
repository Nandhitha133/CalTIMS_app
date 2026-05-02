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
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Menu, Bell, X, User } from 'lucide-react-native';
import TrialBanner from './TrialBanner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
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
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(initialUser || null);
  const [bannerVisible, setBannerVisible] = useState(true);

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
      navigation.dispatch(DrawerActions.openDrawer());
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
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.notificationItem, !item.read && styles.unreadNotification]}
                onPress={() => markAsRead(item.id)}
              >
                <View style={[styles.notificationDot, { backgroundColor: getNotificationColor(item.type) }]} />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                  <Text style={styles.notificationTime}>
                    {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString()}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Bell size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>No notifications</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.headerWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Trial Banner - Shows above header */}
      {showTrialBanner && bannerVisible && (
        <TrialBanner 
          onClose={() => setBannerVisible(false)} 
          onUpgradePress={() => navigation.navigate('Subscription' as never)}
        />
      )}
      {/* Header Content */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showSidebarButton && (
            <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
              <Menu size={24} color="#1e293b" />
            </TouchableOpacity>
          )}
          {showBackButton && (
            <TouchableOpacity onPress={() => (onBackPress ? onBackPress() : navigation.goBack())} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {title && <Text style={styles.headerTitle}>{title}</Text>}
        </View>

        <View style={styles.headerRight}>
          {showNotification && (
            <TouchableOpacity 
              onPress={() => setShowNotifications(true)} 
              style={styles.notificationButton}
            >
              <Bell size={22} color="#64748b" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} style={styles.userButton}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <NotificationModal />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 8,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  userButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  unreadNotification: {
    backgroundColor: '#eff6ff',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
