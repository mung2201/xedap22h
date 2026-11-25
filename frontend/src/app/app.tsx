import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './router';
import { useAuthStore } from '../stores/auth.store';
import type { AuthSession } from '../types/auth';

const AuthBootstrap = (): null => {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const acceptRefreshedSession = useAuthStore((state) => state.acceptRefreshedSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    void bootstrap();

    const onSessionRefreshed = (event: Event): void => {
      const { session, generation } = (event as CustomEvent<{ session: AuthSession; generation: number }>).detail;
      if (session) {
        acceptRefreshedSession(session, generation);
      }
    };
    const onSessionExpired = (): void => clearSession();

    window.addEventListener('auth:session-refreshed', onSessionRefreshed);
    window.addEventListener('auth:session-expired', onSessionExpired);

    return () => {
      window.removeEventListener('auth:session-refreshed', onSessionRefreshed);
      window.removeEventListener('auth:session-expired', onSessionExpired);
    };
  }, [bootstrap, clearSession, acceptRefreshedSession]);

  return null;
};

export const App = () => (
  <>
    <AuthBootstrap />
    <RouterProvider router={router} />
  </>
);
