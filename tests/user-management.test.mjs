import assert from "node:assert/strict";
import test from "node:test";
import { listUsers, updateUser, updateUserRole, updateUserStatus, resetUserPassword, login } from "../app/lib/auth-api.ts";
import { validateUserData, validateNewPassword } from "../app/lib/user-rules.js";
function setup(t, handler) {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "https://api.example/";
  t.after(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; });
  t.mock.method(globalThis, "fetch", handler);
}
test("listUsers envía el filtro de actividad junto a los filtros existentes", async (t) => {
  setup(t, async (url) => { const u = new URL(url); assert.equal(u.pathname, "/api/auth/users"); assert.equal(u.searchParams.get("status"), "inactive"); assert.equal(u.searchParams.get("role"), "admin"); return Response.json({ items: [], total: 0, page: 2, pageSize: 10 }); });
  assert.equal((await listUsers({ status: "inactive", role: "admin", page: 2, pageSize: 10 })).page, 2);
});
for (const [path, method, body, action] of [
  ["", "PATCH", {email: "x@example.com", name: null, phone: null}, (body) => updateUser("a/b", body)],
  ["/status", "PATCH", {active: false}, () => updateUserStatus("a/b", false)],
  ["/password", "POST", {password: "password123"}, () => resetUserPassword("a/b", "password123")],
]) test(`gestión de usuarios: ${method} ${path || "datos"}`, async (t) => {
  setup(t, async (url, init) => { assert.equal(url, `https://api.example/api/auth/users/a%2Fb${path}`); assert.equal(init.method, method); assert.deepEqual(JSON.parse(init.body), body); return path === "/password" ? new Response(null, {status: 204}) : Response.json({ id: "a/b", isActive: false }); });
  await action(body);
});
for (const [status, action, text] of [
  [409, () => updateUser("a", {email: "x@example.com"}), /Ya existe/],
  [409, () => updateUserStatus("a", false), /al menos un administrador activo/],
  [409, () => updateUserRole("a", "customer"), /al menos un administrador activo/],
  [400, () => updateUserStatus("a", false), /propia cuenta/],
  [400, () => resetUserPassword("a", "short"), /Revisá los datos/],
  [403, () => login("x@example.com", "password123"), /cuenta está desactivada/],
]) test(`error ${status}: ${text}`, async (t) => { setup(t, async () => Response.json({message: "English backend message"}, {status})); await assert.rejects(action(), (error) => error.status === status && text.test(error.message)); });
test("validación de datos y contraseña", () => {
  assert.equal(validateUserData({email: "x@example.com", name: null, phone: null}), "");
  assert.match(validateUserData({email: "bad", name: null, phone: null}), /email/);
  assert.match(validateUserData({email: "x@example.com", name: "a".repeat(121), phone: null}), /nombre/);
  assert.match(validateUserData({email: "x@example.com", name: null, phone: "abc1234"}), /teléfono/);
  assert.match(validateNewPassword("short", "short"), /8 y 72/);
  assert.match(validateNewPassword("a".repeat(73), "a".repeat(73)), /8 y 72/);
  assert.match(validateNewPassword("password123", "different"), /no coinciden/);
  assert.equal(validateNewPassword("a".repeat(8), "a".repeat(8)), "");
  assert.equal(validateNewPassword("a".repeat(72), "a".repeat(72)), "");
});
