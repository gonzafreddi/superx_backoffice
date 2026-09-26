import test from "node:test";
import assert from "node:assert/strict";
import { comboPayload, comboRegularPrice, comboTiming, validateCombo } from "../app/lib/combo-rules.js";

const valid = { name: "Desayuno", description: "Café y galletitas", comboPrice: "2500", isActive: true, validFrom: "2026-09-01T00:00", validUntil: "2026-10-01T00:00", sortOrder: "0", items: [{ productId: "10", quantity: "1" }, { productId: "11", quantity: "2" }] };

test("calcula el precio regular con cantidades", () => {
  assert.equal(comboRegularPrice(valid.items, { 10: 1000, 11: 900 }), 2800);
});

test("valida composición, precio, orden y vigencia", () => {
  assert.deepEqual(validateCombo(valid, 2800), {});
  assert.ok(validateCombo({ ...valid, items: [{ productId: "10", quantity: 1 }] }, 1000).items);
  assert.ok(validateCombo({ ...valid, comboPrice: 2800 }, 2800).comboPrice);
  assert.ok(validateCombo({ ...valid, validUntil: valid.validFrom }, 2800).validUntil);
  assert.ok(validateCombo({ ...valid, sortOrder: -1 }, 2800).sortOrder);
});

test("normaliza el payload del DTO", () => {
  const payload = comboPayload({ ...valid, description: "  " });
  assert.equal(payload.description, undefined);
  assert.equal(payload.comboPrice, 2500);
  assert.deepEqual(payload.items[0], { productId: 10, quantity: 1 });
  assert.match(payload.validFrom, /^2026-09-01T/);
});

test("clasifica la vigencia", () => {
  const now = new Date("2026-09-15T00:00:00Z");
  assert.equal(comboTiming({ validFrom: "2026-09-01", validUntil: "2026-10-01" }, now), "current");
  assert.equal(comboTiming({ validFrom: "2026-10-01", validUntil: null }, now), "upcoming");
  assert.equal(comboTiming({ validFrom: null, validUntil: "2026-09-01" }, now), "expired");
});
