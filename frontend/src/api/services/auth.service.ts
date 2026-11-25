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

let pendingLogout: Promise<void> | null = null;

// Cookie changes are applied by the browser before response interceptors run.
// Finish clearing the old cookie before requesting a new login/registration.
const waitForLogout = async (): Promise<void> => {
  if (pendingLogout) await pendingLogout.catch(() => undefined);
};

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthSession> {
    await waitForLogout();
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
    await waitForLogout();
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
    if (pendingLogout) return pendingLogout;
    const config: AuthRequestConfig = {
      skipAuthRefresh: true,
      timeout: 15_000,
    };
    const request = apiClient.post<ApiResponse<null>>('/auth/logout', {}, config)
      .then(() => undefined)
      .finally(() => {
        if (pendingLogout === request) pendingLogout = null;
      });
    pendingLogout = request;
    await request;
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
