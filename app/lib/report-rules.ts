export type GroupBy = "day" | "product" | "category" | "payment_method";
export type ReportFilters = { from: string; to: string; groupBy: GroupBy };
export type SalesMetrics = { orders: number; units: number; revenue: number; cost: number; margin: number; marginPct: number; costCoverage: number };
export type SalesRow = SalesMetrics & { key: string; label: string };
export type SalesReport = { rows: SalesRow[]; totals: SalesMetrics };
export type DatePreset = "today" | "week" | "month" | "previousMonth";
export function localDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function presetRange(preset: DatePreset, now = new Date()): Pick<ReportFilters, "from" | "to"> {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const start = new Date(end);
  if (preset === "week") start.setDate(start.getDate() - 6);
  if (preset === "month") start.setDate(1);
  if (preset === "previousMonth") { start.setMonth(start.getMonth() - 1, 1); end.setDate(0); }
  return { from: localDate(start), to: localDate(end) };
}
export function rangeError(from: string, to: string): string {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if ((from && !valid(from)) || (to && !valid(to))) return "Ingresá fechas válidas.";
  return from && to && from > to ? "La fecha desde debe ser anterior o igual a hasta." : "";
}
export function exportPath(path: string, filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (value && value !== "all") params.set(key, value);
  return `${path}${params.size ? `?${params}` : ""}`;
}
export function sortRows(rows: SalesRow[], key: keyof SalesRow, descending: boolean): SalesRow[] {
  return [...rows].sort((a, b) => (typeof a[key] === "string" ? String(a[key]).localeCompare(String(b[key]), "es-AR", { numeric: true }) : Number(a[key]) - Number(b[key])) * (descending ? -1 : 1));
}
export function encodeCsv(rows: (string | number | null)[][]): string {
  return "\uFEFF" + rows.map(row => row.map(value => {
    let text = typeof value === "number" ? String(value).replace(".", ",") : value ?? "";
    if (/^[=+@-]/.test(text) && typeof value !== "number") text = "'" + text;
    return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(";")).join("\r\n") + "\r\n";
}
