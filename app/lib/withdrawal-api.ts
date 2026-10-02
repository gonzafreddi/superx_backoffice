import { authFetch } from "./http";
import type { WithdrawalPage, WithdrawalRequest, WithdrawalStatus, WithdrawalUpdate } from "./withdrawal-contract";
import { validateWithdrawalUpdate } from "./withdrawal-rules";
const baseUrl = () => process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL?.replace(/\/$/, "");
async function request(path: string, init?: RequestInit) {
  const response = await authFetch(`${baseUrl()}${path}`, { ...init, headers: { Accept: "application/json", "Content-Type": "application/json" } });
  if (!response.ok) {
    const message = response.status === 403 ? "No tenés permiso para gestionar arrepentimientos." : response.status === 404 ? "No encontramos la solicitud. Actualizá el listado." : response.status === 400 ? "Revisá el estado y la nota de resolución." : "No pudimos completar la operación. Intentá nuevamente.";
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json();
}
export const withdrawalApi = {
  async list(filters: { status?: WithdrawalStatus | ""; page?: number; pageSize?: number } = {}): Promise<WithdrawalPage> {
    const page = filters.page ?? 1, pageSize = filters.pageSize ?? 20;
    if (!baseUrl()) return { items: [], total: 0, page, pageSize };
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.status) params.set("status", filters.status);
    return request(`/withdrawal-requests?${params}`);
  },
  async update(id: string, input: WithdrawalUpdate): Promise<WithdrawalRequest> {
    const error = validateWithdrawalUpdate(input); if (error) throw new Error(error);
    if (!baseUrl()) throw new Error("Configurá la API para gestionar arrepentimientos.");
    return request(`/withdrawal-requests/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
  },
};
