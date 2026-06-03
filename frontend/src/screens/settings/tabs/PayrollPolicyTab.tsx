// src/screens/settings/tabs/PayrollPolicyTab.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ShieldCheck, 
  Clock, 
  Settings2, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  Calculator,
  IndianRupee,
  Globe,
  Briefcase,
  Percent,
  AlertCircle,
  ChevronDown
} from 'lucide-react-native';
import { policyAPI } from '../../../services/endpoints';
import { complianceEngine } from '../../../features/payroll/complianceEngine';
import Layout from '../../../components/common/Layout';
import PageHeader from '../../../components/common/PageHeader';

const PT_STATE_CONFIGS: any = {
  TN: {
    name: "Tamil Nadu",
    isApplicable: true,
    slabs: [
      { min: 0, max: 3500, amount: 0 },
      { min: 3501, max: 5000, amount: 22.5 },
      { min: 5001, max: 7500, amount: 52.5 },
      { min: 7501, max: 10000, amount: 115 },
      { min: 10001, max: 12500, amount: 171 },
      { min: 12501, max: 15000, amount: 195 },
      { min: 15001, max: 999999999, amount: 208 },
    ],
  },
  MH: {
    name: "Maharashtra",
    isApplicable: true,
    slabs: [
      { min: 0, max: 7500, amount: 0 },
      { min: 7501, max: 10000, amount: 175 },
      { min: 10001, max: 999999999, amount: 200 },
    ],
    specialNote: "February month tax is ₹300 for salaries above ₹10,000.",
  },
  KA: {
    name: "Karnataka",
    isApplicable: true,
    slabs: [
      { min: 0, max: 15000, amount: 0 },
      { min: 15001, max: 999999999, amount: 200 },
    ],
  },
  WB: {
    name: "West Bengal",
    isApplicable: true,
    slabs: [
      { min: 0, max: 8500, amount: 0 },
      { min: 8501, max: 10000, amount: 90 },
      { min: 10001, max: 15000, amount: 110 },
      { min: 15001, max: 25000, amount: 130 },
      { min: 25001, max: 40000, amount: 150 },
      { min: 40001, max: 999999999, amount: 200 },
    ],
  },
  AP: {
    name: "Andhra Pradesh",
    isApplicable: true,
    slabs: [
      { min: 0, max: 15000, amount: 0 },
      { min: 15001, max: 20000, amount: 150 },
      { min: 20001, max: 999999999, amount: 200 },
    ],
  },
  TS: {
    name: "Telangana",
    isApplicable: true,
    slabs: [
      { min: 0, max: 15000, amount: 0 },
      { min: 15001, max: 20000, amount: 150 },
      { min: 20001, max: 999999999, amount: 200 },
    ],
  },
  GJ: {
    name: "Gujarat",
    isApplicable: true,
    slabs: [
      { min: 0, max: 6000, amount: 0 },
      { min: 6001, max: 9000, amount: 80 },
      { min: 9001, max: 12000, amount: 150 },
      { min: 12001, max: 999999999, amount: 200 },
    ],
  },
  MP: {
    name: "Madhya Pradesh",
    isApplicable: true,
    slabs: [
      { min: 0, max: 18750, amount: 0 },
      { min: 18751, max: 25000, amount: 125 },
      { min: 25001, max: 33333, amount: 167 },
      { min: 33334, max: 999999999, amount: 208 },
    ],
  },
  CG: {
    name: "Chhattisgarh",
    isApplicable: true,
    slabs: [
      { min: 0, max: 15000, amount: 0 },
      { min: 15001, max: 16666, amount: 125 },
      { min: 16667, max: 999999999, amount: 208 },
    ],
  },
  OD: {
    name: "Odisha",
    isApplicable: true,
    slabs: [
      { min: 0, max: 13333, amount: 0 },
      { min: 13334, max: 25000, amount: 125 },
      { min: 25001, max: 999999999, amount: 200 },
    ],
  },
  KL: {
    name: "Kerala",
    isApplicable: true,
    mode: "HALF_YEARLY",
    slabs: [
      { min: 0, max: 11999, amount: 0 },
      { min: 12000, max: 17999, amount: 120 },
      { min: 18000, max: 29999, amount: 180 },
      { min: 30000, max: 44999, amount: 300 },
      { min: 45000, max: 59999, amount: 450 },
      { min: 60000, max: 74999, amount: 600 },
      { min: 75000, max: 99999, amount: 750 },
      { min: 100000, max: 124999, amount: 1000 },
      { min: 125000, max: 999999999, amount: 1250 },
    ],
    note: "Slabs are applied on half-yearly income (total of 6 months).",
  },
  AS: {
    name: "Assam",
    isApplicable: true,
    slabs: [
      { min: 0, max: 10000, amount: 0 },
      { min: 10001, max: 15000, amount: 150 },
      { min: 15001, max: 20000, amount: 180 },
      { min: 20001, max: 999999999, amount: 208 },
    ],
  },
  ML: {
    name: "Meghalaya",
    isApplicable: true,
    slabs: [
      { min: 0, max: 4166, amount: 0 },
      { min: 4167, max: 6250, amount: 16.66 },
      { min: 6251, max: 8333, amount: 25 },
      { min: 8334, max: 12500, amount: 41.66 },
      { min: 12501, max: 16666, amount: 62.5 },
      { min: 16667, max: 20833, amount: 83.33 },
      { min: 20834, max: 999999999, amount: 104.16 },
    ],
  },
  TR: {
    name: "Tripura",
    isApplicable: true,
    slabs: [
      { min: 0, max: 7500, amount: 0 },
      { min: 7501, max: 10000, amount: 110 },
      { min: 10001, max: 15000, amount: 150 },
      { min: 15001, max: 999999999, amount: 208 },
    ],
  },
  SK: {
    name: "Sikkim",
    isApplicable: true,
    slabs: [
      { min: 0, max: 16666, amount: 0 },
      { min: 16667, max: 999999999, amount: 125 },
    ],
  },
  DL: { name: "Delhi", isApplicable: false },
  HR: { name: "Haryana", isApplicable: false },
  UP: { name: "Uttar Pradesh", isApplicable: false },
  RJ: { name: "Rajasthan", isApplicable: false },
  PB: { name: "Punjab", isApplicable: false },
  HP: { name: "Himachal Pradesh", isApplicable: false },
  JK: { name: "Jammu & Kashmir", isApplicable: false },
  UK: { name: "Uttarakhand", isApplicable: false },
  BR: { name: "Bihar", isApplicable: false },
  JH: { name: "Jharkhand", isApplicable: false },
  GA: { name: "Goa", isApplicable: false },
};

export default function PayrollPolicyTab() {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("statutory");
  const [simulationSalary, setSimulationSalary] = useState(50000);
  const [initialState, setInitialState] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    fetchPolicy();
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

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const response = await policyAPI.getPolicy() as any;
      const policyData = response.data?.data || response.data || response;
      setPolicy(policyData);
      setInitialState(JSON.stringify(policyData));
    } catch (err: any) {
      console.error("[PayrollPolicy] Fetch Error:", err);
      const errorMessage = err.message || "Failed to load payroll policy";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (JSON.stringify(policy) === initialState) {
      Alert.alert("Info", "No changes detected");
      return;
    }

    setSaving(true);
    try {
      await policyAPI.updatePolicy(policy);
      setInitialState(JSON.stringify(policy));
      Alert.alert("Success", "Payroll policy updated successfully");
      fetchPolicy();
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save policy";
      Alert.alert("Error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePTStateChange = (stateCode: string) => {
    const config = PT_STATE_CONFIGS[stateCode];
    if (!config) return;

    const newPT = {
      ...policy.statutory.pt,
      state: stateCode,
      enabled: config.isApplicable,
      mode: config.mode || "MONTHLY",
      slabs: config.isApplicable ? [...(config.slabs || [])] : [],
    };

    setPolicy({
      ...policy,
      statutory: {
        ...policy.statutory,
        pt: newPT,
      },
    });

    if (config.isApplicable) {
      Alert.alert("Success", `PT slabs prefilled for ${config.name}`);
    } else {
      Alert.alert("Info", `Professional Tax is not applicable for ${config.name}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPolicy();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!policy) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={40} color="#ef4444" />
        <Text style={styles.errorText}>No payroll policy found.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPolicy}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Layout
      title="Payroll Architecture"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.container}>
        <PageHeader 
          title="Payroll Architecture" 
          subtitle="Define statutory rules, overtime engines, and disbursement cycles" 
        />

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { id: "statutory", label: "Statutory", icon: ShieldCheck },
            { id: "attendance", label: "Attendance & OT", icon: Clock },
            { id: "rounding", label: "Engine", icon: Settings2 },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabButton,
                activeTab === tab.id && styles.activeTabButton
              ]}
            >
              <tab.icon size={16} color={activeTab === tab.id ? "#6366f1" : "#64748b"} />
              <Text style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          {activeTab === "statutory" && (
            <View style={styles.section}>
              {/* PF Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <View style={[styles.iconBox, { backgroundColor: '#eef2ff' }]}>
                      <ShieldCheck size={20} color="#6366f1" />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Provident Fund (PF)</Text>
                      <Text style={styles.cardSubtitle}>STATUTORY CONTRIBUTION</Text>
                    </View>
                  </View>
                  <Switch
                    value={policy?.statutory?.pf?.enabled}
                    onValueChange={(val) => 
                      setPolicy({
                        ...policy,
                        statutory: {
                          ...policy.statutory,
                          pf: { ...policy.statutory.pf, enabled: val }
                        }
                      })
                    }
                    trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                  />
                </View>

                {policy?.statutory?.pf?.enabled && (
                  <View style={styles.cardBody}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>EMPLOYEE %</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(policy?.statutory?.pf?.employeePercent || 0)}
                            onChangeText={(val) => 
                              setPolicy({
                                ...policy,
                                statutory: {
                                  ...policy.statutory,
                                  pf: { ...policy.statutory.pf, employeePercent: parseFloat(val) || 0 }
                                }
                              })
                            }
                          />
                          <Percent size={14} color="#94a3b8" style={styles.inputIcon} />
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>EMPLOYER %</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(policy?.statutory?.pf?.employerPercent || 0)}
                            onChangeText={(val) => 
                              setPolicy({
                                ...policy,
                                statutory: {
                                  ...policy.statutory,
                                  pf: { ...policy.statutory.pf, employerPercent: parseFloat(val) || 0 }
                                }
                              })
                            }
                          />
                          <Percent size={14} color="#94a3b8" style={styles.inputIcon} />
                        </View>
                      </View>
                    </View>
                    <View style={styles.checkboxRow}>
                      <Text style={styles.checkboxLabel}>Restrict to Wage Ceiling (₹15,000)</Text>
                      <Switch
                        value={policy?.statutory?.pf?.restrictToCeiling}
                        onValueChange={(val) => 
                          setPolicy({
                            ...policy,
                            statutory: {
                              ...policy.statutory,
                              pf: { ...policy.statutory.pf, restrictToCeiling: val }
                            }
                          })
                        }
                        trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* ESI Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <View style={[styles.iconBox, { backgroundColor: '#ecfdf5' }]}>
                      <Briefcase size={20} color="#10b981" />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>State Insurance (ESI)</Text>
                      <Text style={styles.cardSubtitle}>MEDICAL COMPLIANCE</Text>
                    </View>
                  </View>
                  <Switch
                    value={policy?.statutory?.esi?.enabled}
                    onValueChange={(val) => 
                      setPolicy({
                        ...policy,
                        statutory: {
                          ...policy.statutory,
                          esi: { ...policy.statutory.esi, enabled: val }
                        }
                      })
                    }
                    trackColor={{ false: "#e2e8f0", true: "#10b981" }}
                  />
                </View>

                {policy?.statutory?.esi?.enabled && (
                  <View style={styles.cardBody}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>EMPLOYEE %</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(policy?.statutory?.esi?.employeePercent || 0)}
                            onChangeText={(val) => 
                              setPolicy({
                                ...policy,
                                statutory: {
                                  ...policy.statutory,
                                  esi: { ...policy.statutory.esi, employeePercent: parseFloat(val) || 0 }
                                }
                              })
                            }
                          />
                          <Percent size={14} color="#94a3b8" style={styles.inputIcon} />
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>THRESHOLD LIMIT</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(policy?.statutory?.esi?.threshold || 0)}
                            onChangeText={(val) => 
                              setPolicy({
                                ...policy,
                                statutory: {
                                  ...policy.statutory,
                                  esi: { ...policy.statutory.esi, threshold: parseFloat(val) || 0 }
                                }
                              })
                            }
                          />
                          <IndianRupee size={14} color="#94a3b8" style={styles.inputIcon} />
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* PT Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                      <Globe size={20} color="#f59e0b" />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Professional Tax (PT)</Text>
                      <Text style={styles.cardSubtitle}>STATE WISE COMPLIANCE</Text>
                    </View>
                  </View>
                  <Switch
                    value={policy?.statutory?.pt?.enabled}
                    onValueChange={(val) => 
                      setPolicy({
                        ...policy,
                        statutory: {
                          ...policy.statutory,
                          pt: { ...policy.statutory.pt, enabled: val }
                        }
                      })
                    }
                    trackColor={{ false: "#e2e8f0", true: "#f59e0b" }}
                  />
                </View>

                {policy?.statutory?.pt?.enabled && (
                  <View style={styles.cardBody}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>WORK STATE</Text>
                      <TouchableOpacity 
                        style={styles.selector}
                        onPress={() => {
                          // Simple state picker logic
                          const states = Object.keys(PT_STATE_CONFIGS);
                          Alert.alert(
                            "Select State",
                            "Choose the applicable work state",
                            states.map(s => ({
                              text: PT_STATE_CONFIGS[s].name,
                              onPress: () => handlePTStateChange(s)
                            })) as any
                          );
                        }}
                      >
                        <Text style={styles.selectorText}>
                          {PT_STATE_CONFIGS[policy?.statutory?.pt?.state]?.name || "Select State"}
                        </Text>
                        <RefreshCcw size={14} color="#6366f1" />
                      </TouchableOpacity>
                    </View>

                    {/* Slabs List */}
                    <View style={styles.slabsHeader}>
                      <Text style={styles.inputLabel}>GOVERNMENT SLAB RULES</Text>
                      <TouchableOpacity style={styles.addButton} onPress={() => {
                        const newSlabs = [...(policy.statutory.pt.slabs || []), { min: 0, max: 999999, amount: 0 }];
                        setPolicy({...policy, statutory: {...policy.statutory, pt: {...policy.statutory.pt, slabs: newSlabs}}});
                      }}>
                        <Plus size={14} color="#6366f1" />
                        <Text style={styles.addButtonText}>Add Rule</Text>
                      </TouchableOpacity>
                    </View>

                    {(policy?.statutory?.pt?.slabs || []).map((slab: any, idx: number) => (
                      <View key={idx} style={styles.slabRow}>
                        <View style={styles.slabInputGroup}>
                          <TextInput
                            style={styles.slabInput}
                            keyboardType="numeric"
                            value={String(slab.min)}
                            onChangeText={(val) => {
                              const newSlabs = [...policy.statutory.pt.slabs];
                              newSlabs[idx].min = parseFloat(val) || 0;
                              setPolicy({...policy, statutory: {...policy.statutory, pt: {...policy.statutory.pt, slabs: newSlabs}}});
                            }}
                          />
                        </View>
                        <Text style={styles.slabSeparator}>-</Text>
                        <View style={styles.slabInputGroup}>
                          <TextInput
                            style={styles.slabInput}
                            keyboardType="numeric"
                            value={String(slab.max)}
                            onChangeText={(val) => {
                              const newSlabs = [...policy.statutory.pt.slabs];
                              newSlabs[idx].max = parseFloat(val) || 0;
                              setPolicy({...policy, statutory: {...policy.statutory, pt: {...policy.statutory.pt, slabs: newSlabs}}});
                            }}
                          />
                        </View>
                        <View style={[styles.slabInputGroup, { flex: 0.8 }]}>
                          <TextInput
                            style={[styles.slabInput, styles.slabAmountInput]}
                            keyboardType="numeric"
                            value={String(slab.amount)}
                            onChangeText={(val) => {
                              const newSlabs = [...policy.statutory.pt.slabs];
                              newSlabs[idx].amount = parseFloat(val) || 0;
                              setPolicy({...policy, statutory: {...policy.statutory, pt: {...policy.statutory.pt, slabs: newSlabs}}});
                            }}
                          />
                        </View>
                        <TouchableOpacity onPress={() => {
                          const newSlabs = policy.statutory.pt.slabs.filter((_: any, i: number) => i !== idx);
                          setPolicy({...policy, statutory: {...policy.statutory, pt: {...policy.statutory.pt, slabs: newSlabs}}});
                        }}>
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Simulation Box */}
              <View style={styles.sandbox}>
                <View style={styles.sandboxHeader}>
                  <Calculator size={20} color="#6366f1" />
                  <Text style={styles.sandboxTitle}>Compliance Sandbox</Text>
                </View>
                <View style={styles.sandboxInputGroup}>
                  <Text style={styles.sandboxLabel}>Monthly Gross Salary</Text>
                  <View style={styles.sandboxInputWrapper}>
                    <IndianRupee size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.sandboxInput}
                      keyboardType="numeric"
                      value={String(simulationSalary)}
                      onChangeText={(val) => setSimulationSalary(parseFloat(val) || 0)}
                    />
                  </View>
                </View>

                <View style={styles.previewGrid}>
                  {/* PF Preview */}
                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>PF Impact</Text>
                    {(() => {
                      const res = complianceEngine.calculatePF(simulationSalary * 0.4, simulationSalary * 0.1, {...policy?.statutory?.pf, enabled: true});
                      return (
                        <View>
                          <Text style={styles.previewValue}>₹{res.employeePF.toLocaleString()}</Text>
                          <Text style={styles.previewSubtext}>Deduction</Text>
                        </View>
                      );
                    })()}
                  </View>
                  {/* ESI Preview */}
                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>ESI Impact</Text>
                    {(() => {
                      const res = complianceEngine.calculateESI(simulationSalary, {...policy?.statutory?.esi, enabled: true});
                      return (
                        <View>
                          <Text style={styles.previewValue}>₹{res.employeeESI.toLocaleString()}</Text>
                          <Text style={styles.previewSubtext}>Deduction</Text>
                        </View>
                      );
                    })()}
                  </View>
                  {/* PT Preview */}
                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>PT Impact</Text>
                    {(() => {
                      const res = complianceEngine.calculatePT(simulationSalary, {...policy?.statutory?.pt, enabled: true});
                      return (
                        <View>
                          <Text style={styles.previewValue}>₹{res.toLocaleString()}</Text>
                          <Text style={styles.previewSubtext}>Monthly Tax</Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === "attendance" && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
                      <Clock size={20} color="#64748b" />
                    </View>
                    <Text style={styles.cardTitle}>Attendance Policy</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.settingItem}>
                    <View>
                      <Text style={styles.settingLabel}>Standard Working Days</Text>
                      <Text style={styles.settingDesc}>Used for daily rate calculation</Text>
                    </View>
                    <TextInput
                      style={styles.smallInput}
                      keyboardType="numeric"
                      value={String(policy?.attendance?.workingDaysPerMonth)}
                      onChangeText={(val) => setPolicy({...policy, attendance: {...policy.attendance, workingDaysPerMonth: parseInt(val) || 0}})}
                    />
                  </View>
                  <View style={styles.settingItem}>
                    <View>
                      <Text style={styles.settingLabel}>Salary Proration</Text>
                      <Text style={styles.settingDesc}>Adjust pay based on LOPs</Text>
                    </View>
                    <Switch
                      value={policy?.attendance?.prorateSalary}
                      onValueChange={(val) => setPolicy({...policy, attendance: {...policy.attendance, prorateSalary: val}})}
                      trackColor={{ false: "#e2e8f0", true: "#6366f1" }}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
                      <Plus size={20} color="#a855f7" />
                    </View>
                    <Text style={styles.cardTitle}>Overtime Config</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.settingItem}>
                    <View>
                      <Text style={styles.settingLabel}>Enable Overtime</Text>
                      <Text style={styles.settingDesc}>Calculate OT in payroll cycles</Text>
                    </View>
                    <Switch
                      value={policy?.overtime?.enabled}
                      onValueChange={(val) => setPolicy({...policy, overtime: {...policy.overtime, enabled: val}})}
                      trackColor={{ false: "#e2e8f0", true: "#a855f7" }}
                    />
                  </View>
                  <View style={styles.settingItem}>
                    <View>
                      <Text style={styles.settingLabel}>OT Multiplier</Text>
                      <Text style={styles.settingDesc}>Standard OT rate factor</Text>
                    </View>
                    <TextInput
                      style={styles.smallInput}
                      keyboardType="numeric"
                      value={String(policy?.overtime?.multiplier)}
                      onChangeText={(val) => setPolicy({...policy, overtime: {...policy.overtime, multiplier: parseFloat(val) || 1}})}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === "rounding" && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
                      <Settings2 size={20} color="#64748b" />
                    </View>
                    <Text style={styles.cardTitle}>Engine Configuration</Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ROUNDING STRATEGY</Text>
                    <TouchableOpacity 
                      style={styles.selector}
                      onPress={() => {
                        Alert.alert("Rounding Strategy", "Choose strategy", [
                          { text: "Standard Round Off", onPress: () => setPolicy({...policy, rounding: {...policy.rounding, rule: 'ROUND_OFF'}}) },
                          { text: "Ceiling (Always Up)", onPress: () => setPolicy({...policy, rounding: {...policy.rounding, rule: 'ROUND_UP'}}) },
                          { text: "Floor (Always Down)", onPress: () => setPolicy({...policy, rounding: {...policy.rounding, rule: 'ROUND_DOWN'}}) },
                        ]);
                      }}
                    >
                      <Text style={styles.selectorText}>{policy?.rounding?.rule?.replace('_', ' ') || "Select Strategy"}</Text>
                      <ChevronDown size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>DECIMAL PRECISION</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={String(policy?.rounding?.decimals)}
                        onChangeText={(val) => setPolicy({...policy, rounding: {...policy.rounding, decimals: parseInt(val) || 0}})}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#64748b', marginVertical: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#6366f1', borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6, borderRadius: 8 },
  activeTabButton: { backgroundColor: '#f5f3ff' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#6366f1' },
  content: { padding: 16 },
  section: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardSubtitle: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  cardBody: { padding: 16, gap: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1, gap: 6 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12 },
  input: { flex: 1, height: 40, fontSize: 14, fontWeight: '600', color: '#1e293b' },
  inputIcon: { marginLeft: 8 },
  checkboxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f5f3ff', padding: 10, borderRadius: 12 },
  checkboxLabel: { fontSize: 12, fontWeight: '600', color: '#6366f1' },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 40 },
  selectorText: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  slabsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 11, fontWeight: '700', color: '#6366f1' },
  slabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  slabInputGroup: { flex: 1 },
  slabInput: { height: 32, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 8, fontSize: 12, fontWeight: '600', color: '#1e293b' },
  slabSeparator: { color: '#94a3b8' },
  slabAmountInput: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', color: '#6366f1' },
  sandbox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8 },
  sandboxHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sandboxTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  sandboxInputGroup: { gap: 8, marginBottom: 20 },
  sandboxLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  sandboxInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sandboxInput: { flex: 1, height: 48, fontSize: 20, fontWeight: '800', color: '#1e293b' },
  previewGrid: { flexDirection: 'row', gap: 10 },
  previewCard: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  previewLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginBottom: 6 },
  previewValue: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  previewSubtext: { fontSize: 8, color: '#64748b', marginTop: 2 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  settingLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  settingDesc: { fontSize: 11, color: '#64748b' },
  smallInput: { width: 60, height: 36, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#6366f1' },
  saveButton: { margin: 16, height: 52, backgroundColor: '#1e293b', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});
