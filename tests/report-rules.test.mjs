import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presetRange, rangeError, exportPath, sortRows, encodeCsv } from '../app/lib/report-rules.ts';
import { salesReport } from '../app/lib/reports-api.ts';
import { fixtureCsv, csvBlob } from '../app/lib/download-csv.ts';
import { can } from '../app/lib/permissions.ts';
import { navGroups, canSee } from '../app/lib/navigation.ts';
test('date presets use calendar days across year/month and leap boundaries', () => {
  const now = new Date(2026, 0, 3, 23);
  assert.deepEqual(presetRange('today', now), { from: '2026-01-03', to: '2026-01-03' });
  assert.deepEqual(presetRange('week', now), { from: '2025-12-28', to: '2026-01-03' });
  assert.deepEqual(presetRange('month', now), { from: '2026-01-01', to: '2026-01-03' });
  assert.deepEqual(presetRange('previousMonth', now), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(presetRange('previousMonth', new Date(2024, 2, 31)), { from: '2024-02-01', to: '2024-02-29' });
});
test('range and query preserve only supported nonempty filters', () => {
  assert.ok(rangeError('2026-02-30', '')); assert.ok(rangeError('2026-10-09', '2026-10-01')); assert.equal(rangeError('', ''), '');
  assert.equal(exportPath('/exports/orders.csv', { from: '2026-10-01', to: '', status: 'all' }), '/exports/orders.csv?from=2026-10-01');
  assert.equal(exportPath('/exports/stock.csv', { warehouseId: 'a&b' }), '/exports/stock.csv?warehouseId=a%26b');
});
test('sorting numeric metrics does not mutate source; labels use Spanish collation', () => {
  const rows = [{ key: 'a', label: 'Z', revenue: 2 }, { key: 'b', label: 'A', revenue: 100 }];
  assert.deepEqual(sortRows(rows, 'revenue', true).map(r => r.key), ['b', 'a']); assert.equal(rows[0].key, 'a');
  assert.deepEqual(sortRows(rows, 'label', false).map(r => r.key), ['b', 'a']);
});
test('CSV has BOM, semicolons, comma decimals, quoted cells and formula protection', () => {
  assert.equal(encodeCsv([['Producto', 12.5, 'a;b', 'a"b', '=SUM(A1)', null]]), '\uFEFFProducto;12,5;"a;b";"a""b";\'=SUM(A1);\r\n');
  for (const endpoint of ['orders', 'order-items', 'stock', 'treasury', 'sales-report']) assert.ok(fixtureCsv(`/exports/${endpoint}.csv`).startsWith('\uFEFF'));
  assert.match(fixtureCsv('/exports/orders.csv?status=CANCELLED'), /CANCELLED/);
});
test('fixtures expose coverage warning data and downloadable CSV', async () => {
  const report = await salesReport({ from: '2026-10-01', to: '2026-10-09', groupBy: 'product' });
  assert.equal(report.totals.costCoverage, 50); assert.equal(report.rows[0].label, 'Leche 1L');
  const blob = await csvBlob('/exports/stock.csv?warehouseId=2'); assert.match(await blob.text(), /Leche/);
});
test('API contract paths, numeric normalization, errors and permissions', async () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; const original = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = 'http://127.0.0.1:4000/';
  try {
    const nav = navGroups.find(g => g.label === 'Finanzas').items.find(i => i.href === '/reportes');
    for (const role of ['admin', 'accountant']) { assert.equal(can(role, 'reports.read'), true); assert.equal(can(role, 'exports.read'), true); assert.equal(canSee(nav, role), true); }
    for (const role of ['support', 'warehouse', 'driver', 'picker', undefined]) { assert.equal(can(role, 'reports.read'), false); assert.equal(can(role, 'exports.read'), false); }
    let called;
    globalThis.fetch = async (url, init) => { called = { url, init }; return new Response(JSON.stringify({ rows: [{ key: 1, label: 'Leche', revenue: '12.50', costCoverage: '100' }], totals: { revenue: '12.50', costCoverage: '100' } })); };
    const result = await salesReport({ from: '2026-10-01', to: '2026-10-09', groupBy: 'product' });
    assert.equal(called.url, 'http://127.0.0.1:4000/reports/sales?from=2026-10-01&to=2026-10-09&groupBy=product'); assert.equal(result.rows[0].revenue, 12.5); assert.equal(result.rows[0].key, '1');
    globalThis.fetch = async (url) => { called = url; return new Response('\uFEFFstock;12,5', { headers: { 'Content-Type': 'text/csv' } }); };
    assert.match(await (await csvBlob('/exports/stock.csv?warehouseId=2')).text(), /stock/); assert.equal(called, 'http://127.0.0.1:4000/exports/stock.csv?warehouseId=2');
    globalThis.fetch = async () => new Response('', { status: 403 });
    await assert.rejects(csvBlob('/exports/orders.csv'), /permiso/); await assert.rejects(salesReport({ from: '', to: '', groupBy: 'day' }), /acceso/);
    await assert.rejects(csvBlob('https://other.example/exports/orders.csv'), /inválida/);
  } finally { globalThis.fetch = original; if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});
