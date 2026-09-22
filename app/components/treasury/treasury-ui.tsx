import type { TreasuryAccountType, TreasuryMovement } from "@/app/lib/treasury-contract";
import { accountStatusLabel, accountTypeLabel, movementColumns, movementTypeLabel } from "@/app/lib/treasury-rules";
import { StatusBadge } from "@/app/components/ui/status-badge";

export const money = (value: string | number, currency = "ARS") => new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(Number(value));
export const date = (value: string) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value)) : "—";
export function AccountTypeBadge({ type }: { type: TreasuryAccountType }) { return <StatusBadge tone="neutral" label={accountTypeLabel(type)} />; }
export function AccountStatusBadge({ active }: { active: boolean }) { return <StatusBadge tone={active ? "success" : "neutral"} label={accountStatusLabel(active)} />; }
export function MovementTypeBadge({ movement }: { movement: TreasuryMovement }) { const columns = movementColumns(movement); return <StatusBadge tone={columns.sign === "+" ? "success" : columns.sign === "−" ? "danger" : "neutral"} label={movementTypeLabel(movement.type)} />; }
