import { authFetch } from "@/app/lib/http";
import type { DispatchApi, DispatchBoard, DispatchOrder } from "./dispatch-contract";

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const base = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;

export class DispatchApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "DispatchApiError";
  }
}

const delivery = (recipientName: string, phone: string, addressLine: string, neighborhood: string, slotStart: string, slotEnd: string) => ({ recipientName, phone, addressLine, neighborhood, postalCode: "1428", cityName: "CABA", addressNotes: "Tocar timbre", customerNotes: null, zoneName: "Norte", slotDate: "2026-09-28", slotStart, slotEnd });
const order = (id: string, orderNumber: string, status: DispatchOrder["status"], position: number, name: string, address: string, paymentMethod: DispatchOrder["paymentMethod"], paymentStatus: DispatchOrder["paymentStatus"]): DispatchOrder => ({
  id, orderNumber, status, position, paymentMethod, paymentStatus,
  delivery: delivery(name, `+54 9 11 5555-01${id.padStart(2, "0")}`, address, "Belgrano", "10:00:00", "12:00:00"),
  items: [{ productName: "Yerba mate tradicional 500 g", quantity: 2, unitCode: "UN" }, { productName: "Agua mineral sin gas 1,5 L", quantity: 3, unitCode: "UN" }],
});

let fixture: DispatchBoard = {
  ready: [order("1", "SX-1048", "READY", 1, "Ana Gómez", "Av. Cabildo 1820, 4° B", "CASH", "PENDING"), order("2", "SX-1049", "READY", 2, "Marcos Ruiz", "Moldes 2480", "BANK_TRANSFER", "PENDING")],
  outForDelivery: [order("3", "SX-1042", "OUT_FOR_DELIVERY", 1, "Lucía Fernández", "Amenábar 910", "MERCADO_PAGO", "PAID")],
};

const cloneOrder = (value: DispatchOrder): DispatchOrder => ({ ...value, delivery: { ...value.delivery }, items: value.items.map((item) => ({ ...item })) });
const cloneBoard = (value: DispatchBoard): DispatchBoard => ({ ready: value.ready.map(cloneOrder), outForDelivery: value.outForDelivery.map(cloneOrder) });

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await authFetch(`${base()!.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) throw new DispatchApiError("Iniciá sesión para trabajar en reparto.", 401, "unauthenticated");
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : "No pudimos completar la acción.";
    throw new DispatchApiError(message, response.status);
  }
  return payload;
}

const numericIds = (ids: string[]) => ids.map(Number);

export const dispatchApi: DispatchApi = {
  async getBoard() {
    if (!base()) { await wait(); return cloneBoard(fixture); }
    return request("/dispatch") as Promise<DispatchBoard>;
  },
  async saveSequence(orderIds) {
    if (!base()) {
      await wait();
      const byId = new Map(fixture.ready.map((item) => [item.id, item]));
      fixture = { ...fixture, ready: orderIds.map((id, index) => ({ ...byId.get(id)!, position: index + 1 })).filter(Boolean) };
      return cloneBoard(fixture);
    }
    return request("/dispatch/sequence", { method: "PUT", body: JSON.stringify({ orderIds: numericIds(orderIds) }) }) as Promise<DispatchBoard>;
  },
  async start(orderIds) {
    if (!base()) {
      await wait();
      const selected = new Set(orderIds);
      const moved = fixture.ready.filter((item) => selected.has(item.id)).map((item, index) => ({ ...item, status: "OUT_FOR_DELIVERY" as const, position: fixture.outForDelivery.length + index + 1 }));
      fixture = { ready: fixture.ready.filter((item) => !selected.has(item.id)), outForDelivery: [...fixture.outForDelivery, ...moved] };
      return cloneBoard(fixture);
    }
    return request("/dispatch/start", { method: "POST", body: JSON.stringify({ orderIds: numericIds(orderIds) }) }) as Promise<DispatchBoard>;
  },
  async markDelivered(id) {
    if (!base()) { await wait(); fixture = { ...fixture, outForDelivery: fixture.outForDelivery.filter((item) => item.id !== id) }; return; }
    await request(`/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status: "DELIVERED" }) });
  },
};
