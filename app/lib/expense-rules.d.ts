export function validateExpenseForm(input: Record<string, unknown>): Record<string, string>;
export function expenseStatusMeta(status: string, paymentStatus: string): { label: string; className: string };
export function categoryBars(rows: Array<{ id: string; name: string; total: string; paid?: string; pending: string }>): Array<{ id: string; name: string; total: string; paid?: string; pending: string; percent: number }>;
export function expenseIdempotencyKey(): string;
