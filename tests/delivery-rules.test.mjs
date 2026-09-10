import test from "node:test";
import assert from "node:assert/strict";
import { buildDeliveryChangeEvent, getDeliveryPermissions, slotOccupancy, slotWindowsOverlap, summarizeCheckoutImpact, validateSlotInput, validateZoneInput } from "../app/lib/delivery-rules.js";

test("permisos: consulta sólo lee, operador ajusta franjas, admin edita zonas y crea", () => {
  assert.deepEqual(getDeliveryPermissions("viewer"), { editZone: false, editSlot: false, create: false });
  assert.equal(getDeliveryPermissions("operator").editSlot, true);
  assert.equal(getDeliveryPermissions("operator").editZone, false);
  assert.deepEqual(getDeliveryPermissions("admin"), { editZone: true, editSlot: true, create: true });
});

test("validateZoneInput exige nombre, ciudad, fee válido, umbral coherente y cobertura", () => {
  assert.deepEqual(validateZoneInput({ name: "Centro", cityName: "Salto", postalCodes: ["2741"], neighborhoods: [], deliveryFee: 900, freeDeliveryThreshold: 15000, priority: 0, active: true }), {});
  const errors = validateZoneInput({ name: "", cityName: "", postalCodes: [], neighborhoods: [], deliveryFee: -1, freeDeliveryThreshold: 0, priority: -2, active: true });
  assert.ok(errors.name && errors.cityName && errors.deliveryFee && errors.freeDeliveryThreshold && errors.priority && errors.coverage);
  assert.equal(validateZoneInput({ name: "A", cityName: "B", postalCodes: [], neighborhoods: ["Centro"], deliveryFee: 0, freeDeliveryThreshold: "", priority: 3, active: true }).freeDeliveryThreshold, undefined);
});

test("validateSlotInput bloquea pasado, rango invertido, capacidad < reservas y solapamiento", () => {
  const today = "2026-09-10";
  assert.deepEqual(validateSlotInput({ date: "2026-09-12", startTime: "10:00", endTime: "12:00", capacity: 8, active: true }, { today, existingSlots: [] }), {});
  assert.ok(validateSlotInput({ date: "2026-09-01", startTime: "10:00", endTime: "12:00", capacity: 8, active: true }, { today }).date);
  assert.ok(validateSlotInput({ date: "2026-09-12", startTime: "12:00", endTime: "10:00", capacity: 8, active: true }, { today }).time);
  assert.ok(validateSlotInput({ date: "2026-09-12", startTime: "10:00", endTime: "12:00", capacity: 3, active: true }, { today, editingSlot: { id: "s1", bookedCount: 7 } }).capacity);
  const overlap = validateSlotInput({ date: "2026-09-12", startTime: "11:00", endTime: "13:00", capacity: 8, active: true }, { today, existingSlots: [{ id: "s2", date: "2026-09-12", startTime: "10:00", endTime: "12:00", active: true }] });
  assert.ok(overlap.time);
});

test("slotWindowsOverlap y slotOccupancy", () => {
  assert.equal(slotWindowsOverlap({ startTime: "10:00", endTime: "12:00" }, { startTime: "12:00", endTime: "14:00" }), false);
  assert.equal(slotWindowsOverlap({ startTime: "10:00", endTime: "12:00" }, { startTime: "11:00", endTime: "13:00" }), true);
  assert.deepEqual(slotOccupancy({ capacity: 12, bookedCount: 12 }), { used: 12, capacity: 12, remaining: 0, full: true, ratio: 1 });
});

test("summarizeCheckoutImpact describe lo que ve el cliente", () => {
  assert.equal(summarizeCheckoutImpact({ active: false, deliveryFee: 900, freeDeliveryThreshold: 15000 }), "Zona inactiva: no se ofrece en el checkout.");
  assert.equal(summarizeCheckoutImpact({ active: true, deliveryFee: 0, freeDeliveryThreshold: null }), "Envío sin cargo · sin envío gratis");
  assert.equal(summarizeCheckoutImpact({ active: true, deliveryFee: 900, freeDeliveryThreshold: 15000 }), "Envío $900 · gratis desde $15.000");
});

test("buildDeliveryChangeEvent deja auditoría con actor, rol y timestamp", () => {
  assert.deepEqual(
    buildDeliveryChangeEvent("Envío $1.000", "Administración actual", "admin", "2026-09-10T12:00:00.000Z", "dc-x"),
    { id: "dc-x", summary: "Envío $1.000", actor: "Administración actual", role: "admin", changedAt: "2026-09-10T12:00:00.000Z" },
  );
});
