import type { ReceivingLine } from "./receiving-contract";
export const REJECTION_REASONS: readonly string[];
export function preselectedLocation(lines: ReceivingLine[]): string;
export function matchScannedLine(lines: ReceivingLine[], code: string): ReceivingLine | null;
export function lineDifference(line: ReceivingLine, input?: Record<string, unknown>): { received: number; rejected: number; accepted: number; delta: number; missing: number; extra: number; hasDifference: boolean };
export function receivingSummary(lines: ReceivingLine[], values?: Record<string, Record<string, unknown>>): { lineCount: number; enteredLineCount: number; packages: number; differences: Array<{ line: ReceivingLine; received: number; rejected: number; accepted: number; delta: number; missing: number; extra: number; hasDifference: boolean }>; differenceCount: number };
export function validateReceiving(lines: ReceivingLine[], values?: Record<string, Record<string, unknown>>, locationId?: string, requireLocation?: boolean): { valid: boolean; errors: Record<string, string> };
export function receivingErrorMessage(message: unknown): string;
export function isLocationConflict(message: unknown): boolean;
