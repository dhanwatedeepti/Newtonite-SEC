import { apiClient } from './client';
import { DashboardMetrics } from '../types';

export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    return apiClient<DashboardMetrics>('/api/v1/dashboard/metrics');
  },
};
