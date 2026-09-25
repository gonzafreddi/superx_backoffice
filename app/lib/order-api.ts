import { authFetch } from "@/app/lib/http";
import type { Order, OrderApi, OrderEvent, OrderFilters, OrderLine, OrderTransitionInput } from "./order-contract";
import { buildOrderTransitionEvent, canSubmitOrderTransition, canTransitionOrder } from "./order-rules";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const line = (id: string, productName: string, quantity: number, unitPrice: number, substitution: OrderLine["substitution"] = null): OrderLine => ({ id, productName, quantity, unitPrice, substitution });
const event = (id: string, status: Order["status"], occurredAt: string, actor: string, role?: Order["events"][number]["role"], note?: string) => ({ id, status, occurredAt, actor, ...(role ? { role } : {}), ...(note ? { note } : {}) });
const charges = (subtotal: number, deliveryFee: number, discount: number) => ({ subtotal, deliveryFee, discount });
const slot = (date: string, startTime: string, endTime: string) => ({ date, startTime, endTime });

let orders: Order[] = [
  { id: "ord-001", code: "SX-1048", customerName: "Lucía Fernández", customerPhone: "11 5555-0182", deliveryAddress: "Av. Rivadavia 2250, CABA", deliveryZone: "Caballito", deliverySlot: slot("2026-09-05", "10:00", "12:00"), createdAt: "2026-09-04T09:10:00.000Z", updatedAt: "2026-09-04T09:10:00.000Z", status: "CREATED", paymentRequired: false, payment: { method: "CASH", status: "PENDING" }, substitutionPreference: "REPLACE_SIMILAR", customerNotes: "Tocar timbre 2 veces.", charges: charges(7350, 500, 0), total: 7850, lines: [line("ol-1", "Yerba mate tradicional 500 g", 2, 2850), line("ol-2", "Agua mineral sin gas 1,5 L", 3, 550)], events: [event("oe-1", "CREATED", "2026-09-04T09:10:00.000Z", "Tienda online", undefined, "order placed")] },
  { id: "ord-002", code: "SX-1047", customerName: "Martín Ríos", customerPhone: "11 5555-0274", deliveryAddress: "Amenábar 1550, CABA", deliveryZone: "Belgrano", deliverySlot: slot("2026-09-05", "14:00", "16:00"), createdAt: "2026-09-04T08:35:00.000Z", updatedAt: "2026-09-04T09:02:00.000Z", status: "CONFIRMED", paymentRequired: true, payment: { method: "BANK_TRANSFER", status: "PENDING" }, substitutionPreference: "CONTACT_ME", customerNotes: null, charges: charges(12400, 0, 0), total: 12400, lines: [line("ol-3", "Jugo de naranja 1 L", 4, 3100)], events: [event("oe-2", "CREATED", "2026-09-04T08:35:00.000Z", "Tienda online", undefined, "order placed"), event("oe-3", "CONFIRMED", "2026-09-04T09:02:00.000Z", "María González", "operator")] },
  { id: "ord-003", code: "SX-1046", customerName: "Sofía Acosta", customerPhone: "11 5555-0389", deliveryAddress: "Laprida 480, CABA", deliveryZone: "Recoleta", deliverySlot: slot("2026-09-04", "16:00", "18:00"), createdAt: "2026-09-04T08:04:00.000Z", updatedAt: "2026-09-04T09:20:00.000Z", status: "PICKING", paymentRequired: true, payment: { method: "MERCADO_PAGO", status: "PAID" }, substitutionPreference: "REPLACE_SIMILAR", customerNotes: "Dejar en portería si no atiende.", charges: charges(9200, 0, 0), total: 9200, lines: [line("ol-4", "Agua mineral sin gas 1,5 L", 8, 550), line("ol-5", "Yerba mate tradicional 500 g", 1, 2850, { replacedBy: "Yerba mate orgánica 500 g", note: "Faltante en góndola; precio equivalente." })], events: [event("oe-4", "PAID", "2026-09-04T08:50:00.000Z", "Pasarela de pagos", undefined, "Pago acreditado"), event("oe-5", "PICKING", "2026-09-04T09:20:00.000Z", "María González", "operator")] },
  { id: "ord-004", code: "SX-1045", customerName: "Diego Morales", customerPhone: "11 5555-0493", deliveryAddress: "Cochabamba 720, CABA", deliveryZone: "San Telmo", deliverySlot: slot("2026-09-04", "18:00", "20:00"), createdAt: "2026-09-04T07:30:00.000Z", updatedAt: "2026-09-04T09:45:00.000Z", status: "READY", paymentRequired: false, payment: { method: "CASH", status: "PENDING" }, substitutionPreference: "REMOVE_ITEM", customerNotes: null, charges: charges(5100, 500, 0), total: 5600, lines: [line("ol-6", "Jugo de naranja 1 L", 1, 3100), line("ol-7", "Agua mineral sin gas 1,5 L", 2, 1000)], events: [event("oe-6a", "CONFIRMED", "2026-09-04T07:40:00.000Z", "María González", "operator"), event("oe-6", "READY", "2026-09-04T09:45:00.000Z", "Jorge Núñez", "operator")] },
  { id: "ord-005", code: "SX-1044", customerName: "Carla Suárez", customerPhone: "11 5555-0501", deliveryAddress: "Cabildo 980, CABA", deliveryZone: "Belgrano", deliverySlot: slot("2026-09-04", "12:00", "14:00"), createdAt: "2026-09-04T07:10:00.000Z", updatedAt: "2026-09-04T09:05:00.000Z", status: "OUT_FOR_DELIVERY", paymentRequired: false, payment: { method: "CASH", status: "PENDING" }, substitutionPreference: "REPLACE_SIMILAR", customerNotes: null, charges: charges(6800, 500, 0), total: 7300, lines: [line("ol-8", "Yerba mate tradicional 500 g", 2, 2850)], events: [event("oe-7", "OUT_FOR_DELIVERY", "2026-09-04T09:05:00.000Z", "Reparto Norte", "operator")] },
  { id: "ord-006", code: "SX-1043", customerName: "Ana Pérez", customerPhone: "11 5555-0620", deliveryAddress: "Humboldt 1350, CABA", deliveryZone: "Palermo", deliverySlot: slot("2026-09-03", "18:00", "20:00"), createdAt: "2026-09-03T17:15:00.000Z", updatedAt: "2026-09-03T19:02:00.000Z", status: "DELIVERED", paymentRequired: true, payment: { method: "MERCADO_PAGO", status: "PAID" }, substitutionPreference: "CONTACT_ME", customerNotes: null, charges: charges(4500, 0, 0), total: 4500, lines: [line("ol-9", "Agua mineral sin gas 1,5 L", 6, 750)], events: [event("oe-8", "DELIVERED", "2026-09-03T19:02:00.000Z", "Reparto Norte", "operator")] },
  { id: "ord-007", code: "SX-1042", customerName: "Pedro Díaz", customerPhone: "11 5555-0711", deliveryAddress: "Mendoza 225, CABA", deliveryZone: "Núñez", deliverySlot: null, createdAt: "2026-09-03T16:40:00.000Z", updatedAt: "2026-09-03T16:48:00.000Z", status: "CANCELLED", paymentRequired: false, payment: { method: "CASH", status: "REFUNDED" }, substitutionPreference: "REPLACE_SIMILAR", customerNotes: null, charges: charges(3100, 0, 0), total: 3100, lines: [line("ol-10", "Jugo de naranja 1 L", 1, 3100)], events: [event("oe-9a", "CREATED", "2026-09-03T16:40:00.000Z", "Tienda online"), event("oe-9", "CANCELLED", "2026-09-03T16:48:00.000Z", "María González", "admin", "Cliente pidió cancelar por demora.")] },
];

const notFound = () => new Error("El pedido ya no está disponible. Actualizá el listado e intentá nuevamente.");
const clone = (order: Order): Order => ({ ...order, payment: { ...order.payment }, charges: { ...order.charges }, deliverySlot: order.deliverySlot ? { ...order.deliverySlot } : null, lines: order.lines.map((item) => ({ ...item, substitution: item.substitution ? { ...item.substitution } : null })), events: order.events.map((entry) => ({ ...entry })) });

function baseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; }

type RawOrderItem = { id: string; productName: string; quantity: number; unitPrice: string };
type RawOrder = {
  id: string; orderNumber: string; status: Order["status"];
  recipientName: string; phone: string; street: string; streetNumber: string; apartment: string | null; postalCode: string;
  deliveryZoneName: string | null; deliverySlotId: string | null; slotDate: string | null; slotStart: string | null; slotEnd: string | null;
  createdAt: string; updatedAt: string; paymentMethod: Order["payment"]["method"]; paymentStatus: Order["payment"]["status"];
  substitutionPreference: Order["substitutionPreference"]; customerNotes: string | null;
  itemsSubtotal: string; deliveryFee: string; discountTotal: string; grandTotal: string; items: RawOrderItem[];
};
type RawOrderEvent = { id: string; toStatus: Order["status"]; actorUserId: string; actorRole: string; note: string | null; createdAt: string };

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
    throw new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta de administración." : message);
  }
  return payload;
}

function adaptEvent(raw: RawOrderEvent): OrderEvent {
  return { id: raw.id, status: raw.toStatus, occurredAt: raw.createdAt, actor: `Usuario #${raw.actorUserId}`, role: raw.actorRole as OrderEvent["role"], ...(raw.note ? { note: raw.note } : {}) };
}

function adaptOrder(raw: RawOrder, events: RawOrderEvent[]): Order {
  const addressParts = [raw.street, raw.streetNumber].filter(Boolean).join(" ") + (raw.apartment ? `, ${raw.apartment}` : "") + (raw.postalCode ? ` (CP ${raw.postalCode})` : "");
  return {
    id: raw.id,
    code: raw.orderNumber,
    customerName: raw.recipientName,
    customerPhone: raw.phone,
    deliveryAddress: addressParts || "Dirección a confirmar",
    deliveryZone: raw.deliveryZoneName ?? "Sin zona",
    deliverySlot: raw.slotDate && raw.slotStart && raw.slotEnd ? { date: raw.slotDate, startTime: raw.slotStart.slice(0, 5), endTime: raw.slotEnd.slice(0, 5) } : null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    status: raw.status,
    // No explicit "requires payment confirmation" flag on the backend — a non-cash method is the closest proxy.
    paymentRequired: raw.paymentMethod !== "CASH",
    payment: { method: raw.paymentMethod, status: raw.paymentStatus },
    substitutionPreference: raw.substitutionPreference,
    customerNotes: raw.customerNotes,
    charges: charges(Number(raw.itemsSubtotal), Number(raw.deliveryFee), Number(raw.discountTotal)),
    total: Number(raw.grandTotal),
    // Picking-time substitutions aren't exposed on this endpoint (only via the picking module, not wired here).
    lines: raw.items.map((item) => line(item.id, item.productName, item.quantity, Number(item.unitPrice))),
    events: events.map(adaptEvent),
  };
}

async function fetchOrderWithEvents(root: string, id: string): Promise<Order> {
  const [orderPayload, eventsPayload] = await Promise.all([
    fetchJson(`${root}/orders/${encodeURIComponent(id)}`),
    fetchJson(`${root}/orders/${encodeURIComponent(id)}/events`),
  ]);
  return adaptOrder(orderPayload as RawOrder, eventsPayload as RawOrderEvent[]);
}

export const orderApi: OrderApi = {
  async listOrders(filters: OrderFilters = {}) {
    const url = baseUrl();
    if (!url) {
      await wait();
      const query = filters.query?.trim().toLocaleLowerCase("es-AR") ?? "";
      return orders
        .filter((order) => (!query || [order.code, order.customerName].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.status || filters.status === "all" || order.status === filters.status) && (!filters.from || order.createdAt.slice(0, 10) >= filters.from) && (!filters.to || order.createdAt.slice(0, 10) <= filters.to))
        .map(clone);
    }
    const root = url.replace(/\/$/, "");
    const params = new URLSearchParams({ scope: "all", pageSize: "100" });
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    const payload = (await fetchJson(`${root}/orders?${params}`)) as { items?: RawOrder[] };
    const items = payload.items ?? [];
    const withEvents = await Promise.all(items.map(async (raw) => {
      const eventsPayload = (await fetchJson(`${root}/orders/${raw.id}/events`)) as RawOrderEvent[];
      return adaptOrder(raw, eventsPayload);
    }));
    const query = filters.query?.trim().toLocaleLowerCase("es-AR") ?? "";
    return withEvents.filter((order) => (!query || [order.code, order.customerName].some((value) => value.toLocaleLowerCase("es-AR").includes(query))) && (!filters.from || order.createdAt.slice(0, 10) >= filters.from) && (!filters.to || order.createdAt.slice(0, 10) <= filters.to));
  },
  async getOrder(id: string) {
    const url = baseUrl();
    if (!url) { await wait(); const order = orders.find((candidate) => candidate.id === id); if (!order) throw notFound(); return clone(order); }
    return fetchOrderWithEvents(url.replace(/\/$/, ""), id);
  },
  async transitionOrder(id: string, input: OrderTransitionInput) {
    const url = baseUrl();
    if (!url) {
      await wait();
      const order = orders.find((candidate) => candidate.id === id);
      if (!order) throw notFound();
      if (!canTransitionOrder(order, input.status)) throw new Error("El pedido cambió de estado y esta operación ya no está permitida. Actualizá el listado.");
      if (!canSubmitOrderTransition(order, input.status, input.checklist)) throw new Error("Completá el checklist de empaque (ítems verificados, embalaje sellado, etiqueta colocada) antes de marcar el pedido como listo.");
      const occurredAt = new Date().toISOString();
      const auditEvent = buildOrderTransitionEvent(input, occurredAt, `oe-${crypto.randomUUID()}`);
      const updated: Order = { ...order, status: input.status, updatedAt: occurredAt, events: [...order.events, auditEvent] };
      orders = orders.map((candidate) => (candidate.id === id ? updated : candidate));
      return clone(updated);
    }
    const root = url.replace(/\/$/, "");
    await fetchJson(`${root}/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status: input.status, ...(input.note?.trim() ? { note: input.note.trim() } : {}), ...(input.checklist ? { checklist: input.checklist } : {}) }) });
    return fetchOrderWithEvents(root, id);
  },
};
