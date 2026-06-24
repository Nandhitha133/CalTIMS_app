import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { arrayBufferToBase64 } from '../utils/base64';

// Get base URL based on environment
const getBaseUrl = () => {
  // ⚠️ URGENT NOTE ABOUT THE 500 ERROR ⚠️
  // If you are getting a it is because this app
  // is pointing to the LIVE production server below, which still has the backend bug!
  // The fix we made is currently ONLY on your local computer.
  // To test the PDF download fix, comment out PRODUCTION_URL and use LOCAL_URL with your IPv4 address:
  
  // Main live link - do not change (unless testing backend fixes locally)
  const PRODUCTION_URL = 'https://caldimproducts.com/caltims/api/v1';
  // const LOCAL_URL = 'http://YOUR_LOCAL_IPV4_ADDRESS:5000/api/v1'; 

  return PRODUCTION_URL; // Change this to return LOCAL_URL if you want to test the local fix
};

export const BASE_URL = getBaseUrl();

class ApiService {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.map(cb => cb(token));
    this.refreshSubscribers = [];
  }

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
      // Graceful fallback for permission-audit endpoints to avoid crashing the app
      // when some backend environments don't expose the newer audit route.
      try {
        const urlLower = (response.url || '').toLowerCase();
        if (response.status === 404) {
          if (urlLower.includes('/settings/permissions/audit') || urlLower.includes('/settings/permission-audit-logs')) {
            console.warn(`[API] 404 for audit endpoint ${response.url} — returning empty list instead of throwing`);
            return [] as unknown as T;
          }
          if (urlLower.includes('/reports/filters')) {
            console.warn(`[API] 404 for report filters ${response.url} — returning default years`);
            return { success: true, data: { years: [2024, 2025, 2026, 2027, 2028] } } as unknown as T;
          }
        }
      } catch (e) {
        // ignore and continue to normal error path
      }
      let errorMessage = `Server Error [${response.status}]`;
      let errorData = null;

      try {
        const text = await response.text();
        try {
          errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Not JSON - provide a snippet of the response text
          errorMessage = text.substring(0, 100) || response.statusText || errorMessage;
        }
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      console.warn(`API ERROR [${response.status}] ${response.url}:`, errorMessage);

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

  private async performRequest<T>(method: string, endpoint: string, data?: any, params?: Record<string, any>, config?: { skipToast?: boolean; headers?: Record<string, string>; timeout?: number }): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          url.searchParams.append(key, params[key]);
        }
      });
    }

    const headers = await this.getHeaders(config?.headers);
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config?.timeout || 30000); // 30s default timeout

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        return await this.handleTokenExpiry<T>(method, endpoint, data, params, config);
      }

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The server might be under heavy load.');
      }
      if (error.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        return await this.handleTokenExpiry<T>(method, endpoint, data, params, config);
      }
      throw error;
    }
  }

  private async handleTokenExpiry<T>(method: string, endpoint: string, data?: any, params?: Record<string, any>, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.logoutAndRedirect();
      throw new Error('Session expired. Please log in again.');
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) throw new Error('Refresh failed');

        const result = await refreshRes.json();
        const newAccessToken = result.data?.accessToken || result.accessToken;
        const newRefreshToken = result.data?.refreshToken || result.refreshToken;

        if (!newAccessToken) throw new Error('New token missing');

        await AsyncStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);

        this.isRefreshing = false;
        this.onTokenRefreshed(newAccessToken);
      } catch (e) {
        this.isRefreshing = false;
        this.logoutAndRedirect();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return new Promise((resolve) => {
      this.subscribeTokenRefresh(async (token: string) => {
        resolve(this.performRequest<T>(method, endpoint, data, params, config));
      });
    });
  }

  private logoutAndRedirect() {
    const logout = useAuthStore.getState().logout;
    if (logout) {
      logout();
      try {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
      } catch (e) { }
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    return this.performRequest<T>('GET', endpoint, undefined, params, config);
  }

  async post<T>(endpoint: string, data?: any, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const result = await this.performRequest<T>('POST', endpoint, data, undefined, config);
    this.logAuditAction('POST', endpoint, data);
    return result;
  }

  async put<T>(endpoint: string, data?: any, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const result = await this.performRequest<T>('PUT', endpoint, data, undefined, config);
    this.logAuditAction('PUT', endpoint, data);
    return result;
  }

  async patch<T>(endpoint: string, data?: any, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const result = await this.performRequest<T>('PATCH', endpoint, data, undefined, config);
    this.logAuditAction('PATCH', endpoint, data);
    return result;
  }

  async delete<T>(endpoint: string, config?: { skipToast?: boolean; headers?: Record<string, string> }): Promise<T> {
    const result = await this.performRequest<T>('DELETE', endpoint, undefined, undefined, config);
    this.logAuditAction('DELETE', endpoint);
    return result;
  }
}

export const apiService = new ApiService();
export default apiService;