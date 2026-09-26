export type PurchaseOrderStatus = "DRAFT" | "CONFIRMED" | "CANCELLED" | "CLOSED";
export type ReceiptStatus = "NOT_RECEIVED" | "PARTIALLY_RECEIVED" | "RECEIVED";

export type PurchaseOrderProduct = { id: string; name: string; slug: string };
export type PurchaseOrderSupplier = { id: string; name: string };
export type PurchaseOrderWarehouse = { id: string; name: string };
export type PurchaseOrderPackaging = { id: string; name: string; unitsPerPack: number; equivalence?: string; isDefault?: boolean; isActive?: boolean };
export type PurchaseOrderEventType = "CREATED" | "CONFIRMED" | "CANCELLED" | "CLOSED" | "UPDATED" | "RECEIPT_RECORDED" | "OVER_RECEIPT_AUTHORIZED" | "RECEIVED" | "RECEIVED_WITH_DIFFERENCES";
export type PurchaseOrderEvent = { id?: string; type: PurchaseOrderEventType; actorUserId: string | null; note: string | null; createdAt: string };

export type PurchaseOrderItem = {
  id: string; productId: string; packagingId: string | null; product: PurchaseOrderProduct;
  packagingName: string; unitsPerPack: number; packageQuantity: number; unitQuantity: number;
  costPerPackage: number; unitCost: number; lineSubtotal: number; discountAmount: number; taxRate: number; taxAmount: number; taxes?: Array<{ taxId: string | null; name: string; rate: number; includeInCost: boolean; amount: number }>; total: number; receivedPackageQuantity: number; receivedUnitQuantity: number;
};

export type PurchaseOrderSummary = {
  id: string; number: string | null; supplierId: string; warehouseId: string; status: PurchaseOrderStatus; receiptStatus: ReceiptStatus;
  orderDate: string | null; expectedDate: string | null; reference: string | null; notes: string | null; createdAt: string; updatedAt: string; currency: string;
  subtotal: number; discountTotal: number; taxTotal: number; total: number; itemCount: number; supplier: PurchaseOrderSupplier; warehouse: PurchaseOrderWarehouse;
  paymentCondition: "CASH" | "CREDIT" | "TRANSFER" | "OTHER"; paymentTermDays: number | null; dueDate: string | null; freightAmount: number; otherChargesAmount: number;
  receiptProgress?: { received: number; total: number }; hasReceiptDifferences?: boolean;
};
export type PurchaseOrder = PurchaseOrderSummary & { items: PurchaseOrderItem[]; events: PurchaseOrderEvent[]; receiptCount?: number; updatedByUserId?: string | null; confirmedByUserId?: string | null; createdByUser?: { id: string; name: string | null; email: string } | null };
export type PurchaseOrderItemInput = { productId: string; packagingId?: string; packagingName?: string; unitsPerPack?: number; packageQuantity: number; costPerPackage: number; discountAmount?: number; taxRate?: number; taxIds?: number[] };
export type CreatePurchaseOrderDto = { supplierId: string; warehouseId: string; currency?: string; orderDate?: string; expectedDate?: string; paymentCondition?: "CASH" | "CREDIT" | "TRANSFER" | "OTHER"; paymentTermDays?: number | null; dueDate?: string | null; freightAmount?: string; otherChargesAmount?: string; reference?: string; notes?: string; items: PurchaseOrderItemInput[] };
export type UpdatePurchaseOrderDto = Partial<CreatePurchaseOrderDto>;
export type PaginatedPurchaseOrders = { items: PurchaseOrderSummary[]; total: number; page: number; pageSize: number };
export type PurchaseOrderFilters = { supplierId?: string; warehouseId?: string; status?: PurchaseOrderStatus | ""; receiptStatus?: ReceiptStatus | ""; receiptDifferences?: boolean; from?: string; to?: string; q?: string; page?: number; pageSize?: number };
export type GoodsReceiptItem = { id: string; purchaseOrderItemId: string; packageQuantity: number; unitQuantity: number; unitsPerPackSnapshot: number; varianceReason: string | null; rejectedPackageQuantity?: number; rejectionReason?: string | null };
export type GoodsReceipt = { id: string; purchaseOrderId: string; locationId: string | null; location?: { id: string; code?: string; name?: string }; reference: string | null; notes: string | null; receivedByUserId: string | null; receivedByUser?: { id: string; name?: string; email?: string }; receivedAt: string; items: GoodsReceiptItem[] };
export type CreateGoodsReceiptDto = { locationId?: string; reference?: string; notes?: string; idempotencyKey?: string; items: Array<{ purchaseOrderItemId: string; packageQuantity: number; allowOverReceipt?: boolean; varianceReason?: string }> };
export type PurchaseOrderApi = {
  list(filters?: PurchaseOrderFilters): Promise<PaginatedPurchaseOrders>;
  get(id: string): Promise<PurchaseOrder>;
  create(input: CreatePurchaseOrderDto): Promise<PurchaseOrder>;
  update(id: string, input: UpdatePurchaseOrderDto): Promise<PurchaseOrder>;
  confirm(id: string): Promise<PurchaseOrder>;
  duplicate(id: string): Promise<{ order: PurchaseOrder; skipped: Array<{ productId: string; productName: string; reason: string }> }>;
  delete(id: string): Promise<void>;
  supplierContext(id: string): Promise<PurchaseOrderSupplierContext>;
  cancel(id: string): Promise<PurchaseOrder>;
  close(id: string, reason?: string | null): Promise<PurchaseOrder>;
  events(id: string): Promise<PurchaseOrderEvent[]>;
  receipts(id: string): Promise<GoodsReceipt[]>;
  receive(id: string, input: CreateGoodsReceiptDto): Promise<GoodsReceipt>;
  searchProducts(query: string): Promise<PurchaseOrderProduct[]>;
  listPackagings(productId: string, supplierId: string): Promise<PurchaseOrderPackaging[]>;
};
export type PurchaseOrderSupplierContext = { supplierId: string; paymentCondition: "CASH" | "CREDIT" | "TRANSFER" | "OTHER"; paymentTermDays: number | null; balance: string; overdueBalance: string; lastOrder: { id: string; number: string | null; orderDate: string; total: string; status: PurchaseOrderStatus } | null; openOrdersCount: number; averageLeadTimeDays: number | null; productCount: number };
