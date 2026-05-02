// src/store/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, subscriptionAPI } from '../services/endpoints';

interface OrganizationSettings {
  companyName: string;
  timezone: string;
  dateFormat: string;
  companyLogo: string;
  address: string;
  country: string;
  currency: string;
  fiscalYearStart: string;
  workWeek: string;
}

interface GeneralSettings {
  workingHoursPerDay: number;
  strictDailyHours: boolean;
  isWeekendWorkable: boolean;
  weekStartDay: string;
}

interface SettingsState {
  organization: OrganizationSettings;
  general: GeneralSettings;
  updateGeneralSettings: (data: Partial<OrganizationSettings & GeneralSettings>) => void;
  setAllSettings: (data: { organization: OrganizationSettings; general: GeneralSettings }) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      organization: {
        companyName: '',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        companyLogo: '',
        address: '',
        country: '',
        currency: 'INR',
        fiscalYearStart: 'April',
        workWeek: 'Mon-Fri',
      },
      general: {
        workingHoursPerDay: 8,
        strictDailyHours: false as boolean,
        isWeekendWorkable: false as boolean,
        weekStartDay: 'monday',
      },
      updateGeneralSettings: (data: Partial<OrganizationSettings & GeneralSettings>) =>
        set((state: SettingsState) => ({
          organization: { ...state.organization, ...data },
          general: { ...state.general, ...data },
        })),
      setAllSettings: (data: { organization: OrganizationSettings; general: GeneralSettings }) =>
        set({ 
          organization: data.organization, 
          general: data.general 
        }),
    }),
    {
      name: 'caltims-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);