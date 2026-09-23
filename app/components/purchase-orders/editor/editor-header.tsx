import Link from "next/link";
import { OrderStatusBadge } from "../purchase-order-ui";
import type { PurchaseOrderStatus } from "@/app/lib/purchase-order-contract";
export function EditorHeader({
  id,
  number,
  status,
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
        <Link href={id ? `/compras/${id}` : "/compras"}>← Compras</Link>
        <strong>{id ? (number ?? "Orden de compra") : "Nueva orden de compra"}</strong>
        <OrderStatusBadge status={status} />
        <small>{saved}</small>
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
        </button>
        {!readonly && (
          <button className="button primary" type="button" disabled={Boolean(pending)} onClick={onConfirm}>
            {pending === "confirm" ? "Confirmando…" : "Confirmar pedido"}
          </button>
        )}
      </div>
    </header>
  );
}
