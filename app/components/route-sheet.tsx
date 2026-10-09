"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/app/lib/auth-api";
import { can } from "@/app/lib/permissions";
import { getRouteSheet } from "@/app/lib/route-sheet-api";
import type { RouteSheet } from "@/app/lib/route-sheet-contract";
import { argentinaToday, routeAddress, routeMoney, routeSheetHref, validRouteDate } from "@/app/lib/route-sheet-rules";
import { ORDER_PAYMENT_METHOD_LABELS } from "@/app/lib/order-rules";
import { Notice } from "./ui/notice";
import "./route-sheet.css";

export function RouteSheetDocument({ sheet }: { sheet: RouteSheet }) {
  return <article className="route-document"><header><p className="eyebrow">SUPERX · REPARTO</p><h1>Hoja de ruta · {sheet.driver.name}</h1><p>Fecha: {sheet.date.split("-").reverse().join("/")} · Vehículo: {sheet.driver.vehicleType ?? "Sin especificar"} · Teléfono: {sheet.driver.phone}</p><p>{sheet.stops.length} paradas · Orden de reparto indicado por despacho</p></header>
    {sheet.stops.length ? <table className="erp-table route-stops"><caption className="sr-only">Paradas de reparto</caption><thead><tr><th>Parada / pedido</th><th>Cliente y entrega</th><th>Franja / ítems</th><th>Cobro</th><th>Firma / observación</th></tr></thead><tbody>{sheet.stops.map(stop => <tr key={stop.orderId}><td data-label="Parada / pedido"><strong>{stop.stopNumber}. {stop.orderNumber}</strong></td><td data-label="Cliente y entrega"><strong>{stop.delivery.recipientName}</strong><p>{stop.delivery.phone}</p><p>{routeAddress(stop.delivery)}</p>{stop.delivery.addressNotes && <p>Referencias: {stop.delivery.addressNotes}</p>}{stop.delivery.customerNotes && <p>Notas: {stop.delivery.customerNotes}</p>}</td><td data-label="Franja / ítems"><p>{stop.delivery.slotDate.split("-").reverse().join("/")}<br />{stop.delivery.slotStart.slice(0, 5)}–{stop.delivery.slotEnd.slice(0, 5)}</p><p>{stop.packageCount} bultos / {stop.itemCount} ítems</p></td><td data-label="Cobro"><p>{ORDER_PAYMENT_METHOD_LABELS[stop.paymentMethod]}</p><strong>{routeMoney(stop.amountToCollect)}</strong>{stop.paymentStatus === "PAID" && <p>Pagado</p>}</td><td data-label="Firma / observación"><div className="route-signature" aria-label="Espacio para firma y observación"><span aria-hidden="true">☐ Entregado</span></div></td></tr>)}</tbody></table> : <p>No hay paradas asignadas para esta fecha.</p>}
    <footer className="route-totals"><p>Efectivo a cobrar: <strong>{routeMoney(sheet.totals.cash)}</strong></p><p>Otros medios a cobrar: <strong>{routeMoney(sheet.totals.other)}</strong></p><p>Total a cobrar: <strong>{routeMoney(sheet.totals.total)}</strong></p></footer>
  </article>;
}
export function RouteSheetWorkspace({ id, date }: { id: string; date?: string }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<RouteSheet | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSheet(null); setError(""); setLoading(true);
      if (!can(getStoredUser()?.role, "drivers.read")) { setError("No tenés permiso para consultar hojas de ruta."); setLoading(false); return; }
      void getRouteSheet(id, date, controller.signal).then(value => { if (!controller.signal.aborted) setSheet(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No pudimos cargar la hoja de ruta."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [id, date, retry]);
  return <section className="workspace route-sheet"><div className="topbar route-controls"><Link className="button secondary" href="/repartidores">Volver a repartidores</Link><label className="field">Fecha de reparto<input type="date" value={date ?? sheet?.date ?? argentinaToday()} onChange={event => { if (validRouteDate(event.target.value)) router.replace(routeSheetHref(id, event.target.value)); }} /></label><button className="button primary" disabled={loading || !sheet || Boolean(error)} onClick={() => window.print()}>Imprimir</button></div>{loading && <p role="status">Cargando hoja de ruta…</p>}{error && <Notice kind="error" role="alert">{error} <button className="button secondary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></Notice>}{!loading && !error && sheet && <RouteSheetDocument sheet={sheet} />}</section>;
}
