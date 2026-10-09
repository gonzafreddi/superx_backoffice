import test from "node:test";
import assert from "node:assert/strict";
import { fixturesEnabled, assertApiConfigured, apiBaseUrl } from "../app/lib/api-mode";
import { orderApi } from "../app/lib/order-api";
import { metricsApi } from "../app/lib/metrics-api";

test("fixtures solo sin URL en desarrollo o por opt-in explícito; producción falla claramente", async () => {
  const keys = ["NODE_ENV", "NEXT_PUBLIC_SUPERX_API_BASE_URL", "NEXT_PUBLIC_SUPERX_USE_FIXTURES"];
  const original = keys.map(k => process.env[k]);
  try {
    delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; delete process.env.NEXT_PUBLIC_SUPERX_USE_FIXTURES;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development"; assert.equal(fixturesEnabled(), true); assert.doesNotThrow(assertApiConfigured);
    (process.env as Record<string, string | undefined>).NODE_ENV = "production"; assert.equal(fixturesEnabled(), false); assert.throws(assertApiConfigured, /^Error: Falta configurar NEXT_PUBLIC_SUPERX_API_BASE_URL\.$/);
    await assert.rejects(orderApi.listOrders(), /Falta configurar NEXT_PUBLIC_SUPERX_API_BASE_URL/);
    await assert.rejects(metricsApi.getOverview({ from: "2026-10-01", to: "2026-10-08" }), /Falta configurar NEXT_PUBLIC_SUPERX_API_BASE_URL/);
    process.env.NEXT_PUBLIC_SUPERX_USE_FIXTURES = "true"; assert.equal(fixturesEnabled(), true);
    process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test"; assert.equal(fixturesEnabled(), false); assert.equal(apiBaseUrl(), "http://backend.test");
  } finally { keys.forEach((k, i) => { if (original[i] === undefined) delete process.env[k]; else process.env[k] = original[i]; }); }
});

test("métricas con URL configurada consulta overview real incluso con opt-in fixtures", async () => {
  const oldBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL, oldOpt = process.env.NEXT_PUBLIC_SUPERX_USE_FIXTURES, oldFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  process.env.NEXT_PUBLIC_SUPERX_USE_FIXTURES = "true";
  const urls: string[] = [];
  globalThis.fetch = async url => { urls.push(String(url)); return new Response(JSON.stringify({ source: "backend", paymentsByMethod: [], paymentsByAccount: [] })); };
  try {
    const result = await metricsApi.getOverview({ from: "2026-10-01", to: "2026-10-08" });
    assert.equal((result as unknown as { source: string }).source, "backend");
    assert.deepEqual(urls, ["http://backend.test/metrics/overview?from=2026-10-01&to=2026-10-08"]);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = oldBase;
    if (oldOpt === undefined) delete process.env.NEXT_PUBLIC_SUPERX_USE_FIXTURES; else process.env.NEXT_PUBLIC_SUPERX_USE_FIXTURES = oldOpt;
  }
});
