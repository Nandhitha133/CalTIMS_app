// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, subscriptionAPI } from '../services/endpoints';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee' | 'super_admin';
  organizationId?: string;
  avatar?: string;
}

interface Subscription {
  planType: 'TRIAL' | 'PRO' | 'ENTERPRISE';
  expiresAt?: string;
  features?: string[];
}

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  hasCompletedTour: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string, subscription?: Subscription | null) => void;
  setAccessToken: (accessToken: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setHasCompletedTour: (value: boolean) => void;
  setAuthFromURL: (accessToken: string, refreshToken: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // Getters
  getRole: () => string | undefined;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isEmployee: () => boolean;
  isTrial: () => boolean;
  isPro: () => boolean;
  canAccess: (feature: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      subscription: null,
      isAuthenticated: false,
      isHydrating: true,
      hasCompletedTour: false,

      // Actions
      setAuth: (user: User, accessToken: string, refreshToken: string, subscription: Subscription | null = null) =>
        set({ user, accessToken, refreshToken, subscription, isAuthenticated: true }),

      setAccessToken: (accessToken: string) =>
        set({ accessToken }),

      setRefreshToken: (refreshToken: string) =>
        set({ refreshToken }),

      logout: () =>
        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null, 
          subscription: null,
          isAuthenticated: false, 
          isHydrating: false 
        }),

      updateUser: (userData: Partial<User>) =>
        set((state: AuthState) => ({ user: state.user ? { ...state.user, ...userData } : null })),

      setHasCompletedTour: (value: boolean) =>
        set({ hasCompletedTour: value }),

      setAuthFromURL: async (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true, isHydrating: true });
        const store = get();
        await store.checkAuth();
      },

      checkAuth: async () => {
        const { accessToken, isAuthenticated } = get();
        
        if (!accessToken || !isAuthenticated) {
          set({ isHydrating: false });
          return;
        }

        try {
          // 1. Fetch the fresh user object
          const userRes: any = await authAPI.getMe();
          const user = userRes.data.data;
          
          let subscription = get().subscription;

          // 2. Only fetch subscription if the user is associated with an organization
          if (user.organizationId) {
            try {
              const subRes: any = await subscriptionAPI.getCurrent();
              subscription = subRes.data.data;
            } catch (err) {
              console.warn('Failed to fetch subscription during checkAuth:', err);
            }
          }

          set({ user, subscription, isAuthenticated: true, isHydrating: false });
        } catch (error) {
          console.error('CheckAuth failed:', error);
          set({ 
            user: null, 
            accessToken: null, 
            refreshToken: null, 
            subscription: null, 
            isAuthenticated: false, 
            isHydrating: false 
          });
          // Clear persisted storage
          await AsyncStorage.removeItem('timesheet-auth');
        }
      },

      // Getters
      getRole: () => get().user?.role,
      
      isAdmin: () => {
        const role = get().user?.role;
        return role === 'admin' || role === 'super_admin';
      },
      
      isManager: () => get().user?.role === 'manager',
      
      isEmployee: () => get().user?.role === 'employee',
      
      isTrial: () => get().subscription?.planType === 'TRIAL',
      
      isPro: () => {
        const { user, subscription } = get();
        if (user?.role === 'super_admin') return true;
        return subscription?.planType === 'PRO';
      },
      
      canAccess: (feature: string) => {
        const { user, subscription } = get();
        
        // Super admin has access to everything
        if (user?.role === 'super_admin') return true;
        
        const plan = subscription?.planType || 'TRIAL';
        
        // PRO plan has access to everything
        if (plan === 'PRO') return true;
        
        // TRIAL plan restrictions
        if (feature === 'advanced_reports' || feature === 'ai' || feature === 'payroll') {
          return false; // Only PRO can access these, and we already checked for PRO above
        }
        
        // Default access for basic features
        return true;
      },
    }),
    {
      name: 'timesheet-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AuthState) => ({ 
        user: state.user, 
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
        hasCompletedTour: state.hasCompletedTour
      }),
    }
  )
);