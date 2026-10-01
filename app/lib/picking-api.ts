import { authFetch } from "@/app/lib/http";
import type { PickingApi, PickingItem, PickingTask } from "./picking-contract";
import { canCompleteTask, clampPickQuantity } from "./picking-rules";

const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const base = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;

export class PickingApiError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
    this.name = "PickingApiError";
  }
}

// --- fixture ------------------------------------------------------------

const item = (id: string, name: string, req: number, code: string, sort: number, barcode?: string): PickingItem => ({
  id,
  productName: name,
  unitCode: "UN",
  quantityRequired: req,
  quantityPicked: 0,
  locationCode: code,
  locationSortOrder: sort,
  status: "PENDING",
  barcode,
  barcodes: barcode ? [barcode] : [],
  productImageUrl: null,
  brandName: null,
  unitName: "unidades",
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
    pickerName: "Operario de prueba",
    delivery: { recipientName: "Ana Gómez", phone: "+54 9 11 5555-0101", addressLine: "Av. Cabildo 1820, 4° B", neighborhood: "Belgrano", postalCode: "1428", cityName: "CABA", addressNotes: "Timbre 4B", customerNotes: "Llamar al llegar", zoneName: "Norte", slotDate: "2026-09-28", slotStart: "10:00:00", slotEnd: "12:00:00" },
    items: [
      item("pi-1", "Yerba mate tradicional 500 g", 2, "A-01-2", 12, "7791234567891"),
      item("pi-2", "Agua mineral sin gas 1,5 L", 3, "B-04-1", 41, "7791234567890"),
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
    pickerName: null,
    delivery: { recipientName: "Marcos Ruiz", phone: "+54 9 11 5555-0102", addressLine: "Moldes 2480", neighborhood: "Colegiales", postalCode: "1428", cityName: "CABA", addressNotes: null, customerNotes: null, zoneName: "Norte", slotDate: "2026-10-03", slotStart: "12:00:00", slotEnd: "14:00:00" },
    items: [item("pi-4", "Jugo de naranja 1 L", 4, "A-03-1", 20, "7791234567892")],
  },
];

const fixtureProducts = [
  { id: "prod-yogur", name: "Yogur natural 200 g" },
  { id: "prod-agua", name: "Agua mineral con gas 1,5 L" },
  { id: "prod-pan", name: "Pan integral con semillas 500 g" },
];

const clone = (task: PickingTask): PickingTask => ({ ...task, delivery: task.delivery ? { ...task.delivery } : task.delivery, items: task.items.map((i) => ({ ...i })) });
const replace = (next: PickingTask) => {
  fixtureTasks = fixtureTasks.map((t) => (t.id === next.id ? next : t));
};
const find = (id: string): PickingTask => {
  const task = fixtureTasks.find((t) => t.id === id);
  if (!task) throw new PickingApiError("La tarea ya no está disponible.", 404, "not_found");
  return task;
};

// --- HTTP -------------------------------------------------------------
// Real backend at `/picking/tasks` (no `/api` prefix) and bearer auth (no
// cookies) — see auth-api.ts.

async function http(path: string, init?: RequestInit): Promise<PickingTask> {
  const url = base()!;
  const response = await authFetch(`${url.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) throw new PickingApiError("Iniciá sesión para trabajar en picking.", 401, "unauthenticated");
  if (response.status === 403) throw new PickingApiError("Esta tarea está asignada a otra persona.", 403, "forbidden");
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string"
      ? (payload as { message: string }).message
      : "No pudimos completar la acción.";
    if (response.status === 400 && message === "Scanned barcode does not match this item.") {
      throw new PickingApiError("El código escaneado no corresponde a este producto.", 400, "barcode_mismatch");
    }
    const known: Record<string, string> = {
      "Task not found.": "La tarea ya no está disponible.",
      "Picking task not found.": "La tarea ya no está disponible.",
      "Task has pending items.": "Todavía hay productos sin resolver.",
      "Quantity exceeds required quantity.": "La cantidad supera las unidades requeridas.",
    };
    if (response.status === 409 && path.endsWith("/take")) throw new PickingApiError("El pedido ya fue tomado por otro operario.", 409, "already_taken");
    throw new PickingApiError(known[message] ?? (response.status === 404 ? "La tarea ya no está disponible." : "No pudimos completar la acción. Actualizá la tarea e intentá de nuevo."), response.status);
  }
  return payload as PickingTask;
}

async function httpList(path: string): Promise<PickingTask[]> {
  const url = base()!;
  const response = await authFetch(`${url.replace(/\/$/, "")}${path}`, { headers: { Accept: "application/json" } });
  if (response.status === 401) throw new PickingApiError("Iniciá sesión para trabajar en picking.", 401, "unauthenticated");
  if (!response.ok) throw new PickingApiError("No pudimos cargar las tareas.", response.status);
  const payload: unknown = await response.json().catch(() => undefined);
  return Array.isArray(payload) ? (payload as PickingTask[]) : [];
}

async function searchProductsHttp(query: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const url = base()!;
    const response = await authFetch(`${url.replace(/\/$/, "")}/products?q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { items?: unknown }).items)) return [];
    return (payload as { items: Array<{ id: string; name: string }> }).items;
  } catch {
    return [];
  }
}

export const pickingApi: PickingApi = {
  async listMyTasks() {
    if (!base()) { await wait(); return fixtureTasks.filter((t) => t.assignedPickerId === "me" && t.status !== "COMPLETED" && t.status !== "CANCELLED").map(clone); }
    return httpList("/picking/tasks?assignedTo=me");
  },
  async listAvailableTasks() {
    if (!base()) { await wait(); return fixtureTasks.filter((t) => t.status === "PENDING").map(clone); }
    return httpList("/picking/tasks?assignedTo=unassigned&status=PENDING");
  },
  async getTask(id) {
    if (!base()) { await wait(); return clone(find(id)); }
    return http(`/picking/tasks/${encodeURIComponent(id)}`, { method: "GET" });
  },
  async takeTask(id) {
    if (!base()) {
      await wait();
      const task = find(id);
      if (task.status !== "PENDING" || task.assignedPickerId) throw new PickingApiError("El pedido ya fue tomado por otro operario.", 409, "already_taken");
      const next = { ...clone(task), status: "IN_PROGRESS" as const, assignedPickerId: "me", pickerName: "Operario de prueba" };
      replace(next);
      return clone(next);
    }
    return http(`/picking/tasks/${encodeURIComponent(id)}/take`, { method: "POST", body: "{}" });
  },
  async assignToMe(id) {
    if (!base()) {
      await wait();
      const task = find(id);
      const next = { ...clone(task), status: "ASSIGNED" as const, assignedPickerId: "me" };
      replace(next);
      return clone(next);
    }
    return http(`/picking/tasks/${encodeURIComponent(id)}/assign`, { method: "POST", body: "{}" });
  },
  async startTask(id) {
    if (!base()) {
      await wait();
      const next = { ...clone(find(id)), status: "IN_PROGRESS" as const };
      replace(next);
      return clone(next);
    }
    return http(`/picking/tasks/${encodeURIComponent(id)}/start`, { method: "POST", body: "{}" });
  },
  async pickItem(taskId, itemId, quantity, barcode) {
    if (!base()) {
      await wait(150);
      const task = find(taskId);
      if (task.status !== "IN_PROGRESS") throw new PickingApiError("Empezá la tarea antes de registrar cantidades.", 409, "not_started");
      const next = clone(task);
      const line = next.items.find((i) => i.id === itemId);
      if (!line) throw new PickingApiError("Línea no encontrada.", 404, "not_found");
      if (line.status === "SHORT" || line.status === "SUBSTITUTED") throw new PickingApiError("Esta incidencia ya está resuelta.", 409);
      if (barcode && !(line.barcodes ?? [line.barcode]).includes(barcode)) {
        throw new PickingApiError("El código escaneado no corresponde a este producto.", 400, "barcode_mismatch");
      }
      if (quantity > line.quantityRequired) throw new PickingApiError(`No podés pickear más de ${line.quantityRequired}.`, 400, "over_pick");
      line.quantityPicked = clampPickQuantity(line, quantity);
      line.status = line.quantityPicked === line.quantityRequired ? "PICKED" : "PENDING";
      replace(next);
      return clone(next);
    }
    return http(`/picking/tasks/${encodeURIComponent(taskId)}/items/${encodeURIComponent(itemId)}/pick`, {
      method: "POST",
      body: JSON.stringify({ quantity, ...(barcode ? { barcode } : {}) }),
    });
  },
  async reportShortage(taskId, itemId, resolution, substituteProductId, note) {
    if (!base()) {
      await wait();
      const next = clone(find(taskId));
      const line = next.items.find((i) => i.id === itemId);
      if (!line) throw new PickingApiError("Línea no encontrada.", 404, "not_found");
      if (next.status !== "IN_PROGRESS" || line.quantityPicked >= line.quantityRequired) throw new PickingApiError("La cantidad disponible debe ser menor a la requerida.", 409);
      if (resolution === "REPLACE_SIMILAR" && !substituteProductId) throw new PickingApiError("Elegí un producto sustituto.", 400);
      line.note = note;
      const substitute = fixtureProducts.find((product) => product.id === substituteProductId);
      line.status = resolution === "REPLACE_SIMILAR" ? "SUBSTITUTED" : "SHORT";
      line.resolution = resolution;
      line.substituteProductId = substituteProductId;
      line.substituteProductName = substitute?.name;
      replace(next);
      return clone(next);
    }
    return http(`/picking/tasks/${encodeURIComponent(taskId)}/items/${encodeURIComponent(itemId)}/shortage`, {
      method: "POST",
      body: JSON.stringify({ resolution, ...(substituteProductId ? { substituteProductId: Number(substituteProductId) } : {}), ...(note ? { note } : {}) }),
    });
  },
  async searchProducts(query) {
    if (!base()) {
      await wait();
      const normalizedQuery = query.trim().toLocaleLowerCase();
      return fixtureProducts.filter((product) => product.name.toLocaleLowerCase().includes(normalizedQuery));
    }
    return searchProductsHttp(query);
  },
  async completeTask(id) {
    if (!base()) {
      await wait();
      const task = find(id);
      if (!canCompleteTask(task)) throw new PickingApiError("Quedan líneas sin resolver.", 409, "pending_lines");
      const next = { ...clone(task), status: "COMPLETED" as const };
      replace(next);
      return clone(next);
    }
    return http(`/picking/tasks/${encodeURIComponent(id)}/complete`, { method: "POST", body: "{}" });
  },
};
