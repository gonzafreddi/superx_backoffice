export type PromotionFormValue = { name: string; discountType: "PERCENTAGE" | "FIXED_AMOUNT"; discountValue: string | number; minPurchaseAmount: string | number; scope: "ALL" | "CATEGORY" | "PRODUCT"; categoryId: string; productId: string; couponCode: string; validFrom: string; validTo: string; active: boolean };
export function validatePromotion(input: PromotionFormValue): Record<string, string>;
export function promotionPayload(input: PromotionFormValue): Record<string, unknown>;
export function promotionTiming(promotion: { validFrom: string; validTo: string | null }, now?: Date): "upcoming" | "expired" | "current";
