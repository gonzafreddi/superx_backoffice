import { parseKgToGrams, type SaleMode } from "./quantity-rules.js";
import type { CountEdit, CountLine, CountPatch } from "./inventory-count-contract";

export function parseCountQuantity(value: string, saleMode?: SaleMode): number | null {
  if (!value.trim()) return null;
  if (saleMode === "WEIGHT") {
    const grams = parseKgToGrams(value);
    if (!Number.isSafeInteger(grams) || grams < 0 || grams > 2147483647) throw new Error("Ingresá kg entre 0 y 2.147.483,647, con hasta 3 decimales (coma o punto).");
    return grams;
  }
  if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) throw new Error("La cantidad debe ser un entero entre 0 y 2.147.483.647.");
  return Number(value);
}
export function countPatches(lines: CountLine[], edits: Record<string, CountEdit>): CountPatch[] {
  return lines.filter(line => edits[line.productId]).map(line => {
    const edit = edits[line.productId];
    if (edit.reason.trim().length > 80) throw new Error("El motivo admite hasta 80 caracteres.");
    return { productId: line.productId, countedQuantity: parseCountQuantity(edit.quantity, line.saleMode), reason: edit.reason.trim() || null };
  });
}
export function countSummary(lines: CountLine[]) {
  return lines.reduce((summary, line) => {
    if (line.countedQuantity === null) return summary;
    const difference = line.countedQuantity - line.systemQuantity;
    summary.counted++; summary.changed += Number(difference !== 0);
    if (line.saleMode === "WEIGHT") { summary.positiveGrams += Math.max(0, difference); summary.negativeGrams += Math.min(0, difference); }
    else { summary.positive += Math.max(0, difference); summary.negative += Math.min(0, difference); }
    return summary;
  }, { counted: 0, changed: 0, positive: 0, negative: 0, positiveGrams: 0, negativeGrams: 0 });
}
export function findScanLine(lines: CountLine[], code: string) {
  const value = code.trim();
  return lines.find(line => line.barcode === value || line.sku === value);
}
export function adaptCount(raw: Record<string, unknown>): import("./inventory-count-contract").InventoryCount {
  const lines = (Array.isArray(raw.lines) ? raw.lines : []) as Array<Record<string, unknown>>;
  return { ...raw, id: String(raw.id), warehouseId: String(raw.warehouseId), locationId: raw.locationId == null ? null : String(raw.locationId), lines: lines.map(line => {
    const product = (line.product ?? {}) as Record<string, unknown>;
    return { ...line, productId: String(line.productId ?? product.id), saleMode: line.saleMode === "WEIGHT" ? "WEIGHT" : "UNIT", productName: String(line.productName ?? product.name ?? "Producto"), sku: String(line.sku ?? product.sku ?? product.slug ?? ""), barcode: (line.barcode ?? product.barcode ?? null) as string | null, systemQuantity: Number(line.systemQuantity), countedQuantity: line.countedQuantity == null ? null : Number(line.countedQuantity), reason: (line.reason ?? null) as string | null } as CountLine;
  }) } as import("./inventory-count-contract").InventoryCount;
}
