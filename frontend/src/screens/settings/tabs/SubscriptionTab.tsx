import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import {
  Zap,
  ShieldCheck,
  Crown,
  Sparkles,
  Check,
  X,
  ArrowRight,
  Mail,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import Layout from '../../../components/common/Layout';
import { useAuthStore } from '../../../store/authStore';

interface Plan {
  name: string;
  price: string;
  description: string;
  period?: string;
  features: Array<{ name: string; included: boolean }>;
  color: string;
  icon: React.ComponentType<any>;
  recommended?: boolean;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'TRIAL',
    price: '0',
    description: 'Ideal for small teams trying CALTIMS.',
    features: [
      { name: 'Timesheet Entry', included: true },
      { name: 'Weekly Timesheet Submission', included: true },
      { name: 'Project-based Logging', included: true },
      { name: 'Dashboard Overview', included: true },
      { name: 'Holiday Calendar', included: true },
      { name: 'Timesheet History', included: false },
      { name: 'Advanced Reports', included: false },
      { name: 'Payroll Automation', included: false },
      { name: 'Leave Management', included: false },
    ],
    color: 'slate',
    icon: Zap,
  },
  {
    name: 'BASIC',
    price: '29',
    description: 'Enhanced features for growing businesses.',
    period: '/ user / month',
    features: [
      { name: 'Everything in Trial', included: true },
      { name: 'Unlimited Projects', included: true },
      { name: 'Timesheet History', included: true },
      { name: 'Weekly Reports', included: true },
      { name: 'Holiday Management', included: true },
      { name: 'Advanced Dashboard', included: true },
      { name: 'Payroll Automation', included: false },
      { name: 'Leave Management', included: false },
      { name: 'Role Based Access', included: false },
    ],
    color: 'primary',
    icon: ShieldCheck,
    recommended: true,
  },
  {
    name: 'PRO',
    price: '49',
    description: 'The ultimate workforce management suite.',
    period: '/ user / month',
    features: [
      { name: 'Everything in Basic', included: true },
      { name: 'Full Payroll Automation', included: true },
      { name: 'Leave Management', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Custom Reports', included: true },
      { name: 'Audit Logs', included: true },
      { name: 'Single Sign On (SSO)', included: true },
      { name: 'Priority 24/7 Support', included: true },
      { name: 'Dedicated Manager', included: true },
    ],
    color: 'rose',
    icon: Crown,
    popular: true,
  },
];

const UpgradeContactModal = ({ visible, onClose, plan }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
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
        message: `I'm interested in upgrading to the ${plan.name} plan (₹${plan.price} / user / month). Please contact me with more details.`,
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
        }));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
      Alert.alert('Success', 'Upgrade request sent successfully!');
    }, 1500);
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
          {!submitted ? (
            <>
              <View style={modalStyles.header}>
                <View style={modalStyles.iconContainer}>
                  <Sparkles size={24} color="#4f46e5" />
                </View>
                <Text style={modalStyles.title}>Upgrade to {plan?.name}</Text>
                <Text style={modalStyles.subtitle}>
                  Contact our accounts team to finalize your professional plan transition
                </Text>
                <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={modalStyles.form}>
                  <View style={modalStyles.row}>
                    <View style={modalStyles.halfField}>
                      <Text style={modalStyles.label}>Full Name</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="Enter your name"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                      />
                    </View>
                    <View style={modalStyles.halfField}>
                      <Text style={modalStyles.label}>Organization</Text>
                      <TextInput
                        style={modalStyles.input}
                        placeholder="Company Name"
                        value={formData.company}
                        onChangeText={(text) => setFormData({ ...formData, company: text })}
                      />
                    </View>
                  </View>

                  <View style={modalStyles.field}>
                    <Text style={modalStyles.label}>Work Email</Text>
                    <TextInput
                      style={modalStyles.input}
                      placeholder="name@company.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                    />
                  </View>

                  <View style={modalStyles.field}>
                    <Text style={modalStyles.label}>Additional Notes</Text>
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
                    style={modalStyles.submitButton}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Text style={modalStyles.submitText}>Send Upgrade Request</Text>
                        <ArrowRight size={18} color="white" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={modalStyles.emailButton}>
                    <Mail size={16} color="#64748b" />
                    <Text style={modalStyles.emailText}>Direct Email Support</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          ) : (
            <View style={modalStyles.successContainer}>
              <View style={modalStyles.successIcon}>
                <Check size={48} color="#10b981" />
              </View>
              <Text style={modalStyles.successTitle}>Request Received!</Text>
              <Text style={modalStyles.successText}>
                Our team will contact you shortly to finalize your upgrade to the{' '}
                <Text style={modalStyles.planName}>{plan?.name}</Text> plan.
              </Text>
              <TouchableOpacity style={modalStyles.doneButton} onPress={onClose}>
                <Text style={modalStyles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default function SubscriptionTab() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('TRIAL');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const subStr = await AsyncStorage.getItem('subscription');
      if (subStr) {
        const sub = JSON.parse(subStr);
        setCurrentPlan(sub.planType || 'TRIAL');
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const handlePlanAction = (plan: Plan) => {
    if (plan.name === currentPlan) return;
    setSelectedPlan(plan);
    setModalVisible(true);
  };

  const getColorStyle = (color: string) => {
    switch (color) {
      case 'primary': return '#3b82f6';
      case 'rose': return '#f43f5e';
      default: return '#64748b';
    }
  };

  return (
    <Layout
      title="Plan & Subscription"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      showBackButton={true}
      onBackPress={() => navigation.navigate('Dashboard' as never)}
    >
      <View style={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <Sparkles size={14} color="#f59e0b" />
            <Text style={styles.badgeText}>Transparent SaaS Pricing</Text>
          </View>
          <Text style={styles.title}>
            Choose the right plan{' '}
            <Text style={styles.titleHighlight}>for your organization.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Scale your productivity with automated timesheets and payroll.{' '}
            <Text 
              style={{ color: '#4f46e5', fontWeight: '700', textDecorationLine: 'underline' }}
              onPress={() => navigation.navigate('Signup' as never)}
            >
              Start your 28-day free trial today.
            </Text>
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingContainer}>
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan === plan.name;
            const isPopular = plan.popular;
            const isRecommended = plan.recommended;
            const Icon = plan.icon;

            return (
              <View
                key={plan.name}
                style={[
                  styles.card,
                  isPopular && styles.popularCard,
                ]}
              >
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>⭐ Most Popular</Text>
                  </View>
                )}
                {isRecommended && !isPopular && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: `${getColorStyle(plan.color)}15` }]}>
                      <Icon size={28} color={getColorStyle(plan.color)} />
                    </View>
                    {isCurrentPlan && (
                      <View style={styles.activeBadge}>
                        <Check size={12} color="#10b981" />
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>₹{plan.price}</Text>
                    {plan.period ? (
                      <View>
                        <Text style={styles.periodText}>per user</Text>
                        <Text style={styles.periodTextSmall}>per month</Text>
                      </View>
                    ) : (
                      <Text style={styles.periodText}>28 Days Free Trial</Text>
                    )}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <View style={[styles.featureIcon, feature.included && styles.featureIconIncluded]}>
                          {feature.included ? (
                            <Check size={12} strokeWidth={3} color="#3b82f6" />
                          ) : (
                            <View style={styles.featureDot} />
                          )}
                        </View>
                        <Text style={[styles.featureText, !feature.included && styles.featureTextDisabled]}>
                          {feature.name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.upgradeButton,
                      isCurrentPlan && styles.disabledButton,
                      isPopular && styles.popularButton,
                    ]}
                    onPress={() => handlePlanAction(plan)}
                    disabled={isCurrentPlan}
                  >
                    <Text style={[
                      styles.upgradeButtonText,
                      isPopular && styles.popularButtonText,
                      isCurrentPlan && styles.disabledButtonText,
                    ]}>
                      {isCurrentPlan ? 'Your Current Plan' : plan.name === 'TRIAL' ? 'Get Started Free' : `Upgrade to ${plan.name}`}
                    </Text>
                    {!isCurrentPlan && <ArrowRight size={14} color={isPopular ? 'white' : '#1e293b'} />}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <UpgradeContactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        plan={selectedPlan}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  titleHighlight: {
    color: '#3b82f6',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  pricingContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    position: 'relative',
  },
  popularCard: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    left: 20,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  activeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
  },
  planInfo: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 1,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
  },
  periodText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  periodTextSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 20,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconIncluded: {
    backgroundColor: '#eff6ff',
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: -0.3,
  },
  featureTextDisabled: {
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  popularButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  disabledButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  upgradeButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 1,
  },
  popularButtonText: {
    color: 'white',
  },
  disabledButtonText: {
    color: '#94a3b8',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 32,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
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
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  form: {
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  field: {
    marginBottom: 16,
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
    padding: 40,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  planName: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
  },
  doneText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
});
