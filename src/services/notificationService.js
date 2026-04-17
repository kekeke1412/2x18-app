// src/services/notificationService.js
// Quản lý thông báo nhắc nhở cục bộ (browser/desktop + mobile web)

const STORAGE_KEY = '2x18_scheduled_reminders';

/**
 * Xin quyền hiển thị thông báo từ trình duyệt
 * Trả về: 'granted' | 'denied' | 'default'
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Trình duyệt này không hỗ trợ Notification API');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

/**
 * Hiển thị ngay một browser notification
 */
export function showNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/icon-192.png', // Dùng icon app nếu có
    badge: '/icon-192.png',
    tag: options.tag || title, // Tránh trùng lặp cùng loại
    requireInteraction: options.requireInteraction || false,
    ...options,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
  return n;
}

// Bộ theo dõi các timeout đang chạy: { reminderId: timeoutId }
const activeTimeouts = new Map();

/**
 * Lên lịch nhắc một sự kiện
 * @param {object} event - { id, title, date, startTime, reminderMinutes }
 */
export function scheduleReminder(event) {
  if (!event.reminderMinutes || event.reminderMinutes <= 0) return;
  if (!event.date) return;

  const time = event.startTime || '08:00';
  const eventDateTime = new Date(`${event.date}T${time}:00`);
  const reminderTime = new Date(eventDateTime.getTime() - event.reminderMinutes * 60 * 1000);
  const msUntilReminder = reminderTime.getTime() - Date.now();

  // Đã qua giờ nhắc thì bỏ
  if (msUntilReminder <= 0) return;

  // Nếu đã có reminder cho event này thì hủy cái cũ
  cancelReminder(event.id);

  const timeoutId = setTimeout(() => {
    const label = event.reminderMinutes >= 60
      ? `${event.reminderMinutes / 60} giờ`
      : `${event.reminderMinutes} phút`;
    showNotification(
      `⏰ Nhắc nhở: ${event.title}`,
      `Sự kiện bắt đầu sau ${label} (${time})\n${event.desc || event.location || ''}`,
      { tag: `reminder-${event.id}`, requireInteraction: true }
    );
    activeTimeouts.delete(event.id);
  }, msUntilReminder);

  activeTimeouts.set(event.id, timeoutId);
  console.log(`[Reminder] Đã lên lịch nhắc "${event.title}" sau ${Math.round(msUntilReminder / 60000)} phút`);
}

/**
 * Hủy một reminder đang lên lịch
 */
export function cancelReminder(eventId) {
  if (activeTimeouts.has(eventId)) {
    clearTimeout(activeTimeouts.get(eventId));
    activeTimeouts.delete(eventId);
  }
}

/**
 * Đồng bộ lại toàn bộ danh sách sự kiện
 * Gọi mỗi khi load trang hoặc danh sách events thay đổi
 */
export function syncAllReminders(events = []) {
  // Hủy tất cả reminder cũ
  activeTimeouts.forEach((tid) => clearTimeout(tid));
  activeTimeouts.clear();

  // Lên lịch lại
  events.forEach(ev => {
    if (ev.reminderMinutes) scheduleReminder(ev);
  });
}
