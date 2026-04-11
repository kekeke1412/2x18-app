// public/sw.js  –  Service Worker for 2X18 PWA
const CACHE_NAME = '2x18-v1';

// Files to cache for offline shell
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: pre-cache shell ──────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for shell ───────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Always go network for Firebase / API calls
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    request.method !== 'GET'
  ) {
    return;
  }

  e.respondWith(
    fetch(request)
      .then(res => {
        // Cache fresh copy of navigations
        if (request.mode === 'navigate') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
  );
});

// ── Push notifications ────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = { title: '2X18', body: 'Có thông báo mới!', url: '/notifications' };
  try {
    data = { ...data, ...e.data.json() };
  } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     data.tag || 'default',
      renotify: true,
      data:    { url: data.url || '/notifications' },
      vibrate: [200, 100, 200],
    })
  );
});

// ── Notification click → focus or open tab ────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url || '/notifications';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // If app is already open, focus and navigate
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: target });
          return;
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })
  );
});
