export function toCents(value: unknown): bigint;
export function centsToDecimal(value: bigint): string;
export function allocationTotal(allocations: Array<{ amount: string }>): string;
export function validatePaymentAllocations(amount: string, allocations: Array<{ targetId: string; amount: string }>, documents: Array<{ id: string; balance: string }>): { errors: string[]; allocated: string; remaining: string };
export function autoAllocate(amount: string, documents: Array<{ id: string; dueDate: string; balance: string }>): { allocations: Array<{ targetType: "SUPPLIER_INVOICE"; targetId: string; amount: string }>; remaining: string };
