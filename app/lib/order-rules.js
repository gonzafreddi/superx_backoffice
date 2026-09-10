export const ORDER_PERMISSIONS = { viewer: { transition: false, cancel: false }, operator: { transition: true, cancel: false }, admin: { transition: true, cancel: true } };
export const ORDER_STATUS_LABELS = { CREATED: "Pendiente", CONFIRMED: "Confirmado", PAID: "Pagado", PICKING: "En picking", PACKED: "Empacado", READY: "Listo", OUT_FOR_DELIVERY: "En reparto", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
export const ORDER_TRANSITIONS = { CREATED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PAID", "PICKING", "CANCELLED"], PAID: ["PICKING", "CANCELLED"], PICKING: ["PACKED", "CANCELLED"], PACKED: ["READY"], READY: ["OUT_FOR_DELIVERY"], OUT_FOR_DELIVERY: ["DELIVERED"], DELIVERED: [], CANCELLED: [] };

export function getOrderPermissions(role) { return ORDER_PERMISSIONS[role] ?? ORDER_PERMISSIONS.viewer; }
export function getAvailableOrderTransitions(order) { return (ORDER_TRANSITIONS[order.status] ?? []).filter((status) => !(order.paymentRequired && order.status === "CONFIRMED" && status === "PICKING")); }
export function canTransitionOrder(order, nextStatus) { return getAvailableOrderTransitions(order).includes(nextStatus); }
export function canRoleTransitionOrder(role, order, nextStatus) { const permissions = getOrderPermissions(role); return canTransitionOrder(order, nextStatus) && permissions.transition && (nextStatus !== "CANCELLED" || permissions.cancel); }
export function getOrderDashboardStatus(status) { if (status === "CREATED") return "pending"; if (status === "CONFIRMED" || status === "PAID") return "confirmed"; if (status === "PICKING" || status === "PACKED") return "picking"; if (status === "READY") return "ready"; if (status === "OUT_FOR_DELIVERY") return "delivery"; if (status === "DELIVERED") return "delivered"; return "cancelled"; }

export const ORDER_PAYMENT_METHOD_LABELS = { CASH: "Efectivo", BANK_TRANSFER: "Transferencia", MERCADO_PAGO: "Mercado Pago" };
export const ORDER_PAYMENT_STATUS_LABELS = { PENDING: "Pago pendiente", PAID: "Pago acreditado", FAILED: "Pago rechazado", REFUNDED: "Pago reintegrado" };
export const ORDER_SUBSTITUTION_LABELS = { REPLACE_SIMILAR: "Reemplazar por un producto similar", CONTACT_ME: "Contactar al cliente antes de reemplazar", REMOVE_ITEM: "Quitar el producto del pedido" };

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Human delivery window from an OrderDeliverySlot, e.g. "mié 10 sep · 10:00–12:00". */
export function formatDeliveryWindow(slot) {
  if (!slot || !slot.date) return "Sin franja asignada";
  const parts = String(slot.date).split("-").map(Number);
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) return "Sin franja asignada";
  const [year, month, day] = parts;
  const at = new Date(Date.UTC(year, month - 1, day));
  const start = String(slot.startTime ?? "").slice(0, 5);
  const end = String(slot.endTime ?? "").slice(0, 5);
  const window = start && end ? ` · ${start}–${end}` : "";
  return `${WEEKDAYS[at.getUTCDay()]} ${day} ${MONTHS[month - 1]}${window}`;
}

/** Server-owned charge breakdown; the backoffice only renders it and flags an inconsistency. */
export function summarizeOrderCharges(order) {
  const charges = order.charges ?? { subtotal: order.total ?? 0, deliveryFee: 0, discount: 0 };
  const computed = Number(charges.subtotal ?? 0) + Number(charges.deliveryFee ?? 0) - Number(charges.discount ?? 0);
  return {
    subtotal: Number(charges.subtotal ?? 0),
    deliveryFee: Number(charges.deliveryFee ?? 0),
    discount: Number(charges.discount ?? 0),
    total: Number(order.total ?? computed),
    balanced: Math.abs(computed - Number(order.total ?? computed)) < 0.01,
  };
}

/** Copy for the confirmation dialog; sensitive actions (cancellation) are flagged as dangerous. */
export function describeOrderTransition(order, nextStatus) {
  const label = (ORDER_STATUS_LABELS[nextStatus] ?? nextStatus).toLocaleLowerCase("es-AR");
  if (nextStatus === "CANCELLED") {
    return { danger: true, title: "¿Cancelar pedido?", body: `Vas a cancelar ${order.code}. Esta acción detiene el flujo operativo y queda registrada en el historial con tu usuario y la hora.` };
  }
  return { danger: false, title: "¿Actualizar pedido?", body: `Vas a marcar ${order.code} como ${label}. El cambio queda registrado en el historial con tu usuario y la hora.` };
}

/** Builds the audit event appended on every transition: status, actor, role, timestamp and optional note. */
export function buildOrderTransitionEvent(input, occurredAt, id) {
  const note = typeof input.note === "string" ? input.note.trim() : "";
  return {
    id: id ?? `oe-${occurredAt}`,
    status: input.status,
    occurredAt,
    actor: input.performedBy,
    ...(input.performedByRole ? { role: input.performedByRole } : {}),
    ...(note ? { note } : {}),
  };
}
