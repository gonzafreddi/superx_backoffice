import type { PurchaseOrderStatus, ReceiptStatus } from "@/app/lib/purchase-order-contract";

export const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value);
export const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value)) : "—";
export const orderCode = (id: string) => `OC-${id.replace(/\D/g, "").padStart(6, "0").slice(-6) || id}`;
export function OrderStatusBadge({ status }: { status: PurchaseOrderStatus }) { const labels = { DRAFT: "Borrador", CONFIRMED: "Confirmada", CANCELLED: "Cancelada", CLOSED: "Cerrada" }; const tone = status === "CONFIRMED" ? "active" : status === "CANCELLED" ? "order-cancelled" : "inactive"; return <span className={`status ${tone}`}>{labels[status]}</span>; }
export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) { const labels = { NOT_RECEIVED: "Sin recibir", PARTIALLY_RECEIVED: "Recibida parcialmente", RECEIVED: "Recibida" }; return <span className={`status ${status === "RECEIVED" ? "active" : "inactive"}`}>{labels[status]}</span>; }
