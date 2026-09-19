const cents = (value) => {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
};
const centsOrZero = (value) => cents(value) ?? 0n;
export function addDecimalAmounts(values) { const total = values.reduce((sum, value) => sum + centsOrZero(value), 0n); return `${total / 100n}.${String(total % 100n).padStart(2, "0")}`; }
export function applyDecimalMovement(balance, amount, direction) { const value = centsOrZero(balance) + (direction === "IN" ? centsOrZero(amount) : -centsOrZero(amount)); const absolute = value < 0n ? -value : value; return `${value < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`; }

export function validateAmount(value) {
  const amount = cents(value);
  if (amount === null || amount <= 0n) return "Ingresá un importe mayor a cero, con hasta 2 decimales.";
  return "";
}
export function validateTransfer({ fromAccountId, toAccountId, fromCurrency, toCurrency, amount }) {
  if (!fromAccountId || !toAccountId) return "Elegí una cuenta de origen y una de destino.";
  if (fromAccountId === toAccountId) return "La cuenta de origen y destino deben ser distintas.";
  if (fromCurrency !== toCurrency) return "Las cuentas deben tener la misma moneda.";
  return validateAmount(amount);
}
export const accountTypeLabel = (type) => ({ CASH: "Caja", BANK: "Banco", DIGITAL: "Digital", OWNER: "Cuenta socios" })[type] ?? "—";
export const accountStatusLabel = (active) => active ? "Activa" : "Inactiva";
export const movementTypeLabel = (type) => ({ INCOME: "Ingreso", EXPENSE: "Egreso", TRANSFER_IN: "Transferencia recibida", TRANSFER_OUT: "Transferencia enviada", OPENING: "Saldo inicial", REVERSAL: "Reversa" })[type] ?? "—";
export function isReversible(movement) { return Boolean(movement && movement.type !== "REVERSAL" && !movement.reversalOfId); }
export function movementColumns(movement) { const direction = movement.direction ?? (["INCOME", "TRANSFER_IN", "OPENING"].includes(movement.type) ? "IN" : ["EXPENSE", "TRANSFER_OUT"].includes(movement.type) ? "OUT" : ""); return { income: direction === "IN" ? movement.amount : null, expense: direction === "OUT" ? movement.amount : null, sign: direction === "IN" ? "+" : direction === "OUT" ? "−" : "" }; }
export function createIdempotencyKey(current) { return current || crypto.randomUUID(); }
