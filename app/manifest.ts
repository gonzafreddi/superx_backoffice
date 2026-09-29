import type { MetadataRoute } from "next";

/** Lets staff install the backoffice (required on iPhone to receive push alerts). */
export default function manifest(): MetadataRoute.Manifest { return {
  id: "/", scope: "/", start_url: "/", name: "SuperX Backoffice", short_name: "SuperX BO", lang: "es-AR", dir: "ltr",
  description: "Pedidos, picking, reparto y administración de SuperX.", display: "standalone", orientation: "any", background_color: "#141B2D", theme_color: "#141B2D",
  icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" }, { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
}; }
