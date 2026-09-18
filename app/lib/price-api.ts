import { authHeaders } from "@/app/lib/auth-api";
import type { Price, PriceApi, PriceChange, PriceFilters, PriceUpdateInput } from "./price-contract";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
let prices: Price[] = [
  { productId: "prd-001", productName: "Agua mineral sin gas 1,5 L", sku: "SUP-0001", category: "Bebidas", active: true, amount: 1250, currency: "ARS", updatedAt: "2026-09-04T12:00:00.000Z", updatedBy: "María González", history: [{ id: "pch-003", previousAmount: 1100, amount: 1250, changedAt: "2026-09-04T12:00:00.000Z", changedBy: "María González", reason: "Ajuste de lista septiembre" }, { id: "pch-001", previousAmount: null, amount: 1100, changedAt: "2026-08-01T09:00:00.000Z", changedBy: "Juan Fernández" }] },
  { productId: "prd-002", productName: "Yerba mate tradicional 500 g", sku: "CAM-0002", category: "Almacén", active: true, amount: 3400, currency: "ARS", updatedAt: "2026-09-03T15:30:00.000Z", updatedBy: "María González", history: [{ id: "pch-004", previousAmount: 3100, amount: 3400, changedAt: "2026-09-03T15:30:00.000Z", changedBy: "María González", reason: "Actualización proveedor" }] },
  { productId: "prd-003", productName: "Jugo de naranja 1 L", sku: "NAT-0003", category: "Bebidas", active: false, amount: 2150, currency: "ARS", updatedAt: "2026-08-30T09:10:00.000Z", updatedBy: "Juan Fernández", history: [{ id: "pch-005", previousAmount: 2000, amount: 2150, changedAt: "2026-08-30T09:10:00.000Z", changedBy: "Juan Fernández" }] },
];
function missing() { return new Error("Uno de los productos ya no está disponible. Actualizá el listado e intentá nuevamente."); }

function baseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; }
const DEFAULT_PRICE_LIST_NAME = "Lista general";

type RawProduct = { id: string; name: string; slug: string; isActive: boolean; categoryId: string; category?: { name?: unknown } | null };
type RawResolvedPrice = { productId: string; amount: string; currency: string; priceListId: string; priceListName: string; validFrom: string };
type RawPriceList = { id: string; name: string; cityId: string | null; warehouseId: string | null };
type RawProductPrice = { id: string; productId: string; amount: string };

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...authHeaders(), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
    throw new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta de administración." : message);
  }
  return payload;
}

/**
 * The backend has no single admin-managed price list — prices resolve by
 * scope/priority across however many lists exist. The backoffice's flat
 * "one price per product" screen manages a single global list it creates
 * on first use, named "Lista general" (no city/warehouse scope).
 */
async function resolveDefaultPriceListId(root: string): Promise<string> {
  const payload = await fetchJson(`${root}/price-lists?includeInactive=true`);
  const lists = Array.isArray(payload) ? (payload as RawPriceList[]) : [];
  const existing = lists.find((list) => list.name === DEFAULT_PRICE_LIST_NAME && !list.cityId && !list.warehouseId);
  if (existing) return existing.id;
  const created = (await fetchJson(`${root}/price-lists`, { method: "POST", body: JSON.stringify({ name: DEFAULT_PRICE_LIST_NAME }) })) as RawPriceList;
  return created.id;
}

export const priceApi: PriceApi = {
  async listPrices(filters: PriceFilters = {}) {
    const url = baseUrl();
    if (!url) { await wait(); const query = filters.query?.trim().toLocaleLowerCase("es-AR") ?? ""; return prices.filter((price) => (!query || [price.productName, price.sku].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.category || price.category === filters.category) && (!filters.status || filters.status === "all" || (filters.status === "active" ? price.active : !price.active))); }
    const root = url.replace(/\/$/, "");
    const params = new URLSearchParams({ pageSize: "100", includeInactive: "true" });
    if (filters.query?.trim()) params.set("q", filters.query.trim());
    const productsPayload = (await fetchJson(`${root}/products?${params}`)) as { items?: unknown };
    const items = Array.isArray(productsPayload.items) ? (productsPayload.items as RawProduct[]) : [];
    if (items.length === 0) return [];
    const priceMap = new Map<string, RawResolvedPrice>();
    const resolved = (await fetchJson(`${root}/product-prices?productIds=${items.map((item) => item.id).join(",")}`)) as RawResolvedPrice[];
    for (const entry of resolved) priceMap.set(entry.productId, entry);
    let list: Price[] = items.map((item) => {
      const resolvedPrice = priceMap.get(item.id);
      const history: PriceChange[] = resolvedPrice
        ? [{ id: `${resolvedPrice.priceListId}-${item.id}`, previousAmount: null, amount: Number(resolvedPrice.amount), changedAt: resolvedPrice.validFrom, changedBy: `Lista: ${resolvedPrice.priceListName}` }]
        : [];
      return {
        productId: item.id,
        productName: item.name,
        sku: item.slug.toUpperCase(),
        category: typeof item.category?.name === "string" ? item.category.name : "Sin categoría",
        active: item.isActive,
        amount: resolvedPrice ? Number(resolvedPrice.amount) : 0,
        currency: "ARS",
        updatedAt: resolvedPrice?.validFrom ?? new Date(0).toISOString(),
        updatedBy: resolvedPrice ? resolvedPrice.priceListName : "Sin precio cargado",
        history,
      };
    });
    if (filters.category) list = list.filter((price) => price.category === filters.category);
    if (filters.status && filters.status !== "all") list = list.filter((price) => (filters.status === "active" ? price.active : !price.active));
    return list;
  },
  async updatePrices(input: PriceUpdateInput) {
    const url = baseUrl();
    if (!url) { await wait(); if (!input.productIds.length || !Number.isFinite(input.amount) || input.amount < 0) throw new Error("El precio informado no es válido."); if (input.productIds.some((id) => !prices.some((price) => price.productId === id))) throw missing(); const changedAt = new Date().toISOString(); const changed = new Map<string, Price>(); prices = prices.map((price) => { if (!input.productIds.includes(price.productId)) return price; const next: Price = { ...price, amount: input.amount, updatedAt: changedAt, updatedBy: input.changedBy, history: [{ id: `pch-${crypto.randomUUID()}`, previousAmount: price.amount, amount: input.amount, changedAt, changedBy: input.changedBy, ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}) }, ...price.history] }; changed.set(next.productId, next); return next; }); return input.productIds.map((id) => changed.get(id) as Price); }
    const root = url.replace(/\/$/, "");
    const listId = await resolveDefaultPriceListId(root);
    const existingPayload = (await fetchJson(`${root}/price-lists/${listId}/prices`)) as RawProductPrice[];
    const existingByProduct = new Map(existingPayload.map((row) => [row.productId, row]));
    for (const productId of input.productIds) {
      const existing = existingByProduct.get(productId);
      if (existing) {
        await fetchJson(`${root}/prices/${existing.id}`, { method: "PATCH", body: JSON.stringify({ amount: input.amount }) });
      } else {
        await fetchJson(`${root}/price-lists/${listId}/prices`, { method: "POST", body: JSON.stringify({ productId: Number(productId), amount: input.amount }) });
      }
    }
    return priceApi.listPrices().then((all) => all.filter((price) => input.productIds.includes(price.productId)));
  },
};
