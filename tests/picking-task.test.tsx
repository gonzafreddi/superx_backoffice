import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { PickingTask } from "../app/(backoffice)/picking/picking-task";
import { PickingApiError } from "../app/lib/picking-api";
import type { PickingTask as Task } from "../app/lib/picking-contract";
import { cleanup, deferred, fireEvent, render, screen, task, waitFor, within } from "./picking-test-utils";

afterEach(cleanup);
function setup(initial = task) {
  let current = structuredClone(initial), loads = 0;
  const calls: unknown[][] = [];
  const deps = {
    loadMine: async () => [current],
    loadTask: async () => { loads++; return structuredClone(current); },
    pick: async (id: string, itemId: string, quantity: number, barcode?: string) => { calls.push(["pick", id, itemId, quantity, barcode]); current.items = current.items.map((item) => item.id === itemId ? { ...item, quantityPicked: quantity, status: quantity === item.quantityRequired ? "PICKED" : "PENDING" } : item); return structuredClone(current); },
    complete: async () => { calls.push(["complete"]); current = { ...current, status: "COMPLETED" }; return structuredClone(current); },
  };
  return { deps, calls, current: () => current, loads: () => loads, update: (next: Task) => { current = next; } };
}
test("detalle conserva cliente; stepper confirma cantidad, permite editar y actualiza progreso", async () => {
  const s = setup();
  render(<PickingTask id={task.id} {...s.deps} />);
  await screen.findByText("Yerba");
  assert.match(document.body.textContent ?? "", /Av. Cabildo 1820, 4° B/);
  assert.equal(screen.getByRole("link", { name: "+54 11 5555 0101" }).getAttribute("href"), "tel:+541155550101");
  assert.equal((screen.getByRole("button", { name: "Finalizar picking" }) as HTMLButtonElement).disabled, true);
  fireEvent.click(screen.getByRole("button", { name: "Restar una unidad · Preparado" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() => assert.equal(s.calls.length, 1));
  assert.deepEqual(s.calls[0], ["pick", task.id, "pi-1", 2, undefined]);
  await waitFor(() => assert.equal((screen.getByRole("button", { name: "Sumar una unidad · Preparado" }) as HTMLButtonElement).disabled, false));
  fireEvent.click(screen.getByRole("button", { name: "Sumar una unidad · Preparado" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await screen.findByText("1 de 1 productos preparados");
  assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuenow"), "100");
  assert.ok(s.loads() >= 3);
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  assert.ok(screen.getByRole("button", { name: "Confirmar" }));
});
test("Finalizar exige confirmación, bloquea mientras procesa y muestra éxito", async () => {
  const resolved = structuredClone(task); resolved.items[0].quantityPicked = 3; resolved.items[0].status = "PICKED";
  const s = setup(resolved), finish = deferred<Task>();
  render(<PickingTask id={task.id} {...s.deps} complete={async () => { const next = await finish.promise; s.update(next); return next; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Finalizar picking" }));
  const dialog = screen.getByRole("dialog", { name: "Finalizar picking" });
  assert.ok(within(dialog).getByText("¿Confirmás que todos los productos fueron preparados correctamente?"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  assert.equal(screen.queryByRole("dialog"), null);
  fireEvent.click(screen.getByRole("button", { name: "Finalizar picking" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Finalizar picking" }));
  assert.equal((screen.getByRole("button", { name: "Finalizando…" }) as HTMLButtonElement).disabled, true);
  finish.resolve({ ...resolved, status: "COMPLETED" });
  await screen.findByRole("heading", { name: "Picking completado" });
  assert.ok(screen.getByText("El pedido está listo para reparto."));
});
test("faltante registra primero cantidad disponible y luego resolución con motivo", async () => {
  const s = setup();
  render(<PickingTask id={task.id} {...s.deps} reportShortage={async (id, itemId, resolution, substituteId, note) => {
    s.calls.push(["shortage", id, itemId, resolution, substituteId, note]);
    assert.equal(s.current().items[0].quantityPicked, 1);
    const next = structuredClone(s.current()); next.items[0].status = "SHORT"; s.update(next); return next;
  }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Reportar faltante" }));
  fireEvent.click(screen.getByRole("button", { name: "Sumar una unidad · Cantidad disponible" }));
  fireEvent.click(screen.getByRole("radio", { name: "Producto dañado" }));
  fireEvent.change(screen.getByLabelText("Detalle opcional"), { target: { value: "Envase abierto" } });
  fireEvent.click(screen.getByRole("radio", { name: "Quitar producto" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar incidencia" }));
  await screen.findByText("Faltante", { selector: "span" });
  assert.deepEqual(s.calls, [["pick", task.id, "pi-1", 1, undefined], ["shortage", task.id, "pi-1", "REMOVE_ITEM", undefined, "Producto dañado: Envase abierto"]]);
  assert.equal(screen.queryByRole("button", { name: "Editar" }), null);
});
test("si pick falla no reporta faltante y mantiene el formulario con error inline traducido", async () => {
  const s = setup(); let shortages = 0;
  render(<PickingTask id={task.id} {...s.deps} pick={async () => { throw new PickingApiError("Internal server error", 500); }} reportShortage={async () => { shortages++; return task; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Reportar faltante" }));
  fireEvent.click(screen.getByRole("button", { name: "Sumar una unidad · Cantidad disponible" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar incidencia" }));
  await screen.findByText("No pudimos guardar los cambios. Intentá de nuevo.");
  assert.equal(shortages, 0);
  assert.ok(screen.getByRole("region", { name: "Producto faltante" }));
  assert.doesNotMatch(document.body.textContent ?? "", /Internal server error/);
});
test("escaneo suma una unidad con barcode y avisa cuando no coincide", async () => {
  const s = setup();
  render(<PickingTask id={task.id} {...s.deps} />);
  fireEvent.change(await screen.findByLabelText("Escanear código"), { target: { value: "779123" } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
  await waitFor(() => assert.deepEqual(s.calls[0], ["pick", task.id, "pi-1", 1, "779123"]));
  await waitFor(() => assert.equal((screen.getByLabelText("Escanear código") as HTMLInputElement).value, ""));
  fireEvent.change(screen.getByLabelText("Escanear código"), { target: { value: "000" } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
  assert.ok((await screen.findAllByText(/El código no coincide con un producto pendiente/)).length > 0);
  assert.equal(s.calls.length, 1);
});
test("reemplazo exige seleccionar un sustituto y tolera error de búsqueda", async () => {
  const s = setup(); let fail = true;
  render(<PickingTask id={task.id} {...s.deps} searchProducts={async () => { if (fail) throw new Error("offline"); return [{ id: "22", name: "Yerba alternativa" }]; }} reportShortage={async (_id, _item, resolution, substituteId) => { assert.equal(resolution, "REPLACE_SIMILAR"); assert.equal(substituteId, "22"); const next = structuredClone(s.current()); next.items[0].status = "SUBSTITUTED"; s.update(next); return next; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Reportar faltante" }));
  fireEvent.click(screen.getByRole("radio", { name: "Reemplazar por similar" }));
  assert.equal((screen.getByRole("button", { name: "Confirmar incidencia" }) as HTMLButtonElement).disabled, true);
  fireEvent.change(screen.getByLabelText("Buscar producto sustituto"), { target: { value: "yer" } });
  await screen.findByText(/No pudimos buscar productos/);
  fail = false;
  fireEvent.change(screen.getByLabelText("Buscar producto sustituto"), { target: { value: "yerba" } });
  fireEvent.click(await screen.findByRole("button", { name: "Yerba alternativa" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar incidencia" }));
  await screen.findByText("Sustituido", { selector: "span" });
});
test("muestra todas las líneas por ubicación y no edita SHORT/SUBSTITUTED", async () => {
  const next = structuredClone(task); next.items.push({ ...next.items[0], id: "pi-2", productName: "Agua", locationSortOrder: 0, status: "SHORT" });
  const s = setup(next);
  render(<PickingTask id={task.id} {...s.deps} />);
  await screen.findByText("Agua");
  assert.deepEqual(screen.getAllByRole("article").map((a) => a.getAttribute("aria-label")), ["Agua", "Yerba"]);
  assert.equal(within(screen.getByRole("article", { name: "Agua" })).queryByRole("button"), null);
});
test("tarea ajena, cancelada y 404 tienen estado claro; completada muestra éxito", async () => {
  for (const scenario of ["other", "cancelled", "404", "completed"]) {
    render(<PickingTask id={task.id} loadMine={async () => []} loadTask={async () => { if (scenario === "404") throw new PickingApiError("Not found", 404); return { ...task, status: scenario === "cancelled" ? "CANCELLED" : scenario === "completed" ? "COMPLETED" : "IN_PROGRESS" }; }} />);
    await screen.findByRole("heading", { name: scenario === "completed" ? "Picking completado" : "Tarea no disponible" });
    assert.equal(screen.queryByRole("button", { name: "Confirmar" }), null);
    assert.ok(screen.getByRole("link", { name: "← Volver a Picking" }));
    cleanup();
  }
});

const weightTask = () => { const next = structuredClone(task); next.items[0] = { ...next.items[0], productName: "Queso", saleMode: "WEIGHT", quantityRequired: 500, quantityPicked: 0, unitCode: "KG", unitName: "Kilogramo" }; return next; };
test("WEIGHT exige peso real, confirma menos del pedido y permite corregir hasta +15% sin dinero", async () => {
  const s = setup(weightTask());
  const recordWeight = async (id: string, itemId: string, grams: number) => { s.calls.push(["weight", id, itemId, grams]); const next = structuredClone(s.current()); next.items[0].quantityPicked = grams; next.items[0].status = "PICKED"; s.update(next); return next; };
  render(<PickingTask id={task.id} {...s.deps} recordWeight={recordWeight} />);
  await screen.findByText("Queso");
  assert.match(document.body.textContent ?? "", /Pedido: 500 g/);
  const confirm = screen.getByRole("button", { name: "Confirmar" }) as HTMLButtonElement;
  assert.equal(confirm.disabled, true);
  fireEvent.change(screen.getByRole("spinbutton", { name: /^Peso real/ }), { target: { value: "450" } });
  fireEvent.click(confirm);
  await screen.findByText("500 g pedidos · 450 g reales");
  assert.deepEqual(s.calls, [["weight", task.id, "pi-1", 450]]);
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: /^Peso real/ }), { target: { value: "576" } });
  assert.ok(screen.getByText("Peso fuera de tolerancia. Corregí el peso real."));
  assert.equal((screen.getByRole("button", { name: "Confirmar" }) as HTMLButtonElement).disabled, true);
  fireEvent.change(screen.getByRole("spinbutton", { name: /^Peso real/ }), { target: { value: "575" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await screen.findByText("500 g pedidos · 575 g reales");
  assert.deepEqual(s.calls[1], ["weight", task.id, "pi-1", 575]);
  assert.doesNotMatch(document.body.textContent ?? "", /\$|precio|total|saldo/i);
});
test("escaneo WEIGHT ubica el campo pero no confirma peso ni suma gramos", async () => {
  const s = setup(weightTask());
  render(<PickingTask id={task.id} {...s.deps} recordWeight={async () => { throw new Error("No debe confirmar por escaneo"); }} />);
  await screen.findByText("Queso");
  fireEvent.change(screen.getByLabelText("Escanear código"), { target: { value: "779123" } });
  fireEvent.click(screen.getByRole("button", { name: "Registrar" }));
  await screen.findAllByText("Ingresá el peso real (g) en la línea antes de confirmar.");
  assert.equal(s.calls.length, 0);
  assert.equal(document.activeElement?.id, "weight-pi-1");
});
test("error 400 de peso se muestra en la línea sin marcarla preparada", async () => {
  const s = setup(weightTask());
  render(<PickingTask id={task.id} {...s.deps} recordWeight={async () => { throw new PickingApiError("Peso fuera de tolerancia", 400); }} />);
  await screen.findByText("Queso");
  fireEvent.change(screen.getByRole("spinbutton", { name: /^Peso real/ }), { target: { value: "530" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await screen.findByText("Peso fuera de tolerancia");
  assert.equal(s.current().items[0].status, "PENDING");
  assert.ok(screen.getByRole("spinbutton", { name: /^Peso real/ }));
});
test("faltante WEIGHT conserva cantidad parcial en gramos en el endpoint pick existente", async () => {
  const s = setup(weightTask());
  render(<PickingTask id={task.id} {...s.deps} reportShortage={async (id, itemId, resolution) => { s.calls.push(["shortage", id, itemId, resolution]); const next = structuredClone(s.current()); next.items[0].status = "SHORT"; s.update(next); return next; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Reportar faltante" }));
  fireEvent.change(screen.getByLabelText("Cantidad disponible (g)"), { target: { value: "300" } });
  fireEvent.click(screen.getByRole("radio", { name: "Quitar producto" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar incidencia" }));
  await screen.findByText("Faltante", { selector: "span" });
  assert.deepEqual(s.calls, [["pick", task.id, "pi-1", 300, undefined], ["shortage", task.id, "pi-1", "REMOVE_ITEM"]]);
});
