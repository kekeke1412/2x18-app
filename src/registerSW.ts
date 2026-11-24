// src/registerSW.ts — Đăng ký Service Worker cho PWA (chỉ chạy ở bản build production)

let registered = false;

export function registerServiceWorker() {
  if (import.meta.env.DEV || registered) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  registered = true;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NAVIGATE' && event.data.url) {
            const target = new URL(event.data.url, window.location.origin);
            if (target.origin === window.location.origin) {
              const path = `${target.pathname}${target.search}${target.hash}`;
              window.dispatchEvent(new CustomEvent('sw-navigate', { detail: path }));
            }
          }
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}
