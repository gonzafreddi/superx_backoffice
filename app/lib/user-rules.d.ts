export function validateUserData(input: {email: string; name: string | null; phone: string | null}): string;
export function validateNewPassword(password: string, confirmation: string): string;
export function userOperationError(status: number, operation: string): string;
