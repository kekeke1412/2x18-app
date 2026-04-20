// src/pages/Notifications.jsx
import React, { useState } from 'react';
import {
  Bell, BellOff, BellRing, CheckCheck, FileText, Users, Calendar,
  Settings, Clipboard, BookOpen, Map
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcon = {
  task:     { icon: Clipboard,  color: 'text-red-400',    bg: 'bg-red-500/10',    label: 'Task'       },
  sme:      { icon: FileText,   color: 'text-blue-400',   bg: 'bg-blue-500/10',   label: 'Tài liệu'   },
  vote:     { icon: Bell,       color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Bình chọn'  },
  system:   { icon: Settings,   color: 'text-gray-400',   bg: 'bg-gray-500/10',   label: 'Hệ thống'   },
  calendar: { icon: Calendar,   color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'Lịch họp'   },
  member:   { icon: Users,      color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Thành viên' },
  subject:  { icon: BookOpen,   color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   label: 'Môn học'    },
  roadmap:  { icon: Map,        color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Lộ trình'   },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return d + ' ngày trước';
  if (h > 0) return h + ' giờ trước';
  if (m > 0) return m + ' phút trước';
  return 'Vừa xong';
}

function NotifPermissionBanner() {
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  const [granted, setGranted] = React.useState(perm === 'granted');

  const request = async () => {
    if (!('Notification' in window)) return;
    const r = await Notification.requestPermission();
    setGranted(r === 'granted');
    if (r === 'granted') {
      new Notification('2X18 — Đã bật thông báo!', {
        body: 'Bạn sẽ nhận thông báo khi có hoạt động mới.',
        icon: '/icon-192.png',
      });
    }
  };

  if (granted || perm === 'unsupported') return null;

  return (
    <div className={`mx-6 mt-4 mb-1 flex items-start gap-3 p-3.5 rounded-2xl border ${
      perm === 'denied' ? 'bg-red-500/5 border-red-500/20' : 'bg-blue-500/5 border-blue-500/20'
    }`}>
      {perm === 'denied'
        ? <BellOff className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
        : <BellRing className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-pulse"/>
      }
      <div className="flex-1 min-w-0">
        {perm === 'denied' ? (
          <>
            <p className="text-xs font-bold text-red-300">Thông báo bị chặn</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Vào Cài đặt trình duyệt → Quyền trang → Cho phép thông báo để nhận tin.</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-blue-300">Bật thông báo thiết bị</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Nhận thông báo tức thì: task mới, bình chọn, buổi họp — ngay trên điện thoại.</p>
            <button onClick={request}
              className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-all">
              Cho phép thông báo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Notifications() {
  const { notifications, markNotif, markAllRead, unreadCount } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState('all');

  const handleClick = (n) => {
    markNotif(n.id);
    if (n.link) navigate(n.link);
  };

  const typeFilters = [
    ['all','Tất cả'], ['unread','Chưa đọc'],
    ['task','Task'], ['vote','Bình chọn'],
    ['calendar','Lịch họp'], ['sme','Tài liệu'], ['member','Thành viên'],
  ];

  const filtered = filter === 'all' ? notifications
    : filter === 'unread' ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

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
            <p className="text-xs text-gray-500 mt-0.5">{notifications.length} thông báo · {unreadCount} chưa đọc</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-all font-bold">
              <CheckCheck className="w-3.5 h-3.5"/> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
        <div className="flex gap-1 mt-3 overflow-x-auto custom-scrollbar pb-1">
          {typeFilters.map(([key, label]) => {
            const count = key === 'all' ? notifications.length
              : key === 'unread' ? notifications.filter(n => !n.read).length
              : notifications.filter(n => n.type === key).length;
            if (key !== 'all' && key !== 'unread' && count === 0) return null;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${
                  filter === key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-[#222]'
                }`}>
                {label}
                {count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/20' : 'bg-gray-800'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <NotifPermissionBanner/>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Bell className="w-12 h-12 text-gray-700 mb-3"/>
              <p className="text-gray-500 font-medium">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo nào'}
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.03 } }
              }}
              className="divide-y divide-gray-800/40"
            >
              {filtered.map(n => {
                const ti = typeIcon[n.type] || typeIcon.system;
                const Icon = ti.icon;
                return (
                  <motion.div 
                    layout
                    key={n.id} 
                    onClick={() => handleClick(n)}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 }
                    }}
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors group ${
                      !n.read ? 'bg-blue-500/5 border-l-2 border-l-blue-500/50' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ti.bg}`}>
                      <Icon className={`w-4 h-4 ${ti.color}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[9px] font-black uppercase tracking-wider ${ti.color} opacity-70`}>{ti.label}</span>
                      <p className={`text-sm leading-relaxed mt-0.5 ${n.read ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>{n.msg}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-gray-600">{timeAgo(n.time)}</span>
                        {n.link && (
                          <span className="text-[10px] text-blue-500/60 group-hover:text-blue-400 transition-colors font-medium">
                            Nhấn để xem →
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0 animate-pulse"/>}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
