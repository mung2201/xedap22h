import { apiClient } from '../axios.client';
import type { ApiResponse } from '../../types/api';
import type { CurrentUser } from '../../types/auth';
import type {
  AdminUserListResult,
  AdminUserQuery,
  UpdateUserPermissionsPayload,
  UpdateUserRolePayload,
  UpdateUserStatusPayload,
} from '../../types/admin';

const toUserListResult = (response: ApiResponse<CurrentUser[]>): AdminUserListResult => ({
  items: response.data,
  meta:
    response.meta ?? {
      page: 1,
      limit: response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
});

export const adminUserService = {
  async getList(query: AdminUserQuery = {}): Promise<AdminUserListResult> {
    const response = await apiClient.get<ApiResponse<CurrentUser[]>>('/admin/users', {
      params: query,
    });
    return toUserListResult(response.data);
  },

  async updateStatus(
    userId: string,
    payload: UpdateUserStatusPayload,
  ): Promise<CurrentUser> {
    const response = await apiClient.patch<ApiResponse<CurrentUser>>(
      `/admin/users/${userId}/status`,
      payload,
    );
    return response.data.data;
  },

  async updateRole(
    userId: string,
    payload: UpdateUserRolePayload,
  ): Promise<CurrentUser> {
    const response = await apiClient.patch<ApiResponse<CurrentUser>>(
      `/admin/users/${userId}/role`,
      payload,
    );
    return response.data.data;
  },

  async updatePermissions(
    userId: string,
    payload: UpdateUserPermissionsPayload,
  ): Promise<CurrentUser> {
    const response = await apiClient.patch<ApiResponse<CurrentUser>>(
      `/admin/users/${userId}/permissions`,
      payload,
    );
    return response.data.data;
  },
};
