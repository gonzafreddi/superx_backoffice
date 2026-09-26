import { centsToDecimal } from "./invoice-rules.js";

/** Parses "1.234,56", "1234.56" or "1234,5" into cents; null when it is not a valid amount. */
export const parseAmountCents = (input) => {
  const raw = String(input ?? "").trim().replace(/\s|\$/g, "");
  if (!raw) return null;
  // Dots are thousands separators in es-AR ("1.234" = 1234); a lone "12.50" is still a decimal point.
  const normalized = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw) ? raw.replace(/\./g, "").replace(",", ".")
    : /^\d+,\d{1,2}$/.test(raw) ? raw.replace(",", ".")
    : /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(raw) ? raw.replace(/,/g, "")
    : raw;
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
};

/** Validates the payment form; returns the normalized amount and what stays pending after it. */
export const validateOrderPayment = ({ amount, balance, accountId }) => {
  const errors = [];
  const cents = parseAmountCents(amount);
  const open = parseAmountCents(balance) ?? 0n;
  if (cents === null) errors.push("Ingresá un importe válido.");
  else if (cents <= 0n) errors.push("El importe debe ser mayor a cero.");
  else if (cents > open) errors.push(`El importe supera el saldo pendiente (${centsToDecimal(open)}).`);
  if (!accountId) errors.push("Elegí la cuenta de la que sale el dinero.");
  return {
    errors,
    amount: cents === null ? null : centsToDecimal(cents),
    remaining: cents === null || cents > open ? centsToDecimal(open) : centsToDecimal(open - cents),
    isFull: cents !== null && cents === open,
  };
};

/** Payment method that matches a treasury account type by default. */
export const defaultMethodFor = (accountType) => accountType === "CASH" ? "CASH" : accountType === "DIGITAL" ? "DIGITAL" : "TRANSFER";
