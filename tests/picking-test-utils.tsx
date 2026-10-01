import { JSDOM } from "jsdom";
import type { PickingTask } from "../app/lib/picking-contract";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.assign(globalThis, { window: dom.window, self: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const { cleanup, fireEvent, render, screen, waitFor, within } = require("@testing-library/react") as typeof import("@testing-library/react");
export const task: PickingTask = { id: "pt-1", orderNumber: "PX000008", status: "IN_PROGRESS", priority: 0, slotDate: "2026-10-03", slotStart: "10:00:00", assignedPickerId: "me", delivery: { recipientName: "Ana Gómez", phone: "+54 11 5555 0101", addressLine: "Av. Cabildo 1820, 4° B", neighborhood: "Belgrano", postalCode: "1428", cityName: "CABA", addressNotes: "Timbre 4B", customerNotes: "Llamar al llegar", zoneName: "Norte", slotDate: "2026-10-03", slotStart: "10:00:00", slotEnd: "12:00:00" }, items: [{ id: "pi-1", productName: "Yerba", unitCode: "UN", quantityRequired: 3, quantityPicked: 0, locationCode: "A-1", locationSortOrder: 1, status: "PENDING", barcodes: ["779123"], productImageUrl: null, brandName: "SuperX", unitName: "paquete" }] };
export const available = { ...task, status: "PENDING" as const, assignedPickerId: null };
export function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
