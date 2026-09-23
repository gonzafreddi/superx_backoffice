import assert from "node:assert/strict";
import test from "node:test";
import { addDaysToDate, duplicateLineWarnings, isDirty, previewPurchaseOrderLine, summarizePurchaseOrder, validatePurchaseOrderInput } from "../app/lib/purchase-order-rules.js";

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

test("resume líneas, cargos e IVA calculado después del descuento", () => {
  assert.deepEqual(summarizePurchaseOrder({ lines: [{ packageQuantity: 2, unitsPerPack: 6, costPerPackage: 100, discountAmount: 10, taxRate: 21 }], freightAmount: 5, otherChargesAmount: 2.5 }), { subtotal: 200, discountTotal: 10, taxTotal: 39.9, freightAmount: 5, otherChargesAmount: 2.5, total: 237.4, lineCount: 1, unitCount: 12 });
});

test("suma días sobre fechas sin deriva de zona horaria", () => {
  assert.equal(addDaysToDate("2026-02-27", 2), "2026-03-01");
  assert.equal(addDaysToDate("", 2), "");
});

test("detecta cambios del documento", () => {
  assert.equal(isDirty({ reference: "A" }, { reference: "A" }), false);
  assert.equal(isDirty({ reference: "A" }, { reference: "B" }), true);
});

test("valida packs enteros, descuento, IVA, cargos y vencimiento", () => {
  const base = { supplierId: "s", warehouseId: "w", orderDate: "2026-09-23" };
  const line = { productId: "p", packagingName: "Caja", unitsPerPack: 6, packageQuantity: 2, costPerPackage: 100 };
  const errors = validatePurchaseOrderInput({ ...base, dueDate: "2026-09-22", freightAmount: -1, items: [{ ...line, packageQuantity: 1.5 }, { ...line, discountAmount: 201 }, { ...line, taxRate: 150 }] });
  assert.match(errors["item-0-quantity"], /entera/);
  assert.match(errors["item-1-discount"], /subtotal/);
  assert.match(errors["item-2-tax"], /IVA/);
  assert.match(errors.freightAmount, /negativo/);
  assert.match(errors.dueDate, /anterior/);
  assert.deepEqual(validatePurchaseOrderInput({ ...base, dueDate: "2026-09-23", items: [{ ...line, discountAmount: 200, taxRate: 10.5 }] }), {});
});

test("advierte líneas repetidas sin bloquear la validación", () => {
  const items = [{ productId: "p", packagingId: "k" }, { productId: "p", packagingId: "k" }, { productId: "p", packagingName: "Suelto" }, { productId: "q", packagingId: "k" }];
  assert.deepEqual(Object.keys(duplicateLineWarnings(items)), ["item-1-duplicate"]);
  assert.deepEqual(duplicateLineWarnings([]), {});
});

test("resume varias líneas redondeando cada línea a centavos", () => {
  const summary = summarizePurchaseOrder({ lines: [{ packageQuantity: 3, unitsPerPack: 1, costPerPackage: 3.33, taxRate: 10.5 }, { packageQuantity: 1, unitsPerPack: 12, costPerPackage: 24000, discountAmount: 1200, taxRate: 21 }], freightAmount: "25000", otherChargesAmount: "" });
  assert.equal(summary.subtotal, 24009.99);
  assert.equal(summary.taxTotal, 4789.05);
  assert.equal(summary.total, 52599.04);
  assert.equal(summary.unitCount, 15);
});
