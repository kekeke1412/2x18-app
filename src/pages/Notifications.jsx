// src/pages/Notifications.jsx
import React from 'react';
import { Bell, CheckCheck, FileText, Users, Calendar, Settings } from 'lucide-react';
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

export default function Notifications() {
  const { notifications, markNotif, markAllRead, unreadCount } = useApp();
  const navigate = useNavigate();

  const handleClick = n => {
    markNotif(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
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

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="w-12 h-12 text-gray-700 mb-3"/>
            <p className="text-gray-500">Không có thông báo nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {notifications.map(n => {
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
                    <span className="text-[10px] text-gray-600 mt-0.5 block">{timeAgo(n.time)}</span>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"/>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
