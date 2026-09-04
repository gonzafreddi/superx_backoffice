export const INVENTORY_PERMISSIONS = {
  viewer: { adjust: false },
  operator: { adjust: true },
  admin: { adjust: true },
};

export function getInventoryPermissions(role) {
  return INVENTORY_PERMISSIONS[role] ?? INVENTORY_PERMISSIONS.viewer;
}

export function getInventoryStatus(item) {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= item.minimum) return "low";
  return "ok";
}

export function validateInventoryAdjustment(input, item) {
  const errors = {};
  if (!Number.isInteger(input.quantity) || input.quantity === 0) errors.quantity = "Ingresá una corrección entera distinta de cero.";
  else if (item && item.onHand + input.quantity < 0) errors.quantity = "El ajuste no puede dejar el stock por debajo de cero.";
  if (!input.reason?.trim()) errors.reason = "Indicá el motivo del ajuste para que quede auditado.";
  else if (input.reason.trim().length < 3) errors.reason = "El motivo debe tener al menos 3 caracteres.";
  return errors;
}
