import test from "node:test";
import assert from "node:assert/strict";
import { canStartOrder, loaderLabel, dispatchErrorMessage, defaultPhase, mapsUrl, moveItem, navigationOrders, nextStop, paymentHint, phaseOrders, progressLabel, routeOrders, slotLabel, unitCount } from "../app/lib/dispatch-rules.js";
const order = (id, status, position, slotStart = "10:00:00", orderNumber = `SX-${id}`) => ({ id, status, position, orderNumber, delivery: { slotStart }, items: [{ quantity: 2 }, { quantity: 3 }] }); const board = { ready: [order("2", "READY", 2)], dispatched: [order("4", "DISPATCHED", 2)], outForDelivery: [order("1", "OUT_FOR_DELIVERY", 1)], delivered: [order("3", "DELIVERED", 3)] };
test("moveItem reordena sin mutar", () => { const source = ["a", "b", "c"]; assert.deepEqual(moveItem(source, 0, 2), ["b", "c", "a"]); assert.deepEqual(source, ["a", "b", "c"]); });
test("slotLabel muestra fecha y rango", () => { const value = { slotDate: "2026-09-28", slotStart: "10:00:00", slotEnd: "12:00:00" }; assert.equal(slotLabel(value, new Date(2026, 8, 28, 9)), "hoy 10:00–12:00"); });
test("mapsUrl crea direcciones y prioriza coordenadas", () => { assert.equal(mapsUrl({ addressLine: "Moldes 2480", cityName: "CABA", postalCode: "1428" }), "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent("Moldes 2480, CABA, 1428")); assert.equal(mapsUrl({}, { lat: -34.2, lng: -60.2 }), "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent("-34.2,-60.2")); });
test("defaultPhase prioriza reparto, carga, cargados y entregados", () => { assert.equal(defaultPhase(board), "delivery"); assert.equal(defaultPhase({ ...board, outForDelivery: [] }), "load"); assert.equal(defaultPhase({ ...board, ready: [], outForDelivery: [] }), "route"); assert.equal(defaultPhase({ ...board, ready: [], dispatched: [], outForDelivery: [] }), "delivered"); assert.equal(defaultPhase({ ready: [], dispatched: [], outForDelivery: [], delivered: [] }), "load"); });
test("phaseOrders ordena carga y compone ruta", () => { const ready = [order("2", "READY", 2, "11:00:00"), order("3", "READY", 3, "09:00:00", "SX-B"), order("1", "READY", 1, "09:00:00", "SX-A")]; const value = { ...board, ready }; assert.deepEqual(phaseOrders(value, "load").map((o) => o.id), ["1", "3", "2"]); assert.deepEqual(phaseOrders(value, "route").map((o) => o.id), ["4"]); assert.deepEqual(phaseOrders(value, "delivery").map((o) => o.id), ["1"]); assert.deepEqual(phaseOrders(value, "delivered").map((o) => o.id), ["3"]); });
test("unitCount suma las cantidades", () => { assert.equal(unitCount(order("1", "READY", 1)), 5); assert.equal(unitCount({ items: [] }), 0); });
test("ruta próxima parada y progreso", () => { assert.deepEqual(routeOrders(board).map((o) => o.id), ["1", "4"]); assert.equal(nextStop(board)?.id, "1"); assert.equal(nextStop(board, "1"), null); assert.equal(progressLabel(board, "4"), "2 de 3"); });
test("navegación y progreso de READY usan solamente Carga", () => { const ready = [order("5", "READY", 5, "12:00:00"), order("6", "READY", 6, "09:00:00")]; const value = { ...board, ready }; assert.deepEqual(navigationOrders(value, ready[0]).map((o) => o.id), ["6", "5"]); assert.equal(progressLabel(value, "5"), "2 de 2"); });
test("paymentHint nunca incluye montos", () => { for (const value of [{ paymentMethod: "CASH", paymentStatus: "PENDING" }, { paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID" }, { paymentMethod: "MERCADO_PAGO", paymentStatus: "PENDING" }]) assert.equal(paymentHint(value).includes("$"), false); });

test("inicio exige DISPATCHED y dueño propio salvo admin", () => {
  const driver = { id: "1", role: "driver" }; const admin = { id: "2", role: "admin" };
  const own = { status: "DISPATCHED", dispatchedBy: { id: "1", name: "Ana" } };
  assert.equal(canStartOrder(own, driver), true);
  assert.equal(canStartOrder(own, admin), true);
  assert.equal(canStartOrder(own, { id: "2", role: "driver" }), false);
  assert.equal(canStartOrder({ ...own, dispatchedBy: null }, driver), false);
  assert.equal(canStartOrder(own, null), false);
  for (const status of ["READY", "OUT_FOR_DELIVERY", "DELIVERED"]) assert.equal(canStartOrder({ ...own, status }, admin), false);
  assert.equal(loaderLabel(own, driver), null);
  assert.equal(loaderLabel(own, admin), "Cargado por Ana");
  assert.equal(dispatchErrorMessage({ status: 409 }, "fallback").includes("Actualizá"), true);
  assert.equal(dispatchErrorMessage({ status: 403 }, "fallback").includes("cargaste vos"), true);
});
