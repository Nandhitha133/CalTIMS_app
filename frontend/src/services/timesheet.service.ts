import { timesheetAPI, incidentService } from './endpoints';
import apiService from './api';

export interface TimesheetHistoryItem {
  id?: string;
  _id?: string;
  weekStartDate: string;
  totalHours: number;
  statuses: string[];
  projects: string[];
  lastUpdated: string;
  userId?: any;
}

export interface TimesheetPagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

export interface TimesheetHistoryResponse {
  data: TimesheetHistoryItem[];
  pagination: TimesheetPagination;
}

export interface TimesheetAdminItem {
  id: string;
  _id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  status: string;
  submittedAt?: string;
  approvedBy?: { name: string };
  userId: {
    id: string;
    _id: string;
    name: string;
    employeeId: string;
  };
  rows: Array<{
    projectId: {
      id: string;
      _id: string;
      name: string;
      code: string;
    };
    totalHours: number;
    entries: Array<{
      date: string;
      hoursWorked: number;
      description?: string;
    }>;
  }>;
}

export interface TimesheetAdminListResponse {
  data: TimesheetAdminItem[];
  pagination: TimesheetPagination;
}

class TimesheetService {
  async getHistory(params: any): Promise<TimesheetHistoryResponse> {
    const response = await timesheetAPI.getHistory(params);
    return (response as any).data || response;
  }

  async getDetails(weekStartDate: string, userId: string): Promise<any> {
    const response = await timesheetAPI.getDetails(weekStartDate, userId);
    return (response as any).data || response;
  }

  async delete(id: string): Promise<any> {
    const response = await timesheetAPI.delete(id);
    return (response as any).data || response;
  }

  async reportIssue(data: any): Promise<any> {
    const response = await incidentService.createIncident(data);
    return (response as any).data || response;
  }

  async exportHistory(params: any): Promise<string> {
    const response = await timesheetAPI.exportHistory(params);
    return response as any;
  }

  // Admin Methods
  async getAdminStats(): Promise<any> {
    const response = await timesheetAPI.getAdminStats();
    return (response as any).data || response;
  }

  async getAdminFilters(): Promise<any> {
    const response = await timesheetAPI.getAdminFilters();
    return (response as any).data || response;
  }

  async getAdminList(params: any): Promise<TimesheetAdminListResponse> {
    const response = await timesheetAPI.getAdminList(params);
    const result = (response as any).data || response;
    
    // Ensure ID mapping to satisfy strict frontend types
    if (result.data) {
      result.data = result.data.map((item: any) => ({
        ...item,
        id: item.id || item._id,
        userId: item.userId ? { ...item.userId, id: item.userId.id || item.userId._id } : item.userId,
        rows: item.rows?.map((row: any) => ({
          ...row,
          projectId: row.projectId ? { ...row.projectId, id: row.projectId.id || row.projectId._id } : row.projectId
        }))
      }));
    }
    
    if (result.pagination && result.pagination.limit === undefined) {
      result.pagination.limit = params.limit || 10;
    }

    return result;
  }

  async approve(id: string): Promise<any> {
    const response = await timesheetAPI.approve(id);
    return (response as any).data || response;
  }

  async reject(id: string, reason: string): Promise<any> {
    const response = await timesheetAPI.reject(id, reason);
    return (response as any).data || response;
  }

  async exportAdminList(params: any): Promise<string> {
    const response = await timesheetAPI.exportAdminList(params);
    return response as any;
  }

  // Compliance Methods
  async getCompliance(params: any): Promise<any> {
    const response = await timesheetAPI.getCompliance(params);
    return (response as any).data || response;
  }

  async exportCompliance(params: any): Promise<string> {
    const response = await timesheetAPI.exportCompliance(params);
    return response as any;
  }

  async adminFill(data: any): Promise<any> {
    const response = await timesheetAPI.adminFill(data);
    return (response as any).data || response;
  }
}

export const timesheetService = new TimesheetService();