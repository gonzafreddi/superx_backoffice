/* SuperX backoffice service worker: only shows staff push alerts (no offline caching). */
"use strict";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "SuperX", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "SuperX", { body: data.body || "", icon: "/icon-192.png", badge: "/badge-96.png", tag: data.tag, renotify: Boolean(data.tag), requireInteraction: typeof data.kind === "string" && data.kind.startsWith("staff."), lang: "es-AR", data: { url: data.url || "/" } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (open) { await open.focus(); return open.navigate(target.href).catch(() => self.clients.openWindow(target.href)); }
    return self.clients.openWindow(target.href);
  })());
});
