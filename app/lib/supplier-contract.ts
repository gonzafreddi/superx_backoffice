export type SupplierStatus = "ACTIVE" | "INACTIVE";

export type Supplier = {
  id: string; name: string; taxId: string | null; contactName: string | null; phone: string | null;
  email: string | null; address: string | null; paymentTermDays: number | null; status: SupplierStatus;
  notes: string | null; createdAt: string; updatedAt: string;
};

export type SupplierInput = {
  name: string; taxId?: string; contactName?: string; phone?: string; email?: string; address?: string;
  paymentTermDays?: number | null; status?: SupplierStatus; notes?: string;
};
export type CreateSupplierDto = SupplierInput;
export type UpdateSupplierDto = Partial<SupplierInput>;

export type SupplierProduct = { id: string; name: string; slug: string };
export type PurchasePackaging = {
  id: string; productId: string; supplierId: string | null; supplier?: Pick<Supplier, "id" | "name">;
  product: SupplierProduct; name: string; unitsPerPack: number; barcode: string | null; supplierCode: string | null;
  isDefault: boolean; isActive: boolean; createdAt: string; updatedAt: string;
};

export type PurchasePackagingInput = {
  supplierId?: string; name: string; unitsPerPack: number; barcode?: string; supplierCode?: string;
  isDefault?: boolean; isActive?: boolean;
};
export type CreatePurchasePackagingDto = PurchasePackagingInput;
export type UpdatePurchasePackagingDto = Partial<PurchasePackagingInput>;

export type SupplierDetail = Supplier & { purchasePackagings: PurchasePackaging[] };
export type PaginatedSuppliers = { items: Supplier[]; total: number; page: number; pageSize: number };

export type SupplierApi = {
  listSuppliers(filters?: { q?: string; status?: SupplierStatus | ""; page?: number; pageSize?: number }): Promise<PaginatedSuppliers>;
  getSupplier(id: string): Promise<SupplierDetail>;
  createSupplier(input: CreateSupplierDto): Promise<Supplier>;
  updateSupplier(id: string, input: UpdateSupplierDto): Promise<Supplier>;
  searchProducts(query: string): Promise<SupplierProduct[]>;
  createPackaging(productId: string, input: CreatePurchasePackagingDto): Promise<PurchasePackaging>;
  updatePackaging(id: string, input: UpdatePurchasePackagingDto): Promise<PurchasePackaging>;
};
