// screens/projects/ProjectsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  Switch,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  FolderOpen,
  Users,
  Calendar,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  UserPlus,
  Save,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
  Brain,
  BarChart3,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  Gauge,
  TrendingDown,
  CircleCheck,
  TriangleAlert,
} from 'lucide-react-native';
import { projectAPI, userAPI, projectAnalyticsAPI } from '../../services/endpoints';
import Layout from '../../components/common/Layout';
import PageHeader from '../../components/common/PageHeader';
import DropdownModal from '../../components/common/DropdownModal';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { exportFile } from '../../utils/exportHelper';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// ============================================
// TYPES
// ============================================

interface User {
  _id: string;
  name: string;
  email: string;
  employeeId?: string;
  role?: string;
}

interface AllocatedEmployee {
  userId: User | string;
  role: string;
  allocationPercent: number;
  budgetHours: number;
}

interface Project {
  _id: string;
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'on-hold' | 'completed';
  managerId?: User | string;
  allocatedEmployees: AllocatedEmployee[];
  onlyProjectTasks: boolean;
  budgetHours: number;
  actualHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductivityData {
  summary: string;
  resourceUtilization: {
    overall: number;
    perEmployee: Array<{
      employee: string;
      role: string;
      loggedHours: number;
      availableHours: number;
      utilization: number;
      billableHours: number;
      nonBillableHours: number;
      billableRatio: number;
    }>;
  };
  billableAnalysis: {
    billablePercentage: number;
    nonBillablePercentage: number;
    totalBillable: number;
    totalNonBillable: number;
  };
  teamEfficiencyScore: number;
  insights: string[];
  recommendations: string[];
  _meta?: {
    totalLogged: number;
    totalAvailable: number;
    totalBillable: number;
    totalNonBillable: number;
    memberCount: number;
    activeMemberCount: number;
  };
}

interface AICostData {
  summary: string;
  budgetStatus: 'over_budget' | 'on_track' | 'under_budget';
  variance: number;
  riskLevel: 'low' | 'medium' | 'high';
  costLeakage: string[];
  recommendations: string[];
  _meta?: {
    budgetHours: number;
    actualHours: number;
    burnPercent: number;
    memberCount: number;
    activeMemberCount: number;
    daysRemaining: number | null;
    teamBreakdown: Array<{
      name: string;
      role: string;
      loggedHours: number;
      allocatedHours: number;
      burnPercent: number | null;
    }>;
  };
}

const statusColors = {
  active: { bg: '#ecfdf5', text: '#10b981', label: 'Active' },
  'on-hold': { bg: '#fffbeb', text: '#f59e0b', label: 'On Hold' },
  completed: { bg: '#eff6ff', text: '#3b82f6', label: 'Completed' },
};

// ============================================
// GRID PROJECT CARD COMPONENT
// ============================================

const ProjectGridCard = memo(({ 
  project, 
  onView, 
  onEdit, 
  onDelete, 
  onProductivity, 
  onCostAnalysis,
  getStatusStyle, 
  formatDate 
}: any) => {
  const statusStyle = getStatusStyle(project.status);
  const managerName = typeof project.managerId === 'object' ? project.managerId?.name : '—';
  const teamCount = project.allocatedEmployees?.length || 0;
  const progressPercent = project.budgetHours > 0 
    ? Math.min((project.actualHours || 0) / project.budgetHours * 100, 100) 
    : 0;

  return (
    <TouchableOpacity 
      style={styles.gridCard}
      onPress={() => onView(project)}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeAvatar}>
            <Text style={styles.avatarText}>{(project.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.employeeName} numberOfLines={1}>{project.name}</Text>
            <Text style={styles.employeeId}>{project.code}</Text>
          </View>
        </View>
        <View style={[styles.gridStatusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.gridStatusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Building2 size={14} color="#64748b" />
          <Text style={styles.infoText} numberOfLines={1}>{managerName}</Text>
        </View>
        {project.clientName && (
          <View style={styles.infoRow}>
            <Briefcase size={14} color="#64748b" />
            <Text style={styles.infoText} numberOfLines={1}>{project.clientName}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.infoText}>
            {formatDate(project.startDate)} {project.endDate ? `→ ${formatDate(project.endDate)}` : ''}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Users size={14} color="#64748b" />
          <Text style={styles.infoText}>{teamCount} members</Text>
        </View>

        {/* Progress Bar inside Card Content */}
        {project.budgetHours > 0 && (
          <View style={styles.gridProgressSection}>
            <View style={styles.gridProgressBar}>
              <View style={[styles.gridProgressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.gridProgressText}>{Math.round(progressPercent)}% of budget</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft} />
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#f5f3ff' }]} 
            onPress={() => onProductivity(project)}
          >
            <BarChart3 size={16} color="#8b5cf6" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]} 
            onPress={() => onCostAnalysis(project)}
          >
            <Brain size={16} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#fffbeb' }]} 
            onPress={() => onEdit(project)}
          >
            <Pencil size={16} color="#f59e0b" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]} 
            onPress={() => onDelete(project)}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================
// PRODUCTIVITY ANALYTICS MODAL
// ============================================

const ProductivityAnalysisModal = memo(({ project, onClose }: { project: Project | null; onClose: () => void }) => {
  const [result, setResult] = useState<ProductivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      fetchProductivityData();
    }
  }, [project]);

  const fetchProductivityData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await projectAnalyticsAPI.analyzeProductivity(project!._id);
      setResult(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load productivity data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Satisfactory';
    return 'Needs Work';
  };

  const getUtilColor = (util: number) => {
    if (util > 110) return '#ef4444';
    if (util >= 80) return '#10b981';
    if (util >= 50) return '#f59e0b';
    return '#64748b';
  };

  return (
    <Modal visible={!!project} animationType="slide" transparent={true}>
      <View style={analyticsModalStyles.overlay}>
        <View style={analyticsModalStyles.container}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#0f172a', '#2e1065', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={analyticsModalStyles.header}
          >
            <View style={analyticsModalStyles.headerContent}>
              <View style={analyticsModalStyles.headerIcon}>
                <BarChart3 size={20} color="#c4b5fd" />
              </View>
              <View>
                <View style={analyticsModalStyles.headerTitleRow}>
                  <Text style={analyticsModalStyles.headerTitle}>Productivity Analytics</Text>
                  <View style={analyticsModalStyles.aiBadge}>
                    <Sparkles size={10} color="#c4b5fd" />
                    <Text style={analyticsModalStyles.aiBadgeText}>AI</Text>
                  </View>
                </View>
                <Text style={analyticsModalStyles.headerSubtitle}>
                  {project?.name} • {project?.code}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={analyticsModalStyles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={analyticsModalStyles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={analyticsModalStyles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={analyticsModalStyles.loadingText}>Computing productivity metrics...</Text>
                <Text style={analyticsModalStyles.loadingSubtext}>Analysing utilization, billable hours & team engagement</Text>
              </View>
            ) : error ? (
              <View style={analyticsModalStyles.errorContainer}>
                <AlertCircle size={32} color="#ef4444" />
                <Text style={analyticsModalStyles.errorText}>{error}</Text>
              </View>
            ) : result ? (
              <>
                {/* Summary */}
                <View style={analyticsModalStyles.summaryCard}>
                  <View style={analyticsModalStyles.summaryHeader}>
                    <Sparkles size={14} color="#8b5cf6" />
                    <Text style={analyticsModalStyles.summaryTitle}>Productivity Summary</Text>
                  </View>
                  <Text style={analyticsModalStyles.summaryText}>{result.summary}</Text>
                </View>

                {/* KPI Row */}
                <View style={analyticsModalStyles.kpiRow}>
                  <View style={analyticsModalStyles.kpiCard}>
                    <Text style={analyticsModalStyles.kpiLabel}>Utilization</Text>
                    <Text style={[analyticsModalStyles.kpiValue, { color: getUtilColor(result.resourceUtilization.overall) }]}>
                      {result.resourceUtilization.overall}%
                    </Text>
                    <View style={analyticsModalStyles.progressBar}>
                      <View style={[analyticsModalStyles.progressFill, { 
                        width: `${Math.min(result.resourceUtilization.overall, 100)}%`,
                        backgroundColor: getUtilColor(result.resourceUtilization.overall)
                      }]} />
                    </View>
                  </View>

                  <View style={analyticsModalStyles.kpiCard}>
                    <Text style={analyticsModalStyles.kpiLabel}>Billable</Text>
                    <Text style={[analyticsModalStyles.kpiValue, { color: result.billableAnalysis.billablePercentage >= 85 ? '#10b981' : '#f59e0b' }]}>
                      {result.billableAnalysis.billablePercentage}%
                    </Text>
                    <View style={analyticsModalStyles.progressBar}>
                      <View style={[analyticsModalStyles.progressFill, { 
                        width: `${result.billableAnalysis.billablePercentage}%`,
                        backgroundColor: '#8b5cf6'
                      }]} />
                    </View>
                  </View>

                  <View style={analyticsModalStyles.kpiCard}>
                    <Text style={analyticsModalStyles.kpiLabel}>Efficiency</Text>
                    <Text style={[analyticsModalStyles.kpiValue, { color: getScoreColor(result.teamEfficiencyScore) }]}>
                      {result.teamEfficiencyScore}<Text style={analyticsModalStyles.kpiUnit}>/100</Text>
                    </Text>
                    <Text style={[analyticsModalStyles.kpiBadge, { backgroundColor: getScoreColor(result.teamEfficiencyScore) + '20', color: getScoreColor(result.teamEfficiencyScore) }]}>
                      {getScoreLabel(result.teamEfficiencyScore)}
                    </Text>
                  </View>
                </View>

                {/* Hours Breakdown */}
                {result._meta && (
                  <View style={analyticsModalStyles.breakdownCard}>
                    <View style={analyticsModalStyles.breakdownHeader}>
                      <Text style={analyticsModalStyles.breakdownTitle}>Hours Breakdown</Text>
                      <Text style={analyticsModalStyles.breakdownSubtitle}>
                        {result._meta.totalLogged}h of {result._meta.totalAvailable}h available
                      </Text>
                    </View>
                    <View style={analyticsModalStyles.stackedBar}>
                      <View style={[analyticsModalStyles.stackedBarBillable, { 
                        width: result._meta.totalLogged > 0 
                          ? `${(result._meta.totalBillable / result._meta.totalLogged) * Math.min((result._meta.totalLogged / (result._meta.totalAvailable || 1)) * 100, 100)}%` 
                          : '0%'
                      }]} />
                      <View style={[analyticsModalStyles.stackedBarNonBillable, { 
                        width: result._meta.totalLogged > 0 
                          ? `${(result._meta.totalNonBillable / result._meta.totalLogged) * Math.min((result._meta.totalLogged / (result._meta.totalAvailable || 1)) * 100, 100)}%` 
                          : '0%'
                      }]} />
                    </View>
                    <View style={analyticsModalStyles.legend}>
                      <View style={analyticsModalStyles.legendItem}>
                        <View style={[analyticsModalStyles.legendDot, { backgroundColor: '#8b5cf6' }]} />
                        <Text style={analyticsModalStyles.legendText}>Billable: {result._meta.totalBillable}h ({result.billableAnalysis.billablePercentage}%)</Text>
                      </View>
                      <View style={analyticsModalStyles.legendItem}>
                        <View style={[analyticsModalStyles.legendDot, { backgroundColor: '#64748b' }]} />
                        <Text style={analyticsModalStyles.legendText}>Non-Billable: {result._meta.totalNonBillable}h ({result.billableAnalysis.nonBillablePercentage}%)</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Per Employee Utilization */}
                {result.resourceUtilization.perEmployee.length > 0 && (
                  <View style={analyticsModalStyles.teamSection}>
                    <Text style={analyticsModalStyles.sectionTitle}>Resource Utilization</Text>
                    {result.resourceUtilization.perEmployee.map((emp, idx) => (
                      <View key={idx} style={analyticsModalStyles.teamCard}>
                        <View style={analyticsModalStyles.teamHeader}>
                          <View style={analyticsModalStyles.teamAvatar}>
                            <Text style={analyticsModalStyles.teamAvatarText}>{emp.employee.charAt(0)}</Text>
                          </View>
                          <View style={analyticsModalStyles.teamInfo}>
                            <Text style={analyticsModalStyles.teamName}>{emp.employee}</Text>
                            <Text style={analyticsModalStyles.teamRole}>{emp.role}</Text>
                          </View>
                          <View style={analyticsModalStyles.teamStats}>
                            <Text style={analyticsModalStyles.teamHours}>{emp.loggedHours}h / {emp.availableHours}h</Text>
                            <Text style={[analyticsModalStyles.teamUtil, { color: getUtilColor(emp.utilization) }]}>
                              {emp.utilization}%
                            </Text>
                          </View>
                        </View>
                        <View style={analyticsModalStyles.progressBar}>
                          <View style={[analyticsModalStyles.progressFill, { 
                            width: `${Math.min(emp.utilization, 100)}%`,
                            backgroundColor: getUtilColor(emp.utilization)
                          }]} />
                        </View>
                        <View style={analyticsModalStyles.teamBillable}>
                          <View style={analyticsModalStyles.billableBadge}>
                            <Text style={analyticsModalStyles.billableText}>{emp.billableRatio}% billable</Text>
                          </View>
                          <Text style={analyticsModalStyles.billableDetail}>
                            {emp.billableHours}h billable · {emp.nonBillableHours}h non-billable
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Insights */}
                {result.insights.length > 0 && (
                  <View style={analyticsModalStyles.insightsSection}>
                    <Text style={analyticsModalStyles.sectionTitle}>Key Insights</Text>
                    {result.insights.map((insight, idx) => (
                      <View key={idx} style={analyticsModalStyles.insightCard}>
                        <CircleCheck size={14} color="#8b5cf6" />
                        <Text style={analyticsModalStyles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <View style={analyticsModalStyles.recommendationsSection}>
                    <Text style={analyticsModalStyles.sectionTitle}>Recommendations</Text>
                    {result.recommendations.map((rec, idx) => (
                      <View key={idx} style={analyticsModalStyles.recommendationCard}>
                        <View style={analyticsModalStyles.recommendationNumber}>
                          <Text style={analyticsModalStyles.recommendationNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={analyticsModalStyles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={analyticsModalStyles.footer}>
            <Text style={analyticsModalStyles.footerText}>Powered by CalTIMS Productivity Intelligence Engine</Text>
            <TouchableOpacity style={analyticsModalStyles.closeFooterBtn} onPress={onClose}>
              <Text style={analyticsModalStyles.closeFooterText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ============================================
// AI COST ANALYSIS MODAL
// ============================================

const AICostAnalysisModal = memo(({ project, onClose }: { project: Project | null; onClose: () => void }) => {
  const [result, setResult] = useState<AICostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      fetchCostData();
    }
  }, [project]);

  const fetchCostData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await projectAnalyticsAPI.analyzeAICost(project!._id);
      setResult(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load cost analysis');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    over_budget: { label: 'Over Budget', color: '#ef4444', icon: TrendingDown },
    on_track: { label: 'On Track', color: '#f59e0b', icon: ActivityIndicator },
    under_budget: { label: 'Under Budget', color: '#10b981', icon: TrendingUp },
  };

  const riskConfig = {
    low: { label: 'Low Risk', color: '#10b981', icon: CircleCheck },
    medium: { label: 'Medium Risk', color: '#f59e0b', icon: TriangleAlert },
    high: { label: 'High Risk', color: '#ef4444', icon: ShieldAlert },
  };

  return (
    <Modal visible={!!project} animationType="slide" transparent={true}>
      <View style={costModalStyles.overlay}>
        <View style={costModalStyles.container}>
          {/* Gradient Header */}
          <LinearGradient
            colors={['#0f172a', '#1e1b4b', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={costModalStyles.header}
          >
            <View style={costModalStyles.headerContent}>
              <View style={costModalStyles.headerIcon}>
                <Brain size={20} color="#a5b4fc" />
              </View>
              <View>
                <View style={costModalStyles.headerTitleRow}>
                  <Text style={costModalStyles.headerTitle}>AI Cost Intelligence</Text>
                  <View style={costModalStyles.betaBadge}>
                    <Zap size={10} color="#a5b4fc" />
                    <Text style={costModalStyles.betaBadgeText}>Beta</Text>
                  </View>
                </View>
                <Text style={costModalStyles.headerSubtitle}>
                  {project?.name} • {project?.code}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={costModalStyles.closeBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={costModalStyles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={costModalStyles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={costModalStyles.loadingText}>Analysing effort data...</Text>
                <Text style={costModalStyles.loadingSubtext}>Aggregating timesheets, team allocation & burn rate</Text>
              </View>
            ) : error ? (
              <View style={costModalStyles.errorContainer}>
                <AlertCircle size={32} color="#ef4444" />
                <Text style={costModalStyles.errorText}>{error}</Text>
              </View>
            ) : result ? (
              <>
                {/* Summary */}
                <View style={costModalStyles.summaryCard}>
                  <View style={costModalStyles.summaryHeader}>
                    <Sparkles size={14} color="#6366f1" />
                    <Text style={costModalStyles.summaryTitle}>AI Summary</Text>
                  </View>
                  <Text style={costModalStyles.summaryText}>{result.summary}</Text>
                </View>

                {/* KPI Row */}
                <View style={costModalStyles.kpiRow}>
                  <View style={costModalStyles.kpiCard}>
                    <Text style={costModalStyles.kpiLabel}>Budget Status</Text>
                    {(() => {
                      const cfg = statusConfig[result.budgetStatus] || statusConfig.on_track;
                      const Icon = cfg.icon;
                      return (
                        <View style={costModalStyles.kpiValueRow}>
                          <Icon size={16} color={cfg.color} />
                          <Text style={[costModalStyles.kpiValue, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={costModalStyles.kpiCard}>
                    <Text style={costModalStyles.kpiLabel}>Variance</Text>
                    <Text style={[costModalStyles.kpiValue, { color: result.variance >= 0 ? '#10b981' : '#ef4444' }]}>
                      {result.variance >= 0 ? '+' : ''}{result.variance}h
                    </Text>
                    {result._meta && (
                      <Text style={costModalStyles.kpiSubtext}>
                        {result._meta.actualHours}h / {result._meta.budgetHours}h
                      </Text>
                    )}
                  </View>

                  <View style={costModalStyles.kpiCard}>
                    <Text style={costModalStyles.kpiLabel}>Risk Level</Text>
                    {(() => {
                      const cfg = riskConfig[result.riskLevel] || riskConfig.low;
                      const Icon = cfg.icon;
                      return (
                        <View style={costModalStyles.kpiValueRow}>
                          <Icon size={16} color={cfg.color} />
                          <Text style={[costModalStyles.kpiValue, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>

                {/* Burn Rate */}
                {result._meta?.burnPercent !== undefined && (
                  <View style={costModalStyles.burnCard}>
                    <View style={costModalStyles.burnHeader}>
                      <Text style={costModalStyles.burnTitle}>Effort Burn Rate</Text>
                      <Text style={[costModalStyles.burnPercent, { 
                        color: result._meta.burnPercent >= 100 ? '#ef4444' : result._meta.burnPercent >= 85 ? '#f59e0b' : '#10b981'
                      }]}>
                        {result._meta.burnPercent}%
                      </Text>
                    </View>
                    <View style={costModalStyles.progressBar}>
                      <View style={[costModalStyles.progressFill, { 
                        width: `${Math.min(result._meta.burnPercent, 100)}%`,
                        backgroundColor: result._meta.burnPercent >= 100 ? '#ef4444' : result._meta.burnPercent >= 85 ? '#f59e0b' : '#10b981'
                      }]} />
                    </View>
                    <View style={costModalStyles.burnFooter}>
                      <Text style={costModalStyles.burnFooterText}>
                        {result._meta.activeMemberCount} of {result._meta.memberCount} members contributing
                      </Text>
                      {result._meta.daysRemaining !== null && (
                        <View style={costModalStyles.daysRemaining}>
                          <Clock size={12} color="#64748b" />
                          <Text style={costModalStyles.daysRemainingText}>
                            {result._meta.daysRemaining >= 0 ? `${result._meta.daysRemaining}d remaining` : `${Math.abs(result._meta.daysRemaining)}d overdue`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Team Breakdown */}
                {result._meta?.teamBreakdown && result._meta.teamBreakdown.length > 0 && (
                  <View style={costModalStyles.teamSection}>
                    <Text style={costModalStyles.sectionTitle}>Team Effort Breakdown</Text>
                    {result._meta.teamBreakdown.map((member, idx) => (
                      <View key={idx} style={costModalStyles.teamCard}>
                        <View style={costModalStyles.teamHeader}>
                          <View style={costModalStyles.teamAvatar}>
                            <Text style={costModalStyles.teamAvatarText}>{member.name.charAt(0)}</Text>
                          </View>
                          <View style={costModalStyles.teamInfo}>
                            <Text style={costModalStyles.teamName}>{member.name}</Text>
                            <Text style={costModalStyles.teamRole}>{member.role}</Text>
                          </View>
                          <View style={costModalStyles.teamStats}>
                            <Text style={costModalStyles.teamHours}>{member.loggedHours}h / {member.allocatedHours}h</Text>
                            {member.burnPercent !== null && (
                              <Text style={[costModalStyles.teamUtil, { 
                                color: member.burnPercent >= 120 ? '#ef4444' : member.burnPercent >= 85 ? '#f59e0b' : '#10b981'
                              }]}>
                                {member.burnPercent}%
                              </Text>
                            )}
                          </View>
                        </View>
                        {member.allocatedHours > 0 && (
                          <View style={costModalStyles.progressBar}>
                            <View style={[costModalStyles.progressFill, { 
                              width: `${Math.min(member.burnPercent || 0, 100)}%`,
                              backgroundColor: member.burnPercent !== null && member.burnPercent >= 120 ? '#ef4444' : member.burnPercent !== null && member.burnPercent >= 85 ? '#f59e0b' : '#6366f1'
                            }]} />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Cost Leakage */}
                {result.costLeakage.length > 0 && (
                  <View style={costModalStyles.leakageSection}>
                    <Text style={costModalStyles.sectionTitle}>Effort Leakage Detected</Text>
                    {result.costLeakage.map((leak, idx) => (
                      <View key={idx} style={costModalStyles.leakageCard}>
                        <TriangleAlert size={14} color="#f59e0b" />
                        <Text style={costModalStyles.leakageText}>{leak}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <View style={costModalStyles.recommendationsSection}>
                    <Text style={costModalStyles.sectionTitle}>Recommendations</Text>
                    {result.recommendations.map((rec, idx) => (
                      <View key={idx} style={costModalStyles.recommendationCard}>
                        <View style={costModalStyles.recommendationNumber}>
                          <Text style={costModalStyles.recommendationNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={costModalStyles.recommendationText}>{rec}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={costModalStyles.footer}>
            <Text style={costModalStyles.footerText}>Powered by CalTIMS Effort Intelligence Engine</Text>
            <TouchableOpacity style={costModalStyles.closeFooterBtn} onPress={onClose}>
              <Text style={costModalStyles.closeFooterText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ============================================
// MAIN SCREEN
// ============================================

export default function ProjectsScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [projectCodeFilter, setProjectCodeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState({ status: '', managerId: '', projectCode: '' });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProductivityModal, setShowProductivityModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Dropdown visibility states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [dropdownContext, setDropdownContext] = useState<'create' | 'edit' | 'filter'>('create');
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState<number>(-1);

  // Date Picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [datePickerContext, setDatePickerContext] = useState<'start' | 'end'>('start');
  const [tempDate, setTempDate] = useState(new Date());

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    clientName: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    status: 'active' as 'active' | 'on-hold' | 'completed',
    managerId: '',
    budgetHours: 0,
    onlyProjectTasks: false,
    allocatedEmployees: [] as AllocatedEmployee[],
  });

  // Dropdown data
  const [managers, setManagers] = useState<User[]>([]);
  const [allEmployees, setAllEmployees] = useState<User[]>([]);
  const [allProjectsList, setAllProjectsList] = useState<Project[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const limit = 10;

  // Options for dropdowns
  const statusOptions = useMemo(() => [
    { value: 'active', label: 'Active' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ], []);

  const managerOptions = useMemo(() => managers.map(m => ({ value: m._id, label: m.name })), [managers]);
  const employeeOptions = useMemo(() => allEmployees.map(e => ({ value: e._id, label: e.name })), [allEmployees]);

  const fetchAllProjects = async () => {
    try {
      const response = await projectAPI.getAll({ limit: 1000 });
      const data = (response as any)?.data?.data || (response as any).data || [];
      setAllProjectsList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching all projects:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchManagers();
      fetchEmployees();
      fetchProjects();
      fetchAllProjects();
    }, [page, searchQuery, statusFilter, managerFilter, projectCodeFilter])
  );

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

  const fetchManagers = async () => {
    try {
      const response = await userAPI.getAll({ role: 'manager' });
      const data = (response as any)?.data?.data || (response as any).data || [];
      setManagers(data);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await userAPI.getAll({ limit: 1000 });
      const data = (response as any)?.data?.data || (response as any).data || [];
      setAllEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (searchQuery.length >= 2) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (managerFilter) params.managerId = managerFilter;
      if (projectCodeFilter) params.code = projectCodeFilter;

      const response = await projectAPI.getAll(params);
      const projectsData = (response as any)?.data?.data || (response as any).data || [];
      const pagination = (response as any)?.data?.pagination || {};

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setTotalPages(pagination.totalPages || 1);
      setTotalResults(pagination.total || 0);
    } catch (error) {
      console.error('Error fetching projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }
    if (!formData.code.trim()) {
      Alert.alert('Error', 'Project code is required');
      return;
    }
    if (!formData.managerId) {
      Alert.alert('Error', 'Project manager is required');
      return;
    }
    if (!formData.startDate) {
      Alert.alert('Error', 'Start date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        allocatedEmployees: formData.allocatedEmployees
          .filter(emp => emp.userId)
          .map(emp => ({
            ...emp,
            userId: typeof emp.userId === 'object' ? (emp.userId as any)._id : emp.userId
          })),
        endDate: formData.endDate || null,
      };
      await projectAPI.create(payload);
      Alert.alert('Success', 'Project created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchProjects();
      fetchAllProjects();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        allocatedEmployees: formData.allocatedEmployees
          .filter(emp => emp.userId)
          .map(emp => ({
            ...emp,
            userId: typeof emp.userId === 'object' ? (emp.userId as any)._id : emp.userId
          })),
        endDate: formData.endDate || null,
      };
      await projectAPI.update(selectedProject._id, payload);
      Alert.alert('Success', 'Project updated successfully!');
      setShowEditModal(false);
      setSelectedProject(null);
      fetchProjects();
      fetchAllProjects();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      await projectAPI.delete(selectedProject._id);
      Alert.alert('Success', 'Project deleted successfully!');
      setShowDeleteModal(false);
      setSelectedProject(null);
      fetchProjects();
      fetchAllProjects();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete project');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      clientName: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      status: 'active',
      managerId: '',
      budgetHours: 0,
      onlyProjectTasks: false,
      allocatedEmployees: [],
    });
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      clientName: project.clientName || '',
      startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
      endDate: project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '',
      status: project.status,
      managerId: typeof project.managerId === 'object' ? project.managerId._id : project.managerId || '',
      budgetHours: project.budgetHours || 0,
      onlyProjectTasks: project.onlyProjectTasks || false,
      allocatedEmployees: project.allocatedEmployees || [],
    });
    setShowEditModal(true);
  };

  const addTeamMember = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      allocatedEmployees: [
        ...prev.allocatedEmployees,
        { userId: '', role: 'Developer', allocationPercent: 100, budgetHours: 0 },
      ],
    }));
  }, []);

  const removeTeamMember = useCallback((index: number) => {
    setFormData(prev => {
      const newMembers = [...prev.allocatedEmployees];
      newMembers.splice(index, 1);
      return { ...prev, allocatedEmployees: newMembers };
    });
  }, []);

  const updateTeamMember = useCallback((index: number, field: keyof AllocatedEmployee, value: any) => {
    setFormData(prev => {
      const newMembers = [...prev.allocatedEmployees];
      newMembers[index] = { ...newMembers[index], [field]: value };
      return { ...prev, allocatedEmployees: newMembers };
    });
  }, []);

  const getStatusStyle = useCallback((status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.active;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  }, []);

  const openDropdown = useCallback((context: 'create' | 'edit' | 'filter', type: 'status' | 'manager') => {
    setDropdownContext(context);
    if (type === 'status') setShowStatusDropdown(true);
    else if (type === 'manager') setShowManagerDropdown(true);
  }, []);

  const openEmployeeDropdown = useCallback((context: 'create' | 'edit', index: number) => {
    setDropdownContext(context);
    setSelectedEmployeeIndex(index);
    setShowEmployeeDropdown(true);
  }, []);

  const openDatePicker = useCallback((type: 'start' | 'end') => {
    setDatePickerContext(type);
    const currentDate = type === 'start' ? formData.startDate : formData.endDate;
    setTempDate(currentDate ? new Date(currentDate) : new Date());
    if (type === 'start') {
      setShowStartDatePicker(true);
    } else {
      setShowEndDatePicker(true);
    }
  }, [formData.startDate, formData.endDate]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      if (datePickerContext === 'start') {
        setFormData(prev => ({ ...prev, startDate: formattedDate }));
      } else {
        setFormData(prev => ({ ...prev, endDate: formattedDate }));
      }
    }
  }, [datePickerContext]);

  const handleStatusSelect = useCallback((status: string) => {
    if (dropdownContext === 'create' || dropdownContext === 'edit') {
      setFormData(prev => ({ ...prev, status: status as any }));
    } else if (dropdownContext === 'filter') {
      setTempFilters(prev => ({ ...prev, status }));
    }
  }, [dropdownContext]);

  const handleManagerSelect = useCallback((managerId: string) => {
    if (dropdownContext === 'create' || dropdownContext === 'edit') {
      setFormData(prev => ({ ...prev, managerId }));
    } else if (dropdownContext === 'filter') {
      setTempFilters(prev => ({ ...prev, managerId }));
    }
  }, [dropdownContext]);

  const handleEmployeeSelect = useCallback((employeeId: string) => {
    if (selectedEmployeeIndex >= 0) {
      updateTeamMember(selectedEmployeeIndex, 'userId', employeeId);
    }
    setShowEmployeeDropdown(false);
    setSelectedEmployeeIndex(-1);
  }, [selectedEmployeeIndex, updateTeamMember]);

  const handleViewProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowViewModal(true);
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    openEditModal(project);
  }, []);

  const handleDeleteProjectConfirm = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  }, []);

  const handleProductivityAnalysis = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowProductivityModal(true);
  }, []);

  const handleCostAnalysis = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowCostModal(true);
  }, []);

  const stats = useMemo(() => ({
    total: allProjectsList.length,
    active: allProjectsList.filter(p => p.status === 'active').length,
    onHold: allProjectsList.filter(p => p.status === 'on-hold').length,
    completed: allProjectsList.filter(p => p.status === 'completed').length,
  }), [allProjectsList]);

  const getManagerDisplayValue = useCallback((managerId: string) => {
    if (!managerId) return 'Select Manager';
    return managers.find(m => m._id === managerId)?.name || 'Select Manager';
  }, [managers]);

  const getStatusDisplayValue = useCallback((status: string) => {
    if (!status) return 'Select Status';
    return statusOptions.find(s => s.value === status)?.label || 'Select Status';
  }, [statusOptions]);

  const activeFilterCount = (statusFilter ? 1 : 0) + (managerFilter ? 1 : 0) + (projectCodeFilter ? 1 : 0);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Layout
      title="Projects"
      user={user}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
                <Briefcase size={20} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#ecfdf5' }]}>
                <TrendingUp size={20} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>ACTIVE</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fffbeb' }]}>
                <AlertCircle size={20} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{stats.onHold}</Text>
              <Text style={styles.statLabel}>ON HOLD</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
                <CheckCircle2 size={20} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>COMPLETED</Text>
            </View>
          </View>

          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search projects..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={fetchProjects}
              />
            </View>

            <TouchableOpacity
              style={[styles.filterButton, (showFilters || activeFilterCount > 0) && styles.filterButtonActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} color={showFilters || activeFilterCount > 0 ? '#3b82f6' : '#64748b'} />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>New</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Panel */}
          {showFilters && (
            <View style={styles.filterPanel}>
              <Text style={styles.filterTitle}>Filter By</Text>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Status</Text>
                <TouchableOpacity
                  style={styles.filterSelectButton}
                  onPress={() => openDropdown('filter', 'status')}
                >
                  <Text style={[styles.filterSelectText, !tempFilters.status && styles.placeholderText]}>
                    {tempFilters.status ? statusOptions.find(s => s.value === tempFilters.status)?.label || 'All Status' : 'All Status'}
                  </Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Manager</Text>
                <TouchableOpacity
                  style={styles.filterSelectButton}
                  onPress={() => openDropdown('filter', 'manager')}
                >
                  <Text style={[styles.filterSelectText, !tempFilters.managerId && styles.placeholderText]}>
                    {tempFilters.managerId ? managers.find(m => m._id === tempFilters.managerId)?.name || 'All Managers' : 'All Managers'}
                  </Text>
                  <ChevronDown size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.filterClear} onPress={() => setTempFilters({ status: '', managerId: '', projectCode: '' })}>
                  <Text style={styles.filterClearText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterApply} onPress={() => {
                  setStatusFilter(tempFilters.status);
                  setManagerFilter(tempFilters.managerId);
                  setProjectCodeFilter(tempFilters.projectCode);
                  setShowFilters(false);
                  setPage(1);
                }}>
                  <Text style={styles.filterApplyText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FolderOpen size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No projects found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or create a new project</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {projects.map(project => (
                <ProjectGridCard
                  key={project._id}
                  project={project}
                  onView={handleViewProject}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProjectConfirm}
                  onProductivity={handleProductivityAnalysis}
                  onCostAnalysis={handleCostAnalysis}
                  getStatusStyle={getStatusStyle}
                  formatDate={formatDate}
                />
              ))}
            </View>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                onPress={() => { if (page > 1) setPage(page - 1); }}
                disabled={page === 1}
              >
                <ChevronLeft size={16} color="#3b82f6" />
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                onPress={() => { if (page < totalPages) setPage(page + 1); }}
                disabled={page === totalPages}
              >
                <Text style={styles.pageButtonText}>Next</Text>
                <ChevronRight size={16} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Productivity Analytics Modal */}
      <ProductivityAnalysisModal 
        project={showProductivityModal ? selectedProject : null} 
        onClose={() => setShowProductivityModal(false)} 
      />

      {/* AI Cost Analysis Modal */}
      <AICostAnalysisModal 
        project={showCostModal ? selectedProject : null} 
        onClose={() => setShowCostModal(false)} 
      />

      {/* Dropdown Selection Modals */}
      <DropdownModal
        visible={showStatusDropdown}
        onClose={() => setShowStatusDropdown(false)}
        options={statusOptions}
        selectedValue={
          dropdownContext === 'create' || dropdownContext === 'edit' ? formData.status :
            dropdownContext === 'filter' ? tempFilters.status : ''
        }
        onSelect={handleStatusSelect}
        title="Select Status"
      />

      <DropdownModal
        visible={showManagerDropdown}
        onClose={() => setShowManagerDropdown(false)}
        options={managerOptions}
        selectedValue={
          dropdownContext === 'create' || dropdownContext === 'edit' ? formData.managerId :
            dropdownContext === 'filter' ? tempFilters.managerId : ''
        }
        onSelect={handleManagerSelect}
        title="Select Manager"
      />

      <DropdownModal
        visible={showEmployeeDropdown}
        onClose={() => setShowEmployeeDropdown(false)}
        options={employeeOptions}
        selectedValue={
          selectedEmployeeIndex >= 0 ? (formData.allocatedEmployees[selectedEmployeeIndex]?.userId as string) : ''
        }
        onSelect={handleEmployeeSelect}
        title="Select Team Member"
      />

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate ? new Date(formData.startDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate ? new Date(formData.endDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Create / Edit Project Modal */}
      <Modal
        visible={showCreateModal || showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedProject(null);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={modalStyles.overlay}
        >
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>
                {showEditModal ? 'Edit Project' : 'Create Project'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedProject(null);
                  resetForm();
                }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={modalStyles.form}>
                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Project Name *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Enter project name"
                    placeholderTextColor="#94a3b8"
                    value={formData.name}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Project Code *</Text>
                  <TextInput
                    style={[modalStyles.input, { textTransform: 'uppercase' }]}
                    placeholder="e.g. PRJ-001"
                    placeholderTextColor="#94a3b8"
                    value={formData.code}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, code: val }))}
                    editable={!showEditModal}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Client Name</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Enter client name"
                    placeholderTextColor="#94a3b8"
                    value={formData.clientName}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, clientName: val }))}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Project Manager *</Text>
                  <TouchableOpacity
                    style={modalStyles.selectButton}
                    onPress={() => openDropdown(showEditModal ? 'edit' : 'create', 'manager')}
                  >
                    <Text style={[modalStyles.selectButtonText, !formData.managerId && modalStyles.placeholderText]}>
                      {getManagerDisplayValue(formData.managerId)}
                    </Text>
                    <ChevronDown size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Start Date *</Text>
                  <TouchableOpacity
                    style={modalStyles.selectButton}
                    onPress={() => openDatePicker('start')}
                  >
                    <Text style={modalStyles.selectButtonText}>
                      {formData.startDate ? formatDate(formData.startDate) : 'Select Start Date'}
                    </Text>
                    <Calendar size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>End Date</Text>
                  <TouchableOpacity
                    style={modalStyles.selectButton}
                    onPress={() => openDatePicker('end')}
                  >
                    <Text style={[modalStyles.selectButtonText, !formData.endDate && modalStyles.placeholderText]}>
                      {formData.endDate ? formatDate(formData.endDate) : 'No End Date'}
                    </Text>
                    <Calendar size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Budget Hours</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Enter budget hours"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={String(formData.budgetHours || '')}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, budgetHours: Number(val.replace(/\D/g, '')) }))}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Description</Text>
                  <TextInput
                    style={[modalStyles.input, modalStyles.textArea]}
                    placeholder="Enter project description"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    value={formData.description}
                    onChangeText={(val) => setFormData(prev => ({ ...prev, description: val }))}
                  />
                </View>

                <View style={modalStyles.switchRow}>
                  <Text style={modalStyles.switchLabel}>Restrict Tasks to Allocated Members</Text>
                  <Switch
                    value={formData.onlyProjectTasks}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, onlyProjectTasks: val }))}
                    trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                    thumbColor={formData.onlyProjectTasks ? '#3b82f6' : '#f4f3f4'}
                  />
                </View>

                <View style={modalStyles.sectionHeaderRow}>
                  <Text style={modalStyles.sectionTitle}>Team Allocation</Text>
                  <TouchableOpacity style={modalStyles.addMemberBtn} onPress={addTeamMember}>
                    <UserPlus size={14} color="#3b82f6" />
                    <Text style={modalStyles.addMemberText}>Add Member</Text>
                  </TouchableOpacity>
                </View>

                {formData.allocatedEmployees.map((emp, idx) => {
                  const empName = typeof emp.userId === 'object' 
                    ? (emp.userId as User)?.name 
                    : allEmployees.find(e => e._id === emp.userId)?.name || 'Select Member';
                  return (
                    <View key={idx} style={modalStyles.memberRow}>
                      <View style={modalStyles.memberSelectContainer}>
                        <TouchableOpacity
                          style={modalStyles.selectButton}
                          onPress={() => openEmployeeDropdown(showEditModal ? 'edit' : 'create', idx)}
                        >
                          <Text style={[modalStyles.selectButtonText, !emp.userId && modalStyles.placeholderText]}>
                            {empName}
                          </Text>
                          <ChevronDown size={14} color="#64748b" />
                        </TouchableOpacity>
                      </View>

                      <View style={modalStyles.memberInputsRow}>
                        <View style={[modalStyles.field, { flex: 2 }]}>
                          <Text style={modalStyles.smallLabel}>Role</Text>
                          <TextInput
                            style={modalStyles.smallInput}
                            placeholder="Role (e.g. Dev)"
                            placeholderTextColor="#94a3b8"
                            value={emp.role}
                            onChangeText={(val) => updateTeamMember(idx, 'role', val)}
                          />
                        </View>
                        <View style={[modalStyles.field, { flex: 1.5 }]}>
                          <Text style={modalStyles.smallLabel}>Alloc %</Text>
                          <TextInput
                            style={modalStyles.smallInput}
                            keyboardType="numeric"
                            value={String(emp.allocationPercent)}
                            onChangeText={(val) => updateTeamMember(idx, 'allocationPercent', Number(val.replace(/\D/g, '')))}
                          />
                        </View>
                        <View style={[modalStyles.field, { flex: 1.5 }]}>
                          <Text style={modalStyles.smallLabel}>Hours</Text>
                          <TextInput
                            style={modalStyles.smallInput}
                            keyboardType="numeric"
                            value={String(emp.budgetHours)}
                            onChangeText={(val) => updateTeamMember(idx, 'budgetHours', Number(val.replace(/\D/g, '')))}
                          />
                        </View>
                        <TouchableOpacity style={modalStyles.removeMemberBtn} onPress={() => removeTeamMember(idx)}>
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={modalStyles.footer}>
              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedProject(null);
                  resetForm();
                }}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.submitButton, isSubmitting && modalStyles.disabledButton]}
                onPress={showEditModal ? handleUpdateProject : handleCreateProject}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Save size={16} color="white" />
                    <Text style={modalStyles.submitText}>
                      {showEditModal ? 'Update' : 'Create'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Project Modal */}
      <Modal
        visible={showViewModal && !!selectedProject}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowViewModal(false); setSelectedProject(null); }}
      >
        <View style={detailModalStyles.overlay}>
          <View style={detailModalStyles.container}>
            <View style={detailModalStyles.header}>
              <View>
                <Text style={detailModalStyles.title}>{selectedProject?.name}</Text>
                <Text style={detailModalStyles.subtitle}>{selectedProject?.code}</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowViewModal(false); setSelectedProject(null); }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={detailModalStyles.content} showsVerticalScrollIndicator={false}>
              <View style={detailModalStyles.infoGrid}>
                {selectedProject?.clientName ? (
                  <View style={detailModalStyles.infoItem}>
                    <Briefcase size={16} color="#64748b" />
                    <View>
                      <Text style={detailModalStyles.infoLabel}>Client Name</Text>
                      <Text style={detailModalStyles.infoValue}>{selectedProject.clientName}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={detailModalStyles.infoItem}>
                  <Building2 size={16} color="#64748b" />
                  <View>
                    <Text style={detailModalStyles.infoLabel}>Project Manager</Text>
                    <Text style={detailModalStyles.infoValue}>
                      {typeof selectedProject?.managerId === 'object' ? (selectedProject.managerId as any)?.name : '—'}
                    </Text>
                  </View>
                </View>

                <View style={detailModalStyles.infoItem}>
                  <Calendar size={16} color="#64748b" />
                  <View>
                    <Text style={detailModalStyles.infoLabel}>Timeline</Text>
                    <Text style={detailModalStyles.infoValue}>
                      {selectedProject ? formatDate(selectedProject.startDate) : ''}
                      {selectedProject?.endDate ? ` to ${formatDate(selectedProject.endDate)}` : ' (No End Date)'}
                    </Text>
                  </View>
                </View>

                <View style={detailModalStyles.infoItem}>
                  <Clock size={16} color="#64748b" />
                  <View>
                    <Text style={detailModalStyles.infoLabel}>Budget / Actual Hours</Text>
                    <Text style={detailModalStyles.infoValue}>
                      {selectedProject?.budgetHours || 0}h Budget / {selectedProject?.actualHours || 0}h Actual
                    </Text>
                  </View>
                </View>
              </View>

              {selectedProject?.description ? (
                <View style={detailModalStyles.descSection}>
                  <Text style={detailModalStyles.sectionTitle}>Description</Text>
                  <Text style={detailModalStyles.descText}>{selectedProject.description}</Text>
                </View>
              ) : null}

              <View style={detailModalStyles.settingsSection}>
                <Text style={detailModalStyles.sectionTitle}>Settings</Text>
                <View style={detailModalStyles.settingRow}>
                  <Text style={detailModalStyles.settingLabel}>Restrict Tasks to Allocated Members</Text>
                  <Text style={detailModalStyles.settingValue}>{selectedProject?.onlyProjectTasks ? 'Yes' : 'No'}</Text>
                </View>
              </View>

              <View style={detailModalStyles.teamSection}>
                <Text style={detailModalStyles.sectionTitle}>Allocated Team Members ({selectedProject?.allocatedEmployees?.length || 0})</Text>
                {selectedProject?.allocatedEmployees && selectedProject.allocatedEmployees.length > 0 ? (
                  selectedProject.allocatedEmployees.map((emp, idx) => {
                    const empName = typeof emp.userId === 'object' ? (emp.userId as any)?.name : 'Unknown';
                    return (
                      <View key={idx} style={detailModalStyles.teamMemberCard}>
                        <View style={detailModalStyles.memberAvatar}>
                          <Text style={detailModalStyles.memberAvatarText}>{empName ? empName.charAt(0) : 'U'}</Text>
                        </View>
                        <View style={detailModalStyles.memberInfo}>
                          <Text style={detailModalStyles.memberName}>{empName || 'Unknown'}</Text>
                          <Text style={detailModalStyles.memberRole}>{emp.role}</Text>
                        </View>
                        <View style={detailModalStyles.memberAllocation}>
                          <Text style={detailModalStyles.memberAllocationText}>{emp.allocationPercent}% Alloc.</Text>
                          <Text style={detailModalStyles.memberHoursText}>{emp.budgetHours}h Budget</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={detailModalStyles.emptyTeamText}>No team members allocated to this project</Text>
                )}
              </View>
            </ScrollView>

            <View style={detailModalStyles.footer}>
              <TouchableOpacity
                style={detailModalStyles.editButton}
                onPress={() => {
                  setShowViewModal(false);
                  openEditModal(selectedProject!);
                }}
              >
                <Pencil size={16} color="#3b82f6" />
                <Text style={detailModalStyles.editButtonText}>Edit Project</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={detailModalStyles.closeButton}
                onPress={() => { setShowViewModal(false); setSelectedProject(null); }}
              >
                <Text style={detailModalStyles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Project Modal */}
      <Modal
        visible={showDeleteModal && !!selectedProject}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowDeleteModal(false); setSelectedProject(null); }}
      >
        <View style={deleteModalStyles.overlay}>
          <View style={deleteModalStyles.container}>
            <View style={deleteModalStyles.iconContainer}>
              <Trash2 size={32} color="#ef4444" />
            </View>
            <Text style={deleteModalStyles.title}>Delete Project</Text>
            <Text style={deleteModalStyles.message}>
              Are you sure you want to delete project "{selectedProject?.name}"? This action cannot be undone and will remove all team allocations.
            </Text>
            <View style={deleteModalStyles.buttonRow}>
              <TouchableOpacity
                style={deleteModalStyles.cancelButton}
                onPress={() => { setShowDeleteModal(false); setSelectedProject(null); }}
              >
                <Text style={deleteModalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={deleteModalStyles.deleteButton}
                onPress={handleDeleteProject}
              >
                <Text style={deleteModalStyles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Layout>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 110,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  filterPanel: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  filterField: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  filterSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterSelectText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#94a3b8',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterClear: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
  },
  filterClearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterApply: {
    flex: 2,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    alignItems: 'center',
  },
  filterApplyText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  employeeId: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  gridStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gridStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  gridProgressSection: {
    marginTop: 8,
  },
  gridProgressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  gridProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  gridProgressText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  footerLeft: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  pageInfo: {
    fontSize: 13,
    color: '#64748b',
  },
});

// Analytics Modal Styles
const analyticsModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.5)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#c4b5fd',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c4b5fd',
  },
  loadingSubtext: {
    fontSize: 11,
    color: '#64748b',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c4b5fd',
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  kpiUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
  },
  kpiBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  breakdownCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  breakdownHeader: {
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  breakdownSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stackedBarBillable: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  stackedBarNonBillable: {
    height: '100%',
    backgroundColor: '#64748b',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  teamSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  teamCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  teamRole: {
    fontSize: 10,
    color: '#94a3b8',
  },
  teamStats: {
    alignItems: 'flex-end',
  },
  teamHours: {
    fontSize: 10,
    color: '#94a3b8',
  },
  teamUtil: {
    fontSize: 12,
    fontWeight: '700',
  },
  teamBillable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  billableBadge: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  billableText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#c4b5fd',
  },
  billableDetail: {
    fontSize: 9,
    color: '#64748b',
  },
  insightsSection: {
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    color: '#c4b5fd',
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6ee7b7',
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#6ee7b7',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 9,
    color: '#475569',
  },
  closeFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  closeFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
});

// Cost Modal Styles
const costModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.5)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  betaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99,102,241,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  betaBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a5b4fc',
  },
  loadingSubtext: {
    fontSize: 11,
    color: '#64748b',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a5b4fc',
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  kpiSubtext: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
  },
  burnCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  burnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  burnTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  burnPercent: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  burnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  burnFooterText: {
    fontSize: 9,
    color: '#64748b',
  },
  daysRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysRemainingText: {
    fontSize: 9,
    color: '#64748b',
  },
  teamSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  teamCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  teamRole: {
    fontSize: 10,
    color: '#94a3b8',
  },
  teamStats: {
    alignItems: 'flex-end',
  },
  teamHours: {
    fontSize: 10,
    color: '#94a3b8',
  },
  teamUtil: {
    fontSize: 12,
    fontWeight: '700',
  },
  leakageSection: {
    marginBottom: 16,
  },
  leakageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  leakageText: {
    flex: 1,
    fontSize: 12,
    color: '#fcd34d',
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6ee7b7',
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#6ee7b7',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 9,
    color: '#475569',
  },
  closeFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  closeFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  form: {
    padding: 20,
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  addMemberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  field: {
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  smallInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#94a3b8',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  memberRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  memberSelectContainer: {
    width: '100%',
  },
  memberInputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  removeMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

const detailModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  content: {
    padding: 20,
  },
  infoGrid: {
    gap: 12,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    marginTop: 2,
  },
  descSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  descText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLabel: {
    fontSize: 13,
    color: '#475569',
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  teamSection: {
    marginBottom: 20,
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  memberRole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  memberAllocation: {
    alignItems: 'flex-end',
  },
  memberAllocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  memberHoursText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  emptyTeamText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

const deleteModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});