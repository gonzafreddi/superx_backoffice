export type SupplierStatus = "ACTIVE" | "INACTIVE";
export type PaymentCondition = "CASH" | "CREDIT" | "TRANSFER" | "OTHER";

export type Supplier = {
  id: string; name: string; legalName: string | null; taxId: string | null; contactName: string | null; phone: string | null;
  email: string | null; address: string | null; paymentTermDays: number | null; paymentCondition: PaymentCondition; status: SupplierStatus;
  notes: string | null; createdAt: string; updatedAt: string;
};

export type SupplierInput = {
  name: string; legalName?: string; taxId?: string; contactName?: string; phone?: string; email?: string; address?: string;
  paymentTermDays?: number | null; paymentCondition?: PaymentCondition; status?: SupplierStatus; notes?: string;
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
export type SupplierBalance = { supplierId: string; currency: string; openBalance: string; overdueBalance: string; advanceBalance: string };
export type SupplierAccountCurrency = { currency: string; totalInvoiced: string; totalPaid: string; openBalance: string; overdueBalance: string; overdueCount: number; upcoming: { next7: string; next30: string; later: string }; advanceBalance: string; netBalance: string; openInvoiceCount: number; paymentCount: number };
export type SupplierAccount = { supplierId: string; currencies: SupplierAccountCurrency[] };
export type SupplierMovementType = "INVOICE" | "PAYMENT" | "PAYMENT_REVERSAL";
export type SupplierMovement = { date: string; type: SupplierMovementType; reference: string; documentId: string; currency: string; debit: string; credit: string; runningBalance: string };
export type PaginatedSupplierMovements = { items: SupplierMovement[]; total: number; page: number; pageSize: number; currency: string; openingBalanceForPeriod: string };
export type SupplierEvent = { id: string; supplierId: string; type: "CREATED" | "UPDATED" | "ACTIVATED" | "DEACTIVATED"; actorUserId: string; data: Record<string, unknown> | null; createdAt: string };

export type SupplierApi = {
  listSuppliers(filters?: { q?: string; status?: SupplierStatus | ""; page?: number; pageSize?: number }): Promise<PaginatedSuppliers>;
  getSupplier(id: string): Promise<SupplierDetail>;
  balances(supplierIds: string[]): Promise<SupplierBalance[]>;
  account(id: string): Promise<SupplierAccount>;
  movements(id: string, filters?: { currency?: string; from?: string; to?: string; type?: SupplierMovementType | ""; page?: number; pageSize?: number }): Promise<PaginatedSupplierMovements>;
  events(id: string): Promise<SupplierEvent[]>;
  createSupplier(input: CreateSupplierDto): Promise<Supplier>;
  updateSupplier(id: string, input: UpdateSupplierDto): Promise<Supplier>;
  searchProducts(query: string): Promise<SupplierProduct[]>;
  listPackagings(productId: string): Promise<PurchasePackaging[]>;
  createPackaging(productId: string, input: CreatePurchasePackagingDto): Promise<PurchasePackaging>;
  updatePackaging(id: string, input: UpdatePurchasePackagingDto): Promise<PurchasePackaging>;
};
