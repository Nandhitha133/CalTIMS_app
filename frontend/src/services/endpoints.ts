// services/endpoints.ts
import apiService from './api';

// ==================== AUTH API ====================
export const authAPI = {
  login: (data: { email: string; password: string }) => 
    apiService.post('/auth/login', data, { skipToast: true }),
  register: (data: any) => 
    apiService.post('/auth/register', data, { skipToast: true }),
  logout: () => 
    apiService.post('/auth/logout'),
  forgotPassword: (data: { email: string }) => 
    apiService.post('/auth/forgot-password', data),
  resetPassword: (token: string, data: { password: string; confirmPassword: string }) => 
    apiService.post(`/auth/reset-password/${token}`, data),
  socialLogin: (data: any) => 
    apiService.post('/auth/social-login', data, { skipToast: true }),
  getMe: () => 
    apiService.get('/users/me'),
};

// ==================== TIMESHEET API ====================
export const timesheetAPI = {
  // Dashboard
  getDashboardSummary: (params: { projectId?: string; weekStartDate?: string }) => 
    apiService.get('/timesheets/summary', params),
  
  // User History
  getHistory: (params: any) => 
    apiService.get('/timesheets/history', params),
  getDetails: (weekStartDate: string, userId: string, params: any = {}) => {
    // Determine the query parameters string safely
    const queryParams = new URLSearchParams();
    if (weekStartDate) queryParams.append('weekStartDate', weekStartDate);
    if (userId) queryParams.append('userId', userId);
    
    for (const key in params) {
        if (params[key] !== undefined) {
            queryParams.append(key, params[key]);
        }
    }
    return apiService.get(`/timesheets/details?${queryParams.toString()}`);
  },
  delete: (id: string) => 
    apiService.delete(`/timesheets/${id}`),
  
  // Admin Manage
  getAdminStats: (params?: any) => 
    apiService.get('/timesheets/admin-summary', params),
  getAdminFilters: () => 
    apiService.get('/timesheets/admin-filters'),
  getAdminList: (params: any) => 
    apiService.get('/timesheets/admin-list', params),
  approve: (id: string) => 
    apiService.patch(`/timesheets/${id}/approve`),
  reject: (id: string, reason: string) => 
    apiService.patch(`/timesheets/${id}/reject`, { reason }),
  submit: (id: string) => 
    apiService.patch(`/timesheets/${id}/submit`),
  adminFill: (payload: any) => 
    apiService.post('/timesheets/admin-fill', payload),
  exportAdminList: (params: any) => 
    apiService.get('/timesheets/admin/export', params, { headers: { 'Accept': 'text/csv' } }),
  
  // Compliance
  getCompliance: (params: any) => 
    apiService.get('/timesheets/compliance', params),
  exportCompliance: (params: any) => 
    apiService.get('/timesheets/compliance/export', params, { headers: { 'Accept': 'text/csv' } }),
  
  // Export
  exportHistory: (params: any) => 
    apiService.get('/timesheets/history/export', params, { headers: { 'Accept': 'text/csv' } }),
  
  // Legacy/Additional
  getAll: (params?: any) => 
    apiService.get('/timesheets', params),
  getAdminSummary: (params?: any) => 
    apiService.get('/timesheets/admin/summary', params),
  getManageTimesheetsSummary: () =>
    apiService.get('/timesheets/manage-summary'),
  bulkUpsert: (data: any) => 
    apiService.post('/timesheets/bulk', data),
  bulkSubmit: (data: any) => 
    apiService.post('/timesheets/bulk-submit', data),
  getById: (id: string) => 
    apiService.get(`/timesheets/${id}`),
};

// ==================== TASK API ====================
export const taskAPI = {
  getAll: (params?: any) => 
    apiService.get('/tasks', params),
  getById: (id: string) => 
    apiService.get(`/tasks/${id}`),
  create: (data: any) => 
    apiService.post('/tasks', data),
  bulkCreate: (data: any) => 
    apiService.post('/tasks/bulk-create', data),
  update: (id: string, data: any) => 
    apiService.put(`/tasks/${id}`, data),
  delete: (id: string) => 
    apiService.delete(`/tasks/${id}`),
  export: (params: any) => 
    apiService.get('/tasks/export', params, { headers: { 'Accept': 'text/csv' } }),
};

// ==================== PROJECT API ====================
export const projectAPI = {
  getAll: (params?: any) => 
    apiService.get('/projects', params),
  getById: (id: string) => 
    apiService.get(`/projects/${id}`),
  create: (data: any) => 
    apiService.post('/projects', data),
  update: (id: string, data: any) => 
    apiService.put(`/projects/${id}`, data),
  delete: (id: string) => 
    apiService.delete(`/projects/${id}`),
  export: (params: any) => 
    apiService.get('/projects/export', params, { headers: { 'Accept': 'text/csv' } }),
};

// ==================== LEAVE API ====================
export const leaveAPI = {
  getAll: (params?: any) => 
    apiService.get('/leaves', params),
  getBalance: (userId: string) => 
    apiService.get(`/leaves/balance/${userId}`),
  apply: (data: any) => 
    apiService.post('/leaves', data),
  approve: (id: string) => 
    apiService.patch(`/leaves/${id}/approve`),
  reject: (id: string, reason: string) => 
    apiService.patch(`/leaves/${id}/reject`, { reason }),
  cancel: (id: string, reason: string) => 
    apiService.patch(`/leaves/${id}/cancel`, { reason }),
  export: (params: any) => 
    apiService.get('/leaves/export', params, { headers: { 'Accept': 'text/csv' } }),
};

// ==================== ANNOUNCEMENT API ====================
export const announcementAPI = {
  getAll: (params?: { limit?: number }) => 
    apiService.get('/announcements', params),
  getAllAdmin: (params?: any) => 
    apiService.get('/announcements/admin', params),
  getById: (id: string) => 
    apiService.get(`/announcements/${id}`),
  create: (data: any) => 
    apiService.post('/announcements', data),
  update: (id: string, data: any) => 
    apiService.put(`/announcements/${id}`, data),
  delete: (id: string) => 
    apiService.delete(`/announcements/${id}`),
};

// ==================== NOTIFICATION API ====================
export const notificationAPI = {
  getAll: (params?: { limit?: number }) => 
    apiService.get('/notifications', params),
  getUnreadCount: () => 
    apiService.get('/notifications/unread-count'),
  markRead: (id: string) => 
    apiService.patch(`/notifications/${id}/read`),
  markAllRead: () => 
    apiService.patch('/notifications/mark-all-read'),
  clearAll: () => 
    apiService.delete('/notifications/clear-all'),
};

// ==================== CALENDAR API ====================
export const calendarAPI = {
  getAll: (params?: { month?: string; from?: string; to?: string; eventType?: string }) => 
    apiService.get('/calendar', params),
  getById: (id: string) => 
    apiService.get(`/calendar/${id}`),
  create: (data: any) => 
    apiService.post('/calendar', data),
  update: (id: string, data: any) => 
    apiService.put(`/calendar/${id}`, data),
  delete: (id: string) => 
    apiService.delete(`/calendar/${id}`),
};

// ==================== REPORT API ====================
export const reportAPI = {
  getTimesheetSummary: (params: any) => 
    apiService.get('/reports/timesheet-summary', params),
  getProjectUtilization: (params: any) => 
    apiService.get('/reports/project-utilization', params),
  getLeaveSummary: (params: any) => 
    apiService.get('/reports/leave-summary', params),
  getFilterOptions: () => 
    apiService.get('/reports/filters'),
  getWeeklyTrend: (params: any) => 
    apiService.get('/reports/weekly-trend', params),
  getDepartmentSummary: (params: any) => 
    apiService.get('/reports/department-summary', params),
  getComplianceSummary: (params: any) => 
    apiService.get('/reports/compliance-summary', params),
  getSmartInsights: (params: any) => 
    apiService.get('/reports/smart-insights', params),
  getTimesheetDetails: (params: any) => 
    apiService.get('/reports/timesheet-details', params),
  exportPDF: (params: any) => 
    apiService.get('/reports/pdf-export', params, { headers: { 'Accept': 'application/pdf' } }),
  exportCSV: (params: any) => 
    apiService.get('/reports/csv-export', params, { headers: { 'Accept': 'text/csv' } }),
};

// ==================== SETTINGS API ====================
export const settingsAPI = {
  getSettings: () => 
    apiService.get('/settings'),
  getGeneralSettings: () => 
    apiService.get('/settings/general'),
  saveGeneralSettings: (data: any) => 
    apiService.post('/settings/general', data),
  getPayrollSettings: () => 
    apiService.get('/settings/payroll'),
  savePayrollSettings: (data: any) => 
    apiService.post('/settings/payroll', data),
  getTimesheetSettings: () => 
    apiService.get('/settings/timesheet'),
  saveTimesheetSettings: (data: any) => 
    apiService.post('/settings/timesheet', data),
  uploadBranding: (data: FormData) => 
    apiService.post('/settings/branding/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateSettings: (data: any) => 
    apiService.put('/settings', data),
  getPermissionAuditLogs: async (params: { roleName: string }) => {
    try {
      return await apiService.get('/settings/permissions/audit', params);
    } catch (err: any) {
      // Fallback for environments where the newer endpoint isn't available
      if (err?.status === 404) {
        try {
          return await apiService.get('/settings/permission-audit-logs', params);
        } catch (err2) {
          throw err; // rethrow original
        }
      }
      throw err;
    }
  },

};

// ==================== PAYROLL API ====================
export const payrollAPI = {
  getConfig: () => apiService.get('/payroll/config'),
  updateConfig: (data: any) => apiService.patch('/payroll/config', data),
  getRoleStructures: () => apiService.get('/payroll/role-structures'),
  updateRoleStructure: (data: any) => apiService.post('/payroll/role-structures', data),
  getProfiles: () => apiService.get('/payroll/profiles'),
  getProfile: (userId: string) => apiService.get(`/payroll/profiles/${userId}`),
  updateProfile: (data: any) => apiService.post('/payroll/profiles', data),
  setupFullProfile: (data: any) => apiService.post('/payroll/setup-profile', data),
  deleteProfile: (id: string) => apiService.delete(`/payroll/profiles/${id}`),
  toggleStructureStatus: (id: string) => apiService.patch(`/payroll/role-structures/${id}/toggle`),
  deleteStructure: (id: string) => apiService.delete(`/payroll/role-structures/${id}`),
  simulate: (data: any) => apiService.post('/payroll/process/simulate', data),
  save: (data: any) => apiService.post('/payroll/process/save', data),
  run: (data: any) => apiService.post('/payroll/run', data),
  markPaid: (data: any) => apiService.post('/payroll/mark-paid', data),
  getHistory: (params?: any) => apiService.get('/payroll/history', params),
  generatePayslips: (data: any) => apiService.post('/payroll/payslips/generate', data),
  getGeneratedPayslips: (params?: any) => apiService.get('/payroll/payslips/generated', params),
  markPayslipAsPaid: (id: string) => apiService.post(`/payroll/payslips/${id}/mark-paid`),
  bulkMarkPayslipsAsPaid: (ids: string[]) => apiService.post('/payroll/payslips/bulk-mark-paid', { ids }),
  getMyPayslips: (params?: any) => apiService.get('/payroll/payslips/my', params),
  getPayslip: (id: string) => apiService.get(`/payroll/payslips/${id}`),
  downloadPayslip: (id: string) => apiService.get(`/payroll/payslip/${id}/download`, undefined, { headers: { 'Accept': 'application/pdf' } }),
  sendPayslipEmail: (id: string) => apiService.post(`/payroll/payslip/${id}/send-email`),
  bulkSendPayslipEmails: (ids: string[]) => apiService.post('/payroll/payslips/bulk-send-email', { ids }),
  exportBank: (params?: any) => apiService.get('/payroll/export-bank', params),
  getSummaryReport: (params?: any) => apiService.get('/payroll/reports/summary', params),
  getDepartmentAnalysis: (params?: any) => apiService.get('/payroll/reports/department-analysis', params),
  getDashboard: (params?: any) => apiService.get('/payroll/dashboard', params),
  getAnalytics: (params?: any) => apiService.get('/payroll/analytics', params),

  getReadiness: (params?: any) => apiService.get('/payroll/readiness', params),
  getPreview: (params?: any) => apiService.get('/payroll/preview', params),
  getBatches: () => apiService.get('/payroll/batches'),
}

// ==================== POLICY API ====================
export const policyAPI = {
  getPolicy: () => 
    apiService.get('/policy'),
  updatePolicy: (data: any) => 
    apiService.put('/policy', data),
  createVersion: (data: any) => 
    apiService.post('/policy/version', data),
  preview: (data: any) => 
    apiService.post('/policy/preview', data),
};

// ==================== SUBSCRIPTION API ====================
export const subscriptionAPI = {
  getCurrent: () => 
    apiService.get('/subscriptions/current'),
  upgrade: (data: { planId: string }) => 
    apiService.post('/subscriptions/upgrade', data),
};

// ==================== ADMIN API ====================
export const adminAPI = {
  getDashboardMetrics: () => 
    apiService.get('/admin/dashboard-metrics'),
  getOrganizations: () => 
    apiService.get('/admin/organizations'),
};

// ==================== ATTENDANCE API ====================
export const attendanceAPI = {
  getAll: (params?: { from?: string; to?: string }) => 
    apiService.get('/attendance', params),
  getByUser: (userId: string, params?: { from?: string; to?: string }) => 
    apiService.get(`/attendance/user/${userId}`, params),
};

// ==================== USER API ====================
export const userAPI = {
  getAll: (params?: any) => 
    apiService.get('/users', params),
  getById: (id: string) => 
    apiService.get(`/users/${id}`),
  create: (data: any) => 
    apiService.post('/users', data),
  update: (id: string, data: any) => 
    apiService.put(`/users/${id}`, data),
  delete: (id: string) => 
    apiService.delete(`/users/${id}`),
  getDepartments: () => 
    apiService.get('/users/departments'),
  getRoles: () => 
    apiService.get('/users/roles'),
  resetPassword: (id: string, password: string) => 
    apiService.post(`/users/${id}/reset-password`, { password }),
  deactivate: (id: string) => 
    apiService.patch(`/users/${id}/deactivate`),
  activate: (id: string) => 
    apiService.patch(`/users/${id}/activate`),
  changeRole: (id: string, role: string) => 
    apiService.patch(`/users/${id}/role`, { role }),
  export: (params: any) => 
    apiService.get('/users/export', params, { headers: { 'Accept': 'text/csv' } }),
};

// ==================== AUDIT API ====================
export const auditAPI = {
  getAll: (params?: any) => 
    apiService.get('/audit', params),
  create: (data: any) => 
    apiService.post('/audit', data),
};

// ==================== INCIDENT API ====================
export const incidentService = {
  getIncidents: (params?: any) => 
    apiService.get('/incidents', params),
  getIncident: (id: string) => 
    apiService.get(`/incidents/${id}`),
  getById: (id: string) => 
    apiService.get(`/incidents/${id}`),
  createIncident: (data: any) => 
    apiService.post('/incidents', data),
  updateIncident: (id: string, data: any) => 
    apiService.patch(`/incidents/${id}`, data),
  deleteIncident: (id: string) => 
    apiService.delete(`/incidents/${id}`),
  addResponse: (id: string, message: string) => 
    apiService.post(`/incidents/${id}/responses`, { message }),
};

// ==================== SUPPORT API ====================
export const supportService = {
  getTickets: (params?: any) => 
    apiService.get('/support/tickets', params),
  getTicket: (id: string) => 
    apiService.get(`/support/tickets/${id}`),
  createTicket: (data: any) => 
    apiService.post('/support/tickets', data),
  updateTicketStatus: (id: string, status: string) => 
    apiService.patch(`/support/tickets/${id}`, { status }),
  deleteTicket: (id: string) => 
    apiService.delete(`/support/tickets/${id}`),
};
// Add to your existing endpoints file
export const projectAnalyticsAPI = {
  analyzeProductivity: (projectId: string) => 
    apiService.get(`/projects/${projectId}/analytics/productivity`),
  
  analyzeAICost: (projectId: string) => 
    apiService.get(`/projects/${projectId}/analytics/cost`),
};

// ==================== EXPORTS ====================
export default {
  authAPI,
  timesheetAPI,
  projectAPI,
  leaveAPI,
  announcementAPI,
  notificationAPI,
  calendarAPI,
  reportAPI,
  settingsAPI,
  subscriptionAPI,
  adminAPI,
  userAPI,
  payrollAPI,
  taskAPI,
  auditAPI,
  policyAPI,
  attendanceAPI,
  incidentService,
  supportService,
};