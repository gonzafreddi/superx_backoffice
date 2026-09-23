import type { PurchaseOrderSupplierContext } from "@/app/lib/purchase-order-contract";
import { money } from "../purchase-order-ui";
const condition = { CASH: "Contado", CREDIT: "Crédito", TRANSFER: "Transferencia", OTHER: "Otro" };
export function SupplierContext({
  context,
  loading,
  error,
  onRetry,
}: {
  context: PurchaseOrderSupplierContext | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading) return <div className="poe-context poe-skeleton">Cargando contexto del proveedor…</div>;
  if (error)
    return (
      <div className="poe-context">
        No se pudo cargar el contexto del proveedor.{" "}
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  if (!context) return null;
  return (
    <div className="poe-context">
      Cond.:{" "}
      <strong>
        {condition[context.paymentCondition]}
        {context.paymentTermDays == null ? "" : ` ${context.paymentTermDays} días`}
      </strong>{" "}
      · Deuda: <strong>{money(Number(context.balance))}</strong>
      {Number(context.overdueBalance) > 0 && (
        <>
          {" "}
          (<b className="poe-danger">vencida {money(Number(context.overdueBalance))}</b>)
        </>
      )}{" "}
      · Última OC:{" "}
      <strong>
        {context.lastOrder
          ? `${context.lastOrder.number ?? "OC"} del ${new Intl.DateTimeFormat("es-AR").format(new Date(context.lastOrder.orderDate))} · ${money(Number(context.lastOrder.total))}`
          : "—"}
      </strong>{" "}
      · Entrega prom.:{" "}
      <strong>{context.averageLeadTimeDays == null ? "—" : `${context.averageLeadTimeDays} días`}</strong> ·{" "}
      <strong>{context.productCount} productos</strong> · <strong>{context.openOrdersCount} OC abiertas</strong>
    </div>
  );
}
