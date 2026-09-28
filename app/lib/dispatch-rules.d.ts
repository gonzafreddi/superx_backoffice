import type { DispatchDelivery, DispatchOrder } from "./dispatch-contract";
export function moveItem<T>(list: T[], from: number, to: number): T[];
export function slotLabel(delivery: Pick<DispatchDelivery, "slotDate" | "slotStart" | "slotEnd"> | null | undefined, now?: Date): string;
export function mapsUrl(delivery: Pick<DispatchDelivery, "addressLine" | "cityName"> | null | undefined): string | null;
export function paymentHint(order: Pick<DispatchOrder, "paymentMethod" | "paymentStatus">): string;
