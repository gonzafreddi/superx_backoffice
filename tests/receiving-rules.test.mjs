import test from "node:test";
import assert from "node:assert/strict";
import { lineDifference, matchScannedLine, preselectedLocation, receivingSummary, validateReceiving } from "../app/lib/receiving-rules.js";

const line = (id, pending = 4, location = "10") => ({ purchaseOrderItemId: id, pendingPackages: pending, suggestedLocationId: location, packagingBarcode: `pack-${id}`, product: { barcodes: [`ean-${id}`] } });
test("preselecciona sólo una ubicación sugerida común", () => { assert.equal(preselectedLocation([line("1"), line("2")]), "10"); assert.equal(preselectedLocation([line("1"), line("2", 4, "11")]), ""); });
test("el escaneo matchea EAN de producto o presentación", () => { const lines = [line("1")]; assert.equal(matchScannedLine(lines, "ean-1")?.purchaseOrderItemId, "1"); assert.equal(matchScannedLine(lines, "PACK-1")?.purchaseOrderItemId, "1"); assert.equal(matchScannedLine(lines, "otro"), null); });
test("calcula faltantes, sobrantes y rechazos sobre aceptado", () => { assert.deepEqual(lineDifference(line("1"), { packageQuantity: 5, rejectedPackageQuantity: 2 }), { received: 5, rejected: 2, accepted: 3, delta: -1, missing: 1, extra: 0, hasDifference: true }); });
test("líneas vacías cuentan como cero y exige motivos", () => { const lines = [line("1"), line("2", 1)]; const values = { "1": { packageQuantity: 5 }, "2": {} }; assert.equal(receivingSummary(lines, values).packages, 5); assert.equal(receivingSummary(lines, values).differenceCount, 2); assert.equal(validateReceiving(lines, values, "10").valid, false); values["1"].varianceReason = "Conteo verificado"; assert.equal(validateReceiving(lines, values, "10").valid, true); });
test("sin ubicaciones habilitadas no exige ubicación", () => { const lines = [line("1")]; assert.equal(validateReceiving(lines, { "1": { packageQuantity: 4 } }, "", false).valid, true); assert.equal(validateReceiving(lines, { "1": { packageQuantity: 4 } }, "").valid, false); });
