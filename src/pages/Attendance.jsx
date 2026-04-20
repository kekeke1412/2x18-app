// src/pages/Attendance.jsx
import React, { useState, useEffect } from 'react';
import { Users, CheckCheck, Plus, X, Calendar, Clock, Link2, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createCalendarEvent } from '../services/googleApi';
import { scheduleReminder } from '../services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';

const REMINDER_OPTIONS = [
  { value: 0,    label: 'Không nhắc' },
  { value: 5,    label: '5 phút trước' },
  { value: 15,   label: '15 phút trước' },
  { value: 30,   label: '30 phút trước' },
  { value: 60,   label: '1 giờ trước' },
  { value: 1440, label: '1 ngày trước' },
];

const isToday = (dateStr) => {
  if (!dateStr) return false;
  return dateStr === new Date().toISOString().slice(0, 10);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const detectLinkType = (url) => {
  if (!url) return null;
  if (url.includes('meet.google')) return { label: 'Google Meet', icon: '📹' };
  if (url.includes('zoom.us'))    return { label: 'Zoom',         icon: '💬' };
  if (url.includes('teams.'))     return { label: 'Teams',        icon: '💼' };
  return { label: 'Link họp', icon: '🔗' };
};

export default function Attendance() {
  const {
    attendance,
    currentUser,
    checkAttendance,
    addAttendanceSession,
    deleteAttendanceSession,
    editAttendanceSession,
    isCore,
    isSuperAdmin,
    members,
    toast,
    requireGoogleAuth
  } = useApp();

  const [selected,  setSelected]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [newTitle,   setNewTitle]   = useState('');
  const [newDate,    setNewDate]    = useState('');
  const [newLink,    setNewLink]    = useState('');
  const [newStartTime, setNewStartTime] = useState('20:00');
  const [newEndTime,   setNewEndTime]   = useState('21:30');
  const [newReminderMinutes, setNewReminderMinutes] = useState(30);
  
  const [createMeet, setCreateMeet] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    if (attendance.length > 0 && !selected) setSelected(attendance[0].sessionId);
  }, [attendance, selected]);

  const session  = attendance.find(s => s.sessionId === selected);
  const myRecord = (session?.present || []).includes(currentUser?.id) || false;

  const handleCheck = () => {
    if (!session) return;
    const willCheck = !myRecord;
    checkAttendance({ sessionId: selected, userId: currentUser?.id, checked: willCheck });
    toast(
      willCheck ? 'Điểm danh thành công! +1000 điểm cống hiến 🎉' : 'Đã hủy điểm danh',
      willCheck ? 'success' : 'info'
    );
  };

  const handleJoinMeeting = (link) => {
    if (!link) return;
    if (canCheckIn && !myRecord) {
      checkAttendance({ sessionId: selected, userId: currentUser?.id, checked: true });
      toast('Đã điểm danh tự động khi bạn tham gia họp! +1000 điểm 🎉', 'success');
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const addSession = async () => {
    if (!newTitle.trim() || !newDate) return;
    
    let finalUrl = newLink.trim();
    if (createMeet) {
      setIsCreating(true);
      try {
        const token = await requireGoogleAuth();
        if (!token) {
          setIsCreating(false);
          return;
        }
        const eventRes = await createCalendarEvent(token, {
          title: newTitle.trim(),
          description: 'Họp nhóm / Điểm danh 2X18',
          date: newDate,
          startTime: newStartTime || '20:00',
          endTime: newEndTime || '',
          createMeetLink: true,
          reminderMinutes: newReminderMinutes || 0,
        });
        if (eventRes.meetLink) {
          finalUrl = eventRes.meetLink;
          toast('Đã tạo link Google Meet thành công!', 'success');
        }
      } catch (err) {
        toast(err.message || 'Lỗi khi tạo Google Meet', 'error');
      }
      setIsCreating(false);
    }

    addAttendanceSession({ sessionTitle: newTitle.trim(), date: newDate, meetLink: finalUrl, startTime: newStartTime, endTime: newEndTime });

    if (newReminderMinutes > 0 && newDate) {
      scheduleReminder({
        id: `attend-new-${Date.now()}`,
        title: newTitle.trim(),
        date: newDate,
        startTime: newStartTime || '20:00',
        reminderMinutes: newReminderMinutes,
      });
    }

    setNewTitle(''); setNewDate(''); setNewLink(''); setNewStartTime('20:00'); setNewEndTime('21:30'); setNewReminderMinutes(30); setShowAdd(false); setCreateMeet(false);
  };

  const handleDelete = (sessionId) => {
    if (deleteAttendanceSession) {
      deleteAttendanceSession(sessionId);
      if (selected === sessionId) setSelected(attendance.find(s => s.sessionId !== sessionId)?.sessionId || null);
    }
    setConfirmDel(null);
  };

  const handleSaveEdit = () => {
    if (!editData?.sessionTitle.trim() || !editData?.date) return;
    editAttendanceSession({
      sessionId: editData.sessionId,
      sessionTitle: editData.sessionTitle.trim(),
      date: editData.date,
      startTime: editData.startTime || '',
      endTime: editData.endTime || '',
      meetLink: editData.meetLink.trim()
    });
    setEditData(null);
  };

  const attendRate = s => {
    if (!s) return 0;
    const presentCount = (s.present || []).length;
    return s.total > 0 ? Math.round(presentCount / s.total * 100) : 0;
  };
  const canCheckIn = session && isToday(session.date);
  const canSubmit = newTitle.trim() && newDate;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400"/> Điểm danh & Họp nhóm
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {attendance.length} buổi đã tổ chức · Theo dõi sự tham gia của từng thành viên
            </p>
          </div>
          {isCore && (
            <button onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all">
              <Plus className="w-3.5 h-3.5"/> Tạo buổi mới
            </button>
          )}
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-[#1e1e1e] border border-blue-500/20 rounded-xl overflow-hidden space-y-3"
            >
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">TÊN BUỔI HỌP *</label>
                  <input className="input-dark" placeholder="VD: Họp SME Giải tích tuần 9..."
                    value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && canSubmit && addSession()}/>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">NGÀY HỌP *</label>
                  <input type="date" className="input-dark" value={newDate} onChange={e => setNewDate(e.target.value)}/>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">GIỜ BẮT ĐẦU</label>
                  <input type="time" className="input-dark w-full" value={newStartTime} onChange={e => setNewStartTime(e.target.value)}/>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">GIỜ KẾT THÚC</label>
                  <input type="time" className="input-dark w-full" value={newEndTime} onChange={e => setNewEndTime(e.target.value)}/>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3"/> NHẮC NHỞ TRƯỚC KHI HỌP
                </label>
                <select className="input-dark w-full" value={newReminderMinutes}
                  onChange={e => setNewReminderMinutes(Number(e.target.value))}>
                  {REMINDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">LINK HỌP (tùy chọn)</label>
                  <div className="relative">
                    <input className={`input-dark ${createMeet ? 'opacity-50 cursor-not-allowed' : ''}`} 
                      placeholder={createMeet ? "Sẽ tự động tạo link..." : "https://meet.google.com/..."}
                      value={createMeet ? '' : newLink} onChange={e => setNewLink(e.target.value)} disabled={createMeet || isCreating}/>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <input type="checkbox" id="createMeet" checked={createMeet} onChange={e => setCreateMeet(e.target.checked)} disabled={isCreating}
                        className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500 cursor-pointer"/>
                      <label htmlFor="createMeet" className="text-[10px] text-blue-400 font-bold cursor-pointer whitespace-nowrap">Tạo Meet</label>
                    </div>
                  </div>
                </div>
                <button
                  onClick={addSession}
                  disabled={!canSubmit || isCreating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all min-w-[60px] flex justify-center">
                  {isCreating ? <Clock className="w-4 h-4 animate-spin"/> : 'OK'}
                </button>
                <button onClick={() => setShowAdd(false)} className="p-2 text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {attendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-2xl">
            <Users className="w-12 h-12 text-gray-700 mb-3"/>
            <p className="text-gray-500 font-medium">Chưa có buổi điểm danh nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Danh sách buổi họp</div>
              <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-2">
                {attendance.map(s => (
                  <motion.div 
                    layout key={s.sessionId} onClick={() => setSelected(s.sessionId)}
                    variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selected === s.sessionId ? 'border-blue-500/40 bg-blue-500/10' : 'border-gray-800/60 bg-[#1a1a1a] hover:border-gray-700'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold text-gray-200 leading-tight flex-1">{s.sessionTitle}</div>
                      {isCore && (
                        <div className="flex gap-0.5">
                          <button onClick={e => { e.stopPropagation(); setEditData({...s}); }} className="p-1 text-gray-600 hover:text-blue-400 rounded-lg hover:bg-blue-500/10"><Pencil className="w-3.5 h-3.5"/></button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDel(s.sessionId); }} className="p-1 text-gray-600 hover:text-red-400 rounded-lg hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3"/> {formatDate(s.date)}
                      {s.startTime && <><span className="mx-1 text-gray-700">·</span>{s.startTime}</>}
                      <span className="mx-1 text-gray-700">·</span>{(s.present||[]).length}/{s.total}
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${attendRate(s)}%` }}/>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {session ? (
              <div className="md:col-span-2">
                <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-800/60 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-bold text-white">{session.sessionTitle}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <span>{formatDate(session.date)}</span>
                        <span>· <strong className="text-green-400">{(session.present||[]).length}</strong>/{session.total} có mặt</span>
                      </p>
                      {session.meetLink && (
                        <button onClick={() => handleJoinMeeting(session.meetLink)} className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                          <ExternalLink className="w-3 h-3"/> Tham gia họp
                        </button>
                      )}
                    </div>
                    {canCheckIn && (
                      <button onClick={handleCheck} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${myRecord ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                        {myRecord ? '✓ Đã điểm danh' : 'Điểm danh ngay'}
                      </button>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {members.map(m => {
                      const present = (session.present||[]).includes(m.id);
                      return (
                        <div key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${present ? 'border-green-500/25 bg-green-500/8' : 'border-gray-800/40 bg-[#111]'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${present ? 'bg-green-600/25 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                            {m.avatar}
                          </div>
                          <div className="text-xs font-medium truncate text-gray-200">{m.fullName.split(' ').slice(-1)[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center justify-center py-20 text-gray-600">Chọn buổi họp để xem chi tiết</div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmDel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDel(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1e1e1e] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="font-bold text-white mb-2">Xóa buổi họp?</div>
              <p className="text-xs text-gray-500 mb-4">Dữ liệu sẽ được chuyển vào thùng rác.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400">Hủy</button>
                <button onClick={() => handleDelete(confirmDel)} className="flex-1 py-2 bg-red-600 text-white font-bold text-sm rounded-xl">Xóa</button>
              </div>
            </motion.div>
          </div>
        )}
        {editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setEditData(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#1e1e1e] border border-blue-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold mb-4">Chỉnh sửa buổi họp</h3>
              <div className="space-y-4">
                <input className="input-dark w-full" placeholder="Tiêu đề" value={editData.sessionTitle} onChange={e => setEditData({...editData, sessionTitle: e.target.value})} />
                <input type="date" className="input-dark w-full" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditData(null)} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400">Hủy</button>
                <button onClick={handleSaveEdit} className="flex-1 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl">Lưu</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
