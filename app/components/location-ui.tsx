"use client";

import type { FormEvent, RefObject } from "react";
import type { LocationInput } from "@/app/lib/location-contract";
import type { UserRole } from "@/app/lib/product-contract";

export type LocationForm = Required<LocationInput>;

export const roles: Record<UserRole, string> = { viewer: "Consulta", operator: "Operador", admin: "Administración" };
export const emptyLocationForm: LocationForm = { code: "", aisle: "", rack: "", level: "", sortOrder: 0, isActive: true };
export const locationDates = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export function LocationIcon({ name }: { name: "warehouse" | "plus" | "edit" | "close" | "search" | "pin" }) {
  const paths = {
    warehouse: <><path d="M3 21h18M4 21V9l8-5 8 5v12M8 21v-6h8v6M4 9h16" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <><path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z" /><path d="m13 6 3 3" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    pin: <><path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function RolePicker({ role, onChange }: { role: UserRole; onChange: (role: UserRole) => void }) {
  return <label className="role-picker">Rol activo<select value={role} onChange={(event) => onChange(event.target.value as UserRole)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
}

export function LocationDialog({ mode, form, errors, pending, errorRef, onClose, onChange, onSubmit }: { mode: "new" | "edit"; form: LocationForm; errors: Partial<Record<keyof LocationForm, string>>; pending: boolean; errorRef: RefObject<HTMLDivElement | null>; onClose: () => void; onChange: <K extends keyof LocationForm>(key: K, value: LocationForm[K]) => void; onSubmit: (event: FormEvent) => void }) {
  const messages = Object.values(errors).filter(Boolean);
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="location-form-title"><header><div><p className="eyebrow">UBICACIONES / {mode === "new" ? "ALTA" : "EDICIÓN"}</p><h2 id="location-form-title">{mode === "new" ? "Nueva ubicación" : "Editar ubicación"}</h2></div><button type="button" className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><LocationIcon name="close" /></button></header><form onSubmit={onSubmit} noValidate>{messages.length > 0 && <div className="form-summary" ref={errorRef} tabIndex={-1} role="alert"><strong>Revisá los datos de la ubicación</strong>{messages.map((message) => <span key={message}>{message}</span>)}</div>}<div className="form-grid"><Field label="Código" value={form.code} error={errors.code} autoFocus onChange={(value) => onChange("code", value)} /><Field label="Pasillo" value={form.aisle} error={errors.aisle} onChange={(value) => onChange("aisle", value)} /><Field label="Rack" value={form.rack} error={errors.rack} onChange={(value) => onChange("rack", value)} /><Field label="Nivel" value={form.level} error={errors.level} onChange={(value) => onChange("level", value)} /><label className="field"><span>Orden de recorrido</span><input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => onChange("sortOrder", Number(event.target.value))} aria-invalid={Boolean(errors.sortOrder)} />{errors.sortOrder && <small role="alert">{errors.sortOrder}</small>}</label></div><label className="toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => onChange("isActive", event.target.checked)} /><span aria-hidden="true" /><strong>Ubicación activa</strong></label><footer><button type="button" className="button ghost" onClick={onClose} disabled={pending}>Cancelar</button><button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar ubicación"}</button></footer></form></section></div>;
}

function Field({ label, value, error, autoFocus, onChange }: { label: string; value: string; error?: string; autoFocus?: boolean; onChange: (value: string) => void }) { return <label className="field"><span>{label} <b aria-hidden="true">*</b></span><input value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} autoFocus={autoFocus} />{error && <small role="alert">{error}</small>}</label>; }
