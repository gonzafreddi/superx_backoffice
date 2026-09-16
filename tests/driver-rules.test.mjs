import test from "node:test";
import assert from "node:assert/strict";
import { buildMapsUrl, canMarkDelivered, canReportIncident, canStartDelivery, describeDeliveryProgress, formatPaymentSummary, getAvailableActions, sortDeliveries, validateIncidentInput } from "../app/lib/driver-rules.js";

const delivery = (id, progress, sortOrder = 1) => ({ assignmentId: id, deliveryProgress: progress, sortOrder, orderCode: `SX-${id}`, paymentMethod: "CASH", total: 7850 });

test("sortDeliveries respeta el orden sugerido manual sin mutar la lista", () => {
  const source = [delivery("3", "PENDING", 3), delivery("1", "PENDING", 1), delivery("2", "PENDING", 2)];
  assert.deepEqual(sortDeliveries(source).map((item) => item.assignmentId), ["1", "2", "3"]);
  assert.deepEqual(source.map((item) => item.assignmentId), ["3", "1", "2"]);
});

test("acciones y guards sólo habilitan transiciones válidas", () => {
  assert.equal(canStartDelivery(delivery("1", "PENDING")), true);
  assert.deepEqual(getAvailableActions(delivery("1", "PENDING")), ["start"]);
  assert.equal(canMarkDelivered(delivery("2", "EN_CAMINO")), true);
  assert.equal(canReportIncident(delivery("2", "EN_CAMINO")), true);
  assert.deepEqual(getAvailableActions(delivery("2", "EN_CAMINO")), ["delivered", "incident"]);
  assert.equal(canMarkDelivered(delivery("3", "PENDING")), false);
  assert.deepEqual(getAvailableActions(delivery("3", "ENTREGADO")), []);
  assert.deepEqual(getAvailableActions(delivery("4", "INCIDENCIA")), []);
});

test("validateIncidentInput exige motivo permitido y limita la nota", () => {
  assert.deepEqual(validateIncidentInput({ reason: "", note: "" }), { valid: false, error: "Elegí un motivo de incidencia." });
  assert.equal(validateIncidentInput({ reason: "Cliente ausente", note: "Sin respuesta" }).valid, true);
  assert.equal(validateIncidentInput({ reason: "Otro", note: "x".repeat(281) }).valid, false);
});

test("describeDeliveryProgress y formatPaymentSummary producen copy operativo", () => {
  assert.equal(describeDeliveryProgress("EN_CAMINO"), "En camino");
  assert.equal(describeDeliveryProgress("DESCONOCIDO"), "Sin estado");
  assert.equal(formatPaymentSummary(delivery("1", "PENDING")), "Efectivo · $ 7.850");
});

test("buildMapsUrl arma un deep-link universal con la dirección y la zona", () => {
  const url = buildMapsUrl({ deliveryAddress: "Av. Cabildo 1820, 4° B", deliveryZone: "Belgrano" });
  assert.equal(url, "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Av. Cabildo 1820, 4° B, Belgrano"));
  assert.equal(buildMapsUrl({ deliveryAddress: "Moldes 2480" }), "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Moldes 2480"));
  assert.equal(buildMapsUrl({}), null);
  assert.equal(buildMapsUrl(undefined), null);
});
