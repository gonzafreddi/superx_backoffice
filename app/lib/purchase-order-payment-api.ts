import { authFetch } from "@/app/lib/http";
import type { PaymentMethod } from "./payment-contract";

export type PurchaseOrderPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
export type PurchaseOrderPaymentSummary = {
  purchaseOrderId: string;
  currency: string;
  orderStatus: string;
  dueDate: string | null;
  orderTotal: string;
  receivedTotal: string;
  invoicedTotal: string;
  payableTotal: string;
  paidAmount: string;
  advanceAmount: string;
  balance: string;
  paymentStatus: PurchaseOrderPaymentStatus;
  invoices: Array<{ id: string; voucherType: string; pointOfSale: string; number: string; dueDate: string; status: string; total: string; paidAmount: string; balance: string; paymentStatus: string }>;
  payments: Array<{ id: string; paidAt: string; amount: string; appliedToOrder: string; method: PaymentMethod; reference: string | null; status: "CONFIRMED" | "REVERSED"; treasuryAccount: { id: string; name: string } }>;
};
export type PayPurchaseOrderInput = { treasuryAccountId: string; method: PaymentMethod; amount: string; paidAt?: string; reference?: string; notes?: string; idempotencyKey: string };

const baseUrl = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL?.replace(/\/$/, "");

async function fetchJson(path: string, init: RequestInit = {}) {
  const base = baseUrl();
  if (!base) throw new Error("Los pagos requieren conexión con la API.");
  const response = await authFetch(`${base}${path}`, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const raw = payload && typeof payload === "object" ? (payload as { message?: unknown }).message : undefined;
    const message = typeof raw === "string" ? raw : Array.isArray(raw) ? "Revisá los datos del pago." : "No pudimos registrar el pago.";
    throw Object.assign(new Error(response.status === 401 || response.status === 403 ? "No tenés permiso para registrar pagos." : message), { status: response.status });
  }
  return payload;
}

export const purchaseOrderPaymentApi = {
  async summary(orderId: string): Promise<PurchaseOrderPaymentSummary | null> {
    if (!baseUrl()) return null;
    return (await fetchJson(`/purchase-orders/${encodeURIComponent(orderId)}/payments`)) as PurchaseOrderPaymentSummary;
  },
  async pay(orderId: string, input: PayPurchaseOrderInput): Promise<PurchaseOrderPaymentSummary> {
    const result = (await fetchJson(`/purchase-orders/${encodeURIComponent(orderId)}/payments`, { method: "POST", body: JSON.stringify({ ...input, treasuryAccountId: Number(input.treasuryAccountId) }) })) as { summary: PurchaseOrderPaymentSummary };
    return result.summary;
  },
};
