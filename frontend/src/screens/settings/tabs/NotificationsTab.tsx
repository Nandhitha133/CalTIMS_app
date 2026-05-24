// screens/settings/NotificationsTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  BellRing,
  Mail,
  Save,
  Clock,
  Calendar,
  Users,
  LifeBuoy,
} from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import { useAuthStore } from '../../../store/authStore';
import PageHeader from '../../../components/common/PageHeader';
import Layout from '../../../components/common/Layout';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Types ----------
interface NotificationsState {
  timesheetReminder: string;
  freezeReminder: string;
  approvalReminder: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  notifyOnTimesheetSubmission: boolean;
  notifyOnTimesheetApproval: boolean;
  notifyOnTimesheetRejection: boolean;
  notifyOnLeaveRequest: boolean;
  notifyOnLeaveApproval: boolean;
  notifyOnLeaveRejection: boolean;
  notifyOnSupportTicket: boolean;
}

// ---------- Reusable sub-components ----------
const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  children: React.ReactNode;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      {Icon && (
        <View style={styles.sectionIcon}>
          <Icon size={20} color="#6366f1" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const ToggleRow = ({
  label,
  value,
  onValueChange,
  color = '#6366f1',
}: {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  color?: string;
}) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e2e8f0', true: color }}
      thumbColor={Platform.OS === 'ios' ? '#ffffff' : value ? '#ffffff' : '#f4f4f4'}
      ios_backgroundColor="#e2e8f0"
    />
  </View>
);

const ReminderInput = ({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.textInput}
      value={value}
      onChangeText={onChangeText}
      placeholder="e.g. Friday 18:00"
      placeholderTextColor="#94a3b8"
    />
  </View>
);

// ---------- Main Component ----------
export default function NotificationsTab() {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

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

  const [notifications, setNotifications] = useState<NotificationsState>({
    timesheetReminder: 'Friday 18:00',
    freezeReminder: 'Monday 15:00',
    approvalReminder: 'Daily 10:00',
    emailEnabled: true,
    inAppEnabled: true,
    notifyOnTimesheetSubmission: true,
    notifyOnTimesheetApproval: true,
    notifyOnTimesheetRejection: true,
    notifyOnLeaveRequest: true,
    notifyOnLeaveApproval: true,
    notifyOnLeaveRejection: true,
    notifyOnSupportTicket: true,
  });

  const fetchSettings = useCallback(async () => {
    try {
      const response: any = await settingsAPI.getSettings();
      const raw = response.data?.data || response.data || response;
      if (raw?.notifications) {
        setNotifications((prev) => ({
          ...prev,
          ...raw.notifications,
        }));
      }
    } catch (error) {
      console.error('Failed to load notification settings', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchSettings();
    }, [fetchSettings])
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings({ notifications });
      Alert.alert('Success', 'Notification preferences saved!');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to save preferences';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof NotificationsState, value: any) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Layout
      title="Notifications"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      onRefresh={fetchSettings}
      refreshing={loading}
      showBackButton={true}
      onBackPress={() => navigation.navigate('Settings' as never)}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <PageHeader
          title="Notifications"
          subtitle="Control cadence and delivery channels for automated alerts"
          icon={BellRing}
          iconColor="#8b5cf6"
          iconBgColor="#f3e8ff"
        />

        {/* ----- Delivery Channels ----- */}
        <SectionCard
          title="Delivery Channels"
          subtitle="Global switches for notification paths"
          icon={BellRing}
        >
          <ToggleRow
            label="Email Alerts"
            value={notifications.emailEnabled}
            onValueChange={(val) => update('emailEnabled', val)}
          />
          <Text style={styles.helperText}>
            Receive updates directly to your registered inbox.
          </Text>

          <View style={styles.separator} />

          <ToggleRow
            label="In-App Notifications"
            value={notifications.inAppEnabled}
            onValueChange={(val) => update('inAppEnabled', val)}
          />
          <Text style={styles.helperText}>
            Real-time alerts in your dashboard notification center.
          </Text>
        </SectionCard>

        {/* ----- Event Subscriptions ----- */}
        <SectionCard
          title="Event Subscriptions"
          subtitle="Select which system actions trigger an alert"
        >
          {/* Timesheet Events */}
          <View style={styles.eventGroup}>
            <Text style={styles.eventGroupTitle}>Timesheet Workflows</Text>
            <ToggleRow
              label="Submission"
              value={notifications.notifyOnTimesheetSubmission}
              onValueChange={(val) =>
                update('notifyOnTimesheetSubmission', val)
              }
            />
            <ToggleRow
              label="Approval"
              value={notifications.notifyOnTimesheetApproval}
              onValueChange={(val) =>
                update('notifyOnTimesheetApproval', val)
              }
              color="#10b981"
            />
            <ToggleRow
              label="Rejection"
              value={notifications.notifyOnTimesheetRejection}
              onValueChange={(val) =>
                update('notifyOnTimesheetRejection', val)
              }
              color="#ef4444"
            />
          </View>

          {/* Leave Events */}
          <View style={styles.eventGroup}>
            <Text style={styles.eventGroupTitle}>Leave Management</Text>
            <ToggleRow
              label="Request Generated"
              value={notifications.notifyOnLeaveRequest}
              onValueChange={(val) => update('notifyOnLeaveRequest', val)}
            />
            <ToggleRow
              label="Request Approved"
              value={notifications.notifyOnLeaveApproval}
              onValueChange={(val) =>
                update('notifyOnLeaveApproval', val)
              }
              color="#10b981"
            />
            <ToggleRow
              label="Request Rejected"
              value={notifications.notifyOnLeaveRejection}
              onValueChange={(val) =>
                update('notifyOnLeaveRejection', val)
              }
              color="#ef4444"
            />
          </View>

          {/* Support Events */}
          <View style={styles.eventGroup}>
            <Text style={styles.eventGroupTitle}>Help & Support</Text>
            <ToggleRow
              label="Ticket Created"
              value={notifications.notifyOnSupportTicket}
              onValueChange={(val) =>
                update('notifyOnSupportTicket', val)
              }
            />
            <Text style={styles.helperText}>
              Notify admins when a new support ticket is raised
            </Text>
          </View>
        </SectionCard>

        {/* ----- Reminder Cadence ----- */}
        <SectionCard
          title="Reminder Cadence"
          subtitle="Schedule for automated pings"
          icon={Calendar}
        >
          <ReminderInput
            label="Timesheet Deadline"
            value={notifications.timesheetReminder}
            onChangeText={(text) => update('timesheetReminder', text)}
          />
          <ReminderInput
            label="Freeze Warning"
            value={notifications.freezeReminder}
            onChangeText={(text) => update('freezeReminder', text)}
          />
          <ReminderInput
            label="Approval Digest"
            value={notifications.approvalReminder}
            onChangeText={(text) => update('approvalReminder', text)}
          />
        </SectionCard>
      </ScrollView>

      {/* ----- Sticky Save Button ----- */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Save size={20} color="white" />
              <Text style={styles.saveText}>Sync Preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </Layout>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 20,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sectionBody: {
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 16,
  },
  helperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: -8,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  eventGroup: {
    marginBottom: 8,
  },
  eventGroupTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
});