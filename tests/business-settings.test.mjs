import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validCuit, validateSettings, settingsPayload, toSettingsForm } from '../app/lib/business-settings-rules.ts';
import { businessSettingsApi } from '../app/lib/business-settings-api.ts';
import { can } from '../app/lib/permissions.ts';
import { navGroups, canSee } from '../app/lib/navigation.ts';
const input = { legalName: 'SuperX', tradeName: 'SuperX', cuit: '20123456786', ivaCondition: 'RESPONSABLE_INSCRIPTO', legalAddress: '', serviceAddress: '', serviceArea: '', contactEmail: 'hola@superx.com', contactPhone: '', whatsapp: '', businessHours: '', legalTermsEffectiveDate: null, minOrderAmount: 0, freeDeliveryThreshold: null };
test('CUIT validates length, digits and checksum (including special remainders)', () => {
  for (const value of ['20123456786', '30712345671', '20000000001', '20000000060']) assert.equal(validCuit(value), true, value);
  for (const value of ['', '2012345678', '20123456787', '20-12345678-6', '2012345678x', '00000000000']) assert.equal(validCuit(value), false, value);
});
test('settings roundtrip keeps null threshold distinct from zero', () => {
  assert.deepEqual(settingsPayload(toSettingsForm(input)), input);
  assert.equal(settingsPayload({ ...toSettingsForm(input), freeDeliveryThreshold: '0' }).freeDeliveryThreshold, 0);
  assert.equal(settingsPayload({ ...toSettingsForm(input), minOrderAmount: '1200.50' }).minOrderAmount, 1200.5);
});
test('invalid money, email, IVA and date produce field errors', () => {
  const form = toSettingsForm(input);
  for (const value of ['-1', 'NaN', 'Infinity', '', '1e2', '1.123', '10000000000']) assert.ok(validateSettings({ ...form, minOrderAmount: value }).minOrderAmount, value);
  assert.ok(validateSettings({ ...form, freeDeliveryThreshold: '-1' }).freeDeliveryThreshold);
  assert.ok(validateSettings({ ...form, contactEmail: 'invalid@', ivaCondition: 'OTHER', legalTermsEffectiveDate: '2026-02-30' }).contactEmail);
  assert.ok(validateSettings({ ...form, ivaCondition: 'OTHER' }).ivaCondition);
  assert.ok(validateSettings({ ...form, legalTermsEffectiveDate: '2026-02-30' }).legalTermsEffectiveDate);
  assert.throws(() => settingsPayload({ ...form, cuit: '123' }));
  assert.deepEqual(validateSettings(form), {});
});
test('fixture adapter saves settings and updates metadata without exposing mutable state', async () => {
  const result = await businessSettingsApi.update({ ...input, minOrderAmount: 500 });
  assert.equal(result.minOrderAmount, 500); assert.ok(Date.parse(result.updatedAt));
  result.tradeName = 'mutated'; assert.equal((await businessSettingsApi.get()).tradeName, 'SuperX');
});
test('configuration navigation and action are admin only against the API', () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = 'http://127.0.0.1:4000';
  try {
    const item = navGroups.find(group => group.label === 'Administración').items.find(item => item.href === '/configuracion');
    assert.ok(item); assert.equal(canSee(item, 'admin'), true); assert.equal(can('admin', 'settings.manage'), true);
    for (const role of ['support', 'accountant', 'warehouse', 'picker', 'driver', undefined]) { assert.equal(can(role, 'settings.manage'), false); assert.equal(canSee(item, role), false); }
  } finally { if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});
test('API uses GET/PATCH settings, numeric amounts and reports backend errors', async () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = 'http://127.0.0.1:4000/';
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ...input, id: 1, minOrderAmount: '500.50', freeDeliveryThreshold: '1000.00', updatedAt: '2026-10-09T12:00:00Z' }), { status: 200 });
  };
  try {
    const settings = await businessSettingsApi.get();
    assert.equal(settings.minOrderAmount, 500.5); assert.equal(settings.freeDeliveryThreshold, 1000);
    await businessSettingsApi.update(input);
    assert.equal(calls[0].url, 'http://127.0.0.1:4000/settings'); assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[1].init.method, 'PATCH'); assert.deepEqual(JSON.parse(calls[1].init.body), input);
    globalThis.fetch = async () => new Response(JSON.stringify({ message: ['CUIT inválido'] }), { status: 400 });
    await assert.rejects(businessSettingsApi.update(input), /CUIT inválido/);
    globalThis.fetch = async () => new Response('{}', { status: 403 });
    await assert.rejects(businessSettingsApi.get(), /No tenés permiso/);
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(businessSettingsApi.get(), /offline/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous;
  }
});
