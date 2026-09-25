import { authFetch } from "@/app/lib/http";
import type { InventoryApi, InventoryFilters, InventoryItem, InventoryMovement, InventoryMovementInput, MovementType, Warehouse } from "./inventory-contract";
import { getInventoryStatus } from "./inventory-rules";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const warehouses: Warehouse[] = [{ id: "wh-central", name: "Depósito central", code: "CENTRAL" }, { id: "wh-norte", name: "Sucursal Norte", code: "NORTE" }, { id: "wh-sur", name: "Sucursal Sur", code: "SUR" }];
let inventory: InventoryItem[] = [
  { id: "inv-001", snapshotId: "inv-001", productId: "prd-001", productName: "Agua mineral sin gas 1,5 L", sku: "SUP-0001", warehouseId: "wh-central", onHand: 48, minimum: 18, updatedAt: "2026-09-04T12:00:00.000Z", movements: [{ id: "mov-001", inventoryItemId: "inv-001", type: "receipt", quantity: 60, reason: "Recepción OC-1842", occurredAt: "2026-09-03T10:15:00.000Z", createdBy: "María González" }, { id: "mov-002", inventoryItemId: "inv-001", type: "sale", quantity: -12, reason: "Ventas del turno", occurredAt: "2026-09-04T11:40:00.000Z", createdBy: "Integración ventas" }] },
  { id: "inv-002", snapshotId: "inv-002", productId: "prd-002", productName: "Yerba mate tradicional 500 g", sku: "CAM-0002", warehouseId: "wh-central", onHand: 8, minimum: 12, updatedAt: "2026-09-04T09:30:00.000Z", movements: [{ id: "mov-003", inventoryItemId: "inv-002", type: "receipt", quantity: 20, reason: "Recepción OC-1838", occurredAt: "2026-09-01T14:00:00.000Z", createdBy: "Juan Fernández" }, { id: "mov-004", inventoryItemId: "inv-002", type: "sale", quantity: -12, reason: "Ventas del turno", occurredAt: "2026-09-04T09:30:00.000Z", createdBy: "Integración ventas" }] },
  { id: "inv-003", snapshotId: "inv-003", productId: "prd-003", productName: "Jugo de naranja 1 L", sku: "NAT-0003", warehouseId: "wh-norte", onHand: 0, minimum: 8, updatedAt: "2026-09-04T08:10:00.000Z", movements: [{ id: "mov-005", inventoryItemId: "inv-003", type: "sale", quantity: -6, reason: "Ventas del turno", occurredAt: "2026-09-04T08:10:00.000Z", createdBy: "Integración ventas" }] },
  { id: "inv-004", snapshotId: "inv-004", productId: "prd-001", productName: "Agua mineral sin gas 1,5 L", sku: "SUP-0001", warehouseId: "wh-sur", onHand: 25, minimum: 10, updatedAt: "2026-09-03T16:00:00.000Z", movements: [{ id: "mov-006", inventoryItemId: "inv-004", type: "transfer", quantity: 25, reason: "Transferencia desde central", occurredAt: "2026-09-03T16:00:00.000Z", createdBy: "María González" }] },
];
const unavailable = () => new Error("La posición de stock ya no está disponible. Actualizá el listado e intentá nuevamente.");

function baseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; }
const itemId = (productId: string, warehouseId: string) => `${productId}:${warehouseId}`;
const parseItemId = (id: string) => { const [productId, warehouseId] = id.split(":"); return { productId, warehouseId }; };

type RawWarehouse = { id: string; name: string };
type RawSnapshot = { id: string; productId: string; warehouseId: string; quantityOnHand: number; reorderThreshold: number; updatedAt: string };
type RawProduct = { id: string; name: string; slug: string };
type RawMovement = { id: string; type: string; quantity: number; reference: string | null; note: string | null; actorUserId: string; createdAt: string };

const MOVEMENT_TYPE_MAP: Record<string, MovementType> = { PURCHASE: "receipt", RETURN: "receipt", SALE: "sale", ADJUSTMENT: "adjustment", TRANSFER_IN: "transfer", TRANSFER_OUT: "transfer" };

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
  return {
    id: raw.id,
    inventoryItemId: "",
    type: MOVEMENT_TYPE_MAP[raw.type] ?? "adjustment",
    quantity: (raw.type === "SALE" || raw.type === "TRANSFER_OUT" ? -1 : 1) * raw.quantity,
    reason: raw.note ?? raw.reference ?? "—",
    occurredAt: raw.createdAt,
    createdBy: `Usuario #${raw.actorUserId}`,
  };
}

async function fetchMovements(root: string, productId: string, warehouseId: string): Promise<InventoryMovement[]> {
  const payload = (await fetchJson(`${root}/inventory/movements?productId=${productId}&warehouseId=${warehouseId}&pageSize=50`)) as { items?: unknown };
  const items = Array.isArray(payload.items) ? (payload.items as RawMovement[]) : [];
  return items.map((raw) => ({ ...adaptMovement(raw), inventoryItemId: itemId(productId, warehouseId) }));
}

export const inventoryApi: InventoryApi = {
  async listInventory(filters: InventoryFilters = {}) {
    const url = baseUrl();
    if (!url) { await wait(); return inventory.filter((item) => (!filters.query?.trim() || [item.productName, item.sku].some((value) => value.toLocaleLowerCase("es-AR").includes(filters.query!.trim().toLocaleLowerCase("es-AR")))) && (!filters.warehouseId || item.warehouseId === filters.warehouseId) && (!filters.status || filters.status === "all" || getInventoryStatus(item) === filters.status)); }
    const root = url.replace(/\/$/, "");
    const [snapshotsPayload, productsPayload] = await Promise.all([
      fetchJson(`${root}/inventory/stock${filters.warehouseId ? `?warehouseId=${filters.warehouseId}` : ""}`),
      fetchJson(`${root}/products?pageSize=100&includeInactive=true`),
    ]);
    const snapshots = Array.isArray(snapshotsPayload) ? (snapshotsPayload as RawSnapshot[]) : [];
    const products = new Map(((productsPayload as { items?: RawProduct[] }).items ?? []).map((product) => [product.id, product]));
    const items = await Promise.all(snapshots.map(async (snapshot) => {
      const product = products.get(snapshot.productId);
      const movements = await fetchMovements(root, snapshot.productId, snapshot.warehouseId);
      const item: InventoryItem = {
        id: itemId(snapshot.productId, snapshot.warehouseId),
        snapshotId: snapshot.id,
        productId: snapshot.productId,
        productName: product?.name ?? `Producto #${snapshot.productId}`,
        sku: product?.slug.toUpperCase() ?? snapshot.productId,
        warehouseId: snapshot.warehouseId,
        onHand: snapshot.quantityOnHand,
        minimum: snapshot.reorderThreshold,
        updatedAt: snapshot.updatedAt,
        movements,
      };
      return item;
    }));
    const query = filters.query?.trim().toLocaleLowerCase("es-AR") ?? "";
    return items.filter((item) => (!query || [item.productName, item.sku].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.status || filters.status === "all" || getInventoryStatus(item) === filters.status));
  },
  async listWarehouses() {
    const url = baseUrl();
    if (!url) { await wait(); return warehouses; }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/warehouses`);
    return Array.isArray(payload) ? (payload as RawWarehouse[]).map((item) => ({ id: item.id, name: item.name, code: item.name })) : [];
  },
  async createMovement(input: InventoryMovementInput) {
    const url = baseUrl();
    if (!url) { await wait(); const item = inventory.find((candidate) => candidate.id === input.inventoryItemId); if (!item) throw unavailable(); if (!Number.isInteger(input.quantity) || input.quantity === 0 || !input.reason.trim()) throw new Error("El movimiento informado no es válido."); if (item.onHand + input.quantity < 0) throw new Error("El movimiento no puede dejar el stock por debajo de cero."); const movement = { id: `mov-${crypto.randomUUID()}`, inventoryItemId: item.id, type: "adjustment" as const, quantity: input.quantity, reason: input.reason.trim(), occurredAt: new Date().toISOString(), createdBy: input.createdBy }; const updated: InventoryItem = { ...item, onHand: item.onHand + input.quantity, updatedAt: movement.occurredAt, movements: [movement, ...item.movements] }; inventory = inventory.map((candidate) => candidate.id === item.id ? updated : candidate); return updated; }
    const root = url.replace(/\/$/, "");
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
      minimum: snapshot?.reorderThreshold ?? 0,
      updatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      movements,
    };
  },
  async updateReorderThreshold(itemId: string, threshold: number) {
    if (!Number.isInteger(threshold) || threshold < 0) throw new Error("El umbral debe ser un número entero mayor o igual a cero.");
    const url = baseUrl();
    if (!url) { await wait(); const item = inventory.find((candidate) => candidate.id === itemId); if (!item) throw unavailable(); const updated: InventoryItem = { ...item, minimum: threshold }; inventory = inventory.map((candidate) => candidate.id === itemId ? updated : candidate); return updated; }
    const root = url.replace(/\/$/, "");
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
      minimum: updatedSnapshot.reorderThreshold,
      updatedAt: updatedSnapshot.updatedAt,
      movements,
    };
  },
};
