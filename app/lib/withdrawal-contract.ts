export type WithdrawalStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type WithdrawalRequest = {
  id: string; code: string; fullName: string; email: string; phone: string | null;
  orderNumber: string | null; orderId: string | null; userId: string | null;
  reason: string | null; status: WithdrawalStatus; resolutionNote: string | null;
  createdAt: string; resolvedAt: string | null;
};
export type WithdrawalPage = { items: WithdrawalRequest[]; total: number; page: number; pageSize: number };
export type WithdrawalUpdate = { status: WithdrawalStatus; resolutionNote?: string };
