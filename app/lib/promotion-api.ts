import { authFetch } from "./http";
import type { Promotion, PromotionApi, PromotionInput } from "./promotion-contract";

let fixturePromotions: Promotion[] = [
  { id: "1", name: "Semana de frescos", discountType: "PERCENTAGE", discountValue: "15.00", minPurchaseAmount: "10000.00", categoryId: "fresh", productId: null, couponCode: null, validFrom: "2026-09-01T03:00:00.000Z", validTo: "2026-10-01T02:59:59.000Z", active: true, createdAt: "2026-08-20T12:00:00.000Z", updatedAt: "2026-08-20T12:00:00.000Z" },
  { id: "2", name: "Bienvenida", discountType: "FIXED_AMOUNT", discountValue: "500.00", minPurchaseAmount: "5000.00", categoryId: null, productId: null, couponCode: "HOLA500", validFrom: "2026-01-01T03:00:00.000Z", validTo: null, active: true, createdAt: "2026-01-01T03:00:00.000Z", updatedAt: "2026-01-01T03:00:00.000Z" },
];
const base = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL?.replace(/\/$/, "");
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 180));
async function json(url: string, init: RequestInit = {}) {
  const response = await authFetch(url, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) { const raw = payload && typeof payload === "object" ? (payload as { message?: unknown }).message : undefined; throw new Error(Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" ? raw : "No pudimos completar la operación."); }
  return payload;
}
function fromInput(id: string, input: PromotionInput, previous?: Promotion): Promotion {
  const now = new Date().toISOString();
  return { id, ...input, discountValue: input.discountValue.toFixed(2), minPurchaseAmount: input.minPurchaseAmount === null ? null : input.minPurchaseAmount.toFixed(2), categoryId: input.categoryId === null ? null : String(input.categoryId), productId: input.productId === null ? null : String(input.productId), createdAt: previous?.createdAt ?? now, updatedAt: now };
}
export const promotionApi: PromotionApi = {
  async list(active) { const root = base(); if (!root) { await wait(); return fixturePromotions.filter((item) => active === undefined || item.active === active); } const suffix = active === undefined ? "" : `?active=${active}`; return await json(`${root}/promotions${suffix}`) as Promotion[]; },
  async create(input) { const root = base(); if (!root) { await wait(); const item = fromInput(String(Date.now()), input); fixturePromotions = [item, ...fixturePromotions]; return item; } return await json(`${root}/promotions`, { method: "POST", body: JSON.stringify(input) }) as Promotion; },
  async update(id, input) { const root = base(); if (!root) { await wait(); const previous = fixturePromotions.find((item) => item.id === id); if (!previous) throw new Error("La promoción ya no está disponible."); const merged = { ...previous, ...input, discountValue: Number(input.discountValue ?? previous.discountValue), minPurchaseAmount: input.minPurchaseAmount === undefined ? (previous.minPurchaseAmount === null ? null : Number(previous.minPurchaseAmount)) : input.minPurchaseAmount, categoryId: input.categoryId === undefined ? (previous.categoryId === null ? null : Number(previous.categoryId)) : input.categoryId, productId: input.productId === undefined ? (previous.productId === null ? null : Number(previous.productId)) : input.productId } as PromotionInput; const item = fromInput(id, merged, previous); fixturePromotions = fixturePromotions.map((row) => row.id === id ? item : row); return item; } return await json(`${root}/promotions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }) as Promotion; },
  setActive(id, active) { return this.update(id, { active }); },
};
