import { clearSession, getAccessToken, getRefreshToken, storeSession } from "./auth-api";
import { createAuthFetch } from "./http-core.js";

const apiRoot = () => (process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL ?? "").replace(/\/$/, "");

export const authFetch = createAuthFetch({
  fetchImpl: (...args) => fetch(...args),
  getSession: () => ({ accessToken: getAccessToken(), refreshToken: getRefreshToken() }),
  setSession: ({ accessToken, refreshToken, user }) => storeSession(accessToken, refreshToken, user),
  clearSession,
  refreshUrl: () => `${apiRoot()}/api/auth/refresh`,
});
