// screens/subscription/SubscriptionPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { 
  Check, 
  X, 
  Crown, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Users, 
  Calendar, 
  CreditCard, 
  History, 
  Info, 
  AlertCircle,
  TrendingUp, 
  Layers, 
  HelpCircle, 
  FileText,
  Clock, 
  ShieldAlert, 
  BadgeCheck,
  ArrowLeft,
  ChevronRight,
  Mail,
  Phone,
} from 'lucide-react-native';
import api from '../../services/api';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';

const { width } = Dimensions.get('window');

// Types
interface SubscriptionData {
  planType: string;
  status: string;
  userCount: number;
  totalMonthlyCost: number;
  trialStartDate: string;
  trialEndDate: string;
  createdAt: string;
  expiryDate: string;
}

interface BillingRecord {
  planName: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  status: string;
}

interface Plan {
  name: string;
  price: number;
}

const COMPARISON_FEATURES = [
  { name: 'Employee Management', basic: true, pro: true },
  { name: 'Timesheet Entry & Tasks', basic: true, pro: true },
  { name: 'Payroll Processing', basic: false, pro: true },
  { name: 'Leave Management', basic: false, pro: true },
  { name: 'Reports & Analytics', basic: false, pro: true },
  { name: 'Audit Logs & Security', basic: false, pro: true },
  { name: 'Compliance Controls', basic: false, pro: true },
];

const BASIC_PRICE = 29;
const PRO_PRICE = 49;

const UpgradeContactModal = ({ visible, onClose, plan, currencySymbol }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible && plan) {
      setSubmitted(false);
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        message: `Interested in upgrading to ${plan.name} plan (${currencySymbol}${plan.price}/user/month).`,
      });
      loadUserData();
    }
  }, [visible, plan]);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setFormData(prev => ({
          ...prev,
          name: user.name || '',
          company: user.organizationName || '',
          email: user.email || '',
          phone: user.phone || '',
        }));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/support/tickets', {
        name: formData.name,
        email: formData.email,
        issueType: `Subscription Upgrade - ${plan.name}`,
        message: `Plan: ${plan.name}\nPrice: ${currencySymbol}${plan.price}/user/month\nOrganization: ${formData.company || 'N/A'}\nPhone: ${formData.phone || 'N/A'}\n\nNotes:\n${formData.message}`,
      });
      setSubmitted(true);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send request';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!submitted ? (
              <>
                <View style={modalStyles.header}>
                  <View style={modalStyles.iconContainer}>
                    <Sparkles size={28} color="#4f46e5" />
                  </View>
                  <Text style={modalStyles.title}>Upgrade to {plan?.name}</Text>
                  <Text style={modalStyles.subtitle}>
                    Contact our accounts team to finalize your professional plan transition
                  </Text>
                  <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={modalStyles.form}>
                  <View style={modalStyles.field}>
                    <Text style={modalStyles.label}>FULL NAME *</Text>
                    <TextInput
                      style={modalStyles.input}
                      placeholder="Enter your name"
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                    />
                  </View>

                  <View style={modalStyles.field}>
                    <Text style={modalStyles.label}>ORGANIZATION</Text>
                    <TextInput
                      style={modalStyles.input}
                      placeholder="Company Name"
                      value={formData.company}
                      onChangeText={(text) => setFormData({ ...formData, company: text })}
                    />
                  </View>

                  <View style={modalStyles.row}>
                    <View style={modalStyles.halfField}>
                      <Text style={modalStyles.label}>WORK EMAIL *</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="name@company.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.email}
                        onChangeText={(text) => setFormData({ ...formData, email: text })}
                      />
                    </View>
                    <View style={modalStyles.halfField}>
                      <Text style={modalStyles.label}>PHONE</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="+91 1234567890"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      />
                    </View>
                  </View>

                  <View style={modalStyles.field}>
                    <Text style={modalStyles.label}>ADDITIONAL NOTES</Text>
                    <TextInput
                      style={[modalStyles.input, modalStyles.textArea]}
                      placeholder="Any specific requirements?"
                      multiline
                      numberOfLines={4}
                      value={formData.message}
                      onChangeText={(text) => setFormData({ ...formData, message: text })}
                    />
                  </View>

                  <TouchableOpacity
                    style={[modalStyles.submitButton, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Text style={modalStyles.submitText}>SEND UPGRADE REQUEST</Text>
                        <ArrowRight size={18} color="white" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={modalStyles.emailButton}>
                    <Mail size={16} color="#64748b" />
                    <Text style={modalStyles.emailText}>Contact Support Directly</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={modalStyles.successContainer}>
                <View style={modalStyles.successIcon}>
                  <Check size={48} color="#10b981" />
                </View>
                <Text style={modalStyles.successTitle}>Request Received!</Text>
                <Text style={modalStyles.successText}>
                  Our team will contact you shortly to finalize your upgrade to the{' '}
                  <Text style={modalStyles.planHighlight}>{plan?.name}</Text> plan.
                </Text>
                <TouchableOpacity style={modalStyles.doneButton} onPress={onClose}>
                  <Text style={modalStyles.doneText}>DONE</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function SubscriptionPage() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [userCount, setUserCount] = useState(10);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [settings, setSettings] = useState<any>(null);

  const currentPlan = subscription?.planType || 'TRIAL';
  const isTrial = currentPlan === 'TRIAL';

  useEffect(() => {
    loadUserData();
    fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, histRes, settingsRes] = await Promise.all([
        api.get('/subscriptions/current'),
        api.get('/subscriptions/history'),
        api.get('/settings'),
      ]) as any[];

      if (subRes.success) {
        setSubscription(subRes.data);
        setUserCount(subRes.data.userCount || 10);
      }

      if (histRes.success) {
        setHistory(histRes.data);
      }

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        const currency = settingsRes.data.organization?.currency || 'INR';
        setCurrencySymbol(getCurrencySymbol(currency));
      }

      // Cache subscription data
      await AsyncStorage.setItem('subscription', JSON.stringify(subRes.data));
    } catch (error: any) {
      console.error('Error fetching subscription data:', error);
      // Fallback to cached data
      try {
        const cachedSub = await AsyncStorage.getItem('subscription');
        if (cachedSub) {
          setSubscription(JSON.parse(cachedSub));
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return symbols[currency] || '₹';
  };

  const handlePlanAction = (plan: Plan) => {
    if (plan.name === currentPlan) return;
    setSelectedPlan(plan);
    setModalVisible(true);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Layout
      title="Subscription"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      onRefresh={fetchData}
      refreshing={loading}
    >
      <View style={styles.container}>
        <PageHeader 
          title="Plans & Subscription"
          subtitle="Manage your organization's workspace, billing, and growth"
          icon={Sparkles}
          iconColor="#f59e0b"
          iconBgColor="#fffbeb"
        />

        {/* Current Plan Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY SUBSCRIPTION</Text>
          <View style={styles.card}>
            <View style={styles.currentPlanHeader}>
              <View style={styles.planInfoRow}>
                <View style={[styles.planIcon, isTrial ? styles.trialIcon : styles.proIcon]}>
                  {currentPlan === 'PRO' ? (
                    <Crown size={24} color="white" />
                  ) : (
                    <Zap size={24} color="#f59e0b" />
                  )}
                </View>
                <View style={styles.planDetails}>
                  <Text style={styles.planName}>
                    {isTrial ? 'Trial Membership' : `${currentPlan} Enterprise`}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusBadge,
                      subscription?.status === 'ACTIVE' ? styles.statusActive : styles.statusExpired
                    ]}>
                      <Text style={[
                        styles.statusText,
                        subscription?.status === 'ACTIVE' ? styles.statusActiveText : styles.statusExpiredText
                      ]}>
                        {subscription?.status || 'Active'}
                      </Text>
                    </View>
                    {isTrial && (
                      <View style={styles.trialBadge}>
                        <Text style={styles.trialBadgeText}>PHASE 1: TRIAL</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.upgradeButton, currentPlan === 'PRO' && styles.disabledButton]}
                  onPress={() => handlePlanAction({ name: 'PRO', price: PRO_PRICE })}
                  disabled={currentPlan === 'PRO'}
                >
                  <Text style={styles.upgradeButtonText}>UPGRADE PLAN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ACTIVE USERS</Text>
                <Text style={styles.statValue}>{subscription?.userCount || 0} Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>MONTHLY COST</Text>
                <Text style={styles.statValue}>{currencySymbol}{subscription?.totalMonthlyCost || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>STARTED DATE</Text>
                <Text style={styles.statValue}>
                  {formatDate(subscription?.trialStartDate || subscription?.createdAt)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{isTrial ? 'EXPIRES ON' : 'NEXT RENEWAL'}</Text>
                <Text style={styles.statValue}>
                  {formatDate(subscription?.trialEndDate || subscription?.expiryDate)}
                </Text>
              </View>
            </View>

            {isTrial && (
              <View style={styles.infoBanner}>
                <Info size={16} color="#64748b" />
                <Text style={styles.infoText}>
                  Your estimated cost after trial:{' '}
                  <Text style={styles.infoHighlight}>
                    {currencySymbol}{userCount * PRO_PRICE} / month
                  </Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Plan Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHANGE PLAN</Text>
          
          {/* User Count Slider */}
          <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
              <Users size={16} color="#64748b" />
              <Text style={styles.sliderText}>Calculate for your team size:</Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{userCount} Users</Text>
            </View>
          </View>

          {/* Plan Cards */}
          <View style={styles.planCards}>
            {/* Basic Plan */}
            <TouchableOpacity
              style={[styles.planCard, currentPlan === 'BASIC' && styles.activePlanCard]}
              onPress={() => handlePlanAction({ name: 'BASIC', price: BASIC_PRICE })}
            >
              <Text style={styles.planCardTitle}>BASIC</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{currencySymbol}{BASIC_PRICE}</Text>
                <Text style={styles.planPeriod}>/ user</Text>
              </View>
              <View style={styles.featureList}>
                <FeatureItem text="Essential Time Tracking" />
                <FeatureItem text="Team Management" />
                <FeatureItem text="Basic Reporting" />
              </View>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  currentPlan === 'BASIC' && styles.currentPlanButton
                ]}
                disabled={currentPlan === 'BASIC'}
              >
                <Text style={[
                  styles.selectButtonText,
                  currentPlan === 'BASIC' && styles.currentPlanButtonText
                ]}>
                  {currentPlan === 'BASIC' ? 'Current Plan' : 'Select Basic'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Pro Plan */}
            <TouchableOpacity
              style={[styles.planCard, styles.proCard, currentPlan === 'PRO' && styles.activePlanCard]}
              onPress={() => handlePlanAction({ name: 'PRO', price: PRO_PRICE })}
            >
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
              <Text style={styles.planCardTitle}>PRO</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{currencySymbol}{PRO_PRICE}</Text>
                <Text style={styles.planPeriod}>/ user</Text>
              </View>
              <View style={styles.featureList}>
                <FeatureItem text="Advanced Payroll" />
                <FeatureItem text="Compliance Controls" />
                <FeatureItem text="Strategic Insights" />
              </View>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  styles.proSelectButton,
                  currentPlan === 'PRO' && styles.currentPlanButton
                ]}
                disabled={currentPlan === 'PRO'}
              >
                <Text style={[
                  styles.selectButtonText,
                  styles.proSelectButtonText,
                  currentPlan === 'PRO' && styles.currentPlanButtonText
                ]}>
                  {currentPlan === 'PRO' ? 'Current Plan' : 'Select Pro'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FEATURE COMPARISON</Text>
          <View style={styles.comparisonTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 2 }]}>Platform Feature</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Basic</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Pro</Text>
            </View>
            {COMPARISON_FEATURES.map((feature, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.featureName, { flex: 2 }]}>{feature.name}</Text>
                <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                  {feature.basic ? (
                    <Check size={16} color="#10b981" />
                  ) : (
                    <X size={16} color="#e2e8f0" />
                  )}
                </View>
                <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                  {feature.pro ? (
                    <Check size={16} color="#10b981" />
                  ) : (
                    <X size={16} color="#e2e8f0" />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Billing History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUBSCRIPTION LEDGER</Text>
          {history.length > 0 ? (
            <View style={styles.historyList}>
              {history.map((record, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyIcon}>
                      {record.planName.toLowerCase().includes('pro') ? (
                        <Crown size={18} color="#f59e0b" />
                      ) : (
                        <Zap size={18} color="#3b82f6" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.historyPlanName}>{record.planName}</Text>
                      <Text style={styles.historyDate}>
                        {formatDate(record.startDate)} - {formatDate(record.endDate)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyCost}>{currencySymbol}{record.totalCost}</Text>
                    <Text style={[
                      styles.historyStatus,
                      record.status === 'ACTIVE' ? styles.historyStatusActive : {}
                    ]}>
                      {record.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No previous billing records found.</Text>
            </View>
          )}
        </View>

        {/* Plan Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXPLORE PLANS</Text>
        </View>
      </View>

      <UpgradeContactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        plan={selectedPlan}
        currencySymbol={currencySymbol}
      />
    </Layout>
  );
}

const FeatureItem = ({ text }: { text: string }) => (
  <View style={styles.featureItem}>
    <Check size={14} color="#10b981" />
    <Text style={styles.featureItemText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 14,
  },
  headerContent: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 20,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 2,
    marginBottom: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 24,
  },
  currentPlanHeader: {
    gap: 24,
  },
  planInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialIcon: {
    backgroundColor: '#fef3c7',
  },
  proIcon: {
    backgroundColor: '#0f172a',
  },
  planDetails: {
    flex: 1,
    gap: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#ecfdf5',
  },
  statusExpired: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusActiveText: {
    color: '#10b981',
  },
  statusExpiredText: {
    color: '#ef4444',
  },
  trialBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  upgradeButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#f1f5f9',
  },
  upgradeButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statItem: {
    width: '50%',
    marginBottom: 16,
    gap: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  infoHighlight: {
    fontWeight: '800',
    color: '#0f172a',
    fontStyle: 'normal',
  },
  sliderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sliderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sliderContainer: {
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  planCards: {
    flexDirection: 'row',
    gap: 16,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    padding: 20,
    position: 'relative',
  },
  activePlanCard: {
    borderColor: '#3b82f6',
  },
  proCard: {
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 1,
  },
  recommendedText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  planCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 24,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 20,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  planPeriod: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  featureList: {
    gap: 8,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  selectButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  proSelectButton: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  currentPlanButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  selectButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 2,
  },
  proSelectButtonText: {
    color: '#ffffff',
  },
  currentPlanButtonText: {
    color: '#94a3b8',
  },
  comparisonTable: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  featureName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyPlanName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  historyDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyCost: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  historyStatusActive: {
    color: '#10b981',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    fontWeight: '500',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    maxHeight: '80%',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  form: {
    padding: 24,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  submitText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  emailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  successContainer: {
    padding: 48,
    alignItems: 'center',
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  planHighlight: {
    fontWeight: '800',
    color: '#4f46e5',
  },
  doneButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  doneText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
});