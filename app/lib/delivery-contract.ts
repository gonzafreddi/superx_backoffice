import type { UserRole } from "./product-contract";

export type DeliveryChange = { id: string; summary: string; actor: string; role?: UserRole; changedAt: string };

/** A recurring delivery window ("horario de reparto"): the checkout offers it on those weekdays, with no capacity limit. */
export type DeliveryWindow = {
  id: string;
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  weekdays: number[];  // 0 = domingo … 6 = sábado
  active: boolean;
};

export type WindowInput = Omit<DeliveryWindow, "id">;

export type DeliveryZone = {
  id: string;
  name: string;
  cityName: string;
  postalCodes: string[];
  neighborhoods: string[];
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
  priority: number;
  active: boolean;
  updatedAt: string;
  history: DeliveryChange[];
};

export type ZoneInput = {
  name: string;
  cityName: string;
  postalCodes: string[];
  neighborhoods: string[];
  deliveryFee: number | "";
  freeDeliveryThreshold: number | "" | null;
  priority: number | "";
  active: boolean;
};

export type ZoneUpdateInput = ZoneInput & { changedBy: string; changedByRole?: UserRole; reason?: string };

export type DeliveryRole = UserRole;

/** Contrato: GET/POST/PATCH /delivery-zones y GET/POST/PATCH/DELETE /delivery/windows. */
export type DeliveryApi = {
  listZones(): Promise<DeliveryZone[]>;
  createZone(input: ZoneUpdateInput): Promise<DeliveryZone>;
  updateZone(id: string, input: ZoneUpdateInput): Promise<DeliveryZone>;
  listWindows(): Promise<DeliveryWindow[]>;
  createWindow(input: WindowInput): Promise<DeliveryWindow>;
  updateWindow(id: string, input: WindowInput): Promise<DeliveryWindow>;
  deleteWindow(id: string): Promise<void>;
};
