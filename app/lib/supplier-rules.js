export function validateSupplierInput(input) {
  const errors = {};
  if (!input.name?.trim()) errors.name = "El nombre es obligatorio.";
  if (input.taxId && !isValidCuit(input.taxId)) errors.taxId = "Ingresá un CUIT válido.";
  if (input.paymentTermDays !== undefined && input.paymentTermDays !== null && (!Number.isInteger(input.paymentTermDays) || input.paymentTermDays < 0)) errors.paymentTermDays = "La condición de pago debe ser un entero igual o mayor que cero.";
  return errors;
}

export function normalizeCuit(value = "") {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);
  return digits.length > 10 ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}` : digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

export function isValidCuit(value) {
  const digits = String(value).replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const remainder = weights.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0) % 11;
  const check = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
  return check === Number(digits[10]);
}

export function paymentConditionLabel(value) {
  return { CASH: "Contado", CREDIT: "Crédito", TRANSFER: "Transferencia", OTHER: "Otra" }[value] ?? "—";
}

export function supplierMovementLabel(value) {
  return { INVOICE: "Factura", PAYMENT: "Pago", PAYMENT_REVERSAL: "Reversa de pago" }[value] ?? "Movimiento";
}

export function formatSupplierMovement(movement) {
  return { date: movement?.date ? new Intl.DateTimeFormat("es-AR").format(new Date(movement.date)) : "—", type: supplierMovementLabel(movement?.type), reference: movement?.reference || "—" };
}

export function validatePackagingInput(input) {
  const errors = {};
  if (!input.productId?.trim()) errors.productId = "Elegí un producto.";
  if (!input.name?.trim()) errors.name = "El nombre de la presentación es obligatorio.";
  if (!Number.isInteger(input.unitsPerPack) || input.unitsPerPack <= 0) errors.unitsPerPack = "Las unidades por pack deben ser un entero mayor que cero.";
  return errors;
}
