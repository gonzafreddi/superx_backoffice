export const dashboardPresets = ["today", "7d", "month"];

function localDate(value) {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}
function asIso(date) { return date.toISOString().slice(0, 10); }

export function presetRange(preset, today = new Date()) {
  const date = localDate(today);
  if (preset === "today") return { from: asIso(date), to: asIso(date) };
  if (preset === "7d") { const from = new Date(date); from.setDate(from.getDate() - 6); return { from: asIso(from), to: asIso(date) }; }
  if (preset === "month") { const from = new Date(date.getFullYear(), date.getMonth(), 1, 12); const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12); return { from: asIso(from), to: asIso(to) }; }
  return { from: asIso(date), to: asIso(date) };
}

export function formatRange(range) { return range.from === range.to ? range.from : `${range.from} a ${range.to}`; }
export function documentHref(link) { const id = encodeURIComponent(String(link.id)); return link.type === "SUPPLIER_INVOICE" ? `/facturas/${id}` : link.type === "EXPENSE" ? `/gastos/${id}` : `/inversiones/${id}`; }
export function documentLabel(type) { return type === "SUPPLIER_INVOICE" ? "Factura" : type === "EXPENSE" ? "Gasto" : "Inversión"; }
export function decimalToCents(value) { const normalized = String(value ?? "0").trim(); if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return 0n; const negative = normalized.startsWith("-"); const [whole, decimal = ""] = (negative ? normalized.slice(1) : normalized).split("."); const cents = BigInt(whole) * 100n + BigInt((decimal + "00").slice(0, 2)); return negative ? -cents : cents; }
export function isNegativeAmount(value) { return decimalToCents(value) < 0n; }
