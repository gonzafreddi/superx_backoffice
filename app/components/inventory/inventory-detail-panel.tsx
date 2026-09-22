import { useState } from "react";
import type { InventoryItem, InventoryMovement, Warehouse } from "@/app/lib/inventory-contract";
import { getInventoryStatus } from "@/app/lib/inventory-rules";
import { InventoryIcon, StockStatusBadge } from "./inventory-ui";

const dates = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const typeLabel: Record<InventoryMovement["type"], string> = { adjustment: "Ajuste", receipt: "Ingreso", sale: "Venta", transfer: "Transferencia" };
export function InventoryStockByWarehouse({ items, warehouses }: { items: InventoryItem[]; warehouses: Warehouse[] }) { return <section className="inventory-detail-section"><h3>Stock por depósito</h3><ul className="inventory-warehouse-stock">{items.map((item) => <li key={item.id}><span>{warehouses.find((warehouse) => warehouse.id === item.warehouseId)?.name ?? "Depósito no disponible"}</span><strong>{item.onHand} u.</strong></li>)}</ul></section>; }
export function InventoryRecentMovements({ movements }: { movements: InventoryMovement[] }) { return <section className="inventory-detail-section inventory-movements"><div className="inventory-section-heading"><h3>Movimientos recientes</h3><button className="link-button" type="button">Ver todos</button></div>{movements.length ? movements.slice(0, 4).map((movement) => <article key={movement.id} className="inventory-movement"><strong className={movement.quantity > 0 ? "positive" : "negative"}>{movement.quantity > 0 ? "+" : ""}{movement.quantity} u.</strong><div><span>{typeLabel[movement.type]} · {movement.reason}</span><time>{dates.format(new Date(movement.occurredAt))} · {movement.createdBy}</time></div></article>) : <p className="muted">No hay movimientos para este producto.</p>}</section>; }
function ReorderThreshold({ selected, canEdit, onSave }: { selected: InventoryItem; canEdit: boolean; onSave: (threshold: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(selected.minimum));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!editing) return <small>Mínimo operativo: {selected.minimum} unidades{canEdit && <button className="link-button" type="button" onClick={() => { setValue(String(selected.minimum)); setError(""); setEditing(true); }}>Editar</button>}</small>;
  const submit = async () => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) { setError("Ingresá un entero mayor o igual a cero."); return; }
    setPending(true); setError("");
    try { await onSave(parsed); setEditing(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el umbral."); } finally { setPending(false); }
  };
  return <small className="inventory-threshold-edit"><label>Mínimo operativo<input type="number" min={0} step={1} value={value} onChange={(event) => setValue(event.target.value)} disabled={pending} /></label><button className="link-button" type="button" onClick={() => void submit()} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button><button className="link-button" type="button" onClick={() => setEditing(false)} disabled={pending}>Cancelar</button>{error && <span className="field-error">{error}</span>}</small>;
}
export function InventoryDetailPanel({ selected, allItems, warehouses, canAdjust, onAdjust, onClose, onUpdateThreshold }: { selected: InventoryItem | null; allItems: InventoryItem[]; warehouses: Warehouse[]; canAdjust: boolean; onAdjust: () => void; onClose: () => void; onUpdateThreshold: (itemId: string, threshold: number) => Promise<void> }) {
  if (!selected) return <aside className="inventory-detail-panel"><div className="state detail-empty"><InventoryIcon name="boxes" /><strong>Seleccioná una posición</strong><span>Vas a ver el detalle y sus movimientos.</span></div></aside>;
  const productItems = allItems.filter((item) => item.productId === selected.productId);
  const movements = productItems.flatMap((item) => item.movements).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return <aside className="inventory-detail-panel" aria-live="polite"><button className="inventory-detail-close" aria-label="Cerrar detalle" onClick={onClose}><InventoryIcon name="close" /></button><div className="inventory-detail-hero"><span className="inventory-detail-image"><InventoryIcon name="boxes" /></span><StockStatusBadge status={getInventoryStatus(selected)} /><h2>{selected.productName}</h2><p>SKU: {selected.sku}</p><div className="inventory-detail-tags"><span>{warehouses.find((warehouse) => warehouse.id === selected.warehouseId)?.name ?? "Depósito no disponible"}</span></div></div><div className="inventory-stock-highlight"><span>Stock disponible</span><strong>{selected.onHand}</strong><ReorderThreshold selected={selected} canEdit={canAdjust} onSave={(threshold) => onUpdateThreshold(selected.id, threshold)} /></div>{canAdjust && <button className="button primary full-width" onClick={onAdjust}><InventoryIcon name="adjust" /> Ajustar stock</button>}<div className="inventory-detail-actions"><button className="button secondary" type="button"><InventoryIcon name="move" /> Mover stock</button><button className="button secondary" type="button"><InventoryIcon name="history" /> Ver historial</button></div><InventoryStockByWarehouse items={productItems} warehouses={warehouses} /><InventoryRecentMovements movements={movements} /></aside>;
}
