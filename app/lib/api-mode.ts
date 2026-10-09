/** Fixtures require an absent API URL and explicit permission in production. */
export function fixturesEnabled(): boolean {
  return !process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL && (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SUPERX_USE_FIXTURES === "true");
}
export function assertApiConfigured(): void {
  if (!process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL && !fixturesEnabled()) throw new Error("Falta configurar NEXT_PUBLIC_SUPERX_API_BASE_URL.");
}
/** Shared guard for adapter URL getters, including API-only operations. */
export function apiBaseUrl(): string | undefined {
  assertApiConfigured();
  return process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
}
