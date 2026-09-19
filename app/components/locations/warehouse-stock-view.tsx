"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ListSkeleton } from "@/app/components/list-skeleton";
import { LocationIcon } from "@/app/components/location-ui";
import { locationApi } from "@/app/lib/location-api";
import type { Paginated, WarehouseStockItem } from "@/app/lib/location-contract";

const emptyStock: Paginated<WarehouseStockItem> = { items: [], total: 0, page: 1, pageSize: 20 };

export function WarehouseStockView({ warehouseId }: { warehouseId: string }) {
  const [stock, setStock] = useState(emptyStock), [query, setQuery] = useState(""), [value, setValue] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async (page = 1) => { setLoading(true); setError(""); try { if (!navigator.onLine) throw new Error("Sin conexión a internet. Verificá tu conexión y reintentá."); setStock(await locationApi.getWarehouseStock(warehouseId, query, page)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el stock del depósito."); } finally { setLoading(false); } }, [query, warehouseId]);
  useEffect(() => { const timer = setTimeout(() => setQuery(value), 350); return () => clearTimeout(timer); }, [value]);
  useEffect(() => { void load(); }, [load]);

  return <section className="location-table-panel warehouse-stock-view">
    <header><div><p className="eyebrow">STOCK DEL DEPÓSITO</p><h2>Productos y ubicaciones</h2><span className="location-muted">Buscá un producto para ver todas las ubicaciones donde hay stock.</span></div><label className="search"><LocationIcon name="search" /><span className="sr-only">Buscar producto</span><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Nombre, slug o código de barras" /></label></header>
    {loading ? <ListSkeleton label="Cargando stock del depósito…" /> : error ? <div className="state error-state"><strong>No pudimos cargar el stock del depósito</strong><span>{error}</span><button className="button secondary" onClick={() => void load(stock.page)}>Reintentar</button></div> : stock.items.length === 0 ? <div className="state"><strong>{query.trim() ? `No encontramos productos que coincidan con «${query.trim()}».` : "Este depósito no tiene stock cargado todavía."}</strong></div> : <><div className="location-table-wrap"><table className="location-stock-table"><thead><tr><th>Producto</th><th>Ubicación</th><th>Total</th><th>Reservado</th><th>Disponible</th></tr></thead><tbody>{stock.items.map((item) => <tr key={`${item.product.id}-${item.location.id}`}><td data-label="Producto"><strong>{item.product.name}</strong><span className="location-muted mono">{item.product.slug ?? "—"}</span></td><td data-label="Ubicación"><Link className="location-stock-link mono" href={`/ubicaciones/${encodeURIComponent(warehouseId)}/${encodeURIComponent(item.location.id)}`}>{item.location.code}</Link><span className="location-muted">Pasillo {item.location.aisle} · Rack {item.location.rack} · Nivel {item.location.level}</span></td><td data-label="Total">{item.quantity}</td><td data-label="Reservado">{item.reservedQuantity}</td><td data-label="Disponible"><strong>{item.availableQuantity}</strong></td></tr>)}</tbody></table></div><footer className="location-pagination"><span>{stock.total} {stock.total === 1 ? "ubicación con stock" : "ubicaciones con stock"}</span><div><button className="button ghost" disabled={stock.page <= 1} onClick={() => void load(stock.page - 1)}>Anterior</button><button className="button ghost" disabled={stock.page * stock.pageSize >= stock.total} onClick={() => void load(stock.page + 1)}>Siguiente</button></div></footer></>}</section>;
}
