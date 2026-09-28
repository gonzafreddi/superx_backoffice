"use client";
import { getStoredUser } from "@/app/lib/auth-api";
import styles from "../secondary.module.css";
export function ProfileApp() { const user = getStoredUser(); const label = user?.role === "admin" ? "Administrador" : "Repartidor"; return <section className={styles.page}><header><p className={styles.eyebrow}>Cuenta</p><h1>Perfil</h1><p>Datos de la sesión activa.</p></header><div className={`${styles.content} ${styles.profile}`}><div className={styles.avatar}>{(user?.name ?? user?.email ?? "S").charAt(0).toUpperCase()}</div><dl><div><dt>Nombre</dt><dd>{user?.name ?? "Sin nombre configurado"}</dd></div><div><dt>Email</dt><dd>{user?.email ?? "—"}</dd></div><div><dt>Rol</dt><dd>{label}</dd></div></dl></div></section>; }
