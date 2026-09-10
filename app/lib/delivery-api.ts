import type { DeliveryApi, DeliverySlot, DeliveryZone, SlotUpsertInput, ZoneUpdateInput } from "./delivery-contract";
import { buildDeliveryChangeEvent, validateSlotInput, validateZoneInput } from "./delivery-rules";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Math.random()).slice(2));
const change = (id: string, summary: string, actor: string, changedAt: string, role?: DeliveryZone["history"][number]["role"]) => ({ id, summary, actor, changedAt, ...(role ? { role } : {}) });

let zones: DeliveryZone[] = [
  { id: "zone-caballito", name: "Caballito", cityName: "CABA", postalCodes: ["1405", "1406", "1424"], neighborhoods: ["Caballito", "Primera Junta"], deliveryFee: 900, freeDeliveryThreshold: 18000, priority: 10, active: true, updatedAt: "2026-09-01T12:00:00.000Z", history: [change("dc-1", "Zona creada · envío $900 · gratis desde $18.000", "Administración", "2026-09-01T12:00:00.000Z", "admin")] },
  { id: "zone-belgrano", name: "Belgrano", cityName: "CABA", postalCodes: ["1426", "1428"], neighborhoods: ["Belgrano", "Colegiales"], deliveryFee: 1200, freeDeliveryThreshold: 22000, priority: 20, active: true, updatedAt: "2026-09-02T09:30:00.000Z", history: [change("dc-2", "Zona creada · envío $1.200 · gratis desde $22.000", "Administración", "2026-09-02T09:30:00.000Z", "admin")] },
  { id: "zone-lanus", name: "Lanús Centro", cityName: "Lanús", postalCodes: ["1824"], neighborhoods: [], deliveryFee: 1500, freeDeliveryThreshold: null, priority: 5, active: false, updatedAt: "2026-09-03T16:00:00.000Z", history: [change("dc-3", "Zona creada · envío $1.500 · sin envío gratis", "Administración", "2026-09-03T16:00:00.000Z", "admin"), change("dc-3b", "Zona desactivada mientras se ajusta la logística", "Administración", "2026-09-03T16:05:00.000Z", "admin")] },
];

const futureDate = (days: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
let slots: DeliverySlot[] = [
  { id: "slot-c1", zoneId: "zone-caballito", date: futureDate(1), startTime: "10:00", endTime: "12:00", capacity: 12, bookedCount: 7, active: true, updatedAt: "2026-09-04T08:00:00.000Z", history: [change("ds-1", "Franja creada · capacidad 12", "Operador", "2026-09-04T08:00:00.000Z", "operator")] },
  { id: "slot-c2", zoneId: "zone-caballito", date: futureDate(1), startTime: "14:00", endTime: "16:00", capacity: 12, bookedCount: 12, active: true, updatedAt: "2026-09-04T08:05:00.000Z", history: [change("ds-2", "Franja creada · capacidad 12", "Operador", "2026-09-04T08:05:00.000Z", "operator")] },
  { id: "slot-b1", zoneId: "zone-belgrano", date: futureDate(2), startTime: "09:00", endTime: "11:00", capacity: 8, bookedCount: 2, active: true, updatedAt: "2026-09-04T08:10:00.000Z", history: [change("ds-3", "Franja creada · capacidad 8", "Operador", "2026-09-04T08:10:00.000Z", "operator")] },
];

const cloneZone = (zone: DeliveryZone): DeliveryZone => ({ ...zone, postalCodes: [...zone.postalCodes], neighborhoods: [...zone.neighborhoods], history: zone.history.map((entry) => ({ ...entry })) });
const cloneSlot = (slot: DeliverySlot): DeliverySlot => ({ ...slot, history: slot.history.map((entry) => ({ ...entry })) });

function assertValid(errors: object) {
  const message = Object.values(errors)[0] as string | undefined;
  if (message) throw new Error(message);
}

/** Mock TEMPORAL: sustituir por los endpoints admin de BE-012 (zonas) y BE-013 (franjas) cuando estén disponibles. */
export const deliveryApi: DeliveryApi = {
  async listZones() {
    await wait();
    return [...zones].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "es-AR")).map(cloneZone);
  },
  async createZone(input: ZoneUpdateInput) {
    await wait();
    assertValid(validateZoneInput(input));
    const now = new Date().toISOString();
    const zone: DeliveryZone = {
      id: `zone-${uid()}`,
      name: input.name.trim(),
      cityName: input.cityName.trim(),
      postalCodes: input.postalCodes.map((code) => code.trim()).filter(Boolean),
      neighborhoods: input.neighborhoods.map((name) => name.trim()).filter(Boolean),
      deliveryFee: Number(input.deliveryFee),
      freeDeliveryThreshold: input.freeDeliveryThreshold === "" || input.freeDeliveryThreshold === null ? null : Number(input.freeDeliveryThreshold),
      priority: Number(input.priority),
      active: input.active,
      updatedAt: now,
      history: [buildDeliveryChangeEvent(`Zona creada por ${input.changedBy}`, input.changedBy, input.changedByRole, now, `dc-${uid()}`)],
    };
    zones = [...zones, zone];
    return cloneZone(zone);
  },
  async updateZone(id: string, input: ZoneUpdateInput) {
    await wait();
    const zone = zones.find((candidate) => candidate.id === id);
    if (!zone) throw new Error("La zona ya no existe. Actualizá el listado.");
    assertValid(validateZoneInput(input));
    const now = new Date().toISOString();
    const threshold = input.freeDeliveryThreshold === "" || input.freeDeliveryThreshold === null ? null : Number(input.freeDeliveryThreshold);
    const summary = `${input.changedBy} actualizó envío $${Number(input.deliveryFee).toLocaleString("es-AR")}${threshold ? ` · gratis desde $${threshold.toLocaleString("es-AR")}` : " · sin envío gratis"}${input.active ? "" : " · zona inactiva"}${input.reason ? ` — ${input.reason}` : ""}`;
    const updated: DeliveryZone = { ...zone, name: input.name.trim(), cityName: input.cityName.trim(), postalCodes: input.postalCodes.map((c) => c.trim()).filter(Boolean), neighborhoods: input.neighborhoods.map((n) => n.trim()).filter(Boolean), deliveryFee: Number(input.deliveryFee), freeDeliveryThreshold: threshold, priority: Number(input.priority), active: input.active, updatedAt: now, history: [...zone.history, buildDeliveryChangeEvent(summary, input.changedBy, input.changedByRole, now, `dc-${uid()}`)] };
    zones = zones.map((candidate) => (candidate.id === id ? updated : candidate));
    return cloneZone(updated);
  },
  async listSlots(zoneId: string) {
    await wait();
    return slots.filter((slot) => slot.zoneId === zoneId).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).map(cloneSlot);
  },
  async createSlot(zoneId: string, input: SlotUpsertInput) {
    await wait();
    if (!zones.some((zone) => zone.id === zoneId)) throw new Error("La zona ya no existe. Actualizá el listado.");
    assertValid(validateSlotInput(input, { existingSlots: slots.filter((slot) => slot.zoneId === zoneId), today: new Date().toISOString().slice(0, 10) }));
    const now = new Date().toISOString();
    const slot: DeliverySlot = { id: `slot-${uid()}`, zoneId, date: input.date, startTime: input.startTime, endTime: input.endTime, capacity: Number(input.capacity), bookedCount: 0, active: input.active, updatedAt: now, history: [buildDeliveryChangeEvent(`Franja creada por ${input.changedBy} · capacidad ${Number(input.capacity)}`, input.changedBy, input.changedByRole, now, `ds-${uid()}`)] };
    slots = [...slots, slot];
    return cloneSlot(slot);
  },
  async updateSlot(id: string, input: SlotUpsertInput) {
    await wait();
    const slot = slots.find((candidate) => candidate.id === id);
    if (!slot) throw new Error("La franja ya no existe. Actualizá el listado.");
    assertValid(validateSlotInput(input, { existingSlots: slots.filter((candidate) => candidate.zoneId === slot.zoneId), today: new Date().toISOString().slice(0, 10), editingSlot: slot }));
    const now = new Date().toISOString();
    const summary = `${input.changedBy} ajustó la franja · capacidad ${Number(input.capacity)}${input.active ? "" : " · inactiva"}${input.reason ? ` — ${input.reason}` : ""}`;
    const updated: DeliverySlot = { ...slot, date: input.date, startTime: input.startTime, endTime: input.endTime, capacity: Number(input.capacity), active: input.active, updatedAt: now, history: [...slot.history, buildDeliveryChangeEvent(summary, input.changedBy, input.changedByRole, now, `ds-${uid()}`)] };
    slots = slots.map((candidate) => (candidate.id === id ? updated : candidate));
    return cloneSlot(updated);
  },
};
