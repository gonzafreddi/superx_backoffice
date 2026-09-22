"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAccessToken, getStoredUser, logout } from "@/app/lib/auth-api";

const navGroups = [
  { label: "Operación", items: [
    { href: "/administracion", label: "Administración", icon: "admin" }, { href: "/tablero", label: "Tablero", icon: "chart" }, { href: "/pedidos", label: "Pedidos", icon: "receipt" }, { href: "/entregas", label: "Entregas", icon: "truck" },
  ] },
  { label: "Catálogo", items: [
    { href: "/productos", label: "Productos", icon: "box" }, { href: "/precios", label: "Precios", icon: "tag" }, { href: "/inventario", label: "Inventario", icon: "shelves" }, { href: "/ubicaciones", label: "Ubicaciones", icon: "pin" },
  ] },
  { label: "Compras y proveedores", items: [
    { href: "/proveedores", label: "Proveedores", icon: "supplier" }, { href: "/compras", label: "Compras", icon: "purchase" }, { href: "/facturas", label: "Facturas", icon: "invoice" }, { href: "/pagos", label: "Pagos", icon: "payment" },
  ] },
  { label: "Finanzas", items: [
    { href: "/gastos", label: "Gastos", icon: "expense" }, { href: "/inversiones", label: "Inversiones", icon: "asset" }, { href: "/tesoreria", label: "Tesorería", icon: "treasury" },
  ] },
];
const items = navGroups.flatMap((group) => group.items);

function NavIcon({ name }: { name: string }) {
  const props = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    admin: <><rect {...props} x="4" y="4" width="16" height="16" /><path {...props} d="M8 16v-4M12 16V8M16 16v-6" /></>,
    invoice: <><path {...props} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path {...props} d="M9 8h6M9 12h6M9 16h4" /></>, payment: <><path {...props} d="M3 7h18v11H3z" /><path {...props} d="M3 11h18M7 15h3" /></>, expense: <><path {...props} d="M5 4h14v16H5z"/><path {...props} d="M8 8h8M8 12h8M8 16h4"/></>, asset: <><rect {...props} x="4" y="5" width="16" height="14"/><path {...props} d="M8 5V3h8v2M8 12h8M12 9v6"/></>,
    chart: <path {...props} d="M4 19V10M10 19V5M16 19v-7M22 19H2" />, box: <><path {...props} d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path {...props} d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    tag: <><path {...props} d="M20 13.5 13.5 20a2 2 0 0 1-2.8 0L4 13.3V4h9.3l6.7 6.7a2 2 0 0 1 0 2.8Z" /><path {...props} d="M8 8h.01" /></>, shelves: <path {...props} d="M4 4h16v16H4zM4 10h16M8 4v6M16 4v6M8 10v10M16 10v10" />,
    pin: <><path {...props} d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle {...props} cx="12" cy="10" r="2.5" /></>, supplier: <><path {...props} d="M4 7h16v13H4zM8 7V4h8v3M8 12h8M8 16h5" /></>, purchase: <><path {...props} d="M4 5h16v15H4z" /><path {...props} d="M8 3v4M16 3v4M7 11h10M7 15h6" /></>, treasury: <><path {...props} d="M4 7h16v13H4zM7 7V4h10v3M8 12h8M8 16h3M14 16h2" /></>, receipt: <><path {...props} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path {...props} d="M9 8h6M9 12h6" /></>, truck: <><path {...props} d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle {...props} cx="7" cy="18" r="2" /><circle {...props} cx="18" cy="18" r="2" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

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
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); } if (event.key === "Escape") setCommandOpen(false); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, []);

  if (!ready) return null;

  const user = getStoredUser();

  return <div className="catalog-shell">
    <aside className="sidebar" aria-label="Navegación principal">
      <Link className="brandmark" href="/inventario" aria-label="SuperX backoffice">
        <span>SX</span><strong>superx</strong>
      </Link>
      <button type="button" className="command-trigger" onClick={() => setCommandOpen(true)} aria-label="Abrir navegación rápida"><span>Ir a…</span><kbd>⌘ K</kbd></button>
      <nav>{navGroups.map((group) => <div key={group.label} className="nav-group"><p className="nav-section-label">{group.label}</p>{group.items.map((item) => <Link key={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
        <span className="nav-icon"><NavIcon name={item.icon} /></span>{item.label}
      </Link>)}</div>)}</nav>
      <div className="sidebar-footer">
        Backoffice<br /><small>SuperX</small>
        {user && <><br /><small>{user.email}</small></>}
        <button type="button" className="nav-item" onClick={() => { logout(); router.replace("/login"); }}>Cerrar sesión</button>
      </div>
    </aside>
    {children}
    {commandOpen && <div className="command-backdrop" role="presentation" onMouseDown={() => setCommandOpen(false)}><section className="command-menu" role="dialog" aria-modal="true" aria-label="Navegación rápida" onMouseDown={(event) => event.stopPropagation()}><header><span>ACCESO RÁPIDO</span><button type="button" onClick={() => setCommandOpen(false)} aria-label="Cerrar navegación rápida">Esc</button></header><p>Elegí el área que querés gestionar.</p><nav>{items.map((item) => <Link key={item.href} href={item.href} className="command-link" onClick={() => setCommandOpen(false)}><span className="nav-icon"><NavIcon name={item.icon} /></span><strong>{item.label}</strong><small>{item.href.replace("/", "")}</small></Link>)}</nav></section></div>}
  </div>;
}
