import assert from "node:assert/strict";
import test from "node:test";
import { createAuthFetch } from "../app/lib/http-core.js";

function harness(fetchImpl) {
  let session = { accessToken: "expired-access", refreshToken: "refresh-1" };
  let cleared = false;
  const authFetch = createAuthFetch({
    fetchImpl,
    getSession: () => session,
    setSession: ({ accessToken, refreshToken }) => { session = { accessToken, refreshToken }; },
    clearSession: () => { cleared = true; session = { accessToken: null, refreshToken: null }; },
    refreshUrl: () => "https://api.example/auth/refresh",
  });
  return { authFetch, session: () => session, cleared: () => cleared };
}

test("dos 401 concurrentes comparten un solo refresh y reintentan con el token rotado", async () => {
  let refreshCalls = 0;
  const calls = [];
  const gate = Promise.withResolvers();
  const state = harness(async (input, init) => {
    const request = new Request(input, init);
    calls.push(request);
    if (request.url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      await gate.promise;
      return Response.json({ accessToken: "access-2", refreshToken: "refresh-2", user: { id: "1" } });
    }
    return request.headers.get("Authorization") === "Bearer access-2"
      ? Response.json({ ok: true })
      : new Response(null, { status: 401 });
  });

  const first = state.authFetch("https://api.example/orders");
  const second = state.authFetch("https://api.example/products");
  await new Promise((resolve) => setTimeout(resolve, 0));
  gate.resolve();
  const responses = await Promise.all([first, second]);

  assert.equal(refreshCalls, 1);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.deepEqual(state.session(), { accessToken: "access-2", refreshToken: "refresh-2" });
  assert.equal(calls.filter((request) => !request.url.endsWith("/auth/refresh")).length, 4);
});

test("un refresh fallido limpia la sesión y conserva el 401 original", async () => {
  let originalResponse;
  const state = harness(async (input, init) => {
    const request = new Request(input, init);
    if (request.url.endsWith("/auth/refresh")) return Response.json({ message: "revoked" }, { status: 401 });
    originalResponse = new Response("unauthorized", { status: 401 });
    return originalResponse;
  });

  const response = await state.authFetch("https://api.example/orders");
  assert.equal(response, originalResponse);
  assert.equal(response.status, 401);
  assert.equal(state.cleared(), true);
  assert.deepEqual(state.session(), { accessToken: null, refreshToken: null });
});
