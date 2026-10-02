import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { dispatchApi, DispatchApiError } from "../app/lib/dispatch-api";

test("assign y start usan endpoints distintos, ids numéricos y conservan 409/403", async () => {
  const previousBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  const previousFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  const calls: Array<{ url: string; method?: string; body: unknown }> = [];
  let status = 200;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(status === 200 ? { dispatched: [] } : { message: "Backend conflict" }), { status });
  };
  try {
    await dispatchApi.assign(["1", "2"]);
    await dispatchApi.start(["2"]);
    assert.deepEqual(calls, [
      { url: "http://backend.test/dispatch/assign", method: "POST", body: { orderIds: [1, 2] } },
      { url: "http://backend.test/dispatch/start", method: "POST", body: { orderIds: [2] } },
    ]);
    for (const code of [409, 403]) {
      status = code;
      await assert.rejects(dispatchApi.start(["2"]), (error: unknown) => error instanceof DispatchApiError && error.status === code);
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
    else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previousBase;
  }
});

test("fixture registra dueño al cargar, rechaza READY en start y conserva dueño al salir", async () => {
  const previousBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  const dom = new JSDOM("", { url: "http://localhost" });
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: dom.window });
  delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  const setUser = (id: string, role: string) => dom.window.sessionStorage.setItem("superx.access-user", JSON.stringify({ id, role, name: id }));
  try {
    setUser("driver-1", "driver");
    await assert.rejects(dispatchApi.start(["1"]), (error: unknown) => error instanceof DispatchApiError && error.status === 409);
    const loaded = await dispatchApi.assign(["1"]);
    assert.equal(loaded.dispatched[0].dispatchedBy?.id, "driver-1");
    await assert.rejects(dispatchApi.assign(["1", "2"]), (error: unknown) => error instanceof DispatchApiError && error.status === 409);
    assert.ok((await dispatchApi.getBoard()).ready.some((order) => order.id === "2"));
    setUser("driver-2", "driver");
    await assert.rejects(dispatchApi.start(["1"]), (error: unknown) => error instanceof DispatchApiError && error.status === 403);
    setUser("admin", "admin");
    const started = await dispatchApi.start(["1"]);
    assert.equal(started.outForDelivery[0].dispatchedBy?.id, "driver-1");
  } finally {
    Object.assign(globalThis, { window: previousWindow });
    dom.window.close();
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
    else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previousBase;
  }
});
