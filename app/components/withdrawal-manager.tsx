"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { withdrawalApi } from "@/app/lib/withdrawal-api";
import type { WithdrawalPage, WithdrawalRequest, WithdrawalStatus } from "@/app/lib/withdrawal-contract";
import { withdrawalStatuses, validateWithdrawalUpdate } from "@/app/lib/withdrawal-rules";
import { Notice } from "./ui/notice";
const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const label = (status: WithdrawalStatus) => withdrawalStatuses.find(([value]) => value === status)?.[1];
export function WithdrawalManager() {
  const [status, setStatus] = useState<WithdrawalStatus | "">(""), [page, setPage] = useState(1);
  const [result, setResult] = useState<WithdrawalPage>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [success, setSuccess] = useState(""), [selected, setSelected] = useState<WithdrawalRequest | null>(null);
  const version = useRef(0);
  const load = useCallback(async () => {
    const current = ++version.current; setLoading(true); setError("");
    try { const data = await withdrawalApi.list({ status, page, pageSize: 20 }); if (current === version.current) { setResult(data); if (page > 1 && !data.items.length) setPage(Math.max(1, Math.ceil(data.total / data.pageSize))); } }
    catch (cause) { if (current === version.current) setError(cause instanceof Error ? cause.message : "No pudimos cargar las solicitudes."); }
    finally { if (current === version.current) setLoading(false); }
  }, [status, page]);
  useEffect(() => { const requests = version; const timer = setTimeout(() => void load(), 0); return () => { clearTimeout(timer); requests.current++; }; }, [load]);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return <section className="workspace"><header className="topbar"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Arrepentimientos</h1><p className="subtitle">Gestioná las solicitudes de devolución y reintegro.</p></div></header>
    {error && <Notice kind="error" role="alert">{error}<button className="button ghost" onClick={() => void load()}>Reintentar</button></Notice>}
    {success && <Notice kind="success" onDismiss={() => setSuccess("")}>{success}</Notice>}
    <section className="locations-filter-bar"><label className="field"><span>Estado</span><select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}><option value="">Todos los estados</option>{withdrawalStatuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label></section>
    <section className="location-table-panel"><header><h2>{result.total} solicitudes</h2></header>{loading ? <div className="state">Cargando solicitudes…</div> : error ? <div className="state">No pudimos cargar el listado.</div> : <div className="location-table-wrap"><table className="location-stock-table"><thead><tr><th>Código</th><th>Persona</th><th>Pedido</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>{!result.items.length && <tr><td colSpan={6}>No hay solicitudes con estos filtros.</td></tr>}{result.items.map((item) => <tr key={item.id}><td data-label="Código"><strong>{item.code}</strong></td><td data-label="Persona">{item.fullName}<small>{item.email}</small></td><td data-label="Pedido">{item.orderNumber || "—"}</td><td data-label="Estado">{label(item.status)}</td><td data-label="Fecha">{date.format(new Date(item.createdAt))}</td><td data-label="Acciones"><button className="button ghost" onClick={() => setSelected(item)}>Ver detalle</button></td></tr>)}</tbody></table></div>}</section>
    <nav className="user-management-actions" aria-label="Paginación"><button className="button ghost" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="button ghost" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button></nav>
    {selected && <WithdrawalDialog item={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setSuccess("Solicitud actualizada."); void load(); }} />}
  </section>;
}
function WithdrawalDialog({ item, onClose, onSaved }: { item: WithdrawalRequest; onClose: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), lock = useRef(false);
  const [status, setStatus] = useState(item.status), [note, setNote] = useState(item.resolutionNote ?? ""), [saving, setSaving] = useState(false), [error, setError] = useState("");
  useEffect(() => { const trigger = document.activeElement; const dialog = ref.current; dialog?.showModal(); return () => { dialog?.close(); if (trigger instanceof HTMLElement) trigger.focus(); }; }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (lock.current) return;
    const input = { status, resolutionNote: note.trim() }; const message = validateWithdrawalUpdate(input);
    if (message) { setError(message); return; }
    lock.current = true; setSaving(true); setError("");
    try { await withdrawalApi.update(item.id, input); onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar la solicitud."); } finally { lock.current = false; setSaving(false); }
  };
  return <dialog ref={ref} className="modal catalog-entity-modal user-create-modal" aria-labelledby="withdrawal-title" onCancel={(e) => { if (saving) e.preventDefault(); else onClose(); }}><header><h2 id="withdrawal-title">{item.code}</h2><button className="icon-button" aria-label="Cerrar" disabled={saving} onClick={onClose}>×</button></header>
    <dl className="withdrawal-details">{[["Nombre", item.fullName], ["Email", item.email], ["Teléfono", item.phone], ["Pedido", item.orderNumber], ["Motivo", item.reason], ["Fecha de solicitud", date.format(new Date(item.createdAt))], ["Fecha de resolución", item.resolvedAt ? date.format(new Date(item.resolvedAt)) : null]].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || "—"}</dd></div>)}</dl>
    <form onSubmit={(e) => void submit(e)} aria-busy={saving}>{error && <Notice kind="error" role="alert">{error}</Notice>}<label className="field"><span>Estado</span><select autoFocus value={status} disabled={saving} onChange={(e) => setStatus(e.target.value as WithdrawalStatus)}>{withdrawalStatuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><label className="field"><span>Nota de resolución (opcional)</span><textarea value={note} rows={5} maxLength={1000} disabled={saving} onChange={(e) => setNote(e.target.value)} /></label><p className="catalog-entity-help">Hasta 1000 caracteres. Para borrar una nota, dejá el campo vacío.</p><footer><button type="button" className="button ghost" disabled={saving} onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button></footer></form></dialog>;
}
