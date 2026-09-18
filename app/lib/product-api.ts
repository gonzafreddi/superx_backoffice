import { authHeaders } from "@/app/lib/auth-api";
import type { Brand, Category, Product, ProductApi, ProductInput, Unit } from "./product-contract";

const categories: Category[] = [{ id: "beverages", name: "Bebidas" }, { id: "pantry", name: "Almacén" }, { id: "fresh", name: "Frescos" }];
const brands: Brand[] = [{ id: "superx", name: "SuperX" }, { id: "natura", name: "Natura" }, { id: "campo", name: "El Campo" }];
const units: Unit[] = [{ id: "unidad", code: "UN", name: "Unidad" }, { id: "kg", code: "KG", name: "Kilogramo" }, { id: "litro", code: "L", name: "Litro" }];
let products: Product[] = [
  { id: "prd-001", name: "Agua mineral sin gas 1,5 L", description: "", sku: "SUP-0001", barcode: "7791234567890", categoryId: "beverages", brandId: "superx", unit: "unidad", imageUrl: "", active: true, updatedAt: "2026-09-04T12:00:00.000Z" },
  { id: "prd-002", name: "Yerba mate tradicional 500 g", description: "", sku: "CAM-0002", barcode: "7791234567891", categoryId: "pantry", brandId: "campo", unit: "unidad", imageUrl: "", active: true, updatedAt: "2026-09-03T15:30:00.000Z" },
  { id: "prd-003", name: "Jugo de naranja 1 L", description: "", sku: "NAT-0003", barcode: "7791234567892", categoryId: "beverages", brandId: "natura", unit: "litro", imageUrl: "", active: false, updatedAt: "2026-08-30T09:10:00.000Z" },
];
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const missing = () => new Error("El producto ya no está disponible. Actualizá el listado e intentá nuevamente.");

function baseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; }

type RawCategory = { id: string; name: string };
type RawBrand = { id: string; name: string };
type RawUnit = { id: string; code: string; name: string };
type RawImage = { url?: unknown; altText?: unknown; isPrimary?: unknown };
type RawBarcode = { value?: unknown };
type RawProduct = { id: string; name: string; description?: string; slug: string; categoryId: string; brandId: string | null; unitId: string; isActive: boolean; updatedAt: string; images?: RawImage[]; barcodes?: RawBarcode[] };

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...authHeaders(), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
    throw new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta de administración." : message);
  }
  return payload;
}

function adaptProduct(raw: RawProduct, unitById: Map<string, RawUnit>): Product {
  const unit = unitById.get(raw.unitId);
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    sku: raw.slug.toUpperCase(),
    barcode: raw.barcodes?.[0]?.value ? String(raw.barcodes[0].value) : "",
    categoryId: raw.categoryId,
    brandId: raw.brandId ?? "",
    unit: unit?.code ?? "",
    imageUrl: raw.images?.[0]?.url ? String(raw.images[0].url) : "",
    active: raw.isActive,
    updatedAt: raw.updatedAt,
  };
}

function buildCreateBody(input: ProductInput, unitId: string) {
  // CreateProductDto rejects isActive — products are always created active.
  return {
    name: input.name,
    description: input.description?.trim() || undefined,
    categoryId: Number(input.categoryId),
    brandId: input.brandId ? Number(input.brandId) : undefined,
    unitId: Number(unitId),
    barcodes: input.barcode ? [{ value: input.barcode }] : [],
    images: input.imageUrl ? [{ url: input.imageUrl, isPrimary: true }] : [],
  };
}

function buildUpdateBody(input: ProductInput, unitId: string) {
  return { ...buildCreateBody(input, unitId), isActive: input.active };
}

/** Real backend has no product DELETE — products can only be deactivated (PATCH isActive:false). */
async function unsupportedDelete(): Promise<never> {
  throw new Error("Los productos no se pueden eliminar del catálogo real, solo desactivar. Usá \"Desactivar\" en su lugar.");
}

export const productApi: ProductApi = {
  async listProducts(filters = {}) {
    const url = baseUrl();
    if (!url) { await wait(); const query = filters.query?.toLocaleLowerCase("es-AR").trim() ?? ""; return products.filter((p) => (!query || [p.name, p.sku, p.barcode].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.categoryId || p.categoryId === filters.categoryId) && (!filters.brandId || p.brandId === filters.brandId) && (!filters.status || filters.status === "all" || (filters.status === "active" ? p.active : !p.active))); }
    const root = url.replace(/\/$/, "");
    const params = new URLSearchParams({ pageSize: "100", includeInactive: "true" });
    if (filters.query?.trim()) params.set("q", filters.query.trim());
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    const [productsPayload, unitsList] = await Promise.all([
      fetchJson(`${root}/products?${params}`),
      this.listUnits(),
    ]);
    const body = productsPayload as { items?: unknown };
    const items = Array.isArray(body.items) ? (body.items as RawProduct[]) : [];
    const unitById = new Map(unitsList.map((unit) => [unit.id, { id: unit.id, code: unit.code, name: unit.name }]));
    let list = items.map((item) => adaptProduct(item, unitById));
    if (filters.brandId) list = list.filter((p) => p.brandId === filters.brandId);
    if (filters.status && filters.status !== "all") list = list.filter((p) => (filters.status === "active" ? p.active : !p.active));
    return list;
  },
  async listCategories() {
    const url = baseUrl();
    if (!url) { await wait(); return categories; }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/categories?includeInactive=true`);
    return Array.isArray(payload) ? (payload as RawCategory[]).map((item) => ({ id: item.id, name: item.name })) : [];
  },
  async listBrands() {
    const url = baseUrl();
    if (!url) { await wait(); return brands; }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/brands?includeInactive=true`);
    return Array.isArray(payload) ? (payload as RawBrand[]).map((item) => ({ id: item.id, name: item.name })) : [];
  },
  async listUnits() {
    const url = baseUrl();
    if (!url) { await wait(); return units; }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/units?includeInactive=true`);
    return Array.isArray(payload) ? (payload as RawUnit[]).map((item) => ({ id: item.id, code: item.code, name: item.name })) : [];
  },
  async createBrand(input) {
    const name = input.name.trim();
    if (!name) throw new Error("Ingresá el nombre de la marca.");
    const url = baseUrl();
    if (!url) { await wait(); const brand = { id: crypto.randomUUID(), name }; brands.push(brand); return brand; }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/brands`, { method: "POST", body: JSON.stringify({ name }) });
    const brand = payload as RawBrand;
    return { id: brand.id, name: brand.name };
  },
  async createProduct(input) {
    const url = baseUrl();
    if (!url) { await wait(); const number = products.length + 1; const product: Product = { ...input, id: `prd-${String(number).padStart(3, "0")}`, sku: `SUP-${String(number).padStart(4, "0")}`, updatedAt: new Date().toISOString() }; products = [product, ...products]; return product; }
    const unitsList = await this.listUnits();
    const unit = unitsList.find((candidate) => candidate.code === input.unit);
    if (!unit) throw new Error("Seleccioná una unidad de venta válida.");
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/products`, { method: "POST", body: JSON.stringify(buildCreateBody(input, unit.id)) });
    const unitById = new Map(unitsList.map((u) => [u.id, u]));
    return adaptProduct(payload as RawProduct, unitById);
  },
  async updateProduct(id, input) {
    const url = baseUrl();
    if (!url) { await wait(); const found = products.find((p) => p.id === id); if (!found) throw missing(); const updated = { ...found, ...input, updatedAt: new Date().toISOString() }; products = products.map((p) => p.id === id ? updated : p); return updated; }
    const unitsList = await this.listUnits();
    const unit = unitsList.find((candidate) => candidate.code === input.unit);
    if (!unit) throw new Error("Seleccioná una unidad de venta válida.");
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(buildUpdateBody(input, unit.id)) });
    const unitById = new Map(unitsList.map((u) => [u.id, u]));
    return adaptProduct(payload as RawProduct, unitById);
  },
  async setProductStatus(id, active) {
    const url = baseUrl();
    if (!url) { await wait(); const found = products.find((p) => p.id === id); if (!found) throw missing(); const updated = { ...found, active, updatedAt: new Date().toISOString() }; products = products.map((p) => p.id === id ? updated : p); return updated; }
    const unitsList = await this.listUnits();
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ isActive: active }) });
    const unitById = new Map(unitsList.map((u) => [u.id, u]));
    return adaptProduct(payload as RawProduct, unitById);
  },
  async deleteProduct(id) {
    const url = baseUrl();
    if (!url) { await wait(); if (!products.some((p) => p.id === id)) throw missing(); products = products.filter((p) => p.id !== id); return; }
    await unsupportedDelete();
  },
};
