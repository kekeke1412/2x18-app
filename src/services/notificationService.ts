export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function showNotification(title: string, body: string, options: NotificationOptions = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const settings = { body, icon: '/icon-192.jpg', badge: '/icon-192.jpg', tag: title, ...options };
  try {
    // ready can wait forever if registration failed. getRegistration resolves immediately.
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (registration?.active) { await registration.showNotification(title, settings); return; }
    const notification = new Notification(title, settings);
    notification.onclick = () => {
      window.focus(); notification.close();
      const url = new URL(settings.data?.url || '/', location.origin);
      if (url.origin === location.origin) location.assign(url.href);
    };
  } catch (error) { console.warn('Không thể hiển thị thông báo thiết bị:', error); }
}

type Reminder = { id: string; title: string; date: string; startTime?: string; reminderMinutes?: number; desc?: string; location?: string };
const reminders = new Map<string, { event: Reminder; at: number }>();
const delivered = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
const MAX_DELAY = 2_147_000_000;

function armTimer() {
  clearTimeout(timer);
  const next = [...reminders.values()].sort((a, b) => a.at - b.at)[0];
  if (!next) return;
  timer = setTimeout(() => {
    const now = Date.now();
    reminders.forEach(({ event, at }, id) => {
      if (at > now) return;
      reminders.delete(id);
      const key = `${id}:${at}`;
      if (delivered.has(key)) return;
      delivered.add(key);
      if (delivered.size > 1000) delivered.delete(delivered.values().next().value!);
      // Skip very stale notifications after the device wakes from sleep.
      if (now - at < 15 * 60 * 1000) void showNotification(`⏰ Nhắc nhở: ${event.title}`, `Sự kiện lúc ${event.startTime || '08:00'} (${event.date})`, { tag: `reminder-${id}`, data: { url: '/calendar' } });
    });
    armTimer();
  }, Math.min(MAX_DELAY, Math.max(0, next.at - Date.now())));
}
export function scheduleReminder(event: Reminder) {
  if (!event.id) return;
  reminders.delete(event.id);
  const at = new Date(`${event.date}T${event.startTime || '08:00'}:00+07:00`).getTime() - Number(event.reminderMinutes) * 60000;
  if (Number(event.reminderMinutes) > 0 && Number.isFinite(at) && at > Date.now()) reminders.set(event.id, { event, at });
  armTimer();
}
export function cancelReminder(id: string) { reminders.delete(id); armTimer(); }
export function syncAllReminders(events: Reminder[] = []) {
  reminders.clear(); clearTimeout(timer);
  events.forEach(event => {
    if (!event.id) return;
    const at = new Date(`${event.date}T${event.startTime || '08:00'}:00+07:00`).getTime() - Number(event.reminderMinutes) * 60000;
    if (Number(event.reminderMinutes) > 0 && Number.isFinite(at) && at > Date.now()) reminders.set(event.id, { event, at });
  });
  armTimer();
}
