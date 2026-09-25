import { authFetch } from "@/app/lib/http";
import type { DeliveryApi, DeliveryWindow, DeliveryZone, WindowInput, ZoneUpdateInput } from "./delivery-contract";
import { validateWindowInput, validateZoneInput } from "./delivery-rules";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Math.random()).slice(2));
const change = (id: string, summary: string, actor: string, changedAt: string, role?: DeliveryZone["history"][number]["role"]) => ({ id, summary, actor, changedAt, ...(role ? { role } : {}) });

let zones: DeliveryZone[] = [
  { id: "zone-caballito", name: "Caballito", cityName: "CABA", postalCodes: ["1405", "1406", "1424"], neighborhoods: ["Caballito", "Primera Junta"], deliveryFee: 900, freeDeliveryThreshold: 18000, priority: 10, active: true, updatedAt: "2026-09-01T12:00:00.000Z", history: [change("dc-1", "Zona creada · envío $900 · gratis desde $18.000", "Administración", "2026-09-01T12:00:00.000Z", "admin")] },
  { id: "zone-belgrano", name: "Belgrano", cityName: "CABA", postalCodes: ["1426", "1428"], neighborhoods: ["Belgrano", "Colegiales"], deliveryFee: 1200, freeDeliveryThreshold: 22000, priority: 20, active: true, updatedAt: "2026-09-02T09:30:00.000Z", history: [change("dc-2", "Zona creada · envío $1.200 · gratis desde $22.000", "Administración", "2026-09-02T09:30:00.000Z", "admin")] },
  { id: "zone-lanus", name: "Lanús Centro", cityName: "Lanús", postalCodes: ["1824"], neighborhoods: [], deliveryFee: 1500, freeDeliveryThreshold: null, priority: 5, active: false, updatedAt: "2026-09-03T16:00:00.000Z", history: [change("dc-3", "Zona creada · envío $1.500 · sin envío gratis", "Administración", "2026-09-03T16:00:00.000Z", "admin"), change("dc-3b", "Zona desactivada mientras se ajusta la logística", "Administración", "2026-09-03T16:05:00.000Z", "admin")] },
];

let windows: DeliveryWindow[] = [
  { id: "window-morning", startTime: "10:00", endTime: "12:00", weekdays: [1, 2, 3, 4, 5, 6], active: true },
  { id: "window-afternoon", startTime: "16:00", endTime: "18:00", weekdays: [1, 2, 3, 4, 5], active: true },
];

const cloneZone = (zone: DeliveryZone): DeliveryZone => ({ ...zone, postalCodes: [...zone.postalCodes], neighborhoods: [...zone.neighborhoods], history: zone.history.map((entry) => ({ ...entry })) });
const cloneWindow = (window: DeliveryWindow): DeliveryWindow => ({ ...window, weekdays: [...window.weekdays] });
const byStart = (a: DeliveryWindow, b: DeliveryWindow) => a.startTime.localeCompare(b.startTime);

function assertValid(errors: object) {
  const message = Object.values(errors)[0] as string | undefined;
  if (message) throw new Error(message);
}

function baseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; }

type RawCity = { id: string; name: string };
type RawZone = { id: string; cityId: string; name: string; postalCodes: string[]; neighborhoods: string[]; deliveryFee: string; freeDeliveryThreshold: string | null; priority: number; isActive: boolean };
type RawWindow = { id: string; startTime: string; endTime: string; weekdays: number[]; isActive: boolean };

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
    throw new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta de administración." : message);
  }
  return payload;
}

async function listCities(root: string): Promise<RawCity[]> {
  const payload = await fetchJson(`${root}/cities`);
  return Array.isArray(payload) ? (payload as RawCity[]) : [];
}

async function resolveCityId(root: string, cityName: string): Promise<string> {
  const cities = await listCities(root);
  const match = cities.find((city) => city.name.trim().toLocaleLowerCase("es-AR") === cityName.trim().toLocaleLowerCase("es-AR"));
  if (!match) throw new Error(`No encontramos la ciudad "${cityName}". Usá el nombre exacto de una ciudad ya cargada (ej.: "Salto").`);
  return match.id;
}

/** DeliveryZone has no audit-log endpoint on the backend — history is always empty for real data, unlike price/inventory where a synthetic single entry could be derived from real fields. */
function adaptZone(raw: RawZone, cityName: string): DeliveryZone {
  return {
    id: raw.id,
    name: raw.name,
    cityName,
    postalCodes: raw.postalCodes,
    neighborhoods: raw.neighborhoods,
    deliveryFee: Number(raw.deliveryFee),
    freeDeliveryThreshold: raw.freeDeliveryThreshold === null ? null : Number(raw.freeDeliveryThreshold),
    priority: raw.priority,
    active: raw.isActive,
    updatedAt: new Date().toISOString(),
    history: [],
  };
}

function adaptWindow(raw: RawWindow): DeliveryWindow {
  // Postgres returns "HH:MM:SS"; the UI works in minutes.
  return { id: String(raw.id), startTime: raw.startTime.slice(0, 5), endTime: raw.endTime.slice(0, 5), weekdays: [...raw.weekdays].sort((a, b) => a - b), active: raw.isActive };
}

export const deliveryApi: DeliveryApi = {
  async listZones() {
    const url = baseUrl();
    if (!url) { await wait(); return [...zones].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "es-AR")).map(cloneZone); }
    const root = url.replace(/\/$/, "");
    const [zonesPayload, cities] = await Promise.all([fetchJson(`${root}/delivery-zones?includeInactive=true`), listCities(root)]);
    const cityById = new Map(cities.map((city) => [city.id, city.name]));
    const list = Array.isArray(zonesPayload) ? (zonesPayload as RawZone[]) : [];
    return list.map((raw) => adaptZone(raw, cityById.get(raw.cityId) ?? "Ciudad desconocida")).sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "es-AR"));
  },
  async createZone(input: ZoneUpdateInput) {
    const url = baseUrl();
    if (!url) {
      await wait();
      assertValid(validateZoneInput(input));
      const now = new Date().toISOString();
      const { buildDeliveryChangeEvent } = await import("./delivery-rules");
      const zone: DeliveryZone = { id: `zone-${uid()}`, name: input.name.trim(), cityName: input.cityName.trim(), postalCodes: input.postalCodes.map((code) => code.trim()).filter(Boolean), neighborhoods: input.neighborhoods.map((name) => name.trim()).filter(Boolean), deliveryFee: Number(input.deliveryFee), freeDeliveryThreshold: input.freeDeliveryThreshold === "" || input.freeDeliveryThreshold === null ? null : Number(input.freeDeliveryThreshold), priority: Number(input.priority), active: input.active, updatedAt: now, history: [buildDeliveryChangeEvent(`Zona creada por ${input.changedBy}`, input.changedBy, input.changedByRole, now, `dc-${uid()}`)] };
      zones = [...zones, zone];
      return cloneZone(zone);
    }
    assertValid(validateZoneInput(input));
    const root = url.replace(/\/$/, "");
    const cityId = await resolveCityId(root, input.cityName);
    const payload = await fetchJson(`${root}/delivery-zones`, {
      method: "POST",
      body: JSON.stringify({ cityId: Number(cityId), name: input.name.trim(), postalCodes: input.postalCodes.map((code) => code.trim()).filter(Boolean), neighborhoods: input.neighborhoods.map((name) => name.trim()).filter(Boolean), deliveryFee: Number(input.deliveryFee).toFixed(2), freeDeliveryThreshold: input.freeDeliveryThreshold === "" || input.freeDeliveryThreshold === null ? undefined : Number(input.freeDeliveryThreshold).toFixed(2), priority: Number(input.priority) }),
    });
    return adaptZone(payload as RawZone, input.cityName.trim());
  },
  async updateZone(id: string, input: ZoneUpdateInput) {
    const url = baseUrl();
    if (!url) {
      await wait();
      const zone = zones.find((candidate) => candidate.id === id);
      if (!zone) throw new Error("La zona ya no existe. Actualizá el listado.");
      assertValid(validateZoneInput(input));
      const now = new Date().toISOString();
      const { buildDeliveryChangeEvent } = await import("./delivery-rules");
      const threshold = input.freeDeliveryThreshold === "" || input.freeDeliveryThreshold === null ? null : Number(input.freeDeliveryThreshold);
      const summary = `${input.changedBy} actualizó envío $${Number(input.deliveryFee).toLocaleString("es-AR")}${threshold ? ` · gratis desde $${threshold.toLocaleString("es-AR")}` : " · sin envío gratis"}${input.active ? "" : " · zona inactiva"}${input.reason ? ` — ${input.reason}` : ""}`;
      const updated: DeliveryZone = { ...zone, name: input.name.trim(), cityName: input.cityName.trim(), postalCodes: input.postalCodes.map((c) => c.trim()).filter(Boolean), neighborhoods: input.neighborhoods.map((n) => n.trim()).filter(Boolean), deliveryFee: Number(input.deliveryFee), freeDeliveryThreshold: threshold, priority: Number(input.priority), active: input.active, updatedAt: now, history: [...zone.history, buildDeliveryChangeEvent(summary, input.changedBy, input.changedByRole, now, `dc-${uid()}`)] };
      zones = zones.map((candidate) => (candidate.id === id ? updated : candidate));
      return cloneZone(updated);
    }
    assertValid(validateZoneInput(input));
    const root = url.replace(/\/$/, "");
    // UpdateDeliveryZoneDto has no cityId field — a zone's city can't change
    // after creation. Still resolve it so a typo surfaces the same clear
    // error as createZone, instead of silently succeeding with a stale name.
    await resolveCityId(root, input.cityName);
    const payload = await fetchJson(`${root}/delivery-zones/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name: input.name.trim(), postalCodes: input.postalCodes.map((code) => code.trim()).filter(Boolean), neighborhoods: input.neighborhoods.map((name) => name.trim()).filter(Boolean), deliveryFee: Number(input.deliveryFee).toFixed(2), freeDeliveryThreshold: input.freeDeliveryThreshold === "" || input.freeDeliveryThreshold === null ? undefined : Number(input.freeDeliveryThreshold).toFixed(2), priority: Number(input.priority), isActive: input.active }),
    });
    return adaptZone(payload as RawZone, input.cityName.trim());
  },
  async listWindows() {
    const url = baseUrl();
    if (!url) { await wait(); return [...windows].sort(byStart).map(cloneWindow); }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/delivery/windows`);
    return (Array.isArray(payload) ? (payload as RawWindow[]) : []).map(adaptWindow).sort(byStart);
  },
  async createWindow(input: WindowInput) {
    const url = baseUrl();
    if (!url) {
      await wait();
      assertValid(validateWindowInput(input, windows));
      const window: DeliveryWindow = { id: `window-${uid()}`, ...input, weekdays: [...input.weekdays] };
      windows = [...windows, window];
      return cloneWindow(window);
    }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/delivery/windows`, {
      method: "POST",
      body: JSON.stringify({ startTime: input.startTime, endTime: input.endTime, weekdays: input.weekdays, isActive: input.active }),
    });
    return adaptWindow(payload as RawWindow);
  },
  async updateWindow(id: string, input: WindowInput) {
    const url = baseUrl();
    if (!url) {
      await wait();
      if (!windows.some((window) => window.id === id)) throw new Error("El horario ya no existe. Actualizá el listado.");
      assertValid(validateWindowInput(input, windows, id));
      windows = windows.map((window) => (window.id === id ? { id, ...input, weekdays: [...input.weekdays] } : window));
      return cloneWindow(windows.find((window) => window.id === id)!);
    }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/delivery/windows/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ startTime: input.startTime, endTime: input.endTime, weekdays: input.weekdays, isActive: input.active }),
    });
    return adaptWindow(payload as RawWindow);
  },
  async deleteWindow(id: string) {
    const url = baseUrl();
    if (!url) { await wait(); windows = windows.filter((window) => window.id !== id); return; }
    await fetchJson(`${url.replace(/\/$/, "")}/delivery/windows/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
