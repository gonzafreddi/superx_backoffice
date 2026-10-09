"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredUser } from "@/app/lib/auth-api";
import { can } from "@/app/lib/permissions";
import { inventoryCountApi } from "@/app/lib/inventory-count-api";
import { locationApi } from "@/app/lib/location-api";
import { countPatches, countSummary, findScanLine, parseCountQuantity } from "@/app/lib/inventory-count-rules";
import type { CountEdit, InventoryCount } from "@/app/lib/inventory-count-contract";
import { Notice } from "@/app/components/ui/notice";
import { TablePagination } from "@/app/components/ui/table-pagination";
import { CountBadge } from "./count-ui";
import "./counts.css";

export function CountDetail({ id }: { id: string }) {
  const [count, setCount] = useState<InventoryCount | null>(null), [edits, setEdits] = useState<Record<string, CountEdit>>({});
  const [query, setQuery] = useState(""), [scan, setScan] = useState(""), [page, setPage] = useState(1), [highlight, setHighlight] = useState("");
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [writable, setWritable] = useState(false), [confirm, setConfirm] = useState<"apply" | "cancel" | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { if (!can(getStoredUser()?.role, "inventoryCounts.read")) throw new Error("No tenés permiso para consultar conteos."); setWritable(can(getStoredUser()?.role, "inventoryCounts.write")); setCount(await inventoryCountApi.get(id)); }
    catch (error) { setError(error instanceof Error ? error.message : "No se pudo cargar el conteo."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => { if (!Object.keys(edits).length) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [edits]);
  const editable = writable && count?.status === "DRAFT";
  useEffect(() => { if (editable && !confirm) scanRef.current?.focus({ preventScroll: true }); }, [editable, confirm]);
  async function save() {
    if (!count) return;
    const patches = countPatches(count.lines, edits);
    const updated = patches.length ? await inventoryCountApi.save(id, patches) : count;
    setCount(updated); setEdits({}); setMessage("Borrador guardado."); return updated;
  }
  async function scanProduct() {
    if (!count || !scan.trim() || pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      let updated = count; let line = findScanLine(count.lines, scan);
      if (!line) {
        const products = await locationApi.searchProducts(scan.trim());
        const product = products.find(product => product.barcode === scan.trim() || product.sku === scan.trim());
        if (!product) throw new Error("Código no encontrado. Buscá por nombre o revisá el código de barras.");
        updated = await inventoryCountApi.addLine(id, product.id); setCount(updated); line = updated.lines.find(item => item.productId === product.id);
      }
      if (line) { setQuery(""); const index = updated.lines.findIndex(item => item.productId === line!.productId); setPage(Math.floor(index / 20) + 1); setHighlight(line.productId); setMessage(`${line.productName}: línea seleccionada. Ingresá la cantidad contada.`); requestAnimationFrame(() => document.getElementById(`count-line-${line!.productId}`)?.scrollIntoView({ block: "center", behavior: "smooth" })); }
      setScan("");
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo escanear."); }
    finally { setPending(false); requestAnimationFrame(() => scanRef.current?.focus({ preventScroll: true })); }
  }
  if (loading) return <section className="workspace"><p role="status">Cargando conteo…</p></section>;
  if (!count) return <section className="workspace"><Notice kind="error">{error}</Notice><button className="button secondary" onClick={() => void load()}>Reintentar</button><Link href="/inventario/conteos">Volver a conteos</Link></section>;
  const displayLines = count.lines.map(line => { const edit = edits[line.productId]; if (!edit) return line; let quantity = line.countedQuantity; try { quantity = parseCountQuantity(edit.quantity); } catch { /* Inline validation below. */ } return { ...line, countedQuantity: quantity, reason: edit.reason }; });
  const summary = countSummary(displayLines);
  const visible = displayLines.filter(line => [line.productName, line.sku, line.barcode].some(value => value?.toLocaleLowerCase("es-AR").includes(query.trim().toLocaleLowerCase("es-AR"))));
  const dirty = Object.keys(edits).length > 0;
  function editLine(productId: string, key: keyof CountEdit, value: string) {
    const line = count!.lines.find(line => line.productId === productId)!;
    setEdits(current => ({ ...current, [productId]: { ...(current[productId] ?? { quantity: line.countedQuantity == null ? "" : String(line.countedQuantity), reason: line.reason ?? "" }), [key]: value } })); setMessage("");
  }
  return <section className="workspace count-workspace"><header className="topbar"><div><p className="eyebrow">INVENTARIO / CONTEO</p><h1>{count.code}</h1><p className="subtitle">Depósito #{count.warehouseId}{count.locationId ? ` · Ubicación #${count.locationId}` : ""}</p><CountBadge status={count.status} /></div><Link className="button secondary" href="/inventario/conteos" onClick={event => { if (dirty && !window.confirm("Hay cambios sin guardar. ¿Salir del conteo?")) event.preventDefault(); }}>Volver a conteos</Link></header>
    {count.note && <p>{count.note}</p>}{error && <Notice kind="error" role="alert">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <div className="count-summary" aria-live="polite"><span><strong>{summary.counted}/{count.lines.length}</strong> líneas contadas</span><span><strong>{summary.changed}</strong> con diferencia</span><span><strong>+{summary.positive} / {summary.negative}</strong> unidades</span></div>
    <p className="permission-note">Las diferencias comparan contra el stock al iniciar el conteo. Al aplicar, se ajusta contra el stock físico actual. Las líneas sin contar se omiten.</p>
    {editable && <form className="count-scan" onSubmit={event => { event.preventDefault(); void scanProduct(); }}><label className="field"><span>Escanear código de barras o SKU</span><input ref={scanRef} autoComplete="off" value={scan} onChange={event => setScan(event.target.value)} onBlur={event => { if (!event.relatedTarget && !confirm) requestAnimationFrame(() => scanRef.current?.focus({ preventScroll: true })); }} /></label><button className="button secondary" disabled={pending || !scan.trim()}>Buscar / agregar</button></form>}
    <label className="field"><span>Buscar producto</span><input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
    <div className="count-table count-lines"><table><thead><tr><th>Producto</th><th>Sistema</th><th>Contado</th><th>Diferencia</th><th>Motivo</th></tr></thead><tbody>{visible.slice((page - 1) * 20, page * 20).map(line => {
      const quantity = edits[line.productId]?.quantity ?? (line.countedQuantity == null ? "" : String(line.countedQuantity));
      let invalid = ""; try { parseCountQuantity(quantity); } catch (error) { invalid = (error as Error).message; }
      const difference = invalid || line.countedQuantity === null ? null : line.countedQuantity - line.systemQuantity;
      return <tr key={line.productId} id={`count-line-${line.productId}`} className={highlight === line.productId ? "count-highlight" : ""}><td data-label="Producto"><strong>{line.productName}</strong><small>{line.sku} · {line.barcode ?? "Sin código de barras"}</small></td><td data-label="Sistema">{line.systemQuantity}</td><td data-label="Contado">{editable ? <label className="field"><span className="sr-only">Cantidad contada de {line.productName}</span><input className="count-quantity" inputMode="numeric" type="text" pattern="[0-9]*" value={quantity} disabled={pending} aria-invalid={Boolean(invalid)} aria-describedby={invalid ? `error-${line.productId}` : undefined} onChange={event => editLine(line.productId, "quantity", event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); scanRef.current?.focus({ preventScroll: true }); } }} />{invalid && <small id={`error-${line.productId}`} role="alert">{invalid}</small>}</label> : line.countedQuantity ?? "Sin contar"}</td><td data-label="Diferencia"><strong className={difference ? "count-difference" : ""}>{difference === null ? "—" : `${difference > 0 ? "+" : ""}${difference}`}</strong></td><td data-label="Motivo">{editable ? <label className="field"><span className="sr-only">Motivo de {line.productName}</span><input maxLength={80} value={edits[line.productId]?.reason ?? line.reason ?? ""} disabled={pending} onChange={event => editLine(line.productId, "reason", event.target.value)} /></label> : line.reason ?? "—"}</td></tr>;
    })}</tbody></table>{!visible.length && <p className="state">No hay líneas con esta búsqueda.</p>}</div>
    <TablePagination page={page} pageSize={20} total={visible.length} label={`${visible.length} líneas`} buttonClassName="button secondary" onPrev={() => setPage(value => value - 1)} onNext={() => setPage(value => value + 1)} />
    {editable && <footer className="count-actions"><span role="status">{dirty ? "Cambios sin guardar" : "Sin cambios pendientes"}</span><button className="button primary" disabled={pending || !dirty} onClick={async () => { setPending(true); setError(""); try { await save(); } catch (error) { setError(error instanceof Error ? error.message : "No se pudo guardar."); } finally { setPending(false); } }}>Guardar borrador</button><button className="button secondary" disabled={pending || !summary.counted} onClick={() => setConfirm("apply")}>Aplicar ajustes</button><button className="button ghost" disabled={pending} onClick={() => setConfirm("cancel")}>Cancelar conteo</button></footer>}
    {confirm && <div className="modal-backdrop"><section className="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="count-confirm-title"><h2 id="count-confirm-title">{confirm === "apply" ? "¿Aplicar ajustes?" : "¿Cancelar conteo?"}</h2><p>{confirm === "apply" ? `Se guardará el borrador y se aplicarán ${summary.counted} líneas contadas. El ajuste se calcula contra el stock físico actual y el conteo quedará cerrado.` : "El conteo quedará cancelado y no modificará stock. Los cambios sin guardar se descartarán."}</p><footer><button className="button secondary" disabled={pending} onClick={() => setConfirm(null)}>Volver</button><button autoFocus className="button primary" disabled={pending} onClick={async () => { setPending(true); setError(""); try { if (confirm === "apply") await save(); setCount(await inventoryCountApi.close(id, confirm)); setEdits({}); setConfirm(null); setMessage(confirm === "apply" ? "Conteo aplicado." : "Conteo cancelado."); } catch (error) { setError(error instanceof Error ? error.message : "No se pudo cerrar el conteo."); setConfirm(null); } finally { setPending(false); } }}>{pending ? "Procesando…" : "Confirmar"}</button></footer></section></div>}
  </section>;
}
