export function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }

export function packagingEquivalence(name, unitsPerPack) { return `1 ${String(name || "pack").trim() || "pack"} = ${Number(unitsPerPack) || 0} unidades`; }
export function calculateSelectedTaxes(taxable, taxes) { return (taxes ?? []).map((tax) => ({ ...tax, amount: roundMoney(Math.max(0, Number(taxable) || 0) * Math.max(0, Number(tax.rate) || 0) / 100) })); }
/** @param {{packageQuantity: any, unitsPerPack: any, costPerPackage: any, discountAmount?: any, taxRate?: any, taxes?: Array<{rate: any, [key: string]: any}>}} input */
export function previewPurchaseOrderLine(input) {
  const { packageQuantity, unitsPerPack, costPerPackage, discountAmount, taxRate, taxes } = input;
  const packs = Number(packageQuantity) || 0, units = Number(unitsPerPack) || 0, cost = Number(costPerPackage) || 0, discount = Math.max(0, Number(discountAmount) || 0), tax = Math.max(0, Number(taxRate) || 0);
  const lineSubtotal = roundMoney(cost * packs), taxable = Math.max(0, lineSubtotal - discount), selected = Array.isArray(taxes) ? calculateSelectedTaxes(taxable, taxes) : null, taxAmount = selected ? roundMoney(selected.reduce((sum, item) => sum + item.amount, 0)) : roundMoney(taxable * tax / 100);
  return { unitQuantity: packs * units, unitCost: units > 0 ? roundMoney(cost / units) : 0, ...(discountAmount === undefined && taxRate === undefined ? {} : { lineSubtotal, discountAmount: roundMoney(discount), taxRate: tax, taxAmount }), total: roundMoney(taxable + taxAmount) };
}
export function summarizePurchaseOrder({ lines, freightAmount, otherChargesAmount }) {
  const totals = (lines ?? []).reduce((summary, line) => {
    const preview = previewPurchaseOrderLine(line);
    return { subtotal: roundMoney(summary.subtotal + (preview.lineSubtotal ?? preview.total)), discountTotal: roundMoney(summary.discountTotal + (preview.discountAmount ?? 0)), taxTotal: roundMoney(summary.taxTotal + (preview.taxAmount ?? 0)), lineTotal: roundMoney(summary.lineTotal + preview.total), lineCount: summary.lineCount + 1, unitCount: summary.unitCount + preview.unitQuantity };
  }, { subtotal: 0, discountTotal: 0, taxTotal: 0, lineTotal: 0, lineCount: 0, unitCount: 0 });
  const freight = roundMoney(Math.max(0, Number(freightAmount) || 0)), other = roundMoney(Math.max(0, Number(otherChargesAmount) || 0));
  return { subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, freightAmount: freight, otherChargesAmount: other, total: roundMoney(totals.lineTotal + freight + other), lineCount: totals.lineCount, unitCount: totals.unitCount };
}
export function addDaysToDate(isoDate, days) { const match = String(isoDate ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!match || !Number.isInteger(Number(days))) return ""; const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))); date.setUTCDate(date.getUTCDate() + Number(days)); return date.toISOString().slice(0, 10); }
export function isDirty(initial, current) { return JSON.stringify(initial) !== JSON.stringify(current); }
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
    if (!(Number(item.packageQuantity) >= 1) || !Number.isInteger(Number(item.packageQuantity))) errors[`item-${index}-quantity`] = "La cantidad de packs debe ser positiva, entera y mayor o igual a 1.";
    if (!(Number(item.costPerPackage) > 0)) errors[`item-${index}-cost`] = "El costo por pack debe ser mayor que cero.";
    if (!item.packagingId && !item.packagingName?.trim()) errors[`item-${index}-packagingName`] = "Indicá la presentación.";
    if (!item.packagingId && !(Number(item.unitsPerPack) > 0)) errors[`item-${index}-units`] = "Indicá unidades por pack positivas.";
    const subtotal = Number(item.packageQuantity) * Number(item.costPerPackage);
    if (Number(item.discountAmount ?? 0) > subtotal) errors[`item-${index}-discount`] = "El descuento no puede superar el subtotal.";
    if (!Array.isArray(item.taxIds) && !(Number(item.taxRate ?? 0) >= 0 && Number(item.taxRate ?? 0) <= 100)) errors[`item-${index}-tax`] = "El IVA debe estar entre 0 y 100%.";
  });
  if (Number(input.freightAmount ?? 0) < 0) errors.freightAmount = "El flete no puede ser negativo.";
  if (Number(input.otherChargesAmount ?? 0) < 0) errors.otherChargesAmount = "Otros cargos no pueden ser negativos.";
  if (input.dueDate && input.orderDate && input.dueDate < String(input.orderDate).slice(0, 10)) errors.dueDate = "El vencimiento no puede ser anterior a la fecha de orden.";
  return errors;
}
/** Non-blocking: flags lines repeating an earlier line's product + presentation. */
export function duplicateLineWarnings(items) {
  const warnings = {};
  (items ?? []).forEach((item, index) => { if (item.productId && (items ?? []).some((other, otherIndex) => otherIndex < index && other.productId === item.productId && (other.packagingId || other.packagingName || "") === (item.packagingId || item.packagingName || ""))) warnings[`item-${index}-duplicate`] = "Producto y presentación repetidos en otra línea."; });
  return warnings;
}
