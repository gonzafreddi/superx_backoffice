import test from "node:test";
import assert from "node:assert/strict";
import { canAssignOrder, needsDriver } from "../app/lib/driver-admin-rules";
import { assignOrder, getOrderAssignment, listActiveAssignments, listDrivers, listDriverCandidates, createDriver, updateDriver } from "../app/lib/driver-admin-api";

test("asignación respeta el estado y OUT_FOR_DELIVERY exige ausencia de asignación activa", () => {
  for (const status of ["READY", "DISPATCHED"]) { assert.equal(canAssignOrder(status, true), true); assert.equal(needsDriver(status, false), true); assert.equal(needsDriver(status, true), false); }
  assert.equal(canAssignOrder("OUT_FOR_DELIVERY", false), true);
  assert.equal(canAssignOrder("OUT_FOR_DELIVERY", true), false);
  for (const status of ["CREATED", "CONFIRMED", "PAID", "PICKING", "PACKED", "DELIVERED", "CANCELLED"]) { assert.equal(canAssignOrder(status), false); assert.equal(needsDriver(status, false), false); }
  assert.equal(needsDriver("OUT_FOR_DELIVERY", false), false);
});
test("adapter usa contrato admin, normaliza IDs y conserva mensajes backend", async () => {
  const oldBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL, oldFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  const calls: Array<{ url: string; body: unknown; method?: string }> = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const path = String(url);
    const payload = path.endsWith("/assignment") ? init?.method === "POST" ? { message: "El pedido ya está asignado a este repartidor." } : { active: null, history: [] } : path.includes("delivery-assignments") ? [{ id: 1, orderId: 2, driverId: 3 }] : path.includes("candidates") ? [{ id: 3 }] : init?.method === "POST" || init?.method === "PATCH" ? { id: 3, user: { id: 3 } } : [{ id: 3, user: { id: 3 } }];
    return new Response(JSON.stringify(payload), { status: path.endsWith("/assignment") && init?.method === "POST" ? 409 : 200 });
  };
  try {
    assert.equal((await listDrivers(true))[0].id, "3");
    assert.equal((await listDriverCandidates())[0].id, "3");
    await createDriver({ userId: 3 }); await updateDriver("3", { active: false });
    assert.equal((await getOrderAssignment("2")).active, null);
    assert.equal((await listActiveAssignments())[0].orderId, "2");
    await assert.rejects(assignOrder("2", "3", "Nota"), /El pedido ya está asignado a este repartidor\./);
    assert.equal(calls[0].url, "http://backend.test/drivers?active=true");
    assert.equal(calls[5].url, "http://backend.test/delivery-assignments?status=ACTIVE");
    assert.deepEqual(calls[6].body, { driverId: 3, note: "Nota" });
  } finally { globalThis.fetch = oldFetch; if (oldBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = oldBase; }
});

test("fixtures permiten alta desde candidato y edición conservando identidad", async () => {
  const oldBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  try {
    const candidate = (await listDriverCandidates())[0];
    const created = await createDriver({ userId: Number(candidate.id), vehicleType: "Bicicleta" });
    assert.equal(created.id, candidate.id); assert.equal(created.user?.id, candidate.id);
    assert.equal((await listDriverCandidates()).some(c => c.id === candidate.id), false);
    await assert.rejects(createDriver({ userId: Number(candidate.id) }), /ya tiene perfil/);
    await updateDriver(created.id, { active: false, phone: "123456" });
    assert.equal((await listDrivers(true)).some(d => d.id === created.id), false);
    assert.equal((await listDrivers(false)).find(d => d.id === created.id)?.phone, "123456");
  } finally { if (oldBase !== undefined) process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = oldBase; }
});
