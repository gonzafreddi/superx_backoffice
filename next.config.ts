import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  // This VPS is reached by IP, not localhost — Next 16 blocks dev-mode
  // HMR/asset requests from any other origin by default.
  allowedDevOrigins: ["66.97.37.248"],
  // Proxies browser calls through this server's own (externally reachable)
  // port to the backend on localhost:3000 — some hosting firewalls only
  // allow the ports this app's own dev servers were opened on, not 3000.
  async rewrites() {
    return [{ source: "/api-proxy/:path*", destination: `${process.env.SUPERX_BACKEND_URL ?? "http://localhost:3000"}/:path*` }];
  },
  async headers() {
    const apiOrigin = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL).origin
      : "'self'";
    const csp = [
      "default-src 'self'", "base-uri 'self'", "form-action 'self'",
      "frame-ancestors 'none'", "object-src 'none'",
      "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:", "img-src 'self' data: blob: https:",
      "worker-src 'self'",
      `connect-src 'self' ${apiOrigin}`,
    ].join("; ");
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
    ] }, { source: "/sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
    ] }];
  },
};

export default function createNextConfig(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPERX_API_BASE_URL is required for a production build.");
  }
  return nextConfig;
}
