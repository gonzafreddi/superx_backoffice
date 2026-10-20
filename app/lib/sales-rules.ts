import type { SalesRange } from "./sales-contract";
export const presets = {
  today: "Hoy",
  yesterday: "Ayer",
  week: "7 días",
  month30: "30 días",
  month: "Este mes",
  previousMonth: "Mes anterior",
  year: "Este año",
};
export const argentinaToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
export const rangeDays = ({ from, to }: SalesRange) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
export function rangeError(range: SalesRange) {
  for (const date of [range.from, range.to])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
    )
      return "Indicá dos fechas válidas.";
  if (range.from > range.to) return "Rango de fechas invertido.";
  return rangeDays(range) > 366 ? "Rango máximo: 366 días." : "";
}
export function salesPreset(
  preset: keyof typeof presets,
  now = new Date(),
): SalesRange {
  const today = argentinaToday(now),
    start = `${today.slice(0, 7)}-01`;
  if (preset === "yesterday")
    return { from: shiftDate(today, -1), to: shiftDate(today, -1) };
  if (preset === "previousMonth") {
    const to = shiftDate(start, -1);
    return { from: `${to.slice(0, 7)}-01`, to };
  }
  return {
    from:
      preset === "week"
        ? shiftDate(today, -6)
        : preset === "month30"
          ? shiftDate(today, -29)
          : preset === "month"
            ? start
            : preset === "year"
              ? `${today.slice(0, 4)}-01-01`
              : today,
    to: today,
  };
}
export const money = (value: string | number, cards = false) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: cards ? 0 : 2,
    maximumFractionDigits: cards ? 0 : 2,
  }).format(Number(value));
export const percent = (value: number | null | undefined) =>
  value == null
    ? "—"
    : `${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
export const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${date}T12:00:00Z`));
export const methodLabel = (method: string) =>
  ({
    CASH: "Efectivo",
    BANK_TRANSFER: "Transferencia",
    MERCADO_PAGO: "Mercado Pago",
  })[method] ?? method;
export const salesPath = (endpoint: string, params: object) =>
  `/sales/${endpoint}?${new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  )}`;
// Monetary aggregation stays in integer cents, including in demonstration data and CSV.
export const cents = (value: string) => BigInt(value.replace(".", ""));
export const decimal = (value: bigint) =>
  `${value < BigInt(0) ? "-" : ""}${(value < BigInt(0) ? -value : value) / BigInt(100)}.${String((value < BigInt(0) ? -value : value) % BigInt(100)).padStart(2, "0")}`;
export const sumMoney = (values: string[]) =>
  decimal(values.reduce((sum, value) => sum + cents(value), BigInt(0)));
