"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListSkeleton } from "@/app/components/list-skeleton";
import { LocationIcon, RolePicker, roles } from "@/app/components/location-ui";
import { locationApi } from "@/app/lib/location-api";
import type { LocationWarehouse } from "@/app/lib/location-contract";
import type { UserRole } from "@/app/lib/product-contract";
import { getLocationPermissions } from "@/app/lib/location-rules";

export function WarehouseList() {
  const [warehouses, setWarehouses] = useState<LocationWarehouse[]>([]), [role, setRole] = useState<UserRole>("admin"), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const permissions = getLocationPermissions(role);
  const load = async () => { setLoading(true); setLoadError(""); try { if (!navigator.onLine) throw new Error("Sin conexión a internet. Verificá tu conexión y reintentá."); setWarehouses(await locationApi.listWarehouses()); } catch (error) { setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los depósitos."); } finally { setLoading(false); } };
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  return <section className="workspace" id="ubicaciones"><header className="topbar"><div><p className="eyebrow">OPERACIONES / UBICACIONES</p><h1>Depósitos</h1><p className="subtitle">Elegí un depósito para consultar sus racks, su recorrido de picking y los productos asignados.</p></div><div className="top-actions"><RolePicker role={role} onChange={setRole} /></div></header><div className="permission-note">Estás operando como <strong>{roles[role]}</strong>. {permissions.manage ? "Podés gestionar ubicaciones y asignar productos dentro de cada depósito." : "Sólo podés consultar depósitos, ubicaciones y asignaciones."}</div><section className="list-panel location-page-list">{loading ? <ListSkeleton label="Cargando depósitos…" /> : loadError ? <div className="state error-state"><strong>No pudimos cargar los depósitos</strong><span>{loadError}</span><button className="button secondary" onClick={() => void load()}>Reintentar</button></div> : warehouses.length === 0 ? <div className="state"><LocationIcon name="warehouse" /><strong>No hay depósitos disponibles</strong><span>Cuando haya depósitos configurados, aparecerán en este listado.</span></div> : <><div className="list-meta"><strong>{warehouses.length} {warehouses.length === 1 ? "depósito" : "depósitos"}</strong><span>Seleccioná uno para ver sus ubicaciones</span></div><ul className="product-list">{warehouses.map((warehouse) => <li key={warehouse.id}><Link className="product-row warehouse-row" href={`/ubicaciones/${encodeURIComponent(warehouse.id)}`}><span className="thumbnail"><LocationIcon name="warehouse" /></span><span className="product-main"><strong>{warehouse.name}</strong><span>Ver ubicaciones, racks y productos asignados</span></span><span className="row-open"><span className="sr-only">Abrir {warehouse.name}</span>›</span></Link></li>)}</ul></>}</section></section>;
}
