export const DELIVERY_PERMISSIONS = {
  viewer: { editZone: false, editHours: false, create: false },
  operator: { editZone: false, editHours: true, create: false },
  admin: { editZone: true, editHours: true, create: true },
};

export function getDeliveryPermissions(role) {
  return DELIVERY_PERMISSIONS[role] ?? DELIVERY_PERMISSIONS.viewer;
}

function isMoney(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && Math.round(value * 100) === value * 100;
}

/** Validates a zone form. Returns a field->message map ({} when valid). */
export function validateZoneInput(input) {
  const errors = {};
  if (!input.name || !String(input.name).trim()) errors.name = "El nombre de la zona es obligatorio.";
  if (!input.cityName || !String(input.cityName).trim()) errors.cityName = "La ciudad es obligatoria.";
  if (input.deliveryFee === "" || !isMoney(Number(input.deliveryFee))) errors.deliveryFee = "El costo de envío debe ser un número mayor o igual a 0, con hasta dos decimales.";
  const threshold = input.freeDeliveryThreshold;
  if (threshold !== null && threshold !== "" && !(isMoney(Number(threshold)) && Number(threshold) > 0)) errors.freeDeliveryThreshold = "El umbral de envío gratis debe ser un número mayor a 0, o dejarse vacío.";
  if (input.priority === "" || !Number.isInteger(Number(input.priority)) || Number(input.priority) < 0) errors.priority = "La prioridad debe ser un entero mayor o igual a 0.";
  const postalCodes = Array.isArray(input.postalCodes) ? input.postalCodes.filter((code) => String(code).trim()) : [];
  const neighborhoods = Array.isArray(input.neighborhoods) ? input.neighborhoods.filter((name) => String(name).trim()) : [];
  if (postalCodes.length === 0 && neighborhoods.length === 0) errors.coverage = "Definí al menos un código postal o un barrio para la cobertura.";
  return errors;
}

function toMinutes(time) {
  const [h, m] = String(time ?? "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

/** Two [start,end) windows overlap. */
export function slotWindowsOverlap(a, b) {
  const aStart = toMinutes(a.startTime), aEnd = toMinutes(a.endTime), bStart = toMinutes(b.startTime), bEnd = toMinutes(b.endTime);
  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;
  return aStart < bEnd && bStart < aEnd;
}

/** Monday-first order for display; values follow JS getDay() (0 = Sunday). */
export const WEEKDAYS = [
  { value: 1, short: "Lun" }, { value: 2, short: "Mar" }, { value: 3, short: "Mié" }, { value: 4, short: "Jue" },
  { value: 5, short: "Vie" }, { value: 6, short: "Sáb" }, { value: 0, short: "Dom" },
];

/**
 * "Todos los días", "Lun a Sáb", "Lun, Mié, Vie"…
 * @param {number[]} weekdays
 * @returns {string}
 */
export function formatWeekdays(weekdays) {
  const order = WEEKDAYS.map((day) => day.value);
  const picked = order.filter((value) => weekdays.includes(value));
  if (picked.length === 7) return "Todos los días";
  if (picked.length === 0) return "Ningún día";
  const label = (value) => WEEKDAYS.find((day) => day.value === value).short;
  const first = order.indexOf(picked[0]);
  const consecutive = picked.length > 2 && picked.every((value, i) => order.indexOf(value) === first + i);
  return consecutive ? `${label(picked[0])} a ${label(picked[picked.length - 1])}` : picked.map(label).join(", ");
}

/**
 * Validates a delivery-hours form against the other windows ({} when valid).
 * @param {{ startTime: string, endTime: string, weekdays: number[], active: boolean }} input
 * @param {Array<{ id: string, startTime: string, endTime: string, weekdays: number[], active: boolean }>} [existingWindows]
 * @param {string | null} [editingId] the window being edited, which never clashes with itself
 * @returns {{ time?: string, weekdays?: string }}
 */
export function validateWindowInput(input, existingWindows = [], editingId = null) {
  const errors = {};
  const start = toMinutes(input.startTime), end = toMinutes(input.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) errors.time = "Ingresá el horario de inicio y de fin.";
  else if (end <= start) errors.time = "El horario de fin debe ser posterior al de inicio.";
  if (!Array.isArray(input.weekdays) || input.weekdays.length === 0) errors.weekdays = "Elegí al menos un día.";
  if (!errors.time && !errors.weekdays) {
    const clash = existingWindows.find((window) => window.id !== editingId && window.active && input.active
      && window.weekdays.some((day) => input.weekdays.includes(day)) && slotWindowsOverlap(window, input));
    if (clash) errors.time = `Se superpone con el horario ${clash.startTime}–${clash.endTime} (${formatWeekdays(clash.weekdays)}).`;
  }
  return errors;
}

/** What a customer sees at checkout for this zone — no deploy needed, changes are immediate. */
export function summarizeCheckoutImpact(zone) {
  if (!zone.active) return "Zona inactiva: no se ofrece en el checkout.";
  const fee = zone.deliveryFee === 0 ? "Envío sin cargo" : `Envío $${Number(zone.deliveryFee).toLocaleString("es-AR")}`;
  const free = zone.freeDeliveryThreshold ? ` · gratis desde $${Number(zone.freeDeliveryThreshold).toLocaleString("es-AR")}` : " · sin envío gratis";
  return `${fee}${free}`;
}

export function buildDeliveryChangeEvent(summary, actor, role, changedAt, id) {
  return {
    id: id ?? `dc-${changedAt}`,
    summary: String(summary),
    actor,
    ...(role ? { role } : {}),
    changedAt,
  };
}
