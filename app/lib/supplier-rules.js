export function validateSupplierInput(input) {
  const errors = {};
  if (!input.name?.trim()) errors.name = "El nombre es obligatorio.";
  if (input.paymentTermDays !== undefined && input.paymentTermDays !== null && (!Number.isInteger(input.paymentTermDays) || input.paymentTermDays < 0)) errors.paymentTermDays = "La condición de pago debe ser un entero igual o mayor que cero.";
  return errors;
}

export function validatePackagingInput(input) {
  const errors = {};
  if (!input.productId?.trim()) errors.productId = "Elegí un producto.";
  if (!input.name?.trim()) errors.name = "El nombre de la presentación es obligatorio.";
  if (!Number.isInteger(input.unitsPerPack) || input.unitsPerPack <= 0) errors.unitsPerPack = "Las unidades por pack deben ser un entero mayor que cero.";
  return errors;
}
