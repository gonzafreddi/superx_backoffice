import Link from "next/link";
import { money, OrderStatusBadge } from "../purchase-order-ui";
import type { PurchaseOrderStatus } from "@/app/lib/purchase-order-contract";
export function EditorHeader({
  id,
  number,
  status,
  total,
  saved,
  pending,
  confirmed,
  moreOpen,
  onMore,
  onSave,
  onConfirm,
  onDuplicate,
  onDelete,
  onCancel,
}: {
  id?: string;
  number?: string | null;
  status: PurchaseOrderStatus;
  total: number;
  saved: string;
  pending: "" | "save" | "confirm" | "duplicate" | "delete";
  confirmed: boolean;
  moreOpen: boolean;
  onMore: () => void;
  onSave: () => void;
  onConfirm: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const readonly = confirmed;
  return (
    <header className="poe-header">
      <div className="poe-title">
        <Link className="poe-back" href={id ? `/compras/${id}` : "/compras"}>← Compras</Link>
        <div className="poe-title-copy"><span>{id ? "Editar orden" : "Nueva orden de compra"}</span><strong>{id ? (number ?? "Orden de compra") : "Orden sin número"}</strong></div>
        <OrderStatusBadge status={status} />
        <small className="poe-saved" aria-live="polite">{saved || (readonly ? "Documento confirmado" : "Borrador sin confirmar")}</small>
      </div>
      <div className="poe-header-side">
        <div className="poe-header-total" aria-hidden="true">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="poe-actions">
          <div className="location-menu">
            <button
              className="button ghost"
              type="button"
              aria-label="Más acciones"
              aria-expanded={moreOpen}
              onClick={onMore}
            >
              ⋯ Más
            </button>
            {moreOpen && (
              <div>
                {id && (
                  <button type="button" disabled={Boolean(pending)} onClick={onDuplicate}>
                    Duplicar
                  </button>
                )}
                {id && status === "DRAFT" && (
                  <button type="button" disabled={Boolean(pending)} onClick={onDelete}>
                    Eliminar borrador
                  </button>
                )}
                <button type="button" onClick={onCancel}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <button className="button secondary" type="button" disabled={Boolean(pending)} onClick={onSave}>
            {pending === "save" ? "Guardando…" : readonly ? "Guardar cambios" : "Guardar borrador"}
            {!pending && <kbd>⌘S</kbd>}
          </button>
          {!readonly && (
            <button className="button primary" type="button" disabled={Boolean(pending)} onClick={onConfirm}>
              {pending === "confirm" ? "Confirmando…" : "Confirmar pedido"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
