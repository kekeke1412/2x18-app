// src/registerSW.js — Đăng ký Service Worker cho PWA
// Import file này một lần trong src/main.jsx

export function registerServiceWorker() {
  if (import.meta.env.DEV) return;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered:', reg.scope);

          // Lắng nghe message NAVIGATE từ SW (khi click notification)
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'NAVIGATE' && event.data.url) {
              const target = new URL(event.data.url, window.location.origin);
              if (target.origin === window.location.origin) window.location.href = target.href;
            }
          });
        })
        .catch((err) => console.warn('[SW] Registration failed:', err));
    });
  }
}
