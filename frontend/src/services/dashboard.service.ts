import { timesheetAPI, projectAPI, announcementAPI, leaveAPI, calendarAPI } from './endpoints';

export interface DashboardSummary {
  hoursThisWeek: number;
  targetHours: number;
  dailyHours: Array<{ day: string; hours: number }>;
  pendingTimesheets: number;
  approvedTimesheets: number;
  rejectedTimesheets: number;
  notSubmittedCount: number;
  totalEmployees: number;
  submissionDeadline: string;
  projectTotals?: Array<{ projectId: string; totalHours: number }>;
}

export interface Project {
  _id: string;
  name: string;
  budgetHours: number;
  hours?: number;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface LeaveBalance {
  annual: number;
  casual: number;
  sick: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  eventType: 'holiday' | 'company_event' | 'leave' | 'personal_event' | 'meeting' | 'deadline';
  description?: string;
}

class DashboardService {
  async getDashboardSummary(params: {
    projectId?: string;
    weekStartDate?: string;
  }): Promise<DashboardSummary> {
    const response = await timesheetAPI.getDashboardSummary(params);
    // The API returns { data: { ... } } structure
    return (response as any).data || response;
  }

  async getProjects(): Promise<Project[]> {
    const response = await projectAPI.getAll({ limit: 100 });
    // The API returns { data: { data: Project[], pagination: ... } }
    return (response as any)?.data?.data || (response as any).data || response || [];
  }

  async getAnnouncements(): Promise<Announcement[]> {
    const response = await announcementAPI.getAll({ limit: 10 });
    // The API returns { data: { data: Announcement[], pagination: ... } }
    return (response as any)?.data?.data || (response as any).data || response || [];
  }

  async getLeaveBalance(userId: string): Promise<LeaveBalance> {
    const response = await leaveAPI.getBalance(userId);
    return (response as any).data || response || { annual: 0, casual: 0, sick: 0 };
  }

  async getCalendarEvents(month: string): Promise<CalendarEvent[]> {
    const response = await calendarAPI.getAll({ month });
    // The API returns { data: CalendarEvent[] } or similar
    return (response as any).data || response || [];
  }
}

export const dashboardService = new DashboardService();