import { apiClient, refreshAuthSession } from '../axios.client';
import type { AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../../types/api';
import type {
  AuthSession,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from '../../types/auth';

interface AuthRequestConfig extends AxiosRequestConfig {
  skipAuthRefresh?: boolean;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthSession> {
    const config: AuthRequestConfig = {
      skipAuthRefresh: true,
    };
    const response = await apiClient.post<ApiResponse<AuthSession>>(
      '/auth/register',
      payload,
      config,
    );
    return response.data.data;
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    const config: AuthRequestConfig = {
      skipAuthRefresh: true,
    };
    const response = await apiClient.post<ApiResponse<AuthSession>>(
      '/auth/login',
      payload,
      config,
    );
    return response.data.data;
  },

  refresh(): Promise<AuthSession> {
    return refreshAuthSession();
  },

  async logout(): Promise<void> {
    const config: AuthRequestConfig = {
      skipAuthRefresh: true,
    };
    await apiClient.post<ApiResponse<null>>('/auth/logout', {}, config);
  },

  async logoutAll(): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/auth/logout-all');
  },

  async forgotPassword(email: string): Promise<void> {
    const config: AuthRequestConfig = {
      skipAuthRefresh: true,
    };
    await apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email }, config);
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    const config: AuthRequestConfig = {
      skipAuthRefresh: true,
    };
    await apiClient.post<ApiResponse<null>>('/auth/reset-password', payload, config);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<AuthSession> {
    const response = await apiClient.post<ApiResponse<AuthSession>>(
      '/auth/change-password',
      payload,
    );
    return response.data.data;
  },
};
