import assert from "node:assert/strict";
import test from "node:test";
import { withdrawalApi } from "../app/lib/withdrawal-api.ts";
import { validateWithdrawalUpdate, withdrawalStatuses } from "../app/lib/withdrawal-rules.js";
function setup(t, handler) {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "https://api.example/";
  t.after(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; });
  t.mock.method(globalThis, "fetch", handler);
}
test("listado paginado de arrepentimientos sin prefijo api", async (t) => {
  const result = { items: [{id: "123", code: "ARR-000123", status: "PENDING"}], total: 21, page: 2, pageSize: 20 };
  setup(t, async (url) => { assert.equal(url, "https://api.example/withdrawal-requests?page=2&pageSize=20&status=PENDING"); return Response.json(result); });
  assert.deepEqual(await withdrawalApi.list({status: "PENDING", page: 2}), result);
});
test("actualización conserva nota vacía para borrarla", async (t) => {
  setup(t, async (url, init) => { assert.equal(url, "https://api.example/withdrawal-requests/123"); assert.equal(init.method, "PATCH"); assert.deepEqual(JSON.parse(init.body), {status: "RESOLVED", resolutionNote: ""}); return Response.json({id: "123", status: "RESOLVED", resolutionNote: null}); });
  assert.equal((await withdrawalApi.update("123", {status: "RESOLVED", resolutionNote: ""})).resolutionNote, null);
});
for (const status of [400, 403, 404, 500]) test(`arrepentimientos comunica error ${status} en español`, async (t) => {
  setup(t, async () => new Response(null, {status}));
  await assert.rejects(withdrawalApi.update("1", {status: "PENDING"}), (error) => error.status === status && !error.message.includes("Forbidden"));
});
test("reglas permiten todos los estados y limitan la nota a 1000", () => {
  for (const [status] of withdrawalStatuses) assert.equal(validateWithdrawalUpdate({status, resolutionNote: "a".repeat(1000)}), "");
  assert.match(validateWithdrawalUpdate({status: "INVALID"}), /estado/);
  assert.match(validateWithdrawalUpdate({status: "PENDING", resolutionNote: "a".repeat(1001)}), /1000/);
});
