// src/screens/settings/SettingsScreen.tsx
import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Briefcase,
  Building2,
  Crown,
  Users,
  Search,
  ChevronRight,
  X,
  AlertCircle,
  Palette,
  ShieldCheck,
  Zap,
  Calendar,
  Rocket,
  Banknote,
  FileText,
  Fingerprint,
  BarChart,
  Clock,
  UserCheck,
  Bell,
} from 'lucide-react-native';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';

// Types
interface NavItem {
  id: string;
  label: string;
  icon: any;
  route: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// IMPORTANT: These route names MUST match the names in your navigation stack
const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'ORGANIZATION',
    items: [
      { id: 'organization', label: 'General & Organization', icon: Building2, route: 'OrganizationTab' },
      { id: 'branding', label: 'Branding & Theme', icon: Palette, route: 'BrandingTab' },
      { id: 'subscription', label: 'Plan & Subscription', icon: Crown, route: 'SubscriptionTab' },
      { id: 'onboarding', label: 'System Onboarding', icon: Rocket, route: 'OnboardingTab' },
    ]
  },
  {
    title: 'POLICIES',
    items: [
      { id: 'timesheet_policy', label: 'Timesheet Policy', icon: Clock, route: 'TimesheetPolicyTab' },
      { id: 'leave_policy', label: 'Leave Policy', icon: Calendar, route: 'LeavePolicyTab' },
      { id: 'payroll_policy', label: 'Payroll Policy', icon: Banknote, route: 'PayrollPolicyTab' },
      { id: 'compliance', label: 'Compliance & Locks', icon: ShieldCheck, route: 'ComplianceLocksTab' },
    ]
  },
  {
    title: 'SYSTEM & ACCESS',
    items: [
      { id: 'users_roles', label: 'Users & Roles', icon: UserCheck, route: 'UsersAndRolesTab' },
      { id: 'notifications', label: 'Notifications', icon: Bell, route: 'NotificationsTab' },
      { id: 'integrations', label: 'Integrations', icon: Zap, route: 'IntegrationsTab' },
      { id: 'permission_audit', label: 'Permission Audit', icon: Fingerprint, route: 'PermissionAuditTab' },
    ]
  },
  {
    title: 'AUTOMATION & TEMPLATES',
    items: [
      { id: 'payslip_templates', label: 'Payslip Templates', icon: FileText, route: 'PayslipTemplatesTab' },
      { id: 'reports_automation', label: 'Reports Automation', icon: BarChart, route: 'ReportsAutomationTab' },
    ]
  },
];

// Free Trial Banner Component
const FreeTrialBanner = memo(() => {
  const navigation = useNavigation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.content}>
        <View style={bannerStyles.iconContainer}>
          <AlertCircle size={20} color="#dc2626" />
        </View>
        
        <TouchableOpacity 
          style={bannerStyles.button}
          onPress={() => navigation.navigate('SubscriptionTab' as never)}
        >
          <Text style={bannerStyles.buttonText}>UPGRADE NOW</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setDismissed(true)} 
          style={bannerStyles.closeButton}
        >
          <X size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Sidebar Navigation Component
const SettingsSidebar = memo(({ 
  searchQuery, 
  onSearchChange,
  filteredSections,
  onNavigate
}: { 
  searchQuery: string;
  onSearchChange: (text: string) => void;
  filteredSections: NavSection[];
  onNavigate: (route: string, label: string) => void;
}) => {
  return (
    <View style={sidebarStyles.container}>
      {/* Search Bar */}
      <View style={sidebarStyles.searchContainer}>
        <View style={sidebarStyles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={sidebarStyles.searchInput}
            placeholder="Find a setting..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={sidebarStyles.scrollContent}
      >
        {filteredSections.map((section, idx) => (
          <View key={idx} style={sidebarStyles.section}>
            <Text style={sidebarStyles.sectionTitle}>{section.title}</Text>
            <View style={sidebarStyles.navItems}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={sidebarStyles.navItem}
                    onPress={() => onNavigate(item.route, item.label)}
                    activeOpacity={0.7}
                  >
                    <View style={sidebarStyles.navIconContainer}>
                      <Icon size={16} color="#6b7280" />
                    </View>
                    <Text style={sidebarStyles.navLabel}>
                      {item.label}
                    </Text>
                    <ChevronRight size={16} color="#9ca3af" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {filteredSections.length === 0 && (
          <View style={sidebarStyles.emptyContainer}>
            <Search size={32} color="#d1d5db" />
            <Text style={sidebarStyles.emptyTitle}>No results found</Text>
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Text style={sidebarStyles.emptyButton}>Clear search</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={sidebarStyles.footer}>
        <Text style={sidebarStyles.footerText}>
          © 2026 DEVELOPED BY CALDIM
        </Text>
      </View>
    </View>
  );
});

// Main Component
export default function SettingsScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      checkScreenSize();

      const subscription = Dimensions.addEventListener('change', () => {
        checkScreenSize();
      });

      return () => subscription?.remove();
    }, [])
  );

  const checkScreenSize = () => {
    const { width } = Dimensions.get('window');
    setIsDesktop(width >= 1024);
  };

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  // Handle navigation to setting screens
  const handleNavigate = useCallback((routeName: string, label: string) => {
    console.log(`Attempting to navigate to: ${routeName}`);
    
    try {
      // Navigate to the screen
      navigation.navigate(routeName as never);
      setSidebarVisible(false);
    } catch (error) {
      console.error(`Navigation failed for route: ${routeName}`, error);
      Alert.alert(
        'Coming Soon',
        `${label} settings will be available soon.`,
        [{ text: 'OK' }]
      );
    }
  }, [navigation]);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return NAVIGATION_SECTIONS;
    
    const query = searchQuery.toLowerCase();
    return NAVIGATION_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.label.toLowerCase().includes(query) ||
        section.title.toLowerCase().includes(query)
      )
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);

  return (
    <Layout
      title="Settings"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <PageHeader 
        title="Settings"
        subtitle="Manage your organization and system preferences"
        icon={Briefcase}
        iconColor="#6366f1"
        iconBgColor="#eef2ff"
      />
      <View style={styles.container}>
        {/* Free Trial Banner */}
        <FreeTrialBanner />

        {/* Settings Layout */}
        <View style={[styles.layout, isDesktop && styles.layoutDesktop]}>
          {/* Sidebar - Desktop */}
          {isDesktop && (
            <View style={styles.sidebarDesktop}>
              <SettingsSidebar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filteredSections={filteredSections}
                onNavigate={handleNavigate}
              />
            </View>
          )}

          {/* Mobile View - Settings Modules Grid */}
          {!isDesktop && (
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mobileScrollContent}
            >
              {filteredSections.map((section, idx) => (
                <View key={idx} style={styles.mobileSection}>
                  <Text style={styles.mobileSectionTitle}>{section.title}</Text>
                  <View style={styles.mobileGrid}>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.mobileCard}
                          onPress={() => handleNavigate(item.route, item.label)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.mobileIconContainer}>
                            <Icon size={24} color="#6366f1" />
                          </View>
                          <Text style={styles.mobileCardLabel}>{item.label}</Text>
                          <ChevronRight size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {filteredSections.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Search size={48} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={styles.emptyButton}>Clear search</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Mobile Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSidebarVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Settings Menu</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)} style={modalStyles.closeButton}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <SettingsSidebar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filteredSections={filteredSections}
              onNavigate={handleNavigate}
            />
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  layout: {
    flex: 1,
    flexDirection: 'column',
    padding: 16,
    gap: 16,
  },
  layoutDesktop: {
    flexDirection: 'row',
    gap: 24,
  },
  sidebarDesktop: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  mobileScrollContent: {
    paddingBottom: 20,
  },
  mobileSection: {
    marginBottom: 24,
  },
  mobileSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mobileGrid: {
    gap: 8,
  },
  mobileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  mobileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  emptyButton: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
});

const sidebarStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    padding: 0,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  navItems: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  navIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  emptyButton: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6366f1',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#9ca3af',
  },
});

const bannerStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
  },
  days: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  button: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
});