import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MERCADO_PAGO";
export type TransferDetails = { alias?: string; cbu?: string; holder?: string; bank?: string; cuit?: string; receiptWhatsapp?: string };
export type PaymentMethodSetting = { method: PaymentMethod; enabled: boolean; details?: TransferDetails | null; updatedAt: string };
let fixture: PaymentMethodSetting[] = ["CASH", "BANK_TRANSFER", "MERCADO_PAGO"].map((method) => ({ method: method as PaymentMethod, enabled: method !== "MERCADO_PAGO", updatedAt: "2026-09-01T12:00:00.000Z" }));
const base = () => apiBaseUrl()?.replace(/\/$/, "");
async function json(url: string, init: RequestInit = {}) { const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } }); const payload: unknown = await response.json().catch(() => undefined); if (!response.ok) throw new Error(init.method === "PATCH" ? "No pudimos actualizar el medio de pago." : "No pudimos cargar los medios de pago."); return payload; }
export const paymentMethodApi = {
  async list(): Promise<PaymentMethodSetting[]> { const root = base(); if (fixturesEnabled()) return fixture.map((item) => ({ ...item })); return await json(`${root}/payment-methods`) as PaymentMethodSetting[]; },
  async setEnabled(method: PaymentMethod, enabled: boolean): Promise<PaymentMethodSetting> { const root = base(); if (fixturesEnabled()) { const updated = { method, enabled, updatedAt: new Date().toISOString() }; fixture = fixture.map((item) => item.method === method ? updated : item); return updated; } return await json(`${root}/payment-methods/${method}`, { method: "PATCH", body: JSON.stringify({ enabled }) }) as PaymentMethodSetting; },
  async setDetails(method: PaymentMethod, details: TransferDetails): Promise<PaymentMethodSetting> { const root = base(); if (fixturesEnabled()) { const current = fixture.find((item) => item.method === method)!; const updated = { ...current, details, updatedAt: new Date().toISOString() }; fixture = fixture.map((item) => item.method === method ? updated : item); return updated; } return await json(`${root}/payment-methods/${method}`, { method: "PATCH", body: JSON.stringify({ details }) }) as PaymentMethodSetting; },
};
