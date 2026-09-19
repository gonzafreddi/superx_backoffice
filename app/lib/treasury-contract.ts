export type TreasuryAccountType = "CASH" | "BANK" | "DIGITAL" | "OWNER";
export type TreasuryMovementType = "INCOME" | "EXPENSE" | "TRANSFER_IN" | "TRANSFER_OUT" | "OPENING" | "REVERSAL";

export type TreasuryAccount = { id: string; name: string; type: TreasuryAccountType; currency: string; isActive: boolean; allowNegative: boolean; openingBalance: string; openingDate: string; createdAt: string; updatedAt: string; balance: string };
export type TreasuryTotal = { currency: string; balance: string };
export type TreasuryAccountsResponse = { items: TreasuryAccount[]; totalsByCurrency: TreasuryTotal[] };
export type TreasuryMovement = { id: string; accountId: string; type: TreasuryMovementType; amount: string; occurredAt: string; referenceType: string; referenceId: string | null; description: string | null; reversalOfId: string | null; transferId: string | null; reversalReason: string | null; runningBalance?: string; direction?: "IN" | "OUT"; sourceLabel?: string };
export type TreasuryLedger = { items: TreasuryMovement[]; total: number; page: number; pageSize: number; openingBalanceForPeriod: string };
export type TreasuryLedgerFilters = { from?: string; to?: string; type?: TreasuryMovementType | ""; referenceType?: string; q?: string; page?: number; pageSize?: number };
export type CreateTreasuryAccountDto = { name: string; type: TreasuryAccountType; currency?: string; openingBalance?: string; openingDate?: string; allowNegative?: boolean };
export type UpdateTreasuryAccountDto = { name?: string; type?: TreasuryAccountType; currency?: string; isActive?: boolean; allowNegative?: boolean };
export type ManualMovementDto = { accountId: string; type: "INCOME" | "EXPENSE"; amount: string; currency?: string; description: string; occurredAt?: string; idempotencyKey?: string };
export type CreateTransferDto = { fromAccountId: string; toAccountId: string; amount: string; date: string; notes?: string };
export type TreasuryApi = { listAccounts(): Promise<TreasuryAccountsResponse>; getAccount(id: string): Promise<TreasuryAccount>; createAccount(input: CreateTreasuryAccountDto): Promise<TreasuryAccount>; updateAccount(id: string, input: UpdateTreasuryAccountDto): Promise<TreasuryAccount>; ledger(id: string, filters?: TreasuryLedgerFilters): Promise<TreasuryLedger>; createManualMovement(input: ManualMovementDto): Promise<TreasuryMovement>; reverseMovement(id: string, reason: string): Promise<TreasuryMovement>; createTransfer(input: CreateTransferDto): Promise<unknown>; reverseTransfer(id: string, reason: string): Promise<unknown>; summary(): Promise<TreasuryAccountsResponse> };
