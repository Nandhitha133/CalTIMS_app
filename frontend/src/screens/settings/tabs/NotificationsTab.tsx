import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Bell,
  BellRing,
  Mail,
  Check,
  Save,
  Clock,
  Smartphone,
  Shield,
  Calendar,
} from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import Layout from '../../../components/common/Layout';
import { useAuthStore } from '../../../store/authStore';
import PageHeader from '../../../components/common/PageHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: { gap: 20, paddingBottom: 40 },

  // Section Card
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  sectionHeader: { marginBottom: 16 },
  sectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  sectionTitleDark: { color: '#ffffff' },
  sectionSubtitle: { fontSize: 11, color: '#64748b' },
  sectionSubtitleDark: { color: '#94a3b8' },

  // Channel Cards
  channelsGrid: { gap: 12 },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  channelCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  channelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  channelIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  channelIconActive: { backgroundColor: '#6366f115' },
  channelIconInactive: { backgroundColor: '#f1f5f9' },
  channelTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  channelTitleDark: { color: '#ffffff' },
  channelSubtitle: { fontSize: 10, color: '#64748b', marginTop: 2 },
  channelSubtitleDark: { color: '#94a3b8' },

  // Event Groups
  eventGroup: { marginBottom: 20 },
  eventGroupTitle: { fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  eventGroupTitleDark: { color: '#94a3b8', borderBottomColor: '#334155' },
  eventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  eventRowDark: { borderBottomColor: '#334155' },
  eventLabel: { fontSize: 13, fontWeight: '500', color: '#334155' },
  eventLabelDark: { color: '#cbd5e1' },

  // Reminder Inputs
  reminderField: { marginBottom: 16 },
  reminderLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 },
  reminderLabelDark: { color: '#94a3b8' },
  reminderInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, backgroundColor: '#f8fafc', color: '#1e293b' },
  reminderInputDark: { borderColor: '#334155', backgroundColor: '#0f172a', color: '#ffffff' },

  // Save Button
  saveContainer: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 14, fontWeight: 'bold', color: 'white' },
});

// Helper Components
const SectionCard = ({ title, subtitle, icon: Icon, children, theme }: any) => (
  <View style={[styles.sectionCard, theme === 'dark' && styles.sectionCardDark]}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        {Icon && <Icon size={16} color="#6366f1" />}
        <Text style={[styles.sectionTitle, theme === 'dark' && styles.sectionTitleDark]}>{title}</Text>
      </View>
      {subtitle && <Text style={[styles.sectionSubtitle, theme === 'dark' && styles.sectionSubtitleDark]}>{subtitle}</Text>}
    </View>
    {children}
  </View>
);

const ChannelCard = ({ title, subtitle, icon: Icon, enabled, onToggle, theme }: any) => (
  <View style={[styles.channelCard, theme === 'dark' && styles.channelCardDark]}>
    <View style={styles.channelLeft}>
      <View style={[styles.channelIcon, enabled ? styles.channelIconActive : styles.channelIconInactive]}>
        <Icon size={18} color={enabled ? '#6366f1' : '#94a3b8'} />
      </View>
      <View>
        <Text style={[styles.channelTitle, theme === 'dark' && styles.channelTitleDark]}>{title}</Text>
        <Text style={[styles.channelSubtitle, theme === 'dark' && styles.channelSubtitleDark]}>{subtitle}</Text>
      </View>
    </View>
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
      thumbColor={Platform.OS === 'ios' ? '#ffffff' : enabled ? '#ffffff' : '#f4f4f4'}
    />
  </View>
);

const EventSwitch = ({ label, enabled, onToggle, color = '#6366f1', theme }: any) => (
  <View style={[styles.eventRow, theme === 'dark' && styles.eventRowDark]}>
    <Text style={[styles.eventLabel, theme === 'dark' && styles.eventLabelDark]}>{label}</Text>
    <Switch
      value={enabled}
      onValueChange={onToggle}
      trackColor={{ false: '#e2e8f0', true: color }}
      thumbColor={Platform.OS === 'ios' ? '#ffffff' : enabled ? '#ffffff' : '#f4f4f4'}
    />
  </View>
);

const ReminderInput = ({ label, value, onChange, theme }: any) => (
  <View style={styles.reminderField}>
    <Text style={[styles.reminderLabel, theme === 'dark' && styles.reminderLabelDark]}>{label}</Text>
    <TextInput
      style={[styles.reminderInput, theme === 'dark' && styles.reminderInputDark]}
      value={value}
      onChangeText={onChange}
      placeholder="e.g. Friday 18:00"
      placeholderTextColor="#94a3b8"
    />
  </View>
);

export default function NotificationsTab() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [notifications, setNotifications] = useState({
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
      const rawData = response.data?.data || response.data || response;
      if (rawData?.notifications) {
        setNotifications(prev => ({
          ...prev,
          ...rawData.notifications
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await fetchSettings();
    setLoading(false);
  }, [fetchSettings]);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings({ notifications });
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      title="Notifications"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      showBackButton={true}
      onBackPress={() => navigation.navigate('Dashboard' as never)}
    >
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <View style={styles.content}>
            <PageHeader
              title="Preferences"
              subtitle="Manage how you receive alerts"
              icon={Bell}
              iconColor="#8b5cf6"
              iconBgColor="#f3e8ff"
            />

            <SectionCard title="Delivery Channels" subtitle="Where should we send your updates?" icon={BellRing} theme={theme}>
              <View style={styles.channelsGrid}>
                <ChannelCard
                  title="Email Notifications"
                  subtitle="Summary reports and approvals"
                  icon={Mail}
                  enabled={notifications.emailEnabled}
                  onToggle={() => setNotifications({ ...notifications, emailEnabled: !notifications.emailEnabled })}
                  theme={theme}
                />
                <ChannelCard
                  title="In-App Push"
                  subtitle="Real-time alerts and deadlines"
                  icon={Smartphone}
                  enabled={notifications.inAppEnabled}
                  onToggle={() => setNotifications({ ...notifications, inAppEnabled: !notifications.inAppEnabled })}
                  theme={theme}
                />
              </View>
            </SectionCard>

            <SectionCard title="Timesheet Events" subtitle="Alerts related to hour tracking" icon={Clock} theme={theme}>
              <View style={styles.eventGroup}>
                <Text style={[styles.eventGroupTitle, theme === 'dark' && styles.eventGroupTitleDark]}>Submissions & Approvals</Text>
                <EventSwitch
                  label="Daily Submission Tracker"
                  enabled={notifications.notifyOnTimesheetSubmission}
                  onToggle={() => setNotifications({ ...notifications, notifyOnTimesheetSubmission: !notifications.notifyOnTimesheetSubmission })}
                  theme={theme}
                />
                <EventSwitch
                  label="Status Changes (Apps/Rej)"
                  enabled={notifications.notifyOnTimesheetApproval}
                  onToggle={() => setNotifications({ ...notifications, notifyOnTimesheetApproval: !notifications.notifyOnTimesheetApproval })}
                  theme={theme}
                />
              </View>
            </SectionCard>

            <SectionCard title="Policy Alerts" subtitle="Leave and Support updates" icon={Shield} theme={theme}>
              <EventSwitch
                label="Leave Management"
                enabled={notifications.notifyOnLeaveRequest}
                onToggle={() => setNotifications({ ...notifications, notifyOnLeaveRequest: !notifications.notifyOnLeaveRequest })}
                theme={theme}
              />
              <EventSwitch
                label="Support Ticket Activity"
                enabled={notifications.notifyOnSupportTicket}
                onToggle={() => setNotifications({ ...notifications, notifyOnSupportTicket: !notifications.notifyOnSupportTicket })}
                theme={theme}
              />
            </SectionCard>

            <SectionCard title="Custom Reminders" subtitle="Set your recurring schedule" icon={Calendar} theme={theme}>
              <ReminderInput
                label="Weekly Timesheet Reminder"
                value={notifications.timesheetReminder}
                onChange={(t: string) => setNotifications({ ...notifications, timesheetReminder: t })}
                theme={theme}
              />
              <ReminderInput
                label="Payroll Cutoff Alert"
                value={notifications.freezeReminder}
                onChange={(t: string) => setNotifications({ ...notifications, freezeReminder: t })}
                theme={theme}
              />
            </SectionCard>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Save size={20} color="white" />
                  <Text style={styles.saveButtonText}>Save Preferences</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Layout>
  );
}