import test from "node:test";
import assert from "node:assert/strict";
import { mapsUrl, moveItem, paymentHint, slotLabel } from "../app/lib/dispatch-rules.js";

test("moveItem reordena sin mutar la lista", () => {
  const source = ["a", "b", "c"];
  assert.deepEqual(moveItem(source, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(source, ["a", "b", "c"]);
  assert.deepEqual(moveItem(source, -1, 2), source);
});

test("slotLabel muestra hoy o una fecha breve y el rango horario", () => {
  const today = { slotDate: "2026-09-28", slotStart: "10:00:00", slotEnd: "12:00:00" };
  const future = { ...today, slotDate: "2026-10-03" };
  assert.equal(slotLabel(today, new Date(2026, 8, 28, 9)), "hoy 10:00–12:00");
  assert.equal(slotLabel(future, new Date(2026, 8, 28, 9)), "sáb 3 oct 10:00–12:00");
});

test("mapsUrl busca por dirección y ciudad", () => {
  assert.equal(mapsUrl({ addressLine: "Moldes 2480", cityName: "CABA" }), "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Moldes 2480, CABA"));
  assert.equal(mapsUrl({ addressLine: "", cityName: "" }), null);
});

test("paymentHint nunca incluye montos", () => {
  assert.equal(paymentHint({ paymentMethod: "CASH", paymentStatus: "PENDING" }), "Cobra en efectivo");
  assert.equal(paymentHint({ paymentMethod: "CASH", paymentStatus: "PAID" }), "Pagado");
  assert.equal(paymentHint({ paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID" }), "Pagado");
  assert.equal(paymentHint({ paymentMethod: "BANK_TRANSFER", paymentStatus: "PENDING" }), "Pago pendiente (transferencia)");
  assert.equal(paymentHint({ paymentMethod: "MERCADO_PAGO", paymentStatus: "PENDING" }), "Pago pendiente (Mercado Pago)");
});
