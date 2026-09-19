import assert from "node:assert/strict";
import test from "node:test";
import { validatePackagingInput, validateSupplierInput } from "../app/lib/supplier-rules.js";

test("un proveedor exige nombre", () => {
  assert.match(validateSupplierInput({ name: "" }).name, /obligatorio/);
  assert.deepEqual(validateSupplierInput({ name: "Proveedor válido", paymentTermDays: 0 }), {});
});

test("la condición de pago no admite días negativos ni fracciones", () => {
  assert.match(validateSupplierInput({ name: "Proveedor", paymentTermDays: -1 }).paymentTermDays, /mayor/);
  assert.match(validateSupplierInput({ name: "Proveedor", paymentTermDays: 1.5 }).paymentTermDays, /entero/);
});

test("una presentación exige producto, nombre y unidades enteras positivas", () => {
  const errors = validatePackagingInput({ productId: "", name: "", unitsPerPack: 0 });
  assert.match(errors.productId, /producto/);
  assert.match(errors.name, /obligatorio/);
  assert.match(errors.unitsPerPack, /entero mayor/);
  assert.deepEqual(validatePackagingInput({ productId: "prd-1", name: "Caja x 12", unitsPerPack: 12 }), {});
});
