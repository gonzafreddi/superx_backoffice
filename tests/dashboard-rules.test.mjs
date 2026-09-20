import assert from "node:assert/strict";
import test from "node:test";
import { decimalToCents, documentHref, documentLabel, formatRange, isNegativeAmount, presetRange } from "../app/lib/dashboard-rules.js";

test("presetRange usa fechas locales inclusivas para hoy y siete días", () => {
  assert.deepEqual(presetRange("today", "2026-09-20"), { from: "2026-09-20", to: "2026-09-20" });
  assert.deepEqual(presetRange("7d", "2026-09-20"), { from: "2026-09-14", to: "2026-09-20" });
});
test("presetRange mes incluye el primer y último día, incluso en febrero bisiesto", () => {
  assert.deepEqual(presetRange("month", "2026-09-20"), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(presetRange("month", "2024-02-11"), { from: "2024-02-01", to: "2024-02-29" });
});
test("reglas de enlace navegan a la ficha real de cada documento", () => {
  assert.equal(documentHref({ type: "SUPPLIER_INVOICE", id: "12" }), "/facturas/12");
  assert.equal(documentHref({ type: "EXPENSE", id: "a/b" }), "/gastos/a%2Fb");
  assert.equal(documentHref({ type: "ASSET", id: "3" }), "/inversiones/3");
  assert.equal(documentLabel("ASSET"), "Inversión");
});
test("centavos compara decimales sin parseFloat", () => {
  assert.equal(decimalToCents("-0.01"), -1n);
  assert.equal(decimalToCents("123.4"), 12340n);
  assert.equal(decimalToCents("inválido"), 0n);
  assert.equal(isNegativeAmount("-12.00"), true);
  assert.equal(isNegativeAmount("0.00"), false);
});
test("formatea rangos de uno y varios días", () => {
  assert.equal(formatRange({ from: "2026-09-20", to: "2026-09-20" }), "2026-09-20");
  assert.equal(formatRange({ from: "2026-09-14", to: "2026-09-20" }), "2026-09-14 a 2026-09-20");
});
