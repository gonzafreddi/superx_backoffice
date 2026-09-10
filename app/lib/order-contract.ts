import type { UserRole } from "./product-contract";

export type OrderStatus = "CREATED" | "CONFIRMED" | "PAID" | "PICKING" | "PACKED" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type OrderPaymentMethod = "CASH" | "BANK_TRANSFER" | "MERCADO_PAGO";
export type OrderPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type OrderSubstitutionPreference = "REPLACE_SIMILAR" | "CONTACT_ME" | "REMOVE_ITEM";

export type OrderLineSubstitution = { replacedBy: string; note?: string };
export type OrderLine = { id: string; productName: string; quantity: number; unitPrice: number; substitution?: OrderLineSubstitution | null };
export type OrderEvent = { id: string; status: OrderStatus; occurredAt: string; actor: string; role?: OrderRole; note?: string };
export type OrderDeliverySlot = { date: string; startTime: string; endTime: string };
export type OrderCharges = { subtotal: number; deliveryFee: number; discount: number };

export type Order = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryZone: string;
  deliverySlot: OrderDeliverySlot | null;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentRequired: boolean;
  payment: { method: OrderPaymentMethod; status: OrderPaymentStatus };
  substitutionPreference: OrderSubstitutionPreference;
  customerNotes: string | null;
  charges: OrderCharges;
  total: number;
  lines: OrderLine[];
  events: OrderEvent[];
};

export type OrderFilters = { query?: string; status?: "all" | OrderStatus; from?: string; to?: string };
export type OrderTransitionInput = { status: OrderStatus; performedBy: string; performedByRole?: OrderRole; note?: string };

/** Contrato objetivo: GET /api/orders, GET /api/orders/:id y PATCH /api/orders/:id/status. */
export type OrderApi = {
  listOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrder(id: string): Promise<Order>;
  transitionOrder(id: string, input: OrderTransitionInput): Promise<Order>;
};

export type OrderPermissions = { transition: boolean; cancel: boolean };
export type OrderRole = UserRole;

export const ORDER_PERMISSIONS = { viewer: { transition: false, cancel: false }, operator: { transition: true, cancel: false }, admin: { transition: true, cancel: true } };
export const ORDER_STATUS_LABELS = { CREATED: "Pendiente", CONFIRMED: "Confirmado", PAID: "Pagado", PICKING: "En picking", PACKED: "Empacado", READY: "Listo", OUT_FOR_DELIVERY: "En reparto", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
export const ORDER_TRANSITIONS = { CREATED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PAID", "PICKING", "CANCELLED"], PAID: ["PICKING", "CANCELLED"], PICKING: ["PACKED", "CANCELLED"], PACKED: ["READY"], READY: ["OUT_FOR_DELIVERY"], OUT_FOR_DELIVERY: ["DELIVERED"], DELIVERED: [], CANCELLED: [] };
export const ORDER_PAYMENT_METHOD_LABELS = { CASH: "Efectivo", BANK_TRANSFER: "Transferencia", MERCADO_PAGO: "Mercado Pago" };
export const ORDER_PAYMENT_STATUS_LABELS = { PENDING: "Pago pendiente", PAID: "Pago acreditado", FAILED: "Pago rechazado", REFUNDED: "Pago reintegrado" };
export const ORDER_SUBSTITUTION_LABELS = { REPLACE_SIMILAR: "Reemplazar por un producto similar", CONTACT_ME: "Contactar al cliente antes de reemplazar", REMOVE_ITEM: "Quitar el producto del pedido" };
