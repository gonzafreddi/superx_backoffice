export type AdminUser = { id: string; email: string; role: string; name: string | null };

export class AuthApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

const TOKEN_KEY = "superx.access-token";
const USER_KEY = "superx.access-user";

function baseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
}

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AdminUser | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* storage is optional */
  }
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type RawLoginResponse = { user?: { id?: unknown; email?: unknown; role?: unknown; name?: unknown }; accessToken?: unknown };
type ValidRawLoginResponse = { user: { id: string; email?: unknown; role?: unknown; name?: unknown }; accessToken: string };

function isRawLoginResponse(value: unknown): value is ValidRawLoginResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as RawLoginResponse;
  return typeof body.user?.id === "string" && typeof body.accessToken === "string";
}

/**
 * Backoffice login against the real backend (`POST /api/auth/login`) — a
 * plain email/password bearer login, same mechanism as the client PWA.
 * Any registered role can log in; write actions the account isn't allowed
 * to perform still get rejected by the backend's own RBAC (401/403), the
 * backoffice UI does not duplicate that decision.
 */
export async function login(email: string, password: string, signal?: AbortSignal): Promise<AdminUser> {
  const url = baseUrl();
  if (!url) {
    const user: AdminUser = { id: "fixture-admin", email, role: "admin", name: "Administración (fixture)" };
    try {
      window.localStorage.setItem(TOKEN_KEY, "fixture-token");
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* storage is optional */ }
    return user;
  }
  const response = await fetch(`${url.replace(/\/$/, "")}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    signal,
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) throw new AuthApiError("Email o contraseña incorrectos.", 401);
  if (!response.ok) throw new AuthApiError("No pudimos iniciar sesión. Intentá nuevamente.", response.status);
  if (!isRawLoginResponse(payload)) throw new AuthApiError("La respuesta de acceso no tiene el formato esperado.", response.status);
  const user: AdminUser = {
    id: String(payload.user.id),
    email: String(payload.user.email ?? email),
    role: String(payload.user.role ?? "customer"),
    name: typeof payload.user.name === "string" ? payload.user.name : null,
  };
  try {
    window.localStorage.setItem(TOKEN_KEY, payload.accessToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* storage is optional */ }
  return user;
}
