"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getStoredUser, logout, validateBackofficeSession, type AdminUser } from "@/app/lib/auth-api";
import { DriverIcon } from "./driver-icons";
import styles from "./driver-shell.module.css";
const items = [{ href: "/reparto", label: "Reparto", icon: "route" }, { href: "/reparto/historial", label: "Historial", icon: "history" }, { href: "/reparto/perfil", label: "Perfil", icon: "profile" }];
export function DriverShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const params = useSearchParams(); const router = useRouter(); const [user, setUser] = useState<AdminUser | null>(() => typeof window === "undefined" ? null : getStoredUser()); const [ready, setReady] = useState(false);
  useEffect(() => { const controller = new AbortController(); void validateBackofficeSession(controller.signal).then((found) => { if (!found || !["admin", "driver"].includes(found.role)) { router.replace("/login?next=/reparto"); return; } setUser(found); setReady(true); }).catch(() => router.replace("/login?next=/reparto")); return () => controller.abort(); }, [router]);
  if (!ready) return <div className={styles.loading}>Cargando reparto…</div>;
  const active = (href: string) => href === "/reparto" ? pathname === href : pathname.startsWith(href);
  const signOut = () => { logout(); router.replace("/login"); };
  return <div className={styles.shell}><aside className={styles.sidebar}><Link href="/reparto" className={styles.brand} aria-label="SuperX reparto">SX</Link><nav className={styles.nav} aria-label="Navegación de reparto">{items.map((item) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}><DriverIcon name={item.icon}/><span>{item.label}</span></Link>)}</nav><div className={styles.bottom}>{user?.role === "admin" && <Link className={styles.backoffice} href="/tablero"><DriverIcon name="back"/>Volver al backoffice</Link>}<button className={styles.logout} type="button" onClick={signOut}><DriverIcon name="logout"/><span>Salir</span></button></div></aside><header className={styles.mobileHeader}><b>SuperX</b><span>|</span><strong>Reparto</strong></header><main className={styles.main}>{children}</main><nav className={styles.bottomNav} aria-label="Navegación móvil"><Link href="/reparto?tab=ruta" aria-current={pathname === "/reparto" && params.get("tab") !== "pedidos" ? "page" : undefined}><DriverIcon name="route"/><span>Ruta</span></Link><Link data-subtab="true" href="/reparto?tab=pedidos" aria-current={pathname === "/reparto" && params.get("tab") === "pedidos" ? "page" : undefined}><DriverIcon name="orders"/><span>Pedidos</span></Link><Link href="/reparto/historial" aria-current={active("/reparto/historial") ? "page" : undefined}><DriverIcon name="history"/><span>Historial</span></Link><Link href="/reparto/perfil" aria-current={active("/reparto/perfil") ? "page" : undefined}><DriverIcon name="profile"/><span>Perfil</span></Link></nav></div>;
}
