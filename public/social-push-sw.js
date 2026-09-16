self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = payload.title || "WatchTVSport";
  const options = {
    body: payload.body || "A post is ready for review.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: payload.tag || "watchtvsport-social",
    renotify: false,
    data: { url: payload.url || "/social/setup" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/social/setup", self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if ("focus" in client && client.url === target) return client.focus();
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
  })());
});
