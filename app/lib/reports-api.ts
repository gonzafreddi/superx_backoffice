import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
import { exportPath, rangeError, type ReportFilters, type SalesReport } from "./report-rules";
export function fixtureReport(filters: ReportFilters): SalesReport {
  const labels = filters.groupBy === "day" ? [filters.from, filters.to] : filters.groupBy === "product" ? ["Leche 1L", "Pan integral"] : filters.groupBy === "category" ? ["Lácteos", "Panadería"] : ["Efectivo", "Transferencia"];
  const rows = labels.map((label, i) => ({ key: `${i}`, label, orders: 2, units: 10, revenue: 15000, cost: i ? 0 : 9000, margin: i ? 15000 : 6000, marginPct: i ? 100 : 40, costCoverage: i ? 0 : 100 }));
  return { rows, totals: { orders: 4, units: 20, revenue: 30000, cost: 9000, margin: 21000, marginPct: 70, costCoverage: 50 } };
}
export async function salesReport(filters: ReportFilters, signal?: AbortSignal): Promise<SalesReport> {
  const problem = rangeError(filters.from, filters.to); if (problem) throw new Error(problem);
  if (fixturesEnabled()) return fixtureReport(filters);
  const response = await authFetch(`${apiBaseUrl()!.replace(/\/$/, "")}${exportPath("/reports/sales", filters)}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(response.status === 403 ? "Tu cuenta no tiene acceso a reportes." : response.status === 401 ? "Iniciá sesión para consultar reportes." : "No pudimos cargar el reporte.");
  const result = await response.json() as SalesReport;
  const normalize = (metrics: SalesReport["totals"]) => Object.fromEntries(Object.entries(metrics).filter(([key]) => key !== "key" && key !== "label").map(([key, value]) => [key, Number(value ?? 0)])) as SalesReport["totals"];
  return { rows: result.rows.map(row => ({ ...normalize(row), key: String(row.key), label: row.label })), totals: normalize(result.totals) };
}
