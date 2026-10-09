import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCountQuantity, countPatches, countSummary, findScanLine, adaptCount } from '../app/lib/inventory-count-rules.ts';
import { can } from '../app/lib/permissions.ts';
import { navGroups, canSee } from '../app/lib/navigation.ts';
const line = { productId: '42', productName: 'Agua', sku: 'AGUA', barcode: '779000', systemQuantity: 8, countedQuantity: null, reason: null };
test('cantidad vacía omite; cero cuenta; sólo enteros no negativos int32', () => {
  assert.equal(parseCountQuantity(''), null); assert.equal(parseCountQuantity('0'), 0); assert.equal(parseCountQuantity(' 12 '), 12);
  for (const value of ['-1', '1.5', '1e2', 'NaN', '2147483648']) assert.throws(() => parseCountQuantity(value));
});
test('guardado parcial conserva cero, limpia motivo y valida antes de enviar', () => {
  assert.deepEqual(countPatches([line], { '42': { quantity: '0', reason: ' Rotura ' } }), [{ productId: '42', countedQuantity: 0, reason: 'Rotura' }]);
  assert.deepEqual(countPatches([line], {}), []);
  assert.equal(countPatches([line], { '42': { quantity: '', reason: '' } })[0].countedQuantity, null);
  assert.throws(() => countPatches([line], { '42': { quantity: '1', reason: 'x'.repeat(81) } }));
});
test('resumen ignora sin contar e incluye pérdidas, ganancias y cero', () => {
  assert.deepEqual(countSummary([line, { ...line, countedQuantity: 0 }, { ...line, countedQuantity: 10 }, { ...line, countedQuantity: 8 }]), { counted: 3, changed: 2, positive: 2, negative: -8, positiveGrams: 0, negativeGrams: 0 });
});
test('escaneo exacto conserva ceros iniciales y busca SKU', () => {
  assert.equal(findScanLine([line], ' 779000 ')?.productId, '42'); assert.equal(findScanLine([line], 'AGUA')?.productId, '42'); assert.equal(findScanLine([line], '779'), undefined);
  assert.equal(findScanLine([{ ...line, barcode: '0012' }], '12'), undefined);
});
test('adapta ids y cantidades numeric y productos anidados', () => {
  const count = adaptCount({ id: 1, warehouseId: 2, locationId: null, lines: [{ productId: 42, product: { name: 'Agua', sku: 'A', barcode: '001' }, systemQuantity: '8', countedQuantity: '0' }] });
  assert.equal(count.id, '1'); assert.equal(count.lines[0].countedQuantity, 0); assert.equal(count.lines[0].productName, 'Agua');
});
test('permisos y navegación: warehouse escribe, accountant lee, support no entra', () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = 'http://api.test';
  try { assert.equal(can('warehouse', 'inventoryCounts.write'), true); assert.equal(can('accountant', 'inventoryCounts.read'), true); assert.equal(can('accountant', 'inventoryCounts.write'), false); assert.equal(can('support', 'inventoryCounts.read'), false);
    const item = navGroups.flatMap(group => group.items).find(item => item.href === '/inventario/conteos'); assert.equal(canSee(item, 'warehouse'), true); assert.equal(canSee(item, 'accountant'), true); assert.equal(canSee(item, 'support'), false);
  } finally { if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});

test('adapter HTTP envía contrato y consulta nuevamente después de mutaciones', async () => {
  const { inventoryCountApi } = await import('../app/lib/inventory-count-api.ts');
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL, originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = 'http://api.test/';
  const calls = [], raw = { id: 1, code: 'CNT-000001', warehouseId: 2, locationId: null, status: 'DRAFT', lines: [line] };
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(url.includes('?') ? { items: [raw] } : raw), { status: 200 }); };
  try {
    assert.equal((await inventoryCountApi.list({ warehouseId: '2', status: 'DRAFT' }))[0].id, '1');
    assert.equal(calls[0].url, 'http://api.test/inventory-counts?warehouseId=2&status=DRAFT');
    await inventoryCountApi.create({ warehouseId: '2', locationId: '3', note: 'Prueba' });
    assert.deepEqual(JSON.parse(calls[1].init.body), { warehouseId: 2, locationId: 3, note: 'Prueba' });
    await inventoryCountApi.save('1', [{ productId: '42', countedQuantity: 0, reason: null }]);
    assert.equal(calls[2].init.method, 'PATCH'); assert.deepEqual(JSON.parse(calls[2].init.body), { lines: [{ productId: 42, countedQuantity: 0, reason: null }] });
    assert.equal(calls[3].init.method, 'GET');
    await inventoryCountApi.addLine('1', '43'); assert.deepEqual(JSON.parse(calls[4].init.body), { productId: 43 });
    await inventoryCountApi.close('1', 'apply'); assert.equal(calls[6].url, 'http://api.test/inventory-counts/1/apply'); assert.equal(calls[6].init.method, 'POST');
    await inventoryCountApi.close('1', 'cancel'); assert.equal(calls[8].url, 'http://api.test/inventory-counts/1/cancel');
    globalThis.fetch = async () => new Response(JSON.stringify({ message: ['Conteo cerrado'] }), { status: 400 });
    await assert.rejects(inventoryCountApi.save('1', []), /Conteo cerrado/);
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(inventoryCountApi.get('1'), /offline/);
  } finally { globalThis.fetch = originalFetch; if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});
test('fixtures permiten crear, contar cero, agregar, aplicar y bloquean cambios al cerrar', async () => {
  const { inventoryCountApi } = await import('../app/lib/inventory-count-api.ts');
  const count = await inventoryCountApi.create({ warehouseId: 'wh-central' });
  assert.equal(count.status, 'DRAFT'); assert.ok(count.lines.length);
  const productId = count.lines[0].productId;
  const saved = await inventoryCountApi.save(count.id, [{ productId, countedQuantity: 0, reason: 'Rotura' }]);
  assert.equal(saved.lines[0].countedQuantity, 0);
  saved.lines[0].countedQuantity = 99; assert.equal((await inventoryCountApi.get(count.id)).lines[0].countedQuantity, 0);
  const added = await inventoryCountApi.addLine(count.id, 'prd-003'); assert.ok(added.lines.some(line => line.productId === 'prd-003'));
  assert.equal((await inventoryCountApi.close(count.id, 'apply')).status, 'APPLIED');
  await assert.rejects(inventoryCountApi.save(count.id, []), /cerrado/);
  await assert.rejects(inventoryCountApi.close(count.id, 'apply'), /cerrado/);
  const another = await inventoryCountApi.create({ warehouseId: 'wh-central', locationId: 'loc-001' });
  assert.equal(another.locationId, 'loc-001'); assert.equal((await inventoryCountApi.close(another.id, 'cancel')).status, 'CANCELLED');
});

 test('WEIGHT convierte kg a gramos enteros y preserva precisión y límites', async () => {
  const { quantityInput } = await import('../app/lib/quantity-rules.js');
  for (const [input, grams] of [['0', 0], ['0,001', 1], ['1.234', 1234], ['2,5', 2500], ['2147483.647', 2147483647]]) {
    assert.equal(parseCountQuantity(input, 'WEIGHT'), grams);
    assert.equal(parseCountQuantity(quantityInput(grams, 'WEIGHT'), 'WEIGHT'), grams);
  }
  assert.equal(parseCountQuantity('', 'WEIGHT'), null);
  for (const input of ['-1', '1.0001', '1e3', '1,2.3', '2147483.648']) assert.throws(() => parseCountQuantity(input, 'WEIGHT'));
  const weight = { ...line, saleMode: 'WEIGHT', systemQuantity: 2000, countedQuantity: 2500 };
  assert.equal(countPatches([weight], { '42': { quantity: '2,501', reason: '' } })[0].countedQuantity, 2501);
  assert.deepEqual(countSummary([{ ...line, countedQuantity: 10 }, weight, { ...weight, countedQuantity: 1000 }]), { counted: 3, changed: 3, positive: 2, negative: 0, positiveGrams: 500, negativeGrams: -1000 });
  assert.equal(adaptCount({ lines: [weight] }).lines[0].saleMode, 'WEIGHT');
  assert.equal(adaptCount({ lines: [line] }).lines[0].saleMode, 'UNIT');
 });
