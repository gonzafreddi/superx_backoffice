import assert from "node:assert/strict";
import test from "node:test";
import { accountStatusLabel, accountTypeLabel, createIdempotencyKey, isReversible, movementColumns, validateAmount, validateTransfer } from "../app/lib/treasury-rules.js";

test("valida importes monetarios positivos sin redondear", () => {
  assert.equal(validateAmount("12.50"), "");
  assert.notEqual(validateAmount("0"), "");
  assert.notEqual(validateAmount("12.345"), "");
  assert.notEqual(validateAmount("-2"), "");
});
test("valida cuentas distintas y moneda idéntica en transferencias", () => {
  assert.equal(validateTransfer({ fromAccountId: "1", toAccountId: "2", fromCurrency: "ARS", toCurrency: "ARS", amount: "1.00" }), "");
  assert.match(validateTransfer({ fromAccountId: "1", toAccountId: "1", fromCurrency: "ARS", toCurrency: "ARS", amount: "1" }), /distintas/);
  assert.match(validateTransfer({ fromAccountId: "1", toAccountId: "2", fromCurrency: "ARS", toCurrency: "USD", amount: "1" }), /misma moneda/);
});
test("clasifica movimientos y sólo habilita reversa manual pendiente", () => {
  assert.deepEqual(movementColumns({ type: "INCOME", amount: "4.00" }), { income: "4.00", expense: null, sign: "+" });
  assert.deepEqual(movementColumns({ type: "EXPENSE", amount: "4.00" }), { income: null, expense: "4.00", sign: "−" });
  assert.equal(isReversible({ type: "INCOME", referenceType: "PAYMENT", reversalOfId: null }), true);
  assert.equal(isReversible({ type: "REVERSAL", referenceType: "MANUAL", reversalOfId: null }), false);
  assert.equal(accountTypeLabel("OWNER"), "Cuenta socios");
  assert.equal(accountStatusLabel(false), "Inactiva");
});
test("conserva la llave de idempotencia al reintentar", () => {
  const generated = createIdempotencyKey("");
  assert.equal(createIdempotencyKey(generated), generated);
});
