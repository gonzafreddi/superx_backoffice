import { authHeaders } from "@/app/lib/auth-api";
import type { LocationApi, LocationInput, LocationProduct, LocationWarehouse, ProductLocation, WarehouseLocation } from "./location-contract";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const baseUrl = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;

let fixtureLocations: WarehouseLocation[] = [
  { id: "loc-001", warehouseId: "wh-central", code: "A-01-01", aisle: "A", rack: "01", level: "01", sortOrder: 10, isActive: true, createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z" },
  { id: "loc-002", warehouseId: "wh-central", code: "A-01-02", aisle: "A", rack: "01", level: "02", sortOrder: 20, isActive: true, createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z" },
  { id: "loc-003", warehouseId: "wh-norte", code: "B-02-01", aisle: "B", rack: "02", level: "01", sortOrder: 10, isActive: false, createdAt: "2026-09-02T10:00:00.000Z", updatedAt: "2026-09-02T10:00:00.000Z" },
];
const fixtureWarehouses: LocationWarehouse[] = [{ id: "wh-central", name: "Depósito central" }, { id: "wh-norte", name: "Sucursal Norte" }, { id: "wh-sur", name: "Sucursal Sur" }];
const fixtureProducts: LocationProduct[] = [{ id: "prd-001", name: "Agua mineral sin gas 1,5 L" }, { id: "prd-002", name: "Yerba mate tradicional 500 g" }, { id: "prd-003", name: "Jugo de naranja 1 L" }];
let fixtureAssignments: ProductLocation[] = [{ productId: "prd-001", warehouseId: "wh-central", location: fixtureLocations[0] }];

type RawLocation = { id: string | number; warehouseId: string | number; code: string; aisle: string; rack: string; level: string; sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string };
type RawWarehouse = { id: string | number; name: string };
type RawProductLocation = { productId: string | number; warehouseId: string | number; location: RawLocation };

const adaptLocation = (raw: RawLocation): WarehouseLocation => ({ ...raw, id: String(raw.id), warehouseId: String(raw.warehouseId) });
const adaptAssignment = (raw: RawProductLocation): ProductLocation => ({ productId: String(raw.productId), warehouseId: String(raw.warehouseId), location: adaptLocation(raw.location) });

async function fetchJson(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${baseUrl()!.replace(/\/$/, "")}${path}`, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...authHeaders(), ...init.headers } });
  const payload: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
    throw Object.assign(new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta autorizada." : message), { status: response.status });
  }
  return payload;
}

const inputBody = (input: LocationInput) => ({ ...input, code: input.code.trim(), aisle: input.aisle.trim(), rack: input.rack.trim(), level: input.level.trim() });

export const locationApi: LocationApi = {
  async listWarehouses() {
    if (!baseUrl()) { await wait(); return fixtureWarehouses; }
    const payload = await fetchJson("/warehouses");
    return Array.isArray(payload) ? (payload as RawWarehouse[]).map((warehouse) => ({ id: String(warehouse.id), name: warehouse.name })) : [];
  },
  async listLocations(warehouseId) {
    if (!baseUrl()) { await wait(); return fixtureLocations.filter((location) => location.warehouseId === warehouseId).sort((a, b) => a.sortOrder - b.sortOrder).map((location) => ({ ...location })); }
    const payload = await fetchJson(`/warehouses/${encodeURIComponent(warehouseId)}/locations`);
    return Array.isArray(payload) ? (payload as RawLocation[]).map(adaptLocation) : [];
  },
  async createLocation(warehouseId, input) {
    if (!baseUrl()) { await wait(); const next = { ...inputBody(input), id: `loc-${crypto.randomUUID()}`, warehouseId, sortOrder: input.sortOrder ?? 0, isActive: input.isActive ?? true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; fixtureLocations = [...fixtureLocations, next]; return next; }
    return adaptLocation((await fetchJson(`/warehouses/${encodeURIComponent(warehouseId)}/locations`, { method: "POST", body: JSON.stringify(inputBody(input)) })) as RawLocation);
  },
  async updateLocation(id, input) {
    if (!baseUrl()) { await wait(); const current = fixtureLocations.find((location) => location.id === id); if (!current) throw new Error("La ubicación ya no está disponible."); const next = { ...current, ...inputBody(input), sortOrder: input.sortOrder ?? current.sortOrder, isActive: input.isActive ?? current.isActive, updatedAt: new Date().toISOString() }; fixtureLocations = fixtureLocations.map((location) => location.id === id ? next : location); fixtureAssignments = fixtureAssignments.map((assignment) => assignment.location.id === id ? { ...assignment, location: next } : assignment); return next; }
    return adaptLocation((await fetchJson(`/picking/locations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(inputBody(input)) })) as RawLocation);
  },
  async searchProducts(query) {
    if (!baseUrl()) { await wait(); const normalized = query.trim().toLocaleLowerCase("es-AR"); return fixtureProducts.filter((product) => product.name.toLocaleLowerCase("es-AR").includes(normalized)); }
    const payload = await fetchJson(`/products?q=${encodeURIComponent(query)}&pageSize=10`);
    const items = payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items) ? (payload as { items: Array<{ id: string | number; name: string }> }).items : [];
    return items.map((product) => ({ id: String(product.id), name: product.name }));
  },
  async getProductLocation(warehouseId, productId) {
    if (!baseUrl()) { await wait(); return fixtureAssignments.find((assignment) => assignment.productId === productId && assignment.warehouseId === warehouseId) ?? null; }
    try { return adaptAssignment((await fetchJson(`/warehouses/${encodeURIComponent(warehouseId)}/products/${encodeURIComponent(productId)}/location`)) as RawProductLocation); } catch (error) { if (typeof error === "object" && error && (error as { status?: number }).status === 404) return null; throw error; }
  },
  async assignProductLocation(productId, warehouseId, locationId) {
    if (!baseUrl()) { await wait(); const location = fixtureLocations.find((item) => item.id === locationId && item.warehouseId === warehouseId); if (!location) throw new Error("La ubicación ya no está disponible."); const next = { productId, warehouseId, location }; fixtureAssignments = [...fixtureAssignments.filter((assignment) => assignment.productId !== productId || assignment.warehouseId !== warehouseId), next]; return next; }
    return adaptAssignment((await fetchJson(`/products/${encodeURIComponent(productId)}/location`, { method: "PUT", body: JSON.stringify({ warehouseId: Number(warehouseId), locationId: Number(locationId) }) })) as RawProductLocation);
  },
  async clearProductLocation(productId, warehouseId) {
    if (!baseUrl()) { await wait(); fixtureAssignments = fixtureAssignments.filter((assignment) => assignment.productId !== productId || assignment.warehouseId !== warehouseId); return; }
    await fetchJson(`/products/${encodeURIComponent(productId)}/location?warehouseId=${encodeURIComponent(warehouseId)}`, { method: "DELETE" });
  },
};
