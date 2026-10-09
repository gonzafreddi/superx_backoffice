/** WEIGHT quantities cross the API boundary as integer grams; UNIT stays integer units. */
export function parseKgToGrams(value) {
  const match = String(value ?? "").trim().match(/^([+-]?)(\d+)(?:[.,](\d{1,3}))?$/);
  if (!match) return NaN;
  const grams = Number(match[2]) * 1000 + Number((match[3] ?? "").padEnd(3, "0"));
  return Number.isSafeInteger(grams) ? (match[1] === "-" ? -grams : grams) : NaN;
}
export function parseQuantity(value, saleMode) {
  if (saleMode === "WEIGHT") return parseKgToGrams(value);
  const text = String(value ?? "").trim();
  const number = /^[+-]?\d+$/.test(text) ? Number(text) : NaN;
  return Number.isSafeInteger(number) ? number : NaN;
}
export function quantityInput(value, saleMode) {
  return String(saleMode === "WEIGHT" ? value / 1000 : value);
}
export function quantityUnit(saleMode) { return saleMode === "WEIGHT" ? "kg" : "u."; }
export function formatQuantity(value, saleMode) {
  return `${Number(saleMode === "WEIGHT" ? value / 1000 : value).toLocaleString("es-AR", { maximumFractionDigits: 3 })} ${quantityUnit(saleMode)}`;
}
export function formatWeight(grams) {
  return Math.abs(grams) < 1000 ? `${grams.toLocaleString("es-AR")} g` : formatQuantity(grams, "WEIGHT");
}
export function priceSuffix(saleMode) { return saleMode === "WEIGHT" ? " /kg" : ""; }
export function orderQuantityLabel(item) {
  if (item.saleMode !== "WEIGHT") return String(item.quantity);
  return `${formatWeight(item.quantity)} pedidos${item.pickedQuantity == null ? "" : ` · ${formatWeight(item.pickedQuantity)} reales`}`;
}
export function orderLineTotal(item) {
  return item.lineTotal ?? Math.round(item.unitPrice * (item.pickedQuantity ?? item.quantity) / (item.saleMode === "WEIGHT" ? 1000 : 1) * 100) / 100;
}
/** Totals keep units and kilograms separate when a view combines products. */
export function summarizeQuantities(items, getQuantity = (item) => item.quantity, getMode = (item) => item.saleMode) {
  let units = 0, grams = 0; let hasUnits = false, hasWeight = false;
  for (const item of items) {
    if (getMode(item) === "WEIGHT") { grams += getQuantity(item); hasWeight = true; }
    else { units += getQuantity(item); hasUnits = true; }
  }
  return [hasUnits ? formatQuantity(units, "UNIT") : "", hasWeight ? formatQuantity(grams, "WEIGHT") : ""].filter(Boolean).join(" · ") || "0 u.";
}
