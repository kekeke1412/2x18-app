// src/pages/Notifications.jsx
import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, FileText, Users, Calendar, Settings, BellOff, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const typeIcon = {
  task:     { icon: FileText,  color: 'text-red-400',    bg: 'bg-red-500/10'    },
  sme:      { icon: FileText,  color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  vote:     { icon: Bell,      color: 'text-purple-400', bg: 'bg-purple-500/10' },
  system:   { icon: Settings,  color: 'text-gray-400',   bg: 'bg-gray-500/10'   },
  calendar: { icon: Calendar,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
  member:   { icon: Users,     color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} ngày trước`;
  if (h > 0) return `${h} giờ trước`;
  if (m > 0) return `${m} phút trước`;
  return 'Vừa xong';
}

// ── Push permission status widget ─────────────────────────────────────────
function PushPermissionBanner() {
  const [perm, setPerm] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const request = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPerm(result);
  };

  if (perm === 'granted' || perm === 'unsupported') return null;

  return (
    <div className={`mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl border ${
      perm === 'denied'
        ? 'bg-red-500/5 border-red-500/20'
        : 'bg-blue-500/5 border-blue-500/20'
    }`}>
      {perm === 'denied'
        ? <BellOff className="w-4 h-4 text-red-400 shrink-0"/>
        : <BellRing className="w-4 h-4 text-blue-400 shrink-0"/>
      }
      <div className="flex-1 min-w-0">
        {perm === 'denied' ? (
          <p className="text-xs text-red-300">Thông báo đã bị chặn. Vào cài đặt trình duyệt để bật lại.</p>
        ) : (
          <p className="text-xs text-blue-300">Bật thông báo để nhận cập nhật ngay cả khi không mở app.</p>
        )}
      </div>
      {perm !== 'denied' && (
        <button onClick={request}
          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-all shrink-0">
          Bật ngay
        </button>
      )}
    </div>
  );
}

export default function Notifications() {
  const { notifications, markNotif, markAllRead, unreadCount } = useApp();
  const navigate = useNavigate();

  // ── Handle SW navigation (tapped OS notification → navigate to page) ─────
  useEffect(() => {
    const handler = (e) => {
      const url = e.detail;
      if (url && url !== '/notifications') navigate(url);
    };
    window.addEventListener('app-navigate', handler);
    return () => window.removeEventListener('app-navigate', handler);
  }, [navigate]);

  const handleClick = n => {
    markNotif(n.id);
    if (n.link) navigate(n.link);
  };

  // Group by date
  const groups = notifications.reduce((acc, n) => {
    const date = new Date(n.time);
    const label = (() => {
      const diff = Date.now() - date.getTime();
      const d = Math.floor(diff / 86400000);
      if (d === 0) return 'Hôm nay';
      if (d === 1) return 'Hôm qua';
      return date.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
    })();
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {});

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400"/> Thông báo
              {unreadCount > 0 && (
                <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Tất cả hoạt động của nhóm</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-all">
              <CheckCheck className="w-3.5 h-3.5"/> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Push permission banner */}
      <PushPermissionBanner/>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="w-12 h-12 text-gray-700 mb-3"/>
            <p className="text-gray-500 text-sm">Không có thông báo nào</p>
            <p className="text-gray-600 text-xs mt-1">Các hoạt động nhóm sẽ hiện ở đây</p>
          </div>
        ) : (
          <div className="pb-4">
            {Object.entries(groups).map(([label, items]) => (
              <div key={label}>
                {/* Date group label */}
                <div className="px-6 pt-4 pb-1">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
                </div>
                <div className="divide-y divide-gray-800/40">
                  {items.map(n => {
                    const ti = typeIcon[n.type] || typeIcon.system;
                    const Icon = ti.icon;
                    return (
                      <div key={n.id} onClick={() => handleClick(n)}
                        className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors ${!n.read ? 'bg-blue-500/5' : ''}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ti.bg}`}>
                          <Icon className={`w-4 h-4 ${ti.color}`}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-relaxed ${n.read ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>{n.msg}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-600">{timeAgo(n.time)}</span>
                            {n.link && <span className="text-[10px] text-blue-500/60 font-medium">Nhấn để xem →</span>}
                          </div>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"/>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
