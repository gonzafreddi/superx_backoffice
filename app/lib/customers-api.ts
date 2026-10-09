import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";

export type CustomerSort = "recent" | "orders" | "spent" | "lastOrder";
export type Customer = { id: string; email: string; name: string | null; phone: string | null; createdAt: string; ordersCount: number; totalSpent: string; averageTicket: string | null; lastOrderAt: string | null; city: string | null };
export type CustomerAddress = { id: string; label: string; recipientName: string; phone: string; street: string; streetNumber: string; apartment: string | null; neighborhood: string | null; postalCode: string; notes: string | null; isDefault: boolean; city: string };
export type CustomerOrder = { id: string; orderNumber: string; status: string; grandTotal: string; currency: string; placedAt: string; slotDate: string };
export type CustomerDetail = Customer & { addresses: CustomerAddress[]; orders: CustomerOrder[] };
export type CustomerPage = { items: Customer[]; total: number; page: number; pageSize: number };

const apiRoot = () => apiBaseUrl()?.replace(/\/$/, "");

const fixture: CustomerDetail = { id: "fixture-customer", email: "cliente@superx.local", name: "Cliente de prueba", phone: "3474 555555", createdAt: new Date().toISOString(), ordersCount: 0, totalSpent: "0.00", averageTicket: null, lastOrderAt: null, city: "Salto", addresses: [], orders: [] };

async function request<T>(path: string, fallback: string): Promise<T> {
  const response = await authFetch(`${apiRoot()}${path}`, { headers: { Accept: "application/json" } });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" ? (payload as { message?: unknown }).message : undefined;
    throw new Error(response.status === 404 ? "No encontramos ese cliente." : typeof message === "string" ? message : fallback);
  }
  return payload as T;
}

export async function listCustomers(filters: { q?: string; sort?: CustomerSort; page?: number; pageSize?: number } = {}): Promise<CustomerPage> {
  if (fixturesEnabled()) return { items: [fixture], total: 1, page: 1, pageSize: 50 };
  const params = new URLSearchParams({ page: String(filters.page ?? 1), pageSize: String(filters.pageSize ?? 50), sort: filters.sort ?? "recent" });
  if (filters.q) params.set("q", filters.q);
  return request<CustomerPage>(`/customers?${params}`, "No pudimos cargar los clientes.");
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  if (fixturesEnabled()) return fixture;
  return request<CustomerDetail>(`/customers/${encodeURIComponent(id)}`, "No pudimos cargar el cliente.");
}
