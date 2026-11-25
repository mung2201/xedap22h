import { create } from 'zustand';
import { authService } from '../api/services/auth.service';
import { getAuthSessionGeneration, invalidateAuthSession, setAccessToken } from '../api/token.store';
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
} from '../types/auth';
import type { CurrentUser } from '../types/auth';

interface AuthState {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setSession: (session: AuthSession) => void;
  acceptRefreshedSession: (session: AuthSession, generation: number) => void;
  clearSession: () => void;
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
  setUser: (user: CurrentUser) => void;
}

let activeLogout: { generation: number; promise: Promise<void> } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setSession: (session) => {
    invalidateAuthSession();
    setAccessToken(session.accessToken);
    set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
  },

  acceptRefreshedSession: (session, generation) => {
    if (generation !== getAuthSessionGeneration()) return;
    setAccessToken(session.accessToken);
    set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
  },

  clearSession: () => {
    invalidateAuthSession();
    set({ user: null, isAuthenticated: false, isBootstrapping: false });
  },

  bootstrap: async () => {
    const generation = getAuthSessionGeneration();
    try {
      const session = await authService.refresh();
      get().acceptRefreshedSession(session, generation);
    } catch {
      if (generation === getAuthSessionGeneration()) get().clearSession();
    }
  },

  login: async (payload) => {
    const generation = invalidateAuthSession();
    set({ user: null, isAuthenticated: false, isBootstrapping: false });
    const session = await authService.login(payload);
    if (generation !== getAuthSessionGeneration()) {
      throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
    }
    get().acceptRefreshedSession(session, generation);
    return session;
  },

  register: async (payload) => {
    const generation = invalidateAuthSession();
    set({ user: null, isAuthenticated: false, isBootstrapping: false });
    const session = await authService.register(payload);
    if (generation !== getAuthSessionGeneration()) {
      throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
    }
    get().acceptRefreshedSession(session, generation);
    return session;
  },

  logout: async () => {
    if (activeLogout?.generation === getAuthSessionGeneration()) return activeLogout.promise;
    const generation = invalidateAuthSession();
    set({ user: null, isAuthenticated: false, isBootstrapping: false });
    const promise = authService.logout().finally(() => {
      if (activeLogout?.promise === promise) activeLogout = null;
    });
    activeLogout = { generation, promise };
    await promise;
  },

  setUser: (user) => set({ user }),
}));
