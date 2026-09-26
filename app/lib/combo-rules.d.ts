export type ComboFormItem = { productId: string; quantity: string | number };
export type ComboFormValue = { name: string; description: string; comboPrice: string | number; isActive: boolean; validFrom: string; validUntil: string; sortOrder: string | number; items: ComboFormItem[] };
export function comboRegularPrice(items: ComboFormItem[], prices: Record<string, number | null | undefined>): number;
export function validateCombo(input: ComboFormValue, regularPrice: number): Record<string, string>;
export function comboPayload(input: ComboFormValue): Record<string, unknown>;
export function comboTiming(combo: { validFrom: string | null; validUntil: string | null }, now?: Date): "upcoming" | "expired" | "current";
