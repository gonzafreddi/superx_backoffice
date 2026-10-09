import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { OrderLines } from "../app/components/purchase-orders/editor/order-lines";
import type { Line } from "../app/components/purchase-orders/editor/types";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/compras/nueva" });
Object.assign(globalThis, { window: dom.window, self: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle, SVGElement: dom.window.SVGElement });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanup, fireEvent, render, screen } = require("@testing-library/react") as typeof import("@testing-library/react"); afterEach(() => cleanup());
const searchLine = (query: string): Line => ({ product: null, packagingId: "", packagingName: "", unitsPerPack: "", packageQuantity: "", costPerPackage: "", discountAmount: "", taxRate: "", taxIds: [], packagings: [], query, results: [{ id: "1", name: "Yerba Playadito", slug: "yerba-playadito" }] });
const noop = () => undefined;
const renderLines = (overrides: Partial<React.ComponentProps<typeof OrderLines>> = {}) => render(<OrderLines lines={[searchLine("yerba")]} errors={{}} warnings={{}} readOnly={false} taxes={[]} taxCatalogAvailable={false} onUpdate={noop} onSearch={noop} onSelectProduct={noop} onSelectPackaging={noop} onAdd={noop} onRemove={noop} onCreateProduct={noop} focusPacks={null} {...overrides}/>);
const createButton = () => screen.queryByRole("button", { name: /Crear producto «yerba»/ });

test("los resultados solo aparecen con el buscador enfocado", () => { renderLines(); assert.equal(createButton(), null); const input = screen.getByLabelText("Producto línea 1"); fireEvent.focus(input); assert.ok(createButton()); fireEvent.blur(input); assert.equal(createButton(), null); });
test("crear producto cierra los resultados para no tapar el diálogo", () => { let created = ""; renderLines({ onCreateProduct: (_index, query) => { created = query; } }); fireEvent.focus(screen.getByLabelText("Producto línea 1")); fireEvent.mouseDown(createButton()!); assert.equal(created, "yerba"); assert.equal(createButton(), null); });
test("elegir un resultado o Escape cierran la lista", () => { let selected = ""; renderLines({ onSelectProduct: (_index, product) => { selected = product.name; } }); const input = screen.getByLabelText("Producto línea 1"); fireEvent.focus(input); fireEvent.keyDown(input, { key: "Escape" }); assert.equal(createButton(), null); fireEvent.change(input, { target: { value: "yerb" } }); fireEvent.click(screen.getByRole("button", { name: "Yerba Playadito" })); assert.equal(selected, "Yerba Playadito"); assert.equal(createButton(), null); });

test("línea WEIGHT muestra kg y convierte coma decimal a gramos para compras", () => {
  const line = { ...searchLine("queso"), product: { id: "5", name: "Queso", slug: "queso", saleMode: "WEIGHT" as const }, unitsPerPack: "1250", packageQuantity: "2", costPerPackage: "1000" };
  let saved: Partial<Line> = {};
  renderLines({ lines: [line], onUpdate: (_index, patch) => { saved = patch; } });
  const input = screen.getByLabelText("Kg por pack línea 1") as HTMLInputElement;
  assert.equal(input.value, "1.25");
  assert.ok(screen.getByText("2,5 kg"));
  fireEvent.change(input, { target: { value: "0,530" } });
  assert.deepEqual(saved, { unitsPerPack: "530" });
});
