import test from "node:test";
import assert from "node:assert/strict";
import { defaultMethodFor, parseAmountCents, validateOrderPayment } from "../app/lib/purchase-order-payment-rules.js";

test("interpreta importes en formato argentino y con punto decimal", () => {
  assert.equal(parseAmountCents("1.234,56"), 123456n);
  assert.equal(parseAmountCents("1234.5"), 123450n);
  assert.equal(parseAmountCents("$ 1.000"), 100000n);
  assert.equal(parseAmountCents("300"), 30000n);
  assert.equal(parseAmountCents("12,3"), 1230n);
  assert.equal(parseAmountCents("12.50"), 1250n);
  assert.equal(parseAmountCents("1,234.56"), 123456n);
  assert.equal(parseAmountCents("1.2.3"), null);
  assert.equal(parseAmountCents("abc"), null);
  assert.equal(parseAmountCents(""), null);
});

test("valida pago total, parcial y excedido", () => {
  const full = validateOrderPayment({ amount: "700", balance: "700.00", accountId: "1" });
  assert.deepEqual(full, { errors: [], amount: "700.00", remaining: "0.00", isFull: true });
  const partial = validateOrderPayment({ amount: "250,50", balance: "700.00", accountId: "1" });
  assert.equal(partial.remaining, "449.50");
  assert.equal(partial.isFull, false);
  assert.match(validateOrderPayment({ amount: "700.01", balance: "700.00", accountId: "1" }).errors[0], /supera el saldo/);
  assert.match(validateOrderPayment({ amount: "0", balance: "700.00", accountId: "1" }).errors[0], /mayor a cero/);
  assert.match(validateOrderPayment({ amount: "10", balance: "700.00", accountId: "" }).errors[0], /cuenta/);
});

test("sugiere el medio según el tipo de cuenta", () => {
  assert.equal(defaultMethodFor("CASH"), "CASH");
  assert.equal(defaultMethodFor("BANK"), "TRANSFER");
  assert.equal(defaultMethodFor("DIGITAL"), "DIGITAL");
});
