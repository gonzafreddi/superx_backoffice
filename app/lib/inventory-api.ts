import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "@/app/lib/http";
import type { InventoryApi, InventoryFilters, InventoryItem, InventoryMovement, InventoryMovementInput, Warehouse } from "./inventory-contract";
import { getInventoryStatus, adaptInventoryMovement } from "./inventory-rules";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const warehouses: Warehouse[] = [{ id: "wh-central", name: "Depósito central", code: "CENTRAL" }, { id: "wh-norte", name: "Sucursal Norte", code: "NORTE" }, { id: "wh-sur", name: "Sucursal Sur", code: "SUR" }];
let inventory: InventoryItem[] = [
  { id: "inv-001", snapshotId: "inv-001", productId: "prd-001", productName: "Agua mineral sin gas 1,5 L", sku: "SUP-0001", warehouseId: "wh-central", onHand: 48, minimum: 18, updatedAt: "2026-09-04T12:00:00.000Z", movements: [{ id: "mov-001", inventoryItemId: "inv-001", type: "receipt", quantity: 60, reason: "Recepción OC-1842", occurredAt: "2026-09-03T10:15:00.000Z", createdBy: "María González" }, { id: "mov-002", inventoryItemId: "inv-001", type: "sale", quantity: -12, reason: "Ventas del turno", occurredAt: "2026-09-04T11:40:00.000Z", createdBy: "Integración ventas" }] },
  { id: "inv-002", snapshotId: "inv-002", productId: "prd-002", productName: "Yerba mate tradicional 500 g", sku: "CAM-0002", warehouseId: "wh-central", onHand: 8, minimum: 12, updatedAt: "2026-09-04T09:30:00.000Z", movements: [{ id: "mov-003", inventoryItemId: "inv-002", type: "receipt", quantity: 20, reason: "Recepción OC-1838", occurredAt: "2026-09-01T14:00:00.000Z", createdBy: "Juan Fernández" }, { id: "mov-004", inventoryItemId: "inv-002", type: "sale", quantity: -12, reason: "Ventas del turno", occurredAt: "2026-09-04T09:30:00.000Z", createdBy: "Integración ventas" }] },
  { id: "inv-003", snapshotId: "inv-003", productId: "prd-003", productName: "Jugo de naranja 1 L", sku: "NAT-0003", warehouseId: "wh-norte", onHand: 0, minimum: 8, updatedAt: "2026-09-04T08:10:00.000Z", movements: [{ id: "mov-005", inventoryItemId: "inv-003", type: "sale", quantity: -6, reason: "Ventas del turno", occurredAt: "2026-09-04T08:10:00.000Z", createdBy: "Integración ventas" }] },
  { id: "inv-004", snapshotId: "inv-004", productId: "prd-001", productName: "Agua mineral sin gas 1,5 L", sku: "SUP-0001", warehouseId: "wh-sur", onHand: 25, minimum: 10, updatedAt: "2026-09-03T16:00:00.000Z", movements: [{ id: "mov-006", inventoryItemId: "inv-004", type: "transfer", quantity: 25, reason: "Transferencia desde central", occurredAt: "2026-09-03T16:00:00.000Z", createdBy: "María González" }] },
];
const unavailable = () => new Error("La posición de stock ya no está disponible. Actualizá el listado e intentá nuevamente.");

function baseUrl(): string | undefined { return apiBaseUrl(); }
const itemId = (productId: string, warehouseId: string) => `${productId}:${warehouseId}`;
const parseItemId = (id: string) => { const [productId, warehouseId] = id.split(":"); return { productId, warehouseId }; };

type RawWarehouse = { id: string; name: string };
type RawSnapshot = { id: string; productId: string; warehouseId: string; quantityOnHand: number; reserved: number; available: number; reorderThreshold: number; updatedAt: string };
type RawProduct = { id: string; name: string; slug: string; images?: Array<{ url?: string; isPrimary?: boolean; sortOrder?: number }> };
type RawMovement = { id: string; type: string; quantity: number; reference: string | null; note: string | null; actorUserId: string; createdAt: string };

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
    throw new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta de administración." : message);
  }
  return payload;
}

/** No user directory endpoint exists (only "/me" for the current user), so movements can only be attributed by id. */
function adaptMovement(raw: RawMovement): InventoryMovement {
  return adaptInventoryMovement(raw) as InventoryMovement;
}

async function fetchMovements(root: string, productId: string, warehouseId: string): Promise<InventoryMovement[]> {
  const payload = (await fetchJson(`${root}/inventory/movements?productId=${productId}&warehouseId=${warehouseId}&pageSize=50`)) as { items?: unknown };
  const items = Array.isArray(payload.items) ? (payload.items as RawMovement[]) : [];
  return items.map((raw) => ({ ...adaptMovement(raw), inventoryItemId: itemId(productId, warehouseId) }));
}

// The catalog caps pageSize at 100, so read every page to name (and picture) all stocked products.
async function fetchAllProducts(root: string): Promise<RawProduct[]> {
  const all: RawProduct[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const payload = (await fetchJson(`${root}/products?pageSize=100&page=${page}&includeInactive=true`)) as { items?: RawProduct[]; total?: number };
    const items = payload.items ?? [];
    all.push(...items);
    if (items.length < 100 || (typeof payload.total === "number" && all.length >= payload.total)) break;
  }
  return all;
}

function primaryImage(product?: RawProduct): string | undefined {
  const images = [...(product?.images ?? [])].filter((image) => typeof image.url === "string" && image.url);
  images.sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return images[0]?.url;
}

export const inventoryApi: InventoryApi = {
  async listInventory(filters: InventoryFilters = {}) {
    const url = baseUrl();
    if (fixturesEnabled()) { await wait(); return inventory.filter((item) => (!filters.query?.trim() || [item.productName, item.sku].some((value) => value.toLocaleLowerCase("es-AR").includes(filters.query!.trim().toLocaleLowerCase("es-AR")))) && (!filters.warehouseId || item.warehouseId === filters.warehouseId) && (!filters.status || filters.status === "all" || getInventoryStatus(item) === filters.status)); }
    const root = url!.replace(/\/$/, "");
    const [snapshotsPayload, productList] = await Promise.all([
      fetchJson(`${root}/inventory/stock${filters.warehouseId ? `?warehouseId=${filters.warehouseId}` : ""}`),
      fetchAllProducts(root),
    ]);
    const snapshots = Array.isArray(snapshotsPayload) ? (snapshotsPayload as RawSnapshot[]) : [];
    const products = new Map(productList.map((product) => [product.id, product]));
    // Movements load on demand (listMovements) when a position is opened: one request per
    // product here would exceed the API rate limit as the catalog grows.
    const items = snapshots.map((snapshot) => {
      const product = products.get(snapshot.productId);
      const item: InventoryItem = {
        id: itemId(snapshot.productId, snapshot.warehouseId),
        snapshotId: snapshot.id,
        productId: snapshot.productId,
        productName: product?.name ?? `Producto #${snapshot.productId}`,
        sku: product?.slug.toUpperCase() ?? snapshot.productId,
        imageUrl: primaryImage(product),
        warehouseId: snapshot.warehouseId,
        onHand: snapshot.quantityOnHand,
        reserved: snapshot.reserved,
        available: snapshot.available,
        minimum: snapshot.reorderThreshold,
        updatedAt: snapshot.updatedAt,
        movements: [],
      };
      return item;
    });
    const query = filters.query?.trim().toLocaleLowerCase("es-AR") ?? "";
    return items.filter((item) => (!query || [item.productName, item.sku].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.status || filters.status === "all" || getInventoryStatus(item) === filters.status));
  },
  async listMovements(item: InventoryItem) {
    const url = baseUrl();
    if (fixturesEnabled()) { await wait(); return inventory.find((candidate) => candidate.id === item.id)?.movements ?? []; }
    return fetchMovements(url!.replace(/\/$/, ""), item.productId, item.warehouseId);
  },
  async listWarehouses() {
    const url = baseUrl();
    if (fixturesEnabled()) { await wait(); return warehouses; }
    const payload = await fetchJson(`${url!.replace(/\/$/, "")}/warehouses`);
    return Array.isArray(payload) ? (payload as RawWarehouse[]).map((item) => ({ id: item.id, name: item.name, code: item.name })) : [];
  },
  async createMovement(input: InventoryMovementInput) {
    const url = baseUrl();
    if (fixturesEnabled()) { await wait(); const item = inventory.find((candidate) => candidate.id === input.inventoryItemId); if (!item) throw unavailable(); if (!Number.isInteger(input.quantity) || input.quantity === 0 || !input.reason.trim()) throw new Error("El movimiento informado no es válido."); if (item.onHand + input.quantity < 0) throw new Error("El movimiento no puede dejar el stock por debajo de cero."); const movement = { id: `mov-${crypto.randomUUID()}`, inventoryItemId: item.id, type: "adjustment" as const, quantity: input.quantity, reason: input.reason.trim(), occurredAt: new Date().toISOString(), createdBy: input.createdBy }; const updated: InventoryItem = { ...item, onHand: item.onHand + input.quantity, updatedAt: movement.occurredAt, movements: [movement, ...item.movements] }; inventory = inventory.map((candidate) => candidate.id === item.id ? updated : candidate); return updated; }
    const root = url!.replace(/\/$/, "");
    const { productId, warehouseId } = parseItemId(input.inventoryItemId);
    if (!Number.isInteger(input.quantity) || input.quantity === 0 || !input.reason.trim()) throw new Error("El movimiento informado no es válido.");
    await fetchJson(`${root}/inventory/movements`, {
      method: "POST",
      body: JSON.stringify({ productId: Number(productId), warehouseId: Number(warehouseId), type: "ADJUSTMENT", quantity: Math.abs(input.quantity), direction: input.quantity >= 0 ? "increase" : "decrease", note: input.reason.trim() }),
    });
    const [snapshotPayload, productPayload, movements] = await Promise.all([
      fetchJson(`${root}/inventory/stock?productId=${productId}&warehouseId=${warehouseId}`),
      fetchJson(`${root}/products/${productId}`).catch(() => undefined),
      fetchMovements(root, productId, warehouseId),
    ]);
    const snapshot = (Array.isArray(snapshotPayload) ? snapshotPayload as RawSnapshot[] : [])[0];
    const product = productPayload as RawProduct | undefined;
    return {
      id: itemId(productId, warehouseId),
      snapshotId: snapshot?.id ?? "",
      productId,
      productName: product?.name ?? `Producto #${productId}`,
      sku: product?.slug.toUpperCase() ?? productId,
      warehouseId,
      onHand: snapshot?.quantityOnHand ?? 0,
      reserved: snapshot?.reserved,
      available: snapshot?.available,
      minimum: snapshot?.reorderThreshold ?? 0,
      updatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      movements,
    };
  },
  async updateReorderThreshold(itemId: string, threshold: number) {
    if (!Number.isInteger(threshold) || threshold < 0) throw new Error("El umbral debe ser un número entero mayor o igual a cero.");
    const url = baseUrl();
    if (fixturesEnabled()) { await wait(); const item = inventory.find((candidate) => candidate.id === itemId); if (!item) throw unavailable(); const updated: InventoryItem = { ...item, minimum: threshold }; inventory = inventory.map((candidate) => candidate.id === itemId ? updated : candidate); return updated; }
    const root = url!.replace(/\/$/, "");
    const { productId, warehouseId } = parseItemId(itemId);
    const [snapshotPayload, productPayload, movements] = await Promise.all([
      fetchJson(`${root}/inventory/stock?productId=${productId}&warehouseId=${warehouseId}`),
      fetchJson(`${root}/products/${productId}`).catch(() => undefined),
      fetchMovements(root, productId, warehouseId),
    ]);
    const snapshot = (Array.isArray(snapshotPayload) ? snapshotPayload as RawSnapshot[] : [])[0];
    if (!snapshot) throw unavailable();
    const updatedSnapshot = (await fetchJson(`${root}/inventory/stock/${snapshot.id}`, { method: "PATCH", body: JSON.stringify({ reorderThreshold: threshold }) })) as RawSnapshot;
    const product = productPayload as RawProduct | undefined;
    return {
      id: itemId,
      snapshotId: updatedSnapshot.id,
      productId,
      productName: product?.name ?? `Producto #${productId}`,
      sku: product?.slug.toUpperCase() ?? productId,
      warehouseId,
      onHand: updatedSnapshot.quantityOnHand,
      reserved: snapshot.reserved,
      available: snapshot.available,
      minimum: updatedSnapshot.reorderThreshold,
      updatedAt: updatedSnapshot.updatedAt,
      movements,
    };
  },
};
