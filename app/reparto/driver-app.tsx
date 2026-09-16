"use client";

import { useCallback, useEffect, useState } from "react";
import { driverApi, DriverApiError } from "@/app/lib/driver-api";
import type { DriverDelivery, DriverDeliveryEvent } from "@/app/lib/driver-contract";
import { describeDeliveryProgress, formatPaymentSummary, getAvailableActions, INCIDENT_REASONS, sortDeliveries, validateIncidentInput } from "@/app/lib/driver-rules";
import styles from "./driver.module.css";

type LoadState = "loading" | "ready" | "error" | "auth";

type Deps = {
  loadMine?: () => Promise<DriverDelivery[]>;
  start?: (id: string) => Promise<DriverDelivery>;
  markDelivered?: (id: string, note?: string) => Promise<DriverDelivery>;
  reportIncident?: (id: string, reason: string, note?: string) => Promise<DriverDelivery>;
};

const dateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export function DriverApp({
  loadMine = driverApi.listMyDeliveries,
  start = driverApi.startDelivery,
  markDelivered = driverApi.markDelivered,
  reportIncident = driverApi.reportIncident,
}: Deps) {
  const [state, setState] = useState<LoadState>("loading");
  const [deliveries, setDeliveries] = useState<DriverDelivery[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliverPanelId, setDeliverPanelId] = useState<string | null>(null);
  const [deliverNote, setDeliverNote] = useState("");
  const [incidentPanelId, setIncidentPanelId] = useState<string | null>(null);
  const [incidentReason, setIncidentReason] = useState("");
  const [incidentNote, setIncidentNote] = useState("");

  const handle = useCallback((err: unknown, fallback: string) => {
    if (err instanceof DriverApiError && err.code === "unauthenticated") { setState("auth"); return; }
    setError(err instanceof DriverApiError ? err.message : fallback);
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      if (!navigator.onLine) throw new Error("Sin conexión a internet. Verificá tu conexión y reintentá.");
      const next = await loadMine();
      setDeliveries(next);
      setState("ready");
    } catch (err) {
      if (err instanceof DriverApiError && err.code === "unauthenticated") { setState("auth"); return; }
      setError(err instanceof Error ? err.message : "No pudimos cargar tus entregas.");
      setState("error");
    }
  }, [loadMine]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const resetPanels = () => {
    setDeliverPanelId(null);
    setDeliverNote("");
    setIncidentPanelId(null);
    setIncidentReason("");
    setIncidentNote("");
  };

  const runAction = async (id: string, action: () => Promise<DriverDelivery>) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await action();
      setDeliveries((current) => current.map((delivery) => (delivery.assignmentId === updated.assignmentId ? updated : delivery)));
      resetPanels();
    } catch (err) {
      handle(err, "No pudimos actualizar la entrega.");
    } finally {
      setBusyId(null);
    }
  };

  if (state === "auth") {
    return <main className={styles.shell}><div className={styles.card}><h1>Iniciá sesión</h1><p>Entrá con tu cuenta de repartidor para ver tus entregas.</p></div></main>;
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>REPARTO</p><strong>Tus entregas</strong></div>
        <button className={styles.refresh} disabled={state === "loading"} onClick={() => void load()}>Actualizar</button>
      </header>

      {state === "loading" && <div className={styles.skeleton} aria-label="Cargando entregas" aria-busy="true" />}

      {state === "error" && (
        <div className={styles.card}>
          <h1 role="alert">No pudimos cargar tus entregas</h1>
          <p>{error ?? "Revisá tu conexión e intentá de nuevo."}</p>
          <button className={styles.primary} onClick={() => void load()}>Reintentar</button>
        </div>
      )}

      {state === "ready" && (
        <>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {deliveries.length === 0 ? (
            <p className={styles.empty}>No tenés entregas asignadas.</p>
          ) : (
            <ul className={styles.list}>
              {(sortDeliveries(deliveries) as DriverDelivery[]).map((delivery) => {
                const actions = getAvailableActions(delivery);
                const busy = busyId === delivery.assignmentId;
                return (
                  <li key={delivery.assignmentId} className={styles.deliveryCard}>
                    <div className={styles.deliveryHead}>
                      <div>
                        <h2>{delivery.orderCode}</h2>
                        <p>{delivery.customerName}</p>
                      </div>
                      <span className={styles.status} data-progress={delivery.deliveryProgress}>{describeDeliveryProgress(delivery.deliveryProgress)}</span>
                    </div>

                    <p className={styles.detail}>
                      <strong>{delivery.deliveryAddress}</strong>
                      <span>Zona {delivery.deliveryZone}</span>
                      <a className={styles.phone} href={`tel:${delivery.customerPhone.replace(/\s+/g, "")}`}>{delivery.customerPhone}</a>
                      <span>{formatPaymentSummary(delivery)}</span>
                    </p>

                    {delivery.note && <p className={styles.note}>{delivery.note}</p>}

                    {delivery.events.length > 0 && (
                      <ul className={styles.history}>
                        {delivery.events.map((event: DriverDeliveryEvent) => (
                          <li key={event.id}>
                            <span>{describeDeliveryProgress(event.progress)}{event.note ? ` — ${event.note}` : ""}</span>
                            <time>{dateTime.format(new Date(event.occurredAt))}</time>
                          </li>
                        ))}
                      </ul>
                    )}

                    {actions.length > 0 && deliverPanelId !== delivery.assignmentId && incidentPanelId !== delivery.assignmentId && (
                      <div className={actions.length === 1 ? `${styles.actions} ${styles.single}` : styles.actions}>
                        {actions.includes("start") && (
                          <button className={styles.primary} disabled={busy} onClick={() => void runAction(delivery.assignmentId, () => start(delivery.assignmentId))}>
                            {busy ? "Iniciando…" : "Iniciar"}
                          </button>
                        )}
                        {actions.includes("delivered") && (
                          <button className={styles.primary} disabled={busy} onClick={() => { resetPanels(); setDeliverPanelId(delivery.assignmentId); }}>Entregado</button>
                        )}
                        {actions.includes("incident") && (
                          <button className={styles.secondary} disabled={busy} onClick={() => { resetPanels(); setIncidentPanelId(delivery.assignmentId); }}>Incidencia</button>
                        )}
                      </div>
                    )}

                    {deliverPanelId === delivery.assignmentId && (
                      <section className={styles.inlinePanel} aria-label="Confirmar entrega">
                        <label className={styles.field} htmlFor={`deliver-note-${delivery.assignmentId}`}>
                          Nota opcional
                          <input id={`deliver-note-${delivery.assignmentId}`} type="text" maxLength={280} disabled={busy} value={deliverNote} onChange={(event) => setDeliverNote(event.target.value)} placeholder="Ej: recibió en portería" />
                        </label>
                        <div className={styles.panelActions}>
                          <button className={styles.cancel} type="button" disabled={busy} onClick={resetPanels}>Cancelar</button>
                          <button className={styles.confirm} type="button" disabled={busy} onClick={() => void runAction(delivery.assignmentId, () => markDelivered(delivery.assignmentId, deliverNote.trim() || undefined))}>
                            {busy ? "Guardando…" : "Confirmar entrega"}
                          </button>
                        </div>
                      </section>
                    )}

                    {incidentPanelId === delivery.assignmentId && (
                      <section className={`${styles.inlinePanel} ${styles.incident}`} aria-label="Reportar incidencia">
                        <label className={styles.field} htmlFor={`incident-reason-${delivery.assignmentId}`}>
                          Motivo
                          <select id={`incident-reason-${delivery.assignmentId}`} disabled={busy} value={incidentReason} onChange={(event) => setIncidentReason(event.target.value)}>
                            <option value="">Elegí un motivo</option>
                            {INCIDENT_REASONS.map((reason: string) => <option key={reason} value={reason}>{reason}</option>)}
                          </select>
                        </label>
                        <label className={styles.field} htmlFor={`incident-note-${delivery.assignmentId}`}>
                          Nota opcional
                          <input id={`incident-note-${delivery.assignmentId}`} type="text" maxLength={280} disabled={busy} value={incidentNote} onChange={(event) => setIncidentNote(event.target.value)} placeholder="Agregá un detalle si hace falta" />
                        </label>
                        <div className={styles.panelActions}>
                          <button className={styles.cancel} type="button" disabled={busy} onClick={resetPanels}>Cancelar</button>
                          <button
                            className={styles.confirm}
                            data-danger="true"
                            type="button"
                            disabled={busy || !validateIncidentInput({ reason: incidentReason, note: incidentNote }).valid}
                            onClick={() => void runAction(delivery.assignmentId, () => reportIncident(delivery.assignmentId, incidentReason, incidentNote.trim() || undefined))}
                          >
                            {busy ? "Guardando…" : "Confirmar incidencia"}
                          </button>
                        </div>
                      </section>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
