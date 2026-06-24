// screens/settings/UsersAndRolesTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { scale, verticalScale, moderateScale } from '../../../utils/responsive';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { 
  ChevronDown,
  ChevronRight,
  Check,
  Database,
  Users,
  Clock,
  CalendarCheck,
  Menu,
  FileText,
  Briefcase,
  CheckSquare,
  LineChart,
  Megaphone,
  HelpCircle,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Search,
  Trash2,
  AlertCircle,
  ListChecks,
  Plus,
  Save,
  Square
} from 'lucide-react-native';
import CollapsibleSidebar from '../../../components/common/CollapsibleSidebar';
import { settingsAPI, userAPI } from '../../../services/endpoints';
import { useSocketEvent } from '../../../services/socket';
import { useAuthStore } from '../../../store/authStore';
import Layout from '../../../components/common/Layout';
import PageHeader from '../../../components/common/PageHeader';

// Types
interface Permission {
  [module: string]: {
    [submodule: string]: string[];
  };
}

interface Role {
  id?: string;
  name: string;
  isSystem?: boolean;
  templateType?: string;
  permissions: Permission;
}

interface PermissionTreeNodeProps {
  label: string;
  level: number;
  children: any;
  permissions: Permission;
  path: string[];
  onToggle: (leaves: string[][], status: boolean) => void;
  searchQuery: string;
  isAdmin: boolean;
  parentMatched?: boolean;
}

const PERMISSION_STRUCTURE = {
  "Payroll": {
    "Dashboard": ["view"],
    "Payroll Engine": ["view", "run", "submit", "approve", "disburse"],
    "Execution Ledger": ["view"],
    "Payslip Generation": ["view", "generate"],
    "Bank Export": ["view", "export"],
    "Payroll Reports": ["view"]
  },
  "Employees": {
    "Employee List": ["view", "create", "edit", "delete"],
    "Management": ["view", "edit"]
  },
  "Timesheets": {
    "Dashboard": ["view"],
    "Entry": ["view", "create", "edit"],
    "History": ["view"],
    "Management": ["view", "approve", "reject", "lock"]
  },
  "Leave Management": {
    "Leave Tracker": ["view"],
    "Leave Requests": ["view", "create", "approve", "reject"],
    "Leave Policies": ["view", "edit"]
  },
  "My Payslip": {
    "Payslip View": ["view", "download"]
  },
  "Projects": {
    "Project List": ["view", "create", "edit", "delete"]
  },
  "Tasks": {
    "Task Management": ["view", "create", "edit", "delete"]
  },
  "Reports": {
    "Reports Dashboard": ["view", "export"]
  },
  "Announcements": {
    "Announcements": ["view", "create", "edit"]
  },
  "Support": {
    "Help & Support": ["view"]
  },
  "Settings": {
    "General": ["view", "edit"],
    "Users & Roles": ["view", "create", "edit", "delete"],
    "Audit Logs": ["view"]
  }
};

const ROLE_TEMPLATES: Record<string, any> = {
  'Admin': {
    name: 'Full Administrator',
    description: 'Complete system-wide control (Unrestricted)',
    fullAccess: true
  },
  'HR': {
    name: 'Human Resources',
    description: 'Employee lifecycle, leave, and payroll execution',
    permissions: {
      "Payroll": { "Dashboard": ["view"], "Payroll Engine": ["view", "run", "submit"], "Payslip Generation": ["view", "generate"], "Payroll Reports": ["view"] },
      "Employees": { "Employee List": ["view", "create", "edit", "delete"], "Management": ["view", "edit"] },
      "Leave Management": { "Leave Tracker": ["view"], "Leave Requests": ["view", "create", "approve", "reject"], "Leave Policies": ["view", "edit"] },
      "Timesheets": { "Dashboard": ["view"], "Entry": ["view", "create", "edit"], "History": ["view"], "Management": ["view", "approve", "reject", "lock"] },
      "Announcements": { "Announcements": ["view", "create", "edit"] },
      "Reports": { "Reports Dashboard": ["view"] },
      "Support": { "Help & Support": ["view"] }
    }
  },
  'Finance': {
    name: 'Finance Controller',
    description: 'Payroll approvals, bank exports, and financial reporting',
    permissions: {
      "Payroll": { "Dashboard": ["view"], "Payroll Engine": ["view", "approve", "disburse"], "Bank Export": ["view", "export"], "Payroll Reports": ["view", "export"] },
      "Reports": { "Reports Dashboard": ["view", "export"] },
      "My Payslip": { "Payslip View": ["view", "download"] }
    }
  },
  'Manager': {
    name: 'Project Manager',
    description: 'Team leadership: timesheets, leaves, and dashboard insights',
    permissions: {
      "Timesheets": { "Dashboard": ["view"], "Entry": ["view", "create", "edit"], "History": ["view"], "Management": ["view", "approve", "reject"] },
      "Leave Management": { "Leave Tracker": ["view"] },
      "My Payslip": { "Payslip View": ["view", "download"] },
      "Support": { "Help & Support": ["view"] },
    }
  },
  'Employee': {
    name: 'Standard Employee',
    description: 'Self-service: payslips, leave requests, and timesheets',
    permissions: {
      "Timesheets": { "Dashboard": ["view"], "Entry": ["view", "create", "edit"], "History": ["view"] },
      "My Payslip": { "Payslip View": ["view", "download"] },
      "Leave Management": { "Leave Tracker": ["view"] },
      "Support": { "Help & Support": ["view"] }
    }
  },
  
  
};

// Tri-state checkbox component
const TriStateCheckbox = ({ 
  state, 
  onChange, 
  disabled 
}: { 
  state: 'checked' | 'unchecked' | 'indeterminate';
  onChange: () => void;
  disabled: boolean;
}) => {
  return (
    <TouchableOpacity
      onPress={onChange}
      disabled={disabled}
      style={[
        styles.checkbox,
        state === 'checked' && styles.checkboxChecked,
        state === 'indeterminate' && styles.checkboxIndeterminate,
        disabled && styles.checkboxDisabled,
      ]}
    >
      {state === 'checked' && <Check size={12} color="#fff" />}
      {state === 'indeterminate' && <View style={styles.indeterminateLine} />}
    </TouchableOpacity>
  );
};

// Permission Tree Node Component
const PermissionTreeNode: React.FC<PermissionTreeNodeProps> = ({
  label,
  level,
  children,
  permissions,
  path,
  onToggle,
  searchQuery,
  isAdmin,
  parentMatched = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getLeafNodes = (nodes: any, currentPath: string[] = []): string[][] => {
    let leaves: string[][] = [];
    if (Array.isArray(nodes)) {
      nodes.forEach((action: string) => leaves.push([...currentPath, action]));
    } else {
      Object.entries(nodes).forEach(([key, val]) => {
        leaves.push(...getLeafNodes(val, [...currentPath, key]));
      });
    }
    return leaves;
  };

  const getAllLeaves = getLeafNodes(children, path);
  
  const selectedLeaves = getAllLeaves.filter(p => {
    const [mod, sub, act] = p;
    return permissions?.[mod]?.[sub]?.includes(act);
  });

  const state = selectedLeaves.length === 0 ? 'unchecked' :
                selectedLeaves.length === getAllLeaves.length ? 'checked' : 'indeterminate';

  const handleToggle = () => {
    if (isAdmin) return;
    const targetState = state !== 'checked';
    onToggle(getAllLeaves, targetState);
  };

  const matchesSearch = (text: string) => 
    text.toLowerCase().includes((searchQuery || '').toLowerCase());
  
  const isMatch = matchesSearch(label);
  const effectivelyMatched = parentMatched || isMatch;

  const hasVisibleChild = (() => {
    if (!searchQuery) return true;
    if (effectivelyMatched) return true;
    
    const checkChildren = (nodes: any): boolean => {
      if (Array.isArray(nodes)) return nodes.some(a => matchesSearch(a));
      return Object.entries(nodes).some(([k, v]) => 
        matchesSearch(k) || checkChildren(v)
      );
    };
    return checkChildren(children);
  })();

  useEffect(() => {
    if (searchQuery) setIsExpanded(true);
  }, [searchQuery]);

  if (!hasVisibleChild) return null;

  const isLeaf = Array.isArray(children);
  const IconComponent = level === 0 ? getIconForModule(label) : null;

  return (
    <View style={styles.treeNode}>
      <TouchableOpacity
        style={[styles.treeNodeHeader, { paddingLeft: (level * 24) + 12 }]}
        onPress={() => !isLeaf && setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        {!isLeaf && (
          <View style={styles.expandButton}>
            {isExpanded ? (
              <ChevronDown size={14} color="#94a3b8" />
            ) : (
              <ChevronRight size={14} color="#94a3b8" />
            )}
          </View>
        )}
        
        <TriStateCheckbox state={state} onChange={handleToggle} disabled={isAdmin} />
        
        {IconComponent && <IconComponent size={16} color="#6366f1" style={styles.moduleIcon} />}
        
        <Text style={[styles.nodeLabel, level === 0 && styles.nodeLabelLevel0]}>
          {label}
        </Text>
      </TouchableOpacity>

      {!isLeaf && isExpanded && (
        <View style={styles.treeNodeChildren}>
          {Object.entries(children).map(([key, val]) => (
            <PermissionTreeNode
              key={key}
              label={key}
              level={level + 1}
              children={val}
              permissions={permissions}
              path={[...path, key]}
              onToggle={onToggle}
              searchQuery={searchQuery}
              isAdmin={isAdmin}
              parentMatched={effectivelyMatched}
            />
          ))}
        </View>
      )}

      {isLeaf && (
        <View style={[styles.treeActionButtons, { paddingLeft: (level * 24) + 60 }]}>
          {(children as string[])
            .filter(action => !searchQuery || effectivelyMatched || matchesSearch(action))
            .map(action => {
            const isActive = permissions?.[path[0]]?.[path[1]]?.includes(action);
            return (
              <TouchableOpacity
                key={action}
                disabled={isAdmin}
                onPress={() => onToggle([[...path, action]], !isActive)}
                style={[
                  styles.actionChip,
                  isActive && styles.actionChipActive,
                  isAdmin && styles.actionChipDisabled,
                ]}
              >
                {isActive && <Check size={8} color="#fff" />}
                <Text style={[styles.actionChipText, isActive && styles.actionChipTextActive]}>
                  {action}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// Helper function to get icon names
const getIconForModule = (module: string) => {
  const icons: Record<string, any> = {
    'Payroll': Database,
    'Employees': Users,
    'Timesheets': Clock,
    'Leave Management': CalendarCheck,
    'My Payslip': FileText,
    'Projects': Briefcase,
    'Tasks': CheckSquare,
    'Reports': LineChart,
    'Announcements': Megaphone,
    'Support': HelpCircle,
    'Settings': SettingsIcon,
  };
  return icons[module] || Shield;
};

// Role Timeline Component
  const RoleTimeline = ({ roleName }: { roleName: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['permission-audit-logs', roleName],
    queryFn: async () => {
      try {
        const res: any = await settingsAPI.getPermissionAuditLogs({ roleName });
        return res?.data?.data || res?.data || res || [];
      } catch (err: any) {
        console.warn('Permission audit logs fetch failed:', err?.message || err);
        return [];
      }
    },
    enabled: !!roleName,
  });
  const logs = data || [];

  if (isLoading) {
    return (
      <View style={styles.timelineLoading}>
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={styles.timelineEmpty}>
        <Clock size={24} color="#cbd5e1" />
        <Text style={styles.timelineEmptyText}>No History Yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineContainer}>
      {logs.slice(0, 5).map((log: any, i: number) => (
        <View key={log.id || i} style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineUser}>{log.changedByName}</Text>
              <Text style={styles.timelineDate}>
                {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
            <Text style={styles.timelineAction}>
              {log.action === 'CREATE_ROLE' ? 'Created this role' :
               log.action === 'DELETE_ROLE' ? 'Deleted this role' :
               `Updated ${log.details?.changes?.length || 0} permission(s)`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// Modules visible to standard employees in the sidebar
const EMPLOYEE_VISIBLE_MODULES = [
  'Timesheets',
  'Leave Management',
  'My Payslip',
  'Announcements',
  'Support'
];

// Main Component
export default function UsersAndRolesTab() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const [selectedRoleIdxs, setSelectedRoleIdxs] = useState<number[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [originalRoles, setOriginalRoles] = useState<Role[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [addRoleModalVisible, setAddRoleModalVisible] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [previewSidebarVisible, setPreviewSidebarVisible] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings().then((r: any) => r?.data?.data ?? r?.data ?? r ?? null),
  });

  useSocketEvent('settings_updated', (payload) => {
    console.log('[Socket] Settings updated event received in UsersAndRolesTab:', payload);
    refetch();
  });

  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    if (data?.roles?.length > 0 && !isDirty) {
      const filtered = data.roles.filter(
        (r: Role) => r.name.toLowerCase() !== 'super_admin' && r.name.toLowerCase() !== 'super admin'
      );
      setRoles(filtered);
      setOriginalRoles(JSON.parse(JSON.stringify(filtered)));
    }
  }, [data, isDirty]);

  useEffect(() => {
    if (originalRoles.length === 0 && roles.length === 0) return;
    const rolesClean = JSON.stringify(originalRoles);
    const rolesCurrent = JSON.stringify(roles);
    setIsDirty(rolesClean !== rolesCurrent);
  }, [roles, originalRoles]);

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.updateSettings({ roles }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setIsDirty(false);
      setOriginalRoles(JSON.parse(JSON.stringify(roles)));
      await useAuthStore.getState().checkAuth(); // Force refresh user state for sidebar updates
      Alert.alert('Success', 'Access configuration synced successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Synchronization failed');
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAddRole = () => {
    setNewRoleName('');
    setAddRoleModalVisible(true);
  };

  const confirmAddRole = () => {
    const trimmedName = newRoleName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Role name is required');
      return;
    }

    const isDuplicate = roles.some(r => r.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      Alert.alert('Error', 'A role with this name already exists.');
      return;
    }

    const newRole: Role = {
      name: trimmedName,
      isSystem: false,
      templateType: 'Custom',
      permissions: {},
    };
    setRoles([...roles, newRole]);
    setActiveRoleIdx(roles.length);
    setAddRoleModalVisible(false);
    Alert.alert('Success', 'New role added! Don\'t forget to save.');
  };

  const handleUpdateRoleName = (index: number, newName: string) => {
    const newRoles = [...roles];
    newRoles[index].name = newName;
    setRoles(newRoles);
  };

  const getLeafNodes = (nodes: any, currentPath: string[] = []): string[][] => {
    let leaves: string[][] = [];
    if (Array.isArray(nodes)) {
      nodes.forEach((action: string) => leaves.push([...currentPath, action]));
    } else {
      Object.entries(nodes).forEach(([key, val]) => {
        leaves.push(...getLeafNodes(val, [...currentPath, key]));
      });
    }
    return leaves;
  };

  const handleTogglePermissions = (leaves: string[][], status: boolean) => {
    const newRoles = [...roles];
    const targetIndices = isBulkMode && selectedRoleIdxs.length > 0 ? selectedRoleIdxs : [activeRoleIdx];

    if (targetIndices.length === 0) {
      Alert.alert('Error', 'No roles selected for bulk update');
      return;
    }

    targetIndices.forEach(idx => {
      const role = { ...newRoles[idx] };
      const permissions = { ...role.permissions };

      leaves.forEach(([mod, sub, act]) => {
        if (!permissions[mod]) permissions[mod] = {};
        if (!permissions[mod][sub]) permissions[mod][sub] = [];
        
        const actions = [...permissions[mod][sub]];
        const existingIdx = actions.indexOf(act);
        
        if (status && existingIdx === -1) {
          actions.push(act);
        } else if (!status && existingIdx > -1) {
          actions.splice(existingIdx, 1);
        }
        
        permissions[mod][sub] = actions;

        // Cleanup
        if (permissions[mod][sub].length === 0) delete permissions[mod][sub];
        if (Object.keys(permissions[mod]).length === 0) delete permissions[mod];
      });

      role.permissions = permissions;
      role.templateType = 'Custom';
      newRoles[idx] = role;
    });

    setRoles(newRoles);
  };

  const applyTemplate = (type: string) => {
    const newRoles = [...roles];
    const role = { ...newRoles[activeRoleIdx] };
    const template = ROLE_TEMPLATES[type];

    if (template.fullAccess) {
      const allPerms: Permission = {};
      Object.entries(PERMISSION_STRUCTURE).forEach(([mod, submodules]) => {
        allPerms[mod] = {};
        Object.entries(submodules).forEach(([sub, actions]) => {
          allPerms[mod][sub] = [...actions];
        });
      });
      role.permissions = allPerms;
    } else {
      role.permissions = JSON.parse(JSON.stringify(template.permissions));
    }

    role.templateType = type;
    newRoles[activeRoleIdx] = role;
    setRoles(newRoles);
    Alert.alert('Success', `${type} template applied to ${role.name}`);
  };

  const handleDeleteRole = (index: number) => {
    if (roles[index].isSystem) {
      Alert.alert('Error', 'System roles cannot be deleted');
      return;
    }
    setDeleteIndex(index);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      const newRoles = roles.filter((_, i) => i !== deleteIndex);
      setRoles(newRoles);
      setActiveRoleIdx(Math.max(0, deleteIndex - 1));
      Alert.alert('Success', 'Role removed. Click Save to persist.');
    }
    setDeleteModalVisible(false);
    setDeleteIndex(null);
  };

  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    if (!isBulkMode) {
      setSelectedRoleIdxs([activeRoleIdx]);
    } else {
      setSelectedRoleIdxs([]);
    }
  };

  const toggleRoleSelection = (idx: number) => {
    if (selectedRoleIdxs.includes(idx)) {
      setSelectedRoleIdxs(selectedRoleIdxs.filter(i => i !== idx));
    } else {
      setSelectedRoleIdxs([...selectedRoleIdxs, idx]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedRoleIdxs.length === roles.length) {
      setSelectedRoleIdxs([]);
    } else {
      setSelectedRoleIdxs(roles.map((_, i) => i));
    }
  };

  const currentRole = roles[activeRoleIdx];
  const hasCriticalPermissions = currentRole && !currentRole.isSystem && 
    Object.values(currentRole.permissions || {}).some(mod =>
      Object.values(mod).some(acts => 
        acts.some((a: string) => ['approve', 'run', 'disburse', 'delete'].includes(a))
      )
    );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading access control...</Text>
      </View>
    );
  }

  return (
    <Layout
      title="Users & Access"
      user={currentUser}
      sidebarVisible={sidebarVisible}
      setSidebarVisible={setSidebarVisible}
      refreshing={isLoading}
      onRefresh={handleRefresh}
      scrollable={false}
      backgroundColor="#f8fafc"
      showBackButton={true}
      onBackPress={() => navigation.navigate('Settings' as never)}
    >
      <View style={{ flex: 1 }}>
        <PageHeader
          title="Access Governance"
          subtitle="Enterprise RBAC with hierarchical module trees"
          icon={ShieldCheck}
          iconColor="#6366f1"
          iconBgColor="#eef2ff"
          rightElement={
            <TouchableOpacity style={styles.headerAddButton} onPress={handleAddRole}>
              <Plus size={18} color="#6366f1" />
              <Text style={styles.headerAddButtonText}>Add Role</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Role List */}
          <View style={styles.roleListSection}>
            <View style={styles.roleListHeader}>
              <Text style={styles.sectionTitle}>
                <Shield size={12} color="#94a3b8" /> Identity Roles
              </Text>
              <View style={styles.roleListActions}>
                <TouchableOpacity
                  style={[styles.iconButton, isBulkMode && styles.iconButtonActive]}
                  onPress={toggleBulkMode}
                >
                  <ListChecks size={16} color={isBulkMode ? "#fff" : "#94a3b8"} />
                </TouchableOpacity>
              </View>
            </View>

            {roles.map((role, idx) => (
              <TouchableOpacity
                key={role.id || role.name || idx}
                style={[
                  styles.roleItem,
                  (isBulkMode ? selectedRoleIdxs.includes(idx) : activeRoleIdx === idx) && styles.roleItemActive,
                ]}
                onPress={() => {
                  if (isBulkMode) {
                    toggleRoleSelection(idx);
                  } else {
                    setActiveRoleIdx(idx);
                  }
                }}
              >
                <View style={styles.roleItemContent}>
                  {isBulkMode && (
                    selectedRoleIdxs.includes(idx) ? (
                      <CheckSquare size={16} color="#fff" />
                    ) : (
                      <Square size={16} color="#94a3b8" />
                    )
                  )}
                  <Text style={[styles.roleName, (isBulkMode ? selectedRoleIdxs.includes(idx) : activeRoleIdx === idx) && styles.roleNameActive]}>
                    {role.name}
                  </Text>
                </View>
                {role.isSystem && <Shield size={14} color="#94a3b8" />}
              </TouchableOpacity>
            ))}

            {isBulkMode && (
              <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
                <Text style={styles.selectAllText}>
                  {selectedRoleIdxs.length === roles.length ? 'Deselect All' : `Select All (${roles.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Permission Tree */}
          {currentRole && (
            <View style={styles.permissionSection}>
              <View style={styles.permissionHeader}>
                <View style={styles.permissionTitleContainer}>
                  <Text style={styles.permissionBadge}>
                    {isBulkMode ? `Updating ${selectedRoleIdxs.length} Roles` : 'Edit Role Definition'}
                  </Text>
                  {!isBulkMode && currentRole.isSystem && (
                    <View style={styles.systemBadge}>
                      <Text style={styles.systemBadgeText}>Core System Role</Text>
                    </View>
                  )}
                </View>

                {!isBulkMode && (
                  <TextInput
                    style={styles.roleNameInput}
                    value={currentRole.name}
                    onChangeText={(text: string) => handleUpdateRoleName(activeRoleIdx, text)}
                    editable={!currentRole.isSystem}
                    placeholder="Role name"
                    placeholderTextColor="#cbd5e1"
                  />
                )}

                <View style={styles.permissionHeaderActions}>
                  <View style={styles.searchContainer}>
                    <Search size={14} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search permissions..."
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={(text: string) => setSearchQuery(text)}
                    />
                  </View>
                  
                  {!currentRole.isSystem && !isBulkMode && (
                    <>
                      <TouchableOpacity
                        style={styles.previewButton}
                        onPress={() => setPreviewSidebarVisible(true)}
                      >
                        <Menu size={18} color="#64748b" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteRoleButton}
                        onPress={() => handleDeleteRole(activeRoleIdx)}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Unsaved Changes Banner */}
                {isDirty && (
                  <View style={styles.unsavedBanner}>
                    <View style={styles.unsavedDot} />
                    <Text style={styles.unsavedText}>Unsaved Changes Detected</Text>
                    <Text style={styles.unsavedHint}>Click Save to apply changes</Text>
                  </View>
                )}

                {/* Critical Permissions Alert */}
                {hasCriticalPermissions && (
                  <View style={styles.criticalAlert}>
                    <AlertCircle size={16} color="#ef4444" />
                    <View>
                      <Text style={styles.criticalTitle}>Critical Permissions Granted</Text>
                      <Text style={styles.criticalText}>
                        This role now has financial or deletion authority. Ensure this is intentional.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Role Templates */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                  {Object.entries(ROLE_TEMPLATES).map(([type, meta]) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.templateCard,
                        currentRole.templateType === type && styles.templateCardActive,
                      ]}
                      onPress={() => applyTemplate(type)}
                    >
                      <Text style={[styles.templateName, currentRole.templateType === type && styles.templateNameActive]}>
                        {type}
                      </Text>
                      <Text style={styles.templateDesc}>{meta.description}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Permission Tree View */}
              <View style={styles.treeContainer}>
                {Object.entries(PERMISSION_STRUCTURE)
                  .filter(([moduleName]) => {
                    // Restrict visible modules for the Employee role to only what's in their sidebar
                    if (currentRole.name.toLowerCase() === 'employee') {
                      return EMPLOYEE_VISIBLE_MODULES.includes(moduleName);
                    }
                    return true;
                  })
                  .map(([moduleName, submodules]) => (
                  <PermissionTreeNode
                    key={moduleName}
                    label={moduleName}
                    level={0}
                    children={submodules}
                    permissions={currentRole.permissions}
                    path={[moduleName]}
                    onToggle={handleTogglePermissions}
                    searchQuery={searchQuery}
                    isAdmin={currentRole.name === 'Admin'}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Bottom Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, (!isDirty || saveMutation.isPending) && styles.saveButtonDisabled]}
            onPress={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Save size={18} color="white" />
                <Text style={styles.saveButtonText}>Synchronize Access Rules</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Role?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete {deleteIndex !== null ? roles[deleteIndex]?.name : ''}? 
              This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteButton} onPress={confirmDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Role Modal */}
      <Modal
        visible={addRoleModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Role</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter role name"
              placeholderTextColor="#94a3b8"
              value={newRoleName}
              onChangeText={(text: string) => setNewRoleName(text)}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAddRoleModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmAddRole}>
                <Text style={styles.modalConfirmText}>Add Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sidebar Preview for selected role */}
      {currentRole && (
        <CollapsibleSidebar
          visible={previewSidebarVisible}
          onClose={() => setPreviewSidebarVisible(false)}
          user={{
            id: `preview-${currentRole.name}`,
            name: `Preview - ${currentRole.name}`,
            email: `preview+${currentRole.name.toLowerCase().replace(/\s+/g, '_')}@example.local`,
            role: currentRole.name,
            roleId: { permissions: currentRole.permissions }
          }}
        />
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
    padding: scale(16),
    paddingBottom: verticalScale(120),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(14),
    color: '#64748b',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(24),
    flexWrap: 'wrap',
    gap: scale(12),
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#1e293b',
  },
  description: {
    fontSize: moderateScale(13),
    color: '#64748b',
    marginTop: verticalScale(4),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(10),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    backgroundColor: '#fff',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    backgroundColor: '#1e293b',
    borderRadius: scale(14),
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    gap: scale(6),
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  headerAddButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#6366f1',
  },
  mainContent: {
    flexDirection: 'column',
    gap: verticalScale(20),
  },
  roleListSection: {
    backgroundColor: '#fff',
    borderRadius: scale(24),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(4),
  },
  sectionTitle: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleListActions: {
    flexDirection: 'row',
    gap: scale(6),
  },
  iconButton: {
    padding: scale(6),
    borderRadius: scale(8),
  },
  iconButtonActive: {
    backgroundColor: '#6366f1',
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    borderRadius: scale(16),
    marginBottom: verticalScale(4),
  },
  roleItemActive: {
    backgroundColor: '#6366f1',
  },
  roleItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  roleName: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#475569',
  },
  roleNameActive: {
    color: '#fff',
  },
  selectAllButton: {
    marginTop: verticalScale(12),
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    borderRadius: scale(12),
  },
  selectAllText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#6366f1',
  },
  permissionSection: {
    backgroundColor: '#fff',
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  permissionHeader: {
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    gap: scale(12),
  },
  permissionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flexWrap: 'wrap',
  },
  permissionBadge: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  systemBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(8),
  },
  systemBadgeText: {
    fontSize: moderateScale(8),
    fontWeight: '700',
    color: '#d97706',
    textTransform: 'uppercase',
  },
  roleNameInput: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#1e293b',
    paddingVertical: verticalScale(6),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  permissionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(10),
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: '#f1f5f9',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteRoleButton: {
    padding: scale(8),
    borderRadius: scale(12),
    backgroundColor: '#fee2e2',
  },
  previewButton: {
    padding: scale(8),
    borderRadius: scale(12),
    backgroundColor: '#f1f5f9',
    marginRight: scale(8),
  },
  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    padding: scale(12),
    backgroundColor: '#e0e7ff',
    borderRadius: scale(14),
  },
  unsavedDot: {
    width: scale(6),
    height: verticalScale(6),
    borderRadius: scale(3),
    backgroundColor: '#6366f1',
  },
  unsavedText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  unsavedHint: {
    fontSize: moderateScale(9),
    color: '#6366f1',
    fontStyle: 'italic',
  },
  criticalAlert: {
    flexDirection: 'row',
    gap: scale(10),
    padding: scale(12),
    backgroundColor: '#fee2e2',
    borderRadius: scale(14),
  },
  criticalTitle: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  criticalText: {
    fontSize: moderateScale(10),
    color: '#dc2626',
    marginTop: verticalScale(2),
  },
  templatesScroll: {
    flexDirection: 'row',
    marginTop: verticalScale(4),
  },
  templateCard: {
    padding: scale(10),
    backgroundColor: '#fff',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: scale(10),
    minWidth: scale(100),
  },
  templateCardActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
  },
  templateName: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  templateNameActive: {
    color: '#6366f1',
  },
  templateDesc: {
    fontSize: moderateScale(8),
    color: '#94a3b8',
    marginTop: verticalScale(4),
  },
  treeContainer: {
    padding: scale(12),
  },
  treeNode: {
    marginBottom: verticalScale(4),
  },
  treeNodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
  },
  expandButton: {
    width: scale(24),
    alignItems: 'center',
  },
  checkbox: {
    width: scale(18),
    height: verticalScale(18),
    borderRadius: scale(5),
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkboxIndeterminate: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  indeterminateLine: {
    width: scale(10),
    height: verticalScale(2),
    backgroundColor: '#6366f1',
    borderRadius: scale(1),
  },
  moduleIcon: {
    marginRight: scale(4),
  },
  nodeLabel: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: '#475569',
  },
  nodeLabelLevel0: {
    fontWeight: '700',
    color: '#1e293b',
    textTransform: 'uppercase',
    fontSize: moderateScale(12),
  },
  treeNodeChildren: {
    marginLeft: scale(24),
  },
  treeActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginTop: verticalScale(6),
    marginBottom: verticalScale(8),
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    backgroundColor: '#f1f5f9',
    borderRadius: scale(8),
  },
  actionChipActive: {
    backgroundColor: '#10b981',
  },
  actionChipDisabled: {
    opacity: 0.5,
  },
  actionChipText: {
    fontSize: moderateScale(9),
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  actionChipTextActive: {
    color: '#fff',
  },
  historySection: {
    backgroundColor: '#fff',
    borderRadius: scale(24),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionSubtitle: {
    fontSize: moderateScale(10),
    color: '#94a3b8',
    marginBottom: verticalScale(16),
  },
  timelineContainer: {
    gap: scale(12),
  },
  timelineItem: {
    flexDirection: 'row',
    gap: scale(12),
  },
  timelineDot: {
    width: scale(8),
    height: verticalScale(8),
    borderRadius: scale(4),
    backgroundColor: '#6366f1',
    marginTop: verticalScale(4),
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  timelineUser: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#1e293b',
  },
  timelineDate: {
    fontSize: moderateScale(8),
    fontWeight: '600',
    color: '#94a3b8',
  },
  timelineAction: {
    fontSize: moderateScale(10),
    color: '#64748b',
  },
  timelineLoading: {
    padding: scale(20),
    alignItems: 'center',
  },
  timelineEmpty: {
    padding: scale(30),
    alignItems: 'center',
    gap: scale(8),
  },
  timelineEmptyText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: scale(24),
    padding: scale(24),
    width: '80%',
    maxWidth: scale(320),
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: verticalScale(12),
  },
  modalMessage: {
    fontSize: moderateScale(14),
    color: '#64748b',
    marginBottom: verticalScale(20),
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: scale(12),
    padding: scale(12),
    fontSize: moderateScale(14),
    marginBottom: verticalScale(20),
    color: '#1e293b',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: scale(12),
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: scale(12),
  },
  modalCancelText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#64748b',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: scale(12),
  },
  modalDeleteText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#fff',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: scale(12),
  },
  modalConfirmText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#fff',
  },
});