export const navGroups = [
  {
    label: "Operación",
    items: [
      { href: "/administracion", label: "Administración", icon: "admin", roles: ["accountant"] },
      { href: "/tablero", label: "Tablero", icon: "chart", roles: ["accountant"] },
      { href: "/pedidos", label: "Pedidos", icon: "receipt", roles: ["support", "accountant"] },
      { href: "/clientes", label: "Clientes", icon: "users", roles: ["support", "accountant"] },
      { href: "/repartidores", label: "Repartidores", icon: "truck", roles: ["support"] },
      { href: "/entregas", label: "Entregas", icon: "truck" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/productos", label: "Productos", icon: "box", roles: ["support", "accountant"] },
      { href: "/productos/categorias", label: "Categorías", icon: "tag", roles: ["support"] },
      { href: "/precios", label: "Precios", icon: "tag", roles: ["support", "accountant"] },
      { href: "/promociones", label: "Promociones", icon: "promotion", roles: ["support"] },
      { href: "/inventario", label: "Inventario", icon: "shelves", roles: ["support", "accountant"] },
      // Ubicaciones/racks deferred: stock is tracked per warehouse for now (route still exists).
      // Combos parked by the owner (route /combos still exists; the API only serves them with COMBOS_ENABLED=true).
    ],
  },
  {
    label: "Compras y proveedores",
    items: [
      { href: "/proveedores", label: "Proveedores", icon: "supplier", roles: ["accountant"] },
      { href: "/compras", label: "Compras", icon: "purchase", roles: ["accountant"] },
      { href: "/facturas", label: "Facturas", icon: "invoice", roles: ["accountant"] },
      { href: "/pagos", label: "Pagos", icon: "payment", roles: ["accountant"] },
      { href: "/impuestos", label: "Impuestos", icon: "tag", roles: ["accountant"] },
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
      { href: "/gastos", label: "Gastos", icon: "expense", roles: ["accountant"] },
      { href: "/inversiones", label: "Inversiones", icon: "asset", roles: ["accountant"] },
      { href: "/tesoreria", label: "Tesorería", icon: "treasury", roles: ["accountant"] },
    ],
  },
  { label: "Administración", items: [{ href: "/auditoria", label: "Auditoría", icon: "receipt", roles: ["accountant"] }, { href: "/usuarios", label: "Usuarios", icon: "users" }, { href: "/arrepentimientos", label: "Arrepentimientos", icon: "receipt", roles: ["support"] }, { href: "/notificaciones", label: "Notificaciones", icon: "bell" }, { href: "/medios-de-pago", label: "Medios de pago", icon: "payment" }] },
];
export type NavItem = { href: string; label: string; icon: string; roles?: string[] };
/** Items without `roles` are admin-only. Without a backend (fixture mode) everyone is treated as admin. */
export const canSee = (item: NavItem, role: string) => role === "admin" || Boolean(item.roles?.includes(role));

export const roleHome: Record<string, string> = { support: "/pedidos", accountant: "/administracion", warehouse: "/deposito", picker: "/picking", driver: "/reparto" };

