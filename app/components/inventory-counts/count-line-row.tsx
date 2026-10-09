"use client";
import type { CountEdit, CountLine } from "@/app/lib/inventory-count-contract";
import { parseCountQuantity } from "@/app/lib/inventory-count-rules";
import { formatQuantity, quantityInput } from "@/app/lib/quantity-rules";

export function CountLineRow({ line, edit, editable, pending, highlight, onEdit, onQuantityEnter }: {
  line: CountLine; edit?: CountEdit; editable: boolean; pending: boolean; highlight: string;
  onEdit: (key: keyof CountEdit, value: string) => void; onQuantityEnter: () => void;
}) {
      const quantity = edit?.quantity ?? (line.countedQuantity == null ? "" : quantityInput(line.countedQuantity, line.saleMode));
      let invalid = ""; try { parseCountQuantity(quantity, line.saleMode); } catch (error) { invalid = (error as Error).message; }
      const difference = invalid || line.countedQuantity === null ? null : line.countedQuantity - line.systemQuantity;
      return <tr key={line.productId} id={`count-line-${line.productId}`} className={highlight === line.productId ? "count-highlight" : ""}><td data-label="Producto"><strong>{line.productName}</strong><small>{line.sku} · {line.barcode ?? "Sin código de barras"}</small></td><td data-label="Sistema">{formatQuantity(line.systemQuantity, line.saleMode)}</td><td data-label="Contado">{editable ? <label className="field"><span className={line.saleMode === "WEIGHT" ? undefined : "sr-only"}>Cantidad contada de {line.productName} ({line.saleMode === "WEIGHT" ? "kg" : "unidades"})</span><input className="count-quantity" inputMode={line.saleMode === "WEIGHT" ? "decimal" : "numeric"} type="text" pattern={line.saleMode === "WEIGHT" ? "[0-9]+([.,][0-9]{1,3})?" : "[0-9]*"} value={quantity} disabled={pending} aria-invalid={Boolean(invalid)} aria-describedby={invalid ? `error-${line.productId}` : undefined} onChange={event => onEdit("quantity", event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); onQuantityEnter(); } }} />{invalid && <small id={`error-${line.productId}`} role="alert">{invalid}</small>}</label> : line.countedQuantity === null ? "Sin contar" : formatQuantity(line.countedQuantity, line.saleMode)}</td><td data-label="Diferencia"><strong className={difference ? "count-difference" : ""}>{difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatQuantity(difference, line.saleMode)}`}</strong></td><td data-label="Motivo">{editable ? <label className="field"><span className="sr-only">Motivo de {line.productName}</span><input maxLength={80} value={edit?.reason ?? line.reason ?? ""} disabled={pending} onChange={event => onEdit("reason", event.target.value)} /></label> : line.reason ?? "—"}</td></tr>;
}
