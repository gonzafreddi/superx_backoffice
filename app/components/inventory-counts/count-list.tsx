"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/app/lib/auth-api";
import { can } from "@/app/lib/permissions";
import { inventoryCountApi } from "@/app/lib/inventory-count-api";
import { inventoryApi } from "@/app/lib/inventory-api";
import { locationApi } from "@/app/lib/location-api";
import type { InventoryCount, CountStatus } from "@/app/lib/inventory-count-contract";
import type { Warehouse } from "@/app/lib/inventory-contract";
import { Notice } from "@/app/components/ui/notice";
import { TablePagination } from "@/app/components/ui/table-pagination";
import { CountBadge } from "./count-ui";
import "./counts.css";

export function CountList() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryCount[]>([]), [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState(""), [status, setStatus] = useState<CountStatus | "">(""), [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [allowed, setAllowed] = useState(false), [writable, setWritable] = useState(false);
  const [creating, setCreating] = useState(false), [pending, setPending] = useState(false), [newWarehouse, setNewWarehouse] = useState(""), [locationId, setLocationId] = useState(""), [note, setNote] = useState("");
  const [locations, setLocations] = useState<Array<{ id: string; code: string }>>([]), [locationsLoading, setLocationsLoading] = useState(false), [locationsError, setLocationsError] = useState("");
  const load = useCallback(async () => {
    if (!can(getStoredUser()?.role, "inventoryCounts.read")) { setLoading(false); return; }
    setLoading(true); setError("");
    try { const counts = await inventoryCountApi.list({ warehouseId, status: status || undefined }); setItems(counts); }
    catch (error) { setError(error instanceof Error ? error.message : "No se pudo cargar."); }
    finally { setLoading(false); }
  }, [warehouseId, status]);
  useEffect(() => {
    const role = getStoredUser()?.role;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(can(role, "inventoryCounts.read")); setWritable(can(role, "inventoryCounts.write"));
    // Warehouse configuration endpoints may reject accountant/warehouse; count access must still work.
    if (can(role, "inventoryCounts.read")) void inventoryApi.listWarehouses().then(setWarehouses).catch(() => undefined);
  }, []);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => {
    let active = true;
    if (!newWarehouse || !creating) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocationsLoading(true); setLocationsError("");
    void locationApi.listLocations(newWarehouse).then(rows => { if (active) setLocations(rows.filter(row => row.isActive)); }).catch(error => { if (active) { setLocations([]); setLocationsError(error instanceof Error ? error.message : "No se pudieron cargar las ubicaciones."); } }).finally(() => { if (active) setLocationsLoading(false); });
    return () => { active = false; };
  }, [newWarehouse, creating]);
  if (!allowed && !loading) return <Notice kind="error">No tenés permiso para consultar conteos.</Notice>;
  return <section className="workspace count-workspace"><header className="topbar"><div><p className="eyebrow">DEPÓSITO / INVENTARIO</p><h1>Conteos físicos</h1><p className="subtitle">Guardá el conteo y aplicá las diferencias de stock.</p></div><div className="top-actions"><Link href="/inventario" className="button secondary">Inventario</Link>{writable && <button className="button primary" onClick={() => setCreating(value => !value)}>Nuevo conteo</button>}</div></header>
    {error && <Notice kind="error" role="alert">{error}<button className="button secondary" onClick={() => void load()}>Reintentar</button></Notice>}
    {creating && <form className="panel count-form" onSubmit={async event => { event.preventDefault(); setPending(true); setError(""); try { const count = await inventoryCountApi.create({ warehouseId: newWarehouse, ...(locationId ? { locationId } : {}), ...(note.trim() ? { note: note.trim() } : {}) }); router.push(`/inventario/conteos/${count.id}`); } catch (error) { setError(error instanceof Error ? error.message : "No se pudo crear."); } finally { setPending(false); } }}><h2>Nuevo conteo</h2>
      <label className="field"><span>Depósito</span>{warehouses.length ? <select required value={newWarehouse} onChange={event => { setNewWarehouse(event.target.value); setLocationId(""); setLocations([]); }}><option value="">Elegí un depósito</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select> : <input required inputMode="numeric" placeholder="ID del depósito" value={newWarehouse} onChange={event => { setNewWarehouse(event.target.value); setLocationId(""); }} />}</label>
      <label className="field"><span>Ubicación opcional</span><select value={locationId} disabled={!newWarehouse || locationsLoading} onChange={event => setLocationId(event.target.value)}><option value="">Todo el depósito</option>{locations.map(location => <option key={location.id} value={location.id}>{location.code}</option>)}</select></label>{locationsLoading && <p role="status">Cargando ubicaciones…</p>}{locationsError && <Notice kind="info">No se pudieron consultar las ubicaciones. Podés contar todo el depósito.</Notice>}
      <label className="field"><span>Nota</span><textarea value={note} onChange={event => setNote(event.target.value)} /></label><div className="top-actions"><button type="button" className="button secondary" disabled={pending} onClick={() => setCreating(false)}>Volver</button><button className="button primary" disabled={pending || !newWarehouse || locationsLoading}>{pending ? "Creando…" : "Crear borrador"}</button></div></form>}
    <div className="count-filters"><label className="field"><span>Depósito</span><input placeholder="ID del depósito" value={warehouseId} onChange={event => { setWarehouseId(event.target.value); setPage(1); }} list="count-warehouses" /><datalist id="count-warehouses">{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</datalist></label><label className="field"><span>Estado</span><select value={status} onChange={event => { setStatus(event.target.value as CountStatus | ""); setPage(1); }}><option value="">Todos</option><option value="DRAFT">Borrador</option><option value="APPLIED">Aplicado</option><option value="CANCELLED">Cancelado</option></select></label></div>
    {loading ? <p role="status">Cargando conteos…</p> : !error && <><div className="count-table"><table><thead><tr><th>Conteo</th><th>Depósito / ubicación</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{items.slice((page - 1) * 20, page * 20).map(count => <tr key={count.id}><td><Link href={`/inventario/conteos/${count.id}`}>{count.code}</Link></td><td>{warehouses.find(w => w.id === count.warehouseId)?.name ?? `Depósito #${count.warehouseId}`} {count.locationId && `· Ubicación #${count.locationId}`}</td><td>{new Date(count.createdAt).toLocaleString("es-AR")}</td><td><CountBadge status={count.status} /></td></tr>)}</tbody></table>{!items.length && <p className="state">No hay conteos con estos filtros.</p>}</div><TablePagination page={page} pageSize={20} total={items.length} label={`${items.length} conteos`} buttonClassName="button secondary" onPrev={() => setPage(value => value - 1)} onNext={() => setPage(value => value + 1)} /></>}
  </section>;
}
