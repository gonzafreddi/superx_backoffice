export type UserRole = "viewer" | "operator" | "admin";
/** A unit CODE (e.g. "UN", "KG", "L", "G") — the backend's units are dynamic rows, not a fixed set; see `ProductApi.listUnits`. */
export type ProductUnit = string;
export type Category = { id: string; name: string };
export type Brand = { id: string; name: string };
export type Unit = { id: string; code: string; name: string };
export type Product = { id: string; name: string; description: string; sku: string; barcode: string; categoryId: string; brandId: string; unit: ProductUnit; imageUrl: string; active: boolean; updatedAt: string };
export type ProductInput = Omit<Product, "id" | "sku" | "updatedAt">;
export type ProductFilters = { query?: string; categoryId?: string; brandId?: string; status?: "all" | "active" | "inactive" };
export type ProductApi = { listProducts(filters?: ProductFilters): Promise<Product[]>; listCategories(): Promise<Category[]>; listBrands(): Promise<Brand[]>; listUnits(): Promise<Unit[]>; createBrand(input: { name: string }): Promise<Brand>; createProduct(input: ProductInput): Promise<Product>; updateProduct(id: string, input: ProductInput): Promise<Product>; setProductStatus(id: string, active: boolean): Promise<Product>; deleteProduct(id: string): Promise<void> };
