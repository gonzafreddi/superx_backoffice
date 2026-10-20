import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
import type {
  SalesRange,
  SalesSummary,
  DailySales,
  CashDaily,
  SalesBreakdown,
  BreakdownBy,
  StockValuation,
} from "./sales-contract";
import { rangeError, salesPath } from "./sales-rules";
import {
  fixtureSummary,
  fixtureDaily,
  fixtureCash,
  fixtureBreakdown,
  fixtureStock,
} from "./sales-fixtures";
async function request<T>(
  endpoint: string,
  params: object,
  fixture: () => T,
  signal?: AbortSignal,
): Promise<T> {
  if ("from" in params) {
    const error = rangeError(params as SalesRange);
    if (error) throw new Error(error);
  }
  if (fixturesEnabled() && process.env.NODE_ENV !== "production")
    return fixture();
  const base = apiBaseUrl();
  if (!base)
    throw new Error("Configurá la API para consultar ventas en producción.");
  const response = await authFetch(
    `${base.replace(/\/$/, "")}${salesPath(endpoint, params)}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    let message = "";
    try {
      const body = await response.json();
      message = Array.isArray(body.message)
        ? body.message.join(" ")
        : body.message;
    } catch {}
    throw new Error(
      response.status === 403
        ? "Tu cuenta no tiene acceso a ventas."
        : response.status === 401
          ? "Iniciá sesión para consultar ventas."
          : message || "No pudimos cargar este bloque. Reintentá.",
    );
  }
  return response.json() as Promise<T>;
}
export const salesApi = {
  summary: (range: SalesRange, signal?: AbortSignal) =>
    request<SalesSummary>(
      "summary",
      range,
      () => fixtureSummary(range),
      signal,
    ),
  daily: (range: SalesRange, signal?: AbortSignal) =>
    request<DailySales>("daily", range, () => fixtureDaily(range), signal),
  cashDaily: (range: SalesRange, signal?: AbortSignal) =>
    request<CashDaily>("cash-daily", range, () => fixtureCash(range), signal),
  breakdown: (
    range: SalesRange,
    by: BreakdownBy,
    limit = 20,
    signal?: AbortSignal,
  ) =>
    request<SalesBreakdown>(
      "breakdown",
      { ...range, by, limit },
      () => fixtureBreakdown(range, by, limit),
      signal,
    ),
  stockValuation: (
    groupBy: "category" | "product",
    warehouseId?: string,
    signal?: AbortSignal,
  ) =>
    request<StockValuation>(
      "stock-valuation",
      { groupBy, warehouseId, limit: 200 },
      () => fixtureStock(groupBy, warehouseId),
      signal,
    ),
};
