"use client";

import type { FormEvent, RefObject } from "react";
import type { LocationInput } from "@/app/lib/location-contract";
import type { UserRole } from "@/app/lib/product-contract";

export type LocationForm = Required<LocationInput>;

export const roles: Record<UserRole, string> = { viewer: "Consulta", operator: "Operador", admin: "Administración" };
export const emptyLocationForm: LocationForm = { code: "", aisle: "", rack: "", level: "", sortOrder: 0, isActive: true, status: "ACTIVE", capacity: null, capacityUnit: "unidades" };
export const locationDates = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export function LocationIcon({ name }: { name: "warehouse" | "plus" | "edit" | "close" | "search" | "pin" | "move" | "adjust" | "trash" | "history" | "qr" | "barcode" | "alert" | "check" | "box" | "eye" | "more" | "list" | "grid" | "sort" | "info" }) {
  const paths = {
    warehouse: <><path d="M3 21h18M4 21V9l8-5 8 5v12M8 21v-6h8v6M4 9h16" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <><path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z" /><path d="m13 6 3 3" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    pin: <><path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></>,
    move: <><path d="M5 9h14M15 5l4 4-4 4M19 15H5M9 19l-4-4 4-4" /></>,
    adjust: <><path d="M4 7h16M4 17h16M8 4v6M16 14v6" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M9 7l1-3h4l1 3M6 7l1 13h10l1-13" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
    qr: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 15h2v2h-2zM18 14h2v6h-2zM14 19h3" /></>,
    barcode: <><path d="M4 5v14M7 5v14M10 5v14M14 5v14M18 5v14M20 5v14" /></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    box: <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" /><path d="m4 7 8 4 8-4M12 11v10" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    sort: <><path d="M8 6h12M8 12h8M8 18h4" /><path d="m4 4-2 2 2 2M2 6h4" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function RolePicker({ role, onChange }: { role: UserRole; onChange: (role: UserRole) => void }) {
  return <label className="role-picker">Rol activo<select value={role} onChange={(event) => onChange(event.target.value as UserRole)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
}

export function LocationDialog({ mode, form, errors, pending, errorRef, onClose, onChange, onSubmit }: { mode: "new" | "edit"; form: LocationForm; errors: Partial<Record<keyof LocationForm, string>>; pending: boolean; errorRef: RefObject<HTMLDivElement | null>; onClose: () => void; onChange: <K extends keyof LocationForm>(key: K, value: LocationForm[K]) => void; onSubmit: (event: FormEvent) => void }) {
  const messages = Object.values(errors).filter(Boolean);
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="location-form-title"><header><div><p className="eyebrow">UBICACIONES / {mode === "new" ? "ALTA" : "EDICIÓN"}</p><h2 id="location-form-title">{mode === "new" ? "Nueva ubicación" : "Editar ubicación"}</h2></div><button type="button" className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><LocationIcon name="close" /></button></header><form onSubmit={onSubmit} noValidate>{messages.length > 0 && <div className="form-summary" ref={errorRef} tabIndex={-1} role="alert"><strong>Revisá los datos de la ubicación</strong>{messages.map((message) => <span key={message}>{message}</span>)}</div>}<div className="form-grid"><Field label="Código" value={form.code} error={errors.code} autoFocus onChange={(value) => onChange("code", value)} /><Field label="Pasillo" value={form.aisle} error={errors.aisle} onChange={(value) => onChange("aisle", value)} /><Field label="Rack" value={form.rack} error={errors.rack} onChange={(value) => onChange("rack", value)} /><Field label="Nivel" value={form.level} error={errors.level} onChange={(value) => onChange("level", value)} /><label className="field"><span>Orden de recorrido</span><input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => onChange("sortOrder", Number(event.target.value))} aria-invalid={Boolean(errors.sortOrder)} /></label><label className="field"><span>Capacidad</span><input type="number" min="0" value={form.capacity ?? ""} onChange={(event) => onChange("capacity", event.target.value === "" ? null : Number(event.target.value))} /></label><label className="field"><span>Estado</span><select value={form.status} onChange={(event) => { const status = event.target.value as LocationForm["status"]; onChange("status", status); onChange("isActive", status === "ACTIVE"); }}><option value="ACTIVE">Activa</option><option value="BLOCKED">Bloqueada</option><option value="INACTIVE">Inactiva</option></select></label></div><footer><button type="button" className="button ghost" onClick={onClose} disabled={pending}>Cancelar</button><button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar ubicación"}</button></footer></form></section></div>;
}

function Field({ label, value, error, autoFocus, onChange }: { label: string; value: string; error?: string; autoFocus?: boolean; onChange: (value: string) => void }) { return <label className="field"><span>{label} <b aria-hidden="true">*</b></span><input value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} autoFocus={autoFocus} />{error && <small role="alert">{error}</small>}</label>; }
