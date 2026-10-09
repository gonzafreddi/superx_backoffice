import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { argentinaToday, validRouteDate, routeAddress, routeSheetHref, routeMoney } from "../app/lib/route-sheet-rules";
import { getRouteSheet } from "../app/lib/route-sheet-api";
import { RouteSheetDocument } from "../app/components/route-sheet";

test("fechas reales, día argentino y links seguros", () => {
  assert.equal(validRouteDate("2024-02-29"), true);
  for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "garbage", ""]) assert.equal(validRouteDate(date), false);
  assert.equal(argentinaToday(new Date("2026-10-09T02:59:00Z")), "2026-10-08");
  assert.equal(argentinaToday(new Date("2026-10-09T03:00:00Z")), "2026-10-09");
  assert.equal(routeSheetHref("a/b", "2026-10-09"), "/repartidores/a%2Fb/hoja-de-ruta?date=2026-10-09");
  assert.equal(routeSheetHref("101", "bad"), "/repartidores/101/hoja-de-ruta");
  assert.match(routeMoney("12500.50"), /12\.500,50/);
});
test("fixtures y documento imprimen toda la información contractual", async () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  try {
    const sheet = await getRouteSheet("101", "2026-10-09");
    assert.equal(routeAddress(sheet.stops[0].delivery), "San Martín 125, piso 1, Centro, Pergamino, 2700");
    const html = renderToStaticMarkup(<RouteSheetDocument sheet={sheet} />);
    for (const text of ["Lucía Pérez", "Moto", "09/10/2026", "PED-DEMO-001", "Timbre de la izquierda", "Llamar al llegar", "4 bultos / 3 ítems", "Firma / observación", "Pagado", "Efectivo a cobrar", "Otros medios a cobrar", "12.500,50"]) assert.ok(html.includes(text), text);
    assert.ok(html.indexOf("PED-DEMO-001") < html.indexOf("PED-DEMO-002"));
    assert.match(renderToStaticMarkup(<RouteSheetDocument sheet={{ ...sheet, stops: [], totals: { cash: "0.00", other: "0.00", total: "0.00" } }} />), /No hay paradas/);
    await assert.rejects(getRouteSheet("missing"), /Repartidor no encontrado/);
  } finally { if (previous !== undefined) process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});
test("adapter consulta endpoint autenticado, conserva orden/totales y propaga errores", async () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL, originalFetch = globalThis.fetch;
  delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  const fixture = await getRouteSheet("101", "2026-10-09");
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test/";
  let requested = "";
  globalThis.fetch = async url => { requested = String(url); return Response.json({ ...fixture, driver: { ...fixture.driver, id: 101 }, stops: fixture.stops.slice().reverse() }); };
  try {
    const sheet = await getRouteSheet("101", "2026-10-09");
    assert.equal(requested, "http://backend.test/drivers/101/route-sheet?date=2026-10-09");
    assert.equal(sheet.driver.id, "101");
    assert.equal(sheet.stops[0].stopNumber, 2);
    assert.deepEqual(sheet.totals, fixture.totals);
    await getRouteSheet("101"); assert.equal(requested, "http://backend.test/drivers/101/route-sheet");
    await assert.rejects(getRouteSheet("101", "2026-02-30"), /fecha debe ser válida/);
    globalThis.fetch = async () => Response.json({ message: "No autorizado" }, { status: 403 });
    await assert.rejects(getRouteSheet("101"), /No autorizado/);
    globalThis.fetch = async () => Response.json({});
    await assert.rejects(getRouteSheet("101"), /respuesta.*inválida/);
  } finally { globalThis.fetch = originalFetch; if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});
test("reglas A4 ocultan chrome del shell y conservan tabla multipágina", () => {
  const css = readFileSync(new URL("../app/components/route-sheet.css", import.meta.url), "utf8");
  assert.match(css, /@page\s*\{ size: A4 portrait/);
  assert.match(css, /\.catalog-shell > :not\(\.backoffice-main\)\s*\{ display: none !important/);
  assert.match(css, /\.route-controls, \.route-sheet \.notice\s*\{ display: none/);
  assert.match(css, /display: table-header-group/);
  assert.match(css, /break-inside: avoid/);
  assert.match(css, /@media screen and \(max-width: 700px\)/);
});
