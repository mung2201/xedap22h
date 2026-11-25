import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type { DashboardQuery, DashboardStatistics } from '../../types/admin';

export const statisticsService = {
  async getDashboard(
    query: DashboardQuery = {},
    signal?: AbortSignal,
  ): Promise<DashboardStatistics> {
    const response = await apiClient.get<ApiResponse<DashboardStatistics>>(
      '/admin/statistics/dashboard',
      { params: query, signal },
    );
    return response.data.data;
  },
};
