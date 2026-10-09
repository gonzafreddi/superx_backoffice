import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { CountLineRow } from '../app/components/inventory-counts/count-line-row';
const line = { productId: '42', productName: 'Queso', sku: 'Q', barcode: null, saleMode: 'WEIGHT' as const, systemQuantity: 1234, countedQuantity: 2500, reason: null };
const props = { line, pending: false, highlight: '', onEdit: () => {}, onQuantityEnter: () => {} };
test('línea WEIGHT cerrada muestra sistema, contado y diferencia en kg', () => {
  const html = renderToStaticMarkup(<CountLineRow {...props} editable={false} />);
  for (const text of ['1,234 kg', '2,5 kg', '+1,266 kg']) assert.ok(html.includes(text), html);
  assert.ok(!html.includes('2500'));
});
test('línea WEIGHT editable inicia en kg, acepta decimales y muestra error local', () => {
  const html = renderToStaticMarkup(<CountLineRow {...props} editable />);
  assert.ok(html.includes('value="2.5"'));
  assert.ok(html.includes('inputMode="decimal"'));
  assert.ok(html.includes('Queso (kg)'));
  const invalid = renderToStaticMarkup(<CountLineRow {...props} editable edit={{ quantity: '1,2345', reason: '' }} />);
  assert.ok(invalid.includes('aria-invalid="true"'));
  assert.ok(invalid.includes('hasta 3 decimales'));
});
test('línea vieja sin saleMode conserva cantidades por unidad y sin contar', () => {
  const html = renderToStaticMarkup(<CountLineRow {...props} line={{ ...line, saleMode: undefined, systemQuantity: 8, countedQuantity: null }} editable={false} />);
  assert.ok(html.includes('8 u.'));
  assert.ok(html.includes('Sin contar'));
});
