import { authFetch } from "./http";
import type { Combo, ComboApi, ComboInput } from "./combo-contract";

const now = new Date().toISOString();
let fixtures: Combo[] = [];
const base = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL?.replace(/\/$/, "");
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 160));

async function json(url: string, init: RequestInit = {}) {
  const response = await authFetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const raw = payload && typeof payload === "object" ? (payload as { message?: unknown }).message : undefined;
    throw new Error(Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" ? raw : "No pudimos completar la operación.");
  }
  return payload;
}

function fixtureFromInput(id: string, input: ComboInput, previous?: Combo): Combo {
  return {
    id,
    name: input.name,
    slug: previous?.slug ?? input.name.toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    description: input.description?.trim() || null,
    imageUrl: previous?.imageUrl ?? null,
    comboPrice: input.comboPrice.toFixed(2),
    isActive: input.isActive,
    validFrom: input.validFrom ?? null,
    validUntil: input.validUntil ?? null,
    sortOrder: input.sortOrder,
    items: input.items.map((item, index) => ({ id: `${id}-${index}`, productId: String(item.productId), quantity: item.quantity })),
    createdAt: previous?.createdAt ?? now,
    updatedAt: new Date().toISOString(),
  };
}

export const comboApi: ComboApi = {
  async listAdmin() {
    const root = base();
    if (!root) { await wait(); return [...fixtures].sort((a, b) => a.sortOrder - b.sortOrder); }
    return await json(`${root}/combos/admin`) as Combo[];
  },
  async create(input) {
    const root = base();
    if (!root) { await wait(); const combo = fixtureFromInput(String(Date.now()), input); fixtures = [combo, ...fixtures]; return combo; }
    return await json(`${root}/combos`, { method: "POST", body: JSON.stringify(input) }) as Combo;
  },
  async update(id, input) {
    const root = base();
    if (!root) {
      await wait();
      const previous = fixtures.find((item) => item.id === id);
      if (!previous) throw new Error("El combo ya no está disponible.");
      const merged: ComboInput = {
        name: input.name ?? previous.name,
        description: input.description ?? previous.description ?? "",
        comboPrice: input.comboPrice ?? Number(previous.comboPrice),
        isActive: input.isActive ?? previous.isActive,
        validFrom: input.validFrom ?? previous.validFrom ?? undefined,
        validUntil: input.validUntil ?? previous.validUntil ?? undefined,
        sortOrder: input.sortOrder ?? previous.sortOrder,
        items: input.items ?? previous.items,
      };
      const combo = fixtureFromInput(id, merged, previous);
      fixtures = fixtures.map((item) => item.id === id ? combo : item);
      return combo;
    }
    return await json(`${root}/combos/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }) as Combo;
  },
  async uploadImage(id, file) {
    const root = base();
    if (!root) {
      await wait();
      const combo = fixtures.find((item) => item.id === id);
      if (!combo) throw new Error("El combo ya no está disponible.");
      combo.imageUrl = URL.createObjectURL(file); combo.updatedAt = new Date().toISOString(); return { ...combo };
    }
    const form = new FormData(); form.append("file", file);
    return await json(`${root}/combos/${encodeURIComponent(id)}/image`, { method: "POST", body: form }) as Combo;
  },
  async deleteImage(id) {
    const root = base();
    if (!root) {
      await wait();
      const combo = fixtures.find((item) => item.id === id);
      if (!combo) throw new Error("El combo ya no está disponible.");
      combo.imageUrl = null; combo.updatedAt = new Date().toISOString(); return { ...combo };
    }
    return await json(`${root}/combos/${encodeURIComponent(id)}/image`, { method: "DELETE" }) as Combo;
  },
};
