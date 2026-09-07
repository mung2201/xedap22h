import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './router';
import { useAuthStore } from '../stores/auth.store';
import type { AuthSession } from '../types/auth';

const AuthBootstrap = (): null => {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    void bootstrap();

    const onSessionRefreshed = (event: Event): void => {
      const session = (event as CustomEvent<AuthSession>).detail;
      if (session) {
        setSession(session);
      }
    };
    const onSessionExpired = (): void => clearSession();

    window.addEventListener('auth:session-refreshed', onSessionRefreshed);
    window.addEventListener('auth:session-expired', onSessionExpired);

    return () => {
      window.removeEventListener('auth:session-refreshed', onSessionRefreshed);
      window.removeEventListener('auth:session-expired', onSessionExpired);
    };
  }, [bootstrap, clearSession, setSession]);

  return null;
};

export const App = () => (
  <>
    <AuthBootstrap />
    <RouterProvider router={router} />
  </>
);
