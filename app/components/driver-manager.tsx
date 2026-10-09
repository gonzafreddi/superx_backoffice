"use client";
import { can } from "@/app/lib/permissions";

import Link from "next/link";
import { routeSheetHref } from "@/app/lib/route-sheet-rules";
import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "@/app/lib/auth-api";

import { createDriver, listDriverCandidates, listDrivers, updateDriver } from "@/app/lib/driver-admin-api";
import type { Driver, DriverCandidate } from "@/app/lib/driver-admin-contract";

export function DriverManager() {
  const [items, setItems] = useState<Driver[]>([]), [candidates, setCandidates] = useState<DriverCandidate[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [pending, setPending] = useState(false);
  const [allowed, setAllowed] = useState(false), [selected, setSelected] = useState<Driver | null>(null), [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [userId, setUserId] = useState(""), [name, setName] = useState(""), [phone, setPhone] = useState(""), [vehicle, setVehicle] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { const [drivers, users] = await Promise.all([listDrivers(), can(getStoredUser()?.role, "users.manage") ? listDriverCandidates() : Promise.resolve([])]); setItems(drivers); setCandidates(users); setSelected(current => drivers.find(d => d.id === current?.id) ?? null); }
    catch (e) { setError(e instanceof Error ? e.message : "No pudimos cargar los repartidores."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { const access = can(getStoredUser()?.role, "drivers.read"); setAllowed(access); if (access) void load(); else setLoading(false); }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const open = (mode: "new" | "edit") => { setError(""); setUserId(""); setName(mode === "edit" ? selected?.name ?? "" : ""); setPhone(mode === "edit" ? selected?.phone ?? "" : ""); setVehicle(mode === "edit" ? selected?.vehicleType ?? "" : ""); setModal(mode); };
  const save = async (action: () => Promise<Driver>) => { setPending(true); setError(""); try { const result = await action(); setModal(null); await load(); setSelected(result); } catch (e) { setError(e instanceof Error ? e.message : "No pudimos guardar el repartidor."); } finally { setPending(false); } };
  if (loading) return <section className="workspace"><p role="status">Cargando repartidores…</p></section>;
  if (!allowed) return <section className="workspace"><p role="alert">No tenés permiso para gestionar repartidores.</p></section>;
  return <section className="workspace"><header className="topbar"><div><p className="eyebrow">OPERACIÓN</p><h1>Repartidores</h1><p className="subtitle">Perfiles de reparto vinculados a usuarios existentes.</p></div>{can(getStoredUser()?.role, "drivers.write") && <button className="button primary" onClick={() => open("new")}>Nuevo repartidor</button>}</header>
    {error && <div className="notice error" role="alert">{error} <button className="button secondary" disabled={pending} onClick={() => void load()}>Reintentar</button></div>}
    <div className="catalog-grid"><section className="list-panel"><table className="erp-table"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Vehículo</th><th>Email</th><th>Estado</th><th>Entregas activas</th><th>Acciones</th></tr></thead><tbody>{items.map(d => <tr key={d.id}><td><button className="button ghost" onClick={() => setSelected(d)}>{d.name}</button></td><td>{d.phone}</td><td>{d.vehicleType ?? "—"}</td><td>{d.user?.email ?? "—"}</td><td>{d.active ? "Activo" : "Inactivo"}</td><td>{d.activeAssignments}</td><td><Link className="button secondary" href={routeSheetHref(d.id)}>Hoja de ruta</Link></td></tr>)}</tbody></table>{!items.length && <p>No hay repartidores.</p>}</section>
      <aside className="detail-panel">{selected ? <><h2>{selected.name}</h2><Link className="button secondary" href={routeSheetHref(selected.id)}>Hoja de ruta</Link><dl><dt>Teléfono</dt><dd>{selected.phone}</dd><dt>Vehículo</dt><dd>{selected.vehicleType ?? "—"}</dd><dt>Usuario</dt><dd>{selected.user?.email ?? "—"}</dd><dt>Estado del usuario</dt><dd>{selected.user?.isActive ? "Activo" : "Inactivo"}</dd><dt>Entregas activas</dt><dd>{selected.activeAssignments}</dd></dl>{can(getStoredUser()?.role, "drivers.write") && <div className="detail-actions"><button className="button secondary" disabled={pending} onClick={() => open("edit")}>Editar</button><button className="button secondary" disabled={pending} onClick={() => void save(() => updateDriver(selected.id, { active: !selected.active }))}>{selected.active ? "Desactivar" : "Activar"}</button></div>}</> : <p>Seleccioná un repartidor para ver su perfil.</p>}</aside></div>
    {modal && <div className="modal-backdrop"><form className="modal" role="dialog" aria-modal="true" aria-labelledby="driver-modal-title" onSubmit={e => { e.preventDefault(); void save(() => modal === "new" ? createDriver({ userId: Number(userId), phone: phone.trim() || undefined, vehicleType: vehicle.trim() || undefined }) : updateDriver(selected!.id, { name: name.trim(), phone: phone.trim(), vehicleType: vehicle.trim() })); }}><header><h2 id="driver-modal-title">{modal === "new" ? "Nuevo repartidor" : "Editar repartidor"}</h2></header>
      {modal === "new" ? candidates.length ? <label className="field">Usuario repartidor<select autoFocus required value={userId} onChange={e => setUserId(e.target.value)}><option value="">Elegí un usuario</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.name ?? c.email} · {c.email}</option>)}</select></label> : <p>Creá primero un usuario con rol Repartidor. <Link href="/usuarios">Ir a Usuarios</Link></p> : <label className="field">Nombre<input autoFocus required maxLength={120} value={name} onChange={e => setName(e.target.value)}/></label>}
      <label className="field">Teléfono {modal === "new" && "(opcional, se usa el del usuario)"}<input required={modal === "edit"} maxLength={40} value={phone} onChange={e => setPhone(e.target.value)}/></label><label className="field">Vehículo<input maxLength={40} value={vehicle} onChange={e => setVehicle(e.target.value)}/></label>{error && <p role="alert">{error}</p>}<footer><button type="button" className="button secondary" disabled={pending} onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={pending || (modal === "new" && !userId)}>{pending ? "Guardando…" : "Guardar"}</button></footer></form></div>}
  </section>;
}
