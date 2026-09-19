import assert from "node:assert/strict";
import test from "node:test";
import { isOverReceipt, packagingEquivalence, pendingPackages, previewPurchaseOrderLine, progressPercent, stableIdempotencyKey, validateVarianceReason } from "../app/lib/purchase-order-rules.js";

test("calcula equivalencia y preview local sin convertirlo en total oficial", () => {
  assert.equal(packagingEquivalence("Caja x24", 24), "1 Caja x24 = 24 unidades");
  assert.deepEqual(previewPurchaseOrderLine({ packageQuantity: 2, unitsPerPack: 24, costPerPackage: 120, discountAmount: 10, taxRate: 21 }), { unitQuantity: 48, unitCost: 5, lineSubtotal: 240, discountAmount: 10, taxRate: 21, taxAmount: 48.3, total: 278.3 });
});
test("calcula pendiente, exceso y progreso", () => {
  const item = { packageQuantity: 10, receivedPackageQuantity: 7 };
  assert.equal(pendingPackages(item), 3); assert.equal(isOverReceipt(4, item), true); assert.equal(isOverReceipt(3, item), false); assert.equal(progressPercent(7, 10), 70);
});
test("exige motivo y conserva la misma llave idempotente", () => {
  assert.equal(validateVarianceReason("abc"), false); assert.equal(validateVarianceReason("rotura"), true); assert.equal(stableIdempotencyKey("attempt-1"), "attempt-1");
});
