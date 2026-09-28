export type AuthSession = { accessToken: string | null };
export function createAuthFetch(options: {
  fetchImpl: typeof fetch;
  getSession: () => AuthSession;
  setSession: (payload: { accessToken: string; user?: unknown }) => void;
  clearSession: () => void;
  refreshUrl: () => string;
}): typeof fetch;
