"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { categoryApi, categoryImageUrl } from "@/app/lib/category-api";
import type { CategoryImage, ManagedCategory } from "@/app/lib/category-contract";
import { buildCategoryTree, reorderCategoryImages, validateCategoryImage } from "@/app/lib/category-rules.js";

type CategoryRow = ManagedCategory & { depth: number };
type UploadItem = { key: string; name: string; progress: number; error: string; done: boolean };
const errorText = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

function ImagePlaceholder() {
  return <span className="category-thumb-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM7 15l3-3 3 3 2-2 3 3M9 9h.01" /></svg></span>;
}

export function CategoryManager() {
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<ManagedCategory | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", parentId: "", sortOrder: 0 });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", parentId: "", sortOrder: 0, isActive: true });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async (preferId?: string) => {
    setLoading(true); setLoadError("");
    try {
      const list = await categoryApi.list();
      setCategories(list);
      const nextId = preferId ?? selectedId;
      if (nextId && list.some((item) => item.id === nextId)) setSelectedId(nextId);
      else if (list[0]) setSelectedId(list[0].id);
      else { setSelectedId(""); setSelected(null); }
    } catch (cause) { setLoadError(errorText(cause, "No pudimos cargar las categorías.")); }
    finally { setLoading(false); }
  }, [selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true); setSaveError("");
    try {
      const item = await categoryApi.get(id);
      setSelected(item);
      setDraft({ name: item.name, parentId: item.parentId ?? "", sortOrder: item.sortOrder, isActive: item.isActive });
    } catch (cause) { setSaveError(errorText(cause, "No pudimos cargar el detalle.")); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { void loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedId) void loadDetail(selectedId); }, [selectedId, loadDetail]);

  const refresh = async (id = selectedId) => { await loadCategories(id); if (id) await loadDetail(id); };
  const tree = buildCategoryTree(categories) as CategoryRow[];
  const normalizedQuery = query.trim().toLocaleLowerCase("es-AR");
  const visible = normalizedQuery ? tree.filter((item) => item.name.toLocaleLowerCase("es-AR").includes(normalizedQuery)) : tree;

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setCreateError("");
    if (!createDraft.name.trim()) { setCreateError("Ingresá el nombre de la categoría."); return; }
    setCreating(true);
    try {
      const created = await categoryApi.create(createDraft);
      setCreateDraft({ name: "", parentId: "", sortOrder: 0 }); setShowCreate(false); setNotice("Categoría creada.");
      await refresh(created.id);
    } catch (cause) { setCreateError(errorText(cause, "No pudimos crear la categoría.")); }
    finally { setCreating(false); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected) return; setSaveError(""); setNotice("");
    if (!draft.name.trim()) { setSaveError("Ingresá el nombre de la categoría."); return; }
    setSaving(true);
    try { await categoryApi.update(selected.id, draft); setNotice("Cambios guardados."); await refresh(selected.id); }
    catch (cause) { setSaveError(errorText(cause, "No pudimos guardar los cambios.")); }
    finally { setSaving(false); }
  };

  const toggle = async (item: ManagedCategory) => {
    setPendingId(item.id); setLoadError("");
    try { await categoryApi.update(item.id, { isActive: !item.isActive }); await refresh(item.id); }
    catch (cause) { setLoadError(errorText(cause, "No pudimos cambiar el estado.")); }
    finally { setPendingId(""); }
  };

  const uploadFiles = async (files: File[]) => {
    if (!selected) return;
    const batch = files.map((file, index) => ({ file, key: `${Date.now()}-${index}-${file.name}`, validation: validateCategoryImage(file) }));
    setUploads(batch.map(({ file, key, validation }) => ({ key, name: file.name, progress: 0, error: validation, done: false })));
    await Promise.all(batch.map(async ({ file, key, validation }) => {
      if (validation) return;
      try {
        await categoryApi.uploadImage(selected.id, file, undefined, (progress) => setUploads((current) => current.map((item) => item.key === key ? { ...item, progress } : item)));
        setUploads((current) => current.map((item) => item.key === key ? { ...item, progress: 100, done: true } : item));
      } catch (cause) { setUploads((current) => current.map((item) => item.key === key ? { ...item, error: errorText(cause, "No se pudo subir."), done: false } : item)); }
    }));
    await refresh(selected.id);
  };

  const updateImage = async (image: CategoryImage, patch: { altText?: string | null; isPrimary?: boolean }) => {
    if (!selected) return; setPendingId(image.id); setSaveError("");
    try { await categoryApi.updateImage(selected.id, image.id, patch); await refresh(selected.id); }
    catch (cause) { setSaveError(errorText(cause, "No pudimos actualizar la imagen.")); }
    finally { setPendingId(""); }
  };
  const removeImage = async (image: CategoryImage) => {
    if (!selected || !window.confirm("¿Eliminar esta imagen? Esta acción no se puede deshacer.")) return;
    setPendingId(image.id);
    try { await categoryApi.deleteImage(selected.id, image.id); await refresh(selected.id); }
    catch (cause) { setSaveError(errorText(cause, "No pudimos eliminar la imagen.")); }
    finally { setPendingId(""); }
  };
  const moveImage = async (from: number, to: number) => {
    if (!selected || from === to || to < 0 || to >= selected.images.length) return;
    const previous = selected.images;
    const next = reorderCategoryImages(previous, from, to) as CategoryImage[];
    setSelected({ ...selected, images: next });
    try { await categoryApi.orderImages(selected.id, next.map((item) => item.id)); await refresh(selected.id); }
    catch (cause) { setSelected({ ...selected, images: previous }); setSaveError(errorText(cause, "No pudimos reordenar las imágenes.")); }
  };

  return <section className="workspace category-workspace">
    <header className="topbar category-topbar"><div><p className="eyebrow">CATÁLOGO / PRODUCTOS</p><h1>Categorías</h1><p className="subtitle">Organizá categorías, subcategorías e imágenes del catálogo.</p></div><nav className="category-section-tabs" aria-label="Secciones de productos"><Link href="/productos">Productos</Link><Link href="/productos/categorias" className="active" aria-current="page">Categorías</Link></nav></header>
    {notice && <p className="notice success" role="status">{notice}</p>}
    {loadError && <div className="notice error" role="alert">{loadError} <button type="button" className="link-button" onClick={() => void loadCategories()}>Reintentar</button></div>}
    <div className="category-manager">
      <aside className="category-list-panel" aria-label="Listado de categorías">
        <header><label className="category-search"><span className="sr-only">Buscar categorías</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar categorías…" /></label><button type="button" className="button primary" onClick={() => setShowCreate((value) => !value)} aria-expanded={showCreate}>Nueva categoría</button></header>
        {showCreate && <form className="category-create" onSubmit={create}><label className="field"><span>Nombre</span><input autoFocus maxLength={120} value={createDraft.name} onChange={(event) => setCreateDraft({ ...createDraft, name: event.target.value })}/></label><label className="field"><span>Categoría superior (opcional)</span><select value={createDraft.parentId} onChange={(event) => setCreateDraft({ ...createDraft, parentId: event.target.value })}><option value="">Sin categoría superior</option>{tree.map((item) => <option key={item.id} value={item.id}>{"— ".repeat(item.depth)}{item.name}</option>)}</select></label><label className="field"><span>Orden</span><input type="number" min="0" value={createDraft.sortOrder} onChange={(event) => setCreateDraft({ ...createDraft, sortOrder: Number(event.target.value) })}/></label>{createError && <small className="field-error" role="alert">{createError}</small>}<div><button type="button" className="button ghost" onClick={() => setShowCreate(false)}>Cancelar</button><button className="button primary" disabled={creating}>{creating ? "Creando…" : "Crear"}</button></div></form>}
        <div className="category-list" aria-live="polite">{loading ? <p className="category-list-state">Cargando categorías…</p> : visible.length === 0 ? <p className="category-list-state">No encontramos categorías.</p> : visible.map((item) => { const primary = item.images.find((value) => value.isPrimary) ?? item.images[0]; return <article key={item.id} className={selectedId === item.id ? "selected" : ""} style={{ "--category-depth": item.depth } as React.CSSProperties}><button type="button" className="category-row-main" onClick={() => setSelectedId(item.id)} aria-pressed={selectedId === item.id}>{primary || item.imageUrl ? <img src={categoryImageUrl(primary?.url ?? item.imageUrl)} alt=""/> : <ImagePlaceholder/>}<span><strong>{item.name}</strong><small>{item.images.length} {item.images.length === 1 ? "imagen" : "imágenes"}</small></span><span className={`status ${item.isActive ? "active" : "inactive"}`}>{item.isActive ? "Activa" : "Inactiva"}</span></button><button type="button" className="category-status-button" disabled={pendingId === item.id} onClick={() => void toggle(item)} aria-label={`${item.isActive ? "Desactivar" : "Activar"} ${item.name}`}>{pendingId === item.id ? "…" : item.isActive ? "Desactivar" : "Activar"}</button></article>; })}</div>
      </aside>
      <main className="category-detail-panel">{!selectedId ? <div className="category-empty"><ImagePlaceholder/><strong>Creá tu primera categoría</strong><span>Después vas a poder agregar subcategorías e imágenes.</span></div> : detailLoading && !selected ? <div className="category-empty">Cargando detalle…</div> : selected ? <>
        <form className="category-detail-form" onSubmit={save}><header><div><p className="eyebrow">DETALLE</p><h2>{selected.name}</h2>{selected.productCount !== undefined && <small>{selected.productCount} productos asociados</small>}</div><button className="button primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button></header><div className="category-fields"><label className="field"><span>Nombre</span><input maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label><label className="field"><span>Categoría superior</span><select value={draft.parentId} onChange={(event) => setDraft({ ...draft, parentId: event.target.value })}><option value="">Sin categoría superior</option>{tree.filter((item) => item.id !== selected.id).map((item) => <option key={item.id} value={item.id}>{"— ".repeat(item.depth)}{item.name}</option>)}</select></label><label className="field"><span>Orden</span><input type="number" min="0" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })}/></label><label className="category-active"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}/><span><strong>Categoría activa</strong><small>Visible y disponible para productos.</small></span></label></div>{saveError && <p className="field-error" role="alert">{saveError}</p>}</form>
        <section className="category-images" aria-labelledby="category-images-title"><header><div><h3 id="category-images-title">Imágenes</h3><p>JPG, PNG o WebP · hasta 5 MB por archivo</p></div><button type="button" className="button secondary" onClick={() => fileInput.current?.click()}>Subir imágenes</button><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { void uploadFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }}/></header><button type="button" className="category-dropzone" onClick={() => fileInput.current?.click()} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add("dragging"); }} onDragLeave={(event) => event.currentTarget.classList.remove("dragging")} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove("dragging"); void uploadFiles(Array.from(event.dataTransfer.files)); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5"/></svg><strong>Arrastrá imágenes acá</strong><span>o hacé clic para seleccionarlas</span></button>
        {uploads.length > 0 && <ul className="category-upload-list" aria-label="Estado de cargas">{uploads.map((item) => <li key={item.key} className={item.error ? "error" : ""}><span><strong>{item.name}</strong><small>{item.error || item.done ? item.error || "Lista" : `Subiendo… ${item.progress}%`}</small></span><progress value={item.progress} max="100" aria-label={`Progreso de ${item.name}`}/></li>)}</ul>}
        {selected.images.length === 0 ? <p className="category-no-images">Todavía no hay imágenes en esta categoría.</p> : <div className="category-image-grid">{selected.images.map((item, index) => <article key={item.id} draggable onDragStart={() => setDragging(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragging !== null) void moveImage(dragging, index); setDragging(null); }}><div className="category-image-preview"><img src={categoryImageUrl(item.url)} alt={item.altText ?? ""}/>{item.isPrimary && <span>Principal</span>}</div><label className="field"><span>Texto alternativo</span><input defaultValue={item.altText ?? ""} maxLength={160} onBlur={(event) => { const next = event.currentTarget.value.trim(); if (next !== (item.altText ?? "")) void updateImage(item, { altText: next || null }); }}/></label><div className="category-image-actions"><button type="button" className="button ghost" disabled={index === 0 || pendingId === item.id} onClick={() => void moveImage(index, index - 1)} aria-label={`Mover ${item.altText || `imagen ${index + 1}`} a la izquierda`}>←</button><button type="button" className="button ghost" disabled={index === selected.images.length - 1 || pendingId === item.id} onClick={() => void moveImage(index, index + 1)} aria-label={`Mover ${item.altText || `imagen ${index + 1}`} a la derecha`}>→</button>{!item.isPrimary && <button type="button" className="link-button" disabled={pendingId === item.id} onClick={() => void updateImage(item, { isPrimary: true })}>Marcar como principal</button>}<button type="button" className="link-button danger-text" disabled={pendingId === item.id} onClick={() => void removeImage(item)}>Eliminar</button></div></article>)}</div>}
        </section>
      </> : <div className="category-empty"><strong>No pudimos mostrar la categoría.</strong><button className="button secondary" onClick={() => void loadDetail(selectedId)}>Reintentar</button></div>}</main>
    </div>
  </section>;
}
