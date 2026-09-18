"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAccessToken, getStoredUser, logout } from "@/app/lib/auth-api";

const items = [
  { href: "/tablero", label: "Tablero", icon: "▲" },
  { href: "/productos", label: "Productos", icon: "□" },
  { href: "/precios", label: "Precios", icon: "◇" },
  { href: "/inventario", label: "Inventario", icon: "▦" },
  { href: "/pedidos", label: "Pedidos", icon: "◫" },
  { href: "/entregas", label: "Entregas", icon: "◈" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      // No API base URL configured (local fixture mode) never requires
      // login, matching how every other screen falls back to fixtures.
      if (!process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL || getAccessToken()) {
        setReady(true);
        return;
      }
      router.replace("/login");
    }, 0);
  }, [router]);

  if (!ready) return null;

  const user = getStoredUser();

  return <div className="catalog-shell">
    <aside className="sidebar" aria-label="Navegación principal">
      <Link className="brandmark" href="/inventario" aria-label="SuperX backoffice">
        <span>SX</span><strong>superx</strong>
      </Link>
      <nav>{items.map((item) => <Link key={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
        <span aria-hidden="true" className="nav-icon">{item.icon}</span>{item.label}
      </Link>)}</nav>
      <div className="sidebar-footer">
        Backoffice<br /><small>SuperX</small>
        {user && <><br /><small>{user.email}</small></>}
        <button type="button" className="nav-item" onClick={() => { logout(); router.replace("/login"); }}>Cerrar sesión</button>
      </div>
    </aside>
    {children}
  </div>;
}
