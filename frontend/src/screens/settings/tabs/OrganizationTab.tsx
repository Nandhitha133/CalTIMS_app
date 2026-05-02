// src/screens/settings/tabs/OrganizationTab.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Switch,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Clock, Save, ChevronDown, X, Upload, Building2 } from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAuthStore } from '../../../store/authStore';
import * as ImagePicker from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../../components/common/Layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Timezone data
const commonTimezones = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London',
  'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney',
  'Africa/Cairo', 'Pacific/Auckland'
];

const getFormattedTimezones = () => {
  const timezones = (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl)
    ? (Intl as any).supportedValuesOf('timeZone')
    : commonTimezones;

  return timezones.map((tz: string) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset'
      });
      const parts = formatter.formatToParts(new Date());
      const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
      let name = tz.replace(/_/g, ' ');
      if (tz === 'UTC') name = 'UTC (Coordinated Universal Time)';
      return { value: tz, label: `(${offsetPart}) ${name}` };
    } catch (e) {
      return { value: tz, label: tz.replace(/_/g, ' ') };
    }
  }).sort((a: any, b: any) => a.label.localeCompare(b.label));
};

const TIMEZONES = getFormattedTimezones();
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  headerSubtitle: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  planBadgeLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5 },
  planBadgeGradient: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  planBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20, overflow: 'hidden' },
  cardHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#6b7280' },
  cardDivider: { height: 1, backgroundColor: '#f3f4f6' },
  cardContent: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#111827' },
  selectContainer: { marginBottom: 16 },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  selectText: { fontSize: 14, color: '#111827' },
  placeholderText: { color: '#9ca3af' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  modalItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 14, color: '#374151' },
  logoContainer: { alignItems: 'center' },
  logoUploadArea: { width: 120, height: 120, backgroundColor: '#f9fafb', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', borderRadius: 60, overflow: 'hidden', marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: '100%', height: '100%' },
  saveButtonContainer: { marginTop: 8, marginBottom: 32 },
  saveButton: { borderRadius: 16, overflow: 'hidden' },
  saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  saveButtonText: { fontSize: 14, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase' },
  content: { flex: 1 },
});

const CustomSelect = ({ value, options, onSelect, placeholder, label }: any) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find((opt: any) => opt.value === value);

  return (
    <View style={styles.selectContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setVisible(true)}>
        <Text style={[styles.selectText, !selected && styles.placeholderText]}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={20} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { onSelect(item.value); setVisible(false); }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const SectionCard = ({ title, subtitle, icon: Icon, children }: any) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <View style={styles.cardIconContainer}><Icon size={20} color="#6366f1" /></View>
        <View><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardSubtitle}>{subtitle}</Text></View>
      </View>
    </View>
    <View style={styles.cardDivider} /><View style={styles.cardContent}>{children}</View>
  </View>
);

export default function OrganizationTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user, subscription } = useAuthStore();
  const { updateGeneralSettings } = useSettingsStore();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logoFile, setLogoFile] = useState<any>(null);
  const [form, setForm] = useState({
    companyName: '', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY',
    companyLogo: '', address: '', country: '', currency: 'INR',
    fiscalYearStart: 'April', workWeek: 'Mon-Fri'
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings(),
  });

  useEffect(() => {
    const rawData = (settings as any)?.data?.data || (settings as any)?.data || settings;
    if (rawData) {
      setForm({
        companyName: rawData.companyName || '', timezone: rawData.timezone || 'Asia/Kolkata',
        dateFormat: rawData.dateFormat || 'DD/MM/YYYY', companyLogo: rawData.companyLogo || '',
        address: rawData.address || '', country: rawData.country || '', currency: rawData.currency || 'INR',
        fiscalYearStart: rawData.fiscalYearStart || 'April', workWeek: rawData.workWeek || 'Mon-Fri'
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.updateSettings({ general: form }),
    onSuccess: () => {
      Alert.alert('Success', 'Organization settings saved successfully!');
      updateGeneralSettings(form);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (result.assets?.[0]) setLogoFile(result.assets[0]);
  };

  return (
    <Layout
      title="Organization"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      showBackButton
      onBackPress={() => navigation.navigate('Dashboard' as never)}
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading configurations...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Organization Landscape</Text>
              <TouchableOpacity style={styles.planBadge} onPress={() => navigation.navigate('SubscriptionTab' as never)}>
                <Text style={styles.planBadgeLabel}>Plan: </Text>
                <View style={[styles.planBadgeGradient, { backgroundColor: '#10b981' }]}>
                  <Text style={styles.planBadgeText}>{subscription?.planType || 'TRIAL'}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <SectionCard title="Corporate Identity" subtitle="Manage your company basics" icon={Building2}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.companyName}
                  onChangeText={t => setForm({ ...form, companyName: t })}
                  placeholder="e.g. Acme Corp"
                />
              </View>
              <View style={styles.logoContainer}>
                <TouchableOpacity style={styles.logoUploadArea} onPress={pickImage}>
                  {logoFile || form.companyLogo ? (
                    <Image source={{ uri: logoFile?.uri || form.companyLogo }} style={styles.logoImage} />
                  ) : (
                    <Upload size={24} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              </View>
            </SectionCard>

            <SectionCard title="Localization" subtitle="Regional and time preferences" icon={Globe}>
              <CustomSelect
                label="Timezone"
                value={form.timezone}
                options={TIMEZONES}
                onSelect={(v: string) => setForm({ ...form, timezone: v })}
              />
              <CustomSelect
                label="Date Format"
                value={form.dateFormat}
                options={DATE_FORMATS.map(f => ({ label: f, value: f }))}
                onSelect={(v: string) => setForm({ ...form, dateFormat: v })}
              />
              <CustomSelect
                label="Currency"
                value={form.currency}
                options={CURRENCIES.map(c => ({ label: `${c.code} (${c.symbol})`, value: c.code }))}
                onSelect={(v: string) => setForm({ ...form, currency: v })}
              />
            </SectionCard>

            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <View style={[styles.saveButtonGradient, { backgroundColor: '#6366f1', height: 56, width: '100%', borderRadius: 16 }]}>
                  {saveMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Save size={20} color="white" />
                      <Text style={styles.saveButtonText}>Apply Settings</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Layout>
  );
}
