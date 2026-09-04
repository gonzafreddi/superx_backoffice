import type { UserRole } from "./product-contract";

export type OrderStatus = "CREATED" | "CONFIRMED" | "PAID" | "PICKING" | "PACKED" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type OrderLine = { id: string; productName: string; quantity: number; unitPrice: number };
export type OrderEvent = { id: string; status: OrderStatus; occurredAt: string; actor: string; note?: string };
export type Order = { id: string; code: string; customerName: string; customerPhone: string; deliveryAddress: string; createdAt: string; updatedAt: string; status: OrderStatus; paymentRequired: boolean; total: number; lines: OrderLine[]; events: OrderEvent[] };
export type OrderFilters = { query?: string; status?: "all" | OrderStatus; from?: string; to?: string };
export type OrderTransitionInput = { status: OrderStatus; performedBy: string; note?: string };

/** Contrato objetivo: GET /api/orders y POST /api/orders/:id/transition. */
export type OrderApi = { listOrders(filters?: OrderFilters): Promise<Order[]>; transitionOrder(id: string, input: OrderTransitionInput): Promise<Order> };
export type OrderPermissions = { transition: boolean; cancel: boolean };
export type OrderRole = UserRole;
