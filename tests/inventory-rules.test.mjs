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
