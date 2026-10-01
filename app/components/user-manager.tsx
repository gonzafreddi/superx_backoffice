"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createUser, getStoredUser, listUsers, updateUserRole, type ManagedUser, type UserRole } from "@/app/lib/auth-api";
import { Notice } from "./ui/notice";

const roles: Array<[UserRole, string]> = [["customer", "Cliente"], ["admin", "Administración"], ["picker", "Preparador"], ["driver", "Repartidor"], ["warehouse", "Depósito"]];
const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
export function UserManager() {
  const [users, setUsers] = useState<ManagedUser[]>([]), [query, setQuery] = useState(""), [role, setRole] = useState<UserRole | "">(""), [loading, setLoading] = useState(true), [error, setError] = useState(""), [busyId, setBusyId] = useState("");
  const [creating, setCreating] = useState(false), [success, setSuccess] = useState("");
  const me = getStoredUser();
  const load = useCallback(async () => { setLoading(true); try { const result = await listUsers({ q: query.trim() || undefined, role, pageSize: 100 }); setUsers(result.items); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar los usuarios."); } finally { setLoading(false); } }, [query, role]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  const changeRole = async (user: ManagedUser, nextRole: UserRole) => { if (user.id === me?.id && user.role === "admin" && nextRole !== "admin") { setError("No podés quitarte tu propio acceso de Administración. Pedile el cambio a otra persona administradora."); return; } if (!window.confirm(`¿Cambiar el rol de ${user.email} a ${roles.find(([value]) => value === nextRole)?.[1]}?`)) return; setBusyId(user.id); try { const updated = await updateUserRole(user.id, nextRole); setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...updated } : item)); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cambiar el rol."); } finally { setBusyId(""); } };
  return <section className="workspace"><header className="topbar"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Usuarios</h1><p className="subtitle">Gestioná quién puede operar cada área de SuperX.</p></div><button type="button" className="button primary" onClick={() => setCreating(true)}>Nuevo usuario</button></header>{success && <Notice kind="success" onDismiss={() => setSuccess("")} dismissLabel="Cerrar aviso">{success}</Notice>}{creating && <CreateUserDialog onClose={() => setCreating(false)} onCreated={(user) => { setUsers((current) => [user, ...current.filter((item) => item.id !== user.id)]); setSuccess(`Usuario creado: ${user.email}`); setCreating(false); }} />}{error && <Notice kind="error" role="alert" onDismiss={() => setError("")}>{error}</Notice>}<section className="locations-filter-bar"><label className="search"><span className="sr-only">Buscar usuarios</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por email o nombre" /></label><label className="field"><span>Rol</span><select value={role} onChange={(event) => setRole(event.target.value as UserRole | "")}><option value="">Todos los roles</option>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></section><section className="location-table-panel"><header><div><p className="eyebrow">EQUIPO</p><h2>{users.length} {users.length === 1 ? "usuario" : "usuarios"}</h2></div></header>{loading ? <div className="state">Cargando usuarios…</div> : <div className="location-table-wrap"><table className="location-stock-table"><thead><tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Alta</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td data-label="Email"><strong>{user.email}</strong>{user.id === me?.id && <small>Tu cuenta</small>}</td><td data-label="Nombre">{user.name || "—"}</td><td data-label="Rol"><select aria-label={`Rol de ${user.email}`} value={user.role} disabled={busyId === user.id || (user.id === me?.id && user.role === "admin")} onChange={(event) => void changeRole(user, event.target.value as UserRole)}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td data-label="Alta">{date.format(new Date(user.createdAt))}</td></tr>)}</tbody></table></div>}</section></section>;
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (user: ManagedUser) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("picker");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); if (trigger instanceof HTMLElement) trigger.focus(); };
  }, []);

  const generate = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    setPassword(Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(""));
    setVisible(true);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    const cleanEmail = email.trim(), cleanName = name.trim(), cleanPhone = phone.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("Ingresá un email válido."); return; }
    if (name && (!cleanName || cleanName.length > 120)) { setError("El nombre debe tener entre 1 y 120 caracteres."); return; }
    if (phone && (cleanPhone.length < 7 || cleanPhone.length > 40 || !/^[0-9 +()-]+$/.test(cleanPhone))) { setError("El teléfono debe tener entre 7 y 40 caracteres y solo puede incluir números, espacios, +, (, ) y -."); return; }
    if (password.length < 8 || password.length > 72) { setError("La contraseña debe tener entre 8 y 72 caracteres."); return; }
    if (!roles.some(([value]) => value === role)) { setError("Elegí un rol válido."); return; }
    savingRef.current = true;
    setSaving(true); setError("");
    try {
      onCreated(await createUser({ email: cleanEmail, password, role, ...(cleanName ? { name: cleanName } : {}), ...(cleanPhone ? { phone: cleanPhone } : {}) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos crear el usuario."); }
    finally { savingRef.current = false; setSaving(false); }
  };

  return <dialog ref={dialogRef} className="modal catalog-entity-modal user-create-modal" aria-labelledby="create-user-title" onCancel={onClose}>
    <header><div><p className="eyebrow">ADMINISTRACIÓN</p><h2 id="create-user-title">Nuevo usuario</h2></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}>×</button></header>
    <form noValidate onSubmit={(event) => void submit(event)} aria-busy={saving}>
      {error && <Notice kind="error" role="alert">{error}</Notice>}
      <label className="field"><span>Email *</span><input autoFocus type="email" autoComplete="off" required value={email} disabled={saving} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="field"><span>Nombre (opcional)</span><input autoComplete="off" maxLength={120} value={name} disabled={saving} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field"><span>Teléfono (opcional)</span><input type="tel" autoComplete="off" maxLength={40} value={phone} disabled={saving} onChange={(event) => setPhone(event.target.value)} /></label>
      <label className="field"><span>Rol *</span><select value={role} disabled={saving} onChange={(event) => setRole(event.target.value as UserRole)}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field"><span>Contraseña *</span><input type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} aria-describedby="create-user-password-hint" value={password} disabled={saving} onChange={(event) => setPassword(event.target.value)} /></label>
      <div className="user-password-actions"><button type="button" className="button ghost" aria-pressed={visible} onClick={() => setVisible((current) => !current)}>{visible ? "Ocultar contraseña" : "Mostrar contraseña"}</button><button type="button" className="button ghost" disabled={saving} onClick={generate}>Generar</button></div>
      <p className="catalog-entity-help" id="create-user-password-hint">Usá entre 8 y 72 caracteres. Guardá la contraseña y compartila con la persona para que pueda ingresar.</p>
      <footer><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Creando…" : "Crear usuario"}</button></footer>
    </form>
  </dialog>;
}
