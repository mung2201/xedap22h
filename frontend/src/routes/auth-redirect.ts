const authPaths = new Set([
  '/login', '/register', '/forgot-password', '/reset-password', '/admin/login',
]);

/** Only resume internal pages; returning to an auth page would loop its guard. */
export const getAuthRedirectPath = (state: unknown, fallback: string): string => {
  if (!state || typeof state !== 'object' || !('from' in state)) return fallback;
  const destination = state.from;
  if (
    typeof destination !== 'string'
    || !destination.startsWith('/')
    || destination.startsWith('//')
    || destination.includes('\\')
    || [...destination].some((character) => character.charCodeAt(0) <= 32)
  ) return fallback;

  try {
    const url = new URL(destination, 'https://xedap22h.local');
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase() || '/';
    if (url.origin !== 'https://xedap22h.local' || authPaths.has(pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};
