import { money } from "../purchase-order-ui";
import type { OrderSummaryValues } from "./types";
import type { Line } from "./types";
import type { Tax } from "@/app/lib/tax-contract";
import { calculateSelectedTaxes, roundMoney } from "@/app/lib/purchase-order-rules";
export function OrderSummary({
  summary,
  freight,
  other,
  onFreight,
  onOther,
  readOnly,
  lines,
  taxes,
}: {
  summary: OrderSummaryValues;
  freight: string;
  other: string;
  onFreight: (value: string) => void;
  onOther: (value: string) => void;
  readOnly: boolean;
  lines: Line[];
  taxes: Tax[];
}) {
  const breakdown = taxes.map((tax) => ({ tax, amount: roundMoney(lines.reduce((sum, line) => { if (!line.taxIds.includes(tax.id)) return sum; const taxable = Math.max(0, Number(line.packageQuantity) * Number(line.costPerPackage) - Number(line.discountAmount)); return sum + calculateSelectedTaxes(taxable, [tax])[0].amount; }, 0)) })).filter((entry) => entry.amount > 0);
  return (
    <aside className="poe-summary">
      <header><span>Resumen</span><strong>Total de la orden</strong></header>
      <div className="poe-summary-rows">
      <div>
        <span>Subtotal</span>
        <strong>{money(summary.subtotal)}</strong>
      </div>
      <div>
        <span>Descuentos</span>
        <strong>− {money(summary.discountTotal)}</strong>
      </div>
      <div>
        <span>Impuestos</span>
        <strong>{money(summary.taxTotal)}</strong>
      </div>
      {breakdown.map(({ tax, amount }) => <div className="poe-tax-breakdown" key={tax.id}><span>{tax.name} {tax.rate}%</span><strong>{money(amount)}</strong></div>)}
      <label>
        <span>Flete</span>
        <input
          aria-label="Flete"
          type="number"
          min="0"
          step="0.01"
          value={freight}
          disabled={readOnly}
          onChange={(event) => onFreight(event.target.value)}
        />
      </label>
      <label>
        <span>Otros</span>
        <input
          aria-label="Otros cargos"
          type="number"
          min="0"
          step="0.01"
          value={other}
          disabled={readOnly}
          onChange={(event) => onOther(event.target.value)}
        />
      </label>
      </div>
      <div className="poe-total">
        <div>
          <span>Total</span>
          <strong>{money(summary.total)}</strong>
        </div>
        <small>
          {summary.lineCount} {summary.lineCount === 1 ? "línea" : "líneas"} · {summary.unitCount} u. en total
        </small>
      </div>
      {breakdown.some(({ tax }) => tax.includeInCost) && <small className="poe-cost-hint">Costo al recibir incluye: {breakdown.filter(({ tax }) => tax.includeInCost).map(({ tax }) => tax.name).join(", ")}.</small>}
    </aside>
  );
}
