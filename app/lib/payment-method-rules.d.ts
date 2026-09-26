export type PaymentMethodRuleItem = { method: string; enabled: boolean };
export function canSetPaymentMethod(methods: PaymentMethodRuleItem[], method: string, enabled: boolean): { allowed: boolean; reason?: string };
export function requiresEnableConfirmation(method: string, enabled: boolean): boolean;
