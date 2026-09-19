import type { InventoryItem } from "@/app/lib/inventory-contract";
import { getInventoryStatus } from "@/app/lib/inventory-rules";
import { InventoryIcon } from "./inventory-ui";

export function InventoryStatsCards({ items }: { items: InventoryItem[] }) {
  const products = new Set(items.map((item) => item.productId)).size;
  const units = items.reduce((total, item) => total + item.onHand, 0);
  const low = items.filter((item) => getInventoryStatus(item) === "low").length;
  const out = items.filter((item) => getInventoryStatus(item) === "out").length;
  const cards = [["boxes", products, "productos", "en catálogo"], ["layers", units.toLocaleString("es-AR"), "unidades", "en stock total"], ["alert", low, "con stock bajo", "posiciones bajo mínimo"], ["close", out, "sin stock", "posiciones sin unidades"]] as const;
  return <section className="inventory-kpis" aria-label="Resumen de inventario">{cards.map(([icon, value, label, detail], index) => <article className={`inventory-metric-card inventory-metric-${index}`} key={label}><span className="inventory-metric-icon"><InventoryIcon name={icon} /></span><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></article>)}</section>;
}
