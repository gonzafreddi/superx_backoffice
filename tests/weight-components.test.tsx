import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductSaleFields } from "../app/components/products/product-sale-fields";
import { ProductQuantityInput } from "../app/components/ui/product-quantity-input";
import { MoveStockModal, AdjustStockModal } from "../app/components/locations/location-modals";
import { PricesTable } from "../app/components/prices/price-workspace";
import type { ProductInput } from "../app/lib/product-contract";
import type { Price } from "../app/lib/price-contract";
import { cleanup, fireEvent, render, screen } from "./picking-test-utils";

afterEach(cleanup);
test("selector de venta activa defaults y ayuda; UNIT oculta mínimos", () => {
  const initial: ProductInput = { name: "Queso", categoryId: "1", brandId: "1", unit: "KG", description: "", barcode: "", imageUrl: "", active: true };
  function Form() { const [form, setForm] = useState(initial); return <ProductSaleFields form={form} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} />; }
  render(<Form />);
  assert.equal(screen.queryByLabelText("Mínimo (g)"), null);
  fireEvent.change(screen.getByLabelText("Se vende por"), { target: { value: "WEIGHT" } });
  assert.equal((screen.getByLabelText("Mínimo (g)") as HTMLInputElement).value, "250");
  assert.equal((screen.getByLabelText("Incremento (g)") as HTMLInputElement).value, "250");
  assert.ok(screen.getByText("El precio cargado es por kilo"));
  fireEvent.change(screen.getByLabelText("Mínimo (g)"), { target: { value: "" } });
  assert.equal((screen.getByLabelText("Mínimo (g)") as HTMLInputElement).value, "");
});
test("input kg conserva coma y borrado, informa gramos o NaN y permite cambio externo", () => {
  let quantity = 0;
  const view = render(<ProductQuantityInput aria-label="Cantidad kg" saleMode="WEIGHT" value={1250} onChange={(next) => { quantity = next; }} />);
  const input = screen.getByLabelText("Cantidad kg") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "0,530" } });
  assert.equal(quantity, 530); assert.equal(input.value, "0,530");
  view.rerender(<ProductQuantityInput aria-label="Cantidad kg" saleMode="WEIGHT" value={quantity} onChange={(next) => { quantity = next; }} />);
  assert.equal(input.value, "0,530");
  fireEvent.change(input, { target: { value: "" } }); assert.ok(Number.isNaN(quantity));
  view.rerender(<ProductQuantityInput aria-label="Cantidad kg" saleMode="WEIGHT" value={2000} onChange={(next) => { quantity = next; }} />);
  assert.equal(input.value, "2");
});
const stock = { product: { id: "5", name: "Queso", saleMode: "WEIGHT" as const }, quantity: 1500, availableQuantity: 1250, reservedQuantity: 250 };
test("movimiento de ubicación envía gramos y rechaza exceder disponible", () => {
  let submitted = 0;
  const location = { id: "b", warehouseId: "1", code: "B", aisle: "B", rack: "1", level: "1", sortOrder: 0, status: "ACTIVE" as const, isActive: true, capacity: null, capacityUnit: null, createdAt: "", updatedAt: "" };
  render(<MoveStockModal item={stock} originId="a" locations={[location]} onClose={() => {}} pending={false} onSubmit={(value) => { submitted = value.quantity; }} />);
  fireEvent.change(screen.getByLabelText("Destino"), { target: { value: "b" } });
  fireEvent.change(screen.getByLabelText("Cantidad (kg)"), { target: { value: "1,251" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar movimiento" }));
  assert.equal(submitted, 0);
  assert.ok(screen.getByText("La cantidad supera el disponible en origen."));
  fireEvent.change(screen.getByLabelText("Cantidad (kg)"), { target: { value: "0,530" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar movimiento" })); assert.equal(submitted, 530);
});
test("ajuste negativo WEIGHT calcula vista previa y envía gramos", () => {
  let submitted = 0;
  render(<AdjustStockModal item={stock} onClose={() => {}} pending={false} onSubmit={(value) => { submitted = value.quantity; }} />);
  fireEvent.change(screen.getByLabelText("Variación (kg)"), { target: { value: "-0,250" } });
  fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "LOSS" } });
  assert.ok(screen.getByText("1,25 kg"));
  fireEvent.click(screen.getByRole("button", { name: "Guardar ajuste" })); assert.equal(submitted, -250);
});
test("grilla de precios señala por kg sólo para WEIGHT", () => {
  const price: Price = { productId: "5", name: "Queso", slug: "queso", saleMode: "WEIGHT", categoryId: "1", categoryName: "Lácteos", brandId: "1", brandName: "Marca", imageUrl: "", cost: 900, price: 1000, previousPrice: null, margin: 10, promo: null, status: "active" };
  const html = renderToStaticMarkup(<PricesTable items={[price, { ...price, productId: "6", name: "Unidad", saleMode: "UNIT" }]} selectedId={null} onSelect={() => {}} filters={{}} setFilters={() => {}} />);
  assert.equal(html.match(/\/kg/g)?.length, 1);
});
