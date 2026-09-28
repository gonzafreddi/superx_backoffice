import test from "node:test";
import assert from "node:assert/strict";
import { canSetPaymentMethod, requiresEnableConfirmation, validateTransferDetails } from "../app/lib/payment-method-rules.js";

test("impide desactivar el último medio habilitado", () => {
  const result = canSetPaymentMethod([{ method: "CASH", enabled: true }, { method: "BANK_TRANSFER", enabled: false }], "CASH", false);
  assert.equal(result.allowed, false);
  assert.match(result.reason, /al menos un medio/);
});
test("permite cambios que conservan un medio activo", () => {
  assert.equal(canSetPaymentMethod([{ method: "CASH", enabled: true }, { method: "BANK_TRANSFER", enabled: true }], "CASH", false).allowed, true);
  assert.equal(canSetPaymentMethod([{ method: "CASH", enabled: true }], "CASH", true).allowed, true);
});
test("Mercado Pago requiere confirmación sólo al activarlo", () => {
  assert.equal(requiresEnableConfirmation("MERCADO_PAGO", true), true);
  assert.equal(requiresEnableConfirmation("MERCADO_PAGO", false), false);
});
test("datos de transferencia: normaliza y descarta campos vacíos", () => {
  const result = validateTransferDetails({ alias: " superx.salto ", cbu: "0110 0000 0000 0000 0000 01", holder: "", receiptWhatsapp: "+54 9 2364 00-0000" });
  assert.equal(result.valid, true);
  assert.deepEqual(result.details, { alias: "superx.salto", cbu: "0110000000000000000001", receiptWhatsapp: "5492364000000" });
});
test("datos de transferencia: exige alias o CBU y valida formatos", () => {
  assert.equal(validateTransferDetails({ bank: "Nación" }).errors.alias !== undefined, true);
  const result = validateTransferDetails({ alias: "x", cbu: "123", cuit: "20-1", receiptWhatsapp: "12" });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["alias", "cbu", "cuit", "receiptWhatsapp"]);
});
