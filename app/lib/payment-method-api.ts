import { authFetch } from "./http";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MERCADO_PAGO";
export type PaymentMethodSetting = { method: PaymentMethod; enabled: boolean; updatedAt: string };
let fixture: PaymentMethodSetting[] = ["CASH", "BANK_TRANSFER", "MERCADO_PAGO"].map((method) => ({ method: method as PaymentMethod, enabled: method !== "MERCADO_PAGO", updatedAt: "2026-09-01T12:00:00.000Z" }));
const base = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL?.replace(/\/$/, "");
async function json(url: string, init: RequestInit = {}) { const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } }); const payload: unknown = await response.json().catch(() => undefined); if (!response.ok) throw new Error("No pudimos actualizar el medio de pago."); return payload; }
export const paymentMethodApi = {
  async list(): Promise<PaymentMethodSetting[]> { const root = base(); if (!root) return fixture.map((item) => ({ ...item })); return await json(`${root}/payment-methods`) as PaymentMethodSetting[]; },
  async setEnabled(method: PaymentMethod, enabled: boolean): Promise<PaymentMethodSetting> { const root = base(); if (!root) { const updated = { method, enabled, updatedAt: new Date().toISOString() }; fixture = fixture.map((item) => item.method === method ? updated : item); return updated; } return await json(`${root}/payment-methods/${method}`, { method: "PATCH", body: JSON.stringify({ enabled }) }) as PaymentMethodSetting; },
};
