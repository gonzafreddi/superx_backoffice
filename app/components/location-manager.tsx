"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ListSkeleton } from "@/app/components/list-skeleton";
import { locationApi } from "@/app/lib/location-api";
import type { LocationInput, LocationProduct, LocationWarehouse, ProductLocation, WarehouseLocationWithProducts } from "@/app/lib/location-contract";
import type { UserRole } from "@/app/lib/product-contract";
import { getLocationPermissions, validateLocationInput } from "@/app/lib/location-rules";

type Notice = { kind: "success" | "error"; text: string } | null;
type Dialog = "new" | "edit" | null;
type LocationForm = Required<LocationInput>;
const roles: Record<UserRole, string> = { viewer: "Consulta", operator: "Operador", admin: "Administración" };
const emptyForm: LocationForm = { code: "", aisle: "", rack: "", level: "", sortOrder: 0, isActive: true };
const dates = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

function Icon({ name }: { name: "warehouse" | "plus" | "edit" | "close" | "search" | "pin" }) {
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

export function LocationManager() {
  const [warehouses, setWarehouses] = useState<LocationWarehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [locations, setLocations] = useState<WarehouseLocationWithProducts[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof LocationForm, string>>>({});
  const [pending, setPending] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<LocationProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LocationProduct | null>(null);
  const [assignment, setAssignment] = useState<ProductLocation | null>(null);
  const [assignmentLocationId, setAssignmentLocationId] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const permissions = getLocationPermissions(role);
  const selected = locations.find((location) => location.id === selectedId) ?? null;
  const warehouse = warehouses.find((item) => item.id === warehouseId) ?? null;

  const loadWarehouses = async () => {
    setLoading(true); setLoadError("");
    try {
      if (!navigator.onLine) throw new Error("Sin conexión a internet. Verificá tu conexión y reintentá.");
      const next = await locationApi.listWarehouses();
      setWarehouses(next);
      setWarehouseId((current) => next.some((item) => item.id === current) ? current : next[0]?.id ?? "");
    } catch (error) { setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los depósitos."); } finally { setLoading(false); }
  };
  const loadLocations = async (id: string) => {
    setLoading(true); setLoadError("");
    try {
      const next = await locationApi.listLocations(id);
      setLocations(next);
      setSelectedId((current) => current && next.some((location) => location.id === current) ? current : next[0]?.id ?? null);
    } catch (error) { setLocations([]); setSelectedId(null); setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las ubicaciones."); } finally { setLoading(false); }
  };
  useEffect(() => { // Carga inicial del selector de depósito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWarehouses();
  }, []);
  useEffect(() => {
    // The selected warehouse is the source of truth for this scoped list.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (warehouseId) void loadLocations(warehouseId); else { setLocations([]); setSelectedId(null); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [warehouseId]);
  useEffect(() => { if (Object.keys(errors).length) errorRef.current?.focus(); }, [errors]);
  useEffect(() => {
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!selectedProduct || !warehouseId) { setAssignment(null); return; }
    /* eslint-enable react-hooks/set-state-in-effect */
    void locationApi.getProductLocation(warehouseId, selectedProduct.id).then((next) => { if (active) { setAssignment(next); setAssignmentLocationId(next?.location.id ?? ""); } }).catch((error) => { if (active) setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo consultar la asignación." }); });
    return () => { active = false; };
  }, [selectedProduct, warehouseId]);

  const openDialog = (kind: Dialog) => { if (!kind) return; setErrors({}); setForm(kind === "edit" && selected ? { code: selected.code, aisle: selected.aisle, rack: selected.rack, level: selected.level, sortOrder: selected.sortOrder, isActive: selected.isActive } : emptyForm); setDialog(kind); };
  const saveLocation = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateLocationInput(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !warehouseId) return;
    setPending(true); setNotice(null);
    try {
      const updated = dialog === "edit" && selected ? await locationApi.updateLocation(selected.id, form) : await locationApi.createLocation(warehouseId, form);
      await loadLocations(warehouseId); setSelectedId(updated.id); setDialog(null); setNotice({ kind: "success", text: dialog === "edit" ? "Ubicación actualizada." : "Ubicación creada." });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo guardar la ubicación." }); } finally { setPending(false); }
  };
  const searchProducts = async (event: FormEvent) => { event.preventDefault(); if (!productQuery.trim()) { setProducts([]); return; } setProductLoading(true); try { setProducts(await locationApi.searchProducts(productQuery.trim())); } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo buscar productos." }); } finally { setProductLoading(false); } };
  const assign = async () => { if (!selectedProduct || !warehouseId || !assignmentLocationId) return; setPending(true); try { const next = await locationApi.assignProductLocation(selectedProduct.id, warehouseId, assignmentLocationId); setAssignment(next); setNotice({ kind: "success", text: "Producto asignado a la ubicación." }); } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo asignar el producto." }); } finally { setPending(false); } };
  const clear = async () => { if (!selectedProduct || !warehouseId) return; setPending(true); try { await locationApi.clearProductLocation(selectedProduct.id, warehouseId); setAssignment(null); setAssignmentLocationId(""); setNotice({ kind: "success", text: "Asignación quitada." }); } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo quitar la asignación." }); } finally { setPending(false); } };

  return <section className="workspace" id="ubicaciones"><header className="topbar"><div><p className="eyebrow">OPERACIONES / UBICACIONES</p><h1>Ubicaciones de depósito</h1><p className="subtitle">Definí el recorrido de picking y asigná cada producto a una ubicación por depósito.</p></div><div className="top-actions"><label className="role-picker">Rol activo<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{permissions.manage && <button className="button primary" onClick={() => openDialog("new")} disabled={!warehouseId}><Icon name="plus" /> Nueva ubicación</button>}</div></header>{notice && <div className={`notice ${notice.kind}`} role="status"><span>{notice.kind === "success" ? "Listo" : "No se pudo completar"}</span>{notice.text}<button aria-label="Cerrar mensaje" onClick={() => setNotice(null)}><Icon name="close" /></button></div>}<div className="permission-note">Estás operando como <strong>{roles[role]}</strong>. {permissions.manage ? "Podés crear, editar y asignar ubicaciones." : "Sólo podés consultar el mapa de ubicaciones y las asignaciones."}</div><section className="location-selector"><label className="field"><span>Depósito</span><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} disabled={loading && !warehouses.length}><option value="">Seleccioná un depósito</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{warehouse && <span><Icon name="warehouse" /> Configuración activa: <strong>{warehouse.name}</strong></span>}</section><section className="catalog-grid location-grid"><div className="list-panel"><div className="list-meta"><strong>{locations.length} {locations.length === 1 ? "ubicación" : "ubicaciones"}</strong><span>Ordenadas por recorrido de picking</span></div>{loading ? <ListSkeleton label="Cargando ubicaciones…" /> : loadError ? <div className="state error-state"><strong>No pudimos cargar las ubicaciones</strong><span>{loadError}</span><button className="button secondary" onClick={() => warehouseId ? void loadLocations(warehouseId) : void loadWarehouses()}>Reintentar</button></div> : locations.length === 0 ? <div className="state"><Icon name="pin" /><strong>Este depósito no tiene ubicaciones</strong><span>{permissions.manage ? "Creá la primera ubicación para comenzar a asignar productos." : "No hay ubicaciones disponibles para consultar."}</span></div> : <ul className="product-list">{locations.map((location) => <li key={location.id}><button className={`product-row location-row ${selected?.id === location.id ? "selected" : ""}`} onClick={() => setSelectedId(location.id)}><span className="thumbnail"><Icon name="pin" /></span><span className="product-main"><strong>{location.code}</strong><span>Pasillo {location.aisle} · Rack {location.rack} · Nivel {location.level}</span><span className="location-contents">{location.products.length ? location.products.map((p) => p.name).join(", ") : "Vacía"}</span></span><span className="location-order">#{location.sortOrder}</span><span className={`status ${location.isActive ? "active" : "inactive"}`}>{location.isActive ? "Activa" : "Inactiva"}</span></button></li>)}</ul>}</div><aside className="detail-panel" aria-live="polite">{selected ? <><div className="detail-heading"><span className="price-mark"><Icon name="pin" /></span><div><span className={`status ${selected.isActive ? "active" : "inactive"}`}>{selected.isActive ? "Activa" : "Inactiva"}</span><h2>{selected.code}</h2><p>{warehouse?.name ?? "Depósito"}</p></div></div><dl><div><dt>Pasillo</dt><dd>{selected.aisle}</dd></div><div><dt>Rack</dt><dd>{selected.rack}</dd></div><div><dt>Nivel</dt><dd>{selected.level}</dd></div><div><dt>Orden de recorrido</dt><dd>#{selected.sortOrder}</dd></div><div><dt>Productos en esta ubicación</dt><dd>{selected.products.length ? <ul className="location-contents-list">{selected.products.map((product) => <li key={product.id}>{product.name}</li>)}</ul> : "Ninguno"}</dd></div><div><dt>Actualizada</dt><dd>{dates.format(new Date(selected.updatedAt))}</dd></div></dl>{permissions.manage && <div className="detail-actions"><button className="button secondary" onClick={() => openDialog("edit")}><Icon name="edit" /> Editar</button></div>}</> : <div className="state detail-empty"><Icon name="pin" /><strong>Seleccioná una ubicación</strong><span>Vas a ver sus coordenadas y configuración.</span></div>}</aside></section><section className="assignment-panel"><header><div><p className="eyebrow">PRODUCTOS / ASIGNACIÓN</p><h2>Asignar producto a ubicación</h2><p>La asignación aplica sólo al depósito seleccionado.</p></div></header><form className="filters location-product-search" onSubmit={searchProducts}><label className="search"><Icon name="search" /><span className="sr-only">Buscar producto</span><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar producto por nombre" /></label><button className="button secondary" disabled={productLoading}>{productLoading ? "Buscando…" : "Buscar"}</button></form>{products.length > 0 && <ul className="product-list location-product-results">{products.map((product) => <li key={product.id}><button className={`product-row ${selectedProduct?.id === product.id ? "selected" : ""}`} onClick={() => setSelectedProduct(product)}><span className="thumbnail"><Icon name="warehouse" /></span><span className="product-main"><strong>{product.name}</strong><span>Producto #{product.id}</span></span></button></li>)}</ul>}{selectedProduct && <div className="assignment-detail"><div><strong>{selectedProduct.name}</strong><span>{assignment ? <>Ubicación actual: <b>{assignment.location.code}</b> · Pasillo {assignment.location.aisle}, rack {assignment.location.rack}, nivel {assignment.location.level}</> : "Sin ubicación asignada"}</span></div>{permissions.manage && <div className="assignment-actions"><label className="field"><span>Ubicación</span><select value={assignmentLocationId} onChange={(event) => setAssignmentLocationId(event.target.value)}><option value="">Seleccioná una ubicación</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.code} · P{location.aisle} R{location.rack} N{location.level}</option>)}</select></label><button className="button primary" onClick={() => void assign()} disabled={!assignmentLocationId || pending}>Asignar</button>{assignment && <button className="danger-text" onClick={() => void clear()} disabled={pending}>Quitar asignación</button>}</div>}</div>}</section>{dialog && <LocationDialog mode={dialog} form={form} errors={errors} pending={pending} errorRef={errorRef} onClose={() => setDialog(null)} onChange={(key, value) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); }} onSubmit={saveLocation} />}</section>;
}

function LocationDialog({ mode, form, errors, pending, errorRef, onClose, onChange, onSubmit }: { mode: "new" | "edit"; form: LocationForm; errors: Partial<Record<keyof LocationForm, string>>; pending: boolean; errorRef: React.RefObject<HTMLDivElement | null>; onClose: () => void; onChange: <K extends keyof LocationForm>(key: K, value: LocationForm[K]) => void; onSubmit: (event: FormEvent) => void }) {
  const messages = Object.values(errors).filter(Boolean);
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="location-form-title"><header><div><p className="eyebrow">UBICACIONES / {mode === "new" ? "ALTA" : "EDICIÓN"}</p><h2 id="location-form-title">{mode === "new" ? "Nueva ubicación" : "Editar ubicación"}</h2></div><button className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><Icon name="close" /></button></header><form onSubmit={onSubmit} noValidate>{messages.length > 0 && <div className="form-summary" ref={errorRef} tabIndex={-1} role="alert"><strong>Revisá los datos de la ubicación</strong>{messages.map((message) => <span key={message}>{message}</span>)}</div>}<div className="form-grid"><Field label="Código" value={form.code} error={errors.code} autoFocus onChange={(value) => onChange("code", value)} /><Field label="Pasillo" value={form.aisle} error={errors.aisle} onChange={(value) => onChange("aisle", value)} /><Field label="Rack" value={form.rack} error={errors.rack} onChange={(value) => onChange("rack", value)} /><Field label="Nivel" value={form.level} error={errors.level} onChange={(value) => onChange("level", value)} /><label className="field"><span>Orden de recorrido</span><input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => onChange("sortOrder", Number(event.target.value))} aria-invalid={Boolean(errors.sortOrder)} />{errors.sortOrder && <small role="alert">{errors.sortOrder}</small>}</label></div><label className="toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => onChange("isActive", event.target.checked)} /><span aria-hidden="true" /><strong>Ubicación activa</strong></label><footer><button type="button" className="button ghost" onClick={onClose} disabled={pending}>Cancelar</button><button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar ubicación"}</button></footer></form></section></div>;
}

function Field({ label, value, error, autoFocus, onChange }: { label: string; value: string; error?: string; autoFocus?: boolean; onChange: (value: string) => void }) { return <label className="field"><span>{label} <b aria-hidden="true">*</b></span><input value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} autoFocus={autoFocus} />{error && <small role="alert">{error}</small>}</label>; }
