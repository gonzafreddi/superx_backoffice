import type { UserRole } from "./product-contract";

export type DeliveryChange = { id: string; summary: string; actor: string; role?: UserRole; changedAt: string };

export type DeliverySlot = {
  id: string;
  zoneId: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  capacity: number;
  bookedCount: number;
  active: boolean;
  updatedAt: string;
  history: DeliveryChange[];
};

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

export type SlotInput = {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | "";
  active: boolean;
};

export type SlotUpsertInput = SlotInput & { changedBy: string; changedByRole?: UserRole; reason?: string };

export type DeliveryRole = UserRole;

/** Contrato objetivo: GET/POST/PATCH /api/delivery-zones y GET/POST/PATCH /api/delivery/slots. */
export type DeliveryApi = {
  listZones(): Promise<DeliveryZone[]>;
  createZone(input: ZoneUpdateInput): Promise<DeliveryZone>;
  updateZone(id: string, input: ZoneUpdateInput): Promise<DeliveryZone>;
  listSlots(zoneId: string): Promise<DeliverySlot[]>;
  createSlot(zoneId: string, input: SlotUpsertInput): Promise<DeliverySlot>;
  updateSlot(id: string, input: SlotUpsertInput): Promise<DeliverySlot>;
};
