"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickingApi, PickingApiError } from "@/app/lib/picking-api";
import type { PickingItem, PickingTask as Task } from "@/app/lib/picking-contract";
import { canCompleteTask, pendingLines, pickingSlotLabel, sequenceItems } from "@/app/lib/picking-rules";
import { PickingLine, type Incident } from "./picking-line";
import { AuthState, type Deps, errorMessage, Icon, isAuthError, Loading, Progress, Spinner, Status } from "./picking-ui";
import styles from "./picking.module.css";

export function PickingTask({ id, loadTask = pickingApi.getTask, loadMine = pickingApi.listMyTasks, start = pickingApi.startTask, pick = pickingApi.pickItem, recordWeight = pickingApi.recordWeight, reportShortage = pickingApi.reportShortage, searchProducts = pickingApi.searchProducts, complete = pickingApi.completeTask }: Deps & { id: string }) {
  const [task, setTask] = useState<Task | null>(null), [state, setState] = useState<"loading" | "ready" | "error" | "auth" | "blocked" | "done">("loading");
  const [error, setError] = useState(""), [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null), [barcode, setBarcode] = useState(""), [highlight, setHighlight] = useState("");
  const locked = useRef(false), scanRef = useRef<HTMLInputElement>(null), dialogRef = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const [next, mine] = await Promise.all([loadTask(id), loadMine()]);
      setTask(next);
      if (next.status === "COMPLETED") { setState("done"); return; }
      if (next.status === "CANCELLED" || !mine.some((row) => String(row.id) === String(id)) || (next.status !== "ASSIGNED" && next.status !== "IN_PROGRESS")) {
        setError(next.status === "CANCELLED" ? "Este pedido fue cancelado." : "Esta tarea no está asignada a tu usuario."); setState("blocked"); return;
      }
      setState("ready");
    } catch (err) {
      setError(errorMessage(err, "No pudimos cargar la tarea. Revisá tu conexión e intentá de nuevo."));
      setState(isAuthError(err) ? "auth" : err instanceof PickingApiError && (err.status === 403 || err.status === 404) ? "blocked" : "error");
    }
  }, [id, loadTask, loadMine]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const accept = (next: Task) => {
    setTask(next);
    if (next.status === "COMPLETED") { dialogRef.current?.close(); setState("done"); }
    else if (next.status === "CANCELLED") { dialogRef.current?.close(); setError("Este pedido fue cancelado."); setState("blocked"); }
  };
  const failure = (err: unknown, itemId?: string) => {
    const message = errorMessage(err);
    if (isAuthError(err)) { dialogRef.current?.close(); setState("auth"); }
    else if (err instanceof PickingApiError && (err.status === 403 || err.status === 404)) { dialogRef.current?.close(); setError(message); setState("blocked"); }
    else if (itemId) setLineErrors((previous) => ({ ...previous, [itemId]: message }));
    else setError(message);
  };
  // Serialize writes, render every mutation response, then reconcile with the server.
  const mutate = async (key: string, action: () => Promise<Task>, itemId?: string) => {
    if (locked.current) return false;
    locked.current = true; setBusy(key); setError("");
    if (itemId) setLineErrors((previous) => ({ ...previous, [itemId]: "" }));
    let success = false;
    try { accept(await action()); success = true; } catch (err) { failure(err, itemId); }
    try { accept(await loadTask(id)); } catch (err) {
      if (isAuthError(err) || (err instanceof PickingApiError && (err.status === 403 || err.status === 404))) failure(err);
      else setError("No pudimos actualizar la tarea. Los cambios confirmados se conservaron.");
    } finally { locked.current = false; setBusy(null); }
    return success;
  };
  const pickLine = (item: PickingItem, quantity: number, code?: string) => mutate(item.id, () => item.saleMode === "WEIGHT" ? recordWeight(id, item.id, quantity) : pick(id, item.id, quantity, code), item.id);
  const shortage = (item: PickingItem, incident: Incident) => mutate(item.id, async () => {
    if (incident.quantity !== item.quantityPicked) accept(await pick(id, item.id, incident.quantity));
    return reportShortage(id, item.id, incident.resolution, incident.substituteId, incident.note);
  }, item.id);
  const scan = async () => {
    if (!task || locked.current || !barcode.trim()) return;
    const code = barcode.trim();
    const item = sequenceItems(task).find((line: PickingItem) => line.status === "PENDING" && (line.barcodes ?? (line.barcode ? [line.barcode] : [])).includes(code));
    if (!item) { setError("El código no coincide con un producto pendiente. Revisá el código o confirmá la línea manualmente."); scanRef.current?.select(); return; }
    setHighlight(item.id);
    document.getElementById(`line-${item.id}`)?.scrollIntoView?.({ behavior: "instant", block: "center" });
    if (item.saleMode === "WEIGHT") { setBarcode(""); setError("Ingresá el peso real (g) en la línea antes de confirmar."); document.getElementById(`weight-${item.id}`)?.focus(); return; }
    if (await pickLine(item, Math.min(item.quantityRequired, item.quantityPicked + 1), code)) setBarcode("");
    scanRef.current?.focus();
  };
  return <main className={`${styles.shell} ${styles.detail}`}>
    <Link className={styles.back} href="/picking">← Volver a Picking</Link>
    {state === "loading" && <Loading />}
    {state === "auth" && <AuthState />}
    {(state === "error" || state === "blocked") && <section className={styles.card}><h1>{state === "blocked" ? "Tarea no disponible" : "No pudimos abrir el pedido"}</h1><p role="alert">{error}</p>{state === "error" && <button className={styles.primary} onClick={() => void load()}>Reintentar</button>}</section>}
    {state === "done" && <section className={styles.done}><span className={styles.doneMark}><Icon name="check" /></span><p className={styles.eyebrow}>{task?.orderNumber}</p><h1>Picking completado</h1><p>El pedido está listo para reparto.</p><Link className={styles.primary} href="/picking">Volver a Picking</Link></section>}
    {state === "ready" && task && <>
      <header className={styles.taskHeader}><div><p className={styles.eyebrow}>PREPARACIÓN DEL PEDIDO</p><h1>{task.orderNumber}</h1><p className={styles.recipient}>{task.delivery?.recipientName}</p><p>{task.delivery?.cityName}</p><p>Entrega: {pickingSlotLabel(task)}</p></div><Status status={task.status} /></header>
      <Progress task={task} detail />
      {task.delivery && <details className={styles.customer}><summary>Datos del cliente y entrega</summary><div><a href={`tel:${task.delivery.phone.replace(/\s+/g, "")}`}>{task.delivery.phone}</a><p>{task.delivery.addressLine}</p><p>{[task.delivery.zoneName, task.delivery.neighborhood, task.delivery.postalCode && `CP ${task.delivery.postalCode}`].filter(Boolean).join(" · ")}</p><p>{[task.delivery.addressNotes, task.delivery.customerNotes].filter(Boolean).join(" · ")}</p>{task.pickerName && <p>Operario: {task.pickerName}</p>}</div></details>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {task.status === "ASSIGNED" ? <section className={styles.card}><p>El pedido está asignado. Iniciá la preparación para registrar productos.</p><button className={styles.primary} disabled={busy !== null} onClick={() => void mutate("start", () => start(id))}>{busy ? "Iniciando…" : "Continuar picking"}</button></section> : <>
        <form className={styles.scanForm} onSubmit={(event) => { event.preventDefault(); void scan(); }}><label htmlFor="scan">Escanear código</label><div><input id="scan" ref={scanRef} value={barcode} onChange={(event) => setBarcode(event.target.value)} readOnly={busy !== null} autoComplete="off" placeholder="Escaneá o ingresá el código" /><button className={styles.secondary} disabled={busy !== null || !barcode.trim()}>Registrar</button></div></form>
        <section className={styles.rows} aria-label="Productos del pedido">{sequenceItems(task).map((item: PickingItem) => <PickingLine key={item.id} item={item} disabled={busy !== null} saving={busy === item.id} highlighted={highlight === item.id} error={lineErrors[item.id]} onPick={(quantity, code) => pickLine(item, quantity, code)} onShortage={(incident) => shortage(item, incident)} searchProducts={searchProducts} />)}</section>
      </>}
      <footer className={styles.finishBar}><p>{canCompleteTask(task) ? "Todos los productos están resueltos." : `Faltan ${pendingLines(task).length} productos`}</p><button className={styles.primary} disabled={busy !== null || !canCompleteTask(task)} onClick={() => dialogRef.current?.showModal()}>Finalizar picking</button></footer>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="finish-title" onCancel={(event) => { if (busy !== null) event.preventDefault(); }}><h2 id="finish-title">Finalizar picking</h2><p>¿Confirmás que todos los productos fueron preparados correctamente?</p>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.actions}><button className={styles.secondary} autoFocus disabled={busy !== null} onClick={() => dialogRef.current?.close()}>Cancelar</button><button className={styles.primary} disabled={busy !== null || !canCompleteTask(task)} onClick={() => void mutate("complete", () => complete(id))}>{busy === "complete" ? <><Spinner />Finalizando…</> : "Finalizar picking"}</button></div></dialog>
    </>}
  </main>;
}
