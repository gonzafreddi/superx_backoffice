export function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }

export function previewPurchaseOrderLine({ packageQuantity, unitsPerPack, costPerPackage }) {
  const packs = Number(packageQuantity) || 0, units = Number(unitsPerPack) || 0, cost = Number(costPerPackage) || 0;
  return { unitQuantity: packs * units, unitCost: units > 0 ? roundMoney(cost / units) : 0, total: roundMoney(cost * packs) };
}

export function validatePurchaseOrderInput(input) {
  const errors = {};
  if (!input.supplierId?.trim()) errors.supplierId = "Elegí un proveedor.";
  if (!input.warehouseId?.trim()) errors.warehouseId = "Elegí un depósito.";
  if (!Array.isArray(input.items) || !input.items.length) errors.items = "Agregá al menos una línea.";
  (input.items ?? []).forEach((item, index) => {
    if (!item.productId?.trim()) errors[`item-${index}-product`] = "Elegí un producto.";
    if (!(Number(item.packageQuantity) > 0)) errors[`item-${index}-quantity`] = "La cantidad de packs debe ser positiva.";
    if (!(Number(item.costPerPackage) >= 0)) errors[`item-${index}-cost`] = "El costo por pack no puede ser negativo.";
    if (!item.packagingId && !item.packagingName?.trim()) errors[`item-${index}-packagingName`] = "Indicá la presentación.";
    if (!item.packagingId && !(Number(item.unitsPerPack) > 0)) errors[`item-${index}-units`] = "Indicá unidades por pack positivas.";
  });
  return errors;
}
