import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { PickingList } from "../app/(backoffice)/picking/picking-app";
import { PickingApiError } from "../app/lib/picking-api";
import { available, cleanup, deferred, fireEvent, render, screen, task, waitFor } from "./picking-test-utils";
import type { PickingTask } from "../app/lib/picking-contract";

afterEach(cleanup);
test("lista muestra resumen, secciones, cliente, ciudad y franja", async () => {
  render(<PickingList loadMine={async () => [task]} loadAvailable={async () => []} />);
  await screen.findByText("PX000008 · Ana Gómez");
  assert.ok(screen.getByRole("heading", { name: "Tus tareas" }));
  assert.ok(screen.getByRole("heading", { name: "En curso (1)" }));
  assert.ok(screen.getByRole("heading", { name: "Disponibles (0)" }));
  assert.match(screen.getByLabelText("Resumen de tareas").textContent ?? "", /En curso1Disponibles0/);
  assert.ok(screen.getByText("CABA"));
  assert.ok(screen.getByText("sáb 3 oct · 10:00–12:00"));
  assert.ok(screen.getByText("0 / 1 productos"));
});
test("lista vacía informa dónde aparecerán las tareas", async () => {
  render(<PickingList loadMine={async () => []} loadAvailable={async () => []} />);
  await screen.findByText("No tenés tareas asignadas.");
  assert.ok(screen.getByText("Cuando tomes un pedido, va a aparecer acá para que puedas gestionarlo."));
});
test("Tomar usa take, bloquea doble envío, refetch de ambas listas y navega", async () => {
  const response = deferred<PickingTask>(); let calls = 0, mineLoads = 0, availableLoads = 0, url = "", taken = false;
  render(<PickingList loadMine={async () => { mineLoads++; return taken ? [task] : []; }} loadAvailable={async () => { availableLoads++; return taken ? [] : [available]; }} take={async (id) => { assert.equal(id, task.id); calls++; await response.promise; taken = true; return task; }} navigate={(path) => { url = path; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Tomar" }));
  assert.equal((screen.getByRole("button", { name: "Tomando…" }) as HTMLButtonElement).disabled, true);
  fireEvent.click(screen.getByRole("button", { name: "Tomando…" }));
  response.resolve(task);
  await waitFor(() => assert.equal(url, "/picking/pt-1"));
  assert.equal(calls, 1); assert.equal(mineLoads, 2); assert.equal(availableLoads, 2);
  assert.ok(screen.getByRole("heading", { name: "En curso (1)" }));
  assert.ok(screen.getByRole("heading", { name: "Disponibles (0)" }));
});
test("409 muestra mensaje y vuelve a consultar ambas listas", async () => {
  let mineLoads = 0, availableLoads = 0, navigated = false;
  render(<PickingList loadMine={async () => { mineLoads++; return []; }} loadAvailable={async () => { availableLoads++; return availableLoads === 1 ? [available] : []; }} take={async () => { throw new PickingApiError("Task already assigned", 409); }} navigate={() => { navigated = true; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Tomar" }));
  await screen.findByText("El pedido ya fue tomado por otro operario.");
  await waitFor(() => assert.equal(availableLoads, 2));
  assert.equal(mineLoads, 2); assert.equal(navigated, false);
  assert.ok(screen.getByRole("heading", { name: "Disponibles (0)" }));
});
test("Continuar inicia tareas ASSIGNED antiguas antes de navegar", async () => {
  let started = false, url = "";
  render(<PickingList loadMine={async () => [{ ...task, status: "ASSIGNED" }]} loadAvailable={async () => []} start={async () => { started = true; return task; }} navigate={(path) => { assert.equal(started, true); url = path; }} />);
  fireEvent.click(await screen.findByRole("button", { name: "Continuar picking" }));
  await waitFor(() => assert.equal(url, "/picking/pt-1"));
});
test("error de carga permite reintentar y autenticación tiene ingreso", async () => {
  let fail = true;
  render(<PickingList loadMine={async () => { if (fail) throw new Error("technical"); return []; }} loadAvailable={async () => []} />);
  fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
  fail = false;
  fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
  await screen.findByText("No tenés tareas asignadas.");
  cleanup();
  render(<PickingList loadMine={async () => { throw new PickingApiError("Unauthorized", 401); }} loadAvailable={async () => []} />);
  await screen.findByRole("heading", { name: "Iniciá sesión" });
  assert.ok(screen.getByRole("link", { name: "Ingresar" }));
});
