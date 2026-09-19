import assert from "node:assert/strict";
import test from "node:test";
import { previewPurchaseOrderLine, validatePurchaseOrderInput } from "../app/lib/purchase-order-rules.js";

test("el preview convierte packs a unidades y redondea igual que backend", () => {
  assert.deepEqual(previewPurchaseOrderLine({ packageQuantity: 3, unitsPerPack: 6, costPerPackage: 100 }), { unitQuantity: 18, unitCost: 16.67, total: 300 });
  assert.equal(previewPurchaseOrderLine({ packageQuantity: 2, unitsPerPack: 3, costPerPackage: 10.01 }).unitCost, 3.34);
});

test("la orden requiere proveedor, depósito, líneas y cantidades positivas", () => {
  const errors = validatePurchaseOrderInput({ supplierId: "", warehouseId: "", items: [] });
  assert.match(errors.supplierId, /proveedor/); assert.match(errors.warehouseId, /depósito/); assert.match(errors.items, /línea/);
  assert.match(validatePurchaseOrderInput({ supplierId: "s", warehouseId: "w", items: [{ productId: "p", packagingName: "Caja", unitsPerPack: 6, packageQuantity: 0, costPerPackage: 1 }] })["item-0-quantity"], /positiva/);
  assert.deepEqual(validatePurchaseOrderInput({ supplierId: "s", warehouseId: "w", items: [{ productId: "p", packagingName: "Caja", unitsPerPack: 6, packageQuantity: 1, costPerPackage: 0 }] }), {});
});
