export function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }

export function packagingEquivalence(name, unitsPerPack) { return `1 ${String(name || "pack").trim() || "pack"} = ${Number(unitsPerPack) || 0} unidades`; }
/** @param {{packageQuantity: any, unitsPerPack: any, costPerPackage: any, discountAmount?: any, taxRate?: any}} input */
export function previewPurchaseOrderLine({ packageQuantity, unitsPerPack, costPerPackage, discountAmount, taxRate }) {
  const packs = Number(packageQuantity) || 0, units = Number(unitsPerPack) || 0, cost = Number(costPerPackage) || 0, discount = Math.max(0, Number(discountAmount) || 0), tax = Math.max(0, Number(taxRate) || 0);
  const lineSubtotal = roundMoney(cost * packs), taxable = Math.max(0, lineSubtotal - discount), taxAmount = roundMoney(taxable * tax / 100);
  return { unitQuantity: packs * units, unitCost: units > 0 ? roundMoney(cost / units) : 0, ...(discountAmount === undefined && taxRate === undefined ? {} : { lineSubtotal, discountAmount: roundMoney(discount), taxRate: tax, taxAmount }), total: roundMoney(taxable + taxAmount) };
}
export function pendingPackages(item) { return Math.max(0, Number(item.packageQuantity) - Number(item.receivedPackageQuantity)); }
export function progressPercent(received, ordered) { return ordered > 0 ? Math.min(100, Math.round(Number(received) / Number(ordered) * 100)) : 0; }
export function isOverReceipt(quantity, item) { return Number(quantity) > pendingPackages(item); }
export function validateVarianceReason(reason) { return String(reason ?? "").trim().length >= 5; }
export function stableIdempotencyKey(key) { return key || globalThis.crypto?.randomUUID?.() || `receipt-${Date.now()}`; }

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
