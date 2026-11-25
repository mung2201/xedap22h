import axios, {
  AxiosError,
  AxiosHeaders,
  CanceledError,
} from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse, ApiResponse } from '../types/api';
import type { AuthSession } from '../types/auth';
import { clearAccessToken, getAccessToken, getAuthSessionGeneration, onAuthSessionInvalidated, setAccessToken } from './token.store';

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
  _authSessionGeneration?: number;
}

let activeRefresh: { generation: number; promise: Promise<AuthSession>; controller: AbortController } | null = null;

onAuthSessionInvalidated(() => {
  const previous = activeRefresh;
  activeRefresh = null;
  // Stop a delayed response from replacing the browser's refresh cookie after logout.
  previous?.controller.abort();
});

const dispatchAuthEvent = (eventName: string, detail?: { session: AuthSession; generation: number }): void => {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const refreshAuthSession = async (): Promise<AuthSession> => {
  const generation = getAuthSessionGeneration();
  if (!activeRefresh || activeRefresh.generation !== generation) {
    const controller = new AbortController();
    const promise = refreshClient
      .post<ApiResponse<AuthSession>>('/auth/refresh-token', undefined, { signal: controller.signal })
      .then((response) => {
        if (generation !== getAuthSessionGeneration()) {
          throw new CanceledError('Phiên đăng nhập đã thay đổi.');
        }
        const session = response.data.data;
        setAccessToken(session.accessToken);
        dispatchAuthEvent('auth:session-refreshed', { session, generation });
        return session;
      })
      .catch((error: unknown) => {
        if (generation === getAuthSessionGeneration()) {
          clearAccessToken();
          dispatchAuthEvent('auth:session-expired');
        }
        throw error;
      })
      .finally(() => {
        if (activeRefresh?.promise === promise) activeRefresh = null;
      });
    activeRefresh = { generation, promise, controller };
  }

  return activeRefresh.promise;
};

apiClient.interceptors.request.use((config) => {
  const request = config as RetriableRequestConfig;
  const generation = getAuthSessionGeneration();
  if (request._authSessionGeneration !== undefined && request._authSessionGeneration !== generation) {
    throw new CanceledError('Phiên đăng nhập đã thay đổi.');
  }
  request._authSessionGeneration = generation;
  const token = getAccessToken();
  const headers = AxiosHeaders.from(config.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }
  config.headers = headers;

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const request = response.config as RetriableRequestConfig;
    const belongsToSession = request.headers.has('Authorization') || request.method !== 'get';
    if (belongsToSession && request._authSessionGeneration !== getAuthSessionGeneration()) {
      throw new CanceledError('Phiên đăng nhập đã thay đổi.');
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      originalRequest._authSessionGeneration === getAuthSessionGeneration() &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest.url?.includes('/auth/refresh-token');

    if (!shouldRefresh || !originalRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const session = await refreshAuthSession();
      if (originalRequest._authSessionGeneration !== getAuthSessionGeneration()) {
        return Promise.reject(error);
      }
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set('Authorization', `Bearer ${session.accessToken}`);
      originalRequest.headers = headers;

      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  },
);
