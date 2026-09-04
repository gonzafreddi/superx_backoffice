import test from "node:test";
import assert from "node:assert/strict";
import { getPermissions, validateProduct } from "../app/lib/product-rules.js";
const product = { id: "p1", name: "Producto", categoryId: "cat", brandId: "brand", barcode: "7791234567890", unit: "unidad", imageUrl: "", active: true };
test("solo administración puede eliminar productos", () => { assert.equal(getPermissions("viewer").delete, false); assert.equal(getPermissions("operator").delete, false); assert.equal(getPermissions("admin").delete, true); });
test("el barcode es obligatorio, numérico y único", () => { assert.match(validateProduct({ ...product, barcode: "" }, [product]).barcode, /Ingresá/); assert.match(validateProduct({ ...product, barcode: "ABC" }, [product]).barcode, /dígitos/); assert.match(validateProduct({ ...product, id: "p2" }, [product], "p2").barcode, /Ya existe/); assert.deepEqual(validateProduct(product, [product], "p1"), {}); });
