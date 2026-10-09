import test from "node:test";
import assert from "node:assert/strict";
import { getPermissions, validateProduct } from "../app/lib/product-rules.js";
const product = { id: "p1", name: "Producto", categoryId: "cat", brandId: "brand", barcode: "7791234567890", unit: "unidad", imageUrl: "", active: true };
test("solo administración puede eliminar productos", () => { assert.equal(getPermissions("viewer").delete, false); assert.equal(getPermissions("operator").delete, false); assert.equal(getPermissions("admin").delete, true); });
test("el barcode es opcional y no se valida en el frontend", () => { assert.equal("barcode" in validateProduct({ ...product, barcode: "" }, [product]), false); assert.equal("barcode" in validateProduct({ ...product, barcode: "ABC-123" }, [product]), false); assert.equal("barcode" in validateProduct({ ...product, id: "p2" }, [product], "p2"), false); assert.deepEqual(validateProduct(product, [product], "p1"), {}); });

test("producto WEIGHT exige configuración completa y UNIT la ignora", () => {
  const input = { name: "Queso", categoryId: "1", brandId: "1", unit: "KG", saleMode: "WEIGHT", weightMinGrams: 250, weightStepGrams: 250 };
  assert.deepEqual(validateProduct(input, []), {});
  for (const step of [null, 0, 9, 10.5, 251]) assert.ok(Object.keys(validateProduct({ ...input, weightStepGrams: step }, [])).length);
  for (const min of [null, 249, 100001, 250.5]) assert.ok(validateProduct({ ...input, weightMinGrams: min }, []).weightMinGrams);
  assert.deepEqual(validateProduct({ ...input, saleMode: "UNIT", weightMinGrams: null, weightStepGrams: null }, []), {});
});
