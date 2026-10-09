import type { AuditFilters, AuditLog, AuditPage } from './audit-contract';
export const entityLabels: Record<string, string> = { order: 'Pedido', product: 'Producto', price: 'Precio', stock: 'Stock', inventory: 'Inventario', user: 'Usuario', treasury: 'Tesorería', treasury_movement: 'Movimiento de tesorería', supplier_invoice: 'Factura de proveedor', supplier_payment: 'Pago a proveedor', expense: 'Gasto', payment_method: 'Medio de pago', inventory_count: 'Conteo físico', delivery_assignment: 'Asignación de repartidor' };
const verbs: Record<string, string> = { created: 'Alta', updated: 'Actualización', deleted: 'Eliminación', adjusted: 'Ajuste', transferred: 'Transferencia', status_changed: 'Cambio de estado', payment_updated: 'Pago actualizado', refunded: 'Reintegro', role_changed: 'Cambio de rol', password_reset: 'Restablecimiento de contraseña', movement_created: 'Movimiento registrado', toggled: 'Cambio de disponibilidad', applied: 'Aplicación', cancelled: 'Cancelación', voided: 'Anulación', assigned: 'Asignación', driver_assigned: 'Repartidor asignado' };
export function actionLabel(action: string): string { const [entity, verb] = action.split('.'); return entityLabels[entity] && verbs[verb] ? `${entityLabels[entity]} · ${verbs[verb]}` : action; }
export function changeValue(value: unknown): string { return value === null ? 'Sin valor' : value === undefined ? '—' : typeof value === 'boolean' ? value ? 'Sí' : 'No' : typeof value === 'object' ? JSON.stringify(value) : String(value); }
export function auditQuery(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && String(value).trim()) params.set(key, String(value).trim());
  return params;
}
export function filterAuditLogs(logs: AuditLog[], filters: AuditFilters): AuditPage {
  const query = filters.q?.trim().toLocaleLowerCase('es-AR');
  const items = logs.filter(log => (!filters.from || log.createdAt >= filters.from) && (!filters.to || log.createdAt <= filters.to) && (!filters.actorUserId || log.actorUserId === filters.actorUserId) && (!filters.entityType || log.entityType === filters.entityType) && (!filters.entityId || log.entityId === filters.entityId) && (!filters.action || log.action === filters.action) && (!query || `${log.summary} ${log.actorEmail ?? ''} ${log.action} ${log.entityType} ${log.entityId}`.toLocaleLowerCase('es-AR').includes(query))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = Math.max(1, filters.page ?? 1), pageSize = Math.max(1, filters.pageSize ?? 20);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
}
/** Local date boundaries include the entire selected day, expressed as UTC instants. */
export function auditDateBoundary(date: string, end = false): string | undefined { return date ? new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}`).toISOString() : undefined; }
