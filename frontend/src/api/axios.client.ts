import axios, {
  AxiosError,
  AxiosHeaders,
} from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse, ApiResponse } from '../types/api';
import type { AuthSession } from '../types/auth';
import { clearAccessToken, getAccessToken, setAccessToken } from './token.store';

const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<AuthSession> | null = null;

const dispatchAuthEvent = (eventName: string, detail?: AuthSession): void => {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const refreshAuthSession = async (): Promise<AuthSession> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiResponse<AuthSession>>('/auth/refresh-token', undefined)
      .then((response) => {
        const session = response.data.data;
        setAccessToken(session.accessToken);
        dispatchAuthEvent('auth:session-refreshed', session);
        return session;
      })
      .catch((error: unknown) => {
        clearAccessToken();
        dispatchAuthEvent('auth:session-expired');
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest.url?.includes('/auth/refresh-token');

    if (!shouldRefresh || !originalRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const session = await refreshAuthSession();
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set('Authorization', `Bearer ${session.accessToken}`);
      originalRequest.headers = headers;

      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
