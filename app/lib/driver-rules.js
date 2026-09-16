import { ORDER_PAYMENT_METHOD_LABELS } from "./order-rules.js";

export const INCIDENT_REASONS = ["Cliente ausente", "Dirección incorrecta", "Rechazado por el cliente", "Otro"];
export const INCIDENT_NOTE_MAX_LENGTH = 280;

/** Orden sugerido cargado manualmente; no calcula rutas ni usa geolocalización. */
export function sortDeliveries(deliveries) {
  return [...(deliveries ?? [])].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) || String(a.orderCode ?? "").localeCompare(String(b.orderCode ?? "")));
}

export function canStartDelivery(delivery) { return delivery?.deliveryProgress === "PENDING"; }
export function canMarkDelivered(delivery) { return delivery?.deliveryProgress === "EN_CAMINO"; }
export function canReportIncident(delivery) { return delivery?.deliveryProgress === "EN_CAMINO"; }

export function getAvailableActions(delivery) {
  if (canStartDelivery(delivery)) return ["start"];
  if (canMarkDelivered(delivery)) return ["delivered", "incident"];
  return [];
}

export function validateIncidentInput({ reason, note }) {
  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  const normalizedNote = typeof note === "string" ? note.trim() : "";
  if (!INCIDENT_REASONS.includes(normalizedReason)) return { valid: false, error: "Elegí un motivo de incidencia." };
  if (normalizedNote.length > INCIDENT_NOTE_MAX_LENGTH) return { valid: false, error: `La nota no puede superar ${INCIDENT_NOTE_MAX_LENGTH} caracteres.` };
  return { valid: true };
}

export function describeDeliveryProgress(progress) {
  return { PENDING: "Pendiente", EN_CAMINO: "En camino", ENTREGADO: "Entregado", INCIDENCIA: "Con incidencia" }[progress] ?? "Sin estado";
}

export function formatPaymentSummary(delivery) {
  const payment = ORDER_PAYMENT_METHOD_LABELS[delivery?.paymentMethod] ?? "Forma de pago no informada";
  const total = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(delivery?.total ?? 0));
  return `${payment} · ${total}`;
}
