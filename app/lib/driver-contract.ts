import type { OrderPaymentMethod, OrderPaymentStatus } from "./order-contract";

/** Estado de la asignación en el backend; no representa el avance operativo del repartidor. */
export type DeliveryAssignmentStatus = "ACTIVE" | "REASSIGNED" | "CANCELLED" | "COMPLETED";
export type DeliveryProgress = "PENDING" | "EN_CAMINO" | "ENTREGADO" | "INCIDENCIA";

export type DriverDeliveryEvent = {
  id: string;
  progress: DeliveryProgress;
  occurredAt: string;
  note?: string;
};

/** Vista que compone la asignación con los datos de entrega del pedido. */
export type DriverDelivery = {
  assignmentId: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryZone: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  total: number;
  sortOrder: number;
  status: DeliveryAssignmentStatus;
  deliveryProgress: DeliveryProgress;
  note?: string;
  events: DriverDeliveryEvent[];
};

/** Contrato objetivo del panel; mientras LG-003/LG-004 no existan usa fixture local. */
export type DriverApi = {
  listMyDeliveries(): Promise<DriverDelivery[]>;
  getDelivery(id: string): Promise<DriverDelivery>;
  startDelivery(id: string): Promise<DriverDelivery>;
  markDelivered(id: string, note?: string): Promise<DriverDelivery>;
  reportIncident(id: string, reason: string, note?: string): Promise<DriverDelivery>;
};
