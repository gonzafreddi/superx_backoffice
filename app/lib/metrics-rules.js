export const METRICS_VISIBILITY = {
  viewer: { financial: false },
  operator: { financial: true },
  admin: { financial: true },
};

/** Financial KPIs (GMV, ticket promedio) are hidden from the consulta role. */
export function getMetricsVisibility(role) {
  return METRICS_VISIBILITY[role] ?? METRICS_VISIBILITY.viewer;
}

const MAX_RANGE_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

/** Validates a date range. `context` = { today }. Returns a field->message map ({} when valid). */
export function validateRange(range, context = {}) {
  const errors = {};
  const today = context.today ?? new Date().toISOString().slice(0, 10);
  const todayTime = parseDate(today);
  const from = parseDate(range.from);
  const to = parseDate(range.to);
  if (from === null) errors.from = "Elegí una fecha de inicio válida.";
  if (to === null) errors.to = "Elegí una fecha de fin válida.";
  if (from !== null && to !== null) {
    if (from > to) errors.to = "La fecha de fin no puede ser anterior a la de inicio.";
    else if (todayTime !== null && to > todayTime) errors.to = "El rango no puede incluir fechas futuras.";
    else if ((to - from) / DAY_MS > MAX_RANGE_DAYS) errors.from = `El rango no puede superar ${MAX_RANGE_DAYS} días.`;
  }
  return errors;
}

/** Preset -> concrete range ending today. */
export function presetRange(preset, context = {}) {
  const today = context.today ?? new Date().toISOString().slice(0, 10);
  const toTime = parseDate(today);
  const spans = { today: 0, "7d": 6, "30d": 29, "90d": 89 };
  const days = spans[preset] ?? 6;
  const fromTime = toTime - days * DAY_MS;
  return { from: new Date(fromTime).toISOString().slice(0, 10), to: today };
}

/** Which KPIs the backend has enough data to report for this snapshot. */
export function describeDataCoverage(snapshot) {
  if (!snapshot) return { hasData: false, pending: ["orders", "gmv", "cancellations", "stockouts", "fillRate", "operationalTimes"] };
  const pending = [];
  if (snapshot.orderCount === 0) pending.push("orders");
  if (snapshot.fillRate === null || snapshot.fillRate === undefined) pending.push("fillRate");
  if (!snapshot.operationalTimes) pending.push("operationalTimes");
  return { hasData: snapshot.orderCount > 0, pending };
}

/** Number of days covered by a range, inclusive. */
export function rangeDays(range) {
  const from = parseDate(range.from);
  const to = parseDate(range.to);
  if (from === null || to === null || to < from) return 0;
  return Math.round((to - from) / DAY_MS) + 1;
}
