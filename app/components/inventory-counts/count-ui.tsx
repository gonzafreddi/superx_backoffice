import { StatusBadge } from "@/app/components/ui/status-badge";
import type { CountStatus } from "@/app/lib/inventory-count-contract";
export function CountBadge({ status }: { status: CountStatus }) { return <StatusBadge tone={status === "APPLIED" ? "success" : status === "DRAFT" ? "warning" : "neutral"} label={{ DRAFT: "Borrador", APPLIED: "Aplicado", CANCELLED: "Cancelado" }[status]} />; }
