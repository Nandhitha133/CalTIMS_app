import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/login/LoginScreen';
import ForgotPasswordScreen from '../screens/login/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/login/ResetPasswordScreen';
import OAuthSuccessScreen from '../screens/login/OAuthSuccessScreen';
import SignupScreen from '../screens/login/SignupScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import SubscriptionScreen from '../screens/subscription/SubscriptionScreen';
import MyPayslipsScreen from '../screens/payroll/MyPayslipsScreen';
import {
  PayrollDashboard,
  EmployeePayrollProfiles,
  PayrollProcessing,
  PayrollHistory,
  PayrollRun,
  PayrollReports,
  BankTransferExport,
  PayrollHourManagement,
  PayrollPolicy,
  PayrollPayslips,
  PayrollSetupWizard,
  PayrollExecution,
} from '../screens/payroll';
import AnnouncementsScreen from '../screens/announcements/AnnouncementsScreen';
import IncidentsScreen from '../screens/incidents/IncidentListScreen';
import IncidentDetailsScreen from '../screens/incidents/IncidentDetailsScreen';
import TimesheetEntryScreen from '../screens/timesheets/TimesheetEntryScreen';
import TimesheetHistoryScreen from '../screens/timesheets/TimesheetHistoryScreen';
import AdminTimesheetScreen from '../screens/timesheets/AdminTimesheetScreen';
import TimesheetComplianceScreen from '../screens/timesheets/TimesheetComplianceScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import EmployeesScreen from '../screens/employees/EmployeesScreen';
import EmployeeDetail from '../screens/employees/EmployeeDetail';
import AuditLogScreen from '../screens/audit/AuditLogScreen';
import {
  OrganizationTab,
  SubscriptionTab,
  NotificationsTab,
  BrandingTab,
  ComplianceLocksTab,
  IntegrationsTab,
  LeavePolicyTab,
  OnboardingTab,
  PayrollPolicyTab,
  PayslipTemplatesTab,
  PermissionAuditTab,
  ReportsAutomationTab,
  TimesheetPolicyTab,
  UsersAndRolesTab,
} from '../screens/settings/tabs';
import LeaveTrackerScreen from '../screens/leaves/LeaveTrackerScreen';
import LeaveManagementScreen from '../screens/leaves/LeaveManagementScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  OAuthSuccess: { token: string; refreshToken: string };
  Signup: undefined;
  Onboarding: undefined;
  Dashboard: undefined;
  AdminDashboard: undefined;
  Subscription: undefined;
  // Add other screens as needed
  TimesheetEntry: undefined;
  TimesheetHistory: undefined;
  TimesheetCompliance: undefined;
  ManageTimesheets: undefined;

  Projects: undefined;
  Tasks: undefined;
  Employees: undefined;
  EmployeeDetail: { userId: string; employeeInfo?: any };
  Announcements: undefined;
  Calendar: undefined;
  AdminCalendar: undefined;
  Reports: undefined;
  Profile: undefined;
  AuditLogs: undefined;
  Settings: undefined;
  Incidents: undefined;
  IncidentDetails: { id: string; type?: 'incident' | 'support' };
  MyPayslips: undefined;
  PayrollDashboard: undefined;
  PayrollProfiles: undefined;
  PayrollProcessing: undefined;
  PayrollPayslips: undefined;
  PayrollReports: undefined;
  BankTransferExport: undefined;
  PayrollHourManagement: undefined;
  PayrollPolicy: undefined;
  PayrollRun: undefined;
  PayrollHistory: undefined;
  PayrollExecution: { year: string | number, month: string | number };
  PayrollSetupWizard: { preSelectedUser?: any };
  OrganizationTab: undefined;
  SubscriptionTab: undefined;
  NotificationsTab: undefined;
  BrandingTab: undefined;
  ComplianceLocksTab: undefined;
  IntegrationsTab: undefined;
  LeavePolicyTab: undefined;
  OnboardingTab: undefined;
  PayrollPolicyTab: undefined;
  PayslipTemplatesTab: undefined;
  PermissionAuditTab: undefined;
  ReportsAutomationTab: undefined;
  TimesheetPolicyTab: undefined;
  UsersAndRolesTab: undefined;
  LeaveTracker: undefined;
  LeaveManagement: undefined;

};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="OAuthSuccess" component={OAuthSuccessScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />

      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Incidents" component={IncidentsScreen} />
      <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
      <Stack.Screen name="MyPayslips" component={MyPayslipsScreen} />
      <Stack.Screen name="TimesheetEntry" component={TimesheetEntryScreen} />
      <Stack.Screen name="TimesheetHistory" component={TimesheetHistoryScreen} />
      <Stack.Screen name="TimesheetCompliance" component={TimesheetComplianceScreen} />
      <Stack.Screen name="ManageTimesheets" component={AdminTimesheetScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Employees" component={EmployeesScreen} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetail} />
      <Stack.Screen name="AuditLogs" component={AuditLogScreen} />
      <Stack.Screen name="OrganizationTab" component={OrganizationTab} />
      <Stack.Screen name="SubscriptionTab" component={SubscriptionTab} />
      //<Stack.Screen name="NotificationsTab" component={NotificationsTab} />
      <Stack.Screen name="BrandingTab" component={BrandingTab} />
      <Stack.Screen name="ComplianceLocksTab" component={ComplianceLocksTab} />
      <Stack.Screen name="IntegrationsTab" component={IntegrationsTab} />
      <Stack.Screen name="LeavePolicyTab" component={LeavePolicyTab} />
      <Stack.Screen name="OnboardingTab" component={OnboardingTab} />
      <Stack.Screen name="PayrollPolicyTab" component={PayrollPolicyTab} />
      <Stack.Screen name="PayslipTemplatesTab" component={PayslipTemplatesTab} />
      <Stack.Screen name="PermissionAuditTab" component={PermissionAuditTab} />
      <Stack.Screen name="ReportsAutomationTab" component={ReportsAutomationTab} />
      <Stack.Screen name="TimesheetPolicyTab" component={TimesheetPolicyTab} />
      <Stack.Screen name="UsersAndRolesTab" component={UsersAndRolesTab} />

      {/* Payroll Screens */}
      <Stack.Screen name="PayrollDashboard" component={PayrollDashboard} />
      <Stack.Screen name="PayrollProfiles" component={EmployeePayrollProfiles} />
      <Stack.Screen name="PayrollProcessing" component={PayrollProcessing} />
      <Stack.Screen name="PayrollHistory" component={PayrollHistory} />
      <Stack.Screen name="PayrollExecution" component={PayrollExecution} />
      <Stack.Screen name="PayrollRun" component={PayrollRun} />
      <Stack.Screen name="PayrollReports" component={PayrollReports} />
      <Stack.Screen name="BankTransferExport" component={BankTransferExport} />
      <Stack.Screen name="PayrollHourManagement" component={PayrollHourManagement} />
      <Stack.Screen name="PayrollPolicy" component={PayrollPolicy} />
      <Stack.Screen name="PayrollPayslips" component={PayrollPayslips} />
      <Stack.Screen name="LeaveTracker" component={LeaveTrackerScreen} />
      <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={SettingsScreen} />
      <Stack.Screen name="PayrollSetupWizard" component={PayrollSetupWizard} />


    </Stack.Navigator>
  );
}