import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { arrayBufferToBase64 } from '../utils/base64';

// Get base URL based on environment
const getBaseUrl = () => {
  // Main live link - do not change
  const PRODUCTION_URL = 'https://caldimproducts.com/caltims/api/v1';

  return PRODUCTION_URL;
};

export const BASE_URL = getBaseUrl();

class ApiService {
  private async getHeaders(customHeaders?: Record<string, string>): Promise<any> {
    const token = await AsyncStorage.getItem('accessToken');
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    const mergedHeaders = { ...defaultHeaders, ...customHeaders };

    // If we're sending FormData, don't set Content-Type so fetch can set it with boundary
    if (mergedHeaders['Content-Type'] === 'multipart/form-data') {
      delete mergedHeaders['Content-Type'];
    }

    return mergedHeaders;
  }

  /**
   * Automatically logs high-level system actions to the audit endpoint.
   * This ensures "real" data is captured project-wide without modifying individual screens.
   */
  private async logAuditAction(method: string, endpoint: string, data?: any) {
    try {
      // Don't audit the audit logs themselves to avoid infinite loops
      if (endpoint === '/audit' || endpoint.includes('/audit')) return;

      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      const entity = endpoint.split('/')[1]?.toUpperCase() || 'SYSTEM';
      const actionMap: Record<string, string> = {
        'POST': 'CREATE',
        'PUT': 'UPDATE',
        'PATCH': 'UPDATE',
        'DELETE': 'DELETE'
      };

      const auditPayload = {
        action: `${actionMap[method] || method}_${entity}`,
        entity: entity,
        status: 'SUCCESS',
        performedBy: user ? { _id: user._id, name: user.name } : { name: 'System' },
        role: user?.role || 'SYSTEM',
        metadata: data || {},
        createdAt: new Date().toISOString()
      };

      // Use a direct fetch to bypass the interceptor for the audit log itself
      const token = await AsyncStorage.getItem('accessToken');
      fetch(`${BASE_URL}/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(auditPayload)
      }).catch(err => console.warn('Silent Audit Error:', err));
    } catch (e) {
      console.warn('Audit Interceptor Failed:', e);
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized globally
        const message = await response.json().then(j => j.message).catch(() => 'Session expired. Please log in again.');

        // Log out the user
        const logout = useAuthStore.getState().logout;
        if (logout) {
          logout();
          try {
            Alert.alert('Session Expired', message);
          } catch (e) { }
        }
        throw new Error(message);
      }

      let errorMessage = `Request failed with status ${response.status}`;
      let errorData = null;

      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      console.warn(`API Error [${response.status}] ${response.url}:`, errorMessage);
      
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.data = errorData;
      error.response = { data: errorData }; // Compatibility with axios-style handling
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType && (contentType.includes('text/csv') || contentType.includes('text/plain'))) {
      return await response.text() as unknown as T;
    }

    if (contentType && (
      contentType.includes('application/pdf') || 
      contentType.includes('application/vnd.ms-excel') ||
      contentType.includes('application/octet-stream')
    )) {
      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer).trim();
      console.log(`[API] Converted ${buffer.byteLength} bytes to ${base64.length} chars base64`);
      return base64 as unknown as T;
    }

    return { success: true } as T;
  }

  async get<T>(endpoint: string, params?: Record<string, any>, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          url.searchParams.append(key, params[key]);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.getHeaders(config?.headers),
      credentials: 'include',
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: await this.getHeaders(config?.headers),
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      credentials: 'include',
    });

    const result = await this.handleResponse<T>(response);

    // Auto-audit successful mutations
    this.logAuditAction('POST', endpoint, data);

    return result;
  }

  async put<T>(endpoint: string, data?: any, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: await this.getHeaders(config?.headers),
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      credentials: 'include',
    });

    const result = await this.handleResponse<T>(response);

    // Auto-audit successful mutations
    this.logAuditAction('PUT', endpoint, data);

    return result;
  }

  async patch<T>(endpoint: string, data?: any, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: await this.getHeaders(config?.headers),
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      credentials: 'include',
    });

    const result = await this.handleResponse<T>(response);

    // Auto-audit successful mutations
    this.logAuditAction('PATCH', endpoint, data);

    return result;
  }

  async delete<T>(endpoint: string, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: await this.getHeaders(config?.headers),
      credentials: 'include',
    });

    const result = await this.handleResponse<T>(response);

    // Auto-audit successful mutations
    this.logAuditAction('DELETE', endpoint);

    return result;
  }
}

export const apiService = new ApiService();
export default apiService;