import { fixturesEnabled } from "./api-mode";

/** Backend roles; unknown/missing roles fail closed outside fixtures. */
export const actionRoles = {
  "orders.read": ["support", "accountant"],
  "orders.transition": ["support"],
  "orders.payment": ["accountant"],
  "orders.refund": ["accountant"],
  "orders.assignDriver": ["support"],
  "drivers.read": ["support"],
  "drivers.write": [],
  "customers.read": ["support", "accountant"],
  "customers.write": [],
  "withdrawals.read": ["support", "accountant"],
  "withdrawals.write": ["support"],
  "catalog.read": ["support", "accountant"],
  "catalog.write": [],
  "prices.read": ["support", "accountant"],
  "prices.write": [],
  "inventory.read": ["support", "accountant"],
  "inventory.write": [],
  "suppliers.read": ["accountant"],
  "suppliers.write": [],
  "purchasing.read": ["accountant"],
  "purchasing.write": [],
  "receiving.read": ["warehouse", "accountant"],
  "receiving.write": ["warehouse"],
  "picking.write": ["picker"],
  "delivery.work": ["driver"],
  "finance.read": ["accountant"],
  "finance.write": ["accountant"],
  "dashboard.read": ["accountant"],
  "audit.read": ["accountant"],
  "settings.manage": [],
  "users.manage": [],
  "notifications.manage": [],
  "paymentMethods.manage": [],
  "delivery.configure": [],
  "locations.manage": [],
  "warehouses.manage": [],
} satisfies Record<string, readonly string[]>;
export type Action = keyof typeof actionRoles;
export function can(role: string | null | undefined, action: Action): boolean {
  return fixturesEnabled() || role === "admin" || Boolean(role && (actionRoles[action] as readonly string[]).includes(role));
}
