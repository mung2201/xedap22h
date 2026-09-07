import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';

export interface AdminAccess {
  userId: string;
  role: string;
  permissions: string[];
}

export const adminService = {
  async accessCheck(): Promise<AdminAccess> {
    const response = await apiClient.get<ApiResponse<AdminAccess>>(
      '/admin/access-check',
    );
    return response.data.data;
  },
};
