// src/registerSW.js — Đăng ký Service Worker cho PWA
// Import file này một lần trong src/main.jsx

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered:', reg.scope);

          // Lắng nghe message NAVIGATE từ SW (khi click notification)
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'NAVIGATE' && event.data.url) {
              window.location.href = event.data.url;
            }
          });
        })
        .catch((err) => console.warn('[SW] Registration failed:', err));
    });
  }
}
