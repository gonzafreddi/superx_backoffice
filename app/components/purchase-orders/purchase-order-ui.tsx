import type { PurchaseOrderStatus, ReceiptStatus } from "@/app/lib/purchase-order-contract";
import { StatusBadge } from "@/app/components/ui/status-badge";

export const money = (value: number, currency = "ARS") => new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
// Calendar dates (dueDate "2026-10-23", expectedDate stored as UTC midnight) must be formatted in UTC,
// otherwise Argentina (UTC-3) shows the previous day. Real timestamps keep the local zone.
const isCalendarDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) || /T00:00:00(\.000)?Z$/.test(value);
export const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", ...(isCalendarDate(value) ? { timeZone: "UTC" } : {}) }).format(new Date(value)) : "—";
export const orderCode = (id: string) => `OC-${id.replace(/\D/g, "").padStart(6, "0").slice(-6) || id}`;
export function OrderStatusBadge({ status }: { status: PurchaseOrderStatus }) { const labels = { DRAFT: "Borrador", CONFIRMED: "Confirmada", CANCELLED: "Cancelada", CLOSED: "Cerrada" }; return <StatusBadge tone={status === "CONFIRMED" ? "success" : status === "CANCELLED" ? "danger" : "neutral"} label={labels[status]} />; }
export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) { const labels = { NOT_RECEIVED: "Sin recibir", PARTIALLY_RECEIVED: "Recibida parcialmente", RECEIVED: "Recibida" }; return <StatusBadge tone={status === "RECEIVED" ? "success" : "neutral"} label={labels[status]} />; }
