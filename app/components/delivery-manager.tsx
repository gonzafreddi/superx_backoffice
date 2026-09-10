"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ListSkeleton } from "@/app/components/list-skeleton";
import { deliveryApi } from "@/app/lib/delivery-api";
import type { DeliverySlot, DeliveryZone, SlotUpsertInput, ZoneUpdateInput } from "@/app/lib/delivery-contract";
import type { UserRole } from "@/app/lib/product-contract";
import { getDeliveryPermissions, slotOccupancy, summarizeCheckoutImpact, validateSlotInput, validateZoneInput } from "@/app/lib/delivery-rules";

type Notice = { kind: "success" | "error"; text: string } | null;
type Dialog = { kind: "zone-new" | "zone-edit" } | { kind: "slot-new" } | { kind: "slot-edit"; slot: DeliverySlot } | null;
const roles: Record<UserRole, string> = { viewer: "Consulta", operator: "Operador", admin: "Administración" };
const actors: Record<UserRole, string> = { viewer: "Usuario de consulta", operator: "Operador actual", admin: "Administración actual" };
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const dayLabel = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Icon({ name }: { name: "search" | "zone" | "close" | "chevron" | "history" | "edit" | "plus" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    zone: <><path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
    edit: <><path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z" /><path d="m13 6 3 3" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const emptyZoneForm = { name: "", cityName: "", postalCodes: "", neighborhoods: "", deliveryFee: "", freeDeliveryThreshold: "", priority: "0", active: true, reason: "" };
const emptySlotForm = { date: "", startTime: "10:00", endTime: "12:00", capacity: "10", active: true, reason: "" };

export function DeliveryManager() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [zoneForm, setZoneForm] = useState(emptyZoneForm);
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const permissions = getDeliveryPermissions(role);
  const selected = zones.find((zone) => zone.id === selectedId) ?? null;

  const load = async () => {
    setLoading(true); setLoadError("");
    try {
      if (!navigator.onLine) throw new Error("Sin conexión a internet. Verificá tu conexión y reintentá.");
      const next = await deliveryApi.listZones();
      setZones(next);
      setSelectedId((current) => (current && next.some((zone) => zone.id === current) ? current : next[0]?.id ?? null));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las zonas.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Sincronización inicial con el adaptador temporal de entregas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  useEffect(() => { if (formError) errorRef.current?.focus(); }, [formError]);
  useEffect(() => {
    let active = true;
    // Carga perezosa de franjas de la zona seleccionada (adaptador temporal).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!selectedId) { setSlots([]); return; }
    setSlotsLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    void deliveryApi.listSlots(selectedId)
      .then((next) => { if (active) setSlots(next); })
      .catch(() => { if (active) setSlots([]); })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-AR");
    return zones.filter((zone) => !normalized || [zone.name, zone.cityName, ...zone.postalCodes, ...zone.neighborhoods].some((value) => value.toLocaleLowerCase("es-AR").includes(normalized)));
  }, [zones, query]);

  const openZoneDialog = (kind: "zone-new" | "zone-edit") => {
    setFormError("");
    if (kind === "zone-edit" && selected) {
      setZoneForm({ name: selected.name, cityName: selected.cityName, postalCodes: selected.postalCodes.join(", "), neighborhoods: selected.neighborhoods.join(", "), deliveryFee: String(selected.deliveryFee), freeDeliveryThreshold: selected.freeDeliveryThreshold === null ? "" : String(selected.freeDeliveryThreshold), priority: String(selected.priority), active: selected.active, reason: "" });
    } else {
      setZoneForm(emptyZoneForm);
    }
    setDialog({ kind });
  };
  const openSlotDialog = (slot?: DeliverySlot) => {
    setFormError("");
    if (slot) setSlotForm({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime, capacity: String(slot.capacity), active: slot.active, reason: "" });
    else setSlotForm(emptySlotForm);
    setDialog(slot ? { kind: "slot-edit", slot } : { kind: "slot-new" });
  };

  const parseList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

  const submitZone = (event: FormEvent) => {
    event.preventDefault();
    const input = { name: zoneForm.name, cityName: zoneForm.cityName, postalCodes: parseList(zoneForm.postalCodes), neighborhoods: parseList(zoneForm.neighborhoods), deliveryFee: zoneForm.deliveryFee === "" ? "" : Number(zoneForm.deliveryFee), freeDeliveryThreshold: zoneForm.freeDeliveryThreshold === "" ? "" : Number(zoneForm.freeDeliveryThreshold), priority: zoneForm.priority === "" ? "" : Number(zoneForm.priority), active: zoneForm.active } as const;
    const message = Object.values(validateZoneInput(input))[0] ?? "";
    setFormError(message);
    if (message) return;
    void saveZone(input);
  };
  const saveZone = async (input: Omit<ZoneUpdateInput, "changedBy" | "changedByRole" | "reason">) => {
    setPending(true); setNotice(null);
    const payload: ZoneUpdateInput = { ...input, changedBy: actors[role], changedByRole: role, ...(zoneForm.reason.trim() ? { reason: zoneForm.reason.trim() } : {}) };
    try {
      const saved = dialog?.kind === "zone-edit" && selected ? await deliveryApi.updateZone(selected.id, payload) : await deliveryApi.createZone(payload);
      setZones((current) => (current.some((zone) => zone.id === saved.id) ? current.map((zone) => (zone.id === saved.id ? saved : zone)) : [...current, saved]));
      setSelectedId(saved.id);
      setDialog(null);
      setNotice({ kind: "success", text: `${saved.name} guardada. El cambio impacta el checkout de inmediato y quedó auditado.` });
    } catch (error) {
      setDialog(null);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo guardar la zona." });
    } finally {
      setPending(false);
    }
  };

  const submitSlot = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const editingSlot = dialog?.kind === "slot-edit" ? dialog.slot : null;
    const input = { date: slotForm.date, startTime: slotForm.startTime, endTime: slotForm.endTime, capacity: slotForm.capacity === "" ? "" : Number(slotForm.capacity), active: slotForm.active } as const;
    const message = Object.values(validateSlotInput(input, { existingSlots: slots, today: new Date().toISOString().slice(0, 10), editingSlot }))[0] ?? "";
    setFormError(message);
    if (message) return;
    void saveSlot(input, editingSlot);
  };
  const saveSlot = async (input: Omit<SlotUpsertInput, "changedBy" | "changedByRole" | "reason">, editingSlot: DeliverySlot | null) => {
    if (!selected) return;
    setPending(true); setNotice(null);
    const payload: SlotUpsertInput = { ...input, changedBy: actors[role], changedByRole: role, ...(slotForm.reason.trim() ? { reason: slotForm.reason.trim() } : {}) };
    try {
      const saved = editingSlot ? await deliveryApi.updateSlot(editingSlot.id, payload) : await deliveryApi.createSlot(selected.id, payload);
      setSlots((current) => (current.some((slot) => slot.id === saved.id) ? current.map((slot) => (slot.id === saved.id ? saved : slot)) : [...current, saved]).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)));
      setDialog(null);
      setNotice({ kind: "success", text: `Franja ${editingSlot ? "actualizada" : "creada"}. Disponible en el checkout al instante.` });
    } catch (error) {
      setDialog(null);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo guardar la franja." });
    } finally {
      setPending(false);
    }
  };

  return <section className="workspace" id="entregas">
    <header className="topbar">
      <div><p className="eyebrow">LOGÍSTICA / ENTREGAS</p><h1>Zonas y franjas</h1><p className="subtitle">Ajustá cobertura, costo de envío, umbral de envío gratis y capacidad de franjas. Los cambios impactan el checkout sin deploy.</p></div>
      <div className="top-actions">
        <label className="role-picker">Rol activo<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {permissions.create && <button className="button primary" onClick={() => openZoneDialog("zone-new")}><Icon name="plus" /> Nueva zona</button>}
      </div>
    </header>
    {notice && <div className={`notice ${notice.kind}`} role="status"><span>{notice.kind === "success" ? "Listo" : "No se pudo completar"}</span>{notice.text}<button aria-label="Cerrar mensaje" onClick={() => setNotice(null)}><Icon name="close" /></button></div>}
    <div className="permission-note">Estás operando como <strong>{roles[role]}</strong>. {permissions.editZone ? "Podés editar zonas y franjas." : permissions.editSlot ? "Podés ajustar franjas y capacidad; sólo administración edita zonas." : "Sólo podés consultar la configuración de entregas."}</div>
    <section className="catalog-grid order-grid">
      <div className="list-panel">
        <div className="filters"><label className="search"><Icon name="search" /><span className="sr-only">Buscar zona</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar zona, ciudad, CP o barrio" /></label></div>
        <div className="list-meta"><strong>{visible.length} {visible.length === 1 ? "zona" : "zonas"}</strong><button className="link-button" onClick={() => setQuery("")}>Limpiar</button></div>
        {loading ? <ListSkeleton label="Cargando zonas…" /> : loadError ? <div className="state error-state"><strong>{loadError.startsWith("Sin conexión") ? "Sin conexión" : "No pudimos cargar las zonas"}</strong><span>{loadError}</span><button className="button secondary" onClick={() => void load()}>Reintentar</button></div> : visible.length === 0 ? <div className="state"><Icon name="zone" /><strong>No encontramos zonas</strong><span>Ajustá la búsqueda o creá una zona nueva.</span></div> : <ul className="zone-list">{visible.map((zone) => <li key={zone.id}><button className={`zone-row ${selected?.id === zone.id ? "selected" : ""}`} onClick={() => setSelectedId(zone.id)}><span className="zone-row-head"><strong>{zone.name}</strong><span className={`status ${zone.active ? "active" : "inactive"}`}>{zone.active ? "Activa" : "Inactiva"}</span></span><span className="zone-row-meta">{zone.cityName} · {money.format(zone.deliveryFee)} envío{zone.freeDeliveryThreshold ? ` · gratis desde ${money.format(zone.freeDeliveryThreshold)}` : ""}</span></button></li>)}</ul>}
      </div>
      <aside className="detail-panel" aria-live="polite">
        {!selected ? <div className="state detail-empty"><Icon name="zone" /><strong>Seleccioná una zona</strong><span>Vas a ver su cobertura, costos y franjas.</span></div> : <>
          <div className="detail-heading"><span className="price-mark"><Icon name="zone" /></span><div><span className={`status ${selected.active ? "active" : "inactive"}`}>{selected.active ? "Activa" : "Inactiva"}</span><h2>{selected.name}</h2><p>{selected.cityName} · prioridad {selected.priority}</p></div></div>
          <div className="stock-summary"><span>EN EL CHECKOUT</span><strong>{summarizeCheckoutImpact(selected)}</strong><small>Actualizado {dateTime.format(new Date(selected.updatedAt))}</small></div>
          <dl className="order-info">
            <div><dt>Códigos postales</dt><dd>{selected.postalCodes.length ? selected.postalCodes.join(", ") : "—"}</dd></div>
            <div><dt>Barrios</dt><dd>{selected.neighborhoods.length ? selected.neighborhoods.join(", ") : "—"}</dd></div>
          </dl>
          {permissions.editZone && <button className="button primary full-width" onClick={() => openZoneDialog("zone-edit")}><Icon name="edit" /> Editar zona</button>}
          <section className="slots-section">
            <div className="slots-head"><h3>Franjas ({slots.length})</h3>{permissions.editSlot && <button className="button secondary" onClick={() => openSlotDialog()}><Icon name="plus" /> Nueva franja</button>}</div>
            {slotsLoading ? <ListSkeleton label="Cargando franjas…" /> : slots.length === 0 ? <p className="slots-empty">Esta zona no tiene franjas cargadas.</p> : <ul className="slot-list">{slots.map((slot) => { const occ = slotOccupancy(slot); return <li key={slot.id} className={`slot-row ${slot.active ? "" : "slot-inactive"}`}>
              <div className="slot-info"><strong>{dayLabel.format(new Date(`${slot.date}T00:00:00Z`))} · {slot.startTime}–{slot.endTime}</strong><span>{occ.used}/{occ.capacity} reservas{occ.full ? " · completa" : ""}{slot.active ? "" : " · inactiva"}</span><span className="slot-bar" aria-hidden="true"><span style={{ width: `${Math.round(occ.ratio * 100)}%` }} className={occ.full ? "slot-bar-full" : ""} /></span></div>
              {permissions.editSlot && <button className="button ghost" onClick={() => openSlotDialog(slot)}>Editar</button>}
            </li>; })}</ul>}
          </section>
          <section className="history"><h3><Icon name="history" /> Historial de la zona</h3>{[...selected.history].reverse().map((entry) => <article className="history-row" key={entry.id}><strong>{entry.actor}{entry.role ? ` · ${entry.role}` : ""}</strong><div><time>{dateTime.format(new Date(entry.changedAt))}</time><em>{entry.summary}</em></div></article>)}</section>
        </>}
      </aside>
    </section>
    {dialog && (dialog.kind === "zone-new" || dialog.kind === "zone-edit") && <ZoneForm mode={dialog.kind} form={zoneForm} error={formError} errorRef={errorRef} pending={pending} onChange={setZoneForm} onClose={() => setDialog(null)} onSubmit={submitZone} />}
    {dialog && (dialog.kind === "slot-new" || dialog.kind === "slot-edit") && <SlotForm mode={dialog.kind} form={slotForm} slot={dialog.kind === "slot-edit" ? dialog.slot : null} error={formError} errorRef={errorRef} pending={pending} onChange={setSlotForm} onClose={() => setDialog(null)} onSubmit={submitSlot} />}
  </section>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}{hint && <small> {hint}</small>}</span>{children}</label>;
}

function ZoneForm({ mode, form, error, errorRef, pending, onChange, onClose, onSubmit }: { mode: "zone-new" | "zone-edit"; form: typeof emptyZoneForm; error: string; errorRef: React.RefObject<HTMLDivElement | null>; pending: boolean; onChange: (form: typeof emptyZoneForm) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const set = (patch: Partial<typeof emptyZoneForm>) => onChange({ ...form, ...patch });
  return <div className="modal-backdrop" role="presentation"><section className="modal price-modal" role="dialog" aria-modal="true" aria-labelledby="zone-form-title">
    <header><div><p className="eyebrow">ENTREGAS</p><h2 id="zone-form-title">{mode === "zone-new" ? "Nueva zona" : "Editar zona"}</h2></div><button className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><Icon name="close" /></button></header>
    <p className="modal-lede">Los cambios impactan el checkout de inmediato y quedan registrados con tu rol y la fecha.</p>
    <form onSubmit={onSubmit} noValidate>
      {error && <div className="form-summary" ref={errorRef} tabIndex={-1} role="alert"><strong>Revisá los datos</strong><span>{error}</span></div>}
      <div className="form-grid">
        <Field label="Nombre"><input value={form.name} maxLength={80} onChange={(event) => set({ name: event.target.value })} /></Field>
        <Field label="Ciudad"><input value={form.cityName} maxLength={80} onChange={(event) => set({ cityName: event.target.value })} /></Field>
        <Field label="Costo de envío (ARS)"><input inputMode="decimal" type="number" min="0" step="0.01" value={form.deliveryFee} onChange={(event) => set({ deliveryFee: event.target.value })} /></Field>
        <Field label="Umbral envío gratis" hint="(vacío = sin envío gratis)"><input inputMode="decimal" type="number" min="0" step="0.01" value={form.freeDeliveryThreshold} onChange={(event) => set({ freeDeliveryThreshold: event.target.value })} /></Field>
        <Field label="Prioridad" hint="(mayor gana ante solapamiento)"><input type="number" min="0" step="1" value={form.priority} onChange={(event) => set({ priority: event.target.value })} /></Field>
        <Field label="Estado"><select value={form.active ? "active" : "inactive"} onChange={(event) => set({ active: event.target.value === "active" })}><option value="active">Activa</option><option value="inactive">Inactiva</option></select></Field>
      </div>
      <Field label="Códigos postales" hint="(separados por coma)"><input value={form.postalCodes} onChange={(event) => set({ postalCodes: event.target.value })} placeholder="1405, 1406" /></Field>
      <Field label="Barrios" hint="(separados por coma)"><input value={form.neighborhoods} onChange={(event) => set({ neighborhoods: event.target.value })} placeholder="Caballito, Primera Junta" /></Field>
      <label className="field reason-field"><span>Motivo <small>(opcional)</small></span><input value={form.reason} maxLength={140} onChange={(event) => set({ reason: event.target.value })} placeholder="Ej.: nueva tarifa del transportista" /></label>
      <footer><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar zona"}</button></footer>
    </form>
  </section></div>;
}

function SlotForm({ mode, form, slot, error, errorRef, pending, onChange, onClose, onSubmit }: { mode: "slot-new" | "slot-edit"; form: typeof emptySlotForm; slot: DeliverySlot | null; error: string; errorRef: React.RefObject<HTMLDivElement | null>; pending: boolean; onChange: (form: typeof emptySlotForm) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const set = (patch: Partial<typeof emptySlotForm>) => onChange({ ...form, ...patch });
  return <div className="modal-backdrop" role="presentation"><section className="modal price-modal" role="dialog" aria-modal="true" aria-labelledby="slot-form-title">
    <header><div><p className="eyebrow">ENTREGAS</p><h2 id="slot-form-title">{mode === "slot-new" ? "Nueva franja" : "Editar franja"}</h2></div><button className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><Icon name="close" /></button></header>
    <p className="modal-lede">{slot ? `Franja con ${slot.bookedCount} reservas: la capacidad no puede bajar de ese número.` : "La franja queda disponible en el checkout apenas la guardás."}</p>
    <form onSubmit={onSubmit} noValidate>
      {error && <div className="form-summary" ref={errorRef} tabIndex={-1} role="alert"><strong>Revisá los datos</strong><span>{error}</span></div>}
      <div className="form-grid">
        <Field label="Fecha"><input type="date" value={form.date} onChange={(event) => set({ date: event.target.value })} /></Field>
        <Field label="Capacidad"><input type="number" min="1" step="1" value={form.capacity} onChange={(event) => set({ capacity: event.target.value })} /></Field>
        <Field label="Inicio"><input type="time" value={form.startTime} onChange={(event) => set({ startTime: event.target.value })} /></Field>
        <Field label="Fin"><input type="time" value={form.endTime} onChange={(event) => set({ endTime: event.target.value })} /></Field>
        <Field label="Estado"><select value={form.active ? "active" : "inactive"} onChange={(event) => set({ active: event.target.value === "active" })}><option value="active">Activa</option><option value="inactive">Inactiva</option></select></Field>
      </div>
      <label className="field reason-field"><span>Motivo <small>(opcional)</small></span><input value={form.reason} maxLength={140} onChange={(event) => set({ reason: event.target.value })} placeholder="Ej.: sumar capacidad por demanda" /></label>
      <footer><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar franja"}</button></footer>
    </form>
  </section></div>;
}
