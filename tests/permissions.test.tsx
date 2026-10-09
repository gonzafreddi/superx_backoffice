import test from "node:test";
import assert from "node:assert/strict";
import { can, actionRoles, type Action } from "../app/lib/permissions";
import { navGroups, canSee, roleHome } from "../app/lib/navigation";

const support: Action[] = ["orders.read", "orders.transition", "orders.assignDriver", "drivers.read", "customers.read", "withdrawals.read", "withdrawals.write", "catalog.read", "prices.read", "inventory.read"];
const accountant: Action[] = ["reports.read", "exports.read", "audit.read", "orders.read", "orders.payment", "orders.refund", "customers.read", "withdrawals.read", "catalog.read", "prices.read", "inventory.read", "suppliers.read", "purchasing.read", "receiving.read", "finance.read", "finance.write", "dashboard.read"];
const accountant: Action[] = ["inventoryCounts.read", "audit.read", "orders.read", "orders.payment", "orders.refund", "customers.read", "withdrawals.read", "catalog.read", "prices.read", "inventory.read", "suppliers.read", "purchasing.read", "receiving.read", "finance.read", "finance.write", "dashboard.read"];
test("permissions enforce the complete role matrix with a real API", () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  try {
    for (const action of Object.keys(actionRoles) as Action[]) {
      assert.equal(can("admin", action), true, `admin ${action}`);
      assert.equal(can("support", action), support.includes(action), `support ${action}`);
      assert.equal(can("accountant", action), accountant.includes(action), `accountant ${action}`);
      for (const role of ["customer", "unknown", undefined, null]) assert.equal(can(role, action), false, `${role} ${action}`);
      for (const [role, actions] of [["warehouse", ["receiving.read", "receiving.write", "inventoryCounts.read", "inventoryCounts.write"]], ["picker", ["picking.write"]], ["driver", ["delivery.work"]]] as const) assert.equal(can(role, action), (actions as readonly string[]).includes(action), `${role} ${action}`);
    }
  } finally { if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});
test("fixtures treat every role as admin", () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  try { for (const action of Object.keys(actionRoles) as Action[]) for (const role of ["support", "accountant", "customer", undefined]) assert.equal(can(role, action), true); }
  finally { if (previous !== undefined) process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous; }
});
test("navigation and homes match the plan; admin sees every item", () => {
  const items = navGroups.flatMap(group => group.items);
  const visible = (role: string) => items.filter(item => canSee(item, role)).map(item => item.href);
  assert.deepEqual(visible("support"), ["/pedidos", "/clientes", "/repartidores", "/productos", "/productos/categorias", "/precios", "/promociones", "/inventario", "/arrepentimientos"]);
  assert.deepEqual(visible("accountant"), ["/administracion", "/tablero", "/pedidos", "/clientes", "/productos", "/precios", "/inventario", "/proveedores", "/compras", "/facturas", "/pagos", "/impuestos", "/reportes", "/gastos", "/inversiones", "/tesoreria", "/auditoria"]);
  assert.deepEqual(visible("accountant"), ["/administracion", "/tablero", "/pedidos", "/clientes", "/productos", "/precios", "/inventario", "/proveedores", "/compras", "/facturas", "/pagos", "/impuestos", "/inventario/conteos", "/gastos", "/inversiones", "/tesoreria", "/auditoria"]);
  assert.equal(visible("admin").length, items.length);
  assert.deepEqual(visible("warehouse"), ["/inventario/conteos", "/deposito"]);
  assert.deepEqual(visible("picker"), ["/picking"]);
  assert.deepEqual(visible("driver"), ["/reparto"]);
  assert.deepEqual(visible("customer"), []);
  assert.deepEqual(visible("unknown"), []);
  assert.equal(roleHome.support, "/pedidos");
  assert.equal(roleHome.accountant, "/administracion");
});
