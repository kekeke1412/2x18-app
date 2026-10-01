/* global clients */
// public/sw.js — Service Worker cho 2X18 PWA
const CACHE_NAME = '2x18-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.jpg',
];

// ── Install: pre-cache static shell ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('2x18-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: Network first, fallback to cache ───────────────────────────────
self.addEventListener('fetch', (event) => {
  // Bỏ qua Firebase và external APIs
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/') || url.search) return;
  if (event.request.mode !== 'navigate' && !url.pathname.startsWith('/assets/') && !STATIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)));
        }
        return res;
      })
      .catch(async () => (await caches.match(event.request)) || (event.request.mode === 'navigate' ? await caches.match('/index.html') : null) || Response.error())
  );
});

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || '2X18 — Thông báo mới';
  const options = {
    body:  data.body  || 'Có hoạt động mới trong nhóm.',
    icon:  '/icon-192.jpg',
    badge: '/icon-192.jpg',
    tag:   data.tag   || 'notif',
    data:  { url: data.url || '/' },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: open app at correct route ─────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu tab đã mở → focus và navigate
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.navigate(url).then(() => client.focus());
        }
      }
      // Không có tab → mở mới
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

