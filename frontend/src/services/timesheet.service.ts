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
  private extractArray(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
    if (res.timesheets && Array.isArray(res.timesheets)) return res.timesheets;
    if (res.list && Array.isArray(res.list)) return res.list;
    // Handle cases where the whole object might be the data if it has no data/timesheets/list keys
    if (typeof res === 'object' && !res.data && !res.timesheets && !res.list && !res.pagination) {
       return [];
    }
    return [];
  }

  async getHistory(params: any): Promise<TimesheetHistoryResponse> {
    const response: any = await timesheetAPI.getHistory(params);
    const list = this.extractArray(response);
    const pagination = response.pagination || { 
      page: params.page || 1, 
      totalPages: response.totalPages || 1, 
      total: response.total || list.length 
    };
    return { data: list, pagination } as any;
  }

  async getDetails(weekStartDate: string, userId: string, params: any = {}): Promise<any> {
    const response = await timesheetAPI.getDetails(weekStartDate, userId, params);
    return (response as any).data || response;
  }

  async getDetailsById(id: string): Promise<any> {
    const response = await timesheetAPI.getDetails('', '', { id });
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
  async getAdminStats(params?: any): Promise<any> {
    const response: any = await timesheetAPI.getAdminStats(params);
    // Try to find stats in 'data' or 'stats' or root
    return response.data || response.stats || response;
  }

  async getAdminFilters(): Promise<any> {
    const response: any = await timesheetAPI.getAdminFilters();
    return response.data || response.filters || response;
  }

  async getAdminList(params: any): Promise<TimesheetAdminListResponse> {
    const response: any = await timesheetAPI.getAdminList(params);
    
    const list = this.extractArray(response);
    const pagination = response.pagination || { 
      page: params.page || 1, 
      totalPages: response.totalPages || 1, 
      total: response.total || list.length 
    };

    const result = { data: list, pagination };
    
    // Ensure ID mapping to satisfy strict frontend types
    if (Array.isArray(result.data)) {
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