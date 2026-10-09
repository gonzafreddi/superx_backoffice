import { apiBaseUrl } from "./api-mode";
import { clearSession, getAccessToken, storeSession } from "./auth-api";
import { createAuthFetch } from "./http-core.js";

const apiRoot = () => (apiBaseUrl() ?? "").replace(/\/$/, "");

export const authFetch = createAuthFetch({
  fetchImpl: (...args) => fetch(...args),
  getSession: () => ({ accessToken: getAccessToken() }),
  setSession: ({ accessToken, user }) => storeSession(accessToken, user),
  clearSession,
  refreshUrl: () => `${apiRoot()}/api/auth/refresh`,
});
