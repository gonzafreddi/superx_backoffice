import type { UserRole } from "./product-contract";

export type InventoryStatus = "ok" | "low" | "out";
export type MovementType = "adjustment" | "receipt" | "sale" | "transfer";

export type Warehouse = { id: string; name: string; code: string };
export type InventoryMovement = { id: string; inventoryItemId: string; type: MovementType; quantity: number; reason: string; occurredAt: string; createdBy: string };
export type InventoryItem = { id: string; productId: string; productName: string; sku: string; warehouseId: string; onHand: number; minimum: number; updatedAt: string; movements: InventoryMovement[] };
export type InventoryFilters = { query?: string; warehouseId?: string; status?: "all" | InventoryStatus };
export type InventoryMovementInput = { inventoryItemId: string; quantity: number; reason: string; createdBy: string };

/** Contrato objetivo de BE-008: GET /api/inventory y POST /api/inventory/movements. */
export type InventoryApi = { listInventory(filters?: InventoryFilters): Promise<InventoryItem[]>; listWarehouses(): Promise<Warehouse[]>; createMovement(input: InventoryMovementInput): Promise<InventoryItem> };
export type InventoryPermissions = { adjust: boolean };
export type InventoryRole = UserRole;
