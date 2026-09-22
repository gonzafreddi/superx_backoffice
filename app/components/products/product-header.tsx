"use client";

import Link from "next/link";
import { useState } from "react";
import { RolePicker } from "@/app/components/location-ui";
import type { Product, UserRole } from "@/app/lib/product-contract";

export function ProductHeader({ product, name, role, onRole, saving, dirty, onSave, onDuplicate, onToggleStatus, statusPending }: { product: Product | null; name: string; role: UserRole; onRole: (role: UserRole) => void; saving: boolean; dirty: boolean; onSave: () => void; onDuplicate: () => void; onToggleStatus: () => void; statusPending: boolean }) {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const toggleStatus = () => { setShowMoreActions(false); onToggleStatus(); };
  return <header className="product-erp-header"><div><Link className="back-link" href="/productos">← Productos</Link><p className="eyebrow">CATÁLOGO / PRODUCTOS</p><div className="product-heading"><h1>{name || "Nuevo producto"}</h1>{product && <span className={`status ${product.active ? "active" : "inactive"}`}>{product.active ? "ACTIVO" : "ARCHIVADO"}</span>}</div><p className="product-metadata">{product ? `${product.brandName} · ${product.categoryName} · SKU ${product.sku}` : "Completá los datos mínimos para crear el artículo."}</p></div><div className="product-header-actions"><RolePicker role={role} onChange={onRole} />{dirty && <span className="unsaved-state">Cambios sin guardar</span>}<button className="button primary" type="button" disabled={saving} onClick={onSave}>{saving ? "Guardando…" : "Guardar"}</button><button className="button secondary" type="button" disabled={!product} onClick={onDuplicate}>Duplicar</button><div className="product-more-actions"><button className="product-more" type="button" aria-label="Más acciones" aria-expanded={showMoreActions} aria-haspopup="menu" disabled={!product || statusPending} onClick={() => setShowMoreActions((open) => !open)}>•••</button>{showMoreActions && product && <div className="product-more-menu" role="menu"><button type="button" role="menuitem" disabled={statusPending} onClick={toggleStatus}>{statusPending ? "Actualizando…" : product.active ? "Desactivar producto" : "Activar producto"}</button></div>}</div></div></header>;
}
