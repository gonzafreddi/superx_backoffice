"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "@/app/lib/auth-api";
import { supplierApi } from "@/app/lib/supplier-api";
import type { SupplierDetail as SupplierDetailData } from "@/app/lib/supplier-contract";
import { PackagingManager } from "@/app/components/purchasing/packaging-manager";
import { AccessState, SupplierStatusBadge } from "./supplier-list";
import { SupplierDialog } from "./supplier-form";

type Access = "loading" | "ready" | "unauthenticated" | "forbidden";

export function SupplierDetail({ supplierId }: { supplierId: string }) {
  const [access, setAccess] = useState<Access>("loading"); const [supplier, setSupplier] = useState<SupplierDetailData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editingSupplier, setEditingSupplier] = useState(false); const [pending, setPending] = useState(false);
  useEffect(() => { const user = getStoredUser(); if (!process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL) setAccess("ready"); else if (!user) setAccess("unauthenticated"); else setAccess(user.role === "admin" ? "ready" : "forbidden"); }, []);
  const load = useCallback(async () => { if (access !== "ready") return; setLoading(true); setError(""); try { setSupplier(await supplierApi.getSupplier(supplierId)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el proveedor."); } finally { setLoading(false); } }, [access, supplierId]);
  useEffect(() => { void load(); }, [load]);
  if (access !== "ready") return <AccessState state={access} />;
  if (loading) return <section className="workspace"><div className="state"><strong>Cargando proveedor…</strong></div></section>;
  if (!supplier) return <section className="workspace"><div className="state error-state"><strong>No pudimos cargar el proveedor</strong><span>{error}</span><button className="button secondary" onClick={() => void load()}>Reintentar</button></div></section>;
  const saveSupplier = async (input: Parameters<typeof supplierApi.updateSupplier>[1]) => { setPending(true); try { await supplierApi.updateSupplier(supplier.id, input); setEditingSupplier(false); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el proveedor."); } finally { setPending(false); } };
  return <section className="workspace"><Link href="/proveedores" className="back-link">← Proveedores</Link><header className="topbar"><div><p className="eyebrow">OPERACIONES / PROVEEDORES</p><h1>{supplier.name} <SupplierStatusBadge status={supplier.status} /></h1><p className="subtitle">{supplier.contactName ?? "Sin contacto asignado"}{supplier.phone ? ` · ${supplier.phone}` : ""}</p></div><div className="top-actions"><button className="button secondary" onClick={() => setEditingSupplier(true)}>Editar proveedor</button></div></header>{error && <div className="notice error" role="alert">{error}<button aria-label="Cerrar error" onClick={() => setError("")}>×</button></div>}<div className="location-detail-layout"><aside className="location-side"><section className="location-card"><p className="eyebrow">DATOS DEL PROVEEDOR</p><dl className="location-info"><div><dt>CUIT</dt><dd className="mono">{supplier.taxId ?? "—"}</dd></div><div><dt>Contacto</dt><dd>{supplier.contactName ?? "—"}</dd></div><div><dt>Email</dt><dd>{supplier.email ?? "—"}</dd></div><div><dt>Dirección</dt><dd>{supplier.address ?? "—"}</dd></div><div><dt>Pago</dt><dd>{supplier.paymentTermDays == null ? "No informado" : `${supplier.paymentTermDays} días`}</dd></div></dl>{supplier.notes && <p className="location-muted">{supplier.notes}</p>}</section></aside><main><PackagingManager items={supplier.purchasePackagings} supplier={{ id: supplier.id, name: supplier.name }} searchProducts={supplierApi.searchProducts} loading={pending} onCreate={async (productId, input) => { setPending(true); try { await supplierApi.createPackaging(productId, input); await load(); } finally { setPending(false); } }} onUpdate={async (id, input) => { setPending(true); try { await supplierApi.updatePackaging(id, input); await load(); } finally { setPending(false); } }} /></main></div>{editingSupplier && <SupplierDialog supplier={supplier} pending={pending} onClose={() => setEditingSupplier(false)} onSubmit={(input) => void saveSupplier(input)} />}</section>;
}
