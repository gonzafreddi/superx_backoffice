export type CountStatus = "DRAFT" | "APPLIED" | "CANCELLED";
export type CountLine = { productId: string; saleMode?: "UNIT" | "WEIGHT"; productName: string; sku: string; barcode: string | null; systemQuantity: number; countedQuantity: number | null; reason: string | null; difference?: number; currentQuantity?: number; appliedDifference?: number };
export type InventoryCount = { id: string; code: string; warehouseId: string; locationId: string | null; status: CountStatus; note: string | null; createdAt: string; appliedAt?: string | null; lines: CountLine[] };
export type CountEdit = { quantity: string; reason: string };
export type CountPatch = { productId: string; countedQuantity: number | null; reason: string | null };
