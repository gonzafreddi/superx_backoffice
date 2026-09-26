"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { Notice } from "@/app/components/ui/notice";
import { SearchSelect } from "@/app/components/ui/search-select";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { TablePagination } from "@/app/components/ui/table-pagination";
import { productApi } from "@/app/lib/product-api";
import type { Category, Product } from "@/app/lib/product-contract";
import { promotionApi } from "@/app/lib/promotion-api";
import type { Promotion, PromotionInput } from "@/app/lib/promotion-contract";
import { promotionPayload, promotionTiming, validatePromotion, type PromotionFormValue } from "@/app/lib/promotion-rules.js";

const PAGE_SIZE = 10;
const emptyForm: PromotionFormValue = { name: "", discountType: "PERCENTAGE", discountValue: "", minPurchaseAmount: "", scope: "ALL", categoryId: "", productId: "", couponCode: "", validFrom: "", validTo: "", active: true };
const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });

export function PromotionManager() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<Promotion | null | undefined>(undefined);
  const [form, setForm] = useState<PromotionFormValue>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true); setError("");
    try { const [promotions, categoryList, productList] = await Promise.all([promotionApi.list(), productApi.listCategories(), productApi.listProducts({ status: "all" })]); setItems(promotions); setCategories(categoryList); setProducts(productList); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar las promociones."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const needle = query.trim().toLocaleLowerCase("es-AR");
    if (needle && ![item.name, item.couponCode ?? ""].some((value) => value.toLocaleLowerCase("es-AR").includes(needle))) return false;
    const timing = promotionTiming(item);
    if (filter === "active" && !item.active) return false;
    if (filter === "inactive" && item.active) return false;
    if (filter === "current" && timing !== "current") return false;
    if (filter === "expired" && timing !== "expired") return false;
    return true;
  }), [items, query, filter]);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const categoryName = (id: string) => categories.find((item) => item.id === id)?.name ?? `Categoría #${id}`;
  const productName = (id: string) => products.find((item) => item.id === id)?.name ?? `Producto #${id}`;
  const open = (item?: Promotion) => { setEditing(item ?? null); setErrors({}); setError(""); setForm(item ? { name: item.name, discountType: item.discountType, discountValue: item.discountValue, minPurchaseAmount: item.minPurchaseAmount ?? "", scope: item.productId ? "PRODUCT" : item.categoryId ? "CATEGORY" : "ALL", categoryId: item.categoryId ?? "", productId: item.productId ?? "", couponCode: item.couponCode ?? "", validFrom: localDate(item.validFrom), validTo: localDate(item.validTo), active: item.active } : { ...emptyForm, validFrom: localDate(new Date().toISOString()) }); };
  const setField = (name: keyof PromotionFormValue, value: string | boolean) => { setForm((current) => ({ ...current, [name]: value, ...(name === "scope" ? { categoryId: "", productId: "" } : {}) })); setErrors((current) => ({ ...current, [name]: "" })); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); const nextErrors = validatePromotion(form); setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    setSaving(true); setError("");
    try { const payload = promotionPayload(form) as PromotionInput; if (editing) await promotionApi.update(editing.id, payload); else await promotionApi.create(payload); setEditing(undefined); setSuccess(editing ? "Promoción actualizada." : "Promoción creada."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar la promoción."); }
    finally { setSaving(false); }
  };
  const toggle = async (item: Promotion) => { setError(""); try { const updated = await promotionApi.setActive(item.id, !item.active); setItems((rows) => rows.map((row) => row.id === item.id ? updated : row)); setSuccess(updated.active ? "Promoción activada." : "Promoción desactivada."); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cambiar el estado."); } };

  return <main className="workspace promotions-page">
    <header className="topbar"><div><span className="eyebrow">Comercial</span><h1>Promociones</h1><p>Administrá descuentos automáticos y cupones del catálogo.</p></div><button className="button primary" type="button" onClick={() => open()}>Nueva promoción</button></header>
    <Notice kind="info">Se aplica únicamente la mejor promoción elegible por pedido. Los descuentos nunca se acumulan.</Notice>
    {error && <Notice kind="error" role="alert">{error}</Notice>}{success && <Notice kind="success" onDismiss={() => setSuccess("")} dismissLabel="Cerrar aviso">{success}</Notice>}
    <section className="location-table-panel">
      <div className="filters promotion-filters"><label className="field"><span>Buscar</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Nombre o código" /></label><label className="field"><span>Estado</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">Todas</option><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="current">Vigentes</option><option value="expired">Vencidas</option></select></label></div>
      <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Tipo / valor</th><th>Alcance</th><th>Cupón</th><th>Mínimo</th><th>Vigencia</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{loading ? <tr><td colSpan={8}>Cargando promociones…</td></tr> : shown.length ? shown.map((item) => { const timing = promotionTiming(item); return <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.discountType === "PERCENTAGE" ? `${Number(item.discountValue).toLocaleString("es-AR")} %` : money.format(Number(item.discountValue))}</td><td>{item.productId ? `Producto · ${productName(item.productId)}` : item.categoryId ? `Categoría · ${categoryName(item.categoryId)}` : "Todo el catálogo"}</td><td>{item.couponCode ?? "Automática"}</td><td>{item.minPurchaseAmount === null ? "Sin mínimo" : money.format(Number(item.minPurchaseAmount))}</td><td>{date.format(new Date(item.validFrom))} – {item.validTo ? date.format(new Date(item.validTo)) : "Sin fin"}</td><td><StatusBadge tone={!item.active ? "neutral" : timing === "expired" ? "danger" : timing === "upcoming" ? "warning" : "success"} label={!item.active ? "Inactiva" : timing === "expired" ? "Vencida" : timing === "upcoming" ? "Programada" : "Vigente"} /></td><td className="table-actions"><button className="button ghost compact" type="button" onClick={() => open(item)}>Editar</button><button className="button ghost compact" type="button" onClick={() => void toggle(item)}>{item.active ? "Desactivar" : "Activar"}</button></td></tr>; }) : <tr><td colSpan={8}>No hay promociones para estos filtros.</td></tr>}</tbody></table></div>
      <TablePagination page={page} pageSize={PAGE_SIZE} total={filtered.length} label={`${filtered.length} promociones`} onPrev={() => setPage((value) => value - 1)} onNext={() => setPage((value) => value + 1)} buttonClassName="button ghost" loading={loading} />
    </section>
    {editing !== undefined && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(undefined); }}><section className="modal promotion-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-title"><header><div><span className="eyebrow">{editing ? "Editar" : "Alta"}</span><h2 id="promotion-title">{editing ? editing.name : "Nueva promoción"}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setEditing(undefined)}>×</button></header><form onSubmit={submit} noValidate>
      {Object.keys(errors).length > 0 && <Notice kind="error" role="alert">Revisá los campos marcados.</Notice>}
      <div className="form-grid promotion-form-grid">
        <label className="field field-wide"><span>Nombre</span><input value={form.name} maxLength={120} onChange={(e) => setField("name", e.target.value)} aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
        <label className="field"><span>Tipo de descuento</span><select value={form.discountType} onChange={(e) => setField("discountType", e.target.value)}><option value="PERCENTAGE">Porcentaje</option><option value="FIXED_AMOUNT">Monto fijo</option></select></label>
        <label className="field"><span>{form.discountType === "PERCENTAGE" ? "Porcentaje" : "Monto"}</span><input type="number" min="0.01" max={form.discountType === "PERCENTAGE" ? 100 : undefined} step="0.01" value={form.discountValue} onChange={(e) => setField("discountValue", e.target.value)} aria-invalid={Boolean(errors.discountValue)} />{errors.discountValue && <small className="field-error">{errors.discountValue}</small>}</label>
        <label className="field"><span>Compra mínima</span><input type="number" min="0" step="0.01" value={form.minPurchaseAmount} onChange={(e) => setField("minPurchaseAmount", e.target.value)} placeholder="Sin mínimo" />{errors.minPurchaseAmount && <small className="field-error">{errors.minPurchaseAmount}</small>}</label>
        <label className="field"><span>Alcance</span><select value={form.scope} onChange={(e) => setField("scope", e.target.value)}><option value="ALL">Todo el catálogo</option><option value="CATEGORY">Una categoría</option><option value="PRODUCT">Un producto</option></select></label>
        {form.scope === "CATEGORY" && <label className="field field-wide"><span>Categoría</span><select value={form.categoryId} onChange={(e) => setField("categoryId", e.target.value)}><option value="">Seleccioná…</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.categoryId && <small className="field-error">{errors.categoryId}</small>}</label>}
        {form.scope === "PRODUCT" && <label className="field field-wide"><span>Producto</span><SearchSelect value={form.productId} options={products} onChange={(value) => setField("productId", value)} onSearch={(value) => void productApi.listProducts({ query: value, status: "all" }).then(setProducts)} placeholder="Buscá por nombre, SKU o código" />{errors.productId && <small className="field-error">{errors.productId}</small>}</label>}
        <label className="field"><span>Código de cupón</span><input value={form.couponCode} maxLength={40} onChange={(e) => setField("couponCode", e.target.value.toUpperCase())} placeholder="Vacío = automática" />{errors.couponCode && <small className="field-error">{errors.couponCode}</small>}</label>
        <label className="field"><span>Inicio</span><input type="datetime-local" value={form.validFrom} onChange={(e) => setField("validFrom", e.target.value)} />{errors.validFrom && <small className="field-error">{errors.validFrom}</small>}</label>
        <label className="field"><span>Fin</span><input type="datetime-local" value={form.validTo} onChange={(e) => setField("validTo", e.target.value)} />{errors.validTo && <small className="field-error">{errors.validTo}</small>}</label>
        <label className="toggle-row field-wide"><input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)} /><span>Promoción activa</span></label>
      </div><footer><button className="button ghost" type="button" onClick={() => setEditing(undefined)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : "Guardar promoción"}</button></footer>
    </form></section></div>}
  </main>;
}
