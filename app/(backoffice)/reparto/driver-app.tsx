"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { dispatchApi, DispatchApiError } from "@/app/lib/dispatch-api";
import type { DispatchBoard, DispatchOrder } from "@/app/lib/dispatch-contract";
import { mapsUrl, moveItem, paymentHint, slotLabel } from "@/app/lib/dispatch-rules";
import styles from "./driver.module.css";

type LoadState = "loading" | "ready" | "error" | "auth";
type Deps = { loadBoard?: () => Promise<DispatchBoard>; saveSequence?: (orderIds: string[]) => Promise<DispatchBoard>; startDispatch?: (orderIds: string[]) => Promise<DispatchBoard>; deliver?: (id: string) => Promise<void> };

function OrderCard({ order, position, draggable = false, busy = false, dragOffset = 0, onPointerDown, onPointerMove, onPointerUp, onKeyDown, onDelivered }: { order: DispatchOrder; position: number; draggable?: boolean; busy?: boolean; dragOffset?: number; onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void; onPointerMove?: (event: React.PointerEvent<HTMLButtonElement>) => void; onPointerUp?: (event: React.PointerEvent<HTMLButtonElement>) => void; onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void; onDelivered?: () => void }) {
  const delivery = order.delivery;
  const map = mapsUrl(delivery);
  const notes = [delivery.addressNotes, delivery.customerNotes].filter(Boolean);
  return <li className={`${styles.orderCard}${dragOffset ? ` ${styles.dragging}` : ""}`} data-order-id={order.id} style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}>
    <div className={styles.cardGrid}>
      {draggable && <button className={styles.handle} type="button" aria-label={`Mover pedido ${order.orderNumber}, posición ${position}`} disabled={busy} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}>⠿</button>}
      <span className={styles.position} aria-label={`Posición ${position}`}>{position}</span>
      <div className={styles.cardBody}>
        <div className={styles.orderHead}><div><h3>{order.orderNumber}</h3><strong>{delivery.recipientName}</strong></div><span className={styles.slot}>{slotLabel(delivery)}</span></div>
        <a className={styles.phone} href={`tel:${delivery.phone.replace(/\s+/g, "")}`}>{delivery.phone}</a>
        <p className={styles.address}><strong>{delivery.addressLine}</strong><span>{[delivery.neighborhood, delivery.postalCode && `CP ${delivery.postalCode}`].filter(Boolean).join(" · ")}</span>{map && <a href={map} target="_blank" rel="noopener noreferrer">Abrir en mapa</a>}</p>
        {notes.length > 0 && <p className={styles.notes}>{notes.join(" · ")}</p>}
        <p className={styles.payment}>{paymentHint(order)}</p>
        <details className={styles.products}><summary>Productos ({order.items.length})</summary><ul>{order.items.map((item, index) => <li key={`${item.productName}-${index}`}><strong>{item.quantity} ×</strong> {item.productName} <span>({item.unitCode})</span></li>)}</ul></details>
        {onDelivered && <button className={styles.delivered} type="button" disabled={busy} onClick={onDelivered}>{busy ? "Guardando…" : "Entregado"}</button>}
      </div>
    </div>
  </li>;
}

export function DeliveryBoard({ loadBoard = dispatchApi.getBoard, saveSequence = dispatchApi.saveSequence, startDispatch = dispatchApi.start, deliver = dispatchApi.markDelivered }: Deps) {
  const [state, setState] = useState<LoadState>("loading");
  const [board, setBoard] = useState<DispatchBoard>({ ready: [], outForDelivery: [] });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [drag, setDrag] = useState<{ id: string; startY: number; offset: number; original: DispatchOrder[] } | null>(null);
  const readyRef = useRef(board.ready);
  useEffect(() => { readyRef.current = board.ready; }, [board.ready]);

  const handleError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof DispatchApiError && err.code === "unauthenticated") { setState("auth"); return; }
    setError(err instanceof DispatchApiError ? err.message : fallback);
  }, []);
  const load = useCallback(async () => {
    setState("loading"); setError(null);
    try { setBoard(await loadBoard()); setState("ready"); }
    catch (err) { if (err instanceof DispatchApiError && err.code === "unauthenticated") setState("auth"); else { setState("error"); handleError(err, "No pudimos cargar reparto."); } }
  }, [handleError, loadBoard]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const persistOrder = async (next: DispatchOrder[], previous: DispatchOrder[]) => {
    setBoard((current) => ({ ...current, ready: next })); setError(null);
    try { setBoard(await saveSequence(next.map((item) => item.id))); }
    catch (err) { setBoard((current) => ({ ...current, ready: previous })); handleError(err, "No pudimos guardar el orden. Volvimos al orden anterior."); }
  };
  const moveByKeyboard = (index: number, direction: -1 | 1) => {
    const to = index + direction;
    if (to < 0 || to >= board.ready.length) return;
    const previous = board.ready;
    const next = moveItem(previous, index, to);
    setAnnouncement(`${previous[index].orderNumber} quedó en la posición ${to + 1}.`);
    void persistOrder(next, previous);
  };
  const pointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    let startY = drag.startY;
    const cards = [...document.querySelectorAll<HTMLElement>("[data-order-id]")];
    const target = cards.find((card) => card.dataset.orderId !== drag.id && event.clientY >= card.getBoundingClientRect().top && event.clientY <= card.getBoundingClientRect().bottom);
    if (target?.dataset.orderId) {
      const from = readyRef.current.findIndex((item) => item.id === drag.id);
      const to = readyRef.current.findIndex((item) => item.id === target.dataset.orderId);
      if (from !== -1 && to !== -1 && from !== to) {
        const next = moveItem(readyRef.current, from, to);
        readyRef.current = next;
        setBoard((current) => ({ ...current, ready: next }));
        // the dragged card's slot moved by the height of the card it passed: keep it under the finger
        const gap = target.getBoundingClientRect().height + 9; // .list gap
        startY += to > from ? gap : -gap;
      }
    }
    setDrag({ ...drag, startY, offset: event.clientY - startY });
    if (event.clientY < 72) window.scrollBy({ top: -12 }); else if (event.clientY > window.innerHeight - 72) window.scrollBy({ top: 12 });
  };
  const pointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const current = readyRef.current;
    const original = drag.original;
    const moved = current.findIndex((item) => item.id === drag.id);
    setDrag(null);
    if (moved !== original.findIndex((item) => item.id === drag.id)) { setAnnouncement(`${current[moved].orderNumber} quedó en la posición ${moved + 1}.`); void persistOrder(current, original); }
  };
  const startAll = async () => {
    const ids = board.ready.map((item) => item.id);
    if (!ids.length) return;
    setBusy(true); setError(null);
    try { setBoard(await startDispatch(ids)); setConfirming(false); } catch (err) { handleError(err, "No pudimos iniciar el reparto."); } finally { setBusy(false); }
  };
  const markDelivered = async (order: DispatchOrder) => {
    const previous = board.outForDelivery;
    setDeliveringId(order.id); setError(null); setBoard((current) => ({ ...current, outForDelivery: current.outForDelivery.filter((item) => item.id !== order.id) }));
    try { await deliver(order.id); } catch (err) { setBoard((current) => ({ ...current, outForDelivery: previous })); handleError(err, "No pudimos marcar el pedido como entregado."); } finally { setDeliveringId(null); }
  };

  if (state === "auth") return <main className={styles.shell}><div className={styles.stateCard}><h1>Iniciá sesión</h1><p>Entrá con tu cuenta para ver el tablero de reparto.</p><Link className="button primary" href="/login?next=/reparto">Ingresar</Link></div></main>;
  return <main className={styles.shell}>
    <header className={styles.header}><div><p>OPERACIÓN</p><h1>Reparto</h1></div><button type="button" disabled={state === "loading" || busy} onClick={() => void load()} aria-label="Actualizar tablero">↻ <span>Actualizar</span></button></header>
    <p className={styles.srOnly} aria-live="polite">{announcement}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {state === "loading" && <div className={styles.skeleton} aria-label="Cargando reparto" aria-busy="true" />}
    {state === "error" && <div className={styles.stateCard}><h2>No pudimos cargar reparto</h2><p>Revisá tu conexión e intentá de nuevo.</p><button className={styles.primary} onClick={() => void load()}>Reintentar</button></div>}
    {state === "ready" && <>
      <section className={styles.section} aria-labelledby="ready-title"><h2 id="ready-title">Listos para salir <span>{board.ready.length}</span></h2>
        {board.ready.length === 0 ? <p className={styles.empty}>No hay pedidos listos. Cuando terminen el picking van a aparecer acá.</p> : <ul className={styles.list}>{board.ready.map((order, index) => <OrderCard key={order.id} order={order} position={index + 1} draggable busy={busy} dragOffset={drag?.id === order.id ? drag.offset : 0} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ id: order.id, startY: event.clientY, offset: 0, original: board.ready }); }} onPointerMove={pointerMove} onPointerUp={pointerUp} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); moveByKeyboard(index, event.key === "ArrowUp" ? -1 : 1); } }} />)}</ul>}
      </section>
      <section className={styles.section} aria-labelledby="street-title"><h2 id="street-title">En reparto <span>{board.outForDelivery.length}</span></h2>
        {board.outForDelivery.length === 0 ? <p className={styles.empty}>No hay pedidos en la calle.</p> : <ul className={styles.list}>{board.outForDelivery.map((order, index) => <OrderCard key={order.id} order={order} position={index + 1} busy={deliveringId === order.id} onDelivered={() => void markDelivered(order)} />)}</ul>}
      </section>
      <div className={styles.sticky}>{confirming ? <div className={styles.confirm}><p>¿Salen los {board.ready.length} pedidos?</p><div><button type="button" disabled={busy} onClick={() => setConfirming(false)}>Cancelar</button><button type="button" disabled={busy} onClick={() => void startAll()}>{busy ? "Saliendo…" : "Confirmar salida"}</button></div></div> : <button className={styles.start} type="button" disabled={board.ready.length === 0 || busy} onClick={() => setConfirming(true)}>Salir a repartir ({board.ready.length})</button>}</div>
    </>}
  </main>;
}

export const DriverApp = DeliveryBoard;
