import test from "node:test";
import assert from "node:assert/strict";
import { getLocationPermissions, validateLocationInput } from "../app/lib/location-rules.js";

test("sólo operador y administración gestionan ubicaciones", () => {
  assert.equal(getLocationPermissions("viewer").manage, false);
  assert.equal(getLocationPermissions("operator").manage, true);
  assert.equal(getLocationPermissions("admin").manage, true);
});

test("una ubicación exige código y coordenadas", () => {
  const errors = validateLocationInput({ code: "", aisle: "", rack: "", level: "", sortOrder: 0 });
  assert.match(errors.code, /obligatorio/);
  assert.match(errors.aisle, /obligatorio/);
  assert.match(errors.rack, /obligatorio/);
  assert.match(errors.level, /obligatorio/);
});

test("el orden de picking debe ser un entero no negativo", () => {
  assert.match(validateLocationInput({ code: "A-01", aisle: "A", rack: "01", level: "1", sortOrder: -1 }).sortOrder, /mayor/);
  assert.match(validateLocationInput({ code: "A-01", aisle: "A", rack: "01", level: "1", sortOrder: 1.5 }).sortOrder, /entero/);
  assert.deepEqual(validateLocationInput({ code: "A-01", aisle: "A", rack: "01", level: "1", sortOrder: 0 }), {});
});
