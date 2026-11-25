let accessToken: string | null = null;
let authSessionGeneration = 0;
const invalidationListeners = new Set<() => void>();

export const onAuthSessionInvalidated = (listener: () => void): (() => void) => {
  invalidationListeners.add(listener);
  return () => { invalidationListeners.delete(listener); };
};

export const getAuthSessionGeneration = (): number => authSessionGeneration;

/** End outstanding work for the previous login without invalidating token refreshes. */
export const invalidateAuthSession = (): number => {
  authSessionGeneration += 1;
  accessToken = null;
  invalidationListeners.forEach((listener) => listener());
  return authSessionGeneration;
};

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string): void => {
  accessToken = token;
};

export const clearAccessToken = (): void => {
  accessToken = null;
};
