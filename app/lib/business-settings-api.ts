import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
import type { SettingsInput } from "./business-settings-rules";
export type BusinessSettings = SettingsInput & { id: number; updatedAt: string; updatedByUserId?: string | null };
let fixture: BusinessSettings = {
  id: 1, legalName: "SuperX", tradeName: "SuperX", cuit: "20123456786", ivaCondition: "RESPONSABLE_INSCRIPTO",
  legalAddress: "Av. San Martín 123", serviceAddress: "Av. San Martín 123", serviceArea: "Zona de entrega local",
  contactEmail: "contacto@superx.local", contactPhone: "", whatsapp: "", businessHours: "Lunes a sábado de 9 a 18 hs",
  legalTermsEffectiveDate: null, minOrderAmount: 0, freeDeliveryThreshold: null, updatedAt: "2026-10-09T12:00:00.000Z", updatedByUserId: null,
};
async function request(input?: SettingsInput, signal?: AbortSignal): Promise<BusinessSettings> {
  const root = apiBaseUrl()?.replace(/\/$/, "");
  if (fixturesEnabled()) {
    if (input) fixture = { ...fixture, ...input, updatedAt: new Date().toISOString() };
    return { ...fixture };
  }
  const response = await authFetch(`${root}/settings`, {
    method: input ? "PATCH" : "GET", signal, cache: "no-store",
    headers: { Accept: "application/json", ...(input ? { "Content-Type": "application/json" } : {}) },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message;
    throw new Error(response.status === 403 ? "No tenés permiso para configurar el negocio." : typeof message === "string" ? message : Array.isArray(message) ? message.join(" ") : "No pudimos completar la operación de configuración.");
  }
  if (!payload || typeof payload.updatedAt !== "string") throw new Error("La respuesta de configuración no tiene el formato esperado.");
  return { ...payload, minOrderAmount: Number(payload.minOrderAmount), freeDeliveryThreshold: payload.freeDeliveryThreshold == null ? null : Number(payload.freeDeliveryThreshold) };
}
export const businessSettingsApi = { get: (signal?: AbortSignal) => request(undefined, signal), update: (input: SettingsInput) => request(input) };
