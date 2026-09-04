import test from "node:test";
import assert from "node:assert/strict";
import { getPricePermissions, validatePriceUpdate } from "../app/lib/price-rules.js";
test("sólo administración puede actualizar precios masivamente", () => { assert.equal(getPricePermissions("viewer").update, false); assert.equal(getPricePermissions("operator").update, true); assert.equal(getPricePermissions("operator").bulkUpdate, false); assert.equal(getPricePermissions("admin").bulkUpdate, true); });
test("un precio requiere productos, un importe válido no negativo y hasta dos decimales", () => { assert.match(validatePriceUpdate({ productIds: [], amount: 10 }).productIds, /Seleccioná/); assert.match(validatePriceUpdate({ productIds: ["p1"], amount: -1 }).amount, /igual o mayor/); assert.match(validatePriceUpdate({ productIds: ["p1"], amount: 10.999 }).amount, /dos decimales/); assert.deepEqual(validatePriceUpdate({ productIds: ["p1"], amount: 0 }), {}); });
