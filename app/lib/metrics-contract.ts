import type { UserRole } from "./product-contract";

export type MetricsRange = { from: string; to: string };
export type MetricsPreset = "today" | "7d" | "30d" | "90d";

export type OrdersPerDay = { date: string; count: number };

/** Every figure is computed by the backend. `null` = not enough data yet for that metric. */
export type KpiSnapshot = {
  range: MetricsRange;
  generatedAt: string;
  currency: string;
  orderCount: number;
  ordersPerDay: OrdersPerDay[];
  gmv: number;
  averageTicket: number;
  cancellations: { count: number; rate: number };
  stockouts: number;
  fillRate: number | null;
  operationalTimes: { pickingMinutes: number; deliveryMinutes: number } | null;
};

/** Contrato objetivo: GET /api/metrics/overview?from=&to= (métricas definidas y calculadas en backend). */
export type MetricsApi = {
  getOverview(range: MetricsRange): Promise<KpiSnapshot | null>;
};

export type MetricsRole = UserRole;
