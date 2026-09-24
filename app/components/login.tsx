"use client";

import { Notice } from "@/app/components/ui/notice";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login as loginRequest, AuthApiError } from "@/app/lib/auth-api";

type Login = typeof loginRequest;

export function Login({ signIn = loginRequest }: { signIn?: Login }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await signIn(email.trim(), password);
      const next = searchParams.get("next");
      const roleHome: Record<string, string> = { warehouse: "/deposito", picker: "/picking", driver: "/reparto", admin: "/tablero" };
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : roleHome[user.role] ?? "/tablero");
    } catch (cause) {
      setError(cause instanceof AuthApiError ? cause.message : "No pudimos iniciar sesión. Revisá tu conexión.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brandmark"><span>SX</span><strong>superx backoffice</strong></div>
        {error && <Notice kind="error" role="alert" label="No se pudo continuar">{error}</Notice>}
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Email</span>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
          </label>
          <button className="button primary" type="submit" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
        </form>
      </section>
    </main>
  );
}
