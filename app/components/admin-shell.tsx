"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAccessToken, getStoredUser, logout } from "@/app/lib/auth-api";
import { receivingApi } from "@/app/lib/receiving-api";

const navGroups = [
  {
    label: "Operación",
    items: [
      { href: "/administracion", label: "Administración", icon: "admin" },
      { href: "/tablero", label: "Tablero", icon: "chart" },
      { href: "/pedidos", label: "Pedidos", icon: "receipt" },
      { href: "/entregas", label: "Entregas", icon: "truck" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/productos", label: "Productos", icon: "box" },
      { href: "/precios", label: "Precios", icon: "tag" },
      { href: "/promociones", label: "Promociones", icon: "promotion" },
      { href: "/inventario", label: "Inventario", icon: "shelves" },
      // Ubicaciones/racks deferred: stock is tracked per warehouse for now (route still exists).
    ],
  },
  {
    label: "Compras y proveedores",
    items: [
      { href: "/proveedores", label: "Proveedores", icon: "supplier" },
      { href: "/compras", label: "Compras", icon: "purchase" },
      { href: "/facturas", label: "Facturas", icon: "invoice" },
      { href: "/pagos", label: "Pagos", icon: "payment" },
    ],
  },
  {
    label: "Depósito",
    items: [
      { href: "/deposito", label: "Por recibir", icon: "warehouse", roles: ["admin", "warehouse"] },
      { href: "/picking", label: "Picking", icon: "box", roles: ["admin", "picker"] },
      { href: "/reparto", label: "Reparto", icon: "truck", roles: ["admin", "driver"] },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/gastos", label: "Gastos", icon: "expense" },
      { href: "/inversiones", label: "Inversiones", icon: "asset" },
      { href: "/tesoreria", label: "Tesorería", icon: "treasury" },
    ],
  },
  { label: "Administración", items: [{ href: "/usuarios", label: "Usuarios", icon: "users" }, { href: "/medios-de-pago", label: "Medios de pago", icon: "payment" }] },
];
type NavItem = { href: string; label: string; icon: string; roles?: string[] };
/** Items without `roles` are admin-only. Without a backend (fixture mode) everyone is treated as admin. */
const canSee = (item: NavItem, role: string) => role === "admin" || Boolean(item.roles?.includes(role));
const allItems: NavItem[] = navGroups.flatMap((group) => group.items);
const roleHome: Record<string, string> = { warehouse: "/deposito", picker: "/picking", driver: "/reparto" };

function NavIcon({ name }: { name: string }) {
  const props = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, ReactNode> = {
    admin: (
      <>
        <rect {...props} x="4" y="4" width="16" height="16" />
        <path {...props} d="M8 16v-4M12 16V8M16 16v-6" />
      </>
    ),
    invoice: (
      <>
        <path {...props} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path {...props} d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    payment: (
      <>
        <path {...props} d="M3 7h18v11H3z" />
        <path {...props} d="M3 11h18M7 15h3" />
      </>
    ),
    expense: (
      <>
        <path {...props} d="M5 4h14v16H5z" />
        <path {...props} d="M8 8h8M8 12h8M8 16h4" />
      </>
    ),
    asset: (
      <>
        <rect {...props} x="4" y="5" width="16" height="14" />
        <path {...props} d="M8 5V3h8v2M8 12h8M12 9v6" />
      </>
    ),
    chart: <path {...props} d="M4 19V10M10 19V5M16 19v-7M22 19H2" />,
    box: (
      <>
        <path {...props} d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path {...props} d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    tag: (
      <>
        <path {...props} d="M20 13.5 13.5 20a2 2 0 0 1-2.8 0L4 13.3V4h9.3l6.7 6.7a2 2 0 0 1 0 2.8Z" />
        <path {...props} d="M8 8h.01" />
      </>
    ),
    promotion: (
      <>
        <path {...props} d="M5 12h14M8 5h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
        <path {...props} d="m9 15 6-6M9 9h.01M15 15h.01" />
      </>
    ),
    shelves: <path {...props} d="M4 4h16v16H4zM4 10h16M8 4v6M16 4v6M8 10v10M16 10v10" />,
    pin: (
      <>
        <path {...props} d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle {...props} cx="12" cy="10" r="2.5" />
      </>
    ),
    supplier: (
      <>
        <path {...props} d="M4 7h16v13H4zM8 7V4h8v3M8 12h8M8 16h5" />
      </>
    ),
    purchase: (
      <>
        <path {...props} d="M4 5h16v15H4z" />
        <path {...props} d="M8 3v4M16 3v4M7 11h10M7 15h6" />
      </>
    ),
    treasury: (
      <>
        <path {...props} d="M4 7h16v13H4zM7 7V4h10v3M8 12h8M8 16h3M14 16h2" />
      </>
    ),
    receipt: (
      <>
        <path {...props} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path {...props} d="M9 8h6M9 12h6" />
      </>
    ),
    truck: (
      <>
        <path {...props} d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
        <circle {...props} cx="7" cy="18" r="2" />
        <circle {...props} cx="18" cy="18" r="2" />
      </>
    ),
    warehouse: (
      <>
        <path {...props} d="M3 10 12 4l9 6v10H3V10Z" />
        <path {...props} d="M7 13h10v7M9 13v7M15 13v7" />
      </>
    ),
    users: (
      <>
        <circle {...props} cx="9" cy="8" r="3" />
        <path {...props} d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6M17 14c3 .4 4 2.4 4 6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [pendingReceipts, setPendingReceipts] = useState<number | null>(null);
  const openCommand = () => {
    setCommandQuery("");
    setCommandOpen(true);
  };
  const closeCommand = () => {
    setCommandOpen(false);
    setCommandQuery("");
  };
  // Role is read after mount (`ready`); the shell renders nothing before that, so there's no hydration mismatch.
  const user = ready ? getStoredUser() : null;
  const role = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL ? (user?.role ?? "customer") : "admin";
  const items = allItems.filter((item) => canSee(item, role));
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => canSee(item, role)) }))
    .filter((group) => group.items.length > 0);
  const home = roleHome[role] ?? "/administracion";
  const canSeeReceipts = items.some((item) => item.href === "/deposito");
  const normalizedQuery = commandQuery.trim().toLocaleLowerCase("es-AR");
  const filteredItems = normalizedQuery
    ? items.filter(
        (item) =>
          item.label.toLocaleLowerCase("es-AR").includes(normalizedQuery) ||
          item.href.toLocaleLowerCase("es-AR").includes(normalizedQuery),
      )
    : items;

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
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
      }
      if (event.key === "Escape") closeCommand();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  useEffect(() => {
    if (!ready || !canSeeReceipts) return;
    let active = true;
    void receivingApi
      .list({ status: "pending", pageSize: 1 })
      .then((result) => {
        if (active) setPendingReceipts(result.total);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname, ready, canSeeReceipts]);

  if (!ready) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const activeItem = items.find((item) => isActive(item.href));
  const allowed = role === "admin" || Boolean(activeItem);
  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "S";

  return (
    <div className="catalog-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="side-navigation">
        <Link className="brandmark" href={home} aria-label="SuperX backoffice">
          <span>SX</span>
          <strong>superx</strong>
          <small>Backoffice</small>
        </Link>
        <button type="button" className="side-command" onClick={openCommand} aria-label="Abrir navegación rápida">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <span>Buscar</span>
          <kbd>⌘ K</kbd>
        </button>
        <nav className="side-module-nav" aria-label="Navegación principal">
          {visibleGroups.map((group) => (
            <section
              key={group.label}
              className="side-nav-group"
              aria-labelledby={`nav-${group.label.replaceAll(" ", "-")}`}
            >
              <h2 id={`nav-${group.label.replaceAll(" ", "-")}`}>{group.label}</h2>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  className={`side-nav-link ${isActive(item.href) ? "active" : ""}`}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  title={item.label}
                >
                  <span className="nav-icon">
                    <NavIcon name={item.icon} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {item.href === "/deposito" && Boolean(pendingReceipts) && (
                    <b className="side-count" aria-label={`${pendingReceipts} recepciones pendientes`}>
                      {pendingReceipts}
                    </b>
                  )}
                </Link>
              ))}
            </section>
          ))}
        </nav>
        <div className="side-nav-actions">
          <div className="top-user" title={user?.email ?? "SuperX"}>
            <span>{userInitial}</span>
            <div>
              <strong>{user?.email?.split("@")[0] ?? "SuperX"}</strong>
              <small>{activeItem?.label ?? "Backoffice"}</small>
            </div>
          </div>
          <button
            type="button"
            className="top-logout"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
            </svg>
          </button>
        </div>
      </aside>
      <main id="main-content" className="backoffice-main">
        {allowed ? (
          children
        ) : (
          <section className="access-denied-card">
            <p className="eyebrow">ACCESO LIMITADO</p>
            <h1>No tenés acceso a esta sección</h1>
            <p>
              {items.length
                ? "Tu usuario tiene habilitadas solo las secciones del menú."
                : "Tu usuario no tiene secciones habilitadas. Pedile acceso a un administrador."}
            </p>
            {items.length > 0 && (
              <Link className="button primary" href={home}>
                Ir a {items.find((item) => item.href === home)?.label ?? items[0].label}
              </Link>
            )}
          </section>
        )}
      </main>
      {commandOpen && (
        <div className="command-backdrop" role="presentation" onMouseDown={closeCommand}>
          <section
            className="command-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navegación rápida"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <span>ACCESO RÁPIDO</span>
              <button type="button" onClick={closeCommand} aria-label="Cerrar navegación rápida">
                Esc
              </button>
            </header>
            <label className="command-search">
              <span className="sr-only">Buscar sección</span>
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Buscar productos, compras, pedidos…"
              />
            </label>
            <nav>
              {filteredItems.length ? (
                filteredItems.map((item) => (
                  <Link key={item.href} href={item.href} className="command-link" onClick={closeCommand}>
                    <span className="nav-icon">
                      <NavIcon name={item.icon} />
                    </span>
                    <strong>{item.label}</strong>
                    <small>{item.href.replace("/", "")}</small>
                  </Link>
                ))
              ) : (
                <p className="command-empty">No encontramos secciones para “{commandQuery}”.</p>
              )}
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}
