import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
import { orderApi } from "./order-api";
import { canAssignOrder } from "./driver-admin-rules";
import type { DeliveryAssignment, Driver, DriverCandidate, DriverInput, OrderAssignmentsView } from "./driver-admin-contract";

const now = () => new Date().toISOString();
const drivers: Driver[] = [{ id: "101", name: "Lucía Pérez", phone: "2474401234", vehicleType: "Moto", active: true, createdAt: now(), updatedAt: now(), user: { id: "101", email: "lucia@fixture.local", isActive: true }, activeAssignments: 0 }];
let candidates: DriverCandidate[] = [{ id: "102", email: "marcos@fixture.local", name: "Marcos Díaz", phone: "2474405678", isActive: true }];
const assignments: DeliveryAssignment[] = [];
const clone = <T,>(value: T): T => structuredClone(value);
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await authFetch(`${apiBaseUrl()!.replace(/\/$/, "")}${path}`, { method, headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(typeof payload?.message === "string" ? payload.message : Array.isArray(payload?.message) ? payload.message.join(" ") : "No pudimos completar la operación de reparto."), { status: response.status });
  return payload as T;
}
const candidate = (item: DriverCandidate): DriverCandidate => ({ ...item, id: String(item.id) });
const driver = (item: Driver): Driver => ({ ...item, id: String(item.id), user: item.user ? { ...item.user, id: String(item.user.id) } : null });
const assignment = (item: DeliveryAssignment): DeliveryAssignment => ({ ...item, id: String(item.id), orderId: String(item.orderId), driverId: String(item.driverId) });
export async function listDrivers(active?: boolean): Promise<Driver[]> {
  if (fixturesEnabled()) return clone(drivers.filter(d => active === undefined || d.active === active).map(d => ({ ...d, activeAssignments: assignments.filter(a => a.driverId === d.id && a.status === "ACTIVE").length })));
  return (await request<Driver[]>(`/drivers${active === undefined ? "" : `?active=${active}`}`)).map(driver);
}
export async function listDriverCandidates(): Promise<DriverCandidate[]> {
  if (fixturesEnabled()) return clone(candidates);
  return (await request<DriverCandidate[]>("/drivers/candidates")).map(candidate);
}
export async function createDriver(input: DriverInput & { userId: number }): Promise<Driver> {
  if (fixturesEnabled()) {
    const id = String(input.userId);
    if (drivers.some(d => d.id === id)) throw new Error("El usuario ya tiene perfil de repartidor.");
    const user = candidates.find(c => c.id === id);
    if (!user) throw new Error("El usuario no es un repartidor.");
    const phone = input.phone || user.phone;
    if (!phone) throw new Error("Falta el teléfono del repartidor.");
    const created: Driver = { id, name: input.name || user.name || user.email, phone, vehicleType: input.vehicleType ?? null, active: input.active ?? true, createdAt: now(), updatedAt: now(), user: { id, email: user.email, isActive: user.isActive }, activeAssignments: 0 };
    drivers.push(created); candidates = candidates.filter(c => c.id !== id); return clone(created);
  }
  return driver(await request<Driver>("/drivers", "POST", input));
}
export async function updateDriver(id: string, input: DriverInput): Promise<Driver> {
  if (fixturesEnabled()) { const found = drivers.find(d => d.id === id); if (!found) throw new Error("Repartidor no encontrado."); Object.assign(found, input, { updatedAt: now() }); return clone(found); }
  return driver(await request<Driver>(`/drivers/${encodeURIComponent(id)}`, "PATCH", input));
}
export async function getOrderAssignment(id: string): Promise<OrderAssignmentsView> {
  if (fixturesEnabled()) { const history = assignments.filter(a => a.orderId === id); return clone({ active: history.find(a => a.status === "ACTIVE") ?? null, history }); }
  const view = await request<OrderAssignmentsView>(`/orders/${encodeURIComponent(id)}/assignment`);
  return { active: view.active ? assignment(view.active) : null, history: view.history.map(assignment) };
}
export async function assignOrder(id: string, driverId: string, note?: string): Promise<DeliveryAssignment> {
  if (fixturesEnabled()) {
    const active = assignments.find(a => a.orderId === id && a.status === "ACTIVE");
    const order = await orderApi.getOrder(id);
    if (!canAssignOrder(order.status, Boolean(active))) throw new Error("El pedido no permite asignar un repartidor en su estado actual.");
    if (!drivers.some(d => d.id === driverId && d.active)) throw new Error("El repartidor no está activo.");
    if (active?.driverId === driverId) throw new Error("El pedido ya está asignado a este repartidor.");
    if (active) { active.status = "REASSIGNED"; active.endedAt = now(); }
    const created: DeliveryAssignment = { id: crypto.randomUUID(), orderId: id, driverId, status: "ACTIVE", assignedAt: now(), endedAt: null, note: note ?? null }; assignments.push(created); return clone(created);
  }
  return assignment(await request<DeliveryAssignment>(`/orders/${encodeURIComponent(id)}/assignment`, "POST", { driverId: Number(driverId), ...(note ? { note } : {}) }));
}
export async function listActiveAssignments(): Promise<DeliveryAssignment[]> {
  if (fixturesEnabled()) return clone(assignments.filter(a => a.status === "ACTIVE"));
  return (await request<DeliveryAssignment[]>("/delivery-assignments?status=ACTIVE")).map(assignment);
}
