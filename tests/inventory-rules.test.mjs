import test from "node:test";
import assert from "node:assert/strict";
import { getInventoryPermissions, getInventoryStatus, validateInventoryAdjustment } from "../app/lib/inventory-rules.js";

test("sólo operador y administración pueden generar ajustes", () => {
  assert.equal(getInventoryPermissions("viewer").adjust, false);
  assert.equal(getInventoryPermissions("operator").adjust, true);
  assert.equal(getInventoryPermissions("admin").adjust, true);
});

test("el estado distingue stock agotado, bajo y suficiente", () => {
  assert.equal(getInventoryStatus({ onHand: 0, minimum: 5 }), "out");
  assert.equal(getInventoryStatus({ onHand: 5, minimum: 5 }), "low");
  assert.equal(getInventoryStatus({ onHand: 6, minimum: 5 }), "ok");
});

test("un ajuste exige motivo, cantidad entera y no permite saldo negativo", () => {
  const item = { onHand: 4, minimum: 2 };
  assert.match(validateInventoryAdjustment({ quantity: 0, reason: "conteo" }, item).quantity, /distinta/);
  assert.match(validateInventoryAdjustment({ quantity: -5, reason: "conteo" }, item).quantity, /debajo de cero/);
  assert.match(validateInventoryAdjustment({ quantity: 1, reason: "" }, item).reason, /motivo/);
  assert.deepEqual(validateInventoryAdjustment({ quantity: -2, reason: "Conteo físico" }, item), {});
});

const { adaptInventoryMovement, movementStockDelta, movementQuantityLabel, isReservationMovement, getAvailableStock } = await import("../app/lib/inventory-rules.js");

test("reservas y liberaciones conservan la referencia y no modifican el saldo físico", () => {
  const raw = { id: "1", quantity: 2, reference: "PX000123", note: "Nota del operador", actorUserId: "4", createdAt: "2026-10-01T10:00:00Z" };
  const held = adaptInventoryMovement({ ...raw, type: "RESERVATION" });
  const released = adaptInventoryMovement({ ...raw, type: "RESERVATION_RELEASE" });
  assert.equal(held.type, "reservation");
  assert.equal(released.type, "reservation_release");
  assert.equal(held.reference, "PX000123");
  assert.equal(released.reference, "PX000123");
  assert.equal(movementQuantityLabel(held), "−2 reservado");
  assert.equal(movementQuantityLabel(released), "+2 liberado");
  assert.equal(isReservationMovement(held), true);
  assert.equal(isReservationMovement(released), true);
  const sale = adaptInventoryMovement({ ...raw, type: "SALE" });
  const receipt = adaptInventoryMovement({ ...raw, quantity: 10, type: "PURCHASE" });
  assert.equal([receipt, held, released, sale].reduce((balance, movement) => balance + movementStockDelta(movement), 0), 8);
});

test("disponible resta reservado sin cambiar el stock físico usado para ajustes", () => {
  const item = { onHand: 10, reserved: 8, available: 2, minimum: 3 };
  assert.equal(getAvailableStock(item), 2);
  assert.equal(getInventoryStatus(item), "low");
  assert.equal(getAvailableStock({ onHand: 10, reserved: 8 }), 2);
  assert.equal(getInventoryStatus({ onHand: 10, reserved: 10, minimum: 3 }), "out");
  assert.deepEqual(validateInventoryAdjustment({ quantity: -3, reason: "Conteo físico" }, item), {});
});
