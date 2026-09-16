import type { DriverApi, DriverDelivery, DriverDeliveryEvent } from "./driver-contract";
import { canMarkDelivered, canReportIncident, canStartDelivery, validateIncidentInput } from "./driver-rules";

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class DriverApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "DriverApiError";
  }
}

// --- fixture ------------------------------------------------------------
// Mock TEMPORAL: LG-003/LG-004 todavía no exponen mutaciones para repartidor.
// Este adaptador queda intencionalmente 100% en memoria hasta esa integración.

const event = (id: string, progress: DriverDeliveryEvent["progress"], occurredAt: string, note?: string): DriverDeliveryEvent => ({ id, progress, occurredAt, ...(note ? { note } : {}) });

let fixtureDeliveries: DriverDelivery[] = [
  { assignmentId: "da-1", orderId: "order-1048", orderCode: "SX-1048", customerName: "Ana Gómez", customerPhone: "+54 9 11 5555-0101", deliveryAddress: "Av. Cabildo 1820, 4° B", deliveryZone: "Belgrano", paymentMethod: "CASH", paymentStatus: "PENDING", total: 7850, sortOrder: 1, status: "ACTIVE", deliveryProgress: "PENDING", note: "Timbre 4B", events: [event("de-1", "PENDING", "2026-09-16T11:00:00-03:00", "Asignación recibida")] },
  { assignmentId: "da-2", orderId: "order-1051", orderCode: "SX-1051", customerName: "Marcos Ruiz", customerPhone: "+54 9 11 5555-0102", deliveryAddress: "Moldes 2480", deliveryZone: "Colegiales", paymentMethod: "MERCADO_PAGO", paymentStatus: "PAID", total: 12400, sortOrder: 2, status: "ACTIVE", deliveryProgress: "EN_CAMINO", events: [event("de-2", "PENDING", "2026-09-16T11:05:00-03:00", "Asignación recibida"), event("de-3", "EN_CAMINO", "2026-09-16T11:36:00-03:00")] },
  { assignmentId: "da-3", orderId: "order-1055", orderCode: "SX-1055", customerName: "Lucía Fernández", customerPhone: "+54 9 11 5555-0103", deliveryAddress: "Amenábar 910", deliveryZone: "Palermo", paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID", total: 5690, sortOrder: 3, status: "COMPLETED", deliveryProgress: "ENTREGADO", events: [event("de-4", "PENDING", "2026-09-16T10:25:00-03:00", "Asignación recibida"), event("de-5", "EN_CAMINO", "2026-09-16T10:54:00-03:00"), event("de-6", "ENTREGADO", "2026-09-16T11:16:00-03:00", "Recibió en puerta") ] },
  { assignmentId: "da-4", orderId: "order-1060", orderCode: "SX-1060", customerName: "Sofía Pérez", customerPhone: "+54 9 11 5555-0104", deliveryAddress: "Zapata 322", deliveryZone: "Colegiales", paymentMethod: "CASH", paymentStatus: "PENDING", total: 9300, sortOrder: 4, status: "ACTIVE", deliveryProgress: "INCIDENCIA", events: [event("de-7", "PENDING", "2026-09-16T09:40:00-03:00", "Asignación recibida"), event("de-8", "EN_CAMINO", "2026-09-16T10:08:00-03:00"), event("de-9", "INCIDENCIA", "2026-09-16T10:26:00-03:00", "Cliente ausente — Se llamó sin respuesta") ] },
];

const clone = (delivery: DriverDelivery): DriverDelivery => ({ ...delivery, events: delivery.events.map((item) => ({ ...item })) });
const find = (id: string) => {
  const delivery = fixtureDeliveries.find((item) => item.assignmentId === id || item.orderId === id);
  if (!delivery) throw new DriverApiError("La entrega ya no está disponible.", 404, "not_found");
  return delivery;
};
const replace = (delivery: DriverDelivery) => { fixtureDeliveries = fixtureDeliveries.map((item) => item.assignmentId === delivery.assignmentId ? delivery : item); };
const appendProgress = (delivery: DriverDelivery, progress: DriverDelivery["deliveryProgress"], note?: string): DriverDelivery => {
  const occurredAt = new Date().toISOString();
  return { ...clone(delivery), deliveryProgress: progress, status: progress === "ENTREGADO" ? "COMPLETED" : delivery.status, events: [...delivery.events, event(`de-${occurredAt}`, progress, occurredAt, note)] };
};

export const driverApi: DriverApi = {
  async listMyDeliveries() { await wait(); return fixtureDeliveries.map(clone); },
  async getDelivery(id) { await wait(); return clone(find(id)); },
  async startDelivery(id) {
    await wait(); const delivery = find(id);
    if (!canStartDelivery(delivery)) throw new DriverApiError("Esta entrega no se puede iniciar en su estado actual.", 409, "invalid_transition");
    const next = appendProgress(delivery, "EN_CAMINO"); replace(next); return clone(next);
  },
  async markDelivered(id, note) {
    await wait(); const delivery = find(id);
    if (!canMarkDelivered(delivery)) throw new DriverApiError("Primero iniciá el reparto antes de marcar la entrega.", 409, "not_started");
    const next = appendProgress(delivery, "ENTREGADO", note?.trim() || undefined); replace(next); return clone(next);
  },
  async reportIncident(id, reason, note) {
    await wait(); const delivery = find(id);
    if (!canReportIncident(delivery)) throw new DriverApiError("Primero iniciá el reparto antes de informar una incidencia.", 409, "not_started");
    const input = validateIncidentInput({ reason, note });
    if (!input.valid) throw new DriverApiError(input.error ?? "Datos de incidencia inválidos.", 400, "invalid_incident");
    const incidentNote = [reason.trim(), note?.trim()].filter(Boolean).join(" — ");
    const next = appendProgress(delivery, "INCIDENCIA", incidentNote); replace(next); return clone(next);
  },
};
