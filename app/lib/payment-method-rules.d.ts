export type PaymentMethodRuleItem = { method: string; enabled: boolean };
export function canSetPaymentMethod(methods: PaymentMethodRuleItem[], method: string, enabled: boolean): { allowed: boolean; reason?: string };
export function requiresEnableConfirmation(method: string, enabled: boolean): boolean;
export type TransferDetails = { alias?: string; cbu?: string; holder?: string; bank?: string; cuit?: string; receiptWhatsapp?: string };
export function validateTransferDetails(form: TransferDetails): { valid: boolean; errors: Partial<Record<keyof TransferDetails, string>>; details: TransferDetails };
