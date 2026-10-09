import type { DispatchDelivery } from "./dispatch-contract";
export function validRouteDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function argentinaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function routeSheetHref(id: string, date?: string): string {
  return `/repartidores/${encodeURIComponent(id)}/hoja-de-ruta${date && validRouteDate(date) ? `?date=${date}` : ""}`;
}
export function routeAddress(delivery: DispatchDelivery): string {
  return [delivery.addressLine, delivery.neighborhood, delivery.cityName, delivery.postalCode].filter(Boolean).join(", ");
}
export const routeMoney = (amount: string) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(Number(amount));
