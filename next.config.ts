import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This VPS is reached by IP, not localhost — Next 16 blocks dev-mode
  // HMR/asset requests from any other origin by default.
  allowedDevOrigins: ["66.97.37.248"],
  // Proxies browser calls through this server's own (externally reachable)
  // port to the backend on localhost:3000 — some hosting firewalls only
  // allow the ports this app's own dev servers were opened on, not 3000.
  async rewrites() {
    return [{ source: "/api-proxy/:path*", destination: "http://localhost:3000/:path*" }];
  },
};

export default nextConfig;
