export const REJECTION_REASONS = ["Roto", "Vencido", "Mal estado", "Otro"];

export function preselectedLocation(lines) {
  const ids = [...new Set(lines.map((line) => line.suggestedLocationId).filter(Boolean))];
  return ids.length === 1 && lines.every((line) => line.suggestedLocationId === ids[0]) ? ids[0] : "";
}

export function matchScannedLine(lines, code) {
  const needle = String(code ?? "").trim().toLowerCase();
  if (!needle) return null;
  return lines.find((line) => [line.packagingBarcode, ...(line.product?.barcodes ?? [])].filter(Boolean).some((value) => String(value).trim().toLowerCase() === needle)) ?? null;
}

export function lineDifference(line, input = {}) {
  const received = Math.max(0, Number(input.packageQuantity) || 0);
  const rejected = Math.max(0, Number(input.rejectedPackageQuantity) || 0);
  const accepted = Math.max(0, received - rejected);
  const delta = accepted - Number(line.pendingPackages || 0);
  return { received, rejected, accepted, delta, missing: Math.max(0, -delta), extra: Math.max(0, delta), hasDifference: delta !== 0 || rejected > 0 };
}

export function receivingSummary(lines, values = {}) {
  const differences = lines.map((line) => ({ line, ...lineDifference(line, values[line.purchaseOrderItemId]) })).filter((item) => item.hasDifference);
  return { lineCount: lines.length, enteredLineCount: lines.filter((line) => String(values[line.purchaseOrderItemId]?.packageQuantity ?? "") !== "").length, packages: lines.reduce((sum, line) => sum + lineDifference(line, values[line.purchaseOrderItemId]).received, 0), differences, differenceCount: differences.length };
}

export function validateReceiving(lines, values = {}, locationId = "") {
  const errors = {};
  if (!locationId) errors.locationId = "Elegí una ubicación para la recepción.";
  for (const line of lines) {
    const value = values[line.purchaseOrderItemId] ?? {};
    const diff = lineDifference(line, value);
    if (diff.rejected > diff.received) errors[line.purchaseOrderItemId] = "Los packs rechazados no pueden superar los recibidos.";
    else if (diff.extra > 0 && String(value.varianceReason ?? "").trim().length < 5) errors[line.purchaseOrderItemId] = "Indicá el motivo del sobrante (mínimo 5 caracteres).";
    else if (diff.rejected > 0 && String(value.rejectionReason ?? "").trim().length < 3) errors[line.purchaseOrderItemId] = "Indicá el motivo del rechazo.";
    else if (!locationId && !value.locationId) errors[line.purchaseOrderItemId] = "Elegí una ubicación.";
  }
  if (!lines.some((line) => { const diff = lineDifference(line, values[line.purchaseOrderItemId] ?? {}); return diff.accepted > 0 || diff.rejected > 0; })) errors.empty = "Cargá al menos una cantidad recibida o rechazada.";
  return { valid: Object.keys(errors).length === 0, errors };
}

const BACKEND_MESSAGES = [
  [/insufficient capacity/i, "La ubicación no tiene capacidad suficiente para esta mercadería. Elegí otra ubicación (general o por línea)."],
  [/location does not belong|location is not available|location is not active/i, "La ubicación elegida no está disponible en este depósito. Elegí otra."],
  [/only confirmed purchase orders/i, "La orden ya no está confirmada: consultá con Compras."],
  [/variance reason/i, "Indicá el motivo del sobrante (mínimo 5 caracteres)."],
  [/rejection reason/i, "Indicá el motivo del rechazo (mínimo 3 caracteres)."],
];

/** Spanish text for known backend receiving errors; unknown messages pass through. */
export function receivingErrorMessage(message) {
  const text = String(message ?? "");
  return BACKEND_MESSAGES.find(([pattern]) => pattern.test(text))?.[1] ?? text;
}

/** Location/capacity conflicts are fixable by the operator; anything else on 409 means the order changed. */
export function isLocationConflict(message) {
  return /insufficient capacity|location does not belong|location is not available|location is not active/i.test(String(message ?? ""));
}
