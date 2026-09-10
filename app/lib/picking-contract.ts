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
  pickItem(taskId: string, itemId: string, quantity: number): Promise<PickingTask>;
  completeTask(id: string): Promise<PickingTask>;
};
