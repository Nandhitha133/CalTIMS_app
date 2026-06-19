// screens/admin/AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Users,
  Building2,
  Clock,
  Zap,
  ShieldCheck,
  Crown,
  PieChart,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ShieldOff,
  Lock,
  ArrowLeft,
} from 'lucide-react-native';
import { adminAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';

// ─── Super Admin Email Guard ──────────────────────────────────────────────────
const SUPER_ADMIN_EMAIL = 'superadmin@timesheetpro.com';

// Types
interface Metrics {
  total_users: number;
  total_organizations: number;
  trial_users: number;
  basic_users: number;
  pro_users: number;
  active_users_today: number;
}

interface Organization {
  id: string;
  name: string;
  createdAt: string;
  subscription?: {
    planType: string;
    status: string;
    trialEndDate?: string;
  };
}

// Metric Card Component
const MetricCard = ({
  title,
  value,
  IconComponent,
  color,
}: {
  title: string;
  value: number;
  IconComponent: React.ComponentType<any>;
  color: string;
}) => {
  const getColorStyles = () => {
    switch (color) {
      case 'blue':   return { bg: '#e0f2fe', icon: '#0284c7', text: '#0369a1' };
      case 'indigo': return { bg: '#e0e7ff', icon: '#4f46e5', text: '#4338ca' };
      case 'green':  return { bg: '#dcfce7', icon: '#16a34a', text: '#15803d' };
      case 'orange': return { bg: '#ffedd5', icon: '#ea580c', text: '#c2410c' };
      case 'purple': return { bg: '#f3e8ff', icon: '#9333ea', text: '#7e22ce' };
      case 'rose':   return { bg: '#ffe4e6', icon: '#e11d48', text: '#be123c' };
      default:       return { bg: '#f1f5f9', icon: '#64748b', text: '#475569' };
    }
  };

  const styles_color = getColorStyles();

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: styles_color.bg }]}>
        <IconComponent size={24} color={styles_color.icon} />
      </View>
      <View>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { color: styles_color.text }]}>{value}</Text>
      </View>
    </View>
  );
};

// Plan Progress Component
const PlanProgress = ({ 
  label, 
  count, 
  total, 
  color 
}: { 
  label: string; 
  count: number; 
  total: number; 
  color: string;
}) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  const getColorCode = () => {
    switch (color) {
      case 'bg-orange-400': return '#f97316';
      case 'bg-purple-500': return '#8b5cf6';
      case 'bg-rose-500': return '#f43f5e';
      default: return '#6366f1';
    }
  };

  return (
    <View style={styles.planProgress}>
      <View style={styles.planProgressHeader}>
        <Text style={styles.planProgressLabel}>{label}</Text>
        <Text style={styles.planProgressCount}>
          {count} orgs ({percentage.toFixed(1)}%)
        </Text>
      </View>
      <View style={styles.progressBarTrack}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${percentage}%`, backgroundColor: getColorCode() }
          ]} 
        />
      </View>
    </View>
  );
};

// Plan Badge Component
const PlanBadge = ({ plan }: { plan: string }) => {
  const getPlanStyles = () => {
    switch (plan) {
      case 'TRIAL':
        return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' };
      case 'BASIC':
        return { bg: '#f3e8ff', text: '#9333ea', border: '#e9d5ff' };
      case 'PRO':
        return { bg: '#ffe4e6', text: '#e11d48', border: '#fecdd3' };
      default:
        return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
    }
  };

  const styles_color = getPlanStyles();

  return (
    <View style={[styles.planBadge, { backgroundColor: styles_color.bg, borderColor: styles_color.border }]}>
      <Text style={[styles.planBadgeText, { color: styles_color.text }]}>{plan}</Text>
    </View>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'ACTIVE':
        return { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' };
      case 'EXPIRED':
        return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' };
      case 'CANCELLED':
        return { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' };
      default:
        return { bg: '#dcfce7', text: '#16a34a', dot: '#22c55e' };
    }
  };

  const styles_color = getStatusStyles();

  return (
    <View style={styles.statusBadge}>
      <View style={[styles.statusDot, { backgroundColor: styles_color.dot }]} />
      <Text style={[styles.statusText, { color: styles_color.text }]}>{status}</Text>
    </View>
  );
};

// Organization Card Component
const OrganizationCard = ({ org }: { org: Organization }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity 
      style={styles.orgCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.orgCardHeader}>
        <View style={styles.orgAvatar}>
          <Text style={styles.orgAvatarText}>
            {org.name?.substring(0, 2).toUpperCase() || 'OR'}
          </Text>
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>{org.name}</Text>
          <Text style={styles.orgId}>ID: {org.id?.substring(0, 8)}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color="#94a3b8" />
        ) : (
          <ChevronDown size={20} color="#94a3b8" />
        )}
      </View>

      {expanded && (
        <View style={styles.orgCardDetails}>
          <View style={styles.orgDetailRow}>
            <Text style={styles.orgDetailLabel}>Plan</Text>
            <PlanBadge plan={org.subscription?.planType || 'NONE'} />
          </View>
          <View style={styles.orgDetailRow}>
            <Text style={styles.orgDetailLabel}>Status</Text>
            <StatusBadge status={org.subscription?.status || 'UNKNOWN'} />
          </View>
          {org.subscription?.planType === 'TRIAL' && org.subscription.trialEndDate && (
            <View style={styles.orgDetailRow}>
              <Text style={styles.orgDetailLabel}>Trial Ends</Text>
              <Text style={styles.orgDetailValue}>
                {new Date(org.subscription.trialEndDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          <View style={styles.orgDetailRow}>
            <Text style={styles.orgDetailLabel}>Joined</Text>
            <Text style={styles.orgDetailValue}>
              {new Date(org.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Main Component
export default function AdminDashboard() {
  const navigation = useNavigation();

  // ── State ─────────────────────────────────────────────────────────────────
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    total_users: 0,
    total_organizations: 0,
    trial_users: 0,
    basic_users: 0,
    pro_users: 0,
    active_users_today: 0,
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── All hooks declared unconditionally (Rules of Hooks) ───────────────────

  // Check if logged-in user is the super admin email
  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUser(parsed);
          const isSA = parsed?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          setIsSuperAdmin(isSA);
          
          // If not super admin, redirect to regular dashboard immediately
          if (!isSA) {
            navigation.navigate('Dashboard' as never);
          }
        } else {
          setIsSuperAdmin(false);
          navigation.navigate('Dashboard' as never);
        }
      } catch {
        setIsSuperAdmin(false);
        navigation.navigate('Dashboard' as never);
      }
    };
    checkSuperAdmin();
  }, [navigation]);

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (!isManual) setLoading(true);
    try {
      const response: any = await adminAPI.getDashboardMetrics();
      const data = response.data?.data || response.data;
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to fetch admin metrics:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.response?.data?.message || 'Failed to load metrics',
      });
    } finally {
      if (!isManual) setLoading(false);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response: any = await adminAPI.getOrganizations();
      const data = response.data?.data || response.data;
      setOrganizations(data || []);
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.response?.data?.message || 'Failed to load organizations',
      });
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMetrics(true), fetchOrganizations()]);
    setRefreshing(false);
  }, [fetchMetrics, fetchOrganizations]);

  // Only fetch data once we know the user is the super admin
  useEffect(() => {
    if (isSuperAdmin !== true) return;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchOrganizations()]);
      setLoading(false);
    };
    init();
  }, [isSuperAdmin]);

  // ── Conditional renders (all hooks already declared above) ────────────────

  // Still checking email
  if (isSuperAdmin === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Verifying access...</Text>
      </View>
    );
  }

  // Not the super admin — show access denied
  if (!isSuperAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          style={styles.accessDeniedGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.accessDeniedIconWrap}>
            <Lock size={56} color="#f43f5e" />
          </View>
          <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
          <Text style={styles.accessDeniedSub}>
            This module is exclusively available to the{' '}Super Administrator account.
          </Text>
          <Text style={styles.accessDeniedEmail}>{SUPER_ADMIN_EMAIL}</Text>
          <TouchableOpacity
            style={styles.accessDeniedButton}
            onPress={() => navigation.navigate('Dashboard' as never)}
          >
            <ArrowLeft size={18} color="#fff" />
            <Text style={styles.accessDeniedButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // Loading dashboard data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  const totalOrganizations = metrics.total_organizations || 1;


  return (
    <Layout
      title="Super Dashboard"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>System Overview</Text>
          <Text style={styles.headerSubtitle}>Real-time platform metrics and subscription health</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
          <RefreshCw size={18} color={refreshing ? '#94a3b8' : '#6366f1'} />
          <Text style={[styles.refreshButtonText, refreshing && styles.refreshButtonTextDisabled]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard title="Total Users"    value={metrics.total_users}         IconComponent={Users}        color="blue" />
        <MetricCard title="Organizations"  value={metrics.total_organizations} IconComponent={Building2}    color="indigo" />
        <MetricCard title="Active Today"   value={metrics.active_users_today}  IconComponent={Clock}        color="green" />
        <MetricCard title="Trial Plans"    value={metrics.trial_users}         IconComponent={Zap}          color="orange" />
        <MetricCard title="Basic Plans"    value={metrics.basic_users}         IconComponent={ShieldCheck}  color="purple" />
        <MetricCard title="Pro Plans"      value={metrics.pro_users}           IconComponent={Crown}        color="rose" />
      </View>

      <View style={styles.twoColumnGrid}>
        {/* Subscription Mix Section */}
        <View style={styles.subscriptionCard}>
          <LinearGradient
            colors={['#ffffff', '#fafafa']}
            style={styles.subscriptionCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.subscriptionHeader}>
              <PieChart size={24} color="#6366f1" />
              <Text style={styles.subscriptionTitle}>Subscription Mix</Text>
            </View>
            <View style={styles.subscriptionContent}>
              <PlanProgress 
                label="Free Trial" 
                count={metrics.trial_users} 
                total={totalOrganizations} 
                color="bg-orange-400" 
              />
              <PlanProgress 
                label="Basic Plan" 
                count={metrics.basic_users} 
                total={totalOrganizations} 
                color="bg-purple-500" 
              />
              <PlanProgress 
                label="Pro Plus" 
                count={metrics.pro_users} 
                total={totalOrganizations} 
                color="bg-rose-500" 
              />
            </View>
          </LinearGradient>
        </View>

        {/* Platform Health Section */}
        <View style={styles.healthCard}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.healthCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.healthIcon}>
              <ShieldCheck size={24} color="#fff" />
            </View>
            <Text style={styles.healthTitle}>Platform Health</Text>
            <Text style={styles.healthSubtitle}>
              All systems are operational. Backup sync completed 12 minutes ago.
            </Text>
            <View style={styles.healthButtons}>
              <TouchableOpacity style={styles.healthButtonPrimary}>
                <Text style={styles.healthButtonPrimaryText}>View Logs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.healthButtonSecondary}>
                <Text style={styles.healthButtonSecondaryText}>Server Status</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Organizations Section */}
      <View style={styles.orgSection}>
        <View style={styles.orgSectionHeader}>
          <Text style={styles.orgSectionTitle}>Registered Organizations</Text>
          <View style={styles.orgSectionBadge}>
            <Text style={styles.orgSectionBadgeText}>{organizations.length} Total</Text>
          </View>
        </View>

        {organizations.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No organizations found</Text>
          </View>
        ) : (
          organizations.map((org) => (
            <OrganizationCard key={org.id} org={org} />
          ))
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
  },
  refreshButtonTextDisabled: {
    color: '#94a3b8',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  metricCard: {
    width: '46%', // Responsive width using percentage
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: '2%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  subscriptionCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 280,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subscriptionCardGradient: {
    padding: 20,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  subscriptionContent: {
    gap: 16,
  },
  planProgress: {
    gap: 8,
  },
  planProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  planProgressCount: {
    fontSize: 11,
    color: '#64748b',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  healthCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 280,
    borderRadius: 20,
    overflow: 'hidden',
  },
  healthCardGradient: {
    padding: 20,
  },
  healthIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  healthSubtitle: {
    fontSize: 13,
    color: '#c7d2fe',
    marginBottom: 20,
    lineHeight: 18,
  },
  healthButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  healthButtonPrimary: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  healthButtonPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  healthButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  healthButtonSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  orgSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  orgSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orgSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  orgSectionBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orgSectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  orgCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  orgCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  orgAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  orgId: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 2,
  },
  orgCardDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  orgDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orgDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orgDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // ─── Access Denied Screen ───────────────────────────────────────────────────
  accessDeniedContainer: {
    flex: 1,
  },
  accessDeniedGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  accessDeniedIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  accessDeniedTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedSub: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  accessDeniedEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 36,
    letterSpacing: 0.3,
  },
  accessDeniedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  accessDeniedButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});