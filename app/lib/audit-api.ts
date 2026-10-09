import { apiBaseUrl, fixturesEnabled } from './api-mode';
import { authFetch } from './http';
import type { AuditFilters, AuditLog, AuditPage } from './audit-contract';
import { auditQuery, filterAuditLogs } from './audit-rules';
const fixtures: AuditLog[] = [
  { id: '3', createdAt: '2026-10-09T14:00:00.000Z', actorUserId: '1', actorEmail: 'admin@superx.local', actorRole: 'admin', action: 'product.updated', entityType: 'product', entityId: '1', summary: 'Actualización de Leche 1L', changes: { name: { from: 'Leche', to: 'Leche 1L' }, active: { from: false, to: true } }, ip: null },
  { id: '2', createdAt: '2026-10-09T13:00:00.000Z', actorUserId: '1', actorEmail: 'admin@superx.local', actorRole: 'admin', action: 'order.status_changed', entityType: 'order', entityId: '1', summary: 'Pedido confirmado', changes: { status: { from: 'CREATED', to: 'CONFIRMED' } }, ip: null },
  { id: '1', createdAt: '2026-10-08T12:00:00.000Z', actorUserId: null, actorEmail: null, actorRole: null, action: 'stock.adjusted', entityType: 'product', entityId: '1', summary: 'Ajuste de stock de Leche 1L', changes: null, ip: null },
];
export const auditApi = {
  async list(filters: AuditFilters = {}, signal?: AbortSignal): Promise<AuditPage> {
    if (fixturesEnabled()) return filterAuditLogs(fixtures, filters);
    const response = await authFetch(`${apiBaseUrl()!.replace(/\/$/, '')}/audit-logs?${auditQuery(filters)}`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(response.status === 403 ? 'Tu cuenta no tiene acceso a auditoría.' : response.status === 401 ? 'Iniciá sesión para consultar la auditoría.' : 'No pudimos cargar el registro de auditoría.');
    const page = await response.json() as AuditPage;
    return { ...page, items: page.items.map(log => ({ ...log, id: String(log.id), entityId: String(log.entityId), actorUserId: log.actorUserId == null ? null : String(log.actorUserId) })) };
  },
};
