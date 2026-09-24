export type UserRole = "viewer" | "operator" | "admin";
/** A unit CODE (e.g. "UN", "KG", "L", "G") — the backend's units are dynamic rows, not a fixed set; see `ProductApi.listUnits`. */
export type ProductUnit = string;
export type Category = { id: string; name: string };
export type Brand = { id: string; name: string };
export type Unit = { id: string; code: string; name: string };
export type Product = { id: string; slug: string; name: string; description: string; sku: string; barcode: string; categoryId: string; categoryName: string; brandId: string; brandName: string; unit: ProductUnit; imageUrl: string; active: boolean; updatedAt: string; availableStock?: number; price?: number };
export type ProductInput = Pick<Product, "name" | "description" | "barcode" | "categoryId" | "brandId" | "unit" | "imageUrl" | "active">;
export type ProductFilters = { query?: string; categoryId?: string; brandId?: string; status?: "all" | "active" | "inactive"; stock?: "all" | "in_stock" | "out_of_stock"; sort?: "name_asc" | "name_desc" | "newest" | "oldest"; page?: number; pageSize?: number };
export type ProductPage = { items: Product[]; total: number; page: number; pageSize: number };
export type ProductApi = { listProducts(filters?: ProductFilters): Promise<Product[]>; listProductPage(filters?: ProductFilters): Promise<ProductPage>; getProduct(slug: string): Promise<Product>; listCategories(): Promise<Category[]>; listBrands(): Promise<Brand[]>; listUnits(): Promise<Unit[]>; createBrand(input: { name: string }): Promise<Brand>; createCategory(input: { name: string }): Promise<Category>; createUnit(input: { name: string; code: string }): Promise<Unit>; createProduct(input: ProductInput): Promise<Product>; updateProduct(id: string, input: ProductInput): Promise<Product>; setProductStatus(id: string, active: boolean): Promise<Product>; deleteProduct(id: string): Promise<void> };
