/* Dinks on Us service worker: push delivery only; private API data is never cached. */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    const raw = event.data?.text?.();
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { body: "You have a new update." };
  }
  if (!data || typeof data !== "object") data = {};
  const title = typeof data.title === "string" ? data.title : "Dinks on Us";
  const body = typeof data.body === "string" ? data.body : "You have a new update.";
  const url = typeof data.url === "string" ? data.url : "/portal/reservations";
  const tag = typeof data.tag === "string" ? data.tag : "dinks-on-us-update";

  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag,
      renotify: true,
      data: { url },
    });

    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: "PUSH_RECEIVED", data }));
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/portal/reservations", self.location.origin).href;

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => "focus" in client);
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) await existing.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});
