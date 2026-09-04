import type { Brand, Category, Product, ProductApi } from "./product-contract";

const categories: Category[] = [{ id: "beverages", name: "Bebidas" }, { id: "pantry", name: "Almacén" }, { id: "fresh", name: "Frescos" }];
const brands: Brand[] = [{ id: "superx", name: "SuperX" }, { id: "natura", name: "Natura" }, { id: "campo", name: "El Campo" }];
let products: Product[] = [
  { id: "prd-001", name: "Agua mineral sin gas 1,5 L", sku: "SUP-0001", barcode: "7791234567890", categoryId: "beverages", brandId: "superx", unit: "unidad", imageUrl: "", active: true, updatedAt: "2026-09-04T12:00:00.000Z" },
  { id: "prd-002", name: "Yerba mate tradicional 500 g", sku: "CAM-0002", barcode: "7791234567891", categoryId: "pantry", brandId: "campo", unit: "unidad", imageUrl: "", active: true, updatedAt: "2026-09-03T15:30:00.000Z" },
  { id: "prd-003", name: "Jugo de naranja 1 L", sku: "NAT-0003", barcode: "7791234567892", categoryId: "beverages", brandId: "natura", unit: "litro", imageUrl: "", active: false, updatedAt: "2026-08-30T09:10:00.000Z" },
];
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const missing = () => new Error("El producto ya no está disponible. Actualizá el listado e intentá nuevamente.");

/** Mock tipado temporal. Reemplazar por cliente HTTP al contar con contrato backend. */
export const productApi: ProductApi = {
  async listProducts(filters = {}) { await wait(); const query = filters.query?.toLocaleLowerCase("es-AR").trim() ?? ""; return products.filter((p) => (!query || [p.name, p.sku, p.barcode].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.categoryId || p.categoryId === filters.categoryId) && (!filters.brandId || p.brandId === filters.brandId) && (!filters.status || filters.status === "all" || (filters.status === "active" ? p.active : !p.active))); },
  async listCategories() { await wait(); return categories; },
  async listBrands() { await wait(); return brands; },
  async createProduct(input) { await wait(); const number = products.length + 1; const product: Product = { ...input, id: `prd-${String(number).padStart(3, "0")}`, sku: `SUP-${String(number).padStart(4, "0")}`, updatedAt: new Date().toISOString() }; products = [product, ...products]; return product; },
  async updateProduct(id, input) { await wait(); const found = products.find((p) => p.id === id); if (!found) throw missing(); const updated = { ...found, ...input, updatedAt: new Date().toISOString() }; products = products.map((p) => p.id === id ? updated : p); return updated; },
  async setProductStatus(id, active) { await wait(); const found = products.find((p) => p.id === id); if (!found) throw missing(); const updated = { ...found, active, updatedAt: new Date().toISOString() }; products = products.map((p) => p.id === id ? updated : p); return updated; },
  async deleteProduct(id) { await wait(); if (!products.some((p) => p.id === id)) throw missing(); products = products.filter((p) => p.id !== id); },
};
