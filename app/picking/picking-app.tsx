"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pickingApi, PickingApiError } from "@/app/lib/picking-api";
import type { PickingItem, PickingTask } from "@/app/lib/picking-contract";
import { canCompleteTask, clampPickQuantity, nextPendingIndex, pendingLines, pickingProgress, sequenceItems } from "@/app/lib/picking-rules";
import styles from "./picking.module.css";

type View = "list" | "task" | "done";
type LoadState = "loading" | "ready" | "error" | "auth";
type ShortageResolution = "REPLACE_SIMILAR" | "CONTACT_ME" | "REMOVE_ITEM";

type Deps = {
  loadMine?: () => Promise<PickingTask[]>;
  loadAvailable?: () => Promise<PickingTask[]>;
  loadTask?: (id: string) => Promise<PickingTask>;
  assign?: (id: string) => Promise<PickingTask>;
  start?: (id: string) => Promise<PickingTask>;
  pick?: (taskId: string, itemId: string, quantity: number, barcode?: string) => Promise<PickingTask>;
  reportShortage?: (taskId: string, itemId: string, resolution: ShortageResolution, substituteProductId?: string, note?: string) => Promise<PickingTask>;
  searchProducts?: (query: string) => Promise<Array<{ id: string; name: string }>>;
  complete?: (id: string) => Promise<PickingTask>;
};

export function PickingApp({
  loadMine = pickingApi.listMyTasks,
  loadAvailable = pickingApi.listAvailableTasks,
  loadTask = pickingApi.getTask,
  assign = pickingApi.assignToMe,
  start = pickingApi.startTask,
  pick = pickingApi.pickItem,
  reportShortage = pickingApi.reportShortage,
  searchProducts = pickingApi.searchProducts,
  complete = pickingApi.completeTask,
}: Deps) {
  const [view, setView] = useState<View>("list");
  const [state, setState] = useState<LoadState>("loading");
  const [mine, setMine] = useState<PickingTask[]>([]);
  const [available, setAvailable] = useState<PickingTask[]>([]);
  const [task, setTask] = useState<PickingTask | null>(null);
  const [cursor, setCursor] = useState(0);
  const [qty, setQty] = useState(0);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [shortageResolution, setShortageResolution] = useState<ShortageResolution | null>(null);
  const [substituteQuery, setSubstituteQuery] = useState("");
  const [substituteResults, setSubstituteResults] = useState<Array<{ id: string; name: string }>>([]);
  const [substitute, setSubstitute] = useState<{ id: string; name: string } | null>(null);
  const [shortageNote, setShortageNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const refocusScanInput = useRef(false);

  const handle = useCallback((err: unknown, fallback: string) => {
    if (err instanceof PickingApiError && err.code === "unauthenticated") { setState("auth"); return; }
    const code = err instanceof PickingApiError ? { status: err.status, code: err.code } : { code: "unexpected" };
    console.error("picking_action_failed", code);
    setError(err instanceof PickingApiError ? err.message : fallback);
  }, []);

  const loadLists = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [a, b] = await Promise.all([loadMine(), loadAvailable()]);
      setMine(a);
      setAvailable(b);
      setState("ready");
    } catch (err) {
      if (err instanceof PickingApiError && err.code === "unauthenticated") { setState("auth"); return; }
      console.error("picking_list_failed", err instanceof PickingApiError ? { status: err.status } : { code: "unexpected" });
      setState("error");
    }
  }, [loadMine, loadAvailable]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLists();
  }, [loadLists]);

  const sequence = useMemo(() => (task ? sequenceItems(task) : []), [task]);
  const currentItem: PickingItem | undefined = sequence[cursor];
  const progress = task ? pickingProgress(task) : { resolved: 0, total: 0, percent: 0 };

  const resetShortage = useCallback(() => {
    setShortageResolution(null);
    setSubstituteQuery("");
    setSubstituteResults([]);
    setSubstitute(null);
    setShortageNote("");
  }, []);

  useEffect(() => {
    scanInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetShortage();
  }, [currentItem?.id, resetShortage]);

  useEffect(() => {
    if (shortageResolution !== "REPLACE_SIMILAR" || !substituteQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubstituteResults([]);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void searchProducts(substituteQuery.trim()).then((results) => {
        if (!cancelled) setSubstituteResults(results);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchProducts, shortageResolution, substituteQuery]);

  useEffect(() => {
    if (!busy && refocusScanInput.current) {
      refocusScanInput.current = false;
      scanInputRef.current?.focus();
    }
  }, [busy]);

  const openTask = async (id: string, needsAssign: boolean) => {
    setBusy(true);
    setError(null);
    try {
      let next = await loadTask(id);
      if (needsAssign && next.status === "PENDING") next = await assign(id);
      if (next.status === "ASSIGNED") next = await start(id);
      setTask(next);
      const seq = sequenceItems(next);
      const first = nextPendingIndex(seq, -1);
      const startIndex = first === -1 ? 0 : first;
      setCursor(startIndex);
      setQty(seq[startIndex]?.quantityRequired ?? 0);
      resetShortage();
      setView("task");
    } catch (err) {
      handle(err, "No pudimos abrir la tarea.");
    } finally {
      setBusy(false);
    }
  };

  const goTo = (index: number) => {
    setCursor(index);
    setQty(sequence[index]?.quantityRequired ?? 0);
    setScannedBarcode("");
    resetShortage();
    setError(null);
  };

  const confirmItem = async (barcode?: string) => {
    if (!task || !currentItem) return;
    setBusy(true);
    setError(null);
    try {
      const next = await pick(task.id, currentItem.id, qty, barcode);
      setTask(next);
      const seq = sequenceItems(next);
      const nextPending = nextPendingIndex(seq, cursor);
      if (nextPending !== -1) goToWith(seq, nextPending);
    } catch (err) {
      handle(err, "No pudimos registrar la cantidad.");
      if (err instanceof PickingApiError && err.code === "barcode_mismatch") refocusScanInput.current = true;
    } finally {
      setScannedBarcode("");
      setBusy(false);
    }
  };
  const goToWith = (seq: PickingItem[], index: number) => {
    setCursor(index);
    setQty(seq[index]?.quantityRequired ?? 0);
    setScannedBarcode("");
    resetShortage();
  };

  const confirmShortage = async () => {
    if (!task || !currentItem || !shortageResolution || (shortageResolution === "REPLACE_SIMILAR" && !substitute)) return;
    setBusy(true);
    setError(null);
    try {
      const next = await reportShortage(task.id, currentItem.id, shortageResolution, substitute?.id, shortageNote.trim() || undefined);
      setTask(next);
      const seq = sequenceItems(next);
      const nextPending = nextPendingIndex(seq, cursor);
      if (nextPending !== -1) goToWith(seq, nextPending);
      else resetShortage();
    } catch (err) {
      handle(err, "No pudimos registrar el faltante.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      await complete(task.id);
      setView("done");
      void loadLists();
    } catch (err) {
      handle(err, "No pudimos finalizar la tarea.");
    } finally {
      setBusy(false);
    }
  };

  // --- render --------------------------------------------------------

  if (state === "auth") {
    return <main className={styles.shell}><div className={styles.card}><h1>Iniciá sesión</h1><p>Entrá con tu cuenta de picker para ver tus tareas.</p><Link className="button primary" href="/login?next=/picking">Ingresar</Link></div></main>;
  }

  if (view === "done") {
    return (
      <main className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.doneMark} aria-hidden="true">✓</div>
          <h1>Picking finalizado</h1>
          <p>{task?.orderNumber} quedó listo para empacar.</p>
          <button className={styles.primary} onClick={() => { setTask(null); setView("list"); }}>Volver a mis tareas</button>
        </div>
      </main>
    );
  }

  if (view === "task" && task) {
    const pending = pendingLines(task);
    const canFinish = canCompleteTask(task);
    return (
      <main className={styles.shell}>
        <header className={styles.header}>
          <button className={styles.back} onClick={() => { setTask(null); setView("list"); void loadLists(); }} aria-label="Volver a la lista">←</button>
          <div>
            <p className={styles.eyebrow}>PEDIDO {task.orderNumber}</p>
            <strong>{progress.resolved}/{progress.total} líneas</strong>
          </div>
        </header>
        <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label="Progreso del picking">
          <span style={{ width: `${progress.percent}%` }} />
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        {currentItem && (
          <section className={styles.pickCard} aria-label={`Línea ${cursor + 1} de ${sequence.length}`}>
            <p className={styles.location}>{currentItem.locationCode ?? "Sin ubicación"}</p>
            <h2>{currentItem.productName}</h2>
            <p className={styles.need}>Pedido: <strong>{currentItem.quantityRequired} {currentItem.unitCode}</strong>{currentItem.status !== "PENDING" ? ` · ${currentItem.status === "PICKED" ? "pickeado" : currentItem.status.toLowerCase()}` : ""}</p>
            <form className={styles.scanForm} onSubmit={(event) => { event.preventDefault(); void confirmItem(scannedBarcode.trim()); }}>
              <label htmlFor="barcode-scan">Escaneá el código de barras</label>
              <input
                ref={scanInputRef}
                id="barcode-scan"
                type="text"
                autoFocus
                disabled={busy}
                value={scannedBarcode}
                onChange={(event) => setScannedBarcode(event.target.value)}
                placeholder="Esperando escaneo"
                aria-label="Código de barras escaneado"
              />
            </form>
            <div className={styles.stepper}>
              <button aria-label="Restar una unidad" disabled={busy || qty <= 0} onClick={() => setQty((v) => Math.max(0, v - 1))}>−</button>
              <span aria-live="polite" aria-label="Cantidad a confirmar">{qty}</span>
              <button aria-label="Sumar una unidad" disabled={busy || qty >= currentItem.quantityRequired} onClick={() => setQty((v) => clampPickQuantity(currentItem, v + 1))}>+</button>
            </div>
            <p className={styles.manualLabel}>o confirmá manualmente</p>
            <button className={styles.primary} disabled={busy} onClick={() => void confirmItem()}>
              {busy ? "Guardando…" : qty === currentItem.quantityRequired ? "Confirmar línea" : `Confirmar ${qty} de ${currentItem.quantityRequired}`}
            </button>
            {!shortageResolution ? (
              <button className={styles.shortageTrigger} disabled={busy} onClick={() => setShortageResolution("CONTACT_ME")}>Reportar faltante</button>
            ) : (
              <section className={styles.shortagePanel} aria-label="Reportar faltante">
                <div className={styles.shortageChoices} aria-label="Resolución del faltante">
                  {([
                    ["REPLACE_SIMILAR", "Reemplazar por similar"],
                    ["CONTACT_ME", "Consultar al cliente"],
                    ["REMOVE_ITEM", "Quitar del pedido"],
                  ] as const).map(([resolution, label]) => (
                    <button
                      key={resolution}
                      type="button"
                      className={shortageResolution === resolution ? styles.shortageChoiceSelected : styles.shortageChoice}
                      aria-pressed={shortageResolution === resolution}
                      disabled={busy}
                      onClick={() => {
                        setShortageResolution(resolution);
                        setSubstituteQuery("");
                        setSubstituteResults([]);
                        setSubstitute(null);
                      }}
                    >{label}</button>
                  ))}
                </div>
                {shortageResolution === "REPLACE_SIMILAR" && (
                  <div className={styles.substituteSearch}>
                    <label htmlFor="substitute-search">Buscar producto sustituto</label>
                    <input
                      id="substitute-search"
                      type="search"
                      disabled={busy}
                      value={substituteQuery}
                      onChange={(event) => { setSubstituteQuery(event.target.value); setSubstitute(null); }}
                      placeholder="Nombre, código o código de barras"
                    />
                    {substitute && <p className={styles.selectedSubstitute}>Seleccionado: <strong>{substitute.name}</strong></p>}
                    {substituteResults.length > 0 && (
                      <div className={styles.searchResults} aria-label="Productos encontrados">
                        {substituteResults.map((product) => (
                          <button key={product.id} type="button" disabled={busy} onClick={() => { setSubstitute(product); setSubstituteResults([]); }}>
                            {product.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <label className={styles.shortageNote} htmlFor="shortage-note">
                  Nota opcional
                  <input id="shortage-note" type="text" maxLength={280} disabled={busy} value={shortageNote} onChange={(event) => setShortageNote(event.target.value)} placeholder="Agregá un detalle si hace falta" />
                </label>
                <div className={styles.shortageActions}>
                  <button className={styles.shortageCancel} type="button" disabled={busy} onClick={resetShortage}>Cancelar</button>
                  <button className={styles.shortageConfirm} type="button" disabled={busy || (shortageResolution === "REPLACE_SIMILAR" && !substitute)} onClick={() => void confirmShortage()}>
                    {busy ? "Guardando…" : "Confirmar faltante"}
                  </button>
                </div>
              </section>
            )}
            <div className={styles.nav}>
              <button disabled={busy || cursor === 0} onClick={() => goTo(cursor - 1)}>Anterior</button>
              <span>{cursor + 1} / {sequence.length}</span>
              <button disabled={busy || cursor >= sequence.length - 1} onClick={() => goTo(cursor + 1)}>Siguiente</button>
            </div>
          </section>
        )}

        <section className={styles.finishBar}>
          {!canFinish && <p className={styles.hint}>{pending.length} línea{pending.length === 1 ? "" : "s"} sin resolver. No podés finalizar hasta completarlas.</p>}
          <button className={styles.primary} disabled={busy || !canFinish} aria-disabled={!canFinish} onClick={() => void finish()}>
            {busy ? "…" : "Finalizar picking"}
          </button>
        </section>
      </main>
    );
  }

  // list view
  return (
    <main className={styles.shell}>
      <header className={styles.header}><div><p className={styles.eyebrow}>PICKING</p><strong>Tus tareas</strong></div></header>
      {state === "loading" && <div className={styles.skeleton} aria-label="Cargando tareas" aria-busy="true" />}
      {state === "error" && (
        <div className={styles.card}>
          <h1 role="alert">No pudimos cargar las tareas</h1>
          <p>Revisá tu conexión e intentá de nuevo.</p>
          <button className={styles.primary} onClick={() => void loadLists()}>Reintentar</button>
        </div>
      )}
      {state === "ready" && (
        <>
          <section className={styles.group} aria-labelledby="mine-h">
            <h2 id="mine-h">En curso ({mine.length})</h2>
            {mine.length === 0 ? <p className={styles.empty}>No tenés tareas asignadas.</p> : mine.map((t) => (
              <button key={t.id} className={styles.taskRow} disabled={busy} onClick={() => void openTask(t.id, false)}>
                <span><strong>{t.orderNumber}</strong><span>{t.items.length} líneas · {t.slotStart}</span></span>
                <span className={styles.taskProgress}>{pickingProgress(t).resolved}/{pickingProgress(t).total}</span>
              </button>
            ))}
          </section>
          <section className={styles.group} aria-labelledby="avail-h">
            <h2 id="avail-h">Disponibles ({available.length})</h2>
            {available.length === 0 ? <p className={styles.empty}>No hay tareas en la cola.</p> : available.map((t) => (
              <button key={t.id} className={styles.taskRow} disabled={busy} onClick={() => void openTask(t.id, true)}>
                <span><strong>{t.orderNumber}</strong><span>{t.items.length} líneas · {t.slotStart}{t.priority > 0 ? ` · prioridad ${t.priority}` : ""}</span></span>
                <span className={styles.take}>Tomar</span>
              </button>
            ))}
          </section>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </>
      )}
    </main>
  );
}
