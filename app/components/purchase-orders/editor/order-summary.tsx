import { money } from "../purchase-order-ui";
import type { OrderSummaryValues } from "./types";
export function OrderSummary({
  summary,
  freight,
  other,
  onFreight,
  onOther,
  readOnly,
}: {
  summary: OrderSummaryValues;
  freight: string;
  other: string;
  onFreight: (value: string) => void;
  onOther: (value: string) => void;
  readOnly: boolean;
}) {
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
        <span>IVA</span>
        <strong>{money(summary.taxTotal)}</strong>
      </div>
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
    </aside>
  );
}
