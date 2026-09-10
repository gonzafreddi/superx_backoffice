export const DELIVERY_PERMISSIONS = {
  viewer: { editZone: false, editSlot: false, create: false },
  operator: { editZone: false, editSlot: true, create: false },
  admin: { editZone: true, editSlot: true, create: true },
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

/** Validates a slot form. `context` = { today, existingSlots, editingSlot }. */
export function validateSlotInput(input, context = {}) {
  const errors = {};
  const today = context.today ?? new Date().toISOString().slice(0, 10);
  const editing = context.editingSlot ?? null;
  if (!input.date) errors.date = "Elegí una fecha para la franja.";
  else if (input.date < today) errors.date = "La fecha de la franja no puede ser pasada.";
  const start = toMinutes(input.startTime), end = toMinutes(input.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) errors.time = "Ingresá el horario de inicio y de fin.";
  else if (end <= start) errors.time = "El horario de fin debe ser posterior al de inicio.";
  const capacity = Number(input.capacity);
  if (input.capacity === "" || !Number.isInteger(capacity) || capacity < 1) errors.capacity = "La capacidad debe ser un entero mayor o igual a 1.";
  else if (editing && capacity < editing.bookedCount) errors.capacity = `Ya hay ${editing.bookedCount} reservas: la capacidad no puede quedar por debajo.`;
  const others = (context.existingSlots ?? []).filter((slot) => slot.id !== editing?.id && slot.active && slot.date === input.date);
  if (!errors.time && others.some((slot) => slotWindowsOverlap(slot, input))) errors.time = "Se superpone con otra franja activa de esta zona en esa fecha.";
  return errors;
}

export function slotOccupancy(slot) {
  const capacity = Math.max(0, Number(slot.capacity ?? 0));
  const used = Math.max(0, Number(slot.bookedCount ?? 0));
  return { used, capacity, remaining: Math.max(0, capacity - used), full: capacity > 0 && used >= capacity, ratio: capacity > 0 ? used / capacity : 0 };
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
