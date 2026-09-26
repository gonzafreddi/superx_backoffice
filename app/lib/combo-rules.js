const hasValue = (value) => value !== "" && value !== null && value !== undefined;
const validDate = (value) => hasValue(value) && !Number.isNaN(new Date(value).getTime());

export function comboRegularPrice(items, prices) {
  return items.reduce((total, item) => {
    const price = Number(prices[item.productId]);
    const quantity = Number(item.quantity);
    return total + (Number.isFinite(price) && Number.isFinite(quantity) ? price * quantity : 0);
  }, 0);
}

export function validateCombo(input, regularPrice) {
  const errors = {};
  const name = String(input.name ?? "").trim();
  const description = String(input.description ?? "").trim();
  const comboPrice = Number(input.comboPrice);
  const sortOrder = Number(input.sortOrder);
  const items = Array.isArray(input.items) ? input.items : [];
  const totalUnits = items.reduce((sum, item) => sum + (Number.isInteger(Number(item.quantity)) ? Number(item.quantity) : 0), 0);
  const ids = items.map((item) => String(item.productId)).filter(Boolean);

  if (!name) errors.name = "Ingresá un nombre.";
  else if (name.length > 120) errors.name = "Usá hasta 120 caracteres.";
  if (description.length > 2000) errors.description = "Usá hasta 2000 caracteres.";
  if (!items.length) errors.items = "Agregá productos al combo.";
  else if (new Set(ids).size !== items.length) errors.items = "Cada producto puede aparecer una sola vez.";
  else if (totalUnits < 2) errors.items = "El combo debe contener al menos 2 unidades en total.";
  if (items.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 999)) errors.items = "Las cantidades deben ser enteras entre 1 y 999.";
  if (!Number.isFinite(comboPrice) || comboPrice <= 0) errors.comboPrice = "Ingresá un precio mayor a 0.";
  else if (Number.isFinite(regularPrice) && regularPrice > 0 && comboPrice >= regularPrice) errors.comboPrice = "El precio combo debe ser menor al precio regular.";
  if (!Number.isInteger(sortOrder) || sortOrder < 0) errors.sortOrder = "Ingresá un orden entero de 0 o mayor.";
  if (hasValue(input.validFrom) && !validDate(input.validFrom)) errors.validFrom = "Ingresá una fecha de inicio válida.";
  if (hasValue(input.validUntil) && !validDate(input.validUntil)) errors.validUntil = "Ingresá una fecha de fin válida.";
  else if (validDate(input.validFrom) && validDate(input.validUntil) && new Date(input.validUntil) <= new Date(input.validFrom)) errors.validUntil = "La fecha de fin debe ser posterior al inicio.";
  return errors;
}

export function comboPayload(input) {
  const reference = (value) => Number.isFinite(Number(value)) ? Number(value) : value;
  return {
    name: String(input.name).trim(),
    description: String(input.description ?? "").trim() || undefined,
    comboPrice: Number(input.comboPrice),
    isActive: Boolean(input.isActive),
    validFrom: hasValue(input.validFrom) ? new Date(input.validFrom).toISOString() : undefined,
    validUntil: hasValue(input.validUntil) ? new Date(input.validUntil).toISOString() : undefined,
    sortOrder: Number(input.sortOrder),
    items: input.items.map((item) => ({ productId: reference(item.productId), quantity: Number(item.quantity) })),
  };
}

export function comboTiming(combo, now = new Date()) {
  if (combo.validFrom && new Date(combo.validFrom) > now) return "upcoming";
  if (combo.validUntil && new Date(combo.validUntil) < now) return "expired";
  return "current";
}
