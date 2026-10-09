import { formatQuantity } from "./quantity-rules.js";
export const INVENTORY_PERMISSIONS = {
  viewer: { adjust: false },
  operator: { adjust: true },
  admin: { adjust: true },
};

export function getInventoryPermissions(role) {
  return INVENTORY_PERMISSIONS[role] ?? INVENTORY_PERMISSIONS.viewer;
}

export function getInventoryStatus(item) {
  if (getAvailableStock(item) <= 0) return "out";
  if (getAvailableStock(item) <= item.minimum) return "low";
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


export function getAvailableStock(item) {
  return item.available ?? item.onHand - (item.reserved ?? 0);
}

export const MOVEMENT_TYPE_MAP = { PURCHASE: "receipt", RETURN: "receipt", SALE: "sale", ADJUSTMENT: "adjustment", TRANSFER_IN: "transfer", TRANSFER_OUT: "transfer", RESERVATION: "reservation", RESERVATION_RELEASE: "reservation_release" };

export function adaptInventoryMovement(raw) {
  return {
    id: raw.id, saleMode: raw.saleMode ?? raw.product?.saleMode ?? "UNIT", inventoryItemId: "", type: MOVEMENT_TYPE_MAP[raw.type] ?? "adjustment",
    quantity: (["SALE", "TRANSFER_OUT", "RESERVATION"].includes(raw.type) ? -1 : 1) * raw.quantity,
    reference: raw.reference,
    reason: raw.note ?? raw.reference ?? "—",
    occurredAt: raw.createdAt, createdBy: `Usuario #${raw.actorUserId}`,
  };
}

export function isReservationMovement(movement) {
  return movement.type === "reservation" || movement.type === "reservation_release";
}

// Reservation quantities describe availability, never physical stock in/out.
export function movementStockDelta(movement) {
  return isReservationMovement(movement) ? 0 : movement.quantity;
}

export function movementQuantityLabel(movement) {
  if (movement.type === "reservation") return `−${movement.saleMode === "WEIGHT" ? formatQuantity(Math.abs(movement.quantity), movement.saleMode) : Math.abs(movement.quantity)} reservado`;
  if (movement.type === "reservation_release") return `+${movement.saleMode === "WEIGHT" ? formatQuantity(Math.abs(movement.quantity), movement.saleMode) : Math.abs(movement.quantity)} liberado`;
  return `${movement.quantity > 0 ? "+" : ""}${formatQuantity(movement.quantity, movement.saleMode)}`;
}
