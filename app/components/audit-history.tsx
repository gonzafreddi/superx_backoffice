'use client';
import { useEffect, useState } from 'react';
import { getStoredUser } from '@/app/lib/auth-api';
import { can } from '@/app/lib/permissions';
import { auditApi } from '@/app/lib/audit-api';
import type { AuditFilters, AuditPage } from '@/app/lib/audit-contract';
import { actionLabel, auditDateBoundary, changeValue, entityLabels } from '@/app/lib/audit-rules';
import { Notice } from './ui/notice';
import { TablePagination } from './ui/table-pagination';
import { StatusBadge } from './ui/status-badge';

export function EntityAuditHistory({ entityType, entityId }: { entityType: string; entityId: string }) {
  return <AuditWorkspace key={`${entityType}:${entityId}`} entityType={entityType} entityId={entityId} />;
}
export function AuditWorkspace({ entityType, entityId }: { entityType?: string; entityId?: string }) {
  const [allowed, setAllowed] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [draft, setDraft] = useState({ from: '', to: '', actorUserId: '', entityType: '', q: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const permitted = can(getStoredUser()?.role, 'audit.read');
    const controller = new AbortController();
    // Synchronize the request state with the current filters and session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(permitted);
    if (!permitted) return () => controller.abort();
    setLoading(true); setError(''); setData(null);
    auditApi.list({ ...filters, ...(entityType ? { entityType, entityId } : {}), page, pageSize: 20 }, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No pudimos cargar el historial.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, entityType, entityId, page, retry]);
  if (!allowed) return entityType ? null : <Notice kind="info">El registro de auditoría está disponible para administración y contabilidad.</Notice>;
  const update = (key: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  return <section className="order-section-card audit-section" aria-label={entityType ? 'Historial de cambios' : 'Auditoría'}>
    {entityType && <h2>Historial de cambios</h2>}
    {!entityType && <form className="audit-filters" onSubmit={event => { event.preventDefault(); if (draft.from && draft.to && draft.from > draft.to) { setError('La fecha desde no puede ser posterior a la fecha hasta.'); return; } setFilters({ ...draft, from: auditDateBoundary(draft.from), to: auditDateBoundary(draft.to, true) }); setPage(1); }}>
      <label>Fecha desde<input type="date" value={draft.from} onChange={event => update('from', event.target.value)} /></label>
      <label>Fecha hasta<input type="date" value={draft.to} onChange={event => update('to', event.target.value)} /></label>
      <label>Usuario (ID)<input value={draft.actorUserId} onChange={event => update('actorUserId', event.target.value)} placeholder="ID del usuario" /></label>
      <label>Tipo de entidad<select value={draft.entityType} onChange={event => update('entityType', event.target.value)}><option value="">Todas</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Buscar texto<input type="search" value={draft.q} onChange={event => update('q', event.target.value)} placeholder="Resumen o acción" /></label>
      <button className="button primary" type="submit">Filtrar</button><button className="button secondary" type="button" onClick={() => { setDraft({ from: '', to: '', actorUserId: '', entityType: '', q: '' }); setFilters({}); setPage(1); }}>Limpiar</button>
    </form>}
    <button className="button secondary" type="button" disabled={loading} onClick={() => setRetry(value => value + 1)}>Actualizar historial</button>
    {error && <Notice kind="error" role="alert">{error} <button className="button secondary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></Notice>}
    {loading && <Notice kind="info">Cargando historial…</Notice>}
    {!loading && !error && data?.total === 0 && <Notice kind="info">No hay cambios registrados para esta consulta.</Notice>}
    {data && data.items.length > 0 && <div className="audit-table-wrap"><table className="erp-table audit-table"><thead><tr>{['Fecha', 'Usuario', 'Acción', 'Entidad', 'Resumen y cambios'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.items.map(log => <tr key={log.id}>
      <td data-label="Fecha"><time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString('es-AR')}</time></td>
      <td data-label="Usuario">{log.actorEmail ?? (log.actorUserId ? `Usuario #${log.actorUserId}` : 'Sistema')}{log.actorRole && <small> · {log.actorRole}</small>}</td>
      <td data-label="Acción"><StatusBadge tone="info" label={actionLabel(log.action)} /></td>
      <td data-label="Entidad">{entityLabels[log.entityType] ?? log.entityType} #{log.entityId}</td>
      <td data-label="Resumen"><p>{log.summary}</p><details><summary>Ver cambios</summary>{log.changes && Object.keys(log.changes).length ? <dl>{Object.entries(log.changes).map(([field, change]) => <div key={field}><dt>{field}</dt><dd><span>Antes: {changeValue(change.from)}</span><br /><span>Después: {changeValue(change.to)}</span></dd></div>)}</dl> : <p>Sin detalle de campos.</p>}</details></td>
    </tr>)}</tbody></table></div>}
    {data && !error && <TablePagination page={data.page} pageSize={data.pageSize} total={data.total} label={`Página ${data.page} · ${data.total} registros`} onPrev={() => setPage(value => value - 1)} onNext={() => setPage(value => value + 1)} buttonClassName="button secondary" buttonType="button" loading={loading} />}
  </section>;
}
