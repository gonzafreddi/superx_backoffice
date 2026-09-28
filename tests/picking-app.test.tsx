import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { PickingApp } from "../app/(backoffice)/picking/picking-app";
import type { PickingTask } from "../app/lib/picking-contract";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanup, fireEvent, render, screen } = require("@testing-library/react") as typeof import("@testing-library/react");

const task: PickingTask = { id: "pt-1", orderNumber: "SX-2048", status: "IN_PROGRESS", priority: 0, slotDate: "2026-10-03", slotStart: "10:00:00", assignedPickerId: "me", delivery: { recipientName: "Ana Gómez", phone: "+54 11 5555 0101", addressLine: "Av. Cabildo 1820, 4° B", neighborhood: "Belgrano", postalCode: "1428", cityName: "CABA", addressNotes: "Timbre 4B", customerNotes: "Llamar al llegar", zoneName: "Norte", slotDate: "2026-10-03", slotStart: "10:00:00", slotEnd: "12:00:00" }, items: [{ id: "pi-1", productName: "Yerba", unitCode: "UN", quantityRequired: 1, quantityPicked: 0, locationCode: "A-1", locationSortOrder: 1, status: "PENDING" }] };

afterEach(() => cleanup());

test("picking muestra cliente, zona y franja en la lista y el detalle", async () => {
  render(<PickingApp loadMine={async () => [structuredClone(task)]} loadAvailable={async () => []} loadTask={async () => structuredClone(task)} />);
  await screen.findByText(/SX-2048 · Ana Gómez/);
  assert.match(document.body.textContent ?? "", /Norte · Belgrano · sáb 3 oct 10:00–12:00/);
  fireEvent.click(screen.getByRole("button", { name: /SX-2048/ }));
  await screen.findByText("Cliente");
  assert.match(document.body.textContent ?? "", /Av. Cabildo 1820, 4° B/);
  assert.match(document.body.textContent ?? "", /Timbre 4B · Llamar al llegar/);
  assert.equal(screen.getByRole("link", { name: "+54 11 5555 0101" }).getAttribute("href"), "tel:+541155550101");
});

test("al completar informa que el pedido quedó listo para reparto", async () => {
  const finished = structuredClone(task);
  finished.items[0].status = "PICKED";
  finished.items[0].quantityPicked = 1;
  render(<PickingApp loadMine={async () => [finished]} loadAvailable={async () => []} loadTask={async () => finished} complete={async () => ({ ...finished, status: "COMPLETED" })} />);
  fireEvent.click(await screen.findByRole("button", { name: /SX-2048/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Finalizar picking" }));
  await screen.findByText("SX-2048 quedó listo para reparto.");
  assert.ok(screen.getByRole("button", { name: "Volver a picking" }));
});
