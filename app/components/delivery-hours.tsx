"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ListSkeleton } from "@/app/components/list-skeleton";
import { Notice } from "@/app/components/ui/notice";
import { deliveryApi } from "@/app/lib/delivery-api";
import type { DeliveryWindow, WindowInput } from "@/app/lib/delivery-contract";
import { formatWeekdays, validateWindowInput, WEEKDAYS } from "@/app/lib/delivery-rules";

type Dialog = { kind: "new" } | { kind: "edit"; window: DeliveryWindow } | null;
const emptyForm: WindowInput = { startTime: "10:00", endTime: "12:00", weekdays: [1, 2, 3, 4, 5, 6], active: true };

/**
 * Delivery hours ("horarios de reparto"): the checkout offers every active
 * window on its weekdays for the next days, with no capacity limit and for
 * every zone. Replaces creating slots one by one.
 */
export function DeliveryHours({ canEdit }: { canEdit: boolean }) {
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<WindowInput>(emptyForm);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true); setLoadError("");
    try { setWindows(await deliveryApi.listWindows()); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los horarios."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  useEffect(() => { if (formError) errorRef.current?.focus(); }, [formError]);

  const open = (window?: DeliveryWindow) => {
    setFormError("");
    setForm(window ? { startTime: window.startTime, endTime: window.endTime, weekdays: [...window.weekdays], active: window.active } : emptyForm);
    setDialog(window ? { kind: "edit", window } : { kind: "new" });
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setPending(true); setNotice(null);
    try {
      await action();
      setDialog(null);
      setNotice({ kind: "success", text: success });
      await load();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo guardar el horario." });
      setDialog(null);
    } finally {
      setPending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const editingId = dialog?.kind === "edit" ? dialog.window.id : null;
    const message = Object.values(validateWindowInput(form, windows, editingId))[0] ?? "";
    setFormError(message);
    if (message) return;
    void run(() => (editingId ? deliveryApi.updateWindow(editingId, form) : deliveryApi.createWindow(form)), "Horario guardado. El checkout ya ofrece los próximos días con este horario.");
  };

  const toggle = (window: DeliveryWindow) => void run(
    () => deliveryApi.updateWindow(window.id, { startTime: window.startTime, endTime: window.endTime, weekdays: window.weekdays, active: !window.active }),
    window.active ? "Horario pausado: deja de ofrecerse en el checkout. Los pedidos ya hechos no cambian." : "Horario activado.",
  );
  const remove = (window: DeliveryWindow) => {
    if (!globalThis.confirm(`¿Eliminar el horario ${window.startTime}–${window.endTime}? Los pedidos ya hechos mantienen su franja.`)) return;
    void run(() => deliveryApi.deleteWindow(window.id), "Horario eliminado.");
  };

  const toggleDay = (day: number) => setForm((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day].sort((a, b) => a - b) }));

  return <section className="detail-panel slots-section" style={{ minHeight: 0 }} aria-labelledby="delivery-hours-title">
    <div className="slots-head">
      <div><h3 id="delivery-hours-title">Horarios de reparto</h3><p className="slots-empty">Se ofrecen en el checkout para los próximos 7 días, sin límite de pedidos y para todas las zonas. Los horarios que ya empezaron no se muestran.</p></div>
      {canEdit && <button className="button primary" onClick={() => open()}>Nuevo horario</button>}
    </div>
    {notice && <Notice kind={notice.kind} label={notice.kind === "success" ? "Listo" : "No se pudo completar"} onDismiss={() => setNotice(null)} dismissLabel="Cerrar mensaje" closeContent="×">{notice.text}</Notice>}
    {loading ? <ListSkeleton label="Cargando horarios…" /> : loadError ? <div className="state error-state"><strong>No pudimos cargar los horarios</strong><span>{loadError}</span><button className="button secondary" onClick={() => void load()}>Reintentar</button></div>
      : windows.length === 0 ? <p className="slots-empty"><strong>No hay horarios cargados:</strong> los clientes no pueden elegir cuándo recibir su pedido.</p>
      : <ul className="slot-list">{windows.map((window) => <li key={window.id} className={`slot-row ${window.active ? "" : "slot-inactive"}`}>
        <div className="slot-info"><strong>{window.startTime}–{window.endTime}</strong><span>{formatWeekdays(window.weekdays)}{window.active ? "" : " · pausado"}</span></div>
        {canEdit && <div className="top-actions">
          <button className="button ghost" disabled={pending} onClick={() => open(window)}>Editar</button>
          <button className="button ghost" disabled={pending} onClick={() => toggle(window)}>{window.active ? "Pausar" : "Activar"}</button>
          <button className="button ghost" disabled={pending} onClick={() => remove(window)}>Eliminar</button>
        </div>}
      </li>)}</ul>}
    {dialog && <div className="modal-backdrop" role="presentation"><section className="modal price-modal" role="dialog" aria-modal="true" aria-labelledby="window-form-title">
      <header><div><p className="eyebrow">ENTREGAS</p><h2 id="window-form-title">{dialog.kind === "new" ? "Nuevo horario de reparto" : "Editar horario de reparto"}</h2></div><button className="icon-button" aria-label="Cerrar formulario" onClick={() => setDialog(null)}>×</button></header>
      <p className="modal-lede">Los cambios se ven en el checkout al instante. Los pedidos ya hechos mantienen su franja.</p>
      <form onSubmit={submit} noValidate>
        {formError && <div className="form-summary" ref={errorRef} tabIndex={-1} role="alert"><strong>Revisá los datos</strong><span>{formError}</span></div>}
        <div className="form-grid">
          <label className="field"><span>Desde</span><input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label className="field"><span>Hasta</span><input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
        </div>
        <fieldset className="field"><legend>Días</legend><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {WEEKDAYS.map((day) => <button key={day.value} type="button" className={`chip ${form.weekdays.includes(day.value) ? "chip-active" : ""}`} aria-pressed={form.weekdays.includes(day.value)} onClick={() => toggleDay(day.value)}>{day.short}</button>)}
        </div></fieldset>
        <footer><button type="button" className="button ghost" onClick={() => setDialog(null)}>Cancelar</button><button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar horario"}</button></footer>
      </form>
    </section></div>}
  </section>;
}
