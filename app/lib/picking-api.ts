import type { PickingApi, PickingItem, PickingTask } from "./picking-contract";
import { clampPickQuantity } from "./picking-rules";

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const base = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;

export class PickingApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "PickingApiError";
  }
}

// --- fixture ------------------------------------------------------------

const item = (id: string, name: string, req: number, code: string, sort: number): PickingItem => ({
  id,
  productName: name,
  unitCode: "UN",
  quantityRequired: req,
  quantityPicked: 0,
  locationCode: code,
  locationSortOrder: sort,
  status: "PENDING",
});

let fixtureTasks: PickingTask[] = [
  {
    id: "pt-1",
    orderNumber: "SX-1048",
    status: "ASSIGNED",
    priority: 5,
    slotDate: "2026-09-12",
    slotStart: "10:00",
    assignedPickerId: "me",
    items: [
      item("pi-1", "Yerba mate tradicional 500 g", 2, "A-01-2", 12),
      item("pi-2", "Agua mineral sin gas 1,5 L", 3, "B-04-1", 41),
      item("pi-3", "Pan lactal 500 g", 1, "C-02-3", 63),
    ],
  },
  {
    id: "pt-2",
    orderNumber: "SX-1049",
    status: "PENDING",
    priority: 0,
    slotDate: "2026-09-12",
    slotStart: "12:00",
    assignedPickerId: null,
    items: [item("pi-4", "Jugo de naranja 1 L", 4, "A-03-1", 20)],
  },
];

const clone = (task: PickingTask): PickingTask => ({ ...task, items: task.items.map((i) => ({ ...i })) });
const replace = (next: PickingTask) => {
  fixtureTasks = fixtureTasks.map((t) => (t.id === next.id ? next : t));
};
const find = (id: string): PickingTask => {
  const task = fixtureTasks.find((t) => t.id === id);
  if (!task) throw new PickingApiError("La tarea ya no está disponible.", 404, "not_found");
  return task;
};

// --- HTTP -------------------------------------------------------------

async function http(path: string, init?: RequestInit): Promise<PickingTask> {
  const url = base()!;
  const response = await fetch(`${url.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    credentials: "include",
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) throw new PickingApiError("Iniciá sesión para trabajar en picking.", 401, "unauthenticated");
  if (response.status === 403) throw new PickingApiError("Esta tarea está asignada a otra persona.", 403, "forbidden");
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string"
      ? (payload as { message: string }).message
      : "No pudimos completar la acción.";
    throw new PickingApiError(message, response.status);
  }
  return payload as PickingTask;
}

async function httpList(path: string): Promise<PickingTask[]> {
  const url = base()!;
  const response = await fetch(`${url.replace(/\/$/, "")}${path}`, { headers: { Accept: "application/json" }, credentials: "include" });
  if (response.status === 401) throw new PickingApiError("Iniciá sesión para trabajar en picking.", 401, "unauthenticated");
  if (!response.ok) throw new PickingApiError("No pudimos cargar las tareas.", response.status);
  const payload: unknown = await response.json().catch(() => undefined);
  return Array.isArray(payload) ? (payload as PickingTask[]) : [];
}

export const pickingApi: PickingApi = {
  async listMyTasks() {
    if (!base()) { await wait(); return fixtureTasks.filter((t) => t.assignedPickerId === "me" && t.status !== "COMPLETED" && t.status !== "CANCELLED").map(clone); }
    return httpList("/api/picking/tasks?assignedTo=me");
  },
  async listAvailableTasks() {
    if (!base()) { await wait(); return fixtureTasks.filter((t) => t.status === "PENDING").map(clone); }
    return httpList("/api/picking/tasks?status=PENDING");
  },
  async getTask(id) {
    if (!base()) { await wait(); return clone(find(id)); }
    return http(`/api/picking/tasks/${encodeURIComponent(id)}`, { method: "GET" });
  },
  async assignToMe(id) {
    if (!base()) {
      await wait();
      const task = find(id);
      const next = { ...clone(task), status: "ASSIGNED" as const, assignedPickerId: "me" };
      replace(next);
      return clone(next);
    }
    return http(`/api/picking/tasks/${encodeURIComponent(id)}/assign`, { method: "POST", body: "{}" });
  },
  async startTask(id) {
    if (!base()) {
      await wait();
      const next = { ...clone(find(id)), status: "IN_PROGRESS" as const };
      replace(next);
      return clone(next);
    }
    return http(`/api/picking/tasks/${encodeURIComponent(id)}/start`, { method: "POST", body: "{}" });
  },
  async pickItem(taskId, itemId, quantity) {
    if (!base()) {
      await wait(150);
      const task = find(taskId);
      if (task.status !== "IN_PROGRESS") throw new PickingApiError("Empezá la tarea antes de registrar cantidades.", 409, "not_started");
      const next = clone(task);
      const line = next.items.find((i) => i.id === itemId);
      if (!line) throw new PickingApiError("Línea no encontrada.", 404, "not_found");
      if (quantity > line.quantityRequired) throw new PickingApiError(`No podés pickear más de ${line.quantityRequired}.`, 400, "over_pick");
      line.quantityPicked = clampPickQuantity(line, quantity);
      line.status = line.quantityPicked === line.quantityRequired ? "PICKED" : "PENDING";
      replace(next);
      return clone(next);
    }
    return http(`/api/picking/tasks/${encodeURIComponent(taskId)}/items/${encodeURIComponent(itemId)}/pick`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    });
  },
  async completeTask(id) {
    if (!base()) {
      await wait();
      const task = find(id);
      if (task.items.some((i) => i.status === "PENDING")) throw new PickingApiError("Quedan líneas sin resolver.", 409, "pending_lines");
      const next = { ...clone(task), status: "COMPLETED" as const };
      replace(next);
      return clone(next);
    }
    return http(`/api/picking/tasks/${encodeURIComponent(id)}/complete`, { method: "POST", body: "{}" });
  },
};
