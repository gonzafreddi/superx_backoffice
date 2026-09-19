import test from "node:test";
import assert from "node:assert/strict";
import { getLocationPermissions, validateLocationInput, getLocationOccupancy, validateAddLocationStock, validateLocationTransfer, validateLocationAdjustment } from "../app/lib/location-rules.js";

test("sólo operador y administración gestionan ubicaciones", () => {
  assert.equal(getLocationPermissions("viewer").manage, false);
  assert.equal(getLocationPermissions("viewer").createWarehouse, false);
  assert.equal(getLocationPermissions("operator").manage, true);
  assert.equal(getLocationPermissions("admin").manage, true);
  assert.equal(getLocationPermissions("admin").createWarehouse, true);
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
test("ocupación mantiene ratio, lleno y umbrales", () => { assert.deepEqual(getLocationOccupancy(70, 100), { ratio: .7, full: false, tone: "warning" }); assert.equal(getLocationOccupancy(100, 100).full, true); assert.equal(getLocationOccupancy(20, null).ratio, 0); });
test("stock por ubicación exige cantidades válidas y destinos distintos", () => { assert.match(validateAddLocationStock({ quantity: 0 }).quantity, /mayor/); assert.match(validateLocationTransfer({ locationId: "a", toLocationId: "a", quantity: 2, availableQuantity: 1 }).toLocationId, /distinta/); assert.match(validateLocationTransfer({ locationId: "a", toLocationId: "b", quantity: 2, availableQuantity: 1 }).quantity, /supera/); });
test("ajustes exigen motivo, permiten set no negativo y delta no nulo", () => { assert.match(validateLocationAdjustment({ mode: "set", quantity: -1, reason: "OTHER" }).quantity, /no negativo/); assert.match(validateLocationAdjustment({ mode: "delta", quantity: 0, reason: "OTHER" }).quantity, /distinto/); assert.match(validateLocationAdjustment({ mode: "set", quantity: 0 }).reason, /motivo/); assert.deepEqual(validateLocationAdjustment({ mode: "set", quantity: 0, reason: "PHYSICAL_COUNT" }), {}); });
