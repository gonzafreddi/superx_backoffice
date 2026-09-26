import type { PaymentMethod } from "./payment-contract";
export function parseAmountCents(input: unknown): bigint | null;
export function validateOrderPayment(input: { amount: string; balance: string; accountId: string }): { errors: string[]; amount: string | null; remaining: string; isFull: boolean };
export function defaultMethodFor(accountType: string): PaymentMethod;
