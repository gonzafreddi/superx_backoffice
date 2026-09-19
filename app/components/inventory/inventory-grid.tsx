import type { InventoryItem, Warehouse } from "@/app/lib/inventory-contract";
import { getInventoryStatus } from "@/app/lib/inventory-rules";
import { InventoryIcon, StockStatusBadge } from "./inventory-ui";

const dates = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
export function InventoryProductCard({ item, warehouseName, selected, onSelect }: { item: InventoryItem; warehouseName: string; selected: boolean; onSelect: () => void }) {
  const status = getInventoryStatus(item);
  return <button className={`inventory-product-card ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected}><span className="inventory-product-image"><InventoryIcon name="boxes" /></span>{selected && <span className="inventory-selected-check"><InventoryIcon name="check" /><span className="sr-only">Seleccionado</span></span>}<span className="inventory-card-heading"><strong>{item.productName}</strong><small>{item.sku}</small></span><StockStatusBadge status={status} /><span className="inventory-stock-pair"><span><b>{item.onHand}</b><small>disponibles</small></span><span><b>{item.minimum}</b><small>mínimo</small></span></span><span className="inventory-card-meta"><span><InventoryIcon name="pin" />{warehouseName}</span><span><InventoryIcon name="clock" />Actualizado {dates.format(new Date(item.updatedAt))}</span></span></button>;
}

export function InventoryGrid({ items, warehouses, selectedId, onSelect }: { items: InventoryItem[]; warehouses: Warehouse[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const warehouseName = (id: string) => warehouses.find((warehouse) => warehouse.id === id)?.name ?? "Depósito no disponible";
  return <div className="inventory-product-grid">{items.map((item) => <InventoryProductCard key={item.id} item={item} warehouseName={warehouseName(item.warehouseId)} selected={item.id === selectedId} onSelect={() => onSelect(item.id)} />)}</div>;
}
