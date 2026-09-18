import test from "node:test";
import assert from "node:assert/strict";
import { getPermissions, validateProduct } from "../app/lib/product-rules.js";
const product = { id: "p1", name: "Producto", categoryId: "cat", brandId: "brand", barcode: "7791234567890", unit: "unidad", imageUrl: "", active: true };
test("solo administración puede eliminar productos", () => { assert.equal(getPermissions("viewer").delete, false); assert.equal(getPermissions("operator").delete, false); assert.equal(getPermissions("admin").delete, true); });
test("el barcode es opcional y no se valida en el frontend", () => { assert.equal("barcode" in validateProduct({ ...product, barcode: "" }, [product]), false); assert.equal("barcode" in validateProduct({ ...product, barcode: "ABC-123" }, [product]), false); assert.equal("barcode" in validateProduct({ ...product, id: "p2" }, [product], "p2"), false); assert.deepEqual(validateProduct(product, [product], "p1"), {}); });
