import test from 'node:test';
import assert from 'node:assert/strict';
import { actionLabel, auditDateBoundary, auditQuery, changeValue, filterAuditLogs } from '../app/lib/audit-rules';
import type { AuditLog } from '../app/lib/audit-contract';
const log: AuditLog = { id: '9007199254740993', createdAt: '2026-10-09T14:00:00.000Z', actorUserId: '2', actorEmail: 'a@test.local', actorRole: 'admin', action: 'product.updated', entityType: 'product', entityId: '8', summary: 'Leche actualizada', changes: null, ip: null };
test('audit query preserves identifiers, encodes text and omits empty filters', () => {
  const query = auditQuery({ actorUserId: log.id, entityId: '8', q: ' leche & pan ', from: '', page: 2 });
  assert.equal(query.get('actorUserId'), log.id); assert.equal(query.get('q'), 'leche & pan'); assert.equal(query.has('from'), false); assert.equal(query.get('page'), '2');
});
test('fixtures filter every contract field and paginate newest first', () => {
  const logs = [log, { ...log, id: '2', createdAt: '2026-10-08T14:00:00.000Z' }, { ...log, id: '3', entityId: '9' }];
  assert.equal(filterAuditLogs(logs, { entityType: 'product', entityId: '8', actorUserId: '2', action: 'product.updated', q: 'LECHE', from: '2026-10-09T00:00:00.000Z', to: '2026-10-09T23:59:59.999Z' }).total, 1);
  assert.equal(filterAuditLogs(logs, { entityType: 'order' }).total, 0);
  assert.equal(filterAuditLogs(logs, { page: 3, pageSize: 1 }).items[0].id, '2');
  assert.equal(filterAuditLogs(logs, { actorUserId: '99' }).total, 0);
  assert.equal(filterAuditLogs(logs, { action: 'order.refunded' }).total, 0);
});
test('labels preserve unknown actions and changes include null, false, zero and nested data', () => {
  assert.equal(actionLabel('product.updated'), 'Producto · Actualización'); assert.equal(actionLabel('future.event'), 'future.event');
  assert.equal(changeValue(null), 'Sin valor'); assert.equal(changeValue(false), 'No'); assert.equal(changeValue(0), '0'); assert.equal(changeValue({ a: [1] }), '{"a":[1]}');
});
test('date boundaries include the full local day', () => {
  assert.equal(auditDateBoundary(''), undefined);
  const start = new Date(auditDateBoundary('2026-10-09')!); const end = new Date(auditDateBoundary('2026-10-09', true)!);
  assert.equal(start.getHours(), 0); assert.equal(end.getHours(), 23); assert.equal(end.getMilliseconds(), 999); assert.equal(end.getTime() - start.getTime(), 86399999);
});
