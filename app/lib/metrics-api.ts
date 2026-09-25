import { authFetch } from "@/app/lib/http";
import type { KpiSnapshot, MetricsApi, MetricsRange } from "./metrics-contract";
import { rangeDays, validateRange } from "./metrics-rules";

function baseUrl(): string | undefined { return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; }

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));

/** Deterministic pseudo-data so the mock is stable per range. */
function seeded(range: MetricsRange): KpiSnapshot | null {
  const days = rangeDays(range);
  if (days === 0) return null;
  // "Sin datos" para rangos muy cortos, para ejercitar el estado vacío.
  if (days <= 1) {
    return { range, generatedAt: new Date().toISOString(), currency: "ARS", orderCount: 0, ordersPerDay: [{ date: range.to, count: 0 }], gmv: 0, averageTicket: 0, cancellations: { count: 0, rate: 0 }, stockouts: 0, fillRate: null, operationalTimes: null };
  }
  const ordersPerDay = Array.from({ length: Math.min(days, 31) }, (_, index) => {
    const date = new Date(Date.parse(`${range.from}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10);
    return { date, count: 18 + ((index * 7) % 11) };
  });
  const orderCount = ordersPerDay.reduce((sum, day) => sum + day.count, 0);
  const gmv = orderCount * 8650;
  const cancellations = { count: Math.round(orderCount * 0.04), rate: 0.04 };
  return {
    range,
    generatedAt: new Date().toISOString(),
    currency: "ARS",
    orderCount,
    ordersPerDay,
    gmv,
    averageTicket: Math.round(gmv / orderCount),
    cancellations,
    stockouts: 6,
    fillRate: 0.965,
    operationalTimes: { pickingMinutes: 22, deliveryMinutes: 41 },
  };
}

export const metricsApi: MetricsApi = {
  async getOverview(range: MetricsRange) {
    const message = Object.values(validateRange(range))[0] as string | undefined;
    if (message) throw new Error(message);
    const url = baseUrl();
    if (!url) { await wait(); return seeded(range); }
    const root = url.replace(/\/$/, "");
    const response = await authFetch(`${root}/metrics/overview?from=${range.from}&to=${range.to}`, { headers: { Accept: "application/json" } });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la operación.";
      throw new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para hacer esto. Iniciá sesión con una cuenta de administración." : message);
    }
    return payload as KpiSnapshot;
  },
};
