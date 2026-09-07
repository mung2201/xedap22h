import { create } from 'zustand';
import { authService } from '../api/services/auth.service';
import { clearAccessToken, setAccessToken } from '../api/token.store';
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
  clearSession: () => void;
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
  setUser: (user: CurrentUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setSession: (session) => {
    setAccessToken(session.accessToken);
    set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
  },

  clearSession: () => {
    clearAccessToken();
    set({ user: null, isAuthenticated: false, isBootstrapping: false });
  },

  bootstrap: async () => {
    try {
      const session = await authService.refresh();
      setAccessToken(session.accessToken);
      set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
    } catch {
      clearAccessToken();
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
    }
  },

  login: async (payload) => {
    const session = await authService.login(payload);
    setAccessToken(session.accessToken);
    set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
    return session;
  },

  register: async (payload) => {
    const session = await authService.register(payload);
    setAccessToken(session.accessToken);
    set({ user: session.user, isAuthenticated: true, isBootstrapping: false });
    return session;
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      clearAccessToken();
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
    }
  },

  setUser: (user) => set({ user }),
}));
