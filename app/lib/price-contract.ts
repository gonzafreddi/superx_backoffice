export type PriceCurrency = "ARS";
export type PriceChange = { id: string; previousAmount: number | null; amount: number; changedAt: string; changedBy: string; reason?: string };
export type Price = { productId: string; productName: string; sku: string; category: string; active: boolean; amount: number; currency: PriceCurrency; updatedAt: string; updatedBy: string; history: PriceChange[] };
export type PriceFilters = { query?: string; category?: string; status?: "all" | "active" | "inactive" };
export type PriceUpdateInput = { productIds: string[]; amount: number; changedBy: string; reason?: string };
/** Contrato objetivo de BE-007: GET /api/prices y PUT /api/prices. */
export type PriceApi = { listPrices(filters?: PriceFilters): Promise<Price[]>; updatePrices(input: PriceUpdateInput): Promise<Price[]> };
