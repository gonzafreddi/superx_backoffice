import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { DeliveryBoard } from "../app/(backoffice)/reparto/driver-app";
import type { DispatchBoard, DispatchOrder } from "../app/lib/dispatch-contract";

const makeOrder = (id: string, status: DispatchOrder["status"]): DispatchOrder => ({ id, orderNumber: `SX-${id}`, status, position: Number(id), paymentMethod: "CASH", paymentStatus: "PENDING", delivery: { recipientName: `Cliente ${id}`, phone: "+54 11 5555 0000", addressLine: "Moldes 2480", neighborhood: "Colegiales", postalCode: "1428", cityName: "CABA", addressNotes: null, customerNotes: null, zoneName: "Norte", slotDate: "2026-09-28", slotStart: "10:00:00", slotEnd: "12:00:00" }, items: [{ productName: "Yerba", quantity: 2, unitCode: "UN" }] });
const source: DispatchBoard = { ready: [makeOrder("1", "READY"), makeOrder("2", "READY")], outForDelivery: [makeOrder("3", "OUT_FOR_DELIVERY")] };
const clone = (): DispatchBoard => structuredClone(source);

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanup, fireEvent, render, screen, waitFor } = require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => cleanup());

test("renderiza tarjetas sin precios", async () => {
  render(<DeliveryBoard loadBoard={async () => clone()} />);
  await screen.findByText("SX-1");
  assert.equal(document.body.textContent?.includes("$"), false);
});

test("reordenar con teclado guarda todos los ids en el nuevo orden", async () => {
  let received: string[] = [];
  render(<DeliveryBoard loadBoard={async () => clone()} saveSequence={async (ids) => { received = ids; const board = clone(); board.ready.reverse(); return board; }} />);
  const handle = await screen.findByRole("button", { name: /Mover pedido SX-1/ });
  fireEvent.keyDown(handle, { key: "ArrowDown" });
  await waitFor(() => assert.deepEqual(received, ["2", "1"]));
});

test("salir a repartir envía todos los pedidos listos", async () => {
  let received: string[] = [];
  render(<DeliveryBoard loadBoard={async () => clone()} startDispatch={async (ids) => { received = ids; return { ready: [], outForDelivery: [...clone().outForDelivery, ...clone().ready] }; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Salir a repartir (2)" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar salida" }));
  await waitFor(() => assert.deepEqual(received, ["1", "2"]));
});

test("Entregado actualiza el pedido indicado", async () => {
  let received = "";
  render(<DeliveryBoard loadBoard={async () => clone()} deliver={async (id) => { received = id; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Entregado" }));
  await waitFor(() => assert.equal(received, "3"));
});
