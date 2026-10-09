import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
import { inventoryApi } from "./inventory-api";
import { locationApi } from "./location-api";
import { adaptCount, parseCountQuantity } from "./inventory-count-rules";
import type { CountPatch, CountStatus, InventoryCount } from "./inventory-count-contract";

const storageKey = "superx.inventory-count.fixtures.v1";
let memory: InventoryCount[] = [];
function fixtures(): InventoryCount[] {
  if (typeof localStorage !== "undefined") { try { memory = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { /* Keep in-memory fixtures when storage is unavailable. */ } }
  return structuredClone(memory);
}
function persist(count: InventoryCount) {
  memory = [count, ...fixtures().filter(item => item.id !== count.id)];
  if (typeof localStorage !== "undefined") { try { localStorage.setItem(storageKey, JSON.stringify(memory)); } catch { /* Browser may disable storage. */ } }
  return structuredClone(count);
}
async function request(path: string, method = "GET", body?: unknown) {
  const response = await authFetch(`${apiBaseUrl()!.replace(/\/$/, "")}/inventory-counts${path}`, { method, headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(" ") : payload?.message ?? "No se pudo completar la operación de conteo.");
  return payload;
}
async function draft(id: string) {
  const count = await inventoryCountApi.get(id);
  if (count.status !== "DRAFT") throw new Error("El conteo ya está cerrado.");
  return count;
}
export const inventoryCountApi = {
  async list(filters: { warehouseId?: string; status?: CountStatus } = {}): Promise<InventoryCount[]> {
    if (fixturesEnabled()) return fixtures().filter(item => (!filters.warehouseId || item.warehouseId === filters.warehouseId) && (!filters.status || item.status === filters.status));
    const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    const payload = await request(`?${params}`);
    return (Array.isArray(payload) ? payload : payload.items ?? []).map(adaptCount);
  },
  async get(id: string): Promise<InventoryCount> {
    if (fixturesEnabled()) { const count = fixtures().find(item => item.id === id); if (!count) throw new Error("El conteo no existe."); return count; }
    return adaptCount(await request(`/${encodeURIComponent(id)}`));
  },
  async create(input: { warehouseId: string; locationId?: string; note?: string }): Promise<InventoryCount> {
    if (fixturesEnabled()) {
      const stock = input.locationId ? (await locationApi.getLocationStock(input.warehouseId, input.locationId, "", 1, 10000)).items.map(item => ({ productId: item.product.id, productName: item.product.name, sku: item.product.slug ?? "", saleMode: item.product.saleMode, onHand: item.quantity })) : await inventoryApi.listInventory({ warehouseId: input.warehouseId });
      const products = await locationApi.searchProducts("");
      const lines = stock.map(item => ({ productId: item.productId, saleMode: item.saleMode ?? "UNIT", productName: item.productName, sku: products.find(p => p.id === item.productId)?.sku ?? item.sku, barcode: products.find(p => p.id === item.productId)?.barcode ?? null, systemQuantity: item.onHand, countedQuantity: null, reason: null }));
      return persist({ id: crypto.randomUUID(), code: `CNT-${String(fixtures().length + 1).padStart(6, "0")}`, ...input, locationId: input.locationId ?? null, note: input.note ?? null, status: "DRAFT", createdAt: new Date().toISOString(), lines });
    }
    return adaptCount(await request("", "POST", { ...input, warehouseId: Number(input.warehouseId), ...(input.locationId ? { locationId: Number(input.locationId) } : {}) }));
  },
  async addLine(id: string, productId: string): Promise<InventoryCount> {
    if (fixturesEnabled()) {
      const count = await draft(id); if (count.lines.some(line => line.productId === productId)) return count;
      const product = (await locationApi.searchProducts("")).find(item => item.id === productId); if (!product) throw new Error("Producto no encontrado.");
      const stock = await inventoryApi.listInventory({ warehouseId: count.warehouseId });
      count.lines.push({ productId, saleMode: product.saleMode ?? "UNIT", productName: product.name, sku: product.sku ?? "", barcode: product.barcode ?? null, systemQuantity: stock.find(item => item.productId === productId)?.onHand ?? 0, countedQuantity: null, reason: null }); return persist(count);
    }
    await request(`/${encodeURIComponent(id)}/lines`, "POST", { productId: Number(productId) }); return this.get(id);
  },
  async save(id: string, lines: CountPatch[]): Promise<InventoryCount> {
    lines.forEach(line => { parseCountQuantity(line.countedQuantity == null ? "" : String(line.countedQuantity)); if ((line.reason?.length ?? 0) > 80) throw new Error("Motivo demasiado largo."); });
    if (fixturesEnabled()) { const count = await draft(id); count.lines = count.lines.map(line => ({ ...line, ...lines.find(patch => patch.productId === line.productId) })); return persist(count); }
    await request(`/${encodeURIComponent(id)}/lines`, "PATCH", { lines: lines.map(line => ({ ...line, productId: Number(line.productId) })) }); return this.get(id);
  },
  async close(id: string, action: "apply" | "cancel"): Promise<InventoryCount> {
    if (fixturesEnabled()) { const count = await draft(id); count.status = action === "apply" ? "APPLIED" : "CANCELLED"; if (action === "apply") count.appliedAt = new Date().toISOString(); return persist(count); }
    await request(`/${encodeURIComponent(id)}/${action}`, "POST"); return this.get(id);
  },
};
