import React, { useState, useEffect } from 'react';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../../services/endpoints';
import {
  LayoutDashboard,
  Clock,
  List,
  CheckSquare,
  Users,
  FolderOpen,
  Megaphone,
  BarChart3,
  ChevronDown,
  ClipboardList,
  Settings2,
  ListTodo,
  AlertCircle,
  Banknote,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId?: {
    name?: string;
    permissions: any;
  } | string;
}

interface CollapsibleSidebarProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  menuItems?: any[];
  onLogout?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  roles?: string[];
  module?: string;
  submodule?: string;
  subItems?: SubNavItem[];
}

interface SubNavItem {
  to: string;
  label: string;
  roles?: string[];
  module?: string;
  submodule?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Super admin email – only this account sees the SUPER ADMIN sidebar section
const SUPER_ADMIN_EMAIL = 'superadmin@timesheetpro.com';

const navSections: NavSection[] = [
  {
    label: 'Timesheets',
    items: [
      { to: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard', module: 'Timesheets', submodule: 'Dashboard' },
      { to: 'TimesheetEntry', icon: Clock, label: 'Timesheet Entry', module: 'Timesheets', submodule: 'Entry' },
      { to: 'TimesheetHistory', icon: List, label: 'History', module: 'Timesheets', submodule: 'History' },
      { to: 'ManageTimesheets', icon: CheckSquare, label: 'Manage Timesheets', roles: ['admin', 'manager'], module: 'Timesheets', submodule: 'Management' },
      { to: 'TimesheetCompliance', icon: AlertCircle, label: 'Compliance & Locks', roles: ['admin', 'manager'], module: 'Timesheets', submodule: 'Management' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: 'LeaveTracker', icon: ClipboardList, label: 'Leave Tracker', module: 'Leave Management', submodule: 'Leave Tracker' },
      { to: 'LeaveManagement', icon: ClipboardList, label: 'Leave Management', roles: ['admin', 'manager'], module: 'Leave Management', submodule: 'Leave Requests' },
      { to: 'MyPayslips', icon: Banknote, label: 'My Payslips', module: 'My Payslip', submodule: 'Payslip View' },
      { to: 'Announcements', icon: Megaphone, label: 'Announcements', module: 'Announcements', submodule: 'Announcements' },
      { to: 'Incidents', icon: AlertCircle, label: 'Help & Support', module: 'Support', submodule: 'Help & Support' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: 'Projects', icon: FolderOpen, label: 'Projects', roles: ['admin', 'manager'], module: 'Projects', submodule: 'Project List' },
      { to: 'Tasks', icon: ListTodo, label: 'Tasks', roles: ['admin', 'manager'], module: 'Tasks', submodule: 'Task Management' },
      { to: 'Employees', icon: Users, label: 'Employees', roles: ['admin', 'manager'], module: 'Employees', submodule: 'Employee List' },
      {
        to: 'PayrollDashboard',
        icon: Banknote,
        label: 'Payroll',
        roles: ['admin', 'manager', 'finance'],
        module: 'Payroll',
        subItems: [
          { to: 'PayrollDashboard', label: 'Dashboard', module: 'Payroll', submodule: 'Dashboard' },
          { to: 'PayrollProfiles', label: 'Payroll Profiles', module: 'Payroll', submodule: 'Payroll Engine' },
          { to: 'PayrollRun', label: 'Payroll Engine', module: 'Payroll', submodule: 'Payroll Engine' },
          { to: 'PayrollHistory', label: 'Execution Ledger', module: 'Payroll', submodule: 'Execution Ledger' },
          { to: 'PayrollPayslips', label: 'Payslip Generation', module: 'Payroll', submodule: 'Payslip Generation' },
          { to: 'PayrollReports', label: 'Payroll Reports', module: 'Payroll', submodule: 'Payroll Reports' },
          { to: 'BankTransferExport', label: 'Bank Export', module: 'Payroll', submodule: 'Bank Export' },
        ],
      },
      { to: 'Reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'manager'], module: 'Reports', submodule: 'Reports Dashboard' },
      { to: 'AuditLogs', icon: Shield, label: 'Audit Logs', roles: ['admin'], module: 'Settings', submodule: 'Audit Logs' },
      {
        to: 'Settings',
        icon: Settings2,
        label: 'Settings',
        roles: ['admin'],
        module: 'Settings',
        submodule: 'General'
      },
    ],
  },
];

export default function CollapsibleSidebar({
  visible,
  onClose,
  user,
  menuItems,
  onLogout: externalLogout
}: CollapsibleSidebarProps) {
  const navigation = useNavigation();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('CALTIMS');
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const currentRoute = useNavigationState(state => {
    const route = state?.routes[state?.routes.length - 1];
    return route?.name;
  });

  const { data: rolesRes } = useQuery<any>({
    queryKey: ['rolesListSidebar'],
    queryFn: () => settingsAPI.getRoles()
  });
  const systemRoles = rolesRes?.data?.data || rolesRes?.data || [];
  
  let mappedRoleName = '';
  if (typeof user?.roleId === 'string' && systemRoles.length > 0) {
    const roleObj = systemRoles.find((r: any) => r.id === user.roleId);
    if (roleObj) {
      mappedRoleName = roleObj.name;
    }
  }

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    loadCompanyName();
    checkSuperAdminEmail();
    return () => { };
  }, []);

  const checkSuperAdminEmail = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setIsSuperAdminUser(
          parsed?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
        );
      }
    } catch {
      setIsSuperAdminUser(false);
    }
  };

  const loadCompanyName = async () => {
    try {
      const settings = await AsyncStorage.getItem('settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setCompanyName(parsed.companyName || 'CALTIMS');
      }
    } catch (error) {
      console.error('Error loading company name:', error);
    }
  };


  const getInitials = () => {
    if (user?.name) {
      return user.name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    return 'U';
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'super_admin':
      case 'owner': return '#3b82f6';
      case 'manager': return '#10b981';
      default: return '#64748b';
    }
  };

  const handleLogout = async () => {
    if (externalLogout) {
      externalLogout();
      return;
    }
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' as never }],
    });
    onClose();
  };

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName as never);
    onClose();
  };

  const isActive = (routeName: string) => {
    return currentRoute === routeName;
  };

  const hasPermission = (item: NavItem | SubNavItem) => {
    if (isSuperAdminUser) return true;

    const r1 = (user?.role || '').toLowerCase();
    const r2 = (typeof user?.roleId === 'object' ? user?.roleId?.name || '' : mappedRoleName).toLowerCase();
    const r3 = ((user as any)?.roleName || '').toLowerCase();

    const isAdmin = ['admin', 'super_admin', 'owner', 'super admin'].some(
      r => r === r1 || r === r2 || r === r3
    );

    // Admin, Super Admin, and Owner have access to everything
    if (isAdmin) return true;

    // Determine baseline access based on roles
    let hasRoleAccess = false;
    if (item.roles && item.roles.length > 0) {
      const allowedRoles = item.roles.map(r => r.toLowerCase());
      hasRoleAccess = allowedRoles.includes(r1) || allowedRoles.includes(r2) || allowedRoles.includes(r3);
    } else {
      // No explicit role restrictions means this item should be visible by default to everyone
      hasRoleAccess = true;
    }
    
    // Granular Permissions check
    let rawPermissions = (typeof user?.roleId === 'object' ? user?.roleId?.permissions : undefined) || (user as any)?.permissions;
    let permissions = rawPermissions;
    if (typeof rawPermissions === 'string') {
      try {
        permissions = JSON.parse(rawPermissions);
      } catch (e) {
        permissions = {};
      }
    }

    const hasGranularPerms = permissions && Object.keys(permissions).length > 0 && !permissions.all;

    // If the item doesn't map to a specific module, or user has no granular perms, fall back to baseline role access
    if (!item.module || !hasGranularPerms) {
      return hasRoleAccess;
    }

    // Since they have granular permissions and this item is a module, it MUST be explicitly granted
    const moduleKey = Object.keys(permissions).filter(
      (k) => k.toLowerCase() === item.module!.toLowerCase()
    )[0];
    const modulePerms = moduleKey ? permissions[moduleKey] : null;

    if (!modulePerms) {
      return false; // Explicitly hidden because it's not in their granular permissions
    }

    if (!item.submodule) {
      // Parent module
      let hasAnyActivePerms = false;
      if (Array.isArray(modulePerms)) {
        hasAnyActivePerms = modulePerms.length > 0;
      } else {
        hasAnyActivePerms = Object.values(modulePerms).some(
          (p) => Array.isArray(p) && p.length > 0
        );
      }
      return hasAnyActivePerms;
    } else {
      // Specific submodule
      let submodulePerms = null;
      if (!Array.isArray(modulePerms)) {
        const subKey = Object.keys(modulePerms).filter(
          (k) => k.toLowerCase() === item.submodule!.toLowerCase()
        )[0];
        submodulePerms = subKey ? modulePerms[subKey] : null;
      }
      
      return !!(submodulePerms && Array.isArray(submodulePerms) && submodulePerms.length > 0);
    }
  };


  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoTextContainer}>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.companySubtitle}>Payroll Suite</Text>
              </View>
            </View>

            {/* User Info */}
            <View style={styles.userSection}>
              <View style={[styles.avatar, { backgroundColor: getRoleColor(user?.role || '') }]}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userRole}>
                  {isSuperAdminUser ? 'SUPER ADMIN' : (
                    (user as any)?.roleName?.toUpperCase() ||
                    (typeof user?.roleId === 'object' ? user?.roleId?.name?.toUpperCase() : undefined) ||
                    user?.role?.toUpperCase() ||
                    (mappedRoleName ? mappedRoleName.toUpperCase() : 'EMPLOYEE')
                  )}
                </Text>
              </View>
            </View>


            {/* Navigation Sections */}
            {menuItems ? (
              <View style={styles.navSection}>
                <Text style={styles.sectionLabel}>Navigation</Text>
                <View style={styles.navItems}>
                  {menuItems.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.navItem, isActive(item.route) && styles.navItemActive]}
                      onPress={() => navigateToScreen(item.route)}
                    >
                      <item.icon size={20} color={isActive(item.route) ? '#3b82f6' : '#64748b'} />
                      <Text style={[styles.navLabel, isActive(item.route) && styles.navLabelActive]}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <>
                {/* ── SUPER ADMIN Section ── visible only to superadmin@timesheetpro.com */}
                {isSuperAdminUser && (
                  <View style={styles.navSection}>
                    <View style={styles.superAdminSectionLabel}>
                      <Text style={styles.superAdminSectionText}>SUPER ADMIN</Text>
                    </View>
                    <View style={styles.navItems}>
                      <TouchableOpacity
                        style={[
                          styles.navItem,
                          styles.superAdminNavItem,
                          isActive('AdminDashboard') && styles.superAdminNavItemActive,
                        ]}
                        onPress={() => navigateToScreen('AdminDashboard')}
                      >
                        <LayoutDashboard
                          size={20}
                          color={isActive('AdminDashboard') ? '#ffffff' : '#c7d2fe'}
                        />
                        <Text
                          style={[
                            styles.navLabel,
                            styles.superAdminNavLabel,
                            isActive('AdminDashboard') && styles.superAdminNavLabelActive,
                          ]}
                        >
                          Super Dashboard
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ── Normal Sections ── */}
                {navSections.map((section) => {
                  const visibleItems = section.items.filter(hasPermission);
                  if (visibleItems.length === 0) return null;

                  return (
                    <View key={section.label} style={styles.navSection}>
                      <Text style={styles.sectionLabel}>{section.label}</Text>
                      <View style={styles.navItems}>
                        {visibleItems.map((item) => {
                          const hasSubItems = item.subItems && item.subItems.length > 0;
                          const isExpanded = expandedItem === item.label;
                          const isItemActive = isActive(item.to);

                          if (hasSubItems) {
                            return (
                              <View key={item.label}>
                                <TouchableOpacity
                                  style={[styles.navItem, isExpanded && styles.navItemActive]}
                                  onPress={() => setExpandedItem(isExpanded ? null : item.label)}
                                >
                                  <item.icon size={20} color={isExpanded ? '#3b82f6' : '#64748b'} />
                                  <Text style={[styles.navLabel, isExpanded && styles.navLabelActive]}>
                                    {item.label}
                                  </Text>
                                  <ChevronDown
                                    size={16}
                                    color="#64748b"
                                    style={[styles.chevron, isExpanded && styles.chevronRotated]}
                                  />
                                </TouchableOpacity>

                                {isExpanded && (
                                  <View style={styles.subItems}>
                                    {item.subItems?.filter(hasPermission).map((subItem) => (
                                      <TouchableOpacity
                                        key={subItem.to}
                                        style={[styles.subNavItem, isActive(subItem.to) && styles.subNavItemActive]}
                                        onPress={() => navigateToScreen(subItem.to)}
                                      >
                                        <View style={styles.subNavDot} />
                                        <Text style={[styles.subNavLabel, isActive(subItem.to) && styles.subNavLabelActive]}>
                                          {subItem.label}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                )}
                              </View>
                            );
                          }

                          return (
                            <TouchableOpacity
                              key={item.to}
                              style={[styles.navItem, isItemActive && styles.navItemActive]}
                              onPress={() => navigateToScreen(item.to)}
                            >
                              <item.icon size={20} color={isItemActive ? '#3b82f6' : '#64748b'} />
                              <Text style={[styles.navLabel, isItemActive && styles.navLabelActive]}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: scale(SIDEBAR_WIDTH),
    backgroundColor: '#ffffff',
    height: '100%',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: scale(2), height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: scale(8),
    elevation: 5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: verticalScale(12),
    right: scale(12),
    zIndex: 20,
    padding: scale(8),
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(24),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  logoTextContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#1e293b',
  },
  companySubtitle: {
    fontSize: moderateScale(10),
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: scale(1),
    marginTop: verticalScale(2),
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: scale(48),
    height: verticalScale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  avatarText: {
    color: 'white',
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userRole: {
    fontSize: moderateScale(11),
    color: '#64748b',
    marginTop: verticalScale(2),
    fontWeight: '600',
  },
  navSection: {
    marginTop: verticalScale(8),
  },
  sectionLabel: {
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: scale(1),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    textTransform: 'uppercase',
  },
  navItems: {
    paddingHorizontal: scale(12),
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(10),
    marginBottom: verticalScale(4),
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
  },
  navLabel: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#64748b',
    marginLeft: scale(12),
  },
  navLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  subItems: {
    marginLeft: scale(32),
    marginBottom: verticalScale(4),
  },
  subNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
  },
  subNavItemActive: {
    backgroundColor: '#eff6ff',
  },
  subNavDot: {
    width: scale(4),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: '#cbd5e1',
    marginRight: scale(12),
  },
  subNavLabel: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: '#64748b',
  },
  subNavLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: scale(16),
    padding: scale(12),
    borderRadius: scale(12),
    backgroundColor: '#fef2f2',
    marginTop: 'auto',
  },
  logoutText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: scale(12),
  },

  // ─── Super Admin Section Styles ───────────────────────────────────────────────
  superAdminSectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(6),
    marginTop: verticalScale(4),
    backgroundColor: '#1e1b4b',
    marginHorizontal: scale(12),
    borderRadius: scale(8),
    marginBottom: verticalScale(4),
  },
  superAdminSectionText: {
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: scale(1),
    textTransform: 'uppercase',
  },
  superAdminNavItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  superAdminNavItemActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  superAdminNavLabel: {
    color: '#6366f1',
    fontWeight: '700',
  },
  superAdminNavLabelActive: {
    color: '#ffffff',
  },
});