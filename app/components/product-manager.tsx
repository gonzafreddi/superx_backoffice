"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { productApi } from "@/app/lib/product-api";
import type { Brand, Category, Product, ProductInput, ProductUnit, UserRole } from "@/app/lib/product-contract";
import { getPermissions, validateProduct } from "@/app/lib/product-rules";
import { ListSkeleton } from "@/app/components/list-skeleton";

type FormErrors = Partial<Record<keyof ProductInput, string>>;
type Notice = { kind: "success" | "error"; text: string } | null;
const emptyForm: ProductInput = { name: "", barcode: "", categoryId: "", brandId: "", unit: "unidad", imageUrl: "", active: true };
const roleNames: Record<UserRole, string> = { viewer: "Consulta", operator: "Operador", admin: "Administración" };

function Icon({ name }: { name: "plus" | "search" | "edit" | "trash" | "close" | "box" | "image" | "chevron" }) {
  const paths = {
    plus: <><path d="M12 5v14M5 12h14" /></>, search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    edit: <><path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z" /><path d="m13 6 3 3" /></>, trash: <><path d="M4 7h16M10 11v5m4-5v5M6 7l1 13h10l1-13M9 7l1-3h4l1 3" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />, box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 18 5-5 3 3 2-2 6 4" /></>, chevron: <path d="m9 18 6-6-6-6" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | "confirm-status" | "confirm-delete" | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const errorSummary = useRef<HTMLDivElement>(null);
  const permissions = getPermissions(role);
  const selected = products.find((product) => product.id === selectedId) ?? null;

  const load = async () => {
    setLoading(true); setLoadError("");
    try {
      if (!navigator.onLine) throw new Error("Sin conexión a internet. Verificá tu conexión y reintentá.");
      const [nextProducts, nextCategories, nextBrands] = await Promise.all([productApi.listProducts(), productApi.listCategories(), productApi.listBrands()]);
      setProducts(nextProducts); setCategories(nextCategories); setBrands(nextBrands);
      setSelectedId((current) => current && nextProducts.some((product) => product.id === current) ? current : nextProducts[0]?.id ?? null);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "No se pudo cargar el catálogo. Intentá nuevamente."); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    // El fetch inicial es una sincronización con el adaptador de catálogo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  useEffect(() => { if (Object.keys(errors).length) errorSummary.current?.focus(); }, [errors]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-AR");
    return products.filter((product) => (!normalized || [product.name, product.sku, product.barcode].some((value) => value.toLocaleLowerCase("es-AR").includes(normalized))) && (!categoryId || product.categoryId === categoryId) && (!brandId || product.brandId === brandId) && (status === "all" || (status === "active" ? product.active : !product.active)));
  }, [products, query, categoryId, brandId, status]);

  const openCreate = () => { setForm(emptyForm); setErrors({}); setDialog("create"); };
  const openEdit = () => { if (!selected) return; const { id, sku, updatedAt, ...input } = selected; void id; void sku; void updatedAt; setForm(input); setErrors({}); setDialog("edit"); };
  const changeForm = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProduct(form, products, dialog === "edit" ? selected?.id : undefined) as FormErrors;
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setPending(true); setNotice(null);
    try {
      const saved = dialog === "edit" && selected ? await productApi.updateProduct(selected.id, form) : await productApi.createProduct(form);
      setProducts((current) => dialog === "edit" ? current.map((product) => product.id === saved.id ? saved : product) : [saved, ...current]);
      setSelectedId(saved.id); setDialog(null); setNotice({ kind: "success", text: dialog === "edit" ? "Producto actualizado correctamente." : "Producto creado correctamente." });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo guardar el producto." }); }
    finally { setPending(false); }
  };
  const confirmAction = async () => {
    if (!selected) return;
    setPending(true); setNotice(null);
    try {
      if (dialog === "confirm-delete") { await productApi.deleteProduct(selected.id); setProducts((current) => current.filter((product) => product.id !== selected.id)); setSelectedId(null); setNotice({ kind: "success", text: "Producto eliminado correctamente." }); }
      else { const updated = await productApi.setProductStatus(selected.id, !selected.active); setProducts((current) => current.map((product) => product.id === updated.id ? updated : product)); setNotice({ kind: "success", text: `Producto ${updated.active ? "activado" : "desactivado"} correctamente.` }); }
      setDialog(null);
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "No se pudo completar la acción." }); }
    finally { setPending(false); }
  };
  const categoryName = (id: string) => categories.find((item) => item.id === id)?.name ?? "Sin categoría";
  const brandName = (id: string) => brands.find((item) => item.id === id)?.name ?? "Sin marca";

  return <section className="workspace" id="productos">
      <header className="topbar"><div><p className="eyebrow">CATÁLOGO / PRODUCTOS</p><h1>Productos</h1><p className="subtitle">Gestioná la información comercial de tu catálogo.</p></div><div className="top-actions"><label className="role-picker">Rol activo<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{permissions.create && <button className="button primary" onClick={openCreate}><Icon name="plus" /> Nuevo producto</button>}</div></header>
      {notice && <div className={`notice ${notice.kind}`} role="status"><span>{notice.kind === "success" ? "Listo" : "No se pudo completar"}</span>{notice.text}<button aria-label="Cerrar mensaje" onClick={() => setNotice(null)}><Icon name="close" /></button></div>}
      <div className="permission-note">Estás operando como <strong>{roleNames[role]}</strong>. {permissions.update ? "Los cambios se aplican al catálogo simulado." : "Sólo podés consultar información."}</div>
      <section className="catalog-grid"><div className="list-panel"><div className="filters"><label className="search"><Icon name="search" /><span className="sr-only">Buscar productos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre, SKU o barcode" /></label><select aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas las categorías</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filtrar por marca" value={brandId} onChange={(event) => setBrandId(event.target.value)}><option value="">Todas las marcas</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></div>
        <div className="list-meta"><strong>{visibleProducts.length} {visibleProducts.length === 1 ? "producto" : "productos"}</strong><button className="link-button" onClick={() => { setQuery(""); setCategoryId(""); setBrandId(""); setStatus("all"); }}>Limpiar filtros</button></div>
        {loading ? <ListSkeleton label="Cargando catálogo…" /> : loadError ? <div className="state error-state"><strong>{loadError.startsWith("Sin conexión") ? "Sin conexión" : "No pudimos cargar los productos"}</strong><span>{loadError}</span><button className="button secondary" onClick={() => void load()}>Reintentar</button></div> : visibleProducts.length === 0 ? <div className="state"><Icon name="box" /><strong>No encontramos productos</strong><span>Probá ajustar los filtros o creá un producto nuevo.</span></div> : <ul className="product-list">{visibleProducts.map((product) => <li key={product.id}><button className={`product-row ${selected?.id === product.id ? "selected" : ""}`} onClick={() => setSelectedId(product.id)}><ProductThumbnail product={product} /><span className="product-main"><strong>{product.name}</strong><span>{product.sku} · {brandName(product.brandId)}</span></span><span className={`status ${product.active ? "active" : "inactive"}`}>{product.active ? "Activo" : "Inactivo"}</span><Icon name="chevron" /></button></li>)}</ul>}</div>
        <aside className="detail-panel" aria-live="polite">{selected ? <><div className="detail-heading"><ProductThumbnail product={selected} large /><div><span className={`status ${selected.active ? "active" : "inactive"}`}>{selected.active ? "Activo" : "Inactivo"}</span><h2>{selected.name}</h2><p>{selected.sku}</p></div></div><dl><div><dt>Categoría</dt><dd>{categoryName(selected.categoryId)}</dd></div><div><dt>Marca</dt><dd>{brandName(selected.brandId)}</dd></div><div><dt>Unidad</dt><dd>{selected.unit}</dd></div><div><dt>Barcode</dt><dd className="mono">{selected.barcode}</dd></div><div><dt>Última actualización</dt><dd>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.updatedAt))}</dd></div></dl><div className="detail-actions">{permissions.update && <button className="button secondary" onClick={openEdit}><Icon name="edit" /> Editar</button>}{permissions.changeStatus && <button className="button secondary" onClick={() => setDialog("confirm-status")}>{selected.active ? "Desactivar" : "Activar"}</button>}{permissions.delete && <button className="button danger-text" onClick={() => setDialog("confirm-delete")}><Icon name="trash" /> Eliminar</button>}</div></> : <div className="state detail-empty"><Icon name="box" /><strong>Seleccioná un producto</strong><span>Vas a ver acá toda la información y las acciones disponibles.</span></div>}</aside></section>

    {(dialog === "create" || dialog === "edit") && <ProductForm dialog={dialog} form={form} errors={errors} categories={categories} brands={brands} pending={pending} errorSummary={errorSummary} onChange={changeForm} onClose={() => setDialog(null)} onSubmit={submit} />}
    {(dialog === "confirm-status" || dialog === "confirm-delete") && selected && <ConfirmDialog title={dialog === "confirm-delete" ? "¿Eliminar producto?" : `¿${selected.active ? "Desactivar" : "Activar"} producto?`} text={dialog === "confirm-delete" ? `Vas a eliminar “${selected.name}”. Esta acción no se puede deshacer.` : `El producto “${selected.name}” dejará de estar ${selected.active ? "disponible" : "oculto"} en el catálogo.`} action={dialog === "confirm-delete" ? "Eliminar producto" : selected.active ? "Desactivar producto" : "Activar producto"} danger={dialog === "confirm-delete"} pending={pending} onCancel={() => setDialog(null)} onConfirm={() => void confirmAction()} />}
  </section>;
}

// External supplier URLs cannot use Next's optimizer until the allowed hosts are contracted.
// eslint-disable-next-line @next/next/no-img-element
function ProductThumbnail({ product, large = false }: { product: Product; large?: boolean }) { return <span className={`thumbnail ${large ? "large" : ""}`}>{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <Icon name="image" />}</span>; }

function ProductForm({ dialog, form, errors, categories, brands, pending, errorSummary, onChange, onClose, onSubmit }: { dialog: "create" | "edit"; form: ProductInput; errors: FormErrors; categories: Category[]; brands: Brand[]; pending: boolean; errorSummary: React.RefObject<HTMLDivElement | null>; onChange: <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const fields = Object.values(errors).filter(Boolean);
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-form-title"><header><div><p className="eyebrow">CATÁLOGO</p><h2 id="product-form-title">{dialog === "create" ? "Nuevo producto" : "Editar producto"}</h2></div><button className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><Icon name="close" /></button></header><form onSubmit={onSubmit} noValidate>{fields.length > 0 && <div className="form-summary" ref={errorSummary} tabIndex={-1} role="alert"><strong>Revisá {fields.length === 1 ? "este campo" : "estos campos"}</strong>{fields.map((error) => <span key={error}>{error}</span>)}</div>}<div className="form-grid"><Field label="Nombre comercial" error={errors.name}><input id="name" value={form.name} onChange={(event) => onChange("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} autoFocus /></Field><Field label="Código de barras" error={errors.barcode}><input id="barcode" inputMode="numeric" value={form.barcode} onChange={(event) => onChange("barcode", event.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(errors.barcode)} aria-describedby={errors.barcode ? "barcode-error" : undefined} /></Field><Field label="Categoría" error={errors.categoryId}><select id="category" value={form.categoryId} onChange={(event) => onChange("categoryId", event.target.value)} aria-invalid={Boolean(errors.categoryId)}><option value="">Seleccionar categoría</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Marca" error={errors.brandId}><select id="brand" value={form.brandId} onChange={(event) => onChange("brandId", event.target.value)} aria-invalid={Boolean(errors.brandId)}><option value="">Seleccionar marca</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Unidad de venta" error={errors.unit}><select id="unit" value={form.unit} onChange={(event) => onChange("unit", event.target.value as ProductUnit)}><option value="unidad">Unidad</option><option value="kg">Kilogramo</option><option value="litro">Litro</option><option value="pack">Pack</option></select></Field><Field label="Imagen (URL)" error={errors.imageUrl}><input id="image" type="url" placeholder="https://…" value={form.imageUrl} onChange={(event) => onChange("imageUrl", event.target.value)} /></Field></div><label className="toggle"><input type="checkbox" checked={form.active} onChange={(event) => onChange("active", event.target.checked)} /><span aria-hidden="true" /><div><strong>Producto activo</strong><small>Puede mostrarse y operarse en el catálogo.</small></div></label><footer><button type="button" className="button ghost" onClick={onClose} disabled={pending}>Cancelar</button><button className="button primary" disabled={pending}>{pending ? "Guardando…" : dialog === "create" ? "Crear producto" : "Guardar cambios"}</button></footer></form></section></div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="field"><span>{label} <b aria-hidden="true">*</b></span>{children}{error && <small role="alert">{error}</small>}</label>; }
function ConfirmDialog({ title, text, action, danger, pending, onCancel, onConfirm }: { title: string; text: string; action: string; danger: boolean; pending: boolean; onCancel: () => void; onConfirm: () => void }) { return <div className="modal-backdrop" role="presentation"><section className="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{title}</h2><p>{text}</p><footer><button className="button ghost" onClick={onCancel} disabled={pending}>Cancelar</button><button className={`button ${danger ? "danger" : "primary"}`} onClick={onConfirm} disabled={pending}>{pending ? "Procesando…" : action}</button></footer></section></div>; }
