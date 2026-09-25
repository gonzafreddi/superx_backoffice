import { authFetch } from "@/app/lib/http";
import type { Brand, Category, Product, ProductApi, ProductFilters, ProductInput, ProductPage, Unit } from "./product-contract";

const categories: Category[] = [{ id: "beverages", name: "Bebidas" }, { id: "pantry", name: "Almacén" }, { id: "fresh", name: "Frescos" }];
const brands: Brand[] = [{ id: "superx", name: "SuperX" }, { id: "natura", name: "Natura" }, { id: "campo", name: "El Campo" }];
const units: Unit[] = [{ id: "unidad", code: "UN", name: "Unidad" }, { id: "kg", code: "KG", name: "Kilogramo" }, { id: "litro", code: "L", name: "Litro" }];
let products: Product[] = [
  { id: "prd-001", slug: "agua-mineral-sin-gas-1-5-l", name: "Agua mineral sin gas 1,5 L", description: "", sku: "SUP-0001", barcode: "7791234567890", categoryId: "beverages", categoryName: "Bebidas", brandId: "superx", brandName: "SuperX", unit: "UN", imageUrl: "", active: true, updatedAt: "2026-09-04T12:00:00.000Z", availableStock: 48, price: 1250 },
  { id: "prd-002", slug: "yerba-mate-tradicional-500-g", name: "Yerba mate tradicional 500 g", description: "", sku: "CAM-0002", barcode: "7791234567891", categoryId: "pantry", categoryName: "Almacén", brandId: "campo", brandName: "El Campo", unit: "UN", imageUrl: "", active: true, updatedAt: "2026-09-03T15:30:00.000Z", availableStock: 8, price: 3400 },
  { id: "prd-003", slug: "jugo-de-naranja-1-l", name: "Jugo de naranja 1 L", description: "", sku: "NAT-0003", barcode: "7791234567892", categoryId: "beverages", categoryName: "Bebidas", brandId: "natura", brandName: "Natura", unit: "L", imageUrl: "", active: false, updatedAt: "2026-08-30T09:10:00.000Z", availableStock: 0, price: 2150 },
];
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const missing = () => new Error("El producto ya no está disponible. Actualizá el listado e intentá nuevamente.");

function baseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; }

type RawCategory = { id: string; name: string };
type RawBrand = { id: string; name: string };
type RawUnit = { id: string; code: string; name: string };
type RawImage = { url?: unknown; altText?: unknown; isPrimary?: unknown };
type RawBarcode = { value?: unknown };
type RawProduct = { id: string; name: string; description?: string; slug: string; categoryId: string; brandId: string | null; unitId: string; isActive: boolean; updatedAt: string; availableStock?: number; category?: { name?: unknown }; brand?: { name?: unknown } | null; unit?: { code?: unknown }; images?: RawImage[]; barcodes?: RawBarcode[] };
type RawResolvedPrice = { productId: string; amount: string };

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const rawMessage = payload && typeof payload === "object" ? (payload as { message?: unknown }).message : undefined;
    const message = typeof rawMessage === "string" ? rawMessage : Array.isArray(rawMessage) ? rawMessage.filter((item): item is string => typeof item === "string").join(" ") : "No pudimos completar la operación.";
    throw new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta de administración." : message);
  }
  return payload;
}

function adaptProduct(raw: RawProduct, unitById: Map<string, RawUnit>): Product {
  const unit = unitById.get(raw.unitId);
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description ?? "",
    sku: raw.slug.toUpperCase(),
    barcode: raw.barcodes?.[0]?.value ? String(raw.barcodes[0].value) : "",
    categoryId: raw.categoryId,
    categoryName: typeof raw.category?.name === "string" ? raw.category.name : "Sin categoría",
    brandId: raw.brandId ?? "",
    brandName: typeof raw.brand?.name === "string" ? raw.brand.name : "Sin marca",
    unit: typeof raw.unit?.code === "string" ? raw.unit.code : unit?.code ?? "",
    imageUrl: raw.images?.[0]?.url ? String(raw.images[0].url) : "",
    active: raw.isActive,
    updatedAt: raw.updatedAt,
    availableStock: typeof raw.availableStock === "number" ? raw.availableStock : undefined,
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
    return (await this.listProductPage({ ...filters, pageSize: 100 })).items;
  },
  async listProductPage(filters: ProductFilters = {}): Promise<ProductPage> {
    const url = baseUrl();
    if (!url) { await wait(); const query = filters.query?.toLocaleLowerCase("es-AR").trim() ?? ""; let items = products.filter((p) => (!query || [p.name, p.sku, p.barcode].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.categoryId || p.categoryId === filters.categoryId) && (!filters.brandId || p.brandId === filters.brandId) && (!filters.status || filters.status === "all" || (filters.status === "active" ? p.active : !p.active)) && (!filters.stock || filters.stock === "all" || (filters.stock === "in_stock" ? (p.availableStock ?? 0) > 0 : (p.availableStock ?? 0) === 0))); const pageSize = filters.pageSize ?? 25; const page = filters.page ?? 1; if (filters.sort === "name_asc") items = [...items].sort((a, b) => a.name.localeCompare(b.name, "es-AR")); if (filters.sort === "name_desc") items = [...items].sort((a, b) => b.name.localeCompare(a.name, "es-AR")); if (filters.sort === "newest") items = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); if (filters.sort === "oldest") items = [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)); return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }; }
    const root = url.replace(/\/$/, "");
    const params = new URLSearchParams({ pageSize: String(filters.pageSize ?? 25), page: String(filters.page ?? 1), includeInactive: "true", sort: filters.sort ?? "name_asc" });
    if (filters.query?.trim()) params.set("q", filters.query.trim());
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.brandId) params.set("brandId", filters.brandId);
    if (filters.stock === "in_stock") params.set("inStock", "true");
    if (filters.stock === "out_of_stock") params.set("inStock", "false");
    if (!filters.stock || filters.stock === "all") params.set("includeStock", "true");
    const [productsPayload, unitsList] = await Promise.all([
      fetchJson(`${root}/products?${params}`),
      this.listUnits(),
    ]);
    const body = productsPayload as { items?: unknown; total?: unknown; page?: unknown; pageSize?: unknown };
    const items = Array.isArray(body.items) ? (body.items as RawProduct[]) : [];
    const unitById = new Map(unitsList.map((unit) => [unit.id, { id: unit.id, code: unit.code, name: unit.name }]));
    let list = items.map((item) => adaptProduct(item, unitById));
    if (filters.status && filters.status !== "all") list = list.filter((p) => (filters.status === "active" ? p.active : !p.active));
    if (filters.stock === "out_of_stock") list = list.filter((p) => (p.availableStock ?? 0) === 0);
    const resolved = list.length ? await fetchJson(`${root}/product-prices?productIds=${list.map((item) => item.id).join(",")}`).catch(() => []) : [];
    const priceById = new Map((Array.isArray(resolved) ? resolved as RawResolvedPrice[] : []).map((price) => [price.productId, Number(price.amount)]));
    return { items: list.map((item) => ({ ...item, price: priceById.get(item.id) })), total: typeof body.total === "number" ? body.total : list.length, page: typeof body.page === "number" ? body.page : (filters.page ?? 1), pageSize: typeof body.pageSize === "number" ? body.pageSize : (filters.pageSize ?? 25) };
  },
  async getProduct(slug) {
    const url = baseUrl();
    if (!url) { await wait(); const found = products.find((item) => item.slug === slug || item.id === slug); if (!found) throw missing(); return found; }
    const root = url.replace(/\/$/, "");
    const [payload, unitsList] = await Promise.all([fetchJson(`${root}/products/${encodeURIComponent(slug)}?includeInactive=true`), this.listUnits()]);
    return adaptProduct(payload as RawProduct, new Map(unitsList.map((unit) => [unit.id, unit])));
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
  async createCategory(input) {
    const name = input.name.trim();
    if (!name) throw new Error("Ingresá el nombre de la categoría.");
    const url = baseUrl();
    if (!url) { await wait(); const category = { id: crypto.randomUUID(), name }; categories.push(category); return category; }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/categories`, { method: "POST", body: JSON.stringify({ name }) });
    const category = payload as RawCategory;
    return { id: category.id, name: category.name };
  },
  async createUnit(input) {
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();
    if (!name) throw new Error("Ingresá el nombre de la unidad.");
    if (!code) throw new Error("Ingresá el código de la unidad.");
    const url = baseUrl();
    if (!url) { await wait(); const unit = { id: crypto.randomUUID(), name, code }; units.push(unit); return unit; }
    const payload = await fetchJson(`${url.replace(/\/$/, "")}/units`, { method: "POST", body: JSON.stringify({ name, code }) });
    const unit = payload as RawUnit;
    return { id: unit.id, name: unit.name, code: unit.code };
  },
  async createProduct(input) {
    const url = baseUrl();
    if (!url) { await wait(); const number = products.length + 1; const category = categories.find((item) => item.id === input.categoryId); const brand = brands.find((item) => item.id === input.brandId); const product: Product = { ...input, id: `prd-${String(number).padStart(3, "0")}`, slug: input.name.toLocaleLowerCase("es-AR").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), sku: `SUP-${String(number).padStart(4, "0")}`, categoryName: category?.name ?? "Sin categoría", brandName: brand?.name ?? "Sin marca", updatedAt: new Date().toISOString(), availableStock: 0 }; products = [product, ...products]; return product; }
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
