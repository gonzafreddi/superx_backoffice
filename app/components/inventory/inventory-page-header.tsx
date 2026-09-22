import { InventoryIcon } from "./inventory-ui";
import { roles } from "@/app/components/location-ui";
import type { UserRole } from "@/app/lib/product-contract";

export function InventoryPageHeader({ role, canAdjust, disabled, onAdjust }: { role: UserRole; canAdjust: boolean; disabled: boolean; onAdjust: () => void }) {
  return <header className="topbar inventory-page-header"><div><p className="eyebrow">OPERACIONES / INVENTARIO</p><h1>Inventario de productos</h1><p className="subtitle">Consultá stock, mínimos y movimientos por producto.</p></div><div className="top-actions"><span className="status active">{roles[role]}</span>{canAdjust && <button className="button primary" onClick={onAdjust} disabled={disabled}><InventoryIcon name="adjust" /> Ajustar stock</button>}</div></header>;
}
