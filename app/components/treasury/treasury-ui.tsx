import type { TreasuryAccountType, TreasuryMovement } from "@/app/lib/treasury-contract";
import { accountStatusLabel, accountTypeLabel, movementColumns, movementTypeLabel } from "@/app/lib/treasury-rules";

export const money = (value: string | number, currency = "ARS") => new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(Number(value));
export const date = (value: string) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value)) : "—";
export function AccountTypeBadge({ type }: { type: TreasuryAccountType }) { return <span className="status inactive">{accountTypeLabel(type)}</span>; }
export function AccountStatusBadge({ active }: { active: boolean }) { return <span className={`status ${active ? "active" : "inactive"}`}>{accountStatusLabel(active)}</span>; }
export function MovementTypeBadge({ movement }: { movement: TreasuryMovement }) { const columns = movementColumns(movement); return <span className={`status ${columns.sign === "+" ? "active" : columns.sign === "−" ? "order-cancelled" : "inactive"}`}>{movementTypeLabel(movement.type)}</span>; }
