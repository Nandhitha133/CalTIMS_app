// src/screens/settings/tabs/OrganizationTab.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Clock,
  Save,
  ChevronDown,
  X,
  Upload,
  Building2,
  Landmark,
  MapPin,
  Coins,
  Calendar,
  Info,
  AlertCircle,
  Search,
} from 'lucide-react-native';
import { settingsAPI } from '../../../services/endpoints';
import { useSocketEvent } from '../../../services/socket';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAuthStore } from '../../../store/authStore';
import * as ImagePicker from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../../components/common/Layout';
import PageHeader from '../../../components/common/PageHeader';
import { scale, verticalScale, moderateScale } from '../../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- Constants ----------
const commonTimezones = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Africa/Cairo',
  'Pacific/Auckland',
];

const getFormattedTimezones = () => {
  const timezones = (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl)
    ? (Intl as any).supportedValuesOf('timeZone')
    : commonTimezones;

  return Array.from(timezones || commonTimezones)
    .map((tz: any) => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          timeZoneName: 'shortOffset',
        });
        const parts = formatter.formatToParts(new Date());
        const offsetPart = parts.filter(p => p.type === 'timeZoneName')[0]?.value || 'GMT+0';
        let name = tz.replace(/_/g, ' ');
        if (tz === 'UTC') name = 'UTC (Coordinated Universal Time)';
        return { value: tz, label: `(${offsetPart}) ${name}` };
      } catch (e) {
        return { value: tz, label: tz.replace(/_/g, ' ') };
      }
    })
    .sort((a: any, b: any) => a.label.localeCompare(b.label));
};

const TIMEZONES = getFormattedTimezones();
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];
const DAYS_OF_WEEK = [
  { key: 'monday', label: 'M' },
  { key: 'tuesday', label: 'T' },
  { key: 'wednesday', label: 'W' },
  { key: 'thursday', label: 'T' },
  { key: 'friday', label: 'F' },
  { key: 'saturday', label: 'S' },
  { key: 'sunday', label: 'S' },
];

// ---------- Helpers ----------
const getSelectedDays = (workWeek: any) => {
  if (!workWeek) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  if (Array.isArray(workWeek)) return workWeek;
  if (typeof workWeek !== 'string') return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  if (workWeek === 'Mon-Fri') return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  if (workWeek === 'Sun-Thu') return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  if (workWeek === 'Mon-Sat')
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const arr = workWeek.split(',').map((d: string) => d.trim().toLowerCase());
  return arr.length === 7 ? arr : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
};

const daysToString = (days: string[]) => {
  const sorted = [...days].sort(
    (a, b) => DAYS_OF_WEEK.findIndex(d => d.key === a) - DAYS_OF_WEEK.findIndex(d => d.key === b)
  );
  if (sorted.length === 5 && sorted.join(',') === 'monday,tuesday,wednesday,thursday,friday')
    return 'Mon-Fri';
  if (sorted.length === 5 && sorted.join(',') === 'sunday,monday,tuesday,wednesday,thursday')
    return 'Sun-Thu';
  if (sorted.length === 6 && sorted.join(',') === 'monday,tuesday,wednesday,thursday,friday,saturday')
    return 'Mon-Sat';
  return sorted.join(',');
};

// ---------- Reusable Components ----------
const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconContainer}>
        <Icon size={20} color="#6366f1" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.sectionDivider} />
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const DaySelector = ({
  selectedDays,
  onChange,
}: {
  selectedDays: string[];
  onChange: (days: string[]) => void;
}) => {
  const toggleDay = (key: string) => {
    const updated = selectedDays.includes(key)
      ? selectedDays.filter(d => d !== key)
      : [...selectedDays, key];
    if (updated.length === 0) return; // prevent removing all days
    onChange(updated);
  };

  return (
    <View style={styles.daySelectorRow}>
      {DAYS_OF_WEEK.map(day => (
        <TouchableOpacity
          key={day.key}
          onPress={() => toggleDay(day.key)}
          style={[
            styles.dayButton,
            selectedDays.includes(day.key) && styles.dayButtonActive,
          ]}
        >
          <Text
            style={[
              styles.dayButtonText,
              selectedDays.includes(day.key) && styles.dayButtonTextActive,
            ]}
          >
            {day.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const SliderWithDots = ({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  label: string;
}) => {
  const dots = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>{label}: {value} hrs</Text>
      <View style={styles.sliderTrack}>
        {dots.map(hour => (
          <View
            key={hour}
            style={[
              styles.sliderDot,
              {
                backgroundColor: value >= hour ? '#6366f1' : '#d1d5db',
                transform: [{ scale: value >= hour ? 1.2 : 1 }],
              },
            ]}
          />
        ))}
      </View>
      {/* We use a simple button-based control for simplicity, but a real slider via react-native-slider would be better */}
      <View style={styles.sliderButtons}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))}>
          <Text style={styles.sliderBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.sliderValue}>{value} hrs</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))}>
          <Text style={styles.sliderBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      {/* In a real app, use @react-native-community/slider */}
    </View>
  );
};

const ImpactPanel = ({ impacts }: { impacts: Array<{ title: string; description: string }> }) => (
  <View style={styles.impactPanel}>
    <Text style={styles.impactTitle}>Live Impact</Text>
    {impacts.map((item, index) => (
      <View key={index} style={styles.impactItem}>
        <Info size={14} color="#6366f1" style={{ marginTop: 2 }} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.impactItemTitle}>{item.title}</Text>
          <Text style={styles.impactItemDesc}>{item.description}</Text>
        </View>
      </View>
    ))}
  </View>
);

const TimezonePicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const selected = TIMEZONES.filter((t: any) => t.value === value)[0];
  const filtered = search
    ? TIMEZONES.filter((t: any) => t.label.toLowerCase().indexOf(search.toLowerCase()) !== -1)
    : TIMEZONES;

  return (
    <>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setVisible(true)}>
        <Text style={styles.pickerText} numberOfLines={1}>
          {selected ? selected.label : 'Select timezone'}
        </Text>
        <ChevronDown size={18} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search timezone..."
                value={search}
                onChangeText={(text) => setSearch(text)}
                autoFocus
                clearButtonMode="while-editing"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.timezoneItem, item.value === value && styles.timezoneItemActive]}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                    setSearch('');
                  }}
                >
                  <Text style={styles.timezoneItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: Dimensions.get('window').height * 0.5 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

// ---------- Main Component ----------
export default function OrganizationTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user, subscription } = useAuthStore();
  const { updateGeneralSettings } = useSettingsStore();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [logoFile, setLogoFile] = useState<ImagePicker.Asset | null>(null);
  const [form, setForm] = useState({
    companyName: '',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    companyLogo: '',
    address: '',
    aboutInstitution: '',
    phoneNumber: '',
    country: '',
    currency: 'INR',
    fiscalYearStart: 'April',
    fiscalYearEnd: 'March',
    workWeek: 'Mon-Fri',
    enableEnterpriseRBAC: false,
    workingHoursPerDay: 8,
    strictDailyHours: false,
    isWeekendWorkable: false,
    weekStartDay: 'monday',
  });

  // Fetch settings
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings().then((r: any) => r?.data?.data ?? r?.data ?? r ?? null),
  });

  useSocketEvent('settings_updated', (payload) => {
    console.log('[Socket] Settings updated event received in OrganizationTab:', payload);
    refetch();
  });

  useEffect(() => {
    if (settings) {
      const org = settings.organization || {};
      const general = settings.general || {};
      setForm(prev => ({
        ...prev,
        companyName: org.companyName || general.companyName || '',
        timezone: general.timezone || 'Asia/Kolkata',
        dateFormat: general.dateFormat || 'DD/MM/YYYY',
        companyLogo: org.companyLogo || '',
        address: org.address || '',
        aboutInstitution: org.aboutInstitution || '',
        phoneNumber: org.phoneNumber || '',
        country: org.country || '',
        currency: org.currency || 'INR',
        fiscalYearStart: org.fiscalYearStart || 'April',
        fiscalYearEnd: org.fiscalYearEnd || 'March',
        workWeek: general.workWeek || 'Mon-Fri',
        enableEnterpriseRBAC: general.enableEnterpriseRBAC || false,
        workingHoursPerDay: general.workingHoursPerDay || 8,
        strictDailyHours: general.strictDailyHours || false,
        isWeekendWorkable: general.isWeekendWorkable || false,
        weekStartDay: general.weekStartDay || 'monday',
      }));
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (form.fiscalYearStart === form.fiscalYearEnd) {
        throw new Error('Fiscal year start and end cannot be the same');
      }

      let finalLogoUrl = form.companyLogo;

      if (logoFile) {
        const fData = new FormData();
        fData.append('file', {
          uri: logoFile.uri,
          type: logoFile.type || 'image/jpeg',
          name: logoFile.fileName || 'logo.jpg',
        } as any);
        const res: any = await settingsAPI.uploadBranding(fData);
        finalLogoUrl = res.data.url || res.data.data.url;
      }

      const selectedCurrency = CURRENCIES.filter(c => c.code === form.currency)[0] || CURRENCIES[0];

      return settingsAPI.updateSettings({
        organization: {
          ...form,
          companyLogo: finalLogoUrl,
        },
        general: {
          companyName: form.companyName,
          timezone: form.timezone,
          workingHoursPerDay: form.workingHoursPerDay,
          strictDailyHours: form.strictDailyHours,
          isWeekendWorkable:
            form.isWeekendWorkable ||
            getSelectedDays(form.workWeek).includes('saturday') ||
            getSelectedDays(form.workWeek).includes('sunday'),
          workWeek: form.workWeek,
          weekStartDay: form.weekStartDay,
          dateFormat: form.dateFormat,
          enableEnterpriseRBAC: form.enableEnterpriseRBAC,
        },
        payroll: {
          currencySymbol: selectedCurrency.symbol,
        }
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Organization settings saved!');
      updateGeneralSettings(form);
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Save failed';
      Alert.alert('Error', message);
    },
  });

  // Impact analysis
  const impacts = useMemo(() => {
    const list = [];
    const selectedDays = getSelectedDays(form.workWeek);
    const hasWeekend = selectedDays.includes('saturday') || selectedDays.includes('sunday');
    list.push({
      title: hasWeekend ? 'Weekend Entries Allowed' : 'Business Week Enforcement',
      description: hasWeekend
        ? 'Users will be able to submit timesheets for Saturday and Sunday.'
        : 'Timesheet entries will be restricted to Monday through Friday only.',
    });
    list.push({
      title: `Financial Ledger in ${form.currency}`,
      description: `All future invoices and payroll reports will be denominated in ${form.currency}.`,
    });
    if (form.strictDailyHours) {
      list.push({
        title: 'Strict Hour Validation',
        description: `Timesheets will block entries that do not meet the standard ${form.workingHoursPerDay} hours.`,
      });
    }
    return list;
  }, [form]);

  // Image picker
  const pickImage = useCallback(() => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response: any) => {
      if (response.assets?.[0]) {
        setLogoFile(response.assets[0]);
        // Update preview locally
        setForm(prev => ({ ...prev, companyLogo: response.assets[0].uri || '' }));
      }
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading organization settings...</Text>
      </View>
    );
  }

  return (
    <Layout
      title="Organization"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={isLoading}
      onRefresh={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}
      scrollable={false}
      backgroundColor="#f9fafb"
      showBackButton={true}
      onBackPress={() => navigation.navigate('Settings' as never)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <PageHeader 
            title="Organization Landscape"
            subtitle="Manage institutional identity and operational governance"
            icon={Building2}
            iconColor="#6366f1"
            iconBgColor="#eef2ff"
          />

          {/* Section 1: Company Identity */}
          <SectionCard title="Company Identity" subtitle="Core branding and location profile" icon={Building2}>
            {/* Company Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Official Institution Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acme Corporation"
                value={form.companyName}
                onChangeText={t => setForm(prev => ({ ...prev, companyName: t }))}
              />
            </View>

            {/* Logo Display (Upload Disabled) */}
            { (form.companyLogo || logoFile) && (
              <View style={styles.logoUpload}>
                <Image
                  source={{ uri: logoFile?.uri || form.companyLogo }}
                  style={styles.logoImage}
                />
              </View>
            )}

            {/* About Institution */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>About Institution</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                placeholder="Brief overview..."
                value={form.aboutInstitution}
                onChangeText={t => setForm(prev => ({ ...prev, aboutInstitution: t }))}
              />
              <Text style={styles.charCounter}>
                {form.aboutInstitution?.length || 0} / 500
              </Text>
            </View>

            {/* Headquarters Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Primary Headquarters</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                placeholder="Physical address for correspondence..."
                value={form.address}
                onChangeText={t => setForm(prev => ({ ...prev, address: t }))}
              />
            </View>

            {/* Country & Phone */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Operational Country</Text>
                <TextInput
                  style={styles.input}
                  placeholder="United States"
                  value={form.country}
                  onChangeText={t => setForm(prev => ({ ...prev, country: t }))}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234567890"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.phoneNumber}
                  onChangeText={t => {
                    const cleaned = t.replace(/[^0-9]/g, '');
                    setForm(prev => ({ ...prev, phoneNumber: cleaned }));
                  }}
                />
              </View>
            </View>
          </SectionCard>

          {/* Section 2: Financial Configuration */}
          <SectionCard title="Financial Configuration" subtitle="Ledger currency and period rules" icon={Landmark}>
            {/* Currency picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Default Currency</Text>
              <View style={styles.pickerWrapper}>
                <CustomSelect
                  value={form.currency}
                  options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
                  onValueChange={(val: string) => setForm(prev => ({ ...prev, currency: val }))}
                />
              </View>
            </View>

            {/* Fiscal Year */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fiscal Year Start</Text>
                <PickerSelect
                  value={form.fiscalYearStart}
                  options={MONTHS}
                  onValueChange={(val: string) => setForm(prev => ({ ...prev, fiscalYearStart: val }))}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fiscal Year End</Text>
                <PickerSelect
                  value={form.fiscalYearEnd}
                  options={MONTHS}
                  onValueChange={(val: string) => setForm(prev => ({ ...prev, fiscalYearEnd: val }))}
                />
              </View>
            </View>
            {form.fiscalYearStart === form.fiscalYearEnd && (
              <Text style={styles.errorText}>
                <AlertCircle size={12} color="#ef4444" /> Start and end months cannot be the same
              </Text>
            )}
          </SectionCard>

          {/* Section 3: Localization & Time */}
          <SectionCard title="Localization & Time" subtitle="Regional standards and working hours" icon={Clock}>
            {/* Week Day Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Standard Work Week</Text>
              <DaySelector
                selectedDays={getSelectedDays(form.workWeek)}
                onChange={(days) => setForm(prev => ({ ...prev, workWeek: daysToString(days) }))}
              />
            </View>

            {/* Timezone with search */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Region Timezone</Text>
              <TimezonePicker
                value={form.timezone}
                onChange={tz => setForm(prev => ({ ...prev, timezone: tz }))}
              />
            </View>

            {/* Date Format */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Global Date Format</Text>
              <PickerSelect
                value={form.dateFormat}
                options={DATE_FORMATS}
                onValueChange={(val: string) => setForm(prev => ({ ...prev, dateFormat: val }))}
              />
            </View>

            {/* Working Hours */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Standard Work Day Baseline</Text>
              <SliderWithDots
                value={form.workingHoursPerDay}
                min={1}
                max={12}
                step={0.25}
                onChange={(val) => setForm(prev => ({ ...prev, workingHoursPerDay: val }))}
                label="Hours"
              />
            </View>

            {/* Strict Enforcement Toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Strict Enforcement</Text>
                <Text style={styles.toggleHint}>
                  Block timesheets that don't meet daily requirements
                </Text>
              </View>
              <Switch
                value={form.strictDailyHours}
                onValueChange={(val) => setForm(prev => ({ ...prev, strictDailyHours: val }))}
                trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>
          </SectionCard>

          {/* Impact Panel */}
          <ImpactPanel impacts={impacts} />

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.saveButtonContent}>
                <Save size={20} color="white" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

// ---------- Internal micro-components ----------
const PickerSelect = ({
  value,
  options,
  onValueChange,
}: {
  value: string;
  options: string[] | { value: string; label: string }[];
  onValueChange: (val: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  const optArray = typeof options[0] === 'string' ? (options as string[]).map(o => ({ value: o, label: o })) : options as any;
  const selected = optArray.filter((o: any) => o.value === value)[0];

  return (
    <>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setVisible(true)}>
        <Text style={styles.pickerText}>{selected ? selected.label : 'Select...'}</Text>
        <ChevronDown size={18} color="#9ca3af" />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={optArray}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.value === value && styles.modalItemActive]}
                  onPress={() => {
                    onValueChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const CustomSelect = PickerSelect; // alias

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: moderateScale(16), paddingBottom: verticalScale(40) },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  loadingText: { marginTop: verticalScale(12), fontSize: moderateScale(14), color: '#6b7280' },
  header: { marginBottom: verticalScale(24) },
  headerTitle: { fontSize: moderateScale(24), fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: moderateScale(13), color: '#6b7280', marginTop: verticalScale(4) },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: moderateScale(16), borderWidth: 1, borderColor: '#e5e7eb', marginBottom: verticalScale(20), overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: moderateScale(16), gap: moderateScale(12) },
  sectionIconContainer: { width: scale(40), height: verticalScale(40), borderRadius: moderateScale(10), backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: moderateScale(12), color: '#6b7280', marginTop: verticalScale(2) },
  sectionDivider: { height: 1, backgroundColor: '#f3f4f6' },
  sectionBody: { padding: moderateScale(16) },
  inputGroup: { marginBottom: verticalScale(20) },
  inputLabel: { fontSize: moderateScale(12), fontWeight: '700', color: '#374151', marginBottom: verticalScale(8), textTransform: 'uppercase' },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: moderateScale(12), paddingHorizontal: scale(16), paddingVertical: verticalScale(12), fontSize: moderateScale(14), color: '#111827' },
  textArea: { height: verticalScale(100), textAlignVertical: 'top' },
  charCounter: { fontSize: moderateScale(10), color: '#6b7280', alignSelf: 'flex-end', marginTop: verticalScale(4) },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  pickerButton: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: moderateScale(12), paddingHorizontal: scale(16), paddingVertical: verticalScale(14), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: moderateScale(14), color: '#111827', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: moderateScale(20), borderTopRightRadius: moderateScale(20), maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(16), borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '600', color: '#111827' },
  modalItem: { padding: moderateScale(16), borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemActive: { backgroundColor: '#eef2ff' },
  modalItemText: { fontSize: moderateScale(14), color: '#374151' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', padding: moderateScale(12), borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: moderateScale(8) },
  searchInput: { flex: 1, fontSize: moderateScale(14), color: '#111827' },
  timezoneItem: { padding: moderateScale(16), borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  timezoneItemActive: { backgroundColor: '#eef2ff' },
  timezoneItemText: { fontSize: moderateScale(14), color: '#374151' },
  logoUpload: { alignSelf: 'center', marginBottom: verticalScale(20), width: scale(120), height: verticalScale(120), borderRadius: moderateScale(60), backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { alignItems: 'center' },
  logoText: { fontSize: moderateScale(10), color: '#9ca3af', marginTop: verticalScale(4) },
  daySelectorRow: { flexDirection: 'row', justifyContent: 'center', gap: moderateScale(8), marginBottom: verticalScale(8) },
  dayButton: { width: scale(36), height: verticalScale(36), borderRadius: moderateScale(18), borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  dayButtonActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dayButtonText: { fontSize: moderateScale(14), fontWeight: '600', color: '#6b7280' },
  dayButtonTextActive: { color: 'white' },
  sliderContainer: { marginBottom: verticalScale(24) },
  sliderLabel: { fontSize: moderateScale(12), fontWeight: '600', color: '#374151', marginBottom: verticalScale(8) },
  sliderTrack: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(12) },
  sliderDot: { width: scale(8), height: verticalScale(8), borderRadius: moderateScale(4) },
  sliderButtons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: moderateScale(16) },
  sliderBtnText: { fontSize: moderateScale(24), fontWeight: '700', color: '#6366f1', paddingHorizontal: scale(12) },
  sliderValue: { fontSize: moderateScale(16), fontWeight: '700', color: '#111827' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: verticalScale(12) },
  toggleLabel: { fontSize: moderateScale(14), fontWeight: '600', color: '#374151' },
  toggleHint: { fontSize: moderateScale(11), color: '#6b7280', marginTop: verticalScale(2) },
  impactPanel: { backgroundColor: '#f0fdf4', borderRadius: moderateScale(16), padding: moderateScale(16), marginBottom: verticalScale(20), borderWidth: 1, borderColor: '#bbf7d0' },
  impactTitle: { fontSize: moderateScale(14), fontWeight: '700', color: '#166534', marginBottom: verticalScale(12) },
  impactItem: { flexDirection: 'row', marginBottom: verticalScale(12) },
  impactItemTitle: { fontSize: moderateScale(13), fontWeight: '600', color: '#14532d' },
  impactItemDesc: { fontSize: moderateScale(12), color: '#166534', marginTop: verticalScale(2) },
  errorText: { fontSize: moderateScale(12), fontWeight: '600', color: '#ef4444', marginTop: verticalScale(4) },
  saveButton: { backgroundColor: '#6366f1', borderRadius: moderateScale(14), paddingVertical: verticalScale(16), alignItems: 'center', justifyContent: 'center', marginTop: verticalScale(8), shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveButtonContent: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },
  saveButtonText: { fontSize: moderateScale(14), fontWeight: '700', color: 'white', textTransform: 'uppercase' },
  pickerWrapper: {},
});