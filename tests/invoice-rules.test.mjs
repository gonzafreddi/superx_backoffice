import test from "node:test";
import assert from "node:assert/strict";
import { centsToDecimal, suggestDueDate, toCents, validateInvoice } from "../app/lib/invoice-rules.js";
test("centavos preservan redondeo decimal", () => { assert.equal(centsToDecimal(toCents("12.3") + toCents("0.07")), "12.37"); });
test("sugiere vencimiento desde el plazo", () => assert.equal(suggestDueDate("2026-09-19", 30), "2026-10-19"));
test("valida punto de venta, número y fechas", () => { const errors = validateInvoice({ pointOfSale:"x",number:"",issueDate:"2026-09-20",dueDate:"2026-09-19",subtotal:"1",discountTotal:"0",taxTotal:"0" }); assert.ok(errors.pointOfSale); assert.ok(errors.number); assert.ok(errors.dueDate); });
