"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

  return <div className="catalog-shell">
    <aside className="sidebar" aria-label="Navegación principal">
      <Link className="brandmark" href="/inventario" aria-label="SuperX backoffice">
        <span>SX</span><strong>superx</strong>
      </Link>
      <nav>{items.map((item) => <Link key={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
        <span aria-hidden="true" className="nav-icon">{item.icon}</span>{item.label}
      </Link>)}</nav>
      <div className="sidebar-footer">Backoffice<br /><small>SuperX</small></div>
    </aside>
    {children}
  </div>;
}
