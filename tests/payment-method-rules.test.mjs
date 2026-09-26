import test from "node:test";
import assert from "node:assert/strict";
import { canSetPaymentMethod, requiresEnableConfirmation } from "../app/lib/payment-method-rules.js";

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
