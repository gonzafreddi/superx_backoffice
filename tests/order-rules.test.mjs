import test from "node:test";
import assert from "node:assert/strict";
import { canRoleTransitionOrder, getAvailableOrderTransitions, getOrderDashboardStatus, getOrderPermissions } from "../app/lib/order-rules.js";
test("consulta no avanza pedidos y sólo administración puede cancelar", () => { const order = { status: "CREATED", paymentRequired: false }; assert.equal(getOrderPermissions("viewer").transition, false); assert.equal(canRoleTransitionOrder("operator", order, "CANCELLED"), false); assert.equal(canRoleTransitionOrder("admin", order, "CANCELLED"), true); });
test("el flujo logístico avanza independientemente del estado de pago", () => { assert.deepEqual(getAvailableOrderTransitions({ status: "CONFIRMED", paymentRequired: true }), ["PICKING", "CANCELLED"]); assert.deepEqual(getAvailableOrderTransitions({ status: "CONFIRMED", paymentRequired: false }), ["PICKING", "CANCELLED"]); });
test("la máquina permite el recorrido operativo y cierra entregados", () => { assert.equal(canRoleTransitionOrder("operator", { status: "PICKING", paymentRequired: false }, "PACKED"), true); assert.equal(canRoleTransitionOrder("operator", { status: "DELIVERED", paymentRequired: false }, "PICKING"), false); });
test("el tablero agrupa los estados intermedios correctamente", () => { assert.equal(getOrderDashboardStatus("PAID"), "confirmed"); assert.equal(getOrderDashboardStatus("PACKED"), "picking"); assert.equal(getOrderDashboardStatus("CANCELLED"), "cancelled"); });

import { buildOrderTransitionEvent, canSubmitOrderTransition, describeOrderTransition, formatDeliveryWindow, isPackingChecklistComplete, requiresPackingChecklist, summarizeOrderCharges } from "../app/lib/order-rules.js";

test("formatDeliveryWindow arma una ventana legible y tolera slots vacíos", () => {
  assert.equal(formatDeliveryWindow({ date: "2026-09-05", startTime: "10:00:00", endTime: "12:00:00" }), "sáb 5 sep · 10:00–12:00");
  assert.equal(formatDeliveryWindow(null), "Sin franja asignada");
  assert.equal(formatDeliveryWindow({ date: "" }), "Sin franja asignada");
});

test("summarizeOrderCharges marca cuando el total no cuadra con el desglose", () => {
  assert.deepEqual(summarizeOrderCharges({ total: 7850, charges: { subtotal: 7350, deliveryFee: 500, discount: 0 } }), { subtotal: 7350, deliveryFee: 500, discount: 0, total: 7850, balanced: true });
  assert.equal(summarizeOrderCharges({ total: 9999, charges: { subtotal: 7350, deliveryFee: 500, discount: 0 } }).balanced, false);
});

test("describeOrderTransition marca la cancelación como acción sensible", () => {
  assert.equal(describeOrderTransition({ code: "SX-1" }, "CANCELLED").danger, true);
  assert.equal(describeOrderTransition({ code: "SX-1" }, "READY").danger, false);
});

test("buildOrderTransitionEvent deja trazabilidad: estado, actor, rol, timestamp y nota", () => {
  const event = buildOrderTransitionEvent({ status: "PICKING", performedBy: "María González", performedByRole: "operator", note: "  arranca picking  " }, "2026-09-10T12:00:00.000Z", "oe-x");
  assert.deepEqual(event, { id: "oe-x", status: "PICKING", occurredAt: "2026-09-10T12:00:00.000Z", actor: "María González", role: "operator", note: "arranca picking" });
  const bare = buildOrderTransitionEvent({ status: "READY", performedBy: "Jorge" }, "2026-09-10T13:00:00.000Z", "oe-y");
  assert.deepEqual(bare, { id: "oe-y", status: "READY", occurredAt: "2026-09-10T13:00:00.000Z", actor: "Jorge" });
});

test("el cierre de picking a READY exige el checklist de empaque completo", () => {
  const packed = { status: "PACKED", paymentRequired: false };
  assert.equal(requiresPackingChecklist(packed, "READY"), true);
  assert.equal(requiresPackingChecklist({ status: "PICKING" }, "PACKED"), false);
  assert.equal(isPackingChecklistComplete({ itemsVerified: true, packagingSealed: true, labelAttached: true }), true);
  assert.equal(isPackingChecklistComplete({ itemsVerified: true, packagingSealed: false, labelAttached: true }), false);
  assert.equal(isPackingChecklistComplete(undefined), false);
  assert.equal(canSubmitOrderTransition(packed, "READY", undefined), false);
  assert.equal(canSubmitOrderTransition(packed, "READY", { itemsVerified: true, packagingSealed: true, labelAttached: false }), false);
  assert.equal(canSubmitOrderTransition(packed, "READY", { itemsVerified: true, packagingSealed: true, labelAttached: true }), true);
  assert.equal(canSubmitOrderTransition({ status: "PICKING", paymentRequired: false }, "PACKED", undefined), true);
});

test("buildOrderTransitionEvent agrega la confirmación del checklist a la nota de READY", () => {
  const event = buildOrderTransitionEvent({ status: "READY", performedBy: "Jorge", checklist: { itemsVerified: true, packagingSealed: true, labelAttached: true } }, "2026-09-16T12:00:00.000Z", "oe-z");
  assert.equal(event.note, "packing checklist confirmed: items verified, packaging sealed, label attached");
  const withNote = buildOrderTransitionEvent({ status: "READY", performedBy: "Jorge", note: "todo ok", checklist: { itemsVerified: true, packagingSealed: true, labelAttached: true } }, "2026-09-16T12:00:00.000Z", "oe-w");
  assert.equal(withNote.note, "todo ok — packing checklist confirmed: items verified, packaging sealed, label attached");
  const incomplete = buildOrderTransitionEvent({ status: "READY", performedBy: "Jorge", checklist: { itemsVerified: true, packagingSealed: false, labelAttached: true } }, "2026-09-16T12:00:00.000Z", "oe-v");
  assert.equal(incomplete.note, undefined);
});
