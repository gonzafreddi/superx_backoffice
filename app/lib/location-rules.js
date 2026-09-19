export const LOCATION_PERMISSIONS = {
  viewer: { manage: false, createWarehouse: false },
  operator: { manage: true, createWarehouse: false },
  admin: { manage: true, createWarehouse: true },
};

export function getLocationPermissions(role) {
  return LOCATION_PERMISSIONS[role] ?? LOCATION_PERMISSIONS.viewer;
}

export function validateLocationInput(input) {
  const errors = {};
  for (const field of ["code", "aisle", "rack", "level"]) {
    if (!input[field]?.trim()) errors[field] = "Este campo es obligatorio.";
  }
  if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)) {
    errors.sortOrder = "El orden debe ser un entero igual o mayor que cero.";
  }
  return errors;
}

export function getLocationOccupancy(total, capacity) {
  const ratio = capacity && capacity > 0 ? Math.min(1, Math.max(0, total / capacity)) : 0;
  return { ratio, full: capacity ? total >= capacity : false, tone: ratio >= .9 ? "full" : ratio >= .7 ? "warning" : "normal" };
}
export function validateAddLocationStock(input) { const errors = {}; if (!Number.isInteger(input.quantity) || input.quantity <= 0) errors.quantity = "La cantidad debe ser un entero mayor que cero."; return errors; }
export function validateLocationTransfer(input) { const errors = { ...validateAddLocationStock(input), toLocationId: undefined }; if (!input.toLocationId || input.locationId === input.toLocationId) errors.toLocationId = "Elegí una ubicación de destino distinta."; if (Number.isFinite(input.availableQuantity) && input.quantity > input.availableQuantity) errors.quantity = "La cantidad supera el disponible en origen."; return errors; }
export function validateLocationAdjustment(input) { const errors = {}; if (!Number.isInteger(input.quantity) || (input.mode === "set" ? input.quantity < 0 : input.quantity === 0)) errors.quantity = input.mode === "set" ? "La cantidad final debe ser un entero no negativo." : "La variación debe ser un entero distinto de cero."; if (!['PHYSICAL_COUNT', 'BREAKAGE', 'LOSS', 'LOAD_ERROR', 'RETURN', 'OTHER'].includes(input.reason)) errors.reason = "Elegí el motivo del ajuste."; return errors; }
