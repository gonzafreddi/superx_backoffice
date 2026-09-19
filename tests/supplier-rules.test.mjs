import assert from "node:assert/strict";
import test from "node:test";
import { formatSupplierMovement, isValidCuit, normalizeCuit, paymentConditionLabel, supplierMovementLabel, validatePackagingInput, validateSupplierInput } from "../app/lib/supplier-rules.js";

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

test("normaliza y valida CUIT con el algoritmo módulo 11", () => {
  assert.equal(normalizeCuit("20123456786"), "20-12345678-6");
  assert.equal(isValidCuit("20-12345678-6"), true);
  assert.equal(isValidCuit("20-12345678-4"), false);
  assert.match(validateSupplierInput({ name: "Proveedor", taxId: "20-12345678-4" }).taxId, /CUIT válido/);
});

test("etiqueta y formatea los movimientos de cuenta corriente", () => {
  assert.equal(paymentConditionLabel("CREDIT"), "Crédito");
  assert.equal(supplierMovementLabel("PAYMENT_REVERSAL"), "Reversa de pago");
  assert.deepEqual(formatSupplierMovement({ date: "2026-09-19T12:00:00.000Z", type: "INVOICE", reference: "FACTURA_A 1-2" }).type, "Factura");
});
