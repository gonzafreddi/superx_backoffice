export type AuthSession = { accessToken: string | null; refreshToken: string | null };
export function createAuthFetch(options: {
  fetchImpl: typeof fetch;
  getSession: () => AuthSession;
  setSession: (payload: { accessToken: string; refreshToken: string; user?: unknown }) => void;
  clearSession: () => void;
  refreshUrl: () => string;
}): typeof fetch;
