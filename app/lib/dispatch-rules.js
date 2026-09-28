export function moveItem(list, from, to) {
  const copy = [...(list ?? [])];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= copy.length || to < 0 || to >= copy.length || from === to) return copy;
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

const time = (value) => String(value ?? "").slice(0, 5);

export function slotLabel(delivery, now = new Date()) {
  if (!delivery?.slotDate) return "Horario sin confirmar";
  const [year, month, day] = delivery.slotDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const parts = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" }).formatToParts(date);
  const part = (type) => parts.find((value) => value.type === type)?.value.replaceAll(".", "").toLowerCase() ?? "";
  const prefix = date.getTime() === today.getTime() ? "hoy" : `${part("weekday")} ${part("day")} ${part("month")}`;
  return `${prefix} ${time(delivery.slotStart)}–${time(delivery.slotEnd)}`;
}

export function mapsUrl(delivery) {
  const query = [delivery?.addressLine, delivery?.cityName].filter((part) => typeof part === "string" && part.trim()).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function paymentHint(order) {
  if (order?.paymentStatus === "PAID") return "Pagado";
  if (order?.paymentMethod === "CASH") return "Cobra en efectivo";
  if (order?.paymentStatus === "PENDING" && order?.paymentMethod === "BANK_TRANSFER") return "Pago pendiente (transferencia)";
  if (order?.paymentStatus === "PENDING" && order?.paymentMethod === "MERCADO_PAGO") return "Pago pendiente (Mercado Pago)";
  return "Revisar estado del pago";
}
