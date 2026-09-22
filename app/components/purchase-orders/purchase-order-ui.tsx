import type { PurchaseOrderStatus, ReceiptStatus } from "@/app/lib/purchase-order-contract";
import { StatusBadge } from "@/app/components/ui/status-badge";

export const money = (value: number, currency = "ARS") => new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
export const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value)) : "—";
export const orderCode = (id: string) => `OC-${id.replace(/\D/g, "").padStart(6, "0").slice(-6) || id}`;
export function OrderStatusBadge({ status }: { status: PurchaseOrderStatus }) { const labels = { DRAFT: "Borrador", CONFIRMED: "Confirmada", CANCELLED: "Cancelada", CLOSED: "Cerrada" }; return <StatusBadge tone={status === "CONFIRMED" ? "success" : status === "CANCELLED" ? "danger" : "neutral"} label={labels[status]} />; }
export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) { const labels = { NOT_RECEIVED: "Sin recibir", PARTIALLY_RECEIVED: "Recibida parcialmente", RECEIVED: "Recibida" }; return <StatusBadge tone={status === "RECEIVED" ? "success" : "neutral"} label={labels[status]} />; }
