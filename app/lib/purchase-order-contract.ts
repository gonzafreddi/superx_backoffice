export type PurchaseOrderStatus = "DRAFT" | "CONFIRMED" | "CANCELLED" | "CLOSED";
export type ReceiptStatus = "NOT_RECEIVED" | "PARTIALLY_RECEIVED" | "RECEIVED";

export type PurchaseOrderProduct = { id: string; name: string; slug: string };
export type PurchaseOrderSupplier = { id: string; name: string };
export type PurchaseOrderWarehouse = { id: string; name: string };
export type PurchaseOrderPackaging = { id: string; name: string; unitsPerPack: number; isActive?: boolean };
export type PurchaseOrderEventType = "CREATED" | "CONFIRMED" | "CANCELLED" | "UPDATED";
export type PurchaseOrderEvent = { id?: string; type: PurchaseOrderEventType; actorUserId: string | null; note: string | null; createdAt: string };

export type PurchaseOrderItem = {
  id: string; productId: string; packagingId: string | null; product: PurchaseOrderProduct;
  packagingName: string; unitsPerPack: number; packageQuantity: number; unitQuantity: number;
  costPerPackage: number; unitCost: number; total: number; receivedPackageQuantity: number; receivedUnitQuantity: number;
};

export type PurchaseOrderSummary = {
  id: string; supplierId: string; warehouseId: string; status: PurchaseOrderStatus; receiptStatus: ReceiptStatus;
  expectedDate: string | null; reference: string | null; notes: string | null; createdAt: string; updatedAt: string;
  total: number; itemCount: number; supplier: PurchaseOrderSupplier; warehouse: PurchaseOrderWarehouse;
};
export type PurchaseOrder = PurchaseOrderSummary & { items: PurchaseOrderItem[]; events: PurchaseOrderEvent[] };
export type PurchaseOrderItemInput = { productId: string; packagingId?: string; packagingName?: string; unitsPerPack?: number; packageQuantity: number; costPerPackage: number };
export type CreatePurchaseOrderDto = { supplierId: string; warehouseId: string; expectedDate?: string; reference?: string; notes?: string; items: PurchaseOrderItemInput[] };
export type UpdatePurchaseOrderDto = Partial<CreatePurchaseOrderDto>;
export type PaginatedPurchaseOrders = { items: PurchaseOrderSummary[]; total: number; page: number; pageSize: number };
export type PurchaseOrderApi = {
  list(filters?: { supplierId?: string; warehouseId?: string; status?: PurchaseOrderStatus | ""; page?: number; pageSize?: number }): Promise<PaginatedPurchaseOrders>;
  get(id: string): Promise<PurchaseOrder>;
  create(input: CreatePurchaseOrderDto): Promise<PurchaseOrder>;
  update(id: string, input: UpdatePurchaseOrderDto): Promise<PurchaseOrder>;
  confirm(id: string): Promise<PurchaseOrder>;
  cancel(id: string): Promise<PurchaseOrder>;
  searchProducts(query: string): Promise<PurchaseOrderProduct[]>;
  listPackagings(productId: string, supplierId: string): Promise<PurchaseOrderPackaging[]>;
};
