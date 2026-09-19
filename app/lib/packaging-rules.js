export function packagingEquivalence(name, unitsPerPack, unit = "unidad") {
  const amount = Number(unitsPerPack);
  if (!name?.trim() || !Number.isInteger(amount) || amount <= 0) return "";
  return `1 ${name.trim()} = ${amount} ${unit}`;
}

export function validatePackaging(input) {
  const errors = {};
  if (!input.productId?.trim()) errors.productId = "Elegí un producto.";
  if (!input.name?.trim()) errors.name = "El nombre de la presentación es obligatorio.";
  if (!Number.isInteger(Number(input.unitsPerPack)) || Number(input.unitsPerPack) <= 0) errors.unitsPerPack = "Las unidades por pack deben ser un entero mayor que cero.";
  return errors;
}

export function unitsPerPackChanged(previous, next) {
  return previous !== undefined && previous !== null && Number(previous) !== Number(next);
}
