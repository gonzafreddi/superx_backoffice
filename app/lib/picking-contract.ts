export type PickingTaskStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PickingItemStatus = "PENDING" | "PICKED" | "SHORT" | "SUBSTITUTED";

export type PickingItem = {
  id: string;
  productName: string;
  unitCode: string;
  quantityRequired: number;
  quantityPicked: number;
  locationCode: string | null;
  locationSortOrder: number;
  status: PickingItemStatus;
  barcode?: string;
  resolution?: "REPLACE_SIMILAR" | "CONTACT_ME" | "REMOVE_ITEM";
  substituteProductId?: string;
  substituteProductName?: string;
};

export type PickingTask = {
  id: string;
  orderNumber: string;
  status: PickingTaskStatus;
  priority: number;
  slotDate: string;
  slotStart: string;
  assignedPickerId: string | null;
  items: PickingItem[];
};

/** Contrato objetivo: los endpoints /api/picking/tasks de BE picking (PK-002/PK-003). */
export type PickingApi = {
  listMyTasks(): Promise<PickingTask[]>;
  listAvailableTasks(): Promise<PickingTask[]>;
  getTask(id: string): Promise<PickingTask>;
  assignToMe(id: string): Promise<PickingTask>;
  startTask(id: string): Promise<PickingTask>;
  pickItem(taskId: string, itemId: string, quantity: number, barcode?: string): Promise<PickingTask>;
  reportShortage(taskId: string, itemId: string, resolution: "REPLACE_SIMILAR" | "CONTACT_ME" | "REMOVE_ITEM", substituteProductId?: string, note?: string): Promise<PickingTask>;
  searchProducts(query: string): Promise<Array<{ id: string; name: string }>>;
  completeTask(id: string): Promise<PickingTask>;
};
