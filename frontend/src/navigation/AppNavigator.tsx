import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/login/LoginScreen';
import ForgotPasswordScreen from '../screens/login/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/login/ResetPasswordScreen';
import OAuthSuccessScreen from '../screens/login/OAuthSuccessScreen';
import SignupScreen from '../screens/login/SignupScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
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
  PayrollPayslip,
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
import AuditLogScreen from '../screens/audit/AuditLogScreen';
import OrganizationTab from '../screens/settings/tabs/OrganizationTab';
import SubscriptionTab from '../screens/settings/tabs/SubscriptionTab';
import NotificationsTab from '../screens/settings/tabs/NotificationsTab';
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
  Announcements: undefined;
  Calendar: undefined;
  AdminCalendar: undefined;
  Reports: undefined;
  Profile: undefined;
  AuditLogs: undefined;
  Incidents: undefined;
  IncidentDetails: { id: string; type?: 'incident' | 'support' };
  MyPayslips: undefined;
  PayrollDashboard: undefined;
  PayrollProfiles: undefined;
  PayrollProcessing: undefined;
  PayrollPayslip: undefined;
  PayrollReports: undefined;
  BankTransferExport: undefined;
  PayrollHourManagement: undefined;
  PayrollPolicy: undefined;
  PayrollRun: undefined;
  PayrollHistory: undefined;
  OrganizationTab: undefined;
  SubscriptionTab: undefined;
  NotificationsTab: undefined;
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
      <Stack.Screen name="AdminDashboard" component={DashboardScreen} />
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
      <Stack.Screen name="AuditLogs" component={AuditLogScreen} />
      <Stack.Screen name="OrganizationTab" component={OrganizationTab} />
      <Stack.Screen name="SubscriptionTab" component={SubscriptionTab} />
      <Stack.Screen name="NotificationsTab" component={NotificationsTab} />

      {/* Payroll Screens */}
      <Stack.Screen name="PayrollDashboard" component={PayrollDashboard} />
      <Stack.Screen name="PayrollProfiles" component={EmployeePayrollProfiles} />
      <Stack.Screen name="PayrollProcessing" component={PayrollProcessing} />
      <Stack.Screen name="PayrollHistory" component={PayrollHistory} />
      <Stack.Screen name="PayrollRun" component={PayrollRun} />
      <Stack.Screen name="PayrollReports" component={PayrollReports} />
      <Stack.Screen name="BankTransferExport" component={BankTransferExport} />
      <Stack.Screen name="PayrollHourManagement" component={PayrollHourManagement} />
      <Stack.Screen name="PayrollPolicy" component={PayrollPolicy} />
      <Stack.Screen name="PayrollPayslip" component={PayrollPayslip} />
      <Stack.Screen name="LeaveTracker" component={LeaveTrackerScreen} />
      <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={SettingsScreen} />


    </Stack.Navigator>
  );
}