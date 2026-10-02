import type { WithdrawalStatus, WithdrawalUpdate } from "./withdrawal-contract";
export const withdrawalStatuses: Array<[WithdrawalStatus, string]>;
export function validateWithdrawalUpdate(input: WithdrawalUpdate): string;
