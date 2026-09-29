import { authFetch } from "./http";

export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "CANCELLED" | "FAILED";
export type PushCampaign = { id: string; title: string; body: string; url: string; imageUrl: string | null; status: CampaignStatus; scheduledAt: string | null; sentAt: string | null; targeted: number; sent: number; failed: number; clicked: number; lastError: string | null; createdAt: string; updatedAt: string };
export type CampaignInput = { title: string; body: string; url: string; imageUrl: string | null; scheduledAt?: string };
export type AudienceSize = { users: number; devices: number; enabled: boolean; warning: string | null };
export type DeviceState = "on" | "off" | "denied" | "unsupported" | "unavailable";

const apiRoot = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL?.replace(/\/$/, "");
const json = { Accept: "application/json", "Content-Type": "application/json" };

async function call<T>(path: string, init: RequestInit = {}, fallback = "No pudimos completar la operación."): Promise<T> {
  const root = apiRoot(); if (!root) throw new Error("El backoffice no está conectado al servidor.");
  const response = await authFetch(`${root}${path}`, { ...init, headers: { ...json, ...(init.headers ?? {}) } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" ? (payload as { message?: unknown }).message : undefined;
    throw new Error(typeof message === "string" ? message : Array.isArray(message) ? message.join(" ") : fallback);
  }
  return payload as T;
}

export const campaignApi = {
  list: (status?: CampaignStatus | "", page = 1) => call<{ items: PushCampaign[]; total: number; page: number; pageSize: number }>(`/push/campaigns?${new URLSearchParams({ page: String(page), pageSize: "20", ...(status ? { status } : {}) })}`, {}, "No pudimos cargar las campañas."),
  audience: () => call<AudienceSize>("/push/campaigns/audience-size"),
  create: (input: CampaignInput) => call<PushCampaign>("/push/campaigns", { method: "POST", body: JSON.stringify(input) }, "No pudimos guardar la campaña."),
  update: (id: string, input: Omit<CampaignInput, "scheduledAt">) => call<PushCampaign>(`/push/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(input) }, "No pudimos guardar la campaña."),
  schedule: (id: string, scheduledAt: string) => call<PushCampaign>(`/push/campaigns/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt }) }, "No pudimos programar la campaña."),
  sendNow: (id: string) => call<PushCampaign>(`/push/campaigns/${id}/send-now`, { method: "POST" }, "No pudimos enviar la campaña."),
  cancel: (id: string) => call<PushCampaign>(`/push/campaigns/${id}/cancel`, { method: "POST" }, "No pudimos cancelar la campaña."),
  test: (id: string) => call<{ devices: number; sent: number }>(`/push/campaigns/${id}/test`, { method: "POST" }, "No pudimos enviar la prueba."),
};

// --- This device (staff alerts) ---------------------------------------------

let configPromise: Promise<{ enabled: boolean; publicKey: string | null }> | null = null;
function pushConfig() {
  const root = apiRoot(); if (!root) return Promise.resolve({ enabled: false, publicKey: null });
  configPromise ??= fetch(`${root}/push/config`).then((response) => response.ok ? response.json() as Promise<{ enabled: boolean; publicKey: string | null }> : { enabled: false, publicKey: null }).catch(() => { configPromise = null; return { enabled: false, publicKey: null }; });
  return configPromise;
}
const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const raw = atob(`${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length)); for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index); return bytes;
}
async function worker() { if (!(await navigator.serviceWorker.getRegistration("/"))) await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }); return navigator.serviceWorker.ready; }

export async function deviceState(): Promise<DeviceState> {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const config = await pushConfig(); if (!config.enabled) return "unavailable";
  if (Notification.permission !== "granted") return "off";
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ? "on" : "off";
}

/** iPhone/iPad only allow push from the installed (home screen) app. */
export function iosNeedsInstall(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !standalone;
}
export function preloadPushConfig(): void { void pushConfig(); }

/**
 * Must run directly from a click: iOS only shows the permission prompt when it is requested
 * synchronously inside the gesture, so the request goes out before any await.
 */
export async function enableDevice(): Promise<DeviceState> {
  if (!supported()) return "unsupported";
  const permissionRequest = Notification.permission === "granted" ? Promise.resolve<NotificationPermission>("granted") : Notification.requestPermission();
  const [permission, config] = await Promise.all([permissionRequest, pushConfig()]);
  if (!config.enabled || !config.publicKey) return "unavailable";
  if (permission !== "granted") return "denied";
  let subscription: PushSubscription;
  try {
    const registration = await worker();
    const options = { userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) };
    const existing = await registration.pushManager.getSubscription();
    if (existing) subscription = existing;
    else {
      try { subscription = await registration.pushManager.subscribe(options); }
      catch (cause) { const stale = await registration.pushManager.getSubscription(); if (!stale) throw cause; await stale.unsubscribe(); subscription = await registration.pushManager.subscribe(options); }
    }
  } catch (cause) {
    const detail = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
    throw new Error(`Este navegador no pudo registrarse para recibir avisos (${detail.slice(0, 140)}).`);
  }
  await call("/push/subscriptions", { method: "POST", body: JSON.stringify({ app: "backoffice", subscription: subscription.toJSON() }) }, "No pudimos activar los avisos.");
  return "on";
}

/** Re-registers silently when permission is already granted (new login, rotated subscription). */
export async function syncDevice(): Promise<void> {
  if ((await deviceState()) !== "on" && !(supported() && Notification.permission === "granted")) return;
  await enableDevice().catch(() => undefined);
}

/** Called on logout so a shared device stops receiving this user's alerts. */
export async function forgetDevice(): Promise<void> {
  if (!supported()) return;
  const subscription = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
  if (!subscription) return;
  await call("/push/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => false);
}
