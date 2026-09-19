import type { UserRole } from "@/app/lib/product-contract";
import { InventoryIcon } from "./inventory-ui";

const roles: Record<UserRole, string> = { viewer: "Consulta", operator: "Operador", admin: "Administración" };
export { roles };
export function InventoryPageHeader({ role, onRoleChange, canAdjust, disabled, onAdjust }: { role: UserRole; onRoleChange: (role: UserRole) => void; canAdjust: boolean; disabled: boolean; onAdjust: () => void }) {
  return <header className="topbar inventory-page-header"><div><p className="eyebrow">OPERACIONES / INVENTARIO</p><h1>Inventario de productos</h1><p className="subtitle">Consultá stock, mínimos y movimientos por producto.</p></div><div className="top-actions"><label className="role-picker">Rol activo<select value={role} onChange={(event) => onRoleChange(event.target.value as UserRole)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{canAdjust && <button className="button primary" onClick={onAdjust} disabled={disabled}><InventoryIcon name="adjust" /> Ajustar stock</button>}</div></header>;
}
