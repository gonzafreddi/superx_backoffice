import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
import { listDrivers } from "./driver-admin-api";
import { argentinaToday, validRouteDate } from "./route-sheet-rules";
import type { RouteSheet } from "./route-sheet-contract";

export async function getRouteSheet(id: string, date?: string, signal?: AbortSignal): Promise<RouteSheet> {
  if (date !== undefined && !validRouteDate(date)) throw new Error("La fecha debe ser válida (AAAA-MM-DD).");
  if (fixturesEnabled()) {
    const driver = (await listDrivers()).find(d => d.id === id);
    if (!driver) throw new Error("Repartidor no encontrado.");
    const day = date ?? argentinaToday();
    return { driver, date: day, stops: [
      { stopNumber: 1, orderId: "route-fixture-1", orderNumber: "PED-DEMO-001", delivery: { recipientName: "Ana Gómez", phone: "2474551234", addressLine: "San Martín 125, piso 1", neighborhood: "Centro", postalCode: "2700", cityName: "Pergamino", addressNotes: "Timbre de la izquierda", customerNotes: "Llamar al llegar", zoneName: "Centro", slotDate: day, slotStart: "09:00", slotEnd: "12:00" }, itemCount: 3, packageCount: 4, paymentMethod: "CASH", paymentStatus: "PENDING", amountToCollect: "12500.50" },
      { stopNumber: 2, orderId: "route-fixture-2", orderNumber: "PED-DEMO-002", delivery: { recipientName: "José Díaz", phone: "2474555678", addressLine: "Belgrano 480", neighborhood: null, postalCode: "2700", cityName: "Pergamino", addressNotes: null, customerNotes: null, zoneName: "Centro", slotDate: day, slotStart: "12:00", slotEnd: "15:00" }, itemCount: 2, packageCount: 2, paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID", amountToCollect: "0.00" },
    ], totals: { cash: "12500.50", other: "0.00", total: "12500.50" } };
  }
  const response = await authFetch(`${apiBaseUrl()!.replace(/\/$/, "")}/drivers/${encodeURIComponent(id)}/route-sheet${date ? `?date=${date}` : ""}`, { signal, headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.message === "string" ? payload.message : "No pudimos cargar la hoja de ruta.");
  if (!payload?.driver || !Array.isArray(payload.stops) || !payload.totals || !validRouteDate(payload.date)) throw new Error("La respuesta de la hoja de ruta es inválida.");
  return { ...payload, driver: { ...payload.driver, id: String(payload.driver.id) }, stops: payload.stops.map((stop: RouteSheet["stops"][number]) => ({ ...stop, orderId: String(stop.orderId) })) };
}
