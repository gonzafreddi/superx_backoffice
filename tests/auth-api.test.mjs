import assert from "node:assert/strict";
import test from "node:test";
import { AuthApiError, createUser } from "../app/lib/auth-api.ts";

const input = { email: "nuevo@example.com", password: "secret-12345", name: "Persona", phone: "+54 (11) 1234-5678", role: "picker" };

test("createUser envía el contrato y devuelve el usuario creado", async (t) => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "https://api.example/";
  t.after(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; });
  const user = { id: "new-user", email: input.email, name: input.name, role: input.role, createdAt: "2026-10-01T00:00:00Z" };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const request = new Request(url, init);
    assert.equal(request.url, "https://api.example/api/auth/users");
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("Content-Type"), "application/json");
    assert.deepEqual(await request.json(), input);
    return Response.json(user, { status: 201 });
  });
  assert.deepEqual(await createUser(input), user);
});

for (const [status, payload, message] of [
  [409, { message: "Conflict" }, "Ya existe un usuario con ese email."],
  [400, { message: ["Email inválido.", "Contraseña inválida."] }, "Email inválido. Contraseña inválida."],
  [403, { message: "Sin permiso." }, "Sin permiso."],
  [500, null, "No pudimos completar la operación."],
]) {
  test(`createUser conserva el estado ${status} y muestra el mensaje esperado`, async (t) => {
    const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
    process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "https://api.example";
    t.after(() => { if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; });
    t.mock.method(globalThis, "fetch", async () => payload ? Response.json(payload, { status }) : new Response("unavailable", { status }));
    await assert.rejects(createUser(input), (error) => error instanceof AuthApiError && error.status === status && error.message === message);
  });
}
