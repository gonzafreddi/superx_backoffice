import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { DispatchApiError } from "../app/lib/dispatch-api";
import { DeliveryBoard } from "../app/(driver)/reparto/driver-app";
import type { DispatchBoard, DispatchOrder, IncidentReason } from "../app/lib/dispatch-contract";
const makeOrder = (id: string, status: DispatchOrder["status"]): DispatchOrder => ({ id, orderNumber: `SX-${id}`, status, position: Number(id), paymentMethod: "CASH", paymentStatus: "PENDING", delivery: { recipientName: `Cliente ${id}`, phone: "+54 11 5555 0000", addressLine: "Moldes 2480", neighborhood: "Colegiales", postalCode: "1428", cityName: "CABA", addressNotes: null, customerNotes: null, zoneName: "Norte", slotDate: "2026-09-28", slotStart: "10:00:00", slotEnd: "12:00:00" }, location: null, dispatchedBy: status === "READY" ? null : { id: "fixture-admin", name: "Admin" }, dispatchedAt: status === "READY" ? null : "2026-09-28T10:00:00Z", deliveredAt: status === "DELIVERED" ? "2026-09-28T11:00:00Z" : null, incident: null, items: [{ productName: "Yerba", quantity: 2, unitCode: "UN", imageUrl: null }] });
const createBoard = (ready: DispatchOrder[] = [], dispatched: DispatchOrder[] = [], out: DispatchOrder[] = [], delivered: DispatchOrder[] = []): DispatchBoard => ({ date: "2026-09-28", ready, dispatched, outForDelivery: out, delivered, summary: { total: ready.length + dispatched.length + out.length + delivered.length, pending: ready.length + dispatched.length + out.length, delivered: delivered.length, incidents: [...ready, ...dispatched, ...out, ...delivered].filter((o) => o.incident).length } });
const ready3 = [makeOrder("1", "READY"), makeOrder("2", "READY"), makeOrder("3", "READY")]; const estimateRoute = async () => ({ available: false as const, reason: "Sin ruta" });
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/reparto?tab=pedidos" });
Object.assign(globalThis, { window: dom.window, self: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle, SVGElement: dom.window.SVGElement, PopStateEvent: dom.window.PopStateEvent });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
dom.window.sessionStorage.setItem("superx.access-user", JSON.stringify({ id: "fixture-admin", email: "admin@fixture.local", role: "admin", name: "Admin" }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cleanup, fireEvent, render, screen, waitFor, within } = require("@testing-library/react") as typeof import("@testing-library/react"); afterEach(() => { cleanup(); dom.window.sessionStorage.setItem("superx.access-user", JSON.stringify({ id: "fixture-admin", role: "admin", name: "Admin" })); dom.window.history.replaceState({}, "", "/reparto?tab=pedidos"); });
test("elige la fase inicial según el board", async () => { for (const [board, selected] of [[createBoard(ready3), "Por cargar 3"], [createBoard([], [makeOrder("1", "DISPATCHED")]), "Cargados 1"], [createBoard([], [], [makeOrder("1", "OUT_FOR_DELIVERY")]), "En reparto 1"]] as const) { const view = render(<DeliveryBoard loadBoard={async () => board} estimateRoute={estimateRoute}/>); assert.equal((await screen.findByRole("tab", { name: selected })).getAttribute("aria-selected"), "true"); view.unmount(); } });
test("selecciona dos listos, confirma la carga exacta y vuelve a cero", async () => { let received: string[] = []; const initial = createBoard(ready3); render(<DeliveryBoard loadBoard={async () => initial} estimateRoute={estimateRoute} assignToDispatch={async (ids) => { received = ids; return createBoard([ready3[2]], ids.map((id) => makeOrder(id, "DISPATCHED"))); }}/>); const disabled = await screen.findByRole("button", { name: "Elegí pedidos para cargar" }); assert.equal(disabled.hasAttribute("disabled"), true); fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar pedido SX-1" })); fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar pedido SX-2" })); fireEvent.click(screen.getByRole("button", { name: "Cargar 2 pedidos" })); assert.ok(screen.getByRole("heading", { name: "Cargar 2 pedidos" })); fireEvent.click(screen.getByRole("button", { name: "Cargar" })); await waitFor(() => assert.deepEqual(received, ["1", "2"])); assert.equal(screen.getByRole("button", { name: "Elegí pedidos para cargar" }).hasAttribute("disabled"), true); });
test("seleccionar todos prepara los tres pedidos", async () => { render(<DeliveryBoard loadBoard={async () => createBoard(ready3)} estimateRoute={estimateRoute}/>); fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar todos" })); assert.ok(screen.getByRole("button", { name: "Cargar 3 pedidos" })); });
test("carga un pedido desde el detalle", async () => { let received: string[] = []; const initial = createBoard([ready3[0]]); render(<DeliveryBoard loadBoard={async () => initial} estimateRoute={estimateRoute} assignToDispatch={async (ids) => { received = ids; return createBoard([], [makeOrder("1", "DISPATCHED")]); }}/>); fireEvent.click(await screen.findByRole("button", { name: /SX-1/ })); fireEvent.click(screen.getByRole("button", { name: "Marcar como cargado" })); await waitFor(() => assert.deepEqual(received, ["1"])); await waitFor(() => assert.equal(screen.queryByRole("complementary", { name: "Detalle de SX-1" }), null)); });
test("detalle READY muestra progreso y recorre solamente Carga", async () => { render(<DeliveryBoard loadBoard={async () => createBoard(ready3, [], [makeOrder("9", "OUT_FOR_DELIVERY")])} estimateRoute={estimateRoute}/>); fireEvent.click(await screen.findByRole("tab", { name: "Por cargar 3" })); fireEvent.click(await screen.findByRole("button", { name: /SX-2/ })); let detail = await screen.findByRole("complementary", { name: "Detalle de SX-2" }); assert.ok(within(detail).getByText("2 de 3")); fireEvent.click(within(detail).getByRole("button", { name: "Pedido siguiente" })); detail = await screen.findByRole("complementary", { name: "Detalle de SX-3" }); assert.ok(within(detail).getByText("3 de 3")); fireEvent.click(within(detail).getByRole("button", { name: "Pedido siguiente" })); assert.ok(await screen.findByRole("complementary", { name: "Detalle de SX-1" })); });
test("pushState alterna entre Pedidos y Ruta sin App Router", async () => { render(<DeliveryBoard loadBoard={async () => createBoard(ready3)} estimateRoute={estimateRoute}/>); assert.ok(await screen.findByRole("checkbox", { name: "Seleccionar todos" })); dom.window.history.pushState({}, "", "/reparto?tab=ruta"); dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate")); await waitFor(() => assert.equal(document.querySelector(".ordersPanel")?.classList.contains("mobileHidden"), true)); assert.ok(screen.getByText("Hay 3 pedidos listos para cargar")); fireEvent.click(screen.getByRole("button", { name: "Ir a cargar" })); assert.ok(await screen.findByRole("checkbox", { name: "Seleccionar todos" })); });
test("al cargar todos pasa automáticamente a Cargados", async () => { const initial = createBoard([ready3[0]]); render(<DeliveryBoard loadBoard={async () => initial} estimateRoute={estimateRoute} assignToDispatch={async () => createBoard([], [makeOrder("1", "DISPATCHED")])}/>); fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar todos" })); fireEvent.click(screen.getByRole("button", { name: "Cargar 1 pedido" })); fireEvent.click(screen.getByRole("button", { name: "Cargar" })); await waitFor(() => assert.equal(screen.getByRole("tab", { name: "Cargados 1" }).getAttribute("aria-selected"), "true")); });
test("iniciar ruta envía solamente los cargados", async () => { let received: string[] = []; const initial = createBoard([makeOrder("9", "READY")], [makeOrder("1", "DISPATCHED"), makeOrder("2", "DISPATCHED")]); const moved = createBoard([makeOrder("9", "READY")], [], [makeOrder("1", "OUT_FOR_DELIVERY"), makeOrder("2", "OUT_FOR_DELIVERY")]); render(<DeliveryBoard loadBoard={async () => initial} estimateRoute={estimateRoute} startDispatch={async (ids) => { received = ids; return moved; }}/>); fireEvent.click(await screen.findByRole("tab", { name: "Cargados 2" })); fireEvent.click(screen.getByRole("button", { name: /Iniciar ruta \(2\)/ })); fireEvent.click(screen.getByRole("button", { name: "Iniciar ruta" })); await waitFor(() => assert.deepEqual(received, ["1", "2"])); });
test("reordenar con teclado guarda los ids cargados", async () => { let received: string[] = []; const dispatched = [makeOrder("1", "DISPATCHED"), makeOrder("2", "DISPATCHED")]; render(<DeliveryBoard loadBoard={async () => createBoard([], dispatched)} estimateRoute={estimateRoute} saveSequence={async (ids) => { received = ids; return createBoard([], [...dispatched].reverse().map((order, index) => ({ ...order, position: index + 1 }))); }}/>); fireEvent.keyDown(await screen.findByRole("button", { name: /Mover pedido SX-1/ }), { key: "ArrowDown" }); await waitFor(() => assert.deepEqual(received, ["2", "1"])); });
test("completa READY a DISPATCHED a OUT_FOR_DELIVERY a DELIVERED", async () => { let state: DispatchOrder["status"] = "READY"; const current = () => state === "READY" ? createBoard([makeOrder("1", state)]) : state === "DISPATCHED" ? createBoard([], [makeOrder("1", state)]) : state === "OUT_FOR_DELIVERY" ? createBoard([], [], [makeOrder("1", state)]) : createBoard([], [], [], [makeOrder("1", state)]); render(<DeliveryBoard loadBoard={async () => current()} estimateRoute={estimateRoute} assignToDispatch={async () => { state = "DISPATCHED"; return current(); }} startDispatch={async () => { state = "OUT_FOR_DELIVERY"; return current(); }} deliver={async () => { state = "DELIVERED"; return current(); }}/>); fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar todos" })); fireEvent.click(screen.getByRole("button", { name: "Cargar 1 pedido" })); fireEvent.click(screen.getByRole("button", { name: "Cargar" })); fireEvent.click(await screen.findByRole("button", { name: /Iniciar ruta \(1\)/ })); fireEvent.click(screen.getByRole("button", { name: "Iniciar ruta" })); fireEvent.click(await screen.findByRole("button", { name: /Marcar como entregado/ })); await waitFor(() => assert.equal(state, "DELIVERED")); });
test("renderiza detalle e incidencia sin dinero", async () => { let payload: [string, IncidentReason, string | undefined] | null = null; const active = createBoard([], [], [makeOrder("3", "OUT_FOR_DELIVERY")]); render(<DeliveryBoard loadBoard={async () => active} estimateRoute={estimateRoute} reportIncident={async (id, reason, note) => { payload = [id, reason, note]; return active; }}/>); fireEvent.click((await screen.findAllByText("SX-3"))[0]); const detail = await screen.findByRole("complementary", { name: "Detalle de SX-3" }); assert.equal(within(detail).getByText("Productos (1)").textContent?.includes("$"), false); assert.equal(document.body.textContent?.includes("$"), false); fireEvent.click(screen.getByRole("button", { name: /Reportar incidencia/ })); fireEvent.click(screen.getByLabelText("No responde")); fireEvent.change(screen.getByLabelText(/Observaciones/), { target: { value: "No atiende" } }); fireEvent.click(screen.getByRole("button", { name: "Registrar incidencia" })); await waitFor(() => assert.deepEqual(payload, ["3", "NO_ANSWER", "No atiende"])); });

test("chofer inicia y ordena únicamente sus cargados y ve el dueño ajeno", async () => {
  dom.window.sessionStorage.setItem("superx.access-user", JSON.stringify({ id: "driver-1", role: "driver", name: "Chofer" }));
  const own = { ...makeOrder("1", "DISPATCHED"), dispatchedBy: { id: "driver-1", name: "Chofer" } };
  const foreign = makeOrder("2", "DISPATCHED");
  let received: string[] = [];
  render(<DeliveryBoard loadBoard={async () => createBoard([], [own, foreign])} estimateRoute={estimateRoute} startDispatch={async (ids) => { received = ids; return createBoard([], [foreign], [{ ...own, status: "OUT_FOR_DELIVERY" }]); }}/>);
  assert.ok(await screen.findByText("Cargado por Admin"));
  assert.equal(screen.queryByRole("button", { name: /Mover pedido SX-2/ }), null);
  fireEvent.click(screen.getByRole("button", { name: /Iniciar ruta \(1\)/ }));
  fireEvent.click(screen.getByRole("button", { name: "Iniciar ruta" }));
  await waitFor(() => assert.deepEqual(received, ["1"]));
});
test("chofer no puede iniciar cuando todos los cargados son ajenos", async () => {
  dom.window.sessionStorage.setItem("superx.access-user", JSON.stringify({ id: "driver-1", role: "driver" }));
  render(<DeliveryBoard loadBoard={async () => createBoard([], [makeOrder("2", "DISPATCHED")])} estimateRoute={estimateRoute}/>);
  await screen.findByRole("tab", { name: "Cargados 1" });
  assert.equal(screen.queryByRole("button", { name: /Iniciar ruta/ }), null);
  assert.equal(screen.queryByRole("button", { name: /Mover pedido/ }), null);
});
test("READY nunca ofrece iniciar ruta", async () => {
  render(<DeliveryBoard loadBoard={async () => createBoard(ready3)} estimateRoute={estimateRoute}/>);
  fireEvent.click(await screen.findByRole("tab", { name: "Cargados 0" }));
  assert.equal(screen.queryByRole("button", { name: /Iniciar ruta/ }), null);
});
test("errores 409 y 403 de inicio se muestran en español", async () => {
  for (const status of [409, 403]) {
    const view = render(<DeliveryBoard loadBoard={async () => createBoard([], [makeOrder("1", "DISPATCHED")])} estimateRoute={estimateRoute} startDispatch={async () => { throw new DispatchApiError("These orders were loaded by another driver.", status); }}/>);
    fireEvent.click(await screen.findByRole("button", { name: /Iniciar ruta \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar ruta" }));
    await waitFor(() => assert.ok(screen.getAllByRole("alert").some((el) => el.textContent?.includes(status === 409 ? "cambiaron de estado" : "cargaste vos"))));
    assert.equal(document.body.textContent?.includes("These orders"), false);
    view.unmount();
  }
});

test("reordenar propios excluye cargados ajenos, READY y pedidos en reparto", async () => {
  dom.window.sessionStorage.setItem("superx.access-user", JSON.stringify({ id: "driver-1", role: "driver" }));
  const own = ["1", "3"].map((id) => ({ ...makeOrder(id, "DISPATCHED"), dispatchedBy: { id: "driver-1", name: "Chofer" } }));
  const initial = createBoard(ready3, [own[0], makeOrder("2", "DISPATCHED"), own[1]], [makeOrder("9", "OUT_FOR_DELIVERY")]);
  let received: string[] = [];
  render(<DeliveryBoard loadBoard={async () => initial} estimateRoute={estimateRoute} saveSequence={async (ids) => { received = ids; return initial; }}/>);
  fireEvent.click(await screen.findByRole("tab", { name: "Cargados 3" }));
  fireEvent.keyDown(screen.getByRole("button", { name: /Mover pedido SX-1/ }), { key: "ArrowDown" });
  await waitFor(() => assert.deepEqual(received, ["3", "1"]));
});

test("chofer no ve dinero en carga, cargados, reparto ni entregados", async () => {
  dom.window.sessionStorage.setItem("superx.access-user", JSON.stringify({ id: "fixture-admin", role: "driver" }));
  const initial = createBoard([makeOrder("1", "READY")], [makeOrder("2", "DISPATCHED")], [makeOrder("3", "OUT_FOR_DELIVERY")], [makeOrder("4", "DELIVERED")]);
  render(<DeliveryBoard loadBoard={async () => initial} estimateRoute={estimateRoute}/>);
  await screen.findByRole("tab", { name: "En reparto 1" });
  for (const [tab, id] of [["Por cargar 1", "1"], ["Cargados 1", "2"], ["En reparto 1", "3"], ["Entregados 1", "4"]]) {
    fireEvent.click(screen.getByRole("tab", { name: tab }));
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(`SX-${id}`) }).find((button) => !button.getAttribute("aria-label"))!);
    await screen.findByRole("complementary", { name: `Detalle de SX-${id}` });
    assert.equal(/\$|ARS|Total del pedido|Precio unit/.test(document.body.textContent ?? ""), false);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
  }
});

test("los controles táctiles ordenan cargados y permiten abrir la ruta", async () => {
  const dispatched = [makeOrder("1", "DISPATCHED"), makeOrder("2", "DISPATCHED")];
  let received: string[] = [];
  render(<DeliveryBoard loadBoard={async () => createBoard([], dispatched)} estimateRoute={estimateRoute} saveSequence={async (ids) => { received = ids; return createBoard([], [...dispatched].reverse().map((order, index) => ({ ...order, position: index + 1 }))); }}/>);
  const down = await screen.findByRole("button", { name: "Bajar pedido SX-1" });
  assert.equal(screen.getByRole("button", { name: "Subir pedido SX-1" }).hasAttribute("disabled"), true);
  fireEvent.click(down);
  await waitFor(() => assert.deepEqual(received, ["2", "1"]));
  await waitFor(() => assert.equal(screen.getByRole("button", { name: "Subir pedido SX-1" }).hasAttribute("disabled"), false));
  fireEvent.click(screen.getByRole("button", { name: "Ver ruta para iniciar" }));
  await waitFor(() => assert.equal(document.querySelector(".mapPanel")?.classList.contains("mobileHidden"), false));
  assert.ok(screen.getByRole("button", { name: /Iniciar ruta \(2\)/ }));
});
