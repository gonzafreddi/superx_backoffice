export type ReceivingStatus = "pending" | "partial" | "all";
export type ReceiptStatus = "NOT_RECEIVED" | "PARTIALLY_RECEIVED" | "RECEIVED";

export type ReceivingHeader = {
  purchaseOrderId: string; number: string | null;
  supplier: { id: string; name: string }; warehouse: { id: string; name: string };
  expectedDate: string | null; orderDate: string | null; receiptStatus: ReceiptStatus;
  lineCount: number; pendingPackages: number; pendingUnits: number; isLate: boolean;
};
export type ReceivingLine = {
  purchaseOrderItemId: string;
  product: { id: string; name: string; slug: string; imageUrl?: string; barcodes: string[] };
  packagingName: string; unitsPerPack: number; packagingBarcode?: string;
  orderedPackages: number; orderedUnits: number; receivedPackages: number; receivedUnits: number;
  pendingPackages: number; pendingUnits: number; suggestedLocationId: string | null;
};
export type ReceivingLocation = { id: string; code: string };
export type PreviousReceipt = { id: string; receivedAt: string; receivedBy: { id: string; name: string | null; email: string }; items: Array<{ purchaseOrderItemId: string; packageQuantity: number; unitQuantity: number; rejectedPackageQuantity: number; rejectionReason: string | null; locationId: string }> };
export type ReceivingDetail = ReceivingHeader & { lines: ReceivingLine[]; locations: ReceivingLocation[]; previousReceipts: PreviousReceipt[] };
export type ReceivingPage = { items: ReceivingHeader[]; total: number; page: number; pageSize: number };
export type ReceivingFilters = { status?: ReceivingStatus; warehouseId?: string; q?: string; page?: number; pageSize?: number };
export type ValidateReceivingInput = { locationId: string; reference?: string; notes?: string; idempotencyKey: string; items: Array<{ purchaseOrderItemId: string; packageQuantity: number; locationId?: string; allowOverReceipt?: boolean; varianceReason?: string; rejectedPackageQuantity?: number; rejectionReason?: string }> };
export type ReceivingApi = { list(filters?: ReceivingFilters): Promise<ReceivingPage>; detail(id: string): Promise<ReceivingDetail>; validate(id: string, input: ValidateReceivingInput): Promise<ReceivingDetail> };
