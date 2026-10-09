import test from "node:test";
import assert from "node:assert/strict";
import { formatQuantity, formatWeight, parseKgToGrams, parseQuantity, quantityInput, orderQuantityLabel, orderLineTotal, summarizeQuantities } from "../app/lib/quantity-rules.js";

test("kg locales se convierten a gramos exactos sin redondear cargas inválidas", () => {
  for (const [input, grams] of [["1,25", 1250], ["1.250", 1250], ["0,001", 1], ["-0,125", -125], ["0", 0], [" 2 ", 2000]]) assert.equal(parseKgToGrams(input), grams);
  for (const input of ["", "1,2345", "1.2.3", "1e3", "NaN", Infinity, "9007199254740991", "1,000.50"]) assert.ok(Number.isNaN(parseKgToGrams(input)), String(input));
  assert.equal(parseQuantity("3", "UNIT"), 3);
  assert.ok(Number.isNaN(parseQuantity("3.2", "UNIT")));
  assert.equal(parseQuantity("1,25", "WEIGHT"), 1250);
  assert.equal(quantityInput(1250, "WEIGHT"), "1.25");
});
test("stock kg, pesos de preparación y unidades conservan su precisión", () => {
  assert.equal(formatQuantity(1250, "WEIGHT"), "1,25 kg");
  assert.equal(formatQuantity(1, "WEIGHT"), "0,001 kg");
  assert.equal(formatQuantity(-530, "WEIGHT"), "-0,53 kg");
  assert.equal(formatQuantity(3, "UNIT"), "3 u.");
  assert.equal(formatWeight(500), "500 g");
  assert.equal(formatWeight(1250), "1,25 kg");
  assert.equal(summarizeQuantities([{ quantity: 3 }, { quantity: 1250, saleMode: "WEIGHT" }]), "3 u. · 1,25 kg");
});
test("pedido usa peso real y total final del servidor incluso con descuentos", () => {
  const line = { saleMode: "WEIGHT", quantity: 500, pickedQuantity: 530, unitPrice: 1000, lineTotal: 477 };
  assert.equal(orderQuantityLabel(line), "500 g pedidos · 530 g reales");
  assert.equal(orderQuantityLabel({ ...line, pickedQuantity: null }), "500 g pedidos");
  assert.equal(orderLineTotal(line), 477);
  assert.equal(orderLineTotal({ ...line, lineTotal: undefined }), 530);
  assert.equal(orderLineTotal({ quantity: 3, unitPrice: 100 }), 300);
  assert.equal(orderQuantityLabel({ quantity: 3 }), "3");
});
