export function moveItem(list, from, to) {
  const copy = [...(list ?? [])];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= copy.length || to < 0 || to >= copy.length || from === to) return copy;
  const [item] = copy.splice(from, 1); copy.splice(to, 0, item); return copy;
}
const time = (value) => String(value ?? "").slice(0, 5);
export const timeRange = (delivery) => `${time(delivery?.slotStart)} – ${time(delivery?.slotEnd)}`;
export function slotLabel(delivery, now = new Date()) {
  if (!delivery?.slotDate) return "Horario sin confirmar";
  const [year, month, day] = delivery.slotDate.split("-").map(Number); const date = new Date(year, month - 1, day); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const parts = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" }).formatToParts(date); const part = (type) => parts.find((value) => value.type === type)?.value.replaceAll(".", "").toLowerCase() ?? "";
  const prefix = date.getTime() === today.getTime() ? "hoy" : `${part("weekday")} ${part("day")} ${part("month")}`; return `${prefix} ${time(delivery.slotStart)}–${time(delivery.slotEnd)}`;
}
export function mapsUrl(delivery, location) {
  const destination = location && Number.isFinite(location.lat) && Number.isFinite(location.lng) ? `${location.lat},${location.lng}` : [delivery?.addressLine, delivery?.cityName, delivery?.postalCode].filter((v) => typeof v === "string" && v.trim()).join(", ");
  return destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` : null;
}
export function paymentHint(order) {
  if (order?.paymentStatus === "PAID") return "Pago registrado"; if (order?.paymentMethod === "CASH") return "Cobro en efectivo pendiente";
  if (order?.paymentStatus === "PENDING" && order?.paymentMethod === "BANK_TRANSFER") return "Transferencia pendiente de validar";
  if (order?.paymentStatus === "PENDING" && order?.paymentMethod === "MERCADO_PAGO") return "Mercado Pago pendiente de validar"; return "Revisar estado del pago";
}
export const routeOrders = (board) => [...(board?.dispatched ?? []), ...(board?.outForDelivery ?? [])].sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9));
export const filterOrders = (board, filter) => filter === "delivered" ? board.delivered : routeOrders(board);
export const nextStop = (board, afterId) => { const pending = routeOrders(board); if (!afterId) return pending[0] ?? null; const index = pending.findIndex((order) => order.id === afterId); return pending[index + 1] ?? pending.find((order) => order.id !== afterId) ?? null; };
export const progressLabel = (board, orderId) => { const all = [...routeOrders(board), ...(board?.delivered ?? [])].sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9)); const index = all.findIndex((order) => order.id === orderId); return `${Math.max(1, index + 1)} de ${all.length}`; };
export const formatDistance = (meters) => meters >= 1000 ? `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(meters / 1000)} km` : `${Math.round(meters)} m`;
export const formatDuration = (seconds) => { const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`; };
