import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type { CurrentUser, UpdateProfilePayload } from '../../types/auth';

export const userService = {
  async getMe(): Promise<CurrentUser> {
    const response = await apiClient.get<ApiResponse<CurrentUser>>('/users/me');
    return response.data.data;
  },

  async updateMe(payload: UpdateProfilePayload): Promise<CurrentUser> {
    const response = await apiClient.patch<ApiResponse<CurrentUser>>(
      '/users/me',
      payload,
    );
    return response.data.data;
  },
};
