import { authFetch } from "@/app/lib/http";
import type { DriverApi, DriverDelivery, DriverDeliveryEvent } from "./driver-contract";
import { canMarkDelivered, canReportIncident, canStartDelivery, validateIncidentInput } from "./driver-rules";

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const base = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;

export class DriverApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "DriverApiError";
  }
}

// --- fixture ------------------------------------------------------------

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

// --- HTTP -------------------------------------------------------------
// Real backend: GET /delivery-assignments auto-scopes to the caller when
// they're a DRIVER (no query param needed); the mutation endpoints live
// under /orders/:id/assignment/*, keyed by order id, not assignment id.
// NOTE (real backend limitation, not fixed here): `Driver.id` has no
// column linking it to the auth `User.id` — the assignment-scoping code
// simply assumes a driver's row id equals their user id by convention.
// That only works if whoever creates the Driver row deliberately aligns
// it; there's no schema-level guarantee.

type RawAssignment = { id: string; orderId: string; status: DriverDelivery["status"]; note: string | null; startedAt: string | null; endedAt: string | null };
type RawOrder = { id: string; orderNumber: string; recipientName: string; phone: string; street: string; streetNumber: string; apartment: string | null; deliveryZoneName: string | null; paymentMethod: DriverDelivery["paymentMethod"]; paymentStatus: DriverDelivery["paymentStatus"]; grandTotal: string; status: string };

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) throw new DriverApiError("Iniciá sesión para ver tus entregas.", 401, "unauthenticated");
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
    throw new DriverApiError(message, response.status);
  }
  return payload;
}

function progressFromOrderStatus(status: string, assignmentStatus: DriverDelivery["status"]): DriverDelivery["deliveryProgress"] {
  if (assignmentStatus === "CANCELLED") return "INCIDENCIA";
  if (status === "DELIVERED") return "ENTREGADO";
  if (status === "OUT_FOR_DELIVERY") return "EN_CAMINO";
  return "PENDING";
}

async function adaptAssignment(root: string, raw: RawAssignment, sortOrder: number): Promise<DriverDelivery> {
  const order = (await fetchJson(`${root}/orders/${raw.orderId}`)) as RawOrder;
  const address = [order.street, order.streetNumber].filter(Boolean).join(" ") + (order.apartment ? `, ${order.apartment}` : "");
  const progress = progressFromOrderStatus(order.status, raw.status);
  const events: DriverDeliveryEvent[] = [event(`${raw.id}-assigned`, "PENDING", raw.startedAt ?? new Date(0).toISOString())];
  if (raw.startedAt) events.push(event(`${raw.id}-started`, "EN_CAMINO", raw.startedAt));
  if (raw.endedAt) events.push(event(`${raw.id}-ended`, progress === "ENTREGADO" ? "ENTREGADO" : "INCIDENCIA", raw.endedAt, raw.note ?? undefined));
  return {
    assignmentId: raw.id,
    orderId: order.id,
    orderCode: order.orderNumber,
    customerName: order.recipientName,
    customerPhone: order.phone,
    deliveryAddress: address || "Dirección a confirmar",
    deliveryZone: order.deliveryZoneName ?? "Sin zona",
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: Number(order.grandTotal),
    sortOrder,
    status: raw.status,
    deliveryProgress: progress,
    events,
  };
}

async function listReal(): Promise<DriverDelivery[]> {
  const root = base()!.replace(/\/$/, "");
  const payload = await fetchJson(`${root}/delivery-assignments`);
  const list = Array.isArray(payload) ? (payload as RawAssignment[]) : [];
  return Promise.all(list.map((raw, index) => adaptAssignment(root, raw, index + 1)));
}

export const driverApi: DriverApi = {
  async listMyDeliveries() {
    if (!base()) { await wait(); return fixtureDeliveries.map(clone); }
    return listReal();
  },
  async getDelivery(id) {
    if (!base()) { await wait(); return clone(find(id)); }
    const all = await listReal();
    const delivery = all.find((item) => item.assignmentId === id || item.orderId === id);
    if (!delivery) throw new DriverApiError("La entrega ya no está disponible.", 404, "not_found");
    return delivery;
  },
  async startDelivery(id) {
    if (!base()) {
      await wait(); const delivery = find(id);
      if (!canStartDelivery(delivery)) throw new DriverApiError("Esta entrega no se puede iniciar en su estado actual.", 409, "invalid_transition");
      const next = appendProgress(delivery, "EN_CAMINO"); replace(next); return clone(next);
    }
    const root = base()!.replace(/\/$/, "");
    const { orderId } = await this.getDelivery(id);
    await fetchJson(`${root}/orders/${encodeURIComponent(orderId)}/assignment/start`, { method: "POST", body: JSON.stringify({}) });
    return this.getDelivery(id);
  },
  async markDelivered(id, note) {
    if (!base()) {
      await wait(); const delivery = find(id);
      if (!canMarkDelivered(delivery)) throw new DriverApiError("Primero iniciá el reparto antes de marcar la entrega.", 409, "not_started");
      const next = appendProgress(delivery, "ENTREGADO", note?.trim() || undefined); replace(next); return clone(next);
    }
    const root = base()!.replace(/\/$/, "");
    const { orderId } = await this.getDelivery(id);
    await fetchJson(`${root}/orders/${encodeURIComponent(orderId)}/assignment/deliver`, { method: "POST", body: JSON.stringify(note?.trim() ? { note: note.trim() } : {}) });
    return this.getDelivery(id);
  },
  async reportIncident(id, reason, note) {
    if (!base()) {
      await wait(); const delivery = find(id);
      if (!canReportIncident(delivery)) throw new DriverApiError("Primero iniciá el reparto antes de informar una incidencia.", 409, "not_started");
      const input = validateIncidentInput({ reason, note });
      if (!input.valid) throw new DriverApiError(input.error ?? "Datos de incidencia inválidos.", 400, "invalid_incident");
      const incidentNote = [reason.trim(), note?.trim()].filter(Boolean).join(" — ");
      const next = appendProgress(delivery, "INCIDENCIA", incidentNote); replace(next); return clone(next);
    }
    const input = validateIncidentInput({ reason, note });
    if (!input.valid) throw new DriverApiError(input.error ?? "Datos de incidencia inválidos.", 400, "invalid_incident");
    const root = base()!.replace(/\/$/, "");
    const { orderId } = await this.getDelivery(id);
    await fetchJson(`${root}/orders/${encodeURIComponent(orderId)}/assignment/incident`, { method: "POST", body: JSON.stringify({ reason, ...(note?.trim() ? { note: note.trim() } : {}) }) });
    return this.getDelivery(id);
  },
};
