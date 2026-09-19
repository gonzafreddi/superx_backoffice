import assert from "node:assert/strict";
import test from "node:test";
import { packagingEquivalence, unitsPerPackChanged, validatePackaging } from "../app/lib/packaging-rules.js";

test("packagingEquivalence builds the live pack conversion", () => {
  assert.equal(packagingEquivalence("Caja x24", 24, "unidades"), "1 Caja x24 = 24 unidades");
  assert.equal(packagingEquivalence("Caja", 0, "unidades"), "");
});

test("validatePackaging identifies the required packaging fields", () => {
  assert.deepEqual(validatePackaging({ productId: "", name: "", unitsPerPack: "1.5" }), {
    productId: "Elegí un producto.", name: "El nombre de la presentación es obligatorio.", unitsPerPack: "Las unidades por pack deben ser un entero mayor que cero.",
  });
});

test("unitsPerPackChanged only flags an existing presentation conversion change", () => {
  assert.equal(unitsPerPackChanged(12, "12"), false);
  assert.equal(unitsPerPackChanged(12, "24"), true);
  assert.equal(unitsPerPackChanged(undefined, "24"), false);
});
