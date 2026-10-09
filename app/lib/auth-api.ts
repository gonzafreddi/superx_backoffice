import { apiBaseUrl, fixturesEnabled } from "./api-mode";
export type AdminUser = { id: string; email: string; role: string; name: string | null };
export type ManagedUser = AdminUser & { phone: string | null; isActive: boolean; createdAt: string };
import { userOperationError } from "./user-rules";
export type UserRole = "customer" | "admin" | "picker" | "driver" | "warehouse";

import { authFetch } from "./http";

export class AuthApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

const TOKEN_KEY = "superx.access-token";
const USER_KEY = "superx.access-user";
const BACKOFFICE_ROLES = new Set(["admin", "picker", "driver", "warehouse"]);

function persist(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* Storage is optional. */
  }
}

function removePersisted(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  } catch {
    /* Storage is optional. */
  }
}

function baseUrl(): string | undefined {
  return apiBaseUrl();
}

export function getAccessToken(): string | null {
  try { return window.sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

/** @deprecated Refresh credentials are stored only in an HttpOnly cookie. */
export function getRefreshToken(): string | null {
  return null;
}

export function getStoredUser(): AdminUser | null {
  try {
    const raw = window.sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  removePersisted(TOKEN_KEY);
  removePersisted("superx.refresh-token");
  removePersisted(USER_KEY);
}

export function storeSession(accessToken: string, rawUser?: unknown): void {
  persist(TOKEN_KEY, accessToken);
  if (rawUser && typeof rawUser === "object") persist(USER_KEY, JSON.stringify(rawUser));
}

/** Validates the browser session and role against the backend before rendering protected pages. */
export async function validateBackofficeSession(signal?: AbortSignal): Promise<AdminUser | null> {
  const url = baseUrl();
  if (fixturesEnabled()) return getStoredUser() ?? { id: "fixture-admin", email: "admin@fixture.local", role: "admin", name: "Administración" };
  const response = await authFetch(`${url!.replace(/\/$/, "")}/api/auth/me`, {
    headers: { Accept: "application/json" }, signal,
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  const payload: unknown = await response.json().catch(() => undefined);
  if (!payload || typeof payload !== "object") {
    clearSession();
    return null;
  }
  const raw = payload as { id?: unknown; email?: unknown; role?: unknown; name?: unknown };
  if (typeof raw.id !== "string" || typeof raw.email !== "string" || typeof raw.role !== "string" || !BACKOFFICE_ROLES.has(raw.role)) {
    clearSession();
    return null;
  }
  const user: AdminUser = { id: raw.id, email: raw.email, role: raw.role, name: typeof raw.name === "string" ? raw.name : null };
  persist(USER_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  const url = baseUrl();
  if (url) {
    void fetch(`${url!.replace(/\/$/, "")}/api/auth/logout`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    }).catch(() => undefined);
  }
  clearSession();
}

type RawLoginResponse = { user?: { id?: unknown; email?: unknown; role?: unknown; name?: unknown }; accessToken?: unknown; refreshToken?: unknown };
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
  if (fixturesEnabled()) {
    const user: AdminUser = { id: "fixture-admin", email, role: "admin", name: "Administración (fixture)" };
    persist(TOKEN_KEY, "fixture-token");
    persist(USER_KEY, JSON.stringify(user));
    return user;
  }
  const response = await fetch(`${url!.replace(/\/$/, "")}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    signal, credentials: "include",
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.status === 403) throw new AuthApiError("Tu cuenta está desactivada. Comunicate con Administración para recuperar el acceso.", 403);
  if (response.status === 401) throw new AuthApiError("Email o contraseña incorrectos.", 401);
  if (!response.ok) throw new AuthApiError("No pudimos iniciar sesión. Intentá nuevamente.", response.status);
  if (!isRawLoginResponse(payload)) throw new AuthApiError("La respuesta de acceso no tiene el formato esperado.", response.status);
  const user: AdminUser = {
    id: String(payload.user.id),
    email: String(payload.user.email ?? email),
    role: String(payload.user.role ?? "customer"),
    name: typeof payload.user.name === "string" ? payload.user.name : null,
  };
  if (!BACKOFFICE_ROLES.has(user.role)) {
    clearSession();
    throw new AuthApiError("Tu cuenta no tiene acceso al backoffice.", 403);
  }
  storeSession(payload.accessToken, user);
  return user;
}

function authMessage(payload: unknown): string {
  const message = payload && typeof payload === "object" ? (payload as { message?: unknown }).message : undefined;
  return typeof message === "string" ? message : Array.isArray(message) ? message.filter((part): part is string => typeof part === "string").join(" ") : "No pudimos completar la operación.";
}

export async function listUsers(filters: { q?: string; role?: UserRole | ""; status?: "active" | "inactive" | ""; page?: number; pageSize?: number } = {}): Promise<{ items: ManagedUser[]; total: number; page: number; pageSize: number }> {
  if (fixturesEnabled()) return { items: [{ id: "fixture-admin", email: "admin@superx.local", name: "Administración", role: "admin", phone: null, isActive: true, createdAt: new Date().toISOString() }, { id: "fixture-warehouse", email: "deposito@superx.local", name: "Equipo Depósito", role: "warehouse", phone: null, isActive: true, createdAt: new Date().toISOString() }], total: 2, page: 1, pageSize: 20 };
  const params = new URLSearchParams({ page: String(filters.page ?? 1), pageSize: String(filters.pageSize ?? 50) });
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q); if (filters.role) params.set("role", filters.role);
  const response = await authFetch(`${baseUrl()!.replace(/\/$/, "")}/api/auth/users?${params}`, { headers: { Accept: "application/json" } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new AuthApiError(response.status === 403 ? "No tenés permiso para gestionar usuarios." : authMessage(payload), response.status);
  return payload as { items: ManagedUser[]; total: number; page: number; pageSize: number };
}

export async function updateUserRole(id: string, role: UserRole): Promise<ManagedUser> {
  if (fixturesEnabled()) return { id, email: id === "fixture-admin" ? "admin@superx.local" : "deposito@superx.local", name: null, role, phone: null, isActive: true, createdAt: new Date().toISOString() };
  const response = await authFetch(`${baseUrl()!.replace(/\/$/, "")}/api/auth/users/${encodeURIComponent(id)}/role`, { method: "PATCH", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new AuthApiError(userOperationError(response.status, "role"), response.status);
  return payload as ManagedUser;
}

export type CreateUserInput = { email: string; password: string; name?: string; phone?: string; role: UserRole };

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const url = baseUrl();
  if (fixturesEnabled()) return { id: crypto.randomUUID(), email: input.email, name: input.name ?? null, role: input.role, phone: input.phone ?? null, isActive: true, createdAt: new Date().toISOString() };
  const response = await authFetch(`${url!.replace(/\/$/, "")}/api/auth/users`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new AuthApiError(response.status === 409 ? "Ya existe un usuario con ese email." : authMessage(payload), response.status);
  return payload as ManagedUser;
}

export type UpdateUserInput = { email?: string; name?: string | null; phone?: string | null };
async function manageUser(id: string, path: string, method: string, input: object, operation: string): Promise<ManagedUser | undefined> {
  if (!baseUrl()) throw new AuthApiError("Configurá la API para gestionar usuarios.");
  const response = await authFetch(`${baseUrl()!.replace(/\/$/, "")}/api/auth/users/${encodeURIComponent(id)}${path}`, {
    method, headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  if (!response.ok) throw new AuthApiError(userOperationError(response.status, operation), response.status);
  if (response.status === 204) return;
  return await response.json() as ManagedUser;
}
export async function updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
  return (await manageUser(id, "", "PATCH", input, "edit"))!;
}
export async function updateUserStatus(id: string, active: boolean): Promise<ManagedUser> {
  return (await manageUser(id, "/status", "PATCH", { active }, "status"))!;
}
export async function resetUserPassword(id: string, password: string): Promise<void> {
  await manageUser(id, "/password", "POST", { password }, "password");
}
