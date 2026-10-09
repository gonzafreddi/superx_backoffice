import test from "node:test";
import assert from "node:assert/strict";
import { buildDeliveryChangeEvent, formatWeekdays, getDeliveryPermissions, slotWindowsOverlap, summarizeCheckoutImpact, validateWindowInput, validateZoneInput } from "../app/lib/delivery-rules.js";

test("permisos: consulta sólo lee, operador ajusta horarios, admin edita zonas y crea", () => {
  assert.deepEqual(getDeliveryPermissions("viewer"), { editZone: false, editHours: false, create: false });
  assert.equal(getDeliveryPermissions("operator").editHours, true);
  assert.equal(getDeliveryPermissions("operator").editZone, false);
  assert.deepEqual(getDeliveryPermissions("admin"), { editZone: true, editHours: true, create: true });
});

test("validateZoneInput exige nombre, ciudad, fee válido, umbral coherente y cobertura", () => {
  assert.deepEqual(validateZoneInput({ name: "Centro", cityName: "Salto", postalCodes: ["2741"], neighborhoods: [], deliveryFee: 900, freeDeliveryThreshold: 15000, priority: 0, active: true }), {});
  const errors = validateZoneInput({ name: "", cityName: "", postalCodes: [], neighborhoods: [], deliveryFee: -1, freeDeliveryThreshold: 0, priority: -2, active: true });
  assert.ok(errors.name && errors.cityName && errors.deliveryFee && errors.freeDeliveryThreshold && errors.priority && errors.coverage);
  assert.equal(validateZoneInput({ name: "A", cityName: "B", postalCodes: [], neighborhoods: ["Centro"], deliveryFee: 0, freeDeliveryThreshold: "", priority: 3, active: true }).freeDeliveryThreshold, undefined);
});

test("validateWindowInput exige horario coherente, algún día y que no se pise con otro activo", () => {
  const morning = { id: "w1", startTime: "10:00", endTime: "12:00", weekdays: [1, 2, 3, 4, 5], active: true };
  assert.deepEqual(validateWindowInput({ startTime: "16:00", endTime: "18:00", weekdays: [1], active: true }, [morning]), {});
  assert.ok(validateWindowInput({ startTime: "12:00", endTime: "10:00", weekdays: [1], active: true }).time);
  assert.ok(validateWindowInput({ startTime: "10:00", endTime: "12:00", weekdays: [], active: true }).weekdays);
  assert.ok(validateWindowInput({ startTime: "11:00", endTime: "13:00", weekdays: [5], active: true }, [morning]).time);
  // Mismo horario en días que no se cruzan, un horario pausado o el propio horario editado no chocan.
  assert.deepEqual(validateWindowInput({ startTime: "11:00", endTime: "13:00", weekdays: [6], active: true }, [morning]), {});
  assert.deepEqual(validateWindowInput({ startTime: "11:00", endTime: "13:00", weekdays: [1], active: true }, [{ ...morning, active: false }]), {});
  assert.deepEqual(validateWindowInput({ startTime: "10:00", endTime: "12:30", weekdays: [1], active: true }, [morning], "w1"), {});
});

test("slotWindowsOverlap y formatWeekdays", () => {
  assert.equal(slotWindowsOverlap({ startTime: "10:00", endTime: "12:00" }, { startTime: "12:00", endTime: "14:00" }), false);
  assert.equal(slotWindowsOverlap({ startTime: "10:00", endTime: "12:00" }, { startTime: "11:00", endTime: "13:00" }), true);
  assert.equal(formatWeekdays([0, 1, 2, 3, 4, 5, 6]), "Todos los días");
  assert.equal(formatWeekdays([6, 1, 2, 3, 4, 5]), "Lun a Sáb");
  assert.equal(formatWeekdays([1, 3, 5]), "Lun, Mié, Vie");
  assert.equal(formatWeekdays([6, 0]), "Sáb, Dom");
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
