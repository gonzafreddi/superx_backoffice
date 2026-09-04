export type UserRole = "viewer" | "operator" | "admin";
export type ProductUnit = "unidad" | "kg" | "litro" | "pack";
export type Category = { id: string; name: string };
export type Brand = { id: string; name: string };
export type Product = { id: string; name: string; sku: string; barcode: string; categoryId: string; brandId: string; unit: ProductUnit; imageUrl: string; active: boolean; updatedAt: string };
export type ProductInput = Omit<Product, "id" | "sku" | "updatedAt">;
export type ProductFilters = { query?: string; categoryId?: string; brandId?: string; status?: "all" | "active" | "inactive" };
export type ProductApi = { listProducts(filters?: ProductFilters): Promise<Product[]>; listCategories(): Promise<Category[]>; listBrands(): Promise<Brand[]>; createProduct(input: ProductInput): Promise<Product>; updateProduct(id: string, input: ProductInput): Promise<Product>; setProductStatus(id: string, active: boolean): Promise<Product>; deleteProduct(id: string): Promise<void> };
