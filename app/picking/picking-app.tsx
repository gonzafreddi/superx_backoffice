"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { pickingApi, PickingApiError } from "@/app/lib/picking-api";
import type { PickingItem, PickingTask } from "@/app/lib/picking-contract";
import { canCompleteTask, clampPickQuantity, nextPendingIndex, pendingLines, pickingProgress, sequenceItems } from "@/app/lib/picking-rules";
import styles from "./picking.module.css";

type View = "list" | "task" | "done";
type LoadState = "loading" | "ready" | "error" | "auth";

type Deps = {
  loadMine?: () => Promise<PickingTask[]>;
  loadAvailable?: () => Promise<PickingTask[]>;
  loadTask?: (id: string) => Promise<PickingTask>;
  assign?: (id: string) => Promise<PickingTask>;
  start?: (id: string) => Promise<PickingTask>;
  pick?: (taskId: string, itemId: string, quantity: number) => Promise<PickingTask>;
  complete?: (id: string) => Promise<PickingTask>;
};

export function PickingApp({
  loadMine = pickingApi.listMyTasks,
  loadAvailable = pickingApi.listAvailableTasks,
  loadTask = pickingApi.getTask,
  assign = pickingApi.assignToMe,
  start = pickingApi.startTask,
  pick = pickingApi.pickItem,
  complete = pickingApi.completeTask,
}: Deps) {
  const [view, setView] = useState<View>("list");
  const [state, setState] = useState<LoadState>("loading");
  const [mine, setMine] = useState<PickingTask[]>([]);
  const [available, setAvailable] = useState<PickingTask[]>([]);
  const [task, setTask] = useState<PickingTask | null>(null);
  const [cursor, setCursor] = useState(0);
  const [qty, setQty] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
  };

  const confirmItem = async () => {
    if (!task || !currentItem) return;
    setBusy(true);
    setError(null);
    try {
      const next = await pick(task.id, currentItem.id, qty);
      setTask(next);
      const seq = sequenceItems(next);
      const nextPending = nextPendingIndex(seq, cursor);
      if (nextPending !== -1) goToWith(seq, nextPending);
    } catch (err) {
      handle(err, "No pudimos registrar la cantidad.");
    } finally {
      setBusy(false);
    }
  };
  const goToWith = (seq: PickingItem[], index: number) => {
    setCursor(index);
    setQty(seq[index]?.quantityRequired ?? 0);
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
    return <main className={styles.shell}><div className={styles.card}><h1>Iniciá sesión</h1><p>Entrá con tu cuenta de picker para ver tus tareas.</p></div></main>;
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
            <div className={styles.stepper}>
              <button aria-label="Restar una unidad" disabled={busy || qty <= 0} onClick={() => setQty((v) => Math.max(0, v - 1))}>−</button>
              <span aria-live="polite" aria-label="Cantidad a confirmar">{qty}</span>
              <button aria-label="Sumar una unidad" disabled={busy || qty >= currentItem.quantityRequired} onClick={() => setQty((v) => clampPickQuantity(currentItem, v + 1))}>+</button>
            </div>
            <button className={styles.primary} disabled={busy} onClick={() => void confirmItem()}>
              {busy ? "Guardando…" : qty === currentItem.quantityRequired ? "Confirmar línea" : `Confirmar ${qty} de ${currentItem.quantityRequired}`}
            </button>
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
