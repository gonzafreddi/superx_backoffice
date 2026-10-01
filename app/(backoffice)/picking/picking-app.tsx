"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickingApi, PickingApiError } from "@/app/lib/picking-api";
import type { PickingTask } from "@/app/lib/picking-contract";
import { pickingSlotLabel, sortPickingTasks } from "@/app/lib/picking-rules";
import { AuthState, type Deps, errorMessage, Icon, isAuthError, Loading, Progress, Spinner, Status } from "./picking-ui";
import styles from "./picking.module.css";

export function PickingApp(props: Deps) {
  const router = useRouter();
  return <PickingList {...props} navigate={props.navigate ?? ((path) => router.push(path))} />;
}

export function PickingList({ loadMine = pickingApi.listMyTasks, loadAvailable = pickingApi.listAvailableTasks, take = pickingApi.takeTask, start = pickingApi.startTask, navigate }: Deps) {
  const [state, setState] = useState<"loading" | "ready" | "error" | "auth">("loading");
  const [mine, setMine] = useState<PickingTask[]>([]), [available, setAvailable] = useState<PickingTask[]>([]);
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState("");
  const [order, setOrder] = useState("slot");
  const locked = useRef(false);
  const refresh = useCallback(async () => {
    const [a, b] = await Promise.all([loadMine(), loadAvailable()]);
    setMine(a.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS"));
    setAvailable(b.filter((t) => t.status === "PENDING" && !t.assignedPickerId));
    setState("ready");
  }, [loadMine, loadAvailable]);
  const load = useCallback(async () => {
    setState("loading"); setError("");
    try { await refresh(); } catch (err) { setState(isAuthError(err) ? "auth" : "error"); }
  }, [refresh]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const open = async (task: PickingTask, taking: boolean) => {
    if (locked.current) return;
    locked.current = true; setBusy(task.id); setError("");
    try {
      if (taking) {
        const next = await take(task.id);
        setMine((rows) => [...rows.filter((row) => row.id !== next.id), next]);
        setAvailable((rows) => rows.filter((row) => row.id !== next.id));
      } else if (task.status === "ASSIGNED") await start(task.id);
      if (taking || task.status === "ASSIGNED") {
        try { await refresh(); } catch (err) {
          if (isAuthError(err)) { setState("auth"); return; }
          setError("La tarea se guardó. No pudimos actualizar la lista.");
        }
      }
      navigate?.(`/picking/${encodeURIComponent(task.id)}`);
    } catch (err) {
      if (isAuthError(err)) setState("auth");
      else {
        const conflict = taking && err instanceof PickingApiError && err.status === 409;
        setError(conflict ? "El pedido ya fue tomado por otro operario." : errorMessage(err, "No pudimos abrir la tarea. Intentá de nuevo."));
        if (conflict) { try { await refresh(); } catch (refreshError) { if (isAuthError(refreshError)) setState("auth"); else setState("error"); } }
      }
    } finally { locked.current = false; setBusy(null); }
  };
  const row = (task: PickingTask, taking: boolean) => <article className={taking ? styles.taskRow : styles.activeRow} key={task.id}>
    <span className={styles.boxIcon}><Icon name="boxes" /></span>
    <div className={styles.taskInfo}><h3>{task.orderNumber}{task.delivery?.recipientName ? ` · ${task.delivery.recipientName}` : ""}</h3>
      <div className={styles.metadata}><span><Icon name="pin" />{task.delivery?.cityName || "Localidad sin informar"}</span><span><Icon name="clock" />{pickingSlotLabel(task)}</span><span><Icon name="list" />{task.items.length} líneas</span></div>
      <Status status={task.status} />{!taking && <Progress task={task} />}
    </div>
    <button className={taking ? styles.take : styles.primary} disabled={busy !== null} onClick={() => void open(task, taking)}>{busy === task.id ? <><Spinner />{taking ? "Tomando…" : "Abriendo…"}</> : taking ? <><Icon name="boxes" />Tomar</> : "Continuar picking"}</button>
  </article>;
  return <main className={styles.shell}>
    <header className={styles.header}><div><p className={styles.eyebrow}>PICKING</p><h1>Tus tareas</h1><p>Gestioná tus pedidos asignados y tomá nuevas tareas.</p></div>
      <div className={styles.summary} aria-label="Resumen de tareas">{([["En curso", mine.length, styles.warning], ["Disponibles", available.length, styles.success]] as const).map(([label, count, tone]) => <div className={styles.metric} key={label}><span className={`${styles.boxIcon} ${tone}`}><Icon name="boxes" /></span><div><span>{label}</span><strong>{state === "loading" ? "—" : count}</strong></div></div>)}</div>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {state === "auth" && <AuthState />}
    {state === "loading" && <Loading />}
    {state === "error" && <section className={styles.card}><h2>No pudimos cargar las tareas</h2><p>Revisá tu conexión e intentá de nuevo.</p><button className={styles.primary} onClick={() => void load()}>Reintentar</button></section>}
    {state === "ready" && <>
      <section className={styles.group} aria-labelledby="mine-heading"><h2 id="mine-heading">En curso ({mine.length})</h2>{mine.length ? <div className={styles.rows}>{mine.map((task) => row(task, false))}</div> : <div className={styles.empty}><span className={styles.boxIcon}><Icon name="boxes" /></span><strong>No tenés tareas asignadas.</strong><p>Cuando tomes un pedido, va a aparecer acá para que puedas gestionarlo.</p></div>}</section>
      <section className={styles.available} aria-labelledby="available-heading"><div className={styles.sectionHeader}><h2 id="available-heading">Disponibles ({available.length})</h2><label className={styles.sort}>Ordenar por:<select value={order} onChange={(event) => setOrder(event.target.value)}><option value="slot">Más próximo</option><option value="oldest">Más antiguo</option><option value="lines">Más líneas</option></select></label></div><div className={styles.rows}>{available.length ? sortPickingTasks(available, order).map((task: PickingTask) => row(task, true)) : <div className={styles.card}><p>No hay tareas disponibles por ahora.</p></div>}</div></section>
    </>}
  </main>;
}
