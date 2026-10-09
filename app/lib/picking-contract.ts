import type { SaleMode, WeightFields } from "./quantity-rules";
export type PickingTaskStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PickingItemStatus = "PENDING" | "PICKED" | "SHORT" | "SUBSTITUTED";

export type PickingItem = WeightFields & {
  id: string;
  productName: string;
  unitCode: string;
  quantityRequired: number;
  quantityPicked: number;
  locationCode: string | null;
  locationSortOrder: number;
  status: PickingItemStatus;
  barcode?: string;
  productImageUrl?: string | null;
  barcodes?: string[];
  brandName?: string | null;
  unitName?: string | null;
  note?: string;
  resolution?: "REPLACE_SIMILAR" | "CONTACT_ME" | "REMOVE_ITEM";
  substituteProductId?: string;
  substituteProductName?: string;
};

export type PickingDelivery = {
  recipientName: string;
  phone: string;
  addressLine: string;
  neighborhood: string | null;
  postalCode: string;
  cityName: string;
  addressNotes: string | null;
  customerNotes: string | null;
  zoneName: string;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
};

export type PickingTask = {
  id: string;
  orderNumber: string;
  status: PickingTaskStatus;
  priority: number;
  slotDate: string;
  slotStart: string;
  assignedPickerId: string | null;
  pickerName?: string | null;
  delivery?: PickingDelivery | null;
  items: PickingItem[];
};

/** Contrato objetivo: los endpoints /api/picking/tasks de BE picking (PK-002/PK-003). */
export type PickingApi = {
  listMyTasks(): Promise<PickingTask[]>;
  listAvailableTasks(): Promise<PickingTask[]>;
  getTask(id: string): Promise<PickingTask>;
  takeTask(id: string): Promise<PickingTask>;
  assignToMe(id: string): Promise<PickingTask>;
  startTask(id: string): Promise<PickingTask>;
  pickItem(taskId: string, itemId: string, quantity: number, barcode?: string): Promise<PickingTask>;
  recordWeight(taskId: string, itemId: string, grams: number): Promise<PickingTask>;
  reportShortage(taskId: string, itemId: string, resolution: "REPLACE_SIMILAR" | "CONTACT_ME" | "REMOVE_ITEM", substituteProductId?: string, note?: string): Promise<PickingTask>;
  searchProducts(query: string): Promise<Array<{ id: string; name: string; saleMode?: SaleMode }>>;
  completeTask(id: string): Promise<PickingTask>;
};
