"use client";
/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Notice } from "@/app/components/ui/notice";
import { SearchSelect } from "@/app/components/ui/search-select";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { TablePagination } from "@/app/components/ui/table-pagination";
import { comboApi } from "@/app/lib/combo-api";
import type { Combo, ComboInput } from "@/app/lib/combo-contract";
import { comboPayload, comboRegularPrice, comboTiming, validateCombo, type ComboFormValue } from "@/app/lib/combo-rules.js";
import { priceApi } from "@/app/lib/price-api";
import { productApi } from "@/app/lib/product-api";
import { PRODUCT_IMAGE_ACCEPT, validateProductImage } from "@/app/lib/product-image-rules.js";
import type { Product } from "@/app/lib/product-contract";

const PAGE_SIZE = 10;
const emptyForm: ComboFormValue = { name: "", description: "", comboPrice: "", isActive: true, validFrom: "", validUntil: "", sortOrder: "0", items: [] };
const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });

export function ComboManager() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<Combo | null | undefined>(undefined);
  const [form, setForm] = useState<ComboFormValue>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickerId, setPickerId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [comboList, productList, priceList] = await Promise.all([
        comboApi.listAdmin(),
        productApi.listProducts({ status: "all" }),
        priceApi.listPrices({ status: "all" }),
      ]);
      setCombos(comboList); setProducts(productList);
      setPrices(Object.fromEntries(priceList.map((item) => [item.productId, item.price])));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar los combos."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => () => { if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const productMap = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const regularPrice = comboRegularPrice(form.items, prices);
  const comboPrice = Number(form.comboPrice);
  const hasComboPrice = String(form.comboPrice).trim() !== "" && Number.isFinite(comboPrice) && comboPrice > 0;
  const savings = hasComboPrice ? regularPrice - comboPrice : 0;
  const comboRegular = (combo: Combo) => comboRegularPrice(combo.items, prices);
  const filtered = useMemo(() => combos.filter((combo) => {
    const needle = query.trim().toLocaleLowerCase("es-AR");
    const itemNames = combo.items.map((item) => item.product?.name ?? productMap.get(item.productId)?.name ?? "").join(" ");
    if (needle && !`${combo.name} ${itemNames}`.toLocaleLowerCase("es-AR").includes(needle)) return false;
    if (filter === "active" && !combo.isActive) return false;
    if (filter === "inactive" && combo.isActive) return false;
    return true;
  }), [combos, filter, productMap, query]);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const productName = (item: Combo["items"][number]) => item.product?.name ?? productMap.get(item.productId)?.name ?? `Producto #${item.productId}`;
  const open = (combo?: Combo) => {
    setEditing(combo ?? null); setErrors({}); setError(""); setPickerId(""); setImageFile(null); setImagePreview(combo?.imageUrl ?? "");
    setForm(combo ? { name: combo.name, description: combo.description ?? "", comboPrice: combo.comboPrice, isActive: combo.isActive, validFrom: localDate(combo.validFrom), validUntil: localDate(combo.validUntil), sortOrder: String(combo.sortOrder), items: combo.items.map((item) => ({ productId: item.productId, quantity: String(item.quantity) })) } : { ...emptyForm, items: [] });
  };
  const setField = (name: keyof ComboFormValue, value: string | boolean) => { setForm((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: "" })); };
  const addProduct = (id: string) => {
    if (!id || form.items.some((item) => item.productId === id)) return;
    setForm((current) => ({ ...current, items: [...current.items, { productId: id, quantity: "1" }] }));
    setErrors((current) => ({ ...current, items: "" })); setPickerId("");
  };
  const setQuantity = (productId: string, quantity: string) => setForm((current) => ({ ...current, items: current.items.map((item) => item.productId === productId ? { ...item, quantity } : item) }));
  const removeProduct = (productId: string) => setForm((current) => ({ ...current, items: current.items.filter((item) => item.productId !== productId) }));
  const chooseImage = (file?: File) => {
    if (!file) return;
    const issue = validateProductImage(file);
    if (issue) { setErrors((current) => ({ ...current, image: issue })); return; }
    setImageFile(file); setImagePreview(URL.createObjectURL(file)); setErrors((current) => ({ ...current, image: "" }));
  };
  const dropImage = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); chooseImage(event.dataTransfer.files[0]); };
  const removeImage = async () => {
    if (imageFile) { setImageFile(null); setImagePreview(editing?.imageUrl ?? ""); return; }
    if (!editing?.imageUrl || !window.confirm("¿Querés eliminar la imagen del combo?")) return;
    setImagePending(true); setError("");
    try { const updated = await comboApi.deleteImage(editing.id); setEditing(updated); setImagePreview(""); setCombos((rows) => rows.map((row) => row.id === updated.id ? updated : row)); setSuccess("Imagen eliminada."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos eliminar la imagen."); }
    finally { setImagePending(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateCombo(form, regularPrice);
    if (form.items.some((item) => prices[item.productId] == null)) nextErrors.items = "Todos los productos deben tener un precio regular vigente.";
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    setSaving(true); setError("");
    try {
      const payload = comboPayload(form) as ComboInput;
      const saved = editing ? await comboApi.update(editing.id, payload) : await comboApi.create(payload);
      if (imageFile) await comboApi.uploadImage(saved.id, imageFile);
      setEditing(undefined); setSuccess(editing ? "Combo actualizado." : "Combo creado."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar el combo."); }
    finally { setSaving(false); }
  };
  const toggle = async (combo: Combo) => {
    setError("");
    try { const updated = await comboApi.update(combo.id, { isActive: !combo.isActive }); setCombos((rows) => rows.map((row) => row.id === combo.id ? updated : row)); setSuccess(updated.isActive ? "Combo activado." : "Combo desactivado."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cambiar el estado."); }
  };

  return <main className="workspace combos-page">
    <header className="topbar"><div><span className="eyebrow">Comercial</span><h1>Combos</h1><p>Armá conjuntos de productos con un precio especial.</p></div><button className="button primary" type="button" onClick={() => open()}>Nuevo combo</button></header>
    <Notice kind="info">El ahorro se calcula con los precios regulares vigentes. Un combo puede acumularse con una promoción.</Notice>
    {error && <Notice kind="error" role="alert">{error}</Notice>}{success && <Notice kind="success" onDismiss={() => setSuccess("")} dismissLabel="Cerrar aviso">{success}</Notice>}
    <section className="location-table-panel">
      <div className="filters combo-filters"><label className="field"><span>Buscar</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Nombre o producto" /></label><label className="field"><span>Estado</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label></div>
      <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Productos</th><th>Regular</th><th>Combo</th><th>Ahorro</th><th>Vigencia</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{loading ? <tr><td colSpan={8}>Cargando combos…</td></tr> : shown.length ? shown.map((combo) => { const regular = comboRegular(combo); const saved = regular - Number(combo.comboPrice); const timing = comboTiming(combo); return <tr key={combo.id}><td><strong>{combo.name}</strong></td><td><span className="combo-items-summary">{combo.items.map((item) => `${item.quantity}× ${productName(item)}`).join(" · ")}</span></td><td>{regular > 0 ? money.format(regular) : "Sin precio"}</td><td><strong>{money.format(Number(combo.comboPrice))}</strong></td><td className={saved > 0 ? "combo-saving" : "combo-no-saving"}>{regular > 0 ? money.format(saved) : "—"}</td><td>{combo.validFrom ? date.format(new Date(combo.validFrom)) : "Desde ahora"} – {combo.validUntil ? date.format(new Date(combo.validUntil)) : "Sin fin"}</td><td><StatusBadge tone={!combo.isActive ? "neutral" : timing === "expired" ? "danger" : timing === "upcoming" ? "warning" : "success"} label={!combo.isActive ? "Inactivo" : timing === "expired" ? "Vencido" : timing === "upcoming" ? "Programado" : "Vigente"} /></td><td className="table-actions"><button className="button ghost compact" type="button" onClick={() => open(combo)}>Editar</button><button className="button ghost compact" type="button" onClick={() => void toggle(combo)}>{combo.isActive ? "Desactivar" : "Activar"}</button></td></tr>; }) : <tr><td colSpan={8}>No hay combos para estos filtros.</td></tr>}</tbody></table></div>
      <TablePagination page={page} pageSize={PAGE_SIZE} total={filtered.length} label={`${filtered.length} combos`} onPrev={() => setPage((value) => value - 1)} onNext={() => setPage((value) => value + 1)} buttonClassName="button ghost" loading={loading} />
    </section>
    {editing !== undefined && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(undefined); }}><section className="modal combo-modal" role="dialog" aria-modal="true" aria-labelledby="combo-title"><header><div><span className="eyebrow">{editing ? "Editar" : "Alta"}</span><h2 id="combo-title">{editing ? editing.name : "Nuevo combo"}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setEditing(undefined)}>×</button></header><form onSubmit={submit} noValidate>
      {Object.keys(errors).some((key) => errors[key]) && <Notice kind="error" role="alert">Revisá los campos marcados.</Notice>}
      <div className="combo-form-layout"><div className="form-grid combo-form-grid">
        <label className="field"><span>Nombre</span><input value={form.name} maxLength={120} onChange={(event) => setField("name", event.target.value)} aria-invalid={Boolean(errors.name)} />{errors.name && <small className="field-error">{errors.name}</small>}</label>
        <label className="field"><span>Orden</span><input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => setField("sortOrder", event.target.value)} aria-invalid={Boolean(errors.sortOrder)} />{errors.sortOrder && <small className="field-error">{errors.sortOrder}</small>}</label>
        <label className="field field-wide"><span>Descripción</span><textarea rows={3} maxLength={2000} value={form.description} onChange={(event) => setField("description", event.target.value)} />{errors.description && <small className="field-error">{errors.description}</small>}</label>
        <fieldset className="combo-items-field field-wide"><legend>Productos del combo</legend><div className="combo-product-picker"><SearchSelect value={pickerId} options={products.filter((product) => !form.items.some((item) => item.productId === product.id))} onChange={(value) => { setPickerId(value); addProduct(value); }} onSearch={(value) => void productApi.listProducts({ query: value, status: "active" }).then((found) => setProducts((current) => [...current.filter((item) => !found.some((next) => next.id === item.id)), ...found]))} placeholder="Buscá por nombre, SKU o código" /></div>
          {form.items.length ? <div className="combo-item-list">{form.items.map((item) => { const product = productMap.get(item.productId); const price = prices[item.productId]; return <article key={item.productId}><div>{product?.imageUrl ? <img src={product.imageUrl} alt="" /> : <span className="combo-item-placeholder" aria-hidden="true">□</span>}<p><strong>{product?.name ?? `Producto #${item.productId}`}</strong><small>{price == null ? "Sin precio vigente" : `${money.format(price)} por unidad`}</small></p></div><label><span>Cantidad</span><input aria-label={`Cantidad de ${product?.name ?? item.productId}`} type="number" min="1" max="999" step="1" value={item.quantity} onChange={(event) => setQuantity(item.productId, event.target.value)} /></label><strong>{price == null ? "—" : money.format(price * Number(item.quantity || 0))}</strong><button className="button ghost compact" type="button" onClick={() => removeProduct(item.productId)}>Quitar</button></article>; })}</div> : <p className="combo-empty-items">Buscá y agregá productos. Podés usar dos distintos o dos unidades del mismo.</p>}{errors.items && <small className="field-error">{errors.items}</small>}
        </fieldset>
        <label className="field"><span>Inicio</span><input type="datetime-local" value={form.validFrom} onChange={(event) => setField("validFrom", event.target.value)} />{errors.validFrom && <small className="field-error">{errors.validFrom}</small>}</label>
        <label className="field"><span>Fin</span><input type="datetime-local" value={form.validUntil} onChange={(event) => setField("validUntil", event.target.value)} />{errors.validUntil && <small className="field-error">{errors.validUntil}</small>}</label>
        <label className="toggle-row field-wide"><input type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} /><span>Combo activo</span></label>
      </div><aside className="combo-side-panel"><section className="combo-price-preview" aria-live="polite"><span>Vista previa</span><dl><div><dt>Precio regular</dt><dd>{money.format(regularPrice)}</dd></div><div><dt>Precio combo</dt><dd><label className="sr-only" htmlFor="combo-price">Precio combo</label><input id="combo-price" type="number" min="0.01" step="0.01" value={form.comboPrice} onChange={(event) => setField("comboPrice", event.target.value)} aria-invalid={Boolean(errors.comboPrice)} placeholder="0,00" /></dd></div><div className={savings > 0 ? "positive" : ""}><dt>Ahorro</dt><dd>{hasComboPrice ? money.format(savings) : "—"}</dd></div></dl>{errors.comboPrice && <small className="field-error">{errors.comboPrice}</small>}<p>{regularPrice <= 0 ? "Agregá productos con precio vigente." : !hasComboPrice ? "Cargá el precio del combo para ver el ahorro." : savings <= 0 ? "La tienda ocultará el combo sin ahorro positivo." : `${Math.round((savings / regularPrice) * 100)}% menos por set completo.`}</p></section>
        <section className="combo-image-editor"><span>Imagen</span><div className={`combo-image-dropzone ${dragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={dropImage}>{imagePreview ? <img src={imagePreview} alt={`Vista previa de ${form.name || "combo"}`} /> : <div><strong>Arrastrá una imagen</strong><small>JPEG, PNG o WebP · máx. 5 MB</small></div>}<input ref={imageInput} className="sr-only" type="file" accept={PRODUCT_IMAGE_ACCEPT} onChange={(event) => chooseImage(event.target.files?.[0])} /></div><div className="combo-image-actions"><button className="button ghost compact" type="button" onClick={() => imageInput.current?.click()}>{imagePreview ? "Cambiar" : "Seleccionar"}</button>{imagePreview && <button className="button ghost compact" disabled={imagePending} type="button" onClick={() => void removeImage()}>Quitar</button>}</div>{errors.image && <small className="field-error">{errors.image}</small>}</section>
      </aside></div><footer><button className="button ghost" type="button" onClick={() => setEditing(undefined)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : "Guardar combo"}</button></footer>
    </form></section></div>}
  </main>;
}
